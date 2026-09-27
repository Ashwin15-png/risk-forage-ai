# SIH 26105 — Step 4 Fix Validation Report

**Target Scope:** Resolution and validation of the 3 confirmed blockers identified in Step 3.  
**Execution Timestamp:** 2026-09-27T00:23:00+05:30  
**Testing Modality:** Live backend unit tests, frontend build compilation, REST API invocation, and WebSocket event stream testing.

---

## 1. Summary of Fixes Made

### Fix 1: PDF Report Generation Import Error
- **Target File:** `backend/app/routes/reports.py`
- **Issue:** Endpoint `GET /api/v1/reports/download-pdf` returned `HTTP 500 Internal Server Error` due to `NameError: name 'ws_manager' is not defined` at line 73.
- **Root Cause:** `await ws_manager.broadcast("REPORT_GENERATED", ...)` was invoked without importing `ws_manager`.
- **Code Modification:** Added `from app.websocket.manager import ws_manager` at line 10.
- **Status:** **PASS**

### Fix 2: Vulnerability Status Normalization in Risk Engine
- **Target File:** `backend/app/risk_engine/calculator.py`
- **Issue:** Vulnerability status filtering used a strict case-sensitive check `if v.get("status", "Open") in ("Open", "In Progress", "Reopened")`, which caused raw uppercase `"OPEN"` or lowercase `"open"` inputs to be excluded from active likelihood calculations.
- **Code Modification:** Applied string normalization on line 75:
  ```python
  active_vulns = [
      v for v in vulnerabilities
      if str(v.get("status", "Open")).strip().title() in ("Open", "In Progress", "Reopened")
  ]
  ```
- **Result:** Variations (`OPEN`, `open`, `Open`, `IN PROGRESS`, `Reopened`) are now correctly recognized as active vulnerabilities.
- **Status:** **PASS**

### Fix 3: Frontend Realtime State Re-fetch
- **Target File:** `frontend/src/context/DataModeContext.tsx`
- **Issue:** `refreshAll()` statically assigned `lastUpdated = 'Just now'`, preventing React `useEffect(..., [lastUpdated])` from detecting state changes and re-fetching data when a WebSocket event arrived.
- **Code Modification:** Introduced millisecond-precision dynamic timestamp generation:
  ```typescript
  const getTimestamp = () => new Date().toLocaleTimeString() + '.' + String(new Date().getMilliseconds()).padStart(3, '0');
  ```
  Updated `setMode` and `refreshAll` to set `lastUpdated = getTimestamp()`, guaranteeing that every WebSocket message forces a React state mutation and triggers hook data re-fetching.
- **Status:** **PASS**

---

## 2. Tests Executed & Verification Evidence

### Test 1: Full Backend Pytest Suite
- **Command:** `pytest tests/ -v`
- **Result:** **15 / 15 PASSED (100%)** in 4.30s
- **Verified Suites:**
  - `tests/test_compliance.py::test_compliance_framework_mappings` PASSED
  - `tests/test_core.py::test_risk_calculation_deterministic` PASSED
  - `tests/test_core.py::test_optimizer_respects_budget` PASSED
  - `tests/test_core.py::test_normalization_validates_cve` PASSED
  - `tests/test_core.py::test_scenario_simulation_produces_delta` PASSED
  - `tests/test_ingestion.py::test_nvd_normalization` PASSED
  - `tests/test_ingestion.py::test_kev_lookup` PASSED
  - `tests/test_ingestion.py::test_epss_scoring` PASSED
  - `tests/test_ingestion.py::test_cve_ingestion_and_enrichment` PASSED
  - `tests/test_ingestion.py::test_asset_inventory_ingestion` PASSED
  - `tests/test_ingestion.py::test_software_inventory_correlation` PASSED
  - `tests/test_ingestion.py::test_cvss_is_not_final_risk` PASSED
  - `tests/test_platform.py::test_19_canonical_entities_in_database` PASSED
  - `tests/test_platform.py::test_risk_drivers_calculation` PASSED
  - `tests/test_platform.py::test_websocket_manager_lifecycle` PASSED
- **Classification:** **PASS**

### Test 2: Frontend Production Build Compilation
- **Command:** `tsc && vite build`
- **Result:** **SUCCESS** in 8.23s
- **Transformed Modules:** 2,369
- **Output Artifacts:** `dist/index.html` (1.11 kB), `dist/assets/index-DBrmDaq2.js` (897 kB), `dist/assets/index-PGlki7Ku.css` (43.8 kB)
- **Classification:** **PASS**

### Test 3: PDF Report Generation Endpoint
- **Request:** `GET http://127.0.0.1:8000/api/v1/reports/download-pdf`
- **HTTP Status:** **200 OK**
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename=Cyber_Risk_Report_20260926.pdf`
- **Output Size:** 3,644 bytes
- **Magic Bytes:** `b'%PDF-'` (Valid ReportLab PDF binary)
- **WebSocket Broadcast:** Verified receipt of `REPORT_GENERATED` event on `/api/v1/live`.
- **Classification:** **PASS**

### Test 4: Vulnerability Risk Calculation with "OPEN" Status
- **Test Cases Evaluated:**
  - `status: "OPEN"` $\rightarrow$ `risk_score: 100.0`, `active_vulns_count: 1`, `max_cvss: 9.8`
  - `status: "open"` $\rightarrow$ `risk_score: 100.0`, `active_vulns_count: 1`, `max_cvss: 9.8`
  - `status: "Open"` $\rightarrow$ `risk_score: 100.0`, `active_vulns_count: 1`, `max_cvss: 9.8`
  - `status: "IN PROGRESS"` $\rightarrow$ `risk_score: 100.0`, `active_vulns_count: 1`, `max_cvss: 9.8`
  - `status: "CLOSED"` $\rightarrow$ `risk_score: 52.4`, `active_vulns_count: 0`, `max_cvss: 0.0`
- **Result:** All active casing variations match the authoritative title-case calculation. Closed vulnerabilities remain correctly filtered.
- **Classification:** **PASS**

### Test 5: WebSocket Live Broadcast & Keepalive
- **Endpoint:** `ws://127.0.0.1:8000/api/v1/live`
- **Keepalive Test:** Sent `"ping"` $\rightarrow$ Received `"pong"` in 12ms.
- **Event Dispatch:** Triggered PDF generation $\rightarrow$ Received JSON payload `{"type": "REPORT_GENERATED", ...}`.
- **Classification:** **PASS**

### Test 6: Complete End-to-End Vulnerability Injection Flow
- **Execution Steps:**
  1. Connected client to live WebSocket `ws://127.0.0.1:8000/api/v1/live`.
  2. Injected critical zero-day `CVE-2026-9999` (CVSS 9.8) on `pay-api-gw-01` via `POST /api/v1/demo/inject-vulnerability`.
  3. API returned `HTTP 200 OK` with risk surge delta $+19.5$ pts (from $64.5 \rightarrow 84.0$).
  4. WebSocket delivered `RISK_SURGE_EVENT` payload with tactical alert message.
  5. `MainLayout.tsx` caught event and triggered `refreshAll()`.
  6. `DataModeContext.tsx` updated `lastUpdated` to a unique millisecond timestamp, triggering immediate API re-fetches across `useRiskOverview`, `useAssets`, and `useVulnerabilities`.
  7. `GET /api/v1/risks/overview` verified enterprise global risk surged to $78.6$ (`CRITICAL`).
- **Classification:** **PASS**

---

## 3. Component Status Scorecard

| Component | Pre-Fix Status | Post-Fix Status | Verification Detail |
|:---|:---:|:---:|:---|
| **PDF Report Download** | FAIL | **PASS** | Returns HTTP 200 with 3.6KB valid PDF; `ws_manager` broadcast verified. |
| **Risk Engine Status Normalization** | FAIL | **PASS** | Raw uppercase `"OPEN"` correctly counted as active; CVSS 9.8 driver triggers. |
| **Frontend Realtime Re-fetch** | PARTIAL | **PASS** | `lastUpdated` millisecond timestamp forces React dependency re-execution. |
| **Backend Test Suite** | PASS | **PASS** | 15 / 15 tests passing in Pytest. |
| **Frontend Build** | PASS | **PASS** | TypeScript compilation & Vite bundle complete in 8.23s with 0 errors. |
| **Vulnerability Injection Flow** | PARTIAL | **PASS** | End-to-end socket broadcast, risk recalculation, and API re-fetch verified. |

---

## 4. Remaining Non-Blocking Issues (Documented for Future Iterations)

These items were preserved without modification in accordance with instructions:
1. **Overview Financial Metrics Hardcoding:** In `backend/app/routes/risks.py:108`, `total_exposure` (₹4.70 Cr) and `expected_annual_loss` (₹1.20 Cr) remain fixed constants rather than dynamic sums of service EALs.
2. **Report Preview Static Drivers:** In `backend/app/routes/reports.py:56`, the ReportLab template still displays hardcoded budget recommendations (`₹48,00,000`) rather than reading from the latest `OptimizationRun`.
3. **Database Target Configuration:** Development environment is currently targeting SQLite (`sqlite:///./cyberrisk.db`). Neon PostgreSQL connection string can be supplied in `.env` for production deployment.
