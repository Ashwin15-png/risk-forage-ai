from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import get_db
from app.models.entities import AuditEvent

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("")
def list_audit_events(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if action:
        query = query.filter(AuditEvent.action == action)
    if entity_type:
        query = query.filter(AuditEvent.entity_type == entity_type)

    events = query.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    results = []
    for e in events:
        results.append({
            "id": e.id,
            "timestamp": e.created_at.strftime("%Y-%m-%d %H:%M:%S") if e.created_at else "N/A",
            "user": e.user_email,
            "action": e.action,
            "entity": f"{e.entity_type}: {e.entity_id or ''}".strip(),
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "model_version": e.model_version,
            "source": e.source,
            "ip_address": e.ip_address,
            "description": e.description,
            "old_values": e.old_values_json,
            "new_values": e.new_values_json
        })
    return results
