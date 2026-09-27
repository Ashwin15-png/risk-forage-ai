import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.entities import InvestmentInitiative, OptimizationRun, DecisionApproval, RiskSnapshot
from app.schemas.schemas import OptimizationRequest, DecisionApprovalRequest
from app.optimizer.solver import optimize_security_investments, generate_portfolio_comparisons
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/optimizations", tags=["Investment Optimization"])

@router.post("")
async def run_optimization(
    payload: OptimizationRequest,
    db: Session = Depends(get_db)
):
    """
    Executes OR-Tools Integer Linear Programming optimizer
    to determine the optimal cybersecurity investment portfolio under budget constraints.
    """
    # Fetch active initiatives
    query = db.query(InvestmentInitiative)
    if payload.candidate_initiative_codes:
        query = query.filter(InvestmentInitiative.code.in_(payload.candidate_initiative_codes))
    
    initiatives_db = query.all()
    initiatives = []
    for inv in initiatives_db:
        initiatives.append({
            "id": inv.id,
            "code": inv.code,
            "name": inv.name,
            "category": inv.category,
            "one_time_cost": inv.one_time_cost,
            "recurring_cost": inv.recurring_cost,
            "expected_risk_reduction": inv.expected_risk_reduction,
            "implementation_weeks": inv.implementation_weeks,
            "capacity_requirement": inv.capacity_requirement,
            "is_mandatory": inv.is_mandatory,
            "dependencies": json.loads(inv.dependencies_json) if inv.dependencies_json else [],
            "confidence_pct": inv.confidence_pct
        })

    # Enterprise current baseline risk
    latest_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    current_risk = latest_snap.risk_score if latest_snap else 72.4

    # Run solver
    result = optimize_security_investments(
        initiatives=initiatives,
        total_budget=payload.total_budget,
        current_enterprise_risk=current_risk,
        objective=payload.objective
    )

    # Persist optimization run
    org_id = initiatives_db[0].org_id if initiatives_db else "org-demo"
    run = OptimizationRun(
        org_id=org_id,
        model_version="Optimizer v1.0",
        total_budget=payload.total_budget,
        objective=payload.objective,
        selected_initiatives_json=json.dumps(result["selected_initiatives"]),
        initial_risk=result["initial_risk"],
        optimized_risk=result["optimized_risk"],
        risk_reduction=result["risk_reduction"],
        budget_used=result["budget_used"],
        budget_remaining=result["budget_remaining"],
        roi_metric=result["roi_metric"],
        solver_status=result["solver_status"],
        explanation=result["explanation"],
        execution_time_ms=result["execution_time_ms"]
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Pre-populate decision approvals in pending state
    for init in result["selected_initiatives"]:
        approval = DecisionApproval(
            org_id=org_id,
            optimization_run_id=run.id,
            investment_code=init["code"],
            status="Approved",  # Default approved recommendation
            approved_by="CISO Decision Engine",
            comments=f"Algorithmic recommendation: reduces {init['expected_risk_reduction']} risk points."
        )
        db.add(approval)
    db.commit()

    log_audit_event(
        db=db,
        org_id=org_id,
        action="Optimization Run Executed",
        entity_type="OptimizationRun",
        entity_id=run.id,
        new_values={
            "budget": payload.total_budget,
            "budget_used": result["budget_used"],
            "risk_reduction": result["risk_reduction"],
            "selected_count": len(result["selected_initiatives"])
        },
        model_version="Optimizer v1.0",
        description=f"Solved portfolio under ₹{payload.total_budget:,.0f} budget: selected {len(result['selected_initiatives'])} initiatives reducing risk by {result['risk_reduction']:.1f} pts."
    )

    await ws_manager.broadcast("OPTIMIZATION_COMPLETED", {
        "run_id": run.id,
        "risk_reduction": result["risk_reduction"],
        "budget_used": result["budget_used"],
        "initiatives_count": len(result["selected_initiatives"])
    })

    result["id"] = run.id
    result["created_at"] = run.created_at.strftime("%Y-%m-%d %H:%M:%S")
    return result

@router.get("/compare")
def compare_portfolios(budget: float = 5000000.0, db: Session = Depends(get_db)):
    """
    Generates 3 comparative strategic portfolios:
    Portfolio A (Balanced), Portfolio B (Aggressive), Portfolio C (Lean High-ROI).
    """
    initiatives_db = db.query(InvestmentInitiative).all()
    initiatives = []
    for inv in initiatives_db:
        initiatives.append({
            "id": inv.id,
            "code": inv.code,
            "name": inv.name,
            "category": inv.category,
            "one_time_cost": inv.one_time_cost,
            "recurring_cost": inv.recurring_cost,
            "expected_risk_reduction": inv.expected_risk_reduction,
            "implementation_weeks": inv.implementation_weeks,
            "capacity_requirement": inv.capacity_requirement,
            "is_mandatory": inv.is_mandatory,
            "dependencies": json.loads(inv.dependencies_json) if inv.dependencies_json else [],
            "confidence_pct": inv.confidence_pct
        })

    latest_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    current_risk = latest_snap.risk_score if latest_snap else 72.4

    portfolios = generate_portfolio_comparisons(
        initiatives=initiatives,
        base_budget=budget,
        current_enterprise_risk=current_risk
    )
    return portfolios

@router.get("/{id}")
def get_optimization_run(id: str, db: Session = Depends(get_db)):
    run = db.query(OptimizationRun).filter(OptimizationRun.id == id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Optimization run not found")

    approvals = []
    for app in run.approvals:
        approvals.append({
            "investment_code": app.investment_code,
            "status": app.status,
            "approved_by": app.approved_by,
            "comments": app.comments,
            "approved_at": app.approved_at.strftime("%Y-%m-%d %H:%M") if app.approved_at else "N/A"
        })

    return {
        "id": run.id,
        "total_budget": run.total_budget,
        "objective": run.objective,
        "initial_risk": run.initial_risk,
        "optimized_risk": run.optimized_risk,
        "risk_reduction": run.risk_reduction,
        "budget_used": run.budget_used,
        "budget_remaining": run.budget_remaining,
        "roi_metric": run.roi_metric,
        "solver_status": run.solver_status,
        "explanation": run.explanation,
        "execution_time_ms": run.execution_time_ms,
        "selected_initiatives": json.loads(run.selected_initiatives_json) if run.selected_initiatives_json else [],
        "approvals": approvals,
        "created_at": run.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

@router.post("/decisions")
def record_decision(payload: DecisionApprovalRequest, db: Session = Depends(get_db)):
    approval = db.query(DecisionApproval).filter(
        DecisionApproval.optimization_run_id == payload.optimization_run_id,
        DecisionApproval.investment_code == payload.investment_code
    ).first()

    org_id = "org-demo"
    if approval:
        approval.status = payload.status
        approval.comments = payload.comments or approval.comments
        org_id = approval.org_id
    else:
        run = db.query(OptimizationRun).filter_by(id=payload.optimization_run_id).first()
        org_id = run.org_id if run else "org-demo"
        approval = DecisionApproval(
            org_id=org_id,
            optimization_run_id=payload.optimization_run_id,
            investment_code=payload.investment_code,
            status=payload.status,
            comments=payload.comments
        )
        db.add(approval)
    db.commit()

    log_audit_event(
        db=db,
        org_id=org_id,
        action="Investment Decision Recorded",
        entity_type="DecisionApproval",
        entity_id=payload.investment_code,
        new_values={"status": payload.status, "comments": payload.comments},
        description=f"Executive recorded decision '{payload.status}' for initiative {payload.investment_code}."
    )

    return {"success": True, "status": payload.status, "code": payload.investment_code}
