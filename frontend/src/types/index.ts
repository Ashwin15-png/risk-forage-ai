export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  org_id: string;
}

export interface BusinessService {
  id: string;
  name: string;
  code: string;
  tier: string;
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  business_impact_score: number;
  financial_loss_per_hour: number;
  owner: string;
  status: string;
  current_risk_score: number;
  current_likelihood: number;
  current_impact: number;
  trend: 'up' | 'down' | 'stable';
  top_driver: string;
  confidence: number;
  assets_count?: number;
  incidents_count?: number;
  description?: string;
}

export interface Asset {
  id: string;
  asset_id_code: string;
  name: string;
  asset_type: string;
  service_id?: string;
  service_name?: string;
  ip_address?: string;
  hostname?: string;
  exposure: 'Internet-Facing' | 'Internal' | 'DMZ' | 'Partner';
  criticality: 'Critical' | 'High' | 'Medium' | 'Low';
  owner?: string;
  data_classification?: string;
  current_risk_score: number;
  current_likelihood: number;
  current_impact: number;
  control_coverage: number;
  vulnerabilities_count: number;
  last_seen: string;
  status?: string;
}

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  cvss_score: number;
  exploitability_score?: number;
  status: 'Open' | 'In Progress' | 'Mitigated' | 'Resolved' | 'Reopened';
  risk_contribution: number;
  asset_id: string;
  asset_id_code: string;
  asset_name: string;
  exposure: string;
  first_seen: string;
  last_updated: string;
}

export interface SecurityControl {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  coverage_pct: number;
  effectiveness_pct: number;
  risk_reduction_weight: number;
  evidence_quality_score: number;
  affected_assets_count?: number;
  last_validated: string;
}

export interface RiskDriver {
  name: string;
  driver_type: string;
  impact_contribution: number;
  affected_assets?: number;
  confidence?: number;
  details?: string;
}

export type DataMode = 'DEMO' | 'LIVE' | 'SIMULATION';

export interface ExecutiveKPI {
  total_risk: number;
  previous_risk: number;
  risk_category: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  delta_pct: number;
  critical_assets: number;
  critical_vulnerabilities: number;
  open_incidents: number;
  risk_reduction_opportunity: number;
  current_security_investment: number;
  evidence_confidence: number;
  expected_annual_loss?: number;
  total_financial_exposure?: number;
}

export interface ComplianceControl {
  framework_id: string;
  framework_name: string;
  code: string;
  name: string;
  domain: string;
  mapped_control: {
    id?: string;
    code: string;
    name: string;
    coverage_pct: number;
    effectiveness_pct: number;
    evidence_quality: number;
    affected_assets_count: number;
  };
  status: 'Implemented' | 'Partially Implemented' | 'Non-Compliant';
  status_color: string;
  risk_contribution: number;
  owner: string;
  last_review: string;
  remediation: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  category: string;
  description: string;
  score: number;
  total_controls: number;
  compliant_count: number;
  partial_count: number;
  non_compliant_count: number;
  controls: ComplianceControl[];
}

export interface TrendPoint {
  date: string;
  risk_score: number;
  likelihood: number;
  impact: number;
  exposure: number;
  residual_risk: number;
  confidence: number;
}

export interface InvestmentInitiative {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  one_time_cost: number;
  recurring_cost: number;
  expected_risk_reduction: number;
  implementation_weeks: number;
  capacity_requirement: string;
  is_mandatory: boolean;
  dependencies: string[];
  affected_services?: string[];
  affected_controls?: string[];
  confidence_pct: number;
  status: string;
}

export interface OptimizationResult {
  id?: string;
  solver_status: string;
  initial_risk: number;
  optimized_risk: number;
  risk_reduction: number;
  budget_used: number;
  budget_remaining: number;
  roi_metric: number;
  explanation: string;
  execution_time_ms: number;
  selected_initiatives: Array<{
    id?: string;
    code: string;
    name: string;
    category: string;
    one_time_cost: number;
    expected_risk_reduction: number;
    confidence_pct?: number;
    implementation_weeks?: number;
    is_mandatory?: boolean;
  }>;
}

export interface EvidenceSource {
  id: string;
  name: string;
  source_type: string;
  status: 'Healthy' | 'Stale' | 'Missing' | 'Conflicting';
  freshness_score: number;
  confidence_score: number;
  total_records: number;
  last_sync: string;
}

export interface EvidenceRecord {
  id: string;
  source_name: string;
  record_type: string;
  raw_payload: any;
  normalized_payload: any;
  data_quality_score: number;
  validation_status: 'Valid' | 'Warning' | 'Error';
  validation_errors: string[];
  ingestion_timestamp: string;
}

export interface ScenarioResult {
  id: string;
  name: string;
  baseline_risk: number;
  scenario_risk: number;
  risk_reduction: number;
  estimated_cost: number;
  confidence: number;
  created_by?: string;
  created_at?: string;
  changes_count?: number;
  applied_actions?: string[];
  asset_comparisons?: Array<{
    asset_id_code: string;
    name: string;
    risk_score: number;
    reduction: number;
  }>;
}

export interface AIExplanation {
  what: string;
  why: string;
  evidence: string;
  impact: string;
  confidence: string;
  what_if: string;
  recommended_action: string;
  executive_summary: string;
  delta: number;
  generated_at: string;
}

export interface Anomaly {
  id: string;
  anomaly: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  detected_at: string;
  affected_entity: string;
  reason: string;
  confidence: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  entity_type: string;
  model_version: string;
  source: string;
  ip_address: string;
  description: string;
}
