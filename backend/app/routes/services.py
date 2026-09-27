from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import BusinessService, Asset, Incident

router = APIRouter(prefix="/services", tags=["Business Services"])

@router.get("")
def list_services(db: Session = Depends(get_db)):
    services = db.query(BusinessService).order_by(BusinessService.current_risk_score.desc()).all()
    results = []
    for s in services:
        results.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "tier": s.tier,
            "criticality": s.criticality,
            "business_impact_score": s.business_impact_score,
            "financial_loss_per_hour": s.financial_loss_per_hour,
            "owner": s.owner,
            "status": s.status,
            "current_risk_score": s.current_risk_score,
            "current_likelihood": s.current_likelihood,
            "current_impact": s.current_impact,
            "trend": s.trend,
            "top_driver": s.top_driver,
            "confidence": s.confidence,
            "assets_count": len(s.assets),
            "incidents_count": len(s.incidents)
        })
    return results

@router.get("/{id}")
def get_service_detail(id: str, db: Session = Depends(get_db)):
    service = db.query(BusinessService).filter((BusinessService.id == id) | (BusinessService.code == id)).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    assets_list = []
    for a in service.assets:
        assets_list.append({
            "id": a.id,
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "ip_address": a.ip_address,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "current_risk_score": a.current_risk_score,
            "control_coverage": a.control_coverage,
            "open_vulns_count": len([v for v in a.vulnerabilities if v.status in ("Open", "Reopened")])
        })

    incidents_list = []
    for inc in service.incidents:
        incidents_list.append({
            "id": inc.id,
            "incident_number": inc.incident_number,
            "title": inc.title,
            "severity": inc.severity,
            "status": inc.status,
            "estimated_loss": inc.estimated_financial_loss,
            "detected_at": inc.detected_at.strftime("%Y-%m-%d") if inc.detected_at else "N/A"
        })

    return {
        "id": service.id,
        "name": service.name,
        "code": service.code,
        "tier": service.tier,
        "criticality": service.criticality,
        "business_impact_score": service.business_impact_score,
        "financial_loss_per_hour": service.financial_loss_per_hour,
        "owner": service.owner,
        "status": service.status,
        "description": service.description,
        "current_risk_score": service.current_risk_score,
        "current_likelihood": service.current_likelihood,
        "current_impact": service.current_impact,
        "trend": service.trend,
        "top_driver": service.top_driver,
        "confidence": service.confidence,
        "assets": assets_list,
        "incidents": incidents_list
    }
