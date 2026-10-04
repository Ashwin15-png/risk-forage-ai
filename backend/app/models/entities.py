import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel, generate_uuid, utc_now

# 1. Organization
class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    industry = Column(String(100), default="Financial Services")
    currency = Column(String(10), default="INR")
    currency_symbol = Column(String(5), default="₹")
    description = Column(Text, nullable=True)
    default_budget = Column(Float, default=5000000.0)
    risk_weights_json = Column(Text, default="{}")

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    services = relationship("BusinessService", back_populates="organization", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="organization", cascade="all, delete-orphan")
    controls = relationship("SecurityControl", back_populates="organization", cascade="all, delete-orphan")
    evidence_sources = relationship("EvidenceSource", back_populates="organization", cascade="all, delete-orphan")
    investments = relationship("InvestmentInitiative", back_populates="organization", cascade="all, delete-orphan")


# 2. User
class User(BaseModel):
    __tablename__ = "users"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True, default="")  # Empty for Google-only users
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="ciso")  # admin, ciso, analyst, auditor
    is_active = Column(Boolean, default=True)

    # Firebase Authentication fields
    firebase_uid = Column(String(128), unique=True, index=True, nullable=True)
    photo_url = Column(String(500), nullable=True)
    provider = Column(String(100), default="password")  # google.com, password
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="users")


# 3. Business Service
class BusinessService(BaseModel):
    __tablename__ = "business_services"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    tier = Column(String(50), default="Tier 1")  # Tier 1, Tier 2, Tier 3
    criticality = Column(String(50), default="Critical")  # Critical, High, Medium, Low
    business_impact_score = Column(Float, default=85.0)  # 0 to 100
    financial_loss_per_hour = Column(Float, default=500000.0)  # In INR
    owner = Column(String(255), default="SecOps Lead")
    status = Column(String(50), default="Operational")  # Operational, Degraded, Under Maintenance
    current_risk_score = Column(Float, default=50.0)
    current_likelihood = Column(Float, default=50.0)
    current_impact = Column(Float, default=50.0)
    trend = Column(String(20), default="stable")  # up, down, stable
    top_driver = Column(String(255), default="Vulnerability Exposure")
    confidence = Column(Float, default=90.0)

    organization = relationship("Organization", back_populates="services")
    assets = relationship("Asset", back_populates="service")
    incidents = relationship("Incident", back_populates="service")
    threat_scenarios = relationship("ThreatScenario", back_populates="service")


# 4. Asset
class Asset(BaseModel):
    __tablename__ = "assets"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String(36), ForeignKey("business_services.id", ondelete="SET NULL"), nullable=True)
    asset_id_code = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(100), default="Server")  # Server, Database, Cloud Service, API Gateway, Endpoint, IoT
    ip_address = Column(String(100), nullable=True)
    hostname = Column(String(255), nullable=True)
    exposure = Column(String(50), default="Internal")  # Internet-Facing, Internal, DMZ, Partner
    criticality = Column(String(50), default="High")  # Critical, High, Medium, Low
    owner = Column(String(255), default="Infrastructure Team")
    data_classification = Column(String(50), default="Confidential")  # Confidential, Restricted, Public
    control_coverage = Column(Float, default=75.0)  # Percentage 0-100
    current_risk_score = Column(Float, default=45.0)  # 0 to 100
    current_likelihood = Column(Float, default=40.0)
    current_impact = Column(Float, default=60.0)
    status = Column(String(50), default="Active")
    last_seen = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="assets")
    service = relationship("BusinessService", back_populates="assets")
    vulnerabilities = relationship("Vulnerability", back_populates="asset", cascade="all, delete-orphan")
    software_items = relationship("SoftwareInventory", back_populates="asset", cascade="all, delete-orphan")
    control_mappings = relationship("AssetControl", back_populates="asset", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="asset")


# 5. Vulnerability
class Vulnerability(BaseModel):
    __tablename__ = "vulnerabilities"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    cve_id = Column(String(50), index=True, nullable=False)  # e.g., CVE-2024-3094
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), default="Medium")  # Critical, High, Medium, Low
    cvss_score = Column(Float, default=5.0)  # 0.0 - 10.0
    exploitability_score = Column(Float, default=5.0)
    exposure_modifier = Column(Float, default=1.0)
    status = Column(String(50), default="Open")  # Open, In Progress, Mitigated, Resolved, Reopened
    risk_contribution = Column(Float, default=10.0)

    # Real Vulnerability Intelligence Fields (NVD, CISA KEV, FIRST EPSS)
    epss_score = Column(Float, default=0.0)  # 0.0 to 1.0 (probability of exploitation in next 30 days)
    epss_percentile = Column(Float, default=0.0)  # 0.0 to 1.0
    is_cisa_kev = Column(Boolean, default=False)  # In CISA Known Exploited Vulnerabilities catalog
    kev_date_added = Column(String(50), nullable=True)
    affected_product = Column(String(255), nullable=True)
    cpe_uri = Column(String(255), nullable=True)
    confidence_score = Column(Float, default=90.0)  # Data confidence
    source = Column(String(100), default="NVD")  # NVD, CISA KEV, EPSS, Tenable, Qualys
    source_timestamp = Column(DateTime(timezone=True), default=utc_now)
    correlation_status = Column(String(50), default="CORRELATED")  # CORRELATED, CORRELATION UNCERTAIN
    correlation_confidence = Column(Float, default=95.0)

    first_seen = Column(DateTime(timezone=True), default=utc_now)
    last_updated = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    asset = relationship("Asset", back_populates="vulnerabilities")


# 5b. Software Inventory
class SoftwareInventory(BaseModel):
    __tablename__ = "software_inventory"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    vendor = Column(String(100), nullable=False)
    product = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    cpe_uri = Column(String(255), nullable=True)
    package_type = Column(String(50), default="binary")  # deb, rpm, pypi, npm, binary
    installed_path = Column(String(255), nullable=True)
    correlation_status = Column(String(50), default="CORRELATED")  # CORRELATED, CORRELATION UNCERTAIN, NO MATCH
    matched_cves_count = Column(Integer, default=0)
    last_scanned_at = Column(DateTime(timezone=True), default=utc_now)

    asset = relationship("Asset", back_populates="software_items")


# 6. Security Control
class SecurityControl(BaseModel):
    __tablename__ = "security_controls"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., CTL-MFA, CTL-EDR
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Identity")  # Identity, Endpoint, Network, Data, AppSec, Operations
    description = Column(Text, nullable=True)
    coverage_pct = Column(Float, default=80.0)  # 0 to 100
    effectiveness_pct = Column(Float, default=75.0)  # 0 to 100
    risk_reduction_weight = Column(Float, default=0.25)  # Impact on risk multiplier
    evidence_quality_score = Column(Float, default=85.0)
    last_validated_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="controls")
    asset_mappings = relationship("AssetControl", back_populates="control", cascade="all, delete-orphan")


# Asset-Control Mapping
class AssetControl(BaseModel):
    __tablename__ = "asset_controls"

    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False)
    control_id = Column(String(36), ForeignKey("security_controls.id", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True)
    effectiveness_pct = Column(Float, default=80.0)
    last_checked = Column(DateTime(timezone=True), default=utc_now)

    asset = relationship("Asset", back_populates="control_mappings")
    control = relationship("SecurityControl", back_populates="asset_mappings")


# 7. Incident
class Incident(BaseModel):
    __tablename__ = "incidents"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String(36), ForeignKey("business_services.id", ondelete="SET NULL"), nullable=True)
    asset_id = Column(String(36), ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)
    incident_number = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    incident_type = Column(String(100), default="Unauthorized Access")
    severity = Column(String(50), default="Medium")  # Critical, High, Medium, Low
    status = Column(String(50), default="Open")  # Open, Investigating, Mitigated, Closed
    estimated_financial_loss = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    detected_at = Column(DateTime(timezone=True), default=utc_now)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    service = relationship("BusinessService", back_populates="incidents")
    asset = relationship("Asset", back_populates="incidents")


# 8. Threat Scenario
class ThreatScenario(BaseModel):
    __tablename__ = "threat_scenarios"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    service_id = Column(String(36), ForeignKey("business_services.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    threat_actor = Column(String(100), default="Organized Cybercrime")
    attack_vector = Column(String(100), default="Ransomware / Extortion")
    likelihood_score = Column(Float, default=65.0)  # 0 to 100
    financial_impact = Column(Float, default=15000000.0)  # in INR
    description = Column(Text, nullable=True)

    service = relationship("BusinessService", back_populates="threat_scenarios")


# 9. Risk Snapshot
class RiskSnapshot(BaseModel):
    __tablename__ = "risk_snapshots"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), default="global")  # global, service, asset
    entity_id = Column(String(36), nullable=True, index=True)
    risk_score = Column(Float, nullable=False)  # 0 - 100
    likelihood = Column(Float, nullable=False)
    impact = Column(Float, nullable=False)
    exposure_mod = Column(Float, default=1.0)
    control_mod = Column(Float, default=0.8)
    confidence_score = Column(Float, default=90.0)
    model_version = Column(String(50), default="Risk Model v1.0")
    snapshot_date = Column(DateTime(timezone=True), default=utc_now, index=True)
    assumptions_json = Column(Text, default="{}")
    drivers_json = Column(Text, default="[]")

    drivers = relationship("RiskDriver", back_populates="snapshot", cascade="all, delete-orphan")


# 10. Risk Driver
class RiskDriver(BaseModel):
    __tablename__ = "risk_drivers"

    snapshot_id = Column(String(36), ForeignKey("risk_snapshots.id", ondelete="CASCADE"), nullable=False)
    driver_type = Column(String(100), nullable=False)  # Exposure, Vulnerability, Control Gap, Asset Criticality
    name = Column(String(255), nullable=False)
    impact_contribution = Column(Float, nullable=False)  # e.g., +18, -7
    affected_assets_count = Column(Integer, default=1)
    confidence = Column(Float, default=90.0)
    details = Column(Text, nullable=True)

    snapshot = relationship("RiskSnapshot", back_populates="drivers")


# 11. Investment Initiative
class InvestmentInitiative(BaseModel):
    __tablename__ = "investment_initiatives"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., INV-MFA-01
    name = Column(String(255), nullable=False)
    category = Column(String(100), default="Identity & Access")
    description = Column(Text, nullable=True)
    one_time_cost = Column(Float, nullable=False)  # In INR
    recurring_cost = Column(Float, default=0.0)    # In INR / year
    expected_risk_reduction = Column(Float, nullable=False)  # Points of risk reduction (e.g. 14.5)
    affected_services_json = Column(Text, default="[]")  # list of service IDs or names
    affected_controls_json = Column(Text, default="[]")  # list of control codes
    implementation_weeks = Column(Integer, default=6)
    capacity_requirement = Column(String(50), default="Medium")  # Low, Medium, High
    is_mandatory = Column(Boolean, default=False)
    dependencies_json = Column(Text, default="[]")  # list of prerequisite initiative codes
    confidence_pct = Column(Float, default=88.0)
    status = Column(String(50), default="Catalog")  # Catalog, Proposed, Approved, Implemented

    organization = relationship("Organization", back_populates="investments")


# 12. Optimization Run
class OptimizationRun(BaseModel):
    __tablename__ = "optimization_runs"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    model_version = Column(String(50), default="Optimizer v1.0")
    total_budget = Column(Float, nullable=False)
    objective = Column(String(100), default="max_risk_reduction")  # max_risk_reduction, max_roi
    selected_initiatives_json = Column(Text, default="[]")
    initial_risk = Column(Float, nullable=False)
    optimized_risk = Column(Float, nullable=False)
    risk_reduction = Column(Float, nullable=False)
    budget_used = Column(Float, nullable=False)
    budget_remaining = Column(Float, nullable=False)
    roi_metric = Column(Float, default=0.0)  # risk reduction per million INR
    solver_status = Column(String(50), default="OPTIMAL")
    explanation = Column(Text, nullable=True)
    execution_time_ms = Column(Float, default=12.5)

    approvals = relationship("DecisionApproval", back_populates="optimization_run", cascade="all, delete-orphan")


# 13. Decision / Approval
class DecisionApproval(BaseModel):
    __tablename__ = "decision_approvals"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    optimization_run_id = Column(String(36), ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False)
    investment_code = Column(String(50), nullable=False)
    status = Column(String(50), default="Approved")  # Approved, Rejected, Pending Review
    approved_by = Column(String(255), default="Chief Information Security Officer")
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), default=utc_now)

    optimization_run = relationship("OptimizationRun", back_populates="approvals")


# 14. Model Version
class ModelVersion(BaseModel):
    __tablename__ = "model_versions"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(String(50), nullable=False)
    model_type = Column(String(50), default="risk_engine")  # risk_engine, optimizer, anomaly_detector
    weights_json = Column(Text, default="{}")
    assumptions_json = Column(Text, default="{}")
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    metrics_json = Column(Text, default="{}")


# 15. Audit Event
class AuditEvent(BaseModel):
    __tablename__ = "audit_events"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    user_email = Column(String(255), default="system")
    action = Column(String(100), nullable=False)  # Risk Recalculated, Evidence Ingested, Scenario Created, Optimization Executed
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    old_values_json = Column(Text, nullable=True)
    new_values_json = Column(Text, nullable=True)
    model_version = Column(String(50), default="v1.0")
    source = Column(String(100), default="System Engine")
    ip_address = Column(String(50), default="127.0.0.1")
    description = Column(Text, nullable=True)


# 16. Evidence Source
class EvidenceSource(BaseModel):
    __tablename__ = "evidence_sources"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    source_type = Column(String(100), default="EDR")  # EDR, Vulnerability Scanner, Cloud Security, SIEM, Manual CSV
    status = Column(String(50), default="Healthy")  # Healthy, Stale, Missing, Conflicting
    freshness_score = Column(Float, default=95.0)  # 0 to 100
    confidence_score = Column(Float, default=92.0)
    total_records = Column(Integer, default=0)
    last_sync_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="evidence_sources")
    records = relationship("EvidenceRecord", back_populates="source", cascade="all, delete-orphan")


# 17. Evidence Record
class EvidenceRecord(BaseModel):
    __tablename__ = "evidence_records"

    source_id = Column(String(36), ForeignKey("evidence_sources.id", ondelete="CASCADE"), nullable=False)
    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    record_type = Column(String(50), default="vulnerability")  # asset, vulnerability, control, incident
    raw_payload_json = Column(Text, nullable=False)
    normalized_payload_json = Column(Text, nullable=True)
    data_quality_score = Column(Float, default=95.0)
    validation_status = Column(String(50), default="Valid")  # Valid, Warning, Error
    validation_errors_json = Column(Text, default="[]")
    ingestion_timestamp = Column(DateTime(timezone=True), default=utc_now)

    source = relationship("EvidenceSource", back_populates="records")


# 18. Scenario
class Scenario(BaseModel):
    __tablename__ = "scenarios"

    org_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    baseline_risk = Column(Float, nullable=False)
    scenario_risk = Column(Float, nullable=False)
    risk_reduction = Column(Float, nullable=False)
    estimated_cost = Column(Float, default=0.0)
    confidence = Column(Float, default=90.0)
    changes_json = Column(Text, default="[]")  # List of what-if mutations
    created_by = Column(String(255), default="Risk Analyst")

    results = relationship("ScenarioResult", back_populates="scenario", cascade="all, delete-orphan")


# 19. Scenario Result
class ScenarioResult(BaseModel):
    __tablename__ = "scenario_results"

    scenario_id = Column(String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False)
    entity_type = Column(String(50), default="service")  # service, asset
    entity_id = Column(String(100), nullable=False)
    entity_name = Column(String(255), nullable=False)
    baseline_score = Column(Float, nullable=False)
    projected_score = Column(Float, nullable=False)
    delta = Column(Float, nullable=False)  # baseline - projected (positive = reduction)
    drivers_json = Column(Text, default="[]")

    scenario = relationship("Scenario", back_populates="results")
