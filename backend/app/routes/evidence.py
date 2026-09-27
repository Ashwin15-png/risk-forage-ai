import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.database import get_db
from app.models.entities import EvidenceSource, EvidenceRecord, Vulnerability, Asset
from app.schemas.schemas import EvidenceBatchRequest, SourceRegisterRequest
from app.utils.normalization import normalize_vulnerability_record, normalize_asset_record, normalize_control_record
from app.websocket.manager import ws_manager
from app.audit.logger import log_audit_event

router = APIRouter(prefix="/evidence", tags=["Evidence Ingestion"])

@router.get("/sources")
def list_evidence_sources(db: Session = Depends(get_db)):
    sources = db.query(EvidenceSource).all()
    results = []
    for s in sources:
        results.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "status": s.status,
            "freshness_score": s.freshness_score,
            "confidence_score": s.confidence_score,
            "total_records": s.total_records,
            "last_sync": s.last_sync_at.strftime("%Y-%m-%d %H:%M") if s.last_sync_at else "Never"
        })
    return results

@router.get("/records")
def list_evidence_records(
    source_id: Optional[str] = None,
    validation_status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(EvidenceRecord)
    if source_id:
        query = query.filter(EvidenceRecord.source_id == source_id)
    if validation_status:
        query = query.filter(EvidenceRecord.validation_status == validation_status)

    records = query.order_by(EvidenceRecord.ingestion_timestamp.desc()).limit(limit).all()
    results = []
    for r in records:
        results.append({
            "id": r.id,
            "source_id": r.source_id,
            "source_name": r.source.name if r.source else "Unknown",
            "record_type": r.record_type,
            "raw_payload": json.loads(r.raw_payload_json) if r.raw_payload_json else {},
            "normalized_payload": json.loads(r.normalized_payload_json) if r.normalized_payload_json else {},
            "data_quality_score": r.data_quality_score,
            "validation_status": r.validation_status,
            "validation_errors": json.loads(r.validation_errors_json) if r.validation_errors_json else [],
            "ingestion_timestamp": r.ingestion_timestamp.strftime("%Y-%m-%d %H:%M:%S") if r.ingestion_timestamp else "N/A"
        })
    return results

@router.post("/batch")
async def ingest_evidence_batch(
    payload: EvidenceBatchRequest,
    db: Session = Depends(get_db)
):
    """
    Ingests batch records, performs canonical schema normalization,
    checks data quality, logs validation warnings/errors, and stores audit trail.
    """
    source = db.query(EvidenceSource).filter(EvidenceSource.name == payload.source_name).first()
    if not source:
        source = db.query(EvidenceSource).first()

    ingested_count = 0
    valid_count = 0
    errors_total = 0
    records_to_insert = []

    for item in payload.records:
        if payload.record_type == "vulnerability":
            norm, errs, quality = normalize_vulnerability_record(item, source.name)
        elif payload.record_type == "asset":
            norm, errs, quality = normalize_asset_record(item, source.name)
        else:
            norm, errs, quality = normalize_control_record(item, source.name)

        status_flag = "Error" if len(errs) > 1 else ("Warning" if len(errs) == 1 else "Valid")
        if status_flag == "Valid":
            valid_count += 1
        else:
            errors_total += len(errs)

        record = EvidenceRecord(
            source_id=source.id,
            org_id=source.org_id,
            record_type=payload.record_type,
            raw_payload_json=json.dumps(item),
            normalized_payload_json=json.dumps(norm),
            data_quality_score=quality,
            validation_status=status_flag,
            validation_errors_json=json.dumps(errs),
            ingestion_timestamp=datetime.now(timezone.utc)
        )
        records_to_insert.append(record)
        ingested_count += 1

    db.add_all(records_to_insert)
    source.total_records += ingested_count
    source.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        org_id=source.org_id,
        action="Evidence Batch Ingested",
        entity_type="EvidenceSource",
        entity_id=source.name,
        new_values={"records_ingested": ingested_count, "valid": valid_count, "errors": errors_total},
        description=f"Ingested {ingested_count} {payload.record_type} records from {source.name}."
    )

    await ws_manager.broadcast("EVIDENCE_INGESTED", {
        "source": source.name,
        "type": payload.record_type,
        "records_count": ingested_count,
        "valid_count": valid_count,
        "errors_count": errors_total
    })

    return {
        "success": True,
        "source_name": source.name,
        "ingested_count": ingested_count,
        "valid_count": valid_count,
        "errors_count": errors_total
    }

@router.post("/sources/{id}/refresh")
async def refresh_evidence_source(id: str, db: Session = Depends(get_db)):
    source = db.query(EvidenceSource).filter(EvidenceSource.id == id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")

    source.status = "Healthy"
    source.freshness_score = 98.0
    source.last_sync_at = datetime.now(timezone.utc)
    db.commit()

    await ws_manager.broadcast("SOURCE_REFRESHED", {
        "source_id": source.id,
        "source_name": source.name,
        "status": "Healthy"
    })

    return {"success": True, "source": source.name, "status": "Healthy"}
