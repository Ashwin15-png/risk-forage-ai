import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.entities import ModelVersion

router = APIRouter(prefix="/models", tags=["Model Management"])

@router.get("")
def list_models(db: Session = Depends(get_db)):
    models = db.query(ModelVersion).all()
    results = []
    for m in models:
        results.append({
            "id": m.id,
            "name": m.name,
            "version": m.version,
            "model_type": m.model_type,
            "description": m.description,
            "is_active": m.is_active,
            "weights": json.loads(m.weights_json) if m.weights_json else {},
            "assumptions": json.loads(m.assumptions_json) if m.assumptions_json else {},
            "created_at": m.created_at.strftime("%Y-%m-%d") if m.created_at else "N/A"
        })
    return results
