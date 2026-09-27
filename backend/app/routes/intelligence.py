import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.routes.sources import sync_unified_intelligence, IntelligenceSyncRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["Unified Vulnerability Intelligence"])

@router.post("/sync")
async def sync_intelligence(
    payload: IntelligenceSyncRequest = None,
    db: Session = Depends(get_db)
):
    """
    Step 7 Canonical Vulnerability Intelligence Pipeline:
    POST /api/v1/intelligence/sync
    Ingests NVD + CISA KEV + EPSS, normalizes, correlates, stores in Neon PostgreSQL,
    and updates Risk Engine.
    """
    return await sync_unified_intelligence(payload=payload, db=db)
