from typing import List, Dict, Any
from app.risk_engine.calculator import calculate_asset_risk

def calculate_service_risk(
    service_data: Dict[str, Any],
    assets_with_risk: List[Dict[str, Any]],
    recent_incidents: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Aggregates asset risk scores into Business Service risk.
    Higher criticality assets carry heavier weight in the service composite score.
    """
    if not assets_with_risk:
        base = service_data.get("business_impact_score", 50.0) * 0.5
        return {
            "risk_score": round(base, 1),
            "likelihood": 30.0,
            "impact": round(service_data.get("business_impact_score", 50.0), 1),
            "category": "Moderate",
            "confidence": 85.0,
            "top_driver": "No Registered Assets",
            "drivers": []
        }

    weights = []
    scores = []
    likelihoods = []
    impacts = []
    drivers_pool = []

    for a in assets_with_risk:
        crit = a.get("criticality", "Medium")
        w = 1.0
        if crit == "Critical":
            w = 2.5
        elif crit == "High":
            w = 1.8
        elif crit == "Medium":
            w = 1.0
        elif crit == "Low":
            w = 0.5
        
        if a.get("exposure") == "Internet-Facing":
            w *= 1.4

        weights.append(w)
        scores.append(a.get("current_risk_score", 50.0) * w)
        likelihoods.append(a.get("current_likelihood", 40.0) * w)
        impacts.append(a.get("current_impact", 50.0) * w)
        if a.get("drivers"):
            drivers_pool.extend(a.get("drivers"))

    total_w = sum(weights) or 1.0
    agg_score = sum(scores) / total_w
    agg_likelihood = sum(likelihoods) / total_w
    agg_impact = sum(impacts) / total_w

    # Incident penalty
    if recent_incidents:
        open_crit_incidents = [i for i in recent_incidents if i.get("severity") in ("Critical", "High") and i.get("status") != "Closed"]
        if open_crit_incidents:
            agg_score = min(100.0, agg_score + (len(open_crit_incidents) * 4.5))

    final_score = round(max(5.0, min(100.0, agg_score)), 1)
    
    if final_score >= 75.0:
        category = "Critical"
    elif final_score >= 50.0:
        category = "High"
    elif final_score >= 25.0:
        category = "Moderate"
    else:
        category = "Low"

    # Consolidate top drivers
    driver_impacts = {}
    for d in drivers_pool:
        name = d.get("name", "Unknown Driver")
        driver_impacts[name] = driver_impacts.get(name, 0.0) + d.get("impact_contribution", 0.0)

    sorted_drivers = sorted(driver_impacts.items(), key=lambda x: abs(x[1]), reverse=True)
    top_driver_name = sorted_drivers[0][0] if sorted_drivers else "Vulnerability Exposure"

    return {
        "risk_score": final_score,
        "likelihood": round(agg_likelihood, 1),
        "impact": round(agg_impact, 1),
        "category": category,
        "confidence": 92.0,
        "top_driver": top_driver_name,
        "drivers": [{"name": k, "impact_contribution": round(v, 1)} for k, v in sorted_drivers[:5]]
    }
