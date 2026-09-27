<div align="center">

# 🛡️ RiskForge AI

### Enterprise Cyber Risk Quantification & Investment Optimization Platform

**Smart India Hackathon 2026 — Problem Statement SIH 26105**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/Neon-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![License](https://img.shields.io/badge/License-MIT-22C55E)](LICENSE)

*Continuous risk intelligence · What-If simulation · MIP investment optimizer · Real-time WebSocket events*

---

</div>

## 📸 Screenshots

| Dashboard | Risk Landscape | Asset Inventory |
|-----------|---------------|-----------------|
| Executive KPIs, EAL, trend chart | 45-node scatter matrix (Likelihood × Impact) | 45 assets with CVE + control coverage |

| What-If Simulator | Compliance | AI Insights |
|-------------------|------------|-------------|
| Baseline vs. scenario delta | RBI / PCI-DSS / ISO 27001 | Gemini-powered CISO advisor |

---

## 🎯 What It Solves

Modern CISOs, Risk Committees, and Boards struggle with four critical questions:

| # | Question | RiskForge Answer |
|---|----------|-----------------|
| 1 | *Which assets are exposed and what is our financial risk?* | Continuous EAL quantification from live CVE + asset telemetry |
| 2 | *Why is risk high?* | Deterministic driver decomposition (exposure / vuln / control gap) |
| 3 | *What if we enforce MFA or micro-segmentation?* | What-If simulator with real-time scenario delta |
| 4 | *Which security investments maximize risk reduction under budget?* | Google OR-Tools **MIP optimizer** — provably optimal portfolio |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RiskForge AI Platform                     │
├────────────────────┬───────────────────────────────────────┤
│   React Frontend   │          FastAPI Backend                │
│   TypeScript · Vite│  Risk Engine · Scenario Engine         │
│   Recharts · Lucide│  OR-Tools MIP Optimizer                │
│   WebSocket Client │  NVD · CISA KEV · EPSS Integration     │
│   LIVE/DEMO/SIM    │  Firebase Auth · JWT                   │
│   Mode Switcher    │  WebSocket Live Simulator               │
├────────────────────┴───────────────────────────────────────┤
│                  Neon PostgreSQL (Production)                │
│  Assets · Services · Vulnerabilities · Risk Snapshots       │
│  Controls · Scenarios · Optimization Runs · Audit Trail     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 🔢 Financial Risk Quantification
- **FAIR-inspired EAL formula**: `Risk = Likelihood × Impact × Exposure Modifier × (1 - Control Effectiveness)`
- Live computation from NVD CVSS scores, asset criticality, business downtime costs
- Per-service EAL in INR (₹) with exposure breakdown

### 🗺️ Risk Landscape (Scatter Matrix)
- 2D Likelihood × Impact heatmap with 45 asset bubbles
- Bubble size = financial exposure zone | Color = risk severity
- Click any node for deep driver inspection

### 🧪 What-If Scenario Simulator
- Apply controls (MFA, segmentation, EDR) and see risk delta instantly
- Baseline vs. Projected: score, EAL saved, capital cost, ROI
- `[SIMULATION]` mode shows projected state across all dashboards

### 💰 Investment Optimizer
- **Google OR-Tools MIP** — solves knapsack under capital budget
- Input: budget (₹50L default) → Output: optimal control portfolio
- Shows risk reduction points, ROI, and decision audit trail

### 🔴 Live Intelligence Feed
- **WebSocket** broadcasts: Risk surges, CVE resolutions, EPSS updates
- Backend emits events every ~20s from real DB state
- Client-side fallback simulation (LIVE badge always on)
- Animated banner notifications: 🔴 surge · ✅ resolved · ⚡ recalc · 🎯 optimized

### 🔍 Data Sources (Real APIs)
| Source | Data | Update |
|--------|------|--------|
| NVD (NIST) | CVE details, CVSS scores | On-demand sync |
| CISA KEV | Known Exploited Vulnerabilities | Daily |
| EPSS | Exploit probability scores | Daily |
| Qualys / custom | Asset & software inventory | Batch upload |

### 🔐 Authentication
- Email + password (demo users pre-seeded)
- **Google Sign-In** (Firebase) with Neon PostgreSQL sync
- 3-tier Firebase token verification: SDK → REST → demo JWT fallback

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Python 3.12+
- Node.js 18+
- Git

### 1. Clone & install backend

```bash
git clone https://github.com/Ashwin15-png/risk-forage-ai.git
cd risk-forage-ai/backend

pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — the Neon PostgreSQL connection string is pre-filled for demo
```

```env
DATABASE_URL=postgresql+psycopg://<user>:<pass>@<host>/neondb?sslmode=require
SECRET_KEY=super-secret-cyberrisk-jwt-key-sih-2026-quantification
DEMO_MODE=true
ENVIRONMENT=development
FIREBASE_PROJECT_ID=ashwin-java-app-2026
```

### 3. Seed the database

```bash
python seed.py
```

> Seeds: 1 org · 4 users · 12 business services · 45 assets · 116 vulnerabilities · 18 controls · 50 risk snapshots

### 4. Start backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 5. Start frontend

```bash
cd ../frontend
npm install
npm run dev
```

App: **http://localhost:5173**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **CISO** (default) | `ciso@demofinancial.com` | `DemoPassword2026!` |
| Analyst | `analyst@demofinancial.com` | `DemoPassword2026!` |
| Auditor | `auditor@demofinancial.com` | `DemoPassword2026!` |
| Admin | `admin@demofinancial.com` | `DemoPassword2026!` |

> 💡 **No login needed** — the app auto-authenticates as demo CISO on first load.

---

## 📁 Project Structure

```
risk-forage-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app + WebSocket + lifespan
│   │   ├── routes/                 # 20 API routers
│   │   │   ├── risks.py            # Risk overview + landscape + history
│   │   │   ├── assets.py           # Asset inventory + detail
│   │   │   ├── scenarios.py        # What-If simulator
│   │   │   ├── optimizations.py    # MIP optimizer (OR-Tools)
│   │   │   ├── auth.py             # Login + Firebase sync
│   │   │   └── ...
│   │   ├── risk_engine/
│   │   │   ├── calculator.py       # Asset-level risk formula
│   │   │   ├── service_calculator.py  # Service-level aggregation
│   │   │   └── weights.py          # Calibrated weight constants
│   │   ├── scenario_engine/
│   │   │   └── simulator.py        # What-If delta engine
│   │   ├── websocket/
│   │   │   ├── manager.py          # WebSocket connection manager
│   │   │   └── simulator.py        # Live event broadcaster
│   │   ├── models/entities.py      # SQLAlchemy ORM models
│   │   └── utils/
│   │       ├── firebase_auth.py    # 3-tier Firebase token verification
│   │       └── auth.py             # JWT helpers
│   ├── seed.py                     # Full synthetic data seeder
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 18 route pages
│   │   │   ├── Dashboard.tsx       # Executive KPI dashboard
│   │   │   ├── RiskLandscape.tsx   # 2D scatter matrix
│   │   │   ├── Assets.tsx          # Asset inventory table
│   │   │   ├── Scenarios.tsx       # What-If simulator
│   │   │   ├── Optimization.tsx    # MIP portfolio optimizer
│   │   │   ├── Compliance.tsx      # RBI/PCI-DSS/ISO 27001
│   │   │   └── ...
│   │   ├── context/
│   │   │   ├── DataModeContext.tsx # LIVE/DEMO/SIMULATION mode
│   │   │   └── AuthContext.tsx     # Firebase + app user state
│   │   ├── services/
│   │   │   ├── api.ts              # Axios client + auto-login
│   │   │   └── socket.ts           # WebSocket + demo fallback
│   │   └── components/
│   │       ├── Navbar.tsx          # Mode switcher + live feed
│   │       ├── LiveRiskDemoModal.tsx
│   │       └── ...
│   └── vite.config.ts
│
└── README.md
```

---

## 🧠 Risk Engine Formula

```
Risk Score (0–100) =
  min(100,
    Likelihood_Score × Impact_Score × Exposure_Modifier
    × (1 − Control_Effectiveness_Offset)
    × Confidence_Multiplier
  )

where:
  Likelihood_Score    = avg(CVSS_exploitability) × EPSS_weight × KEV_bonus
  Impact_Score        = criticality_weight × downtime_factor × data_class_modifier
  Exposure_Modifier   = {Internet-Facing: 1.35, DMZ: 1.20, Partner: 1.10, Internal: 1.0}
  Control_Offset      = sum(control_effectiveness × coverage_pct) × 0.01

EAL (₹) = (Risk/100) × financial_loss_per_hour × 24 × 365
```

---

## 🎛️ Data Modes

| Mode | Badge | Description |
|------|-------|-------------|
| **LIVE** | `● LIVE` | Real DB + WebSocket events from backend |
| **DEMO** | `[DEMO DATA]` | Real DB data, client-side simulation events |
| **SIMULATION** | `[SIMULATION]` | What-If scenario delta applied across all views |

---

## 🔬 Test Suite

```bash
cd backend
pytest tests/ -v
```

19 tests · 4 test modules:
- `test_core.py` — risk formula unit tests
- `test_ingestion.py` — data pipeline E2E
- `test_compliance.py` — compliance mapping
- `test_platform.py` — API integration

---

## 📊 Production DB Schema

| Table | Rows | Purpose |
|-------|------|---------|
| `organizations` | 1 | Tenant config |
| `users` | 4 | RBAC users |
| `business_services` | 12 | Service risk aggregation |
| `assets` | 45 | Infrastructure nodes |
| `vulnerabilities` | 116 | CVE-to-asset mappings |
| `security_controls` | 18 | Control catalog |
| `risk_snapshots` | 50 | Historical trend |
| `optimization_runs` | 15 | MIP solver results |
| `scenarios` | 4 | What-If scenarios |
| `audit_events` | 56 | Full audit trail |

---

## 🌐 API Reference

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/auth/login` | Email + password auth |
| `POST /api/v1/auth/sync` | Firebase Google Sign-In sync |
| `GET /api/v1/risks/overview` | Executive dashboard KPIs |
| `GET /api/v1/risks/landscape` | 45-bubble scatter matrix |
| `GET /api/v1/assets` | Asset inventory |
| `GET /api/v1/vulnerabilities` | CVE list with EPSS |
| `POST /api/v1/scenarios` | Run What-If simulation |
| `POST /api/v1/optimizations` | Run MIP optimizer |
| `GET /api/v1/compliance` | RBI/PCI-DSS/ISO status |
| `WS /api/v1/live` | WebSocket live events |
| `GET /docs` | Swagger UI |

---

## 👥 Team

**Demo Financial Services Ltd.** — Synthetic SIH 26105 Sandbox

Built for **Smart India Hackathon 2026** · Problem Statement 26105  
*Continuous Cyber Risk Intelligence & Investment Optimization*

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for SIH 2026

</div>
