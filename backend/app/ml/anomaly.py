import numpy as np
from typing import List, Dict, Any
from datetime import datetime, timezone

def detect_risk_anomalies(
    history_snapshots: List[Dict[str, Any]],
    current_risk: float,
    vulnerabilities: List[Dict[str, Any]],
    evidence_sources: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Detects statistical spikes and operational anomalies across risk trajectories,
    vulnerability counts, and evidence feed health.
    """
    anomalies = []
    now_iso = datetime.now(timezone.utc).isoformat()

    # 1. Statistical Risk Jump (Z-Score / moving average)
    if len(history_snapshots) >= 3:
        past_scores = [float(s.get("risk_score", 50.0)) for s in history_snapshots[-14:]]
        mean_past = np.mean(past_scores)
        std_past = np.std(past_scores) or 1.5
        z_score = (current_risk - mean_past) / std_past

        if z_score > 2.0 or (current_risk - mean_past) > 12.0:
            anomalies.append({
                "id": "ANOM-RISK-SPIKE",
                "anomaly": "Sudden Cyber Risk Spike",
                "severity": "Critical" if z_score > 2.5 else "High",
                "detected_at": now_iso,
                "affected_entity": "Enterprise Portfolio / Payment Gateway",
                "reason": f"Risk surged by +{current_risk - mean_past:.1f} points above 14-day rolling average (Z-score: {z_score:.2f}).",
                "confidence": 95.0
            })
    elif current_risk >= 75.0:
        anomalies.append({
            "id": "ANOM-CRIT-RISK",
            "anomaly": "Critical Cyber Risk Threshold Exceeded",
            "severity": "Critical",
            "detected_at": now_iso,
            "affected_entity": "Payment Gateway Cluster",
            "reason": f"Composite risk score ({current_risk:.1f}) breached 75.0 critical threshold.",
            "confidence": 94.0
        })

    # 2. Sudden Vulnerability Spike
    crit_vulns = [v for v in vulnerabilities if v.get("severity") == "Critical" and v.get("status") in ("Open", "Reopened")]
    if len(crit_vulns) >= 5:
        anomalies.append({
            "id": "ANOM-VULN-SPIKE",
            "anomaly": "Critical Vulnerability Concentration",
            "severity": "High",
            "detected_at": now_iso,
            "affected_entity": "External Network Assets",
            "reason": f"Identified {len(crit_vulns)} active unmitigated Critical CVEs across perimeter systems.",
            "confidence": 98.0
        })

    # 3. Stale or Missing Evidence Feeds
    for src in evidence_sources:
        status = src.get("status")
        name = src.get("name", "Unknown Source")
        if status == "Stale":
            anomalies.append({
                "id": f"ANOM-EVID-STALE-{src.get('id', '0')}",
                "anomaly": f"Stale Evidence Stream: {name}",
                "severity": "Medium",
                "detected_at": now_iso,
                "affected_entity": f"Data Pipeline / {name}",
                "reason": "Telemetry has not received heartbeats or synchronization logs in > 24 hours.",
                "confidence": 99.0
            })
        elif status == "Missing":
            anomalies.append({
                "id": f"ANOM-EVID-MISS-{src.get('id', '0')}",
                "anomaly": f"Missing Critical Evidence Source: {name}",
                "severity": "High",
                "detected_at": now_iso,
                "affected_entity": f"Data Pipeline / {name}",
                "reason": "Expected feed disconnected or API credentials rejected.",
                "confidence": 100.0
            })
        elif status == "Conflicting":
            anomalies.append({
                "id": f"ANOM-EVID-CONF-{src.get('id', '0')}",
                "anomaly": f"Conflicting Telemetry: {name}",
                "severity": "Medium",
                "detected_at": now_iso,
                "affected_entity": f"Data Pipeline / {name}",
                "reason": "Control coverage reported conflicts with active host inventory records.",
                "confidence": 88.0
            })

    return anomalies
