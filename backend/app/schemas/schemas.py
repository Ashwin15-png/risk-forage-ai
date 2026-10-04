from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    org_id: str
    photo_url: Optional[str] = None
    provider: Optional[str] = "password"

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    photo_url: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Optional[str] = "analyst"

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    description: Optional[str] = None
    default_budget: Optional[float] = None

class CalibrationUpdate(BaseModel):
    exposure_weight: Optional[float] = None
    criticality_weight: Optional[float] = None
    control_discount: Optional[float] = None

class ControlUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    effectiveness_pct: Optional[float] = None
    coverage_pct: Optional[float] = None
    risk_reduction_weight: Optional[float] = None
    is_active: Optional[bool] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Vulnerability
class VulnerabilityStatusUpdate(BaseModel):
    status: str  # Open, Resolved, In Progress, Mitigated, Reopened

# Scenario Simulation
class ScenarioChangeItem(BaseModel):
    action_type: str  # add_control, patch_vulnerabilities, modify_exposure, network_segmentation
    control_code: Optional[str] = None
    control_name: Optional[str] = None
    effectiveness_pct: Optional[float] = 85.0
    coverage_pct: Optional[float] = 95.0
    risk_reduction_weight: Optional[float] = 0.20
    new_exposure: Optional[str] = None
    patch_cvss_threshold: Optional[float] = 7.0
    target_asset_ids: Optional[List[str]] = []
    target_service_ids: Optional[List[str]] = []
    estimated_cost: Optional[float] = 0.0

class ScenarioCreateRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    changes: List[ScenarioChangeItem]

# Optimization
class OptimizationRequest(BaseModel):
    total_budget: float = 5000000.0  # 50 Lakh INR default
    objective: str = "max_risk_reduction"  # max_risk_reduction, max_roi
    candidate_initiative_codes: Optional[List[str]] = None

class DecisionApprovalRequest(BaseModel):
    optimization_run_id: str
    investment_code: str
    status: str = "Approved"  # Approved, Rejected
    comments: Optional[str] = ""

# Evidence Ingestion
class EvidenceBatchRequest(BaseModel):
    source_name: str = "Manual CSV Feed"
    record_type: str = "vulnerability"  # vulnerability, asset, control
    records: List[Dict[str, Any]]

class SourceRegisterRequest(BaseModel):
    name: str
    source_type: str = "EDR"

# Investment Initiative
class InvestmentCreateRequest(BaseModel):
    name: str
    code: str
    category: str = "Identity & Access"
    one_time_cost: float
    recurring_cost: float = 0.0
    expected_risk_reduction: float
    description: Optional[str] = ""
    is_mandatory: bool = False
    implementation_weeks: int = 6
    capacity_requirement: str = "Medium"
    dependencies: Optional[List[str]] = []

# Reports
class ReportGenerateRequest(BaseModel):
    report_type: str = "executive"  # executive, technical, investment, scenario, audit
    title: Optional[str] = "RISKFORGE AI \u2014 Cyber Risk Intelligence Executive Report"
