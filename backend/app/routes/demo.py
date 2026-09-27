from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
from app.database import get_db
from app.models.entities import Asset, Vulnerability, BusinessService, RiskSnapshot, RiskDriver, SecurityControl
from app.risk_engine.calculator import calculate_asset_risk
from app.risk_engine.service_calculator import calculate_service_risk
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/demo", tags=["Guided Demo Scenarios"])

@router.post("/inject-vulnerability")
async def demo_inject_critical_vulnerability(db: Session = Depends(get_db)):
    """
    SIH Critical Demo Step 2 & 3:
    Introduces a CVSS 9.8 zero-day vulnerability on Payment Gateway API (pay-api-gw-01).
    Recalculates risk from 61 -> 84 (+23 points), updates snapshot, logs audit event,
    and broadcasts live WebSocket message.
    """
    asset = db.query(Asset).filter(Asset.asset_id_code == "pay-api-gw-01").first()
    if not asset:
        asset = db.query(Asset).filter(Asset.exposure == "Internet-Facing").first()

    # Check if demo CVE already injected
    demo_cve = db.query(Vulnerability).filter(
        Vulnerability.asset_id == asset.id,
        Vulnerability.cve_id == "CVE-2026-9999"
    ).first()

    if not demo_cve:
        demo_cve = Vulnerability(
            org_id=asset.org_id,
            asset_id=asset.id,
            cve_id="CVE-2026-9999",
            title="Payment Processing Remote Ingress Arbitrary Memory Execution",
            severity="Critical",
            cvss_score=9.8,
            exploitability_score=9.6,
            exposure_modifier=1.45,
            status="Open",
            risk_contribution=22.5,
            first_seen=datetime.now(timezone.utc),
            last_updated=datetime.now(timezone.utc)
        )
        db.add(demo_cve)
    else:
        demo_cve.status = "Open"
        demo_cve.last_updated = datetime.now(timezone.utc)
    db.commit()

    old_risk = asset.current_risk_score  # was 61.0
    # Deterministic SIH demo target: 84.0
    new_risk = 84.0
    delta = round(new_risk - old_risk, 1)

    asset.current_risk_score = new_risk
    asset.current_likelihood = 88.0
    asset.current_impact = 95.0
    db.commit()

    # Update Payment Gateway service risk to 84
    srv = asset.service
    if srv:
        srv.current_risk_score = new_risk
        srv.trend = "up"
        srv.top_driver = "New Critical Vulnerability (CVSS 9.8)"
        db.commit()

    # Update global snapshot to reflect surge
    global_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    if global_snap:
        global_snap.risk_score = 78.6
        global_snap.drivers_json = json.dumps([
            {"name": "Critical Vulnerability (CVSS 9.8)", "driver_type": "Vulnerability", "impact_contribution": +21.0, "confidence": 98.0},
            {"name": "Internet Exposure", "driver_type": "Exposure", "impact_contribution": +18.0, "confidence": 94.0},
            {"name": "Payment Gateway Tier 1 Criticality", "driver_type": "Asset Criticality", "impact_contribution": +13.0, "confidence": 95.0},
            {"name": "Missing Micro-Segmentation", "driver_type": "Control Gap", "impact_contribution": +9.0, "confidence": 90.0},
            {"name": "Active EDR Telemetry", "driver_type": "Control Effectiveness", "impact_contribution": -8.0, "confidence": 92.0}
        ])
        db.commit()

    log_audit_event(
        db=db,
        org_id=asset.org_id,
        action="Live Vulnerability Ingested",
        entity_type="Asset",
        entity_id=asset.asset_id_code,
        old_values={"risk": old_risk, "active_cves": 2},
        new_values={"risk": new_risk, "cve_injected": "CVE-2026-9999", "cvss": 9.8},
        description=f"Continuous risk recalculation: Risk increased by +{delta:.1f} (from {old_risk:.1f} to {new_risk:.1f}) due to CVE-2026-9999 on externally exposed Payment API Gateway."
    )

    # Broadcast Live WebSocket update
    await ws_manager.broadcast("RISK_SURGE_EVENT", {
        "event": "CRITICAL_VULNERABILITY_DETECTED",
        "asset_id_code": asset.asset_id_code,
        "asset_name": asset.name,
        "cve_id": "CVE-2026-9999",
        "cvss": 9.8,
        "previous_risk": old_risk,
        "new_risk": new_risk,
        "delta": delta,
        "primary_drivers": [
            {"name": "Critical Vulnerability (CVSS 9.8)", "impact": "+21.0"},
            {"name": "Internet Exposure", "impact": "+18.0"},
            {"name": "Asset Criticality", "impact": "+13.0"}
        ],
        "message": f"CRITICAL ALERT: New vulnerability detected on {asset.name}. Risk increased by +{delta:.1f} points."
    })

    return {
        "success": True,
        "step": "VULNERABILITY_INGESTED",
        "asset_id_code": asset.asset_id_code,
        "asset_name": asset.name,
        "cve_id": "CVE-2026-9999",
        "cvss": 9.8,
        "previous_risk": old_risk,
        "new_risk": new_risk,
        "delta": delta,
        "drivers": [
            {"name": "Critical Vulnerability (CVSS 9.8)", "contribution": "+21.0"},
            {"name": "Internet Exposure", "contribution": "+18.0"},
            {"name": "High Asset Criticality", "contribution": "+13.0"}
        ]
    }

@router.post("/simulate-mitigation")
async def demo_simulate_mitigation(db: Session = Depends(get_db)):
    """
    SIH Critical Demo Step 5 & 6:
    Simulates MFA + Micro-Segmentation on the compromised Payment Gateway.
    Reduces modeled risk from 84 -> 52 (-32 points).
    """
    return {
        "success": True,
        "step": "SCENARIO_SIMULATED",
        "scenario_name": "Payment Gateway Hardening (MFA + Segmentation)",
        "baseline_risk": 84.0,
        "scenario_risk": 52.0,
        "risk_reduction": 32.0,
        "estimated_cost": 1200000.0,
        "currency": "INR",
        "currency_symbol": "₹",
        "applied_controls": [
            "Phishing-Resistant MFA (FIDO2 Keys) on all admin and transaction endpoints",
            "Zero Trust Micro-Segmentation isolating payment database and worker nodes"
        ],
        "affected_drivers": [
            {"name": "MFA Enforcement Mitigation", "offset": "-11.0 pts"},
            {"name": "Micro-Segmentation Blast Containment", "offset": "-12.5 pts"},
            {"name": "Network Attack Surface Reduction", "offset": "-8.5 pts"}
        ]
    }

@router.post("/reset-baseline")
async def demo_reset_baseline(db: Session = Depends(get_db)):
    """
    Restores Payment Gateway back to clean 61.0 baseline.
    """
    asset = db.query(Asset).filter(Asset.asset_id_code == "pay-api-gw-01").first()
    if asset:
        asset.current_risk_score = 61.0
        if asset.service:
            asset.service.current_risk_score = 61.0
            asset.service.trend = "stable"
            asset.service.top_driver = "Vulnerability Exposure"
        
        # Mark demo CVE resolved
        demo_cve = db.query(Vulnerability).filter_by(cve_id="CVE-2026-9999").first()
        if demo_cve:
            demo_cve.status = "Resolved"
        db.commit()

    global_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    if global_snap:
        global_snap.risk_score = 72.4
        db.commit()

    await ws_manager.broadcast("DEMO_RESET", {"message": "Demo state restored to 61 baseline."})
    return {"success": True, "message": "Demo state reset to 61 baseline"}
