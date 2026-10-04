from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import SecurityControl, AssetControl, Asset
from app.schemas.schemas import ControlUpdateRequest
from app.risk_engine.calculator import calculate_asset_risk
from app.risk_engine.service_calculator import calculate_service_risk
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/controls", tags=["Security Controls"])

@router.get("")
def list_controls(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(SecurityControl)
    if category:
        query = query.filter(SecurityControl.category == category)
    
    controls = query.order_by(SecurityControl.effectiveness_pct.desc()).all()
    results = []
    for c in controls:
        affected_count = len(c.asset_mappings)
        results.append({
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "category": c.category,
            "description": c.description,
            "coverage_pct": c.coverage_pct,
            "effectiveness_pct": c.effectiveness_pct,
            "risk_reduction_weight": c.risk_reduction_weight,
            "evidence_quality_score": c.evidence_quality_score,
            "affected_assets_count": affected_count,
            "last_validated": c.last_validated_at.strftime("%Y-%m-%d") if c.last_validated_at else "N/A"
        })
    return results

@router.get("/{id}")
def get_control_detail(id: str, db: Session = Depends(get_db)):
    c = db.query(SecurityControl).filter((SecurityControl.id == id) | (SecurityControl.code == id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Security control not found")

    mapped_assets = []
    for m in c.asset_mappings:
        a = m.asset
        mapped_assets.append({
            "asset_id": a.id,
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "effectiveness_pct": m.effectiveness_pct,
            "is_active": m.is_active,
            "last_checked": m.last_checked.strftime("%Y-%m-%d") if m.last_checked else "N/A"
        })

    return {
        "id": c.id,
        "code": c.code,
        "name": c.name,
        "category": c.category,
        "description": c.description,
        "coverage_pct": c.coverage_pct,
        "effectiveness_pct": c.effectiveness_pct,
        "risk_reduction_weight": c.risk_reduction_weight,
        "evidence_quality_score": c.evidence_quality_score,
        "last_validated": c.last_validated_at.strftime("%Y-%m-%d") if c.last_validated_at else "N/A",
        "affected_assets": mapped_assets
    }

@router.patch("/{id}")
async def update_control(
    id: str,
    update_data: ControlUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Updates security control parameters (effectiveness, coverage, weight)
    and automatically recalculates risk for all mapped assets and services.
    Broadcasts real-time WebSocket update.
    """
    c = db.query(SecurityControl).filter((SecurityControl.id == id) | (SecurityControl.code == id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Security control not found")

    if update_data.name is not None and update_data.name.strip():
        c.name = update_data.name.strip()
    if update_data.category is not None and update_data.category.strip():
        c.category = update_data.category.strip()
    if update_data.description is not None:
        c.description = update_data.description.strip()
    if update_data.effectiveness_pct is not None:
        c.effectiveness_pct = max(0.0, min(100.0, float(update_data.effectiveness_pct)))
    if update_data.coverage_pct is not None:
        c.coverage_pct = max(0.0, min(100.0, float(update_data.coverage_pct)))
    if update_data.risk_reduction_weight is not None:
        c.risk_reduction_weight = max(0.0, min(1.0, float(update_data.risk_reduction_weight)))

    c.last_validated_at = datetime.now(timezone.utc)
    db.commit()

    # Recalculate risk for all mapped assets
    affected_assets = [m.asset for m in c.asset_mappings if m.asset]
    affected_services = set()

    for asset in affected_assets:
        all_vulns = [{"cvss_score": v.cvss_score, "status": v.status} for v in asset.vulnerabilities]
        ctrl_dicts = [
            {
                "code": cm.control.code if cm.control else "CTL",
                "name": cm.control.name if cm.control else "Control",
                "effectiveness_pct": cm.control.effectiveness_pct if cm.control else 80.0,
                "coverage_pct": cm.control.coverage_pct if cm.control else 80.0,
                "is_active": cm.is_active,
                "risk_reduction_weight": cm.control.risk_reduction_weight if cm.control else 0.20
            } for cm in asset.control_mappings
        ]
        calc = calculate_asset_risk(
            asset_data={
                "exposure": asset.exposure,
                "criticality": asset.criticality,
                "data_classification": asset.data_classification,
                "control_coverage": c.coverage_pct,
                "status": asset.status
            },
            vulnerabilities=all_vulns,
            controls=ctrl_dicts,
            service_data={"business_impact_score": asset.service.business_impact_score if asset.service else 50.0}
        )
        asset.current_risk_score = calc["risk_score"]
        asset.current_likelihood = calc["likelihood"]
        asset.current_impact = calc["impact"]
        asset.control_coverage = c.coverage_pct

        if asset.service:
            affected_services.add(asset.service)

    # Recalculate unique services
    for srv in affected_services:
        srv_assets = srv.assets
        s_calc = calculate_service_risk(
            service_data={"business_impact_score": srv.business_impact_score},
            assets_with_risk=[
                {
                    "criticality": a.criticality,
                    "exposure": a.exposure,
                    "current_risk_score": a.current_risk_score,
                    "current_likelihood": a.current_likelihood,
                    "current_impact": a.current_impact
                } for a in srv_assets
            ]
        )
        srv.current_risk_score = s_calc["risk_score"]
        srv.top_driver = s_calc["top_driver"]

    db.commit()

    log_audit_event(
        db=db,
        org_id=c.org_id,
        action="Security Control Calibrated",
        entity_type="SecurityControl",
        entity_id=c.code,
        description=f"Control {c.code} ({c.name}) updated: Effectiveness={c.effectiveness_pct}%, Coverage={c.coverage_pct}%. Recalculated {len(affected_assets)} assets."
    )

    await ws_manager.broadcast("CONTROL_UPDATED", {
        "event": "CONTROL_UPDATED",
        "control_code": c.code,
        "control_name": c.name,
        "effectiveness_pct": c.effectiveness_pct,
        "coverage_pct": c.coverage_pct,
        "affected_assets_count": len(affected_assets),
        "message": f"Security control {c.code} updated. Continuous risk recomputed."
    })
    await ws_manager.broadcast("RISK_UPDATED", {
        "event": "RISK_RECALCULATED",
        "reason": f"Control {c.code} effectiveness adjusted to {c.effectiveness_pct}%",
        "message": f"Defensive mitigation updated: {c.name} ({c.effectiveness_pct}% eff)"
    })

    return {
        "success": True,
        "id": c.id,
        "code": c.code,
        "name": c.name,
        "effectiveness_pct": c.effectiveness_pct,
        "coverage_pct": c.coverage_pct,
        "affected_assets_count": len(affected_assets)
    }

