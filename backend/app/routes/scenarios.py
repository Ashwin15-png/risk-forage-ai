import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import Scenario, ScenarioResult, Asset, BusinessService, SecurityControl, Vulnerability
from app.schemas.schemas import ScenarioCreateRequest
from app.scenario_engine.simulator import simulate_security_scenario
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/scenarios", tags=["Scenario Simulation"])

@router.get("")
def list_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(Scenario).order_by(Scenario.created_at.desc()).all()
    results = []
    for s in scenarios:
        results.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "baseline_risk": s.baseline_risk,
            "scenario_risk": s.scenario_risk,
            "risk_reduction": s.risk_reduction,
            "estimated_cost": s.estimated_cost,
            "confidence": s.confidence,
            "created_by": s.created_by,
            "created_at": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else "N/A",
            "changes_count": len(json.loads(s.changes_json)) if s.changes_json else 0
        })
    return results

@router.get("/{id}")
def get_scenario_detail(id: str, db: Session = Depends(get_db)):
    s = db.query(Scenario).filter(Scenario.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Scenario not found")

    res_list = []
    for r in s.results:
        res_list.append({
            "entity_name": r.entity_name,
            "baseline_score": r.baseline_score,
            "projected_score": r.projected_score,
            "delta": r.delta,
            "drivers": json.loads(r.drivers_json) if r.drivers_json else []
        })

    return {
        "id": s.id,
        "name": s.name,
        "description": s.description,
        "baseline_risk": s.baseline_risk,
        "scenario_risk": s.scenario_risk,
        "risk_reduction": s.risk_reduction,
        "estimated_cost": s.estimated_cost,
        "confidence": s.confidence,
        "changes": json.loads(s.changes_json) if s.changes_json else [],
        "created_by": s.created_by,
        "results": res_list
    }

@router.post("")
async def create_and_run_scenario(
    payload: ScenarioCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Executes what-if simulation using real baseline asset, control, and vulnerability states.
    Stores simulation results and returns structured comparative analysis.
    """
    assets = db.query(Asset).all()
    controls = db.query(SecurityControl).all()
    services = db.query(BusinessService).all()

    # Build baseline structures
    baseline_assets = []
    for a in assets:
        v_list = [{"cvss_score": v.cvss_score, "status": v.status} for v in a.vulnerabilities]
        baseline_assets.append({
            "id": a.id,
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "data_classification": a.data_classification,
            "control_coverage": a.control_coverage,
            "status": a.status,
            "vulnerabilities": v_list
        })

    baseline_controls = [
        {
            "code": c.code,
            "name": c.name,
            "category": c.category,
            "effectiveness_pct": c.effectiveness_pct,
            "coverage_pct": c.coverage_pct,
            "risk_reduction_weight": c.risk_reduction_weight,
            "is_active": True
        } for c in controls
    ]

    baseline_services = [
        {"id": s.id, "name": s.name, "business_impact_score": s.business_impact_score}
        for s in services
    ]

    changes_raw = [c.model_dump() for c in payload.changes]

    # Run Simulation
    sim_result = simulate_security_scenario(
        baseline_assets=baseline_assets,
        baseline_services=baseline_services,
        baseline_controls=baseline_controls,
        scenario_changes=changes_raw
    )

    # Persist Scenario
    scenario = Scenario(
        org_id=assets[0].org_id if assets else "org-demo",
        name=payload.name,
        description=payload.description,
        baseline_risk=sim_result["baseline_risk"],
        scenario_risk=sim_result["scenario_risk"],
        risk_reduction=sim_result["risk_reduction"],
        estimated_cost=sim_result["estimated_cost"],
        confidence=sim_result["confidence"],
        changes_json=json.dumps(changes_raw),
        created_by="Security Architect"
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)

    # Persist top asset comparisons
    for item in sim_result["asset_comparisons"]:
        sr = ScenarioResult(
            scenario_id=scenario.id,
            entity_type="asset",
            entity_id=item["asset_id_code"],
            entity_name=item["name"],
            baseline_score=item.get("risk_score", 50.0) + item.get("reduction", 0.0),
            projected_score=item.get("risk_score", 50.0),
            delta=item.get("reduction", 0.0),
            drivers_json=json.dumps(item.get("drivers", []))
        )
        db.add(sr)
    db.commit()

    log_audit_event(
        db=db,
        org_id=scenario.org_id,
        action="Scenario Executed",
        entity_type="Scenario",
        entity_id=scenario.name,
        new_values={
            "baseline": scenario.baseline_risk,
            "scenario": scenario.scenario_risk,
            "reduction": scenario.risk_reduction,
            "cost": scenario.estimated_cost
        },
        description=f"Ran scenario '{scenario.name}': projected risk dropped from {scenario.baseline_risk} to {scenario.scenario_risk} (-{scenario.risk_reduction} pts)."
    )

    await ws_manager.broadcast("SCENARIO_COMPLETED", {
        "scenario_id": scenario.id,
        "name": scenario.name,
        "reduction": scenario.risk_reduction,
        "cost": scenario.estimated_cost
    })

    return {
        "id": scenario.id,
        "name": scenario.name,
        "baseline_risk": scenario.baseline_risk,
        "scenario_risk": scenario.scenario_risk,
        "risk_reduction": scenario.risk_reduction,
        "estimated_cost": scenario.estimated_cost,
        "confidence": scenario.confidence,
        "applied_actions": sim_result["applied_actions"],
        "asset_comparisons": sim_result["asset_comparisons"]
    }
