from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models.entities import Asset, BusinessService, Vulnerability, AssetControl, SecurityControl, Incident, RiskSnapshot
from app.risk_engine.calculator import calculate_asset_risk

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.get("")
def list_assets(
    search: Optional[str] = None,
    criticality: Optional[str] = None,
    exposure: Optional[str] = None,
    service_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Asset)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter((Asset.name.ilike(s)) | (Asset.asset_id_code.ilike(s)) | (Asset.ip_address.ilike(s)))
    if criticality:
        query = query.filter(Asset.criticality == criticality)
    if exposure:
        query = query.filter(Asset.exposure == exposure)
    if service_id:
        query = query.filter(Asset.service_id == service_id)

    assets = query.order_by(Asset.current_risk_score.desc()).all()
    results = []
    for a in assets:
        results.append({
            "id": a.id,
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "service_id": a.service_id,
            "service_name": a.service.name if a.service else "Unassigned",
            "ip_address": a.ip_address,
            "hostname": a.hostname,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "owner": a.owner,
            "data_classification": a.data_classification,
            "current_risk_score": a.current_risk_score,
            "current_likelihood": a.current_likelihood,
            "current_impact": a.current_impact,
            "control_coverage": a.control_coverage,
            "vulnerabilities_count": len([v for v in a.vulnerabilities if v.status in ("Open", "Reopened")]),
            "last_seen": a.last_seen.strftime("%Y-%m-%d %H:%M") if a.last_seen else "Just now"
        })
    return results

@router.get("/{id}")
def get_asset_detail(id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter((Asset.id == id) | (Asset.asset_id_code == id)).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Fetch active vulnerabilities
    vulns = db.query(Vulnerability).filter(Vulnerability.asset_id == asset.id).all()
    vuln_list = [
        {
            "id": v.id,
            "cve_id": v.cve_id,
            "title": v.title,
            "severity": v.severity,
            "cvss_score": v.cvss_score,
            "exploitability_score": v.exploitability_score,
            "status": v.status,
            "risk_contribution": v.risk_contribution,
            "first_seen": v.first_seen.strftime("%Y-%m-%d") if v.first_seen else "N/A"
        } for v in vulns
    ]

    # Fetch controls
    ctrl_mappings = db.query(AssetControl).filter(AssetControl.asset_id == asset.id).all()
    ctrl_list = []
    for m in ctrl_mappings:
        c = m.control
        ctrl_list.append({
            "code": c.code,
            "name": c.name,
            "category": c.category,
            "effectiveness_pct": m.effectiveness_pct,
            "coverage_pct": c.coverage_pct,
            "is_active": m.is_active,
            "last_checked": m.last_checked.strftime("%Y-%m-%d") if m.last_checked else "N/A"
        })

    # Incidents
    incidents = db.query(Incident).filter(Incident.asset_id == asset.id).all()
    inc_list = [
        {
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "financial_loss": inc.estimated_financial_loss,
            "detected_at": inc.detected_at.strftime("%Y-%m-%d") if inc.detected_at else "N/A"
        } for inc in incidents
    ]

    # Deterministic recalculation details
    calculation_details = calculate_asset_risk(
        asset_data={
            "exposure": asset.exposure,
            "criticality": asset.criticality,
            "data_classification": asset.data_classification,
            "control_coverage": asset.control_coverage,
            "status": asset.status
        },
        vulnerabilities=[{"cvss_score": v.cvss_score, "status": v.status} for v in vulns],
        controls=[{"code": c["code"], "name": c["name"], "effectiveness_pct": c["effectiveness_pct"], "coverage_pct": c["coverage_pct"], "is_active": c["is_active"]} for c in ctrl_list],
        service_data={"business_impact_score": asset.service.business_impact_score if asset.service else 50.0}
    )

    return {
        "id": asset.id,
        "asset_id_code": asset.asset_id_code,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "ip_address": asset.ip_address,
        "hostname": asset.hostname,
        "exposure": asset.exposure,
        "criticality": asset.criticality,
        "owner": asset.owner,
        "data_classification": asset.data_classification,
        "control_coverage": asset.control_coverage,
        "current_risk_score": asset.current_risk_score,
        "current_likelihood": asset.current_likelihood,
        "current_impact": asset.current_impact,
        "status": asset.status,
        "last_seen": asset.last_seen.isoformat() if asset.last_seen else None,
        "service": {
            "id": asset.service.id,
            "name": asset.service.name,
            "tier": asset.service.tier,
            "criticality": asset.service.criticality,
            "business_impact_score": asset.service.business_impact_score
        } if asset.service else None,
        "vulnerabilities": vuln_list,
        "controls": ctrl_list,
        "incidents": inc_list,
        "calculation": calculation_details,
        "drivers": calculation_details.get("drivers", [])
    }
