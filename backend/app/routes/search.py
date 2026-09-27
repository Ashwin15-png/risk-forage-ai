from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app.models.entities import Asset, BusinessService, Vulnerability, SecurityControl, InvestmentInitiative

router = APIRouter(prefix="/search", tags=["Global Search"])

@router.get("")
def global_search(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    term = f"%{q.strip()}%"
    
    # Assets
    assets = db.query(Asset).filter(
        (Asset.name.ilike(term)) | (Asset.asset_id_code.ilike(term)) | (Asset.ip_address.ilike(term))
    ).limit(5).all()

    # Services
    services = db.query(BusinessService).filter(
        (BusinessService.name.ilike(term)) | (BusinessService.code.ilike(term))
    ).limit(5).all()

    # Vulnerabilities
    vulns = db.query(Vulnerability).filter(
        (Vulnerability.cve_id.ilike(term)) | (Vulnerability.title.ilike(term))
    ).limit(5).all()

    # Controls
    controls = db.query(SecurityControl).filter(
        (SecurityControl.name.ilike(term)) | (SecurityControl.code.ilike(term))
    ).limit(5).all()

    # Investments
    investments = db.query(InvestmentInitiative).filter(
        (InvestmentInitiative.name.ilike(term)) | (InvestmentInitiative.code.ilike(term))
    ).limit(5).all()

    return {
        "query": q,
        "assets": [{"id": a.id, "title": a.name, "subtitle": f"{a.asset_id_code} • {a.exposure}", "risk": a.current_risk_score, "type": "Asset", "link": f"/assets/{a.id}"} for a in assets],
        "services": [{"id": s.id, "title": s.name, "subtitle": f"{s.code} • {s.criticality}", "risk": s.current_risk_score, "type": "Service", "link": f"/services"} for s in services],
        "vulnerabilities": [{"id": v.id, "title": v.cve_id, "subtitle": f"{v.title} (CVSS {v.cvss_score})", "severity": v.severity, "type": "Vulnerability", "link": f"/vulnerabilities"} for v in vulns],
        "controls": [{"id": c.id, "title": c.name, "subtitle": f"{c.code} • {c.category}", "effectiveness": c.effectiveness_pct, "type": "Control", "link": f"/controls"} for c in controls],
        "investments": [{"id": inv.id, "title": inv.name, "subtitle": f"{inv.code} • ₹{inv.one_time_cost:,.0f}", "reduction": inv.expected_risk_reduction, "type": "Investment", "link": f"/investments"} for inv in investments]
    }
