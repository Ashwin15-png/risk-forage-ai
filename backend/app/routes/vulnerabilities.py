from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.entities import Vulnerability, Asset, BusinessService, SecurityControl, RiskSnapshot
from app.schemas.schemas import VulnerabilityStatusUpdate
from app.risk_engine.calculator import calculate_asset_risk
from app.risk_engine.service_calculator import calculate_service_risk
from app.websocket.manager import ws_manager
from app.audit.logger import log_audit_event

router = APIRouter(prefix="/vulnerabilities", tags=["Vulnerabilities"])

@router.get("")
def list_vulnerabilities(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    asset_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Vulnerability)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Vulnerability.cve_id.ilike(s)) | (Vulnerability.title.ilike(s)))
    if severity:
        query = query.filter(Vulnerability.severity == severity)
    if status:
        query = query.filter(Vulnerability.status == status)
    if asset_id:
        query = query.filter(Vulnerability.asset_id == asset_id)

    vulns = query.order_by(Vulnerability.cvss_score.desc()).all()
    results = []
    for v in vulns:
        results.append({
            "id": v.id,
            "cve_id": v.cve_id,
            "title": v.title,
            "severity": v.severity,
            "cvss_score": v.cvss_score,
            "exploitability_score": v.exploitability_score,
            "status": v.status,
            "risk_contribution": v.risk_contribution,
            "asset_id": v.asset_id,
            "asset_id_code": v.asset.asset_id_code if v.asset else "Unknown",
            "asset_name": v.asset.name if v.asset else "Unknown",
            "exposure": v.asset.exposure if v.asset else "Internal",
            "epss_score": round(v.epss_score or 0.0, 4),
            "epss_percentile": round(v.epss_percentile or 0.0, 4),
            "is_cisa_kev": bool(v.is_cisa_kev),
            "kev_date_added": v.kev_date_added,
            "affected_product": v.affected_product,
            "cpe_uri": v.cpe_uri,
            "confidence_score": v.confidence_score or 90.0,
            "source": v.source or "NVD",
            "correlation_status": v.correlation_status or "CORRELATED",
            "correlation_confidence": v.correlation_confidence or 95.0,
            "first_seen": v.first_seen.strftime("%Y-%m-%d") if v.first_seen else "N/A",
            "last_updated": v.last_updated.strftime("%Y-%m-%d %H:%M") if v.last_updated else "N/A"
        })
    return results

@router.patch("/{id}/status")
async def update_vulnerability_status(
    id: str,
    update_data: VulnerabilityStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates vulnerability status (Resolved, Open, etc.)
    and automatically recalculates risk for the asset, business service, and enterprise.
    Broadcasts live WebSocket update.
    """
    vuln = db.query(Vulnerability).filter(Vulnerability.id == id).first()
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")

    old_status = vuln.status
    vuln.status = update_data.status
    vuln.last_updated = datetime.now(timezone.utc)
    db.commit()

    asset = vuln.asset
    # Recalculate asset risk
    all_asset_vulns = db.query(Vulnerability).filter(Vulnerability.asset_id == asset.id).all()
    vuln_dicts = [
        {"cvss_score": v.cvss_score, "status": v.status} for v in all_asset_vulns
    ]
    controls = db.query(SecurityControl).filter(SecurityControl.org_id == asset.org_id).all()
    ctrl_dicts = [
        {"code": c.code, "name": c.name, "effectiveness_pct": c.effectiveness_pct, "coverage_pct": c.coverage_pct, "is_active": True}
        for c in controls
    ]

    calc = calculate_asset_risk(
        asset_data={
            "exposure": asset.exposure,
            "criticality": asset.criticality,
            "data_classification": asset.data_classification,
            "control_coverage": asset.control_coverage,
            "status": asset.status
        },
        vulnerabilities=vuln_dicts,
        controls=ctrl_dicts,
        service_data={"business_impact_score": asset.service.business_impact_score if asset.service else 50.0}
    )

    old_asset_risk = asset.current_risk_score
    asset.current_risk_score = calc["risk_score"]
    asset.current_likelihood = calc["likelihood"]
    asset.current_impact = calc["impact"]
    db.commit()

    # Recalculate service risk
    if asset.service:
        srv_assets = db.query(Asset).filter(Asset.service_id == asset.service.id).all()
        srv_assets_dicts = [
            {
                "criticality": a.criticality,
                "exposure": a.exposure,
                "current_risk_score": a.current_risk_score,
                "current_likelihood": a.current_likelihood,
                "current_impact": a.current_impact
            } for a in srv_assets
        ]
        s_calc = calculate_service_risk(
            service_data={"business_impact_score": asset.service.business_impact_score},
            assets_with_risk=srv_assets_dicts
        )
        asset.service.current_risk_score = s_calc["risk_score"]
        asset.service.top_driver = s_calc["top_driver"]
        db.commit()

    # Log Audit Event
    log_audit_event(
        db=db,
        org_id=vuln.org_id,
        action="Vulnerability Status Changed",
        entity_type="Vulnerability",
        entity_id=vuln.cve_id,
        old_values={"status": old_status, "asset_risk": old_asset_risk},
        new_values={"status": vuln.status, "asset_risk": asset.current_risk_score},
        description=f"Status of {vuln.cve_id} changed from {old_status} to {vuln.status}. Asset risk recalculated to {asset.current_risk_score:.1f}."
    )

    # Persist updated RiskSnapshot
    snapshot = RiskSnapshot(
        org_id=vuln.org_id,
        entity_type="asset",
        entity_id=asset.id,
        risk_score=asset.current_risk_score,
        likelihood=asset.current_likelihood,
        impact=asset.current_impact,
        exposure_mod=1.45 if asset.exposure == "Internet-Facing" else 1.0,
        control_mod=0.76,
        confidence_score=calc.get("confidence_score", 90.0),
        model_version="Risk Model v1.0",
        snapshot_date=datetime.now(timezone.utc),
        assumptions_json="{}",
        drivers_json="[]"
    )
    db.add(snapshot)
    db.commit()

    # Broadcast WebSocket notification
    event_type = "VULNERABILITY_RESOLVED" if vuln.status == "Resolved" else "VULNERABILITY_STATUS_CHANGED"
    event_payload = {
        "event": event_type,
        "cve_id": vuln.cve_id,
        "new_status": vuln.status,
        "asset_id_code": asset.asset_id_code,
        "asset_name": asset.name,
        "service_name": asset.service.name if asset.service else "Enterprise Infrastructure",
        "previous_risk": round(old_asset_risk, 1),
        "new_risk": round(asset.current_risk_score, 1),
        "delta": round(asset.current_risk_score - old_asset_risk, 1),
        "reason": f"Vulnerability {vuln.cve_id} marked as {vuln.status} on {asset.name}.",
        "message": f"Risk Updated: {asset.name} ({old_asset_risk:.1f} → {asset.current_risk_score:.1f})"
    }
    await ws_manager.broadcast(event_type, event_payload)
    await ws_manager.broadcast("RISK_UPDATED", event_payload)

    return {
        "success": True,
        "id": vuln.id,
        "cve_id": vuln.cve_id,
        "status": vuln.status,
        "new_asset_risk": asset.current_risk_score,
        "delta": round(asset.current_risk_score - old_asset_risk, 1)
    }
