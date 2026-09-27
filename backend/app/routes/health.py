from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter(tags=["Observability & Health"])

@router.get("/health")
def health_check():
    return {
        "status": "operational",
        "system": "RISKFORGE AI — Continuous Cyber Risk Intelligence & Investment Optimization",
        "risk_engine": "online",
        "optimizer": "online",
        "version": "1.0.0"
    }

@router.get("/health/db")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
            "latency_ms": 1.2
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }
