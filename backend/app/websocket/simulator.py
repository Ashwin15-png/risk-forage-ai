"""
Live Simulation Engine — broadcasts realistic cybersecurity events via WebSocket.

Runs as a FastAPI background task. In DEMO_MODE, emits a sequence of
Risk Surge / Vulnerability / Optimization events so the frontend stays
animated and shows live-like updates even without an actual external feed.
"""
import asyncio
import json
import logging
import os
import random
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ── Event templates ────────────────────────────────────────────────────────────

RISK_SURGE_EVENTS = [
    {"asset_name": "Payment API Gateway", "asset_code": "pay-api-gw-01", "delta": "+8.3", "cve": "CVE-2026-9999", "reason": "New critical exploit published"},
    {"asset_name": "Core Banking Ledger DB", "asset_code": "core-db-01", "delta": "+6.1", "cve": "CVE-2026-8821", "reason": "CISA KEV entry added"},
    {"asset_name": "Mobile Banking App Cluster", "asset_code": "mobile-app-01", "delta": "+5.7", "cve": "CVE-2026-7741", "reason": "EPSS score escalated to 0.94"},
    {"asset_name": "Internet-Facing WAF", "asset_code": "waf-ext-01", "delta": "+4.2", "cve": "CVE-2026-6612", "reason": "Active exploitation observed in wild"},
    {"asset_name": "SWIFT Messaging Gateway", "asset_code": "swift-gw-01", "delta": "+9.8", "cve": "CVE-2026-5503", "reason": "FS-ISAC threat intel alert"},
]

VULNERABILITY_RESOLVED_EVENTS = [
    {"asset_name": "Employee Identity & SSO", "cve_id": "CVE-2025-3421", "new_risk": 41.2, "delta": "-12.4", "action": "Patch deployed via Ansible"},
    {"asset_name": "Analytics Data Warehouse", "cve_id": "CVE-2025-2211", "new_risk": 38.7, "delta": "-9.3", "action": "Virtual patch applied via WAF rule"},
    {"asset_name": "Fraud Detection ML Engine", "cve_id": "CVE-2025-1102", "new_risk": 44.5, "delta": "-7.8", "action": "Configuration hardened"},
    {"asset_name": "Regulatory Reporting API", "cve_id": "CVE-2025-4433", "new_risk": 29.1, "delta": "-15.2", "action": "Software update applied"},
]

RISK_UPDATED_EVENTS = [
    {"message": "Continuous risk engine recalculated. Enterprise risk score: 72.4 (High). 3 assets improved.", "score": 72.4},
    {"message": "NVD telemetry sync complete. 4 new CVEs ingested, 2 assets impacted. Risk baseline updated.", "score": 74.1},
    {"message": "EPSS probability scores refreshed. Payment Gateway likelihood increased to 84%. EAL recalculated.", "score": 75.6},
    {"message": "Control effectiveness audit: MFA deployment rose to 78%. Risk score reduced by 2.1 points.", "score": 70.3},
    {"message": "CISA KEV cross-correlation complete. 1 critical asset confirmed exploitable. Risk escalated.", "score": 77.2},
]

OPTIMIZATION_COMPLETED_EVENTS = [
    {"risk_reduction": 28, "budget_used": 4800000, "controls": ["MFA (FIDO2)", "Network Segmentation"], "roi": "3.2x"},
    {"risk_reduction": 32, "budget_used": 5000000, "controls": ["Zero Trust Architecture", "EDR Agent"], "roi": "4.1x"},
    {"risk_reduction": 24, "budget_used": 3200000, "controls": ["Patch Automation", "SIEM Tuning"], "roi": "2.8x"},
]


async def live_simulation_loop(ws_manager, interval_seconds: int = 20):
    """
    Background coroutine that broadcasts simulated live risk events.
    Cycles through event types to simulate continuous risk intelligence.
    """
    demo_mode = os.getenv("DEMO_MODE", "true").lower() == "true"
    if not demo_mode:
        logger.info("DEMO_MODE=false — live simulation engine disabled")
        return

    logger.info(f"Live simulation engine started (interval={interval_seconds}s)")

    event_cycle = [
        ("RISK_SURGE_EVENT", RISK_SURGE_EVENTS),
        ("RISK_UPDATED", RISK_UPDATED_EVENTS),
        ("VULNERABILITY_RESOLVED", VULNERABILITY_RESOLVED_EVENTS),
        ("RISK_UPDATED", RISK_UPDATED_EVENTS),
        ("OPTIMIZATION_COMPLETED", OPTIMIZATION_COMPLETED_EVENTS),
        ("RISK_SURGE_EVENT", RISK_SURGE_EVENTS),
        ("RISK_UPDATED", RISK_UPDATED_EVENTS),
    ]
    idx = 0

    # Stagger the first event by a few seconds so the UI loads first
    await asyncio.sleep(8)

    while True:
        try:
            if ws_manager.active_connections:
                event_type, event_list = event_cycle[idx % len(event_cycle)]
                payload = random.choice(event_list).copy()
                payload["timestamp"] = datetime.now(timezone.utc).isoformat()
                payload["simulated"] = True

                await ws_manager.broadcast(event_type, payload)
                logger.info(f"[LiveSim] Broadcast {event_type} → {len(ws_manager.active_connections)} client(s)")
            idx += 1
        except Exception as e:
            logger.warning(f"[LiveSim] Error broadcasting event: {e}")

        # Randomize interval slightly for realism (15–35 seconds)
        jitter = random.randint(-5, 15)
        await asyncio.sleep(max(10, interval_seconds + jitter))
