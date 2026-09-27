# AI-Powered Continuous Cyber Risk Quantification & Investment Optimization Platform

**Smart India Hackathon (SIH) Problem Statement 26105**  
**Enterprise Cyber Risk Decision-Support & Portfolio Optimization Platform**

---

## 1. Executive Summary & Purpose

Modern Chief Information Security Officers (CISOs), Risk Committees, and Boards of Directors struggle with critical cybersecurity governance questions:
1. *What assets and business services are currently exposed, and what is our quantified financial and operational risk?*
2. *Why is risk high, and which exact telemetry signals, vulnerabilities, or control gaps caused it?*
3. *What happens to enterprise risk if we enforce MFA or micro-segmentation ("What-If" scenarios)?*
4. *Which security investments deliver the greatest risk reduction under strict capital budget limits (e.g. ₹50 Lakh)?*
5. *Can every recommendation be audited back to mathematical formulas, evidence freshness, and deterministic optimization algorithms?*

This platform provides an end-to-end, production-ready, continuous decision-support system that ingests heterogeneous security evidence, normalizes it into a canonical relational data model, continuously quantifies risk using transparent deterministic math, simulates what-if countermeasure scenarios, and solves security portfolio selection using **Google OR-Tools Mixed-Integer Programming (MIP)**.

---

## 2. Core Workflow Architecture

```
DATA SOURCES (EDR, Vulnerability Scanners, Cloud Security, SIEM, Manual CSV)
      ↓
EVIDENCE INGESTION & DATA QUALITY NORMALIZATION (Confidence & Freshness Scoring)
      ↓
CONTINUOUS RISK ENGINE [R = L × I × (1 - E × C) × W]
      ↓
AUTHORITATIVE DECOMPOSITION (Exposure, CVE CVSS, Asset Criticality, Control Gaps)
      ↓
WHAT-IF SCENARIO SIMULATION ENGINE (Non-Destructive Projection & Comparison)
      ↓
GOOGLE OR-TOOLS INVESTMENT OPTIMIZER (0-1 Knapsack & MIP Solver with Budget Limits)
      ↓
DETERMINISTIC AI EXPLAINABILITY [WHAT, WHY, EVIDENCE, IMPACT, ACTION]
      ↓
GREEN CYBER COMMAND CENTER (Real-Time WebSocket Live Hub @ WS /api/v1/live)
      ↓
BOARDROOM PDF / CSV EXPORTS & REGULATORY IMMUTABLE AUDIT TRAIL
```

---

## 3. Technology Stack (Zero Docker Dependencies)

- **Backend**:
  - Python 3.12, FastAPI, Pydantic v2
  - SQLAlchemy 2.0 ORM (Neon PostgreSQL & SQLite fallback support)
  - Alembic for database version control and DDL migrations
  - Google OR-Tools 9.9 (CBC / SCIP Mixed-Integer Linear Programming)
  - NumPy, Pandas, scikit-learn
  - ReportLab for boardroom-ready PDF generation
  - Native WebSockets for real-time live event streaming with ping/pong keep-alive
  - JWT Authentication architecture with PBKDF2 hashing
- **Frontend**:
  - React 18, TypeScript, Vite
  - Vanilla Tailwind CSS (Custom Green Cyber Command Center aesthetic: `#06110B`, `#0D1B12`, `#102417`, `#22C55E`, `#4ADE80`)
  - Lucide React iconography
  - Recharts for 30-day risk trends, 7D/30D/90D ranges, and 2D risk landscape scatter matrix heatmaps
  - React Router v6 & Axios with automated proxying
- **Database**:
  - **Neon Serverless PostgreSQL** (or local SQLite fallback) with 19 canonical entities and full foreign key relational integrity.

---

## 4. Neon PostgreSQL Setup Guide (Step-by-Step)

The platform is designed to connect seamlessly to **Neon Serverless PostgreSQL** over SSL. Follow these steps to configure your database:

### Step 1: Create a Neon Project
1. Navigate to [https://neon.tech](https://neon.tech) and sign in (or create a free account).
2. Click **"Create Project"**.
3. Name your project (e.g., `sih-cyber-risk-platform`).
4. Select your preferred cloud region (e.g., `ap-southeast-1` or `eu-central-1`) and PostgreSQL version 16.

### Step 2: Copy Connection String
1. In your Neon Project Dashboard, locate the **Connection Details** widget.
2. Select **Connection string** and check **Pooled connection** (recommended for serverless workloads).
3. Choose the connection format for **SQLAlchemy** / **Python**:
   ```
   postgresql+psycopg://username:password@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require
   ```

### Step 3: Configure Environment Variables
1. In `backend/`, copy `.env.example` to `.env`:
   ```powershell
   cd backend
   cp .env.example .env
   ```
2. Open `backend/.env` in your editor and paste your Neon connection string:
   ```env
   DATABASE_URL=postgresql+psycopg://username:password@ep-xyz-pooler.region.neon.tech/neondb?sslmode=require
   SECRET_KEY=cyber-risk-sih26105-super-secret-key-2026-production
   FRONTEND_URL=http://localhost:5173
   API_BASE_URL=http://localhost:8000
   ```
   *(Note: If `DATABASE_URL` is omitted, the platform automatically defaults to local `sqlite:///./cyberrisk.db` for zero-setup evaluation).*

### Step 4: Run Database Migrations
Apply the initial schema migration containing all 20 tables, indexes, and constraints:
```powershell
cd backend
alembic upgrade head
```

### Step 5: Seed Synthetic Cyber Risk Dataset
Seed the database with all 43 assets, 12 business services, 92 CVE vulnerabilities, 18 security controls, 24 incidents, 18 investment initiatives, and 31-day snapshots:
```powershell
python seed.py
```

### Step 6: Verify Database Seeding
Inspect the database tables in your Neon SQL Editor or run:
```powershell
python -c "from app.database import SessionLocal; from app.models.entities import Asset, Vulnerability; db = SessionLocal(); print(f'Assets: {db.query(Asset).count()}, Vulns: {db.query(Vulnerability).count()}'); db.close()"
```

---

## 5. Local Execution Guide (Windows 10/11 + VS Code)

### Prerequisites
- **Python**: 3.12+ installed and available in PATH
- **Node.js**: v20+ & npm installed and available in PATH
- **Git**: Installed

---

### Step 1: Start Backend (FastAPI + WebSocket Hub)

Open a PowerShell terminal in the project root:

```powershell
cd backend

# Create virtual environment (optional if using global Python 3.12)
python -m venv .venv
.venv\Scripts\activate

# Install backend dependencies
pip install -r requirements.txt

# Run migrations and seed data (if not already completed)
alembic upgrade head
python seed.py

# Start the FastAPI server on port 8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend is now live:
- **API Base**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive OpenAPI Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Interactive ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Live WebSocket Stream**: `ws://127.0.0.1:8000/api/v1/live`

---

### Step 2: Start Frontend (React + Vite + Green Cyber Command Center)

Open a second PowerShell terminal in the project root:

```powershell
cd frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will start at [http://localhost:5173](http://localhost:5173).

---

## 6. The Three Operational Data Modes

The platform features a 3-way toggle in the top navigation bar allowing evaluators and analysts to switch data perspectives dynamically without reload:

| Mode | Visual Badge | Operational Definition |
|---|---|---|
| **[ DEMO ]** | `[DEMO DATA]` | Pre-seeded baseline banking environment (`Demo Financial Services Ltd.`). Predictable state with risk score of 61.0. |
| **[ LIVE ]** | `[LIVE DATA]` | Live telemetry stream from real database state. WebSocket updates trigger instant continuous recalculation. |
| **[ SIMULATION ]** | `[SIMULATION]` | Non-destructive projected state. Overlays scenario countermeasures and optimizer decisions onto cards and charts. |

---

## 7. Database Schema (19 Canonical Entities)

1. `Organization`: Multi-tenant organization profile and base currency (INR ₹).
2. `User`: Enterprise user profiles with RBAC (CISO, Analyst, Auditor, Admin).
3. `BusinessService`: Tier 1/2/3 business services with business impact scores and financial loss exposure per hour.
4. `Asset`: Infrastructure nodes with IP, hostname, perimeter exposure, and data classification.
5. `Vulnerability`: Active CVEs with CVSS scores, exploitability, and remediation statuses (Open, In Progress, Resolved).
6. `SecurityControl`: Defensive controls with coverage %, effectiveness %, and risk reduction weights.
7. `AssetControl`: Asset-level control enforcement and status mapping.
8. `Incident`: Historical and active cybersecurity incidents with estimated financial loss.
9. `ThreatScenario`: Modeled adversarial campaign profiles and financial impact.
10. `RiskSnapshot`: Point-in-time enterprise and asset risk scores with drivers and assumptions.
11. `RiskDriver`: Decomposed mathematical contributors (Exposure, CVE, Criticality, Control Gap).
12. `InvestmentInitiative`: Security projects with costs in INR, modeled risk reduction points, and dependencies.
13. `OptimizationRun`: OR-Tools solver execution outputs, budget utilization, and ROI metrics.
14. `DecisionApproval`: Formal CISO approval/rejection audit records for recommended initiatives.
15. `ModelVersion`: Versioned algorithms, calibrated weights, and mathematical assumptions.
16. `AuditEvent`: Immutable regulatory audit trail with old/new value diffs and actors.
17. `EvidenceSource`: Data connectors with freshness, status (Healthy, Stale, Missing), and sync logs.
18. `EvidenceRecord`: Raw payloads alongside canonical normalized representations and quality scores.
19. `Scenario` & `ScenarioResult`: What-if simulation hypotheses, deltas, and costs.

---

## 8. Interactive Guided Demo Scenario (SIH Evaluator Workflow)

Click the **"Run Live Risk Demo"** button on the top navigation bar to execute the complete end-to-end evaluation flow:

1. **Step 1 (Baseline)**: Shows Payment Gateway (`pay-api-gw-01`) at baseline **Risk = 61.0 / 100**.
2. **Step 2 (Threat Ingestion)**: Ingests a new weaponized critical vulnerability (**CVE-2026-9999**, CVSS 9.8) on the internet-facing payment ingress.
3. **Step 3 (Continuous Recalculation)**: The Continuous Risk Engine recalculates risk in real time to **84.0 / 100** (**+23.0 points surge**), updates the database snapshot, and broadcasts a live WebSocket alert.
4. **Step 4 (Drivers Breakdown)**: Explains the surge through decomposed drivers: Critical CVE (+21.0 pts), Public Internet Exposure (+18.0 pts), Core Financial Criticality (+13.0 pts).
5. **Step 5 (What-If Simulation)**: Applies Phishing-Resistant MFA and Zero Trust Micro-Segmentation in the Scenario Simulator, projecting risk down to **52.0 / 100** (**-32.0 points reduction**) at an estimated cost of ₹12 Lakh.
6. **Step 6 (Investment Optimization)**: Solves portfolio selection using Google OR-Tools under a **₹50 Lakh budget constraint**, outputting selected initiatives, budget utilized, and residual enterprise risk.
7. **Step 7 (Explainability & Reporting)**: Synthesizes natural language explainability cards (WHAT, WHY, EVIDENCE, IMPACT, ACTION) and generates a downloadable boardroom PDF report.
8. **Step 8 (Auditability)**: Verifies the entire sequence in the immutable audit trail log.

---

## 9. Automated Testing

Run the automated test suite verifying deterministic risk engine calculations, optimizer budget constraints, normalization filters, and scenario simulations:

```powershell
cd backend
pytest tests/ -v
```

All 8 tests pass deterministically:
- `test_compliance.py`: Verifies ISO 27001, NIST CSF, and RBI CSF mapping logic.
- `test_core.py`: Verifies risk formula calculation, OR-Tools optimization, and scenario comparison.
- `test_platform.py`: Verifies 19-entity relationships, EvidenceSource/EvidenceRecord data quality, and live vulnerability status transitions.

---

## 10. Demo Credentials

The platform includes pre-configured personas for role-based evaluation:
- **CISO**: `ciso@demofinancial.com` / `DemoPassword2026!`
- **Analyst**: `analyst@demofinancial.com` / `DemoPassword2026!`
- **Auditor**: `auditor@demofinancial.com` / `DemoPassword2026!`
- **Admin**: `admin@demofinancial.com` / `DemoPassword2026!`

---

## 11. Maintenance Commands

To restore the demonstration environment back to the clean 61.0 baseline state at any time:
```powershell
cd backend
python reset_demo.py
```
*(Can also be triggered directly from the **Settings** page in the UI).*
