import pytest
from app.risk_engine.calculator import calculate_asset_risk
from app.optimizer.solver import optimize_security_investments
from app.utils.normalization import normalize_vulnerability_record, normalize_asset_record
from app.scenario_engine.simulator import simulate_security_scenario

def test_risk_calculation_deterministic():
    asset = {
        "exposure": "Internet-Facing",
        "criticality": "Critical",
        "data_classification": "Restricted",
        "control_coverage": 80.0,
        "status": "Active"
    }
    vulns = [
        {"cvss_score": 9.8, "status": "Open"},
        {"cvss_score": 7.5, "status": "Open"}
    ]
    controls = [
        {"code": "CTL-EDR", "effectiveness_pct": 80.0, "coverage_pct": 85.0, "risk_reduction_weight": 0.20, "is_active": True}
    ]
    res1 = calculate_asset_risk(asset, vulns, controls)
    res2 = calculate_asset_risk(asset, vulns, controls)
    assert res1["risk_score"] == res2["risk_score"]
    assert res1["risk_score"] >= 70.0  # Critical asset with CVSS 9.8 on Internet

def test_optimizer_respects_budget():
    initiatives = [
        {"id": "1", "code": "INV-1", "name": "MFA", "one_time_cost": 1500000.0, "expected_risk_reduction": 12.0, "is_mandatory": True, "dependencies": []},
        {"id": "2", "code": "INV-2", "name": "EDR", "one_time_cost": 2000000.0, "expected_risk_reduction": 10.0, "is_mandatory": False, "dependencies": []},
        {"id": "3", "code": "INV-3", "name": "SEG", "one_time_cost": 2500000.0, "expected_risk_reduction": 14.0, "is_mandatory": False, "dependencies": ["INV-1"]},
        {"id": "4", "code": "INV-4", "name": "WAF", "one_time_cost": 1000000.0, "expected_risk_reduction": 6.0, "is_mandatory": False, "dependencies": []},
    ]
    budget = 4000000.0  # 40 Lakhs
    res = optimize_security_investments(initiatives, total_budget=budget, current_enterprise_risk=75.0)
    assert res["solver_status"] in ("OPTIMAL", "FEASIBLE")
    assert res["budget_used"] <= budget
    assert res["risk_reduction"] > 0
    # Mandatory initiative must be chosen
    selected_codes = [s["code"] for s in res["selected_initiatives"]]
    assert "INV-1" in selected_codes

def test_normalization_validates_cve():
    # Valid
    norm, errs, q = normalize_vulnerability_record({
        "asset_id": "srv-01",
        "cve_id": "CVE-2024-3094",
        "cvss_score": 9.8
    })
    assert len(errs) == 0
    assert norm["severity"] == "Critical"
    assert q >= 90.0

    # Invalid: missing asset and invalid CVSS
    norm_bad, errs_bad, q_bad = normalize_vulnerability_record({
        "cve_id": "INVALID",
        "cvss_score": "not_a_number"
    })
    assert len(errs_bad) >= 2
    assert q_bad < 80.0

def test_scenario_simulation_produces_delta():
    assets = [{
        "id": "a1", "asset_id_code": "web-01", "name": "Web Ingress",
        "exposure": "Internet-Facing", "criticality": "High", "data_classification": "Confidential",
        "control_coverage": 70.0, "status": "Active",
        "vulnerabilities": [{"cvss_score": 9.0, "status": "Open"}]
    }]
    controls = [{"code": "CTL-EDR", "effectiveness_pct": 70.0, "coverage_pct": 70.0, "risk_reduction_weight": 0.15, "is_active": True}]
    changes = [{
        "action_type": "add_control", "control_code": "CTL-MFA", "control_name": "Phishing-Resistant MFA",
        "effectiveness_pct": 90.0, "coverage_pct": 95.0, "risk_reduction_weight": 0.25, "estimated_cost": 500000.0
    }]
    sim = simulate_security_scenario(assets, [], controls, changes)
    assert sim["baseline_risk"] > sim["scenario_risk"]
    assert sim["risk_reduction"] > 0.0
    assert sim["estimated_cost"] == 500000.0
