from typing import Dict, Any

DEFAULT_RISK_WEIGHTS: Dict[str, Any] = {
    "model_name": "RISKFORGE AI \u2014 Continuous Risk Engine",
    "model_version": "Risk Model v1.0",
    "weights": {
        "vulnerability_weight": 0.40,
        "exposure_weight": 0.25,
        "asset_criticality_weight": 0.20,
        "control_effectiveness_weight": 0.15,
    },
    "exposure_multipliers": {
        "Internet-Facing": 1.45,
        "DMZ": 1.15,
        "Partner": 1.05,
        "Internal": 0.80
    },
    "criticality_scores": {
        "Critical": 95.0,
        "High": 75.0,
        "Medium": 45.0,
        "Low": 20.0
    },
    "data_classification_multipliers": {
        "Restricted": 1.30,
        "Confidential": 1.15,
        "Internal": 1.00,
        "Public": 0.70
    },
    "risk_thresholds": {
        "Low": (0.0, 24.99),
        "Moderate": (25.0, 49.99),
        "High": (50.0, 74.99),
        "Critical": (75.0, 100.0)
    }
}
