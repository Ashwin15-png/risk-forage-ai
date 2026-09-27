import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models.entities import AuditEvent
from app.models.base import utc_now

def log_audit_event(
    db: Session,
    org_id: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_email: str = "ciso@demofinancial.com",
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    model_version: str = "Risk Model v1.0",
    source: str = "RISKFORGE AI",
    description: Optional[str] = None,
    ip_address: str = "127.0.0.1"
) -> AuditEvent:
    event = AuditEvent(
        org_id=org_id,
        user_email=user_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        old_values_json=json.dumps(old_values) if old_values is not None else None,
        new_values_json=json.dumps(new_values) if new_values is not None else None,
        model_version=model_version,
        source=source,
        ip_address=ip_address,
        description=description or f"{action} performed on {entity_type} {entity_id or ''}".strip(),
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
