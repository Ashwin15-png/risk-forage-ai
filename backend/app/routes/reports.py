from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
from app.database import get_db
from app.models.entities import RiskSnapshot, Organization, BusinessService, InvestmentInitiative, AuditEvent, Asset, OptimizationRun
from app.reports.generator import generate_executive_report_pdf, generate_csv_export
from app.audit.logger import log_audit_event
from app.websocket.manager import ws_manager

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/preview")
def preview_report(report_type: str = "executive", db: Session = Depends(get_db)):
    org = db.query(Organization).first()
    snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    high_srv = db.query(BusinessService).order_by(BusinessService.current_risk_score.desc()).first()
    latest_opt = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).first()

    drivers = []
    if snap and snap.drivers_json:
        try:
            drivers = json.loads(snap.drivers_json)
        except Exception:
            pass

    return {
        "report_type": report_type,
        "title": "RISKFORGE AI — Continuous Cyber Risk Intelligence Executive Report",
        "organization_name": org.name if org else "Demo Financial Services Ltd.",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "risk_score": snap.risk_score if snap else 72.4,
        "category": "CRITICAL" if (snap and snap.risk_score >= 75) else ("HIGH" if (snap and snap.risk_score >= 50) else "MODERATE"),
        "potential_reduction": round(float(latest_opt.risk_reduction), 1) if latest_opt else 28.0,
        "recommended_budget": f"₹{int(latest_opt.budget_used):,}" if latest_opt else "₹48,00,000",
        "model_version": snap.model_version if snap else "Risk Model v1.0",
        "high_risk_service": high_srv.name if high_srv else "Payment Gateway",
        "drivers": drivers,
        "audit_id": "AUD-REP-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    }

@router.get("/download-pdf")
async def download_pdf_report(db: Session = Depends(get_db)):
    """
    Returns dynamically generated ReportLab PDF executive cyber risk report.
    """
    org = db.query(Organization).first()
    snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
    latest_opt = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).first()

    drivers = []
    if snap and snap.drivers_json:
        try:
            raw_drivers = json.loads(snap.drivers_json)
            for d in raw_drivers:
                drivers.append({
                    "name": d.get("name", "Risk Driver"),
                    "impact": f"{d.get('impact_contribution', d.get('impact', 0.0)):+0.1f}" if isinstance(d.get('impact_contribution', d.get('impact')), (int, float)) else str(d.get('impact', '+10.0')),
                    "confidence": int(d.get("confidence", 90))
                })
        except Exception:
            pass

    if not drivers:
        drivers = [
            {"name": "Internet Exposure", "impact": "+18.0", "confidence": 94},
            {"name": "Critical Vulnerability CVSS >= 9.0", "impact": "+21.0", "confidence": 96},
            {"name": "Payment Gateway Tier 1 Criticality", "impact": "+13.0", "confidence": 95},
            {"name": "Weak MFA Enforcement Gaps", "impact": "+9.0", "confidence": 90},
            {"name": "Active EDR Telemetry Mitigation", "impact": "-8.0", "confidence": 92}
        ]

    score = snap.risk_score if snap else 72.4
    category = "Critical" if score >= 75.0 else ("High" if score >= 50.0 else "Moderate")
    potential_red = round(float(latest_opt.risk_reduction), 1) if latest_opt else 28.0
    budget_formatted = f"₹{int(latest_opt.budget_used):,}" if latest_opt else "₹48,00,000"

    report_payload = {
        "organization_name": org.name if org else "Demo Financial Services Ltd.",
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "risk_score": score,
        "category": category,
        "potential_reduction": potential_red,
        "recommended_budget": budget_formatted,
        "drivers": drivers,
        "model_version": snap.model_version if snap else "Risk Model v1.0",
        "audit_id": "AUD-REPORT-" + datetime.now(timezone.utc).strftime("%Y%m%d%H%M")
    }

    pdf_bytes = generate_executive_report_pdf(report_payload)

    log_audit_event(
        db=db,
        org_id=org.id if org else "org-demo",
        action="Report Generated",
        entity_type="ExecutiveRiskReport",
        entity_id=report_payload["audit_id"],
        description="Generated and downloaded RISKFORGE AI Executive Risk Intelligence PDF Report."
    )

    await ws_manager.broadcast("REPORT_GENERATED", {
        "report_type": "RISKFORGE AI Executive Risk Report",
        "audit_id": report_payload["audit_id"],
        "generated_at": report_payload["generated_at"]
    })

    filename = f"Cyber_Risk_Report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export-csv")
def export_assets_csv(db: Session = Depends(get_db)):
    assets = db.query(Asset).all()
    rows = []
    for a in assets:
        rows.append({
            "asset_id_code": a.asset_id_code,
            "name": a.name,
            "asset_type": a.asset_type,
            "exposure": a.exposure,
            "criticality": a.criticality,
            "risk_score": a.current_risk_score,
            "likelihood": a.current_likelihood,
            "impact": a.current_impact,
            "control_coverage": a.control_coverage,
            "service": a.service.name if a.service else "Unassigned"
        })

    csv_content = generate_csv_export(rows, [
        "asset_id_code", "name", "asset_type", "exposure", "criticality",
        "risk_score", "likelihood", "impact", "control_coverage", "service"
    ])

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=Cyber_Risk_Assets.csv"}
    )
