import asyncio
import pytest
from app.database import SessionLocal
from app.models.entities import (
    Organization, User, BusinessService, Asset, Vulnerability,
    SecurityControl, AssetControl, Incident, ThreatScenario,
    RiskSnapshot, RiskDriver, InvestmentInitiative, OptimizationRun,
    DecisionApproval, ModelVersion, AuditEvent, EvidenceSource,
    EvidenceRecord, Scenario, ScenarioResult
)
from app.risk_engine.calculator import calculate_asset_risk
from app.websocket.manager import ws_manager

def test_19_canonical_entities_in_database():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        assert org is not None
        assert org.name == "Demo Financial Services Ltd."
        assert org.currency == "INR"
        
        assert db.query(User).count() >= 4
        assert db.query(BusinessService).count() >= 12
        assert db.query(Asset).count() >= 43
        assert db.query(Vulnerability).count() >= 80
        assert db.query(SecurityControl).count() >= 18
        assert db.query(Incident).count() >= 24
        assert db.query(ThreatScenario).count() >= 5
        assert db.query(RiskSnapshot).count() >= 30
        assert db.query(RiskDriver).count() >= 5
        assert db.query(InvestmentInitiative).count() >= 18
        assert db.query(EvidenceSource).count() >= 8
        assert db.query(EvidenceRecord).count() >= 5
        assert db.query(ModelVersion).count() >= 3
        assert db.query(AuditEvent).count() >= 1
    finally:
        db.close()

def test_risk_drivers_calculation():
    asset = {
        "exposure": "Internet-Facing",
        "criticality": "Critical",
        "data_classification": "Confidential",
        "control_coverage": 65.0
    }
    vulns = [
        {"cvss_score": 9.8, "status": "Open"},
        {"cvss_score": 8.5, "status": "Open"}
    ]
    controls = [
        {"code": "CTL-MFA", "effectiveness_pct": 30.0, "coverage_pct": 50.0}
    ]
    result = calculate_asset_risk(asset, vulns, controls)
    assert "drivers" in result
    drivers = result["drivers"]
    assert len(drivers) > 0
    driver_types = [d["driver_type"] for d in drivers]
    assert "Vulnerability" in driver_types
    assert "Exposure" in driver_types

@pytest.mark.anyio
async def test_websocket_manager_lifecycle():
    assert ws_manager is not None
    await ws_manager.broadcast("SYSTEM_STATUS", {"status": "operational", "data_mode": "LIVE"})
