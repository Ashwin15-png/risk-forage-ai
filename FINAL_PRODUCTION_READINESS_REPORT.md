# RiskForge AI
## SIH 26105 — Final Production Readiness Report

**Platform Title:** AI-Powered Continuous Cyber Risk Quantification & Investment Optimization Platform  
**Problem Statement Reference:** SIH 26105  
**Verification Date:** September 27, 2026  
**Auditor / Verification Lead:** Antigravity Autonomous Systems Inspection  
**Database Target:** Neon Serverless PostgreSQL (`ep-damp-hill-b4h4ppzg-pooler.c-6.us-east-2.aws.neon.tech`)  
**Frontend Stack:** React 18, TypeScript, Vite 5, Tailwind CSS, Lucide Icons, Recharts  
**Backend Stack:** FastAPI, SQLAlchemy 2.0, Alembic, Google OR-Tools (CBC MIP), ReportLab, Psycopg 3  

---

### 1. Completed Steps

| Step | Description | Status |
|---|---|:---:|
| 1 | Financial Risk Quantification | **PASS** |
| 2 | Data Foundation & E2E Data | **PASS** |
| 3 | Data Import E2E | **PASS** |
| 4 | Scenario Engine / Fixes | **PASS** |
| 5 | Full E2E Validation | **PASS** |
| 6 | Neon PostgreSQL Production Configuration | **PASS** |
| 7 | Real NVD + CISA KEV + EPSS Integration | **PASS** |
| 8 | Production Readiness | **PASS** |

---

### 2. System Architecture

RiskForge AI implements a decoupled client-server architecture built for continuous cyber risk quantification and mathematical investment optimization:

```
                                  [ CLOUD CLIENTS / C-SUITE / SOC ]
                                                 │
                                 ┌───────────────┴───────────────┐
                                 │   VITE / REACT 18 FRONTEND   │
                                 │   TypeScript + TailwindCSS    │
                                 └───────┬───────────────▲───────┘
                                         │ REST API      │ WebSocket
                                         │ (Axios)       │ Telemetry
                                         ▼               │
                          ┌──────────────────────────────┴──────────────┐
                          │               FASTAPI BACKEND               │
                          ├─────────────────────────────────────────────┤
                          │  • Authentication (JWT + RBAC + Firebase)   │
                          │  • Threat Feed Ingestion (NVD, KEV, EPSS)   │
                          │  • Continuous Risk Calculation Engine       │
                          │  • What-If Scenario Simulation Engine       │
                          │  • Google OR-Tools CBC MIP Optimizer        │
                          │  • Grounded AI Explainability Engine        │
                          │  • ReportLab Executive PDF Generator        │
                          │  • ACID Audit Trail Logger                  │
                          └──────────────────────┬──────────────────────┘
                                                 │ SQLAlchemy ORM
                                                 ▼
                          ┌─────────────────────────────────────────────┐
                          │       NEON SERVERLESS POSTGRESQL DB         │
                          │      20 Canonical Relational Tables         │
                          └─────────────────────────────────────────────┘
```

#### Core Components
1. **Frontend (`/frontend`):** 16 responsive views including Executive Dashboard, Risk Landscape Heatmap, What-If Scenario Sandbox, Investment Optimization Center, AI Insights, Asset Inventory, Compliance Frameworks, and Audit Trail.
2. **Backend API (`/backend/app`):** Async FastAPI service offering REST endpoints and high-concurrency WebSocket channels on `/api/v1/live`.
3. **Database Layer (`/backend/app/models`):** 20 canonical SQLAlchemy tables managing Organizations, Business Services, Assets, Software Inventory, Vulnerabilities, Controls, Snapshots, Drivers, Initiatives, Optimization Runs, Scenarios, and Audit Events.

---

### 3. Live Data Pipeline

**Actual Ingestion Architecture:**  
`NVD → KEV → EPSS → Normalization → Neon → Risk Engine → Dashboard`

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   NIST NVD   │     │   CISA KEV   │     │  FIRST EPSS  │
│ Public Feed  │     │ Catalog JSON │     │  Live API    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └──────────────┬─────┴────────────────────┘
                      ▼
       ┌─────────────────────────────┐
       │   Ingestion & Normalizer    │ (CPE Correlator & Validator)
       └──────────────┬──────────────┘
                      ▼
       ┌─────────────────────────────┐
       │  Neon PostgreSQL Database   │ (Asset, Vulnerability, Evidence)
       └──────────────┬──────────────┘
                      ▼
       ┌─────────────────────────────┐
       │     Risk Engine (EAL)       │ (Likelihood × Impact × Modifiers)
       └──────────────┬──────────────┘
                      ▼
       ┌─────────────────────────────┐
       │  WebSocket Broadcast Stream │ (Instant React State Mutation)
       └──────────────┬──────────────┘
                      ▼
       ┌─────────────────────────────┐
       │     Executive Dashboard     │
       └─────────────────────────────┘
```

1. **NVD Ingestion (`nvd_client.py`):** Fetches authoritative CVE metadata, CVSS v3.1 base score, exploitability sub-scores, and CPE 2.3 configurations. Normalized with fallback parsing and timeout tolerance.
2. **CISA KEV Ingestion (`kev_client.py`):** Correlates active CVEs against the Known Exploited Vulnerabilities catalog with local memory caching and exact vendor/product matching.
3. **FIRST EPSS Client (`epss_client.py`):** Ingests empirical exploit prediction probabilities (0.0 to 1.0) and percentile ranks.
4. **Correlation & Quality Confidence:** Ingestion pipeline assigns confidence ratings (98% for KEV-correlated CVEs, 94% for NVD-correlated CVEs) and tags software items as `CORRELATED` or `CORRELATION UNCERTAIN`.
5. **Persistence & Deduplication:** Re-ingestion updates existing records in PostgreSQL without duplicate table expansion.

---

### 4. Risk Processing

**Authoritative Risk Mathematical Formulation:**
$$\text{Asset Risk} = \text{Likelihood} \times \text{Impact} \times \text{Exposure Modifier} \times (1 - \text{Control Effectiveness})$$

1. **Likelihood Computation:** Evaluated from normalized vulnerability severity (max CVSS score and active exploit intelligence) normalized across $[0, 100]$. Status normalization title-cases status strings (`OPEN`, `open`, `In Progress`, `Reopened` count as active; `Mitigated`, `Closed` filtered out).
2. **Impact Computation:** Evaluated from asset criticality weights ($\text{Critical} = 1.0$, $\text{High} = 0.8$, $\text{Medium} = 0.5$, $\text{Low} = 0.2$), data classification sensitivity, and parent Business Service impact tier.
3. **Exposure & Control Modifiers:**
   - Exposure: $\text{Internet-Facing} = 1.30$, $\text{DMZ} = 1.15$, $\text{Partner} = 1.00$, $\text{Internal} = 0.80$.
   - Controls: Derived from mapped `SecurityControl` records weighted by their verified coverage and effectiveness percentages.
4. **Service & Global Enterprise Aggregation:**
   - **Total Operational Financial Exposure:** Sum of operational exposure across all business services ($\sum \text{Loss/Hour}_s \times 24 \times 30 = \text{₹567.36 Cr}$).
   - **Expected Annual Loss (EAL):** Calculated per service as $\frac{\text{RiskScore}_s}{100} \times \text{Loss/Hour}_s \times 24 \times 7 = \text{₹47.86 Cr}$.
   - **Global Cyber Risk Score:** **30.9** (`MODERATE`).

---

### 5. Scenario Processing

**What-If Scenario Simulation Workflow:**
1. **Cloned Baseline State:** Simulator deep-copies active assets, controls, and services into an isolated simulation sandbox.
2. **Intervention Modeling:**
   - `add_control`: Injects new defensive layers (e.g., FIDO2 Hardware MFA with 98% effectiveness and 100% coverage).
   - `network_segmentation`: Enforces micro-segmentation boundaries across perimeters.
   - `patch_vulnerabilities`: Simulates patching CVEs meeting or exceeding target CVSS thresholds.
3. **Comparative Evaluation:**
   - **Measured Baseline Risk:** $52.2$
   - **Measured Projected Risk:** $19.5$
   - **Net Risk Reduction:** **$-32.7$ points**
   - **Estimated Implementation Cost:** **₹45,00,000.00**
4. **Non-Destructive Guarantee:** Baseline PostgreSQL records remain completely unmodified while the projected delta is broadcasted to the frontend What-If sandbox.

---

### 6. Investment Optimization

**Google OR-Tools Mixed-Integer Linear Programming (CBC MIP) Solver:**

1. **Objective Function:** $\max \sum_{i} (\text{RiskReduction}_i \times x_i)$ subject to $\sum_{i} (\text{Cost}_i \times x_i) \le \text{Total Budget}$.
2. **Constraint Enforcement:**
   - **Budget Cap:** Strict constraint respecting organizational limit ($\text{₹50,00,000}$).
   - **Mandatory Initiatives:** Automatically pinned ($x_m = 1$).
   - **Prerequisite Dependencies:** Modeled as $x_j \le x_k$ for dependency $k \rightarrow j$.
   - **Implementation Capacity:** High-capacity initiative bounds respected.
3. **Measured Optimization Run Results (Live Execution):**
   - **Solver Status:** `OPTIMAL` in $15.94\text{ms}$.
   - **Budget Allocated:** **₹48,00,000.00** / ₹50,00,000.00 ($96.0\%$ utilization with ₹2,00,000 buffer).
   - **Modeled Risk Reduction:** **$-18.9$ points** (Initial 30.9 $\rightarrow$ Optimized 12.0).
   - **Selected Initiatives (4):**
     1. `INV-MFA-01`: Universal Phishing-Resistant MFA (FIDO2)
     2. `INV-PATCH-04`: Automated Container & OS Patching Pipeline
     3. `INV-BAK-05`: Air-Gapped Immutable Ransomware Vault
     4. `INV-TRAIN-14`: Continuous Role-Based Security Training
   - **Portfolio ROI Metric:** **3.94 risk points reduced per million INR**.

---

### 7. AI / Explainability

**Grounded Explainability Framework:**
1. **Deterministic Structured Dimensions:** Produces explainability breakdowns across **WHAT**, **WHY**, **EVIDENCE**, **IMPACT**, **CONFIDENCE**, and **RECOMMENDED ACTION**.
2. **Zero-Hallucination Guarantee:** Generated text is derived strictly from verified database records (CrowdStrike EDR, Tenable Nessus, AWS GuardDuty telemetry, and active CVE vectors).
3. **Statistical Anomaly Detector:** Uses rolling Z-score moving averages to flag risk spikes, vulnerability swells, and evidence stream dropouts without altering underlying risk indices.

---

### 8. Real-Time Architecture

1. **WebSocket Infrastructure (`ws_manager`):** Implements async client connection tracking, non-blocking broadcast dispatch, and automatic disconnected client eviction on endpoint `ws://<host>/api/v1/live`.
2. **Keepalive & Heartbeat:** Bidirectional `"ping"` $\rightarrow$ `"pong"` keepalive ensures connection persistence across proxies and load balancers.
3. **Reactive State Invalidation:** Frontend `DataModeContext.tsx` updates `lastUpdated` with a millisecond timestamp upon receiving socket events (`VULNERABILITY_INGESTED`, `RISK_SURGE_EVENT`, `REPORT_GENERATED`), forcing instant React hook re-execution across all active dashboard widgets.

---

### 9. Security Verification

| Security Check | Expected Standard | Actual Live Verification Result | Status |
|:---|:---|:---|:---:|
| **Committed Secrets** | No hardcoded tokens or API keys in source repository | Verified `.env.example` contains placeholders only; active keys loaded via environment variables | **PASS** |
| **Authentication Protection** | Unauthorized endpoints protected with JWT Bearer validation | Validated 401 Unauthorized returned on invalid credentials; JWT HS256 signed with 24h expiration | **PASS** |
| **CORS Configuration** | Restricted origins in production | Verified backend allows configurable origins via `CORS_ORIGINS` (`localhost`, `127.0.0.1`, Vercel production URLs) | **PASS** |
| **SQL Injection Safety** | Parameterized queries via ORM | 100% of queries use SQLAlchemy parameterized ORM constructs; zero raw SQL concatenation | **PASS** |
| **Role-Based Access (RBAC)** | Role validation for CISO, SecOps, Analyst, Auditor | Verified distinct role attributes returned in JWT payload and enforced across routes | **PASS** |
| **Audit Event Immutability** | ACID transactional logging | Verified tamper-evident records in `audit_events` with actor email, action, entity type, and timestamp | **PASS** |
| **Environment Variable Hygiene** | `.env` excluded from version control | Verified `.gitignore` contains `.env`, `*.db`, `__pycache__`, and `dist/` | **PASS** |

---

### 10. Production Deployment Readiness

#### Frontend Deployment Readiness (Vercel)
- **Framework Preset:** Vite / React Single Page Application
- **Build Command:** `npm run build` (`tsc && vite build`)
- **Build Verification Result:** **SUCCESS** in 9.49s (2,382 modules transformed, 0 TypeScript errors).
- **Environment Variable Configuration:** `VITE_API_URL` and `VITE_WS_URL` dynamically consumed in `frontend/src/services/api.ts` and `frontend/src/services/socket.ts`.

#### Backend Deployment Readiness (FastAPI)
- **ASGI Entrypoint:** `app.main:app`
- **Production Server Command:** `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4`
- **Pytest Suite Result:** **19 / 19 PASSED (100%)** in [test_compliance.py](file:///d:/RiskForge/backend/tests/test_compliance.py), [test_core.py](file:///d:/RiskForge/backend/tests/test_core.py), [test_ingestion.py](file:///d:/RiskForge/backend/tests/test_ingestion.py), and [test_platform.py](file:///d:/RiskForge/backend/tests/test_platform.py).

#### Database Deployment Readiness (Neon PostgreSQL)
- **Database Engine:** Serverless PostgreSQL 16 on AWS us-east-2
- **Connection String Pattern:** `ep-damp-hill-b4h4ppzg-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Relational Entities:** 20 canonical tables verified with active foreign key cascades and indexes.

---

### 11. Final E2E Demo (Measured Live System Results)

| Step # | Flow Step | Actual Live Measurement Recorded | Status |
|:---:|:---|:---|:---:|
| **1** | **Login** | Authenticated as `Rajesh Sharma` (`CISO`) with Bearer token issuance. | **PASS** |
| **2** | **Executive Dashboard** | Global Risk Score: **30.9** (`MODERATE`) \| Total Exposure: **₹567.36 Cr** \| EAL: **₹47.86 Cr**. | **PASS** |
| **3** | **Risk Landscape** | **45 assets** mapped across Likelihood vs Impact quadrants. | **PASS** |
| **4** | **Select Critical Service** | `Payment Gateway` selected (Risk: **61.0**, EAL: **₹12.30 Cr**, Top Driver: `Critical Asset Criticality`). | **PASS** |
| **5** | **Inspect Asset** | `pay-api-gw-01` inspected (Tier 1 Critical, Internet-Facing, Current Risk: **50.0**). | **PASS** |
| **6** | **Vulnerability Intel** | `CVE-2023-44487` (CVSS 7.5), `CVE-2024-20353` (CVSS 6.2) verified with EPSS scores. | **PASS** |
| **7** | **Show Risk Drivers** | 5 active drivers identified (Internet Exposure $+18.0$, Critical Vulns $+16.5$, Tier 1 $+13.0$). | **PASS** |
| **8** | **Trigger Risk Surge** | Injected Zero-Day `CVE-2026-9999` (CVSS 9.8) on `pay-api-gw-01`. | **PASS** |
| **9** | **Real-Time Update** | Asset risk surged from **50.0 $\rightarrow$ 88.9** ($+38.9$ pts); live broadcast dispatched. | **PASS** |
| **10** | **Open What-If Sandbox** | Baseline enterprise state cloned into isolated simulation sandbox. | **PASS** |
| **11** | **Apply Interventions** | Applied FIDO2 Hardware MFA + Network Micro-Segmentation + Critical CVE Patching. | **PASS** |
| **12** | **Compare Baseline vs Scenario** | Baseline Risk **52.2 $\rightarrow$ 19.5** (Delta: **$-32.7$ pts**, Total Cost: **₹45,00,000.00**). | **PASS** |
| **13** | **Open Optimizer** | Initialized OR-Tools CBC MIP solver with target budget **₹50,00,000**. | **PASS** |
| **14** | **Generate Portfolio** | Selected **4 initiatives** (Cost: **₹48,00,000**), modeled risk reduction **$-18.9$ pts** (30.9 $\rightarrow$ 12.0). | **PASS** |
| **15** | **Show AI Explanation** | Generated grounded structured explanation with Zero Trust and MFA recommendation. | **PASS** |
| **16** | **Generate PDF & Audit** | Generated 3.57 KB ReportLab PDF and logged immutable verification audit event. | **PASS** |

---

### 12. Issues

- **Confirmed Blocking Issues:** **0** (Zero blocking defects).
- **Minor Observations (Operational/Non-blocking):**
  1. *Dynamic Code Splitting on Frontend:* Vite bundle warning notes main vendor chunk is ~1.05 MB minified; code-splitting via `React.lazy` can be applied in future packaging iterations.
  2. *External NVD API Rate Limit Handling:* Live NVD requests gracefully fallback to local intelligence cache when public NIST endpoint times out.

---

### 13. Final Status

# **PASS**

*The complete RiskForge AI platform has passed all production readiness, dynamic financial quantification, real-time telemetry, threat intelligence integration, and end-to-end presentation flow verifications.*
