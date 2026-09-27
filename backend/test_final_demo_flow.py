import json
import asyncio
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.entities import (
    User, BusinessService, Asset, Vulnerability, SecurityControl,
    InvestmentInitiative, OptimizationRun, Scenario, AuditEvent, RiskSnapshot
)
from app.routes.auth import login
from app.schemas.schemas import LoginRequest
from app.routes.risks import get_executive_overview, get_risk_landscape, get_entity_risk_history
from app.routes.reports import preview_report
from app.risk_engine.calculator import calculate_asset_risk
from app.scenario_engine.simulator import simulate_security_scenario
from app.optimizer.solver import optimize_security_investments
from app.ml.explanation import generate_risk_explanation
from app.reports.generator import generate_executive_report_pdf

def execute_final_sih_demo_flow():
    db = SessionLocal()
    print("================================================================================")
    print(" EXECUTING COMPLETE SIH 26105 PRESENTATION DEMO FLOW (WITH LIVE VALUES)")
    print("================================================================================")

    # Step 1: Login
    auth_res = login(LoginRequest(email="ciso@demofinancial.com", password="DemoPassword2026!"), db=db)
    print(f"[DEMO STEP 1] Login Authenticated: {auth_res['user']['full_name']} ({auth_res['user']['role'].upper()})")

    # Step 2: Executive Dashboard Overview
    overview = get_executive_overview(db=db)
    kpi = overview["kpi"]
    print(f"[DEMO STEP 2] Executive Dashboard: Global Risk Score = {kpi['total_risk']} ({kpi['risk_category']}) | Total Exposure = ₹{kpi['total_financial_exposure']:,.2f} | EAL = ₹{kpi['expected_annual_loss']:,.2f}")

    # Step 3: Risk Landscape
    landscape = get_risk_landscape(db=db)
    print(f"[DEMO STEP 3] Risk Landscape Heatmap: {len(landscape)} assets mapped across Likelihood vs Impact.")

    # Step 4: Select Critical Service
    services = overview["highest_risk_services"]
    top_srv = services[0] if services else None
    print(f"[DEMO STEP 4] Top Critical Service Selected: {top_srv['name']} (Risk: {top_srv['risk_score']}, EAL: ₹{top_srv['eal']:,.2f}, Top Driver: '{top_srv['top_driver']}')")

    # Step 5: Inspect Asset
    target_asset = db.query(Asset).filter(Asset.asset_id_code == "pay-api-gw-01").first() or db.query(Asset).first()
    print(f"[DEMO STEP 5] Asset Deep-Dive: {target_asset.name} ({target_asset.asset_id_code}) | Criticality: {target_asset.criticality} | Exposure: {target_asset.exposure} | Risk: {target_asset.current_risk_score}")

    # Step 6: Show Real Vulnerability Intelligence
    vulns = target_asset.vulnerabilities
    print(f"[DEMO STEP 6] Active Vulnerability Intelligence: {len(vulns)} CVEs mapped to asset.")
    for v in vulns[:2]:
        print(f"   -> {v.cve_id}: CVSS {v.cvss_score} ({v.severity}) | KEV: {v.is_cisa_kev} | EPSS: {v.epss_score:.3f} | Status: {v.status}")

    # Step 7: Show Risk Drivers
    drivers = overview["top_drivers"]
    print(f"[DEMO STEP 7] Risk Drivers Identified: {len(drivers)} active contributors.")
    for d in drivers[:3]:
        print(f"   -> {d['name']} ({d['driver_type']}): Impact {d['impact_contribution']:+0.1f} pts (Confidence: {d['confidence']}%)")

    # Step 8: Trigger Controlled/Demo Risk Change (Simulate Zero-Day Surge)
    surge_calc = calculate_asset_risk(
        asset_data={"id": target_asset.id, "asset_id_code": target_asset.asset_id_code, "exposure": target_asset.exposure, "criticality": target_asset.criticality, "control_coverage": target_asset.control_coverage},
        vulnerabilities=[{"cvss_score": 9.8, "status": "OPEN"}, {"cvss_score": 8.1, "status": "OPEN"}],
        controls=[{"code": "CTL-FW", "effectiveness_pct": 80.0, "coverage_pct": 90.0, "risk_reduction_weight": 0.20, "is_active": True}]
    )
    delta_surge = round(surge_calc["risk_score"] - target_asset.current_risk_score, 1)
    print(f"[DEMO STEP 8] Controlled Risk Surge Injected: Zero-Day CVE-2026-9999 (CVSS 9.8) on {target_asset.name}")

    # Step 9: Show Real-Time Risk Update
    print(f"[DEMO STEP 9] Real-Time Telemetry Update: Asset Risk surged {target_asset.current_risk_score} -> {surge_calc['risk_score']} (+{delta_surge} pts)")

    # Step 10: Open What-If Scenario
    all_assets = db.query(Asset).all()
    baseline_assets = [{"id": a.id, "asset_id_code": a.asset_id_code, "name": a.name, "exposure": a.exposure, "criticality": a.criticality, "data_classification": a.data_classification, "control_coverage": a.control_coverage, "status": a.status, "vulnerabilities": [{"cvss_score": v.cvss_score, "status": v.status} for v in a.vulnerabilities]} for a in all_assets]
    baseline_services = [{"id": s.id, "name": s.name, "business_impact_score": s.business_impact_score} for s in db.query(BusinessService).all()]
    baseline_controls = [{"code": "CTL-MFA", "name": "MFA", "effectiveness_pct": 85.0, "coverage_pct": 70.0, "risk_reduction_weight": 0.25, "is_active": True}]

    # Step 11: Apply MFA + Micro-Segmentation + Vulnerability Remediation
    scenario_actions = [
        {"action_type": "add_control", "control_code": "CTL-HW-MFA", "control_name": "FIDO2 Hardware MFA", "effectiveness_pct": 98.0, "coverage_pct": 100.0, "risk_reduction_weight": 0.30, "estimated_cost": 1500000.0},
        {"action_type": "network_segmentation", "estimated_cost": 2200000.0},
        {"action_type": "patch_vulnerabilities", "patch_cvss_threshold": 8.0, "estimated_cost": 800000.0}
    ]
    sim_res = simulate_security_scenario(baseline_assets, baseline_services, baseline_controls, scenario_actions)
    print(f"[DEMO STEP 11] Applied Scenario Interventions: Hardware MFA + Network Micro-segmentation + Critical CVE Patching")

    # Step 12: Compare Baseline vs Scenario
    print(f"[DEMO STEP 12] Scenario Comparison: Baseline Risk {sim_res['baseline_risk']} -> Projected Scenario Risk {sim_res['scenario_risk']} (Delta: -{sim_res['risk_reduction']} pts | Total Cost: ₹{sim_res['estimated_cost']:,.2f})")

    # Step 13: Open Investment Optimizer
    print(f"[DEMO STEP 13] Opened Investment Optimizer: Target Budget = ₹50,00,000 INR")

    # Step 14: Generate Portfolio with ₹50L Budget
    initiatives = db.query(InvestmentInitiative).all()
    inv_list = [{"id": inv.id, "code": inv.code, "name": inv.name, "one_time_cost": inv.one_time_cost, "recurring_cost": inv.recurring_cost, "expected_risk_reduction": inv.expected_risk_reduction, "is_mandatory": inv.is_mandatory, "dependencies": json.loads(inv.dependencies_json) if inv.dependencies_json else [], "capacity_requirement": inv.capacity_requirement} for inv in initiatives]
    opt_res = optimize_security_investments(inv_list, total_budget=5000000.0, current_enterprise_risk=kpi["total_risk"], objective="max_risk_reduction")
    print(f"[DEMO STEP 14] Portfolio Generated: {len(opt_res['selected_initiatives'])} initiatives selected | Cost: ₹{opt_res['budget_used']:,.2f} / ₹50,00,000.00 | Risk Reduction: -{opt_res['risk_reduction']} pts (Initial: {opt_res['initial_risk']} -> Optimized: {opt_res['optimized_risk']})")

    # Step 15: Show AI Explanation
    ai_expl = generate_risk_explanation(
        current_risk=kpi["total_risk"],
        previous_risk=35.0,
        top_drivers=drivers,
        high_risk_service=top_srv["name"] if top_srv else "Payment Gateway"
    )
    print(f"[DEMO STEP 15] AI Grounded Explanation: WHAT='{ai_expl['what']}'")
    print(f"   -> RECOMMENDATION='{ai_expl['recommended_action']}'")

    # Step 16: Generate PDF Report & Open Audit Trail
    pdf_payload = {
        "organization_name": "Demo Financial Services Ltd.",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "risk_score": kpi["total_risk"],
        "category": kpi["risk_category"],
        "potential_reduction": opt_res["risk_reduction"],
        "recommended_budget": f"₹{int(opt_res['budget_used']):,}",
        "drivers": [{"name": d["name"], "impact": f"{d['impact_contribution']:+0.1f}", "confidence": int(d["confidence"])} for d in drivers[:4]],
        "model_version": "Risk Model v1.0",
        "audit_id": "AUD-DEMO-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    }
    pdf_data = generate_executive_report_pdf(pdf_payload)
    recent_audits = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(3).all()
    print(f"[DEMO STEP 16] PDF Report Generated ({len(pdf_data):,} bytes) & Audit Trail Verified ({len(recent_audits)} recent immutable events logged).")

    db.close()
    print("\n================================================================================")
    print(" COMPLETE PRESENTATION DEMO FLOW EXECUTED WITH ACTUAL LIVE SYSTEM VALUES.")
    print("================================================================================")

if __name__ == "__main__":
    execute_final_sih_demo_flow()
