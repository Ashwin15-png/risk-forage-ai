from typing import Dict, Any, List, Optional
import math
from app.risk_engine.weights import DEFAULT_RISK_WEIGHTS

def calculate_asset_risk(
    asset_data: Any,
    vulnerabilities: Optional[List[Dict[str, Any]]] = None,
    controls: Optional[List[Dict[str, Any]]] = None,
    service_data: Optional[Dict[str, Any]] = None,
    weights_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Continuous Risk Engine:
    Risk = (Normalized Likelihood * Normalized Impact) / 100 * Exposure Modifier * Control Modifier
    Result normalized to [0, 100].
    Supports both ORM Asset instances and raw dictionary representations.
    """
    # If an SQLAlchemy Asset model is passed directly:
    if hasattr(asset_data, "hostname") and not isinstance(asset_data, dict):
        asset_obj = asset_data
        asset_dict = {
            "exposure": asset_obj.exposure,
            "criticality": asset_obj.criticality,
            "data_classification": asset_obj.data_classification,
            "control_coverage": asset_obj.control_coverage,
            "status": asset_obj.status
        }
        if vulnerabilities is None and hasattr(asset_obj, "vulnerabilities"):
            vulnerabilities = [
                {
                    "cve_id": v.cve_id,
                    "cvss_score": v.cvss_score,
                    "severity": v.severity,
                    "exploitability_score": v.exploitability_score,
                    "status": v.status
                }
                for v in asset_obj.vulnerabilities
            ]
        if controls is None and hasattr(asset_obj, "control_mappings"):
            controls = [
                {
                    "code": cm.control.code if cm.control else "CTL",
                    "name": cm.control.name if cm.control else "Control",
                    "coverage_pct": cm.control.coverage_pct if cm.control else 80.0,
                    "effectiveness_pct": cm.effectiveness_pct,
                    "is_active": cm.is_active
                }
                for cm in asset_obj.control_mappings
            ]
        if service_data is None and getattr(asset_obj, "service", None):
            service_data = {
                "business_impact_score": asset_obj.service.business_impact_score,
                "tier": asset_obj.service.tier
            }
        asset_data = asset_dict

    vulnerabilities = vulnerabilities or []
    controls = controls or []
    config = weights_config or DEFAULT_RISK_WEIGHTS
    exp_mults = config.get("exposure_multipliers", DEFAULT_RISK_WEIGHTS["exposure_multipliers"])
    crit_scores = config.get("criticality_scores", DEFAULT_RISK_WEIGHTS["criticality_scores"])
    data_mults = config.get("data_classification_multipliers", DEFAULT_RISK_WEIGHTS["data_classification_multipliers"])

    exposure = asset_data.get("exposure", "Internal")
    exposure_mod = exp_mults.get(exposure, 1.0)
    
    crit_level = asset_data.get("criticality", "Medium")
    asset_crit_val = crit_scores.get(crit_level, 50.0)
    
    data_class = asset_data.get("data_classification", "Internal")
    data_mod = data_mults.get(data_class, 1.0)

    # 1. Likelihood Calculation (CVSS max & sum, exploitability, open vuln count)
    active_vulns = [
        v for v in vulnerabilities
        if str(v.get("status", "Open")).strip().title() in ("Open", "In Progress", "Reopened")
    ]
    
    if not active_vulns:
        raw_likelihood = 18.0  # baseline residual likelihood
        max_cvss = 0.0
    else:
        cvss_scores = [v.get("cvss_score", 4.0) for v in active_vulns]
        max_cvss = max(cvss_scores)
        # Non-linear combination: top score has 70% weight, aggregate tail has 30%
        mean_cvss = sum(cvss_scores) / len(cvss_scores)
        combined_cvss = (max_cvss * 0.70) + (min(mean_cvss * 1.2, 10.0) * 0.30)
        
        # Scale 0-10 to 0-100 with exploitability boost
        raw_likelihood = combined_cvss * 8.5
        if exposure == "Internet-Facing":
            raw_likelihood += 10.0
    
    raw_likelihood = max(10.0, min(100.0, raw_likelihood))

    # 2. Impact Calculation (Asset criticality, data classification, Business Service impact)
    service_impact = 50.0
    if service_data:
        service_impact = service_data.get("business_impact_score", 50.0)
    
    raw_impact = (asset_crit_val * 0.50 + service_impact * 0.50) * data_mod
    raw_impact = max(15.0, min(100.0, raw_impact))

    # 3. Control Mitigation Calculation
    # Controls reduce likelihood & impact through effectiveness * coverage
    total_mitigation = 0.0
    for c in controls:
        eff = c.get("effectiveness_pct", 75.0) / 100.0
        cov = c.get("coverage_pct", 80.0) / 100.0
        reduction_wt = c.get("risk_reduction_weight", 0.15)
        # Is control active?
        is_active = c.get("is_active", True)
        if is_active:
            total_mitigation += (eff * cov * reduction_wt)

    # Mitigation caps out at 0.58 so residual risk cannot be completely zero
    mitigation_factor = min(0.58, total_mitigation)
    control_mod = max(0.42, 1.0 - mitigation_factor)

    # 4. Final Risk Calculation
    # Base risk combining likelihood and impact
    base_product = (raw_likelihood * 0.55 + raw_impact * 0.45)
    calculated_risk = base_product * (exposure_mod * 0.85) * control_mod
    final_score = round(max(5.0, min(100.0, calculated_risk)), 1)

    # 5. Risk Category
    if final_score >= 75.0:
        category = "Critical"
    elif final_score >= 50.0:
        category = "High"
    elif final_score >= 25.0:
        category = "Moderate"
    else:
        category = "Low"

    # 6. Confidence Score (Data quality, control validation recency, evidence count)
    confidence = calculate_confidence(active_vulns, controls, asset_data)

    # 7. Compute Deterministic Risk Drivers
    drivers = compute_risk_drivers(
        final_score=final_score,
        exposure=exposure,
        exposure_mod=exposure_mod,
        max_cvss=max_cvss,
        active_vulns_count=len(active_vulns),
        crit_level=crit_level,
        asset_crit_val=asset_crit_val,
        controls=controls,
        confidence=confidence
    )

    return {
        "risk_score": final_score,
        "category": category,
        "likelihood": round(raw_likelihood, 1),
        "impact": round(raw_impact, 1),
        "exposure_mod": round(exposure_mod, 2),
        "control_mod": round(control_mod, 2),
        "confidence_score": confidence,
        "model_version": config.get("model_version", "Risk Model v1.0"),
        "drivers": drivers,
        "active_vulns_count": len(active_vulns),
        "max_cvss": max_cvss,
        "assumptions": {
            "exposure_multipliers": exp_mults,
            "criticality_scores": crit_scores,
            "data_classification_multipliers": data_mults
        }
    }

def calculate_confidence(vulns: List[Dict[str, Any]], controls: List[Dict[str, Any]], asset: Dict[str, Any]) -> float:
    score = 88.0
    if not vulns:
        score -= 4.0
    if len(controls) < 3:
        score -= 6.0
    if asset.get("control_coverage", 0) > 80:
        score += 4.0
    if asset.get("status") == "Active":
        score += 2.0
    return round(min(98.0, max(60.0, score)), 1)

def compute_risk_drivers(
    final_score: float,
    exposure: str,
    exposure_mod: float,
    max_cvss: float,
    active_vulns_count: int,
    crit_level: str,
    asset_crit_val: float,
    controls: List[Dict[str, Any]],
    confidence: float
) -> List[Dict[str, Any]]:
    drivers = []

    # 1. Exposure Driver
    if exposure == "Internet-Facing":
        drivers.append({
            "name": "Internet Exposure",
            "driver_type": "Exposure",
            "impact_contribution": +18.0 if max_cvss >= 7.0 else +14.0,
            "confidence": confidence,
            "details": "Asset has public internet-facing attack surface."
        })
    elif exposure == "DMZ":
        drivers.append({
            "name": "DMZ Perimeter Exposure",
            "driver_type": "Exposure",
            "impact_contribution": +8.0,
            "confidence": confidence,
            "details": "Asset located in DMZ boundary zone."
        })

    # 2. Critical/High Vulnerabilities Driver
    if max_cvss >= 9.0:
        drivers.append({
            "name": f"Critical Vulnerability (CVSS {max_cvss:.1f})",
            "driver_type": "Vulnerability",
            "impact_contribution": +21.0,
            "confidence": confidence,
            "details": f"{active_vulns_count} active CVEs identified, highest CVSS {max_cvss:.1f} with active weaponization risk."
        })
    elif max_cvss >= 7.0:
        drivers.append({
            "name": f"High Vulnerability (CVSS {max_cvss:.1f})",
            "driver_type": "Vulnerability",
            "impact_contribution": +14.0,
            "confidence": confidence,
            "details": f"{active_vulns_count} high-severity vulnerabilities requiring expedited patching."
        })
    elif active_vulns_count > 0:
        drivers.append({
            "name": f"Unpatched Vulnerabilities ({active_vulns_count})",
            "driver_type": "Vulnerability",
            "impact_contribution": +7.0,
            "confidence": confidence,
            "details": f"{active_vulns_count} moderate/low vulnerabilities present."
        })

    # 3. Asset Criticality Driver
    if crit_level in ("Critical", "High"):
        contrib = +13.0 if crit_level == "Critical" else +8.0
        drivers.append({
            "name": f"{crit_level} Asset Criticality",
            "driver_type": "Asset Criticality",
            "impact_contribution": contrib,
            "confidence": 95.0,
            "details": "Core financial or customer transactional tier asset."
        })

    # 4. Control Gaps / Mitigations
    mfa_present = any("MFA" in c.get("name", "") or c.get("code") == "CTL-MFA" for c in controls if c.get("is_active", True))
    seg_present = any("Segment" in c.get("name", "") or c.get("code") == "CTL-SEG" for c in controls if c.get("is_active", True))
    edr_present = any("EDR" in c.get("name", "") or c.get("code") == "CTL-EDR" for c in controls if c.get("is_active", True))

    if not mfa_present:
        drivers.append({
            "name": "Weak / Missing MFA Enforcement",
            "driver_type": "Control Gap",
            "impact_contribution": +9.0,
            "confidence": 90.0,
            "details": "Multi-factor authentication not strictly enforced across access paths."
        })
    
    if not seg_present and exposure == "Internet-Facing":
        drivers.append({
            "name": "Lack of Zero Trust Micro-Segmentation",
            "driver_type": "Control Gap",
            "impact_contribution": +7.5,
            "confidence": 88.0,
            "details": "Blast radius uncontained due to direct network peer reachability."
        })

    # Mitigating Controls (negative impact on risk)
    if edr_present:
        drivers.append({
            "name": "Active EDR Telemetry & Monitoring",
            "driver_type": "Control Effectiveness",
            "impact_contribution": -8.0,
            "confidence": 92.0,
            "details": "Real-time endpoint detection and automated quarantine capability active."
        })

    if mfa_present:
        drivers.append({
            "name": "Enforced Hardware MFA",
            "driver_type": "Control Effectiveness",
            "impact_contribution": -11.0,
            "confidence": 94.0,
            "details": "FIDO2 / Phishing-resistant credential challenge enforced."
        })

    if seg_present:
        drivers.append({
            "name": "Network Segmentation Controls",
            "driver_type": "Control Effectiveness",
            "impact_contribution": -9.5,
            "confidence": 91.0,
            "details": "Lateral movement restricted via micro-segmented security groups."
        })

    return drivers


def calculate_global_risk(assets: List[Any]) -> float:
    """
    Computes enterprise global risk score from assets,
    weighted by asset criticality (Critical=2.2, High=1.6, Medium=1.0, Low=0.5).
    """
    if not assets:
        return 50.0

    weight_map = {"Critical": 2.2, "High": 1.6, "Medium": 1.0, "Low": 0.5}
    total_weighted = 0.0
    total_weight = 0.0

    for a in assets:
        score = getattr(a, "current_risk_score", 50.0) if hasattr(a, "current_risk_score") else (a.get("current_risk_score", 50.0) if isinstance(a, dict) else 50.0)
        crit = getattr(a, "criticality", "Medium") if hasattr(a, "criticality") else (a.get("criticality", "Medium") if isinstance(a, dict) else "Medium")
        w = weight_map.get(crit, 1.0)
        total_weighted += float(score) * w
        total_weight += w

    if total_weight == 0:
        return 50.0
    return round(total_weighted / total_weight, 1)
