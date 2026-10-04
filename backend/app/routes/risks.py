from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models.entities import (
    RiskSnapshot, RiskDriver, BusinessService, Asset, Vulnerability, Incident, InvestmentInitiative, SecurityControl, OptimizationRun, Organization
)

router = APIRouter(prefix="/risks", tags=["Risk Quantification"])

@router.get("/overview")
def get_executive_overview(db: Session = Depends(get_db)):
    """
    Returns executive metrics for /dashboard.
    """
    # 1. Total cyber risk & snapshot
    latest_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    prev_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).offset(1).first()

    current_score = latest_snap.risk_score if latest_snap else 72.4
    prev_score = prev_snap.risk_score if prev_snap else 64.1
    delta_pct = round(((current_score - prev_score) / prev_score) * 100, 1) if prev_score else 8.3

    if current_score >= 75.0:
        cat = "CRITICAL"
    elif current_score >= 50.0:
        cat = "HIGH"
    elif current_score >= 25.0:
        cat = "MODERATE"
    else:
        cat = "LOW"

    # Counts
    crit_assets_count = db.query(Asset).filter(Asset.criticality == "Critical").count()
    crit_vulns_count = db.query(Vulnerability).filter(Vulnerability.severity == "Critical", Vulnerability.status.in_(["Open", "Reopened"])).count()
    open_incidents_count = db.query(Incident).filter(Incident.status.in_(["Open", "Investigating"])).count()
    
    # Risk Distribution across all assets
    assets = db.query(Asset).all()
    dist = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for a in assets:
        score = a.current_risk_score
        if score >= 75.0:
            dist["Critical"] += 1
        elif score >= 50.0:
            dist["High"] += 1
        elif score >= 25.0:
            dist["Medium"] += 1
        else:
            dist["Low"] += 1

    # 30-Day Risk Trend with EAL and Residual Risk
    trend_snapshots = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.asc()).limit(90).all()
    trend_data = []
    for s in trend_snapshots:
        # Expected annual loss scales with risk score and critical exposure
        eal_val = round((s.risk_score / 100.0) * 16500000.0, 0)
        trend_data.append({
            "date": s.snapshot_date.strftime("%b %d"),
            "risk_score": s.risk_score,
            "likelihood": s.likelihood,
            "impact": s.impact,
            "exposure": round(s.risk_score * 1.12, 1),
            "residual_risk": round(s.risk_score * s.control_mod, 1),
            "confidence": s.confidence_score,
            "eal": eal_val
        })

    # Top Risk Drivers
    top_drivers = []
    if latest_snap and latest_snap.drivers:
        for d in latest_snap.drivers:
            top_drivers.append({
                "name": d.name,
                "driver_type": d.driver_type,
                "impact_contribution": d.impact_contribution,
                "affected_assets": d.affected_assets_count,
                "confidence": d.confidence
            })
    else:
        top_drivers = [
            {"name": "Internet Exposure", "driver_type": "Exposure", "impact_contribution": +18.0, "affected_assets": 8, "confidence": 94.0},
            {"name": "Critical Vulnerabilities", "driver_type": "Vulnerability", "impact_contribution": +16.5, "affected_assets": 12, "confidence": 96.0},
            {"name": "Tier 1 Asset Criticality", "driver_type": "Asset Criticality", "impact_contribution": +13.0, "affected_assets": 6, "confidence": 95.0},
            {"name": "Weak Authentication / MFA Gaps", "driver_type": "Control Gap", "impact_contribution": +9.0, "affected_assets": 14, "confidence": 90.0},
            {"name": "Active EDR Telemetry Mitigation", "driver_type": "Control Effectiveness", "impact_contribution": -8.0, "affected_assets": 36, "confidence": 92.0}
        ]

    # Highest Risk Services with calibrated EAL
    services = db.query(BusinessService).order_by(BusinessService.current_risk_score.desc()).limit(6).all()
    high_risk_services = []
    for srv in services:
        service_eal = round((srv.current_risk_score / 100.0) * srv.financial_loss_per_hour * 24 * 7, 0)
        high_risk_services.append({
            "id": srv.id,
            "name": srv.name,
            "code": srv.code,
            "criticality": srv.criticality,
            "risk_score": srv.current_risk_score,
            "trend": srv.trend,
            "top_driver": srv.top_driver,
            "confidence": srv.confidence,
            "financial_loss_per_hour": srv.financial_loss_per_hour,
            "eal": service_eal
        })

    # Enterprise Financial Risk Quantifications (Dynamically computed from Business Services and Optimization Runs)
    all_services = db.query(BusinessService).all()
    if all_services:
        total_exposure = float(sum(srv.financial_loss_per_hour * 24 * 30 for srv in all_services))
        expected_annual_loss = float(sum(round((srv.current_risk_score / 100.0) * srv.financial_loss_per_hour * 24 * 7, 0) for srv in all_services))
    else:
        total_exposure = 47000000.0
        expected_annual_loss = 12000000.0

    latest_opt = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).first()
    if latest_opt:
        risk_red_pts = round(float(latest_opt.risk_reduction), 1)
        current_budget = float(latest_opt.total_budget)
        expected_cost = float(latest_opt.budget_used)
        recommended_investment = latest_opt.explanation or "Deploy Optimal Security Controls"
        current_sec_inv = float(latest_opt.budget_used)
        risk_reduction_opp_inr = round(expected_annual_loss * (risk_red_pts / max(current_score, 1.0)), 0)
    else:
        risk_red_pts = 28.0
        current_budget = 5000000.0
        expected_cost = 4800000.0
        recommended_investment = "Deploy Zero Trust Segmentation & Hardware MFA"
        current_sec_inv = 4800000.0
        risk_reduction_opp_inr = round(expected_annual_loss * 0.35, 0)

    org = db.query(Organization).first()
    curr = getattr(org, "currency", "INR") or "INR"
    curr_sym = getattr(org, "currency_symbol", "₹") or "₹"

    return {
        "kpi": {
            "total_risk": current_score,
            "previous_risk": prev_score,
            "risk_category": cat,
            "delta_pct": delta_pct,
            "critical_assets": crit_assets_count,
            "critical_vulnerabilities": crit_vulns_count,
            "open_incidents": open_incidents_count,
            "risk_reduction_opportunity": risk_red_pts,
            "risk_reduction_opportunity_inr": risk_reduction_opp_inr,
            "expected_annual_loss": expected_annual_loss,
            "total_financial_exposure": total_exposure,
            "current_security_investment": current_sec_inv,
            "evidence_confidence": latest_snap.confidence_score if latest_snap else 91.0,
            "currency": curr,
            "currency_symbol": curr_sym,
        },
        "distribution": dist,
        "trend": trend_data,
        "top_drivers": top_drivers,
        "highest_risk_services": high_risk_services,
        "investment_opportunity": {
            "current_budget": current_budget,
            "potential_risk_reduction": risk_red_pts,
            "recommended_investment": recommended_investment,
            "expected_cost": expected_cost,
            "currency": curr,
            "currency_symbol": curr_sym,
        }
    }

@router.get("/landscape")
def get_risk_landscape(
    service_id: Optional[str] = None,
    criticality: Optional[str] = None,
    exposure: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Returns asset and service bubbles for the Risk Heatmap (Likelihood vs Impact, bubble size = exposure).
    """
    query = db.query(Asset)
    if service_id:
        query = query.filter(Asset.service_id == service_id)
    if criticality:
        query = query.filter(Asset.criticality == criticality)
    if exposure:
        query = query.filter(Asset.exposure == exposure)

    assets = query.all()
    bubbles = []

    exposure_size_map = {
        "Internet-Facing": 32,
        "DMZ": 24,
        "Partner": 18,
        "Internal": 14
    }

    for a in assets:
        score = a.current_risk_score
        if score >= 75.0:
            severity = "Critical"
        elif score >= 50.0:
            severity = "High"
        elif score >= 25.0:
            severity = "Medium"
        else:
            severity = "Low"

        bubbles.append({
            "id": a.id,
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "service_name": a.service.name if a.service else "Unassigned",
            "likelihood": a.current_likelihood,
            "impact": a.current_impact,
            "risk_score": score,
            "severity": severity,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "bubble_size": exposure_size_map.get(a.exposure, 16),
            "control_coverage": a.control_coverage,
            "vulnerabilities_count": len(a.vulnerabilities)
        })

    return bubbles

@router.get("/history/{entity_id}")
def get_entity_risk_history(entity_id: str, db: Session = Depends(get_db)):
    """
    Returns historical risk timeline for a specific asset or service.
    """
    snaps = db.query(RiskSnapshot).filter(RiskSnapshot.entity_id == entity_id).order_by(RiskSnapshot.snapshot_date.asc()).all()
    if not snaps:
        # Fallback to global snapshots if entity specific history is not seeded
        snaps = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.asc()).limit(30).all()

    return [
        {
            "id": s.id,
            "date": s.snapshot_date.strftime("%Y-%m-%d"),
            "risk_score": s.risk_score,
            "likelihood": s.likelihood,
            "impact": s.impact,
            "exposure_mod": s.exposure_mod,
            "control_mod": s.control_mod,
            "confidence": s.confidence_score
        } for s in snaps
    ]
