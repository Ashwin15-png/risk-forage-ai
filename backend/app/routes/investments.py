import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import InvestmentInitiative
from app.schemas.schemas import InvestmentCreateRequest
from app.audit.logger import log_audit_event

router = APIRouter(prefix="/investments", tags=["Investment Portfolio"])

@router.get("")
def list_investments(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(InvestmentInitiative)
    if category:
        query = query.filter(InvestmentInitiative.category == category)
    
    items = query.order_by(InvestmentInitiative.expected_risk_reduction.desc()).all()
    results = []
    for inv in items:
        deps = json.loads(inv.dependencies_json) if inv.dependencies_json else []
        srvs = json.loads(inv.affected_services_json) if inv.affected_services_json else []
        ctrls = json.loads(inv.affected_controls_json) if inv.affected_controls_json else []

        results.append({
            "id": inv.id,
            "code": inv.code,
            "name": inv.name,
            "category": inv.category,
            "description": inv.description,
            "one_time_cost": inv.one_time_cost,
            "recurring_cost": inv.recurring_cost,
            "expected_risk_reduction": inv.expected_risk_reduction,
            "implementation_weeks": inv.implementation_weeks,
            "capacity_requirement": inv.capacity_requirement,
            "is_mandatory": inv.is_mandatory,
            "dependencies": deps,
            "affected_services": srvs,
            "affected_controls": ctrls,
            "confidence_pct": inv.confidence_pct,
            "status": inv.status
        })
    return results

@router.post("")
def create_investment(payload: InvestmentCreateRequest, db: Session = Depends(get_db)):
    existing = db.query(InvestmentInitiative).filter(InvestmentInitiative.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Investment initiative with this code already exists")

    org = db.query(InvestmentInitiative).first()
    org_id = org.org_id if org else "org-demo"

    inv = InvestmentInitiative(
        org_id=org_id,
        code=payload.code,
        name=payload.name,
        category=payload.category,
        description=payload.description,
        one_time_cost=payload.one_time_cost,
        recurring_cost=payload.recurring_cost,
        expected_risk_reduction=payload.expected_risk_reduction,
        implementation_weeks=payload.implementation_weeks,
        capacity_requirement=payload.capacity_requirement,
        is_mandatory=payload.is_mandatory,
        dependencies_json=json.dumps(payload.dependencies or []),
        confidence_pct=90.0,
        status="Catalog"
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    log_audit_event(
        db=db,
        org_id=org_id,
        action="Investment Initiative Added",
        entity_type="InvestmentInitiative",
        entity_id=inv.code,
        new_values={"name": inv.name, "cost": inv.one_time_cost, "reduction": inv.expected_risk_reduction},
        description=f"Registered security initiative {inv.code}: '{inv.name}'."
    )

    return {"success": True, "id": inv.id, "code": inv.code, "name": inv.name}
