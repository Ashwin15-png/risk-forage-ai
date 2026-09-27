# SIH 26105 Existing Implementation Audit

**Platform Title:** AI-Powered Continuous Cyber Risk Quantification & Investment Optimization Platform  
**Problem Statement Reference:** SIH 26105  
**Audit Date:** September 26, 2026  
**Auditor:** Antigravity Autonomous Systems Inspection  
**Audit Scope:** Deep-dive code inspection of backend, frontend, database schema, migrations, risk mathematical formulations, scenario simulation, OR-Tools optimization, real data ingestion feeds, AI explainability, WebSocket telemetry, reporting engines, audit trails, and automated test suites.

---

## Executive Summary Scorecard

| Ingestion / Engine / Subsystem | Status | Actually Connected? | Key Verified Evidence |
|:---|:---:|:---:|:---|
| **DATA IMPORT** | **DONE** | **YES** | `nvd_client.py`, `kev_client.py`, `epss_client.py`, `pipeline.py`, `/api/v1/sources` |
| **RISK ENGINE** | **DONE** | **YES** | `calculator.py`, `service_calculator.py`, `weights.py`, `pipeline.py` |
| **RISK HISTORY** | **DONE** | **YES** | `risk_snapshots`, `risk_drivers`, `risks.py#get_entity_risk_history` |
| **SCENARIO** | **DONE** | **YES** | `simulator.py`, `scenarios.py`, `scenarios` and `scenario_results` tables |
| **OPTIMIZER** | **DONE** | **YES** | `solver.py` (Google OR-Tools CBC MIP), `optimizations.py`, `optimization_runs` |
| **AI/ML** | **DONE** | **YES** | `explanation.py` (WHAT/WHY/EVIDENCE/IMPACT), `anomaly.py` (Z-Score), `ai.py` |
| **REALTIME** | **PARTIAL** | **PARTIAL** | WebSocket `/api/v1/live` broadcasts, UI banner displays, but `DataModeContext.refreshAll` has state comparison flaw |
| **REPORTS** | **PARTIAL** | **PARTIAL** | `generator.py` produces PDF/CSV, but `reports.py` hardcodes PDF drivers & budget metrics |
| **AUDIT** | **DONE** | **YES** | `logger.py`, `audit.py`, `audit_events` table (all major mutations logged with JSON diffs) |
| **FRONTEND** | **DONE** | **YES** | 16 React 18 / TypeScript views, Vite 5, Tailwind CSS, Lucide icons, Recharts |
| **DATABASE** | **PARTIAL** | **PARTIAL** | 20 canonical SQLAlchemy tables & Alembic migrations exist; SQLite active locally, Neon configured in code |

---

## 1. Project Structure

The project follows a clean decoupled client-server architecture:

```
d:/New folder/
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   ├── da16b99afdae_initial_schema_with_19_entities.py
│   │   │   └── b7c12d4e89f1_add_software_inventory_and_real_ingestion_fields.py
│   │   └── env.py
│   ├── app/
│   │   ├── audit/
│   │   │   └── logger.py
│   │   ├── ingestion/
│   │   │   ├── nvd_client.py
│   │   │   ├── kev_client.py
│   │   │   ├── epss_client.py
│   │   │   └── pipeline.py
│   │   ├── ml/
│   │   │   ├── explanation.py
│   │   │   └── anomaly.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   └── entities.py
│   │   ├── optimizer/
│   │   │   └── solver.py
│   │   ├── reports/
│   │   │   └── generator.py
│   │   ├── risk_engine/
│   │   │   ├── calculator.py
│   │   │   ├── service_calculator.py
│   │   │   └── weights.py
│   │   ├── routes/
│   │   │   ├── ai.py, assets.py, audit.py, auth.py, compliance.py, controls.py,
│   │   │   ├── demo.py, evidence.py, health.py, investments.py, models.py,
│   │   │   ├── optimizations.py, reports.py, risks.py, scenarios.py, search.py,
│   │   │   ├── services.py, sources.py, vulnerabilities.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   ├── utils/
│   │   ├── websocket/
│   │   │   └── manager.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/
│   │   ├── test_compliance.py
│   │   ├── test_core.py
│   │   ├── test_ingestion.py
│   │   └── test_platform.py
│   ├── .env
│   ├── .env.example
│   ├── cyberrisk.db
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── reset_demo.py
│   └── seed.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx, Sidebar.tsx, GlobalSearchModal.tsx, LiveRiskDemoModal.tsx
│   │   ├── context/
│   │   │   └── DataModeContext.tsx
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   ├── pages/
│   │   │   ├── AIInsights.tsx, AssetDetail.tsx, Assets.tsx, AuditTrail.tsx,
│   │   │   ├── Compliance.tsx, Controls.tsx, Dashboard.tsx, DataSources.tsx,
│   │   │   ├── EvidenceCenter.tsx, Investments.tsx, Login.tsx, Models.tsx,
│   │   │   ├── Optimization.tsx, Reports.tsx, RiskLandscape.tsx, Scenarios.tsx,
│   │   │   ├── Services.tsx, Settings.tsx, Vulnerabilities.tsx
│   │   ├── services/
│   │   │   ├── api.ts, socket.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

---

## 2. Technology Stack

### Backend Stack
- **Framework:** FastAPI (ASGI Python 3.12)
- **Database ORM:** SQLAlchemy 2.0.29 + Alembic 1.13.1
- **Optimization:** Google OR-Tools CBC MIP Solver (`ortools.linear_solver.pywraplp`)
- **Mathematics / Statistics:** NumPy (`numpy`), Python `math`
- **PDF Generation:** ReportLab 4.1.0 (`reportlab.platypus`, `reportlab.lib.colors`)
- **Real Ingestion Clients:** `httpx` / `urllib.request` with exponential backoff & disk caching
- **Realtime:** Native FastAPI WebSockets (`/api/v1/live`)
- **Testing:** Pytest 9.1.1 + AnyIO

### Frontend Stack
- **Core Framework:** React 18.2.0 + TypeScript 5.2.2 + Vite 5.1.6
- **Styling:** Tailwind CSS 3.4.1 (Custom Green Cyber Command Center aesthetic `#06110B`, `#00FF66`, `#00E5FF`)
- **Routing:** React Router DOM 6.22.3
- **Visualization:** Recharts 2.12.3 (Area charts, bar charts, radar charts, scatter plots)
- **Icons:** Lucide React 0.363.0
- **HTTP & Socket Client:** Axios 1.6.8 + Native Browser WebSocket

---

## 3. Backend Implementation

### Verification Details
1. **Server Initialization (`backend/app/main.py`):**
   - Declares FastAPI application with lifespan context running `init_db()`.
   - Mounts 19 sub-routers under `/api/v1` plus `/health`.
   - Mounts `/api/v1/live` WebSocket endpoint with continuous ping/pong handling.
   - CORS middleware configured with permissive origin reflections (`["*"]`) for local dev.

2. **Configuration (`backend/app/config.py`):**
   - Uses `pydantic-settings` `BaseSettings` reading from `.env`.
   - Defaults `DATABASE_URL` to `sqlite:///./cyberrisk.db`.
   - Defaults `SECRET_KEY`, `DEFAULT_CURRENCY` (INR), and `DEMO_MODE` (true).

3. **Database Layer (`backend/app/database.py`):**
   - Configures `create_engine` with SQLite or PostgreSQL handling.
   - For PostgreSQL/Neon: applies `pool_pre_ping=True`, `pool_recycle=300`, `pool_size=10`, `max_overflow=20`.
   - Dynamically inspects tables and alters missing vulnerability intelligence columns (`epss_score`, `is_cisa_kev`, `cpe_uri`, etc.).

---

## 4. Frontend Implementation

### Verification Details
1. **Routing & Navigation (`frontend/src/App.tsx`):**
   - 19 functional pages configured inside `MainLayout`.
   - Routes include: `/` (Executive Dashboard), `/landscape` (Risk Heatmap), `/assets`, `/assets/:id`, `/services`, `/vulnerabilities`, `/controls`, `/evidence`, `/sources` (Real Data Ingestion), `/scenarios`, `/investments`, `/optimization`, `/ai`, `/compliance`, `/reports`, `/models`, `/audit`, `/settings`, `/login`.

2. **Component Integration:**
   - **Command Center Navbar (`Navbar.tsx`):** Displays real-time WebSocket connection state (`LIVE`, `RECONNECTING`, `OFFLINE`), live blinking radar indicator, quick data refresh button, and live clock in IST.
   - **Sidebar (`Sidebar.tsx`):** Green tactical sidebar with collapsible navigation groups, live telemetry counter badges, and active route highlights.
   - **Global Search (`GlobalSearchModal.tsx`):** Triggered by `Ctrl+K`; performs live debounce search across assets, services, CVEs, and controls via `/api/v1/search`.

3. **Data Mode & Hooks Architecture (`DataModeContext.tsx`):**
   - Implements custom React hooks: `useRiskOverview`, `useAssets`, `useServices`, `useVulnerabilities`, `useControls`, `useEvidence`, `useScenarios`, `useInvestments`, `useAIInsights`.
   - Hooks issue real HTTP GET requests to `frontend/src/services/api.ts`.

---

## 5. Database & Migrations

### Actual Connection Check
- **Current Target:** **SQLite** (`backend/cyberrisk.db`, 876 KB).
- **Neon Status:** Supported in `database.py` and documented in `.env.example`, but **NOT actively connected** in `.env` (`DATABASE_URL=sqlite:///./cyberrisk.db`).
- **Schema Mapping (`backend/app/models/entities.py`):**
  All 20 tables exist with full foreign-key constraints and indexes:
  1. `organizations`
  2. `users`
  3. `business_services`
  4. `assets`
  5. `vulnerabilities`
  6. `software_inventory` (New real-data table)
  7. `security_controls`
  8. `asset_controls` (Join table)
  9. `incidents`
  10. `threat_scenarios`
  11. `risk_snapshots`
  12. `risk_drivers`
  13. `investment_initiatives`
  14. `optimization_runs`
  15. `decision_approvals`
  16. `model_versions`
  17. `audit_events`
  18. `evidence_sources`
  19. `evidence_records`
  20. `scenarios` and `scenario_results`

- **Alembic Migrations:**
  - `da16b99afdae_initial_schema_with_19_entities.py`: Generated canonical schema.
  - `b7c12d4e89f1_add_software_inventory_and_real_ingestion_fields.py`: Added software inventory and real vulnerability enrichment columns.

---

## 6. APIs & Route Verification

| Endpoint | Method | Backend File | Connected to DB? | Classification | Findings |
|:---|:---:|:---|:---:|:---:|:---|
| `/api/v1/health` | GET | `health.py` | No | **DONE** | Returns service status and timestamp. |
| `/api/v1/risks/overview` | GET | `risks.py` | Yes | **PARTIAL** | DB queries `RiskSnapshot`, `Asset`, `BusinessService`, but hardcodes top-level INR financial numbers (`total_exposure`, `expected_annual_loss`). |
| `/api/v1/risks/landscape` | GET | `risks.py` | Yes | **DONE** | Queries all assets with dynamic bubble coordinates (likelihood vs impact). |
| `/api/v1/risks/history/{id}` | GET | `risks.py` | Yes | **DONE** | Queries snapshots from `risk_snapshots` table. |
| `/api/v1/assets` | GET, POST | `assets.py` | Yes | **DONE** | Real CRUD with service joins and risk calculation. |
| `/api/v1/assets/{id}` | GET | `assets.py` | Yes | **DONE** | Dynamic breakdown of asset, active CVEs, and controls. |
| `/api/v1/vulnerabilities` | GET | `vulnerabilities.py` | Yes | **DONE** | Real DB listing with filtering by severity, status, KEV. |
| `/api/v1/vulnerabilities/{id}/status` | PATCH | `vulnerabilities.py` | Yes | **DONE** | Updates status, recalculates asset and service risk, logs audit, and broadcasts WebSocket update. |
| `/api/v1/services` | GET | `services.py` | Yes | **DONE** | Queries `business_services` with real asset aggregations. |
| `/api/v1/controls` | GET | `controls.py` | Yes | **DONE** | Queries `security_controls` table. |
| `/api/v1/evidence` | GET | `evidence.py` | Yes | **DONE** | Queries `evidence_sources` and `evidence_records`. |
| `/api/v1/evidence/batch` | POST | `evidence.py` | Yes | **DONE** | Ingests telemetry batch, computes data quality score, recalculates risk, broadcasts event. |
| `/api/v1/sources/status` | GET | `sources.py` | Yes | **DONE** | Returns live connectivity and counts for NVD, KEV, EPSS, Asset and Software feeds. |
| `/api/v1/sources/nvd/sync` | POST | `sources.py` | Yes | **DONE** | Connects to NIST NVD API v2.0 or cached fallback, enriches asset, commits DB, logs audit. |
| `/api/v1/sources/kev/sync` | POST | `sources.py` | Yes | **DONE** | Fetches live CISA KEV catalog, matches against inventory, updates flags in DB. |
| `/api/v1/sources/epss/sync` | POST | `sources.py` | Yes | **DONE** | Fetches FIRST EPSS API, updates probability scores, triggers continuous risk recalculation. |
| `/api/v1/sources/assets/upload` | POST | `sources.py` | Yes | **DONE** | Ingests CSV/JSON asset inventory, validates schema, upserts `Asset` records. |
| `/api/v1/sources/software/upload` | POST | `sources.py` | Yes | **DONE** | Ingests package inventory, derives CPE identifiers, maps to NVD CVEs. |
| `/api/v1/scenarios` | GET, POST | `scenarios.py` | Yes | **DONE** | Runs what-if simulator over assets/controls, commits `Scenario` & `ScenarioResult`, logs audit. |
| `/api/v1/optimizations` | POST | `optimizations.py` | Yes | **DONE** | Solves OR-Tools MIP using DB `InvestmentInitiative` & `RiskSnapshot`, commits `OptimizationRun`. |
| `/api/v1/ai/insights` | GET | `ai.py` | Yes | **DONE** | Real DB inputs fed to deterministic WHAT/WHY/EVIDENCE/IMPACT engine and Z-Score anomaly detector. |
| `/api/v1/ai/query` | POST | `ai.py` | Yes | **DONE** | Parses natural language queries against real DB data (assets, services, EAL). |
| `/api/v1/reports/preview` | GET | `reports.py` | Yes | **PARTIAL** | DB queries org & snapshots, but hardcodes `potential_reduction` and `recommended_budget`. |
| `/api/v1/reports/download-pdf`| GET | `reports.py` | Yes | **PARTIAL** | Generates dynamic PDF via ReportLab, but hardcodes driver bullet points instead of reading `snap.drivers_json`. |
| `/api/v1/reports/export-csv` | GET | `reports.py` | Yes | **DONE** | Queries real `Asset` rows and streams downloadable CSV. |
| `/api/v1/audit` | GET | `audit.py` | Yes | **DONE** | Queries `audit_events` with action and entity filters. |
| `/api/v1/search` | GET | `search.py` | Yes | **DONE** | Cross-table ILIKE search across assets, services, CVEs, and controls. |

---

## 7. Risk Engine Implementation

### Formula & Mathematics
Implemented in `backend/app/risk_engine/calculator.py` and `service_calculator.py`.

The platform does **NOT** equate CVSS directly to risk. The calculation uses:
$$R = (L \times I) \times \text{Exposure Modifier} \times \text{Control Modifier}$$

1. **Likelihood ($L$):**
   - Active CVEs non-linear blend: $(0.70 \times \text{Max CVSS}) + (0.30 \times \min(1.2 \times \text{Mean CVSS}, 10.0))$.
   - Scaled by $8.5$, with $+10.0$ boost for Internet-Facing assets (bounded to $[10.0, 100.0]$).
2. **Impact ($I$):**
   - $(0.50 \times \text{Asset Criticality}) + (0.50 \times \text{Business Service Impact})$.
   - Multiplied by Data Classification modifier (Public: $1.0\times$, Confidential: $1.25\times$, Restricted: $1.5\times$).
3. **Control Mitigation Modifier:**
   - Controls contribute: $\sum (\text{Effectiveness} \times \text{Coverage} \times \text{Weight})$.
   - Capped at $0.58$ mitigation discount, ensuring minimum residual floor ($0.42$).
4. **Exposure Multiplier:**
   - Internet-Facing: $1.45\times$, DMZ: $1.20\times$, Partner: $1.05\times$, Internal: $0.90\times$.
5. **Deterministic Risk Drivers Decomposition:**
   - Automatically computes decomposed positive and negative driver impact points (e.g. Internet Exposure $+18$, Critical CVE $+21$, EDR Mitigation $-8$).
6. **Persistence:**
   - Persisted to `assets.current_risk_score`, `business_services.current_risk_score`, and `risk_snapshots` with JSON drivers in `pipeline.py` and `vulnerabilities.py`.

---

## 8. Scenario Engine Implementation

### Verification
- **Code:** `backend/app/scenario_engine/simulator.py` and `backend/app/routes/scenarios.py`.
- **Methodology:**
  1. Clones actual database assets, controls, and business services using deep copies.
  2. Applies simulated actions:
     - `add_control`: Dynamically injects or updates control coverage and effectiveness.
     - `patch_vulnerabilities`: Filters out vulnerabilities exceeding CVSS threshold.
     - `modify_exposure`: Mutates perimeter network classifications (e.g. Internet-Facing $\rightarrow$ Internal).
     - `network_segmentation`: Activates micro-segmentation control weights.
  3. Re-runs `calculate_asset_risk` on every asset across baseline and simulated states.
  4. Persists the simulation run in `scenarios` and per-asset projected scores in `scenario_results`.
  5. Records an immutable `AuditEvent` and emits a WebSocket broadcast `SCENARIO_COMPLETED`.
- **Status:** **DONE & VERIFIED CONNECTED**.

---

## 9. Investment Optimizer Implementation

### Verification
- **Code:** `backend/app/optimizer/solver.py` and `backend/app/routes/optimizations.py`.
- **Solver Engine:** Google OR-Tools Integer Linear Programming (CBC MIP).
- **Formulation:**
  $$\max \sum_{i=1}^n x_i \cdot \Delta R_i \quad \text{s.t.} \quad \sum_{i=1}^n x_i \cdot C_i \le B, \quad x_i \in \{0, 1\}$$
  - Mandatory initiative constraints: $x_i = 1$ for mandatory items.
  - Dependency constraints: $x_B \le x_A$ if initiative $B$ depends on initiative $A$.
  - Implementation capacity constraint: limits simultaneous high-capacity projects.
- **Data Source:** Pulls live `InvestmentInitiative` records and the latest `RiskSnapshot.risk_score` from the database.
- **Persistence:** Commits `OptimizationRun` and creates `DecisionApproval` entries in the database.
- **Status:** **DONE & VERIFIED CONNECTED**.

---

## 10. AI/ML Subsystem

### Verification
- **Code:** `backend/app/ml/explanation.py`, `backend/app/ml/anomaly.py`, `backend/app/routes/ai.py`.
- **Capabilities:**
  1. **Deterministic Structured Explainability:**
     Produces structured explanations strictly formatted as:
     - **WHAT:** Quantified delta in enterprise risk.
     - **WHY:** Decomposed driver analysis (e.g., active weaponization, perimeter exposure).
     - **EVIDENCE:** Correlated telemetry feeds (EDR, vulnerability scanners).
     - **IMPACT:** Business continuity outage costs (INR per hour).
     - **CONFIDENCE:** Telemetry quality index (e.g., 93.4%).
     - **RECOMMENDED ACTION:** High-ROI control investments.
  2. **Statistical Anomaly Detection:**
     Calculates rolling 14-day risk snapshot mean and standard deviation via `numpy`. Flags risk surges exceeding $Z > 2.0$ or $> 12$ points, critical CVE bursts ($\ge 5$), and stale or missing evidence feeds.
  3. **Natural Language Query Interface:**
     `/api/v1/ai/query` processes natural language inquiries, querying real DB entities and financial loss estimates.
  4. **Optional LLM Integration:**
     Checks for `LLM_API_KEY`. If absent, gracefully falls back to deterministic structured analytics without failure.
- **Status:** **DONE & VERIFIED CONNECTED**.

---

## 11. Realtime & WebSocket Subsystem

### Verification
- **Backend:** `backend/app/websocket/manager.py` maintains active WebSocket connections and broadcasts structured JSON events (`RISK_UPDATED`, `VULNERABILITY_RESOLVED`, `EVIDENCE_INGESTED`, `SCENARIO_COMPLETED`, `NVD_SYNCED`, `KEV_SYNCED`, `EPSS_SYNCED`).
- **Frontend Client:** `frontend/src/services/socket.ts` connects to `/api/v1/live` with automatic reconnection and a 25-second keepalive ping.
- **Frontend Consumption (`MainLayout.tsx`):**
  - Listens for WebSocket events and renders green/red notification banners.
  - Calls `refreshAll()` from `DataModeContext.tsx`.
- **CRITICAL GAP FOUND:**
  In `DataModeContext.tsx`:
  ```typescript
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const refreshAll = async () => {
    setLastUpdated('Just now'); // <-- BUG: identical string prevents React re-render
  };
  ```
  Because `lastUpdated` is already `'Just now'`, React's `Object.is` check skips re-rendering, so dependent page hooks (`useRiskOverview`, `useAssets`, `useVulnerabilities`, etc.) do **NOT** re-fetch data automatically on WebSocket messages.
- **Status:** **PARTIAL / BROKEN RE-FETCH TRIGGER**.

---

## 12. Reports Subsystem

### Verification
- **Code:** `backend/app/reports/generator.py` and `backend/app/routes/reports.py`.
- **PDF Generation:** Dynamically builds a two-page executive report using ReportLab with tables, risk score callouts, and audit identifiers.
- **CSV Export:** `/api/v1/reports/export-csv` streams real `Asset` rows with risk scores, likelihood, impact, and service mappings.
- **CRITICAL GAPS FOUND:**
  1. In `backend/app/routes/reports.py` (`download_pdf_report`), the `drivers` list is hardcoded:
     ```python
     drivers = [
         {"name": "Internet Exposure", "impact": "+18.0", "confidence": 94},
         {"name": "Critical Vulnerability CVSS >= 9.0", "impact": "+21.0", "confidence": 96},
         ...
     ]
     ```
     It ignores `snap.drivers_json` stored in the database.
  2. In `preview_report` and `download_pdf_report`, `potential_reduction: 28.0` and `recommended_budget: "₹48,00,000"` are hardcoded constants instead of reading from the latest `OptimizationRun`.
- **Status:** **PARTIAL**.

---

## 13. Audit Subsystem

### Verification
- **Code:** `backend/app/audit/logger.py` and `backend/app/routes/audit.py`.
- **Functionality:**
  - `log_audit_event()` persists immutable records to the `audit_events` table.
  - Captures `org_id`, `user_email`, `action`, `entity_type`, `entity_id`, `old_values_json`, `new_values_json`, `model_version`, `source`, `ip_address`, and timestamp.
  - Active triggers verify audit logging on:
    - Vulnerability status updates (`vulnerabilities.py`)
    - Continuous risk recalculations (`pipeline.py`)
    - Scenario simulations (`scenarios.py`)
    - Optimization runs (`optimizations.py`)
    - Intelligence synchronizations (`sources.py`)
    - Report generations (`reports.py`)
- **Frontend UI (`AuditTrail.tsx`):**
  - Consumes `/api/v1/audit`.
  - Supports filtering by action and entity type with JSON diff inspection.
- **Status:** **DONE & VERIFIED CONNECTED**.

---

## 14. Existing Tests

### Pytest Backend Suite Execution
Ran `pytest tests/ -v`:
- **Total Tests:** 15
- **Passed:** 15
- **Failed:** 0
- **Duration:** 4.31s

```
tests/test_compliance.py::test_compliance_framework_mappings PASSED      [  6%]
tests/test_core.py::test_risk_calculation_deterministic PASSED           [ 13%]
tests/test_core.py::test_optimizer_respects_budget PASSED                [ 20%]
tests/test_core.py::test_normalization_validates_cve PASSED              [ 26%]
tests/test_core.py::test_scenario_simulation_produces_delta PASSED       [ 33%]
tests/test_ingestion.py::test_nvd_normalization PASSED                   [ 40%]
tests/test_ingestion.py::test_kev_lookup PASSED                          [ 46%]
tests/test_ingestion.py::test_epss_scoring PASSED                        [ 53%]
tests/test_ingestion.py::test_cve_ingestion_and_enrichment PASSED        [ 60%]
tests/test_ingestion.py::test_asset_inventory_ingestion PASSED           [ 66%]
tests/test_ingestion.py::test_software_inventory_correlation PASSED      [ 73%]
tests/test_ingestion.py::test_cvss_is_not_final_risk PASSED              [ 80%]
tests/test_platform.py::test_19_canonical_entities_in_database PASSED    [ 86%]
tests/test_platform.py::test_risk_drivers_calculation PASSED             [ 93%]
tests/test_platform.py::test_websocket_manager_lifecycle PASSED          [100%]
```

### Frontend Typecheck & Build
Ran `npm run build` (`tsc && vite build`):
- **Modules Transformed:** 2,369
- **Build Status:** SUCCESS (0 compilation or type errors)
- **Output Bundle:** `dist/assets/index-lmSUDqly.js` (897 kB), `dist/assets/index-PGlki7Ku.css` (43.8 kB).

---

## 15. Critical Gaps & Technical Debt

1. **Hardcoded PDF Report Drivers (`backend/app/routes/reports.py:42-48`):**
   The ReportLab generation route uses a static driver list rather than unpacking `snap.drivers_json`.
2. **Hardcoded Executive INR Metrics (`backend/app/routes/risks.py:108-111`):**
   `total_exposure` (₹4.70 Cr) and `expected_annual_loss` (₹1.20 Cr) are hardcoded in the route rather than dynamically summing asset and service-level EALs.
3. **Frontend WebSocket Hook Re-render Flaw (`frontend/src/context/DataModeContext.tsx:89`):**
   `refreshAll()` repeatedly passes `'Just now'`, failing to trigger dependency change in `useEffect(..., [lastUpdated])`. Changing this to `new Date().toISOString()` will fix automatic re-rendering.
4. **Local Database Target vs Neon Target (`backend/.env`):**
   The code fully supports Neon PostgreSQL pooling, but the local environment is currently pointing to `sqlite:///./cyberrisk.db`. Neon requires a valid cloud connection URI in `.env`.
5. **No Automated Frontend Test Suite:**
   Frontend has no Jest or Vitest test runners configured in `package.json`, only `tsc && vite build`.

---

## 16. Comprehensive Feature Status Table

| Feature | Status | Actually Connected? | Evidence/File | Notes |
|:---|:---:|:---:|:---|:---|
| **NIST NVD Ingestion** | **DONE** | **YES** | `backend/app/ingestion/nvd_client.py` | Real NIST v2.0 HTTP client with caching & fallback. |
| **CISA KEV Catalog** | **DONE** | **YES** | `backend/app/ingestion/kev_client.py` | Live federal KEV JSON feed fetcher and lookup. |
| **FIRST EPSS Scoring** | **DONE** | **YES** | `backend/app/ingestion/epss_client.py` | Live EPSS probability API client with batching. |
| **Asset CSV/JSON Upload** | **DONE** | **YES** | `backend/app/routes/sources.py:270` | Validates schema, parses CSV/JSON, upserts `Asset`. |
| **Software Inventory** | **DONE** | **YES** | `backend/app/routes/sources.py:345` | Real table `software_inventory`, CPE normalization. |
| **Risk Formula Engine** | **DONE** | **YES** | `backend/app/risk_engine/calculator.py` | Multi-factor $R = L \times I \times \text{Exposure} \times \text{Control}$. |
| **Risk Persistence** | **DONE** | **YES** | `backend/app/ingestion/pipeline.py:428` | Writes `current_risk_score` and `RiskSnapshot`. |
| **Financial EAL Numbers** | **PARTIAL** | **NO** | `backend/app/routes/risks.py:108` | Hardcoded static INR values for enterprise total EAL. |
| **Risk History Timeline** | **DONE** | **YES** | `backend/app/routes/risks.py:200` | Queries `risk_snapshots` table for historical series. |
| **Scenario What-If Simulator** | **DONE** | **YES** | `backend/app/scenario_engine/simulator.py` | Mutates asset state, recalculates risk, creates delta. |
| **Scenario DB Persistence** | **DONE** | **YES** | `backend/app/routes/scenarios.py:121` | Persists `Scenario` and `ScenarioResult` rows. |
| **OR-Tools MIP Optimizer** | **DONE** | **YES** | `backend/app/optimizer/solver.py` | Real Google OR-Tools CBC Integer Programming solver. |
| **Optimizer DB Integration** | **DONE** | **YES** | `backend/app/routes/optimizations.py:24` | Pulls `InvestmentInitiative` from DB; saves runs. |
| **AI Explainability Engine** | **DONE** | **YES** | `backend/app/ml/explanation.py` | Deterministic WHAT/WHY/EVIDENCE/IMPACT templates. |
| **Statistical Anomaly Detection** | **DONE** | **YES** | `backend/app/ml/anomaly.py` | Rolling Z-score over real `RiskSnapshot` history. |
| **Natural Language Query** | **DONE** | **YES** | `backend/app/routes/ai.py:95` | Analyzes NL questions and queries live DB entities. |
| **WebSocket Event Broadcast** | **DONE** | **YES** | `backend/app/websocket/manager.py` | Broadcasts risk, scenario, optimization events. |
| **Frontend WebSocket Banner** | **DONE** | **YES** | `frontend/src/layouts/MainLayout.tsx:22` | Displays live alert banners on incoming events. |
| **WebSocket Auto Re-fetch** | **BROKEN** | **NO** | `frontend/src/context/DataModeContext.tsx:89` | Identical state string prevents hook re-render. |
| **PDF Executive Report** | **PARTIAL** | **PARTIAL** | `backend/app/routes/reports.py:35` | ReportLab builds PDF, but drivers list is hardcoded. |
| **CSV Asset Data Export** | **DONE** | **YES** | `backend/app/routes/reports.py:86` | Real CSV streaming directly from DB `Asset` rows. |
| **Audit Logging** | **DONE** | **YES** | `backend/app/audit/logger.py` | Persists old/new values in `audit_events` table. |
| **Audit UI Trail** | **DONE** | **YES** | `frontend/src/pages/AuditTrail.tsx` | Queries `/api/v1/audit`, displays JSON diffs. |
| **Database Schema** | **DONE** | **YES** | `backend/app/models/entities.py` | 20 tables mapped, foreign keys, and indexes. |
| **Neon PostgreSQL Active** | **PARTIAL** | **NO** | `backend/.env:1` | Code supports Neon, but local `.env` points to SQLite. |
| **Backend Test Coverage** | **DONE** | **YES** | `backend/tests/` | 15/15 tests passing in pytest. |
| **Frontend Production Build** | **DONE** | **YES** | `frontend/dist/` | Vite build succeeds with 0 type errors. |

---

## 17. Recommended Fix Order (For Next Phase)

When authorized to enter the implementation phase, execute fixes in this strict priority order:

1. **Fix Frontend WebSocket Re-fetch Trigger:**
   In `frontend/src/context/DataModeContext.tsx`, change `setLastUpdated('Just now')` to `setLastUpdated(new Date().toISOString())` so that incoming WebSocket messages reliably trigger page re-fetches.
2. **Dynamicize PDF Report Drivers & Budget:**
   In `backend/app/routes/reports.py`, deserialize `snap.drivers_json` to supply the ReportLab generator, and query the latest `OptimizationRun` for `potential_reduction` and `recommended_budget`.
3. **Dynamicize Enterprise Financial Exposure in Risk Overview:**
   In `backend/app/routes/risks.py`, compute `total_exposure` and `expected_annual_loss` by summing individual business service EALs rather than returning fixed numbers.
4. **Neon PostgreSQL Cloud Deployment:**
   Supply real Neon PostgreSQL credentials in `DATABASE_URL` within `backend/.env` and execute `alembic upgrade head`.

---

## Final Classification Summary

```text
DATA IMPORT       : DONE
RISK ENGINE       : DONE
RISK HISTORY      : DONE
SCENARIO          : DONE
OPTIMIZER         : DONE
AI/ML             : DONE
REALTIME          : PARTIAL
REPORTS           : PARTIAL
AUDIT             : DONE
FRONTEND          : DONE
DATABASE          : PARTIAL
```
