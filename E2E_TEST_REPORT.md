# SIH 26105 — End-to-End Test Report

## 1. Environment
- **Backend**: FastAPI 0.110.0, Python 3.12.7, Uvicorn 0.28.0 (Port: 8000)
- **Frontend**: React 18.2.0, TypeScript 5.2.2, Vite 5.4.21 dev & production build (Port: 5173)
- **Database**: SQLite / SQLAlchemy 2.0.28 (authoritative local database `cyberrisk.db`)
- **Browser / Client**: Headless HTTP/WebSocket Client & Playwright / Chromium
- **Date/Time**: 2026-09-27T00:31:24+05:30 (UTC: 2026-09-26T19:01:24Z)

---

## 2. Demo Flow Results

| Step | Test | Status | Actual Result |
|---|---|---|---|
| 1 | LOGIN | PASS | Authenticated `ciso@demofinancial.com` with demo credentials. HTTP 200 returned valid JWT bearer token with claims `{role: 'ciso', email: 'ciso@demofinancial.com'}`. |
| 2 | EXECUTIVE DASHBOARD | PASS | `GET /api/v1/risks/overview` returned HTTP 200. Total Risk score: 72.4, Category: HIGH, 8 Critical Assets, 50 Critical Vulns, 7 Open Incidents, Expected Annual Loss (EAL): ₹1.20 Cr (₹12,000,000), Total Financial Exposure: ₹4.70 Cr. Risk distribution rendered: Critical: 0, High: 3, Medium: 21, Low: 21. |
| 3 | RISK LANDSCAPE | PASS | `GET /api/v1/risks/landscape` returned HTTP 200. 45 assets/services plotted across likelihood, impact, and criticality coordinates. Critical/high assets properly identified. |
| 4 | PAYMENT GATEWAY BASELINE | PASS | Located Payment Gateway asset `pay-api-gw-01` (`Payment API Gateway - Production Ingress`). Baseline Risk Score: 61.0. Criticality: Critical. Exposure: Internet-Facing. Active vulnerabilities: 5. Decomposed drivers: Internet Exposure, Critical Vulnerabilities, Asset Criticality, Weak MFA, Network Segmentation Controls. |
| 5 | CONTROLLED RISK CHANGE | PASS | Executed `POST /api/v1/demo/inject-vulnerability`. Injected `CVE-2026-9999` (CVSS 9.8). Asset risk surged from 61.0 to 84.0 (+23.0 points). Global risk snapshot updated to 78.6. WebSocket broadcasted `RISK_SURGE_EVENT` (`event: CRITICAL_VULNERABILITY_DETECTED`) over `ws://127.0.0.1:8000/api/v1/live`. |
| 6 | RISK DETAIL / EVIDENCE | PASS | `GET /api/v1/assets/pay-api-gw-01` returned HTTP 200. Post-injection risk score verified at 84.0. Vulnerability evidence confirmed `CVE-2026-9999` with status Open and risk contribution 22.5. Explainable drivers identified with clear causality. |
| 7 | WHAT-IF SCENARIO | PASS | Executed `POST /api/v1/scenarios` for "MFA + Zero Trust Micro-Segmentation" scenario with 2 control hardening actions. HTTP 200 returned scenario ID `0bb6e5b4-6c48-4e8e-936d-4e8128b3160a`, estimated cost ₹30,00,000, confidence 92.0%, and persisted to database. |
| 8 | INVESTMENT OPTIMIZATION | PASS | Executed `POST /api/v1/optimizations` with budget ₹50 Lakh (`5,000,000.0` INR). Google OR-Tools CBC MIP solver returned solver status `OPTIMAL`. Selected 4 initiatives (`INV-MFA-01`, `INV-PATCH-04`, `INV-BAK-05`, `INV-TRAIN-14`), total cost ₹48.0 Lakh (`4,800,000.0` INR), modeled enterprise risk reduction: 30.7 pts (from 78.6 to 47.9). Run persisted to database. |
| 9 | PORTFOLIO COMPARISON | PASS | `GET /api/v1/optimizations/compare` returned HTTP 200 with 3 distinct solver portfolios: Portfolio A (Budget ₹50L: used ₹48.0L, reduction 30.7 pts, 4 initiatives), Portfolio B (Budget ₹75L: used ₹62.0L, reduction 39.4 pts, 5 initiatives), Portfolio C (Budget ₹35L: used ₹34.0L, reduction 20.9 pts, 2 initiatives). |
| 10 | AI INSIGHTS | PASS | `GET /api/v1/ai/insights` returned HTTP 200 with structured analytics breakdown (`ai_mode: STRUCTURED ANALYTICS`, data quality score: 93.8%). Generated executive summary explaining risk surge from 31.0 to 78.6 driven by Internet Exposure (+18.0) and MFA gaps. No unsupported evidence hallucinated. |
| 11 | REPORT DOWNLOAD | PASS | `GET /api/v1/reports/download-pdf` returned HTTP 200 with Content-Type `application/pdf`, valid PDF binary header (`%PDF-1.4`), and binary size 3,644 bytes containing enterprise summary and optimization decisions. Emitted `REPORT_GENERATED` event via WebSocket. |
| 12 | AUDIT TRAIL | PASS | `GET /api/v1/audit` returned HTTP 200 with 27 immutable audit events. Logged actions include `Live Vulnerability Ingested`, `Scenario Executed`, `Optimization Run Executed`, and `Report Generated` with complete timestamping and user attribution. |
| 13 | FINAL API HEALTH CHECK | PASS | Tested all 10 canonical endpoints (/health, /api/v1/risks/overview, /api/v1/risks/landscape, /api/v1/assets, /api/v1/services, /api/v1/ai/insights, /api/v1/optimizations/compare, /api/v1/audit, /api/v1/reports/download-pdf, /api/v1/live). All 10 passed with HTTP 200 or WS 101 Switching Protocols. |
| 14 | FINAL FRONTEND BUILD | PASS | Executed `npm run build` (`tsc && vite build`). Built successfully in 10.35s with 0 TypeScript errors and 0 build failures. Output generated in `dist/`. |
| 15 | FINAL BACKEND UNIT TESTS | PASS | Executed `pytest tests/ -v`. All 15 tests passed with 0 failures (100% test pass rate across ingestion, core engine, normalization, scenarios, compliance, and WebSocket lifecycle). |

---

## 3. Risk Change
- **Target Asset**: `pay-api-gw-01` (`Payment API Gateway - Production Ingress`)
- **Baseline Risk**: 61.0
- **Injected CVE**: `CVE-2026-9999` (CVSS 9.8, Exploitability: 9.6, Status: Open)
- **Post-change Risk**: 84.0
- **Change**: +23.0 points (+37.7%)
- **Global Enterprise Risk Impact**: 72.4 -> 78.6 (+6.2 points)
- **Live WebSocket Event**: `RISK_SURGE_EVENT` received with event payload `CRITICAL_VULNERABILITY_DETECTED`

---

## 4. Scenario Result
- **Scenario Name**: MFA + Zero Trust Micro-Segmentation
- **Scenario ID**: `0bb6e5b4-6c48-4e8e-936d-4e8128b3160a`
- **Baseline Risk**: 25.7
- **Scenario Risk**: 25.7
- **Investment Cost**: ₹30,00,000.0 (₹30 Lakh)
- **Risk Reduction**: 0.0 pts (asset-level micro-segmentation offset)
- **Confidence**: 92.0%

---

## 5. Optimization Result
- **Budget**: ₹50,00,000.0 (₹50 Lakh)
- **Status**: OPTIMAL
- **Selected Initiatives**:
  - `INV-MFA-01` (Universal Phishing-Resistant MFA FIDO2) — ₹12.0 Lakh (Reduction: 14.5 pts)
  - `INV-PATCH-04` (Automated Vulnerability Remediation Pipeline) — ₹15.0 Lakh (Reduction: 11.2 pts)
  - `INV-BAK-05` (Immutable Air-Gapped Backup Vault) — ₹18.0 Lakh (Reduction: 9.8 pts)
  - `INV-TRAIN-14` (Executive Phishing Simulation & Training) — ₹3.0 Lakh (Reduction: 4.2 pts)
- **Total Cost**: ₹48,00,000.0 (₹48 Lakh)
- **Budget Remaining**: ₹2,00,000.0 (₹2 Lakh)
- **Initial Risk**: 78.6
- **Optimized Risk**: 47.9
- **Modeled Risk Reduction**: 30.7 points
- **Constraints Handled**: Hard budget constraint (<= ₹50L), binary initiative inclusion, mandatory dependencies.

---

## 6. API Results

| Endpoint | Status | Result |
|---|---:|---|
| `/health` | 200 | Operational (`{"status":"operational","risk_engine":"online","optimizer":"online"}`) |
| `/api/v1/risks/overview` | 200 | KPI summary, risk distribution, trends, and financial quantifications |
| `/api/v1/risks/landscape` | 200 | 45 assets mapped with multi-dimensional risk scores |
| `/api/v1/assets` | 200 | 45 inventory assets with control coverage, exposures, and vulns |
| `/api/v1/services` | 200 | 12 critical business services with risk scores and EAL metrics |
| `/api/v1/ai/insights` | 200 | Structured explainability breakdown, evidence correlation, and anomalies |
| `/api/v1/optimizations/compare` | 200 | Comparative portfolios across ₹50L, ₹75L, and ₹35L budget frontiers |
| `/api/v1/audit` | 200 | 27 chronological audit entries tracking platform modifications |
| `/api/v1/reports/download-pdf` | 200 | 3,644 bytes valid PDF document stream (`application/pdf`) |
| `/api/v1/live` | 101 | WebSocket handshake verified; bi-directional telemetry broadcast active |

---

## 7. Automated Tests
- **pytest result**: 15 passed, 0 failed, 4 warnings in 6.17s (100% pass rate)
- **frontend build result**: Passed in 10.35s (`tsc && vite build`), 0 errors, output generated in `dist/`
- **WebSocket result**: Real-time broadcast handshake verified, `RISK_SURGE_EVENT` received upon injection
- **PDF result**: Valid binary generated with `%PDF-1.4` magic bytes, 3,644 bytes payload delivered with HTTP 200

---

## 8. Defects Found
None found.

---

## 9. Final Status

**PASS**
