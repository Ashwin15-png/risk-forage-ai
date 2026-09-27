import re
from typing import Dict, Any, List, Tuple
from datetime import datetime, timezone

def normalize_vulnerability_record(raw: Dict[str, Any], source_name: str = "Tenable Nessus") -> Tuple[Dict[str, Any], List[str], float]:
    """
    Normalizes a vulnerability evidence item. Returns (normalized_dict, validation_errors, quality_score).
    """
    errors = []
    quality_score = 100.0

    # 1. Asset identifier validation
    asset_ref = raw.get("asset_id") or raw.get("asset_id_code") or raw.get("host") or raw.get("ip") or raw.get("hostname")
    if not asset_ref:
        errors.append("Missing required asset reference ('asset_id', 'host', or 'ip')")
        quality_score -= 30.0

    # 2. CVE ID validation
    cve_id = str(raw.get("cve_id") or raw.get("cve") or raw.get("vulnerability_id") or "").upper().strip()
    if not cve_id:
        errors.append("Missing CVE identifier")
        quality_score -= 25.0
    elif not re.match(r"^CVE-\d{4}-\d{4,7}$", cve_id):
        # Warning/minor penalty for non-standard format
        quality_score -= 10.0

    # 3. CVSS Score validation
    raw_cvss = raw.get("cvss_score") or raw.get("cvss") or raw.get("base_score") or 5.0
    try:
        cvss_score = float(raw_cvss)
        if cvss_score < 0.0 or cvss_score > 10.0:
            errors.append(f"CVSS score {cvss_score} outside valid range [0.0, 10.0]")
            cvss_score = max(0.0, min(10.0, cvss_score))
            quality_score -= 15.0
    except (ValueError, TypeError):
        errors.append("Invalid CVSS format: could not parse numeric float")
        cvss_score = 5.0
        quality_score -= 20.0

    # 4. Severity derivation
    raw_sev = str(raw.get("severity") or "").capitalize()
    if raw_sev in ("Critical", "High", "Medium", "Low"):
        severity = raw_sev
    else:
        if cvss_score >= 9.0:
            severity = "Critical"
        elif cvss_score >= 7.0:
            severity = "High"
        elif cvss_score >= 4.0:
            severity = "Medium"
        else:
            severity = "Low"

    # Title & description
    title = raw.get("title") or raw.get("plugin_name") or f"Vulnerability {cve_id}"
    description = raw.get("description") or f"Detected via {source_name}"
    status = raw.get("status") or "Open"
    if status not in ("Open", "In Progress", "Mitigated", "Resolved", "Reopened"):
        status = "Open"

    normalized = {
        "asset_ref": str(asset_ref).strip() if asset_ref else None,
        "cve_id": cve_id or "CVE-UNKNOWN",
        "title": str(title).strip(),
        "description": str(description).strip(),
        "severity": severity,
        "cvss_score": round(cvss_score, 1),
        "status": status,
        "exploitability_score": float(raw.get("exploitability_score") or (cvss_score * 0.9)),
        "source": source_name,
        "normalized_at": datetime.now(timezone.utc).isoformat()
    }

    return normalized, errors, max(10.0, round(quality_score, 1))

def normalize_asset_record(raw: Dict[str, Any], source_name: str = "CMDB") -> Tuple[Dict[str, Any], List[str], float]:
    errors = []
    quality_score = 100.0

    asset_id_code = raw.get("asset_id_code") or raw.get("id") or raw.get("asset_id") or raw.get("hostname")
    if not asset_id_code:
        errors.append("Asset is missing unique identifier ('asset_id_code' or 'id')")
        quality_score -= 40.0

    name = raw.get("name") or raw.get("hostname") or f"Asset-{asset_id_code}"
    asset_type = raw.get("asset_type") or raw.get("type") or "Server"
    
    exposure = raw.get("exposure") or "Internal"
    if exposure not in ("Internet-Facing", "Internal", "DMZ", "Partner"):
        if "internet" in str(exposure).lower() or "public" in str(exposure).lower():
            exposure = "Internet-Facing"
        elif "dmz" in str(exposure).lower():
            exposure = "DMZ"
        else:
            exposure = "Internal"

    criticality = raw.get("criticality") or "Medium"
    if criticality not in ("Critical", "High", "Medium", "Low"):
        criticality = "Medium"

    normalized = {
        "asset_id_code": str(asset_id_code).strip() if asset_id_code else None,
        "name": str(name).strip(),
        "asset_type": str(asset_type).strip(),
        "ip_address": raw.get("ip_address") or raw.get("ip"),
        "hostname": raw.get("hostname"),
        "exposure": exposure,
        "criticality": criticality,
        "service_name": raw.get("service_name") or raw.get("service"),
        "owner": raw.get("owner") or "SecOps Team",
        "data_classification": raw.get("data_classification") or "Confidential",
        "control_coverage": float(raw.get("control_coverage") or 75.0),
        "source": source_name,
        "normalized_at": datetime.now(timezone.utc).isoformat()
    }

    return normalized, errors, max(10.0, round(quality_score, 1))

def normalize_control_record(raw: Dict[str, Any], source_name: str = "Compliance Telemetry") -> Tuple[Dict[str, Any], List[str], float]:
    errors = []
    quality_score = 100.0

    code = raw.get("code") or raw.get("control_id")
    if not code:
        errors.append("Missing control code identifier")
        quality_score -= 30.0

    name = raw.get("name") or f"Control {code}"
    category = raw.get("category") or "Operations"
    
    try:
        cov = float(raw.get("coverage_pct") or 80.0)
        eff = float(raw.get("effectiveness_pct") or 75.0)
    except (ValueError, TypeError):
        errors.append("Invalid numeric coverage or effectiveness")
        cov, eff = 75.0, 75.0
        quality_score -= 20.0

    normalized = {
        "code": str(code).strip() if code else None,
        "name": str(name).strip(),
        "category": str(category).strip(),
        "coverage_pct": max(0.0, min(100.0, cov)),
        "effectiveness_pct": max(0.0, min(100.0, eff)),
        "risk_reduction_weight": float(raw.get("risk_reduction_weight") or 0.20),
        "source": source_name,
        "normalized_at": datetime.now(timezone.utc).isoformat()
    }

    return normalized, errors, max(10.0, round(quality_score, 1))
