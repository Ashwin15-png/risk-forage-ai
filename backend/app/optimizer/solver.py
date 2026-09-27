import time
from typing import List, Dict, Any, Optional
from ortools.linear_solver import pywraplp

def optimize_security_investments(
    initiatives: List[Dict[str, Any]],
    total_budget: float,
    current_enterprise_risk: float = 72.4,
    objective: str = "max_risk_reduction",
    max_capacity_high: int = 3
) -> Dict[str, Any]:
    """
    Formulates and solves the cybersecurity investment optimization problem
    using Google OR-Tools Integer Programming (MIP).
    """
    start_time = time.time()
    
    # Create solver
    solver = pywraplp.Solver.CreateSolver("CBC")
    if not solver:
        # Fallback to SAT or SCIP if CBC is not available
        solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        solver = pywraplp.Solver.CreateSolver("BOP")

    n = len(initiatives)
    if n == 0:
        return {
            "solver_status": "NO_CANDIDATES",
            "selected_initiatives": [],
            "initial_risk": current_enterprise_risk,
            "optimized_risk": current_enterprise_risk,
            "risk_reduction": 0.0,
            "budget_used": 0.0,
            "budget_remaining": total_budget,
            "roi_metric": 0.0,
            "explanation": "No candidate initiatives provided for optimization.",
            "execution_time_ms": 0.0
        }

    # Decision variables: x[i] in {0, 1}
    x = [solver.IntVar(0, 1, f"x_{i}") for i in range(n)]

    # Map code to index for dependency lookup
    code_to_idx = {init.get("code"): i for i, init in enumerate(initiatives)}

    # Constraint 1: Budget limit
    budget_constraint = solver.RowConstraint(0, total_budget, "BudgetConstraint")
    for i, init in enumerate(initiatives):
        budget_constraint.SetCoefficient(x[i], float(init.get("one_time_cost", 0.0)))

    # Constraint 2: Mandatory initiatives
    for i, init in enumerate(initiatives):
        if init.get("is_mandatory", False):
            solver.Add(x[i] == 1)

    # Constraint 3: Dependency constraints (x_B <= x_A if B depends on A)
    for i, init in enumerate(initiatives):
        deps = init.get("dependencies", [])
        if isinstance(deps, str):
            import json
            try:
                deps = json.loads(deps)
            except Exception:
                deps = []
        for dep_code in deps:
            if dep_code in code_to_idx:
                parent_idx = code_to_idx[dep_code]
                # x[i] - x[parent_idx] <= 0  ==>  x[i] <= x[parent_idx]
                solver.Add(x[i] <= x[parent_idx])

    # Constraint 4: Organizational implementation capacity constraint
    high_capacity_count = sum(1 for init in initiatives if init.get("capacity_requirement") == "High")
    if high_capacity_count > max_capacity_high:
        capacity_constraint = solver.RowConstraint(0, max_capacity_high, "CapacityConstraint")
        for i, init in enumerate(initiatives):
            if init.get("capacity_requirement") == "High":
                capacity_constraint.SetCoefficient(x[i], 1)

    # Objective Function
    objective_expr = solver.Objective()
    for i, init in enumerate(initiatives):
        reduction = float(init.get("expected_risk_reduction", 1.0))
        cost = max(1.0, float(init.get("one_time_cost", 1.0)))
        
        if objective == "max_roi":
            # Points reduced per 100,000 INR
            coeff = (reduction / cost) * 100000.0
        else:
            # Maximum Risk Reduction (default)
            coeff = reduction
            
        objective_expr.SetCoefficient(x[i], coeff)
    
    objective_expr.SetMaximization()

    status = solver.Solve()

    execution_time_ms = round((time.time() - start_time) * 1000, 2)
    selected = []
    total_cost = 0.0
    total_reduction = 0.0

    if status in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        for i in range(n):
            if x[i].solution_value() > 0.5:
                init = initiatives[i]
                selected.append({
                    "id": init.get("id"),
                    "code": init.get("code"),
                    "name": init.get("name"),
                    "category": init.get("category"),
                    "one_time_cost": init.get("one_time_cost"),
                    "recurring_cost": init.get("recurring_cost", 0.0),
                    "expected_risk_reduction": init.get("expected_risk_reduction"),
                    "confidence_pct": init.get("confidence_pct", 90.0),
                    "is_mandatory": init.get("is_mandatory", False),
                    "implementation_weeks": init.get("implementation_weeks", 6)
                })
                total_cost += float(init.get("one_time_cost", 0.0))
                total_reduction += float(init.get("expected_risk_reduction", 0.0))
        
        solver_status_str = "OPTIMAL" if status == pywraplp.Solver.OPTIMAL else "FEASIBLE"
    else:
        solver_status_str = "INFEASIBLE"

    # Non-linear diminished returns on large reductions to prevent negative residual risk
    effective_reduction = round(min(total_reduction * 0.82, current_enterprise_risk - 12.0), 1)
    optimized_risk = round(max(10.0, current_enterprise_risk - effective_reduction), 1)
    budget_remaining = max(0.0, total_budget - total_cost)
    
    # ROI: Risk points reduced per 10 Lakhs (1,000,000 INR)
    roi_metric = round((effective_reduction / (total_cost / 1000000.0)), 2) if total_cost > 0 else 0.0

    # Structured explanation
    explanation_parts = [
        f"Selected {len(selected)} high-impact security initiatives maximizing risk reduction under the ₹{total_budget:,.0f} budget cap.",
        f"Initial enterprise cyber risk of {current_enterprise_risk:.1f} is modeled to decrease to {optimized_risk:.1f} (-{effective_reduction:.1f} points).",
        f"Allocated ₹{total_cost:,.0f} ({((total_cost/total_budget)*100):.1f}% utilization) with ₹{budget_remaining:,.0f} buffer remaining.",
        f"Key priorities addressed: {', '.join([s['name'] for s in selected[:3]])}."
    ]
    explanation = " ".join(explanation_parts)

    return {
        "solver_status": solver_status_str,
        "selected_initiatives": selected,
        "initial_risk": current_enterprise_risk,
        "optimized_risk": optimized_risk,
        "risk_reduction": effective_reduction,
        "budget_used": total_cost,
        "budget_remaining": budget_remaining,
        "roi_metric": roi_metric,
        "explanation": explanation,
        "execution_time_ms": execution_time_ms
    }

def generate_portfolio_comparisons(
    initiatives: List[Dict[str, Any]],
    base_budget: float,
    current_enterprise_risk: float
) -> Dict[str, Any]:
    """
    Generates 3 comparative strategic portfolios:
    - Portfolio A (Recommended): Optimal Risk Reduction at given budget
    - Portfolio B (Max Risk Reduction): High-Impact focus (120% budget or aggressive)
    - Portfolio C (Cost-Efficient / Lean): Strict ROI efficiency (80% budget cap)
    """
    portfolio_a = optimize_security_investments(
        initiatives, total_budget=base_budget,
        current_enterprise_risk=current_enterprise_risk, objective="max_risk_reduction"
    )
    portfolio_a["name"] = "Balanced Recommended Portfolio"
    portfolio_a["strategy"] = "Optimal multi-domain risk reduction respecting organizational capacity."

    portfolio_b = optimize_security_investments(
        initiatives, total_budget=base_budget * 1.25,
        current_enterprise_risk=current_enterprise_risk, objective="max_risk_reduction"
    )
    portfolio_b["name"] = "Aggressive Defense Portfolio"
    portfolio_b["strategy"] = "Maximum threat surface elimination with extended budgetary allowance."

    portfolio_c = optimize_security_investments(
        initiatives, total_budget=base_budget * 0.70,
        current_enterprise_risk=current_enterprise_risk, objective="max_roi"
    )
    portfolio_c["name"] = "Lean High-ROI Portfolio"
    portfolio_c["strategy"] = "Prioritizes quickest payback and lowest capital expenditure per point reduced."

    return {
        "portfolio_a": portfolio_a,
        "portfolio_b": portfolio_b,
        "portfolio_c": portfolio_c
    }
