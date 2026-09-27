from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import SecurityControl, AssetControl, Asset

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
