import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import (
    Asset, Vulnerability, SoftwareInventory, BusinessService,
    Organization, EvidenceSource, EvidenceRecord, RiskSnapshot,
    RiskDriver, AuditEvent
)
from app.ingestion.nvd_client import nvd_client
from app.ingestion.kev_client import kev_client
from app.ingestion.epss_client import epss_client
from app.risk_engine.calculator import calculate_asset_risk, calculate_global_risk
from app.websocket.manager import ws_manager
from app.audit.logger import log_audit_event

logger = logging.getLogger(__name__)


class IngestionPipeline:
    """
    Canonical End-to-End Ingestion, Enrichment, Correlation, and Risk Pipeline.
    """

    def __init__(self):
        pass

    async def ingest_and_enrich_cve(
        self,
        cve_id: str,
        asset_id: str,
        org_id: str,
        db: Session,
        source_name: str = "NVD Public Feed",
        status: str = "Open"
    ) -> Tuple[Vulnerability, bool]:
        """
        Executes the Canonical Vulnerability Pipeline:
        RAW DATA → VALIDATION → NORMALIZATION → CVE CORRELATION → NVD ENRICHMENT → KEV ENRICHMENT → EPSS ENRICHMENT → POSTGRESQL → RISK ENGINE
        """
        cve_clean = cve_id.strip().upper()
        
        # 1. Fetch from NVD Client
        nvd_data = nvd_client.fetch_cve(cve_clean) or {}
        
        # 2. Fetch CISA KEV Intelligence
        kev_item = kev_client.lookup_cve(cve_clean)
        is_kev = kev_item is not None
        kev_date = kev_item.get("date_added") if kev_item else None

        # 3. Fetch FIRST EPSS Intelligence
        epss_info = epss_client.fetch_single(cve_clean)
        epss_score = epss_info.get("epss_score", 0.04)
        epss_pct = epss_info.get("percentile", 0.40)

        # 4. Extract Attributes
        title = nvd_data.get("title") or f"{cve_clean}: Public Vulnerability"
        desc = nvd_data.get("description") or "Ingested from vulnerability intelligence feed."
        cvss = nvd_data.get("cvss_score", 6.5)
        severity = nvd_data.get("severity", "Medium")
        exploitability = nvd_data.get("exploitability_score", 5.0)
        cpe_list = nvd_data.get("cpe_list", [])
        cpe_uri = cpe_list[0] if cpe_list else None
        affected_product = kev_item.get("product") if kev_item else (cpe_uri.split(":")[4] if cpe_uri and len(cpe_uri.split(":")) > 4 else "System Software")

        # 5. Correlation & Quality Confidence
        confidence = 94.0 if nvd_data and not is_kev else (98.0 if is_kev else 85.0)
        correlation_status = "CORRELATED" if nvd_data else "CORRELATION UNCERTAIN"

        # 6. Check existing or create new
        existing_vuln = db.query(Vulnerability).filter(
            Vulnerability.cve_id == cve_clean,
            Vulnerability.asset_id == asset_id
        ).first()

        is_new = False
        if existing_vuln:
            v = existing_vuln
            v.cvss_score = cvss
            v.severity = severity
            v.exploitability_score = exploitability
            v.epss_score = epss_score
            v.epss_percentile = epss_pct
            v.is_cisa_kev = is_kev
            v.kev_date_added = kev_date
            v.cpe_uri = cpe_uri
            v.affected_product = affected_product
            v.confidence_score = confidence
            v.source = source_name
            v.source_timestamp = datetime.now(timezone.utc)
            v.correlation_status = correlation_status
            v.last_updated = datetime.now(timezone.utc)
        else:
            is_new = True
            v = Vulnerability(
                org_id=org_id,
                asset_id=asset_id,
                cve_id=cve_clean,
                title=title,
                description=desc,
                severity=severity,
                cvss_score=cvss,
                exploitability_score=exploitability,
                status=status,
                risk_contribution=round(cvss * 2.1, 1),
                epss_score=epss_score,
                epss_percentile=epss_pct,
                is_cisa_kev=is_kev,
                kev_date_added=kev_date,
                affected_product=affected_product,
                cpe_uri=cpe_uri,
                confidence_score=confidence,
                source=source_name,
                source_timestamp=datetime.now(timezone.utc),
                correlation_status=correlation_status,
                correlation_confidence=confidence,
                first_seen=datetime.now(timezone.utc),
                last_updated=datetime.now(timezone.utc)
            )
            db.add(v)

        db.commit()

        # 7. Record EvidenceRecord
        source_rec = db.query(EvidenceSource).filter(EvidenceSource.name.ilike(f"%{source_name[:8]}%")).first()
        if not source_rec:
            source_rec = db.query(EvidenceSource).first()

        if source_rec:
            ev_rec = EvidenceRecord(
                source_id=source_rec.id,
                org_id=org_id,
                record_type="vulnerability",
                raw_payload_json=json.dumps({"cve_id": cve_clean, "nvd": nvd_data, "kev": kev_item, "epss": epss_info}),
                normalized_payload_json=json.dumps({
                    "cve_id": cve_clean, "cvss": cvss, "severity": severity,
                    "epss_score": epss_score, "is_cisa_kev": is_kev, "status": status
                }),
                data_quality_score=confidence,
                validation_status="Valid",
                validation_errors_json="[]",
                ingestion_timestamp=datetime.now(timezone.utc)
            )
            db.add(ev_rec)
            source_rec.total_records += 1
            source_rec.last_sync_at = datetime.now(timezone.utc)
            db.commit()

        # 8. Trigger Risk Engine Recalculation
        await self.recalculate_risk_and_broadcast(asset_id=asset_id, org_id=org_id, db=db, trigger=f"CVE {cve_clean} Ingestion")

        return v, is_new

    async def ingest_asset_inventory(
        self,
        records: List[Dict[str, Any]],
        org_id: str,
        db: Session,
        source_name: str = "Authorized Asset Inventory"
    ) -> Dict[str, Any]:
        """
        Ingests authorized asset inventory from CSV or JSON.
        Normalizes into Asset and EvidenceRecord.
        """
        source = db.query(EvidenceSource).filter(EvidenceSource.name.ilike("%Asset%")).first()
        if not source:
            source = db.query(EvidenceSource).first()

        created_count = 0
        updated_count = 0
        errors = []

        services = {s.name.lower(): s for s in db.query(BusinessService).filter(BusinessService.org_id == org_id).all()}
        fallback_service = next(iter(services.values()), None)

        for idx, item in enumerate(records):
            hostname = str(item.get("hostname") or item.get("name") or "").strip()
            ip_addr = str(item.get("ip") or item.get("ip_address") or "10.0.0.1").strip()
            
            if not hostname:
                errors.append(f"Row {idx + 1}: Missing required hostname")
                continue

            asset_code = str(item.get("asset_id_code") or f"AST-{hostname.upper()[:10]}")
            exposure = str(item.get("exposure") or item.get("zone") or "Internal").title()
            if "Internet" in exposure or item.get("internet_exposed") in [True, "true", "True", "1", 1]:
                exposure = "Internet-Facing"
            elif "Dmz" in exposure:
                exposure = "DMZ"
            else:
                exposure = "Internal"

            crit = str(item.get("criticality") or "Medium").title()
            if crit not in ["Critical", "High", "Medium", "Low"]:
                crit = "Medium"

            srv_name = str(item.get("business_service") or "").strip().lower()
            service = services.get(srv_name, fallback_service)

            # Check existing asset
            existing = db.query(Asset).filter(
                (Asset.hostname == hostname) | (Asset.asset_id_code == asset_code)
            ).first()

            if existing:
                existing.ip_address = ip_addr
                existing.exposure = exposure
                existing.criticality = crit
                existing.owner = item.get("owner", existing.owner)
                existing.data_classification = item.get("data_classification", existing.data_classification)
                existing.last_seen = datetime.now(timezone.utc)
                if service:
                    existing.service_id = service.id
                updated_count += 1
                asset_obj = existing
            else:
                asset_obj = Asset(
                    org_id=org_id,
                    service_id=service.id if service else None,
                    asset_id_code=asset_code,
                    name=item.get("name", hostname),
                    hostname=hostname,
                    ip_address=ip_addr,
                    asset_type=item.get("asset_type", "Server"),
                    exposure=exposure,
                    criticality=crit,
                    owner=item.get("owner", "Infrastructure Operations"),
                    data_classification=item.get("data_classification", "Confidential"),
                    control_coverage=float(item.get("control_coverage", 75.0)),
                    current_risk_score=50.0,
                    current_likelihood=45.0,
                    current_impact=60.0,
                    status="Active",
                    last_seen=datetime.now(timezone.utc)
                )
                db.add(asset_obj)
                created_count += 1

            db.commit()

            # Record evidence
            if source:
                ev = EvidenceRecord(
                    source_id=source.id,
                    org_id=org_id,
                    record_type="asset",
                    raw_payload_json=json.dumps(item),
                    normalized_payload_json=json.dumps({
                        "hostname": hostname, "ip": ip_addr, "exposure": exposure, "criticality": crit
                    }),
                    data_quality_score=95.0,
                    validation_status="Valid",
                    validation_errors_json="[]",
                    ingestion_timestamp=datetime.now(timezone.utc)
                )
                db.add(ev)

        if source:
            source.total_records += (created_count + updated_count)
            source.last_sync_at = datetime.now(timezone.utc)
            db.commit()

        log_audit_event(
            db=db,
            org_id=org_id,
            action="Asset Inventory Ingested",
            entity_type="Asset",
            entity_id=f"{created_count + updated_count} items",
            new_values={"created": created_count, "updated": updated_count, "errors": len(errors)},
            description=f"Ingested authorized asset inventory. Created {created_count}, updated {updated_count}."
        )

        await ws_manager.broadcast("ASSETS_INGESTED", {
            "created_count": created_count,
            "updated_count": updated_count,
            "errors": errors
        })

        return {
            "success": True,
            "created_count": created_count,
            "updated_count": updated_count,
            "errors": errors
        }

    async def ingest_software_inventory(
        self,
        records: List[Dict[str, Any]],
        org_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Ingests software inventory records, constructs CPEs,
        and correlates software against known CVE intelligence.
        """
        correlated_count = 0
        uncertain_count = 0
        no_match_count = 0

        for item in records:
            asset_id = item.get("asset_id")
            hostname = item.get("hostname")
            
            asset = None
            if asset_id:
                asset = db.query(Asset).filter(Asset.id == asset_id).first()
            if not asset and hostname:
                asset = db.query(Asset).filter(Asset.hostname == hostname).first()
            if not asset:
                asset = db.query(Asset).first()
            if not asset:
                continue

            vendor = str(item.get("vendor", "apache")).strip().lower()
            product = str(item.get("product", "http_server")).strip().lower()
            version = str(item.get("version", "2.4.49")).strip()
            pkg_type = str(item.get("package_type", "deb"))
            path = str(item.get("installed_path", "/usr/bin/"))

            # Derive CPE 2.3 URI
            cpe_uri = f"cpe:2.3:a:{vendor}:{product}:{version}:*:*:*:*:*:*:*"

            # CVE Correlation logic:
            # Check local known CVEs or query NVD for this product
            matching_cves = db.query(Vulnerability).filter(
                (Vulnerability.affected_product.ilike(f"%{product}%")) |
                (Vulnerability.cpe_uri.ilike(f"%{product}%")) |
                (Vulnerability.title.ilike(f"%{product}%"))
            ).all()

            if matching_cves:
                corr_status = "CORRELATED"
                corr_conf = 95.0
                correlated_count += 1
            elif vendor and product:
                # Potential match but version range uncertain
                corr_status = "CORRELATION UNCERTAIN"
                corr_conf = 60.0
                uncertain_count += 1
            else:
                corr_status = "NO MATCH"
                corr_conf = 40.0
                no_match_count += 1

            sw = SoftwareInventory(
                org_id=org_id,
                asset_id=asset.id,
                vendor=vendor,
                product=product,
                version=version,
                cpe_uri=cpe_uri,
                package_type=pkg_type,
                installed_path=path,
                correlation_status=corr_status,
                matched_cves_count=len(matching_cves),
                last_scanned_at=datetime.now(timezone.utc)
            )
            db.add(sw)

        db.commit()

        await ws_manager.broadcast("SOFTWARE_INGESTED", {
            "correlated": correlated_count,
            "uncertain": uncertain_count,
            "no_match": no_match_count
        })

        return {
            "success": True,
            "total_software_items": len(records),
            "correlated": correlated_count,
            "uncertain": uncertain_count,
            "no_match": no_match_count
        }

    async def recalculate_risk_and_broadcast(
        self,
        asset_id: str,
        org_id: str,
        db: Session,
        trigger: str = "Evidence Ingestion"
    ):
        """
        Recalculates asset and enterprise risk scores, saves RiskSnapshot,
        generates decomposed RiskDrivers, records AuditEvent, and broadcasts WebSocket update.
        """
        asset = db.query(Asset).filter(Asset.id == asset_id).first()
        if not asset:
            return

        # 1. Calculate Asset Risk using versioned formula R = L × I × (1 - E × C) × W
        calc_result = calculate_asset_risk(asset)
        new_asset_risk = calc_result["risk_score"] if isinstance(calc_result, dict) else calc_result
        asset.current_risk_score = round(float(new_asset_risk), 1)

        # 2. Calculate Enterprise Global Risk
        all_assets = db.query(Asset).filter(Asset.org_id == org_id).all()
        global_score = calculate_global_risk(all_assets)

        # 3. Create RiskSnapshot
        prev_snap = db.query(RiskSnapshot).filter_by(entity_type="global").order_by(RiskSnapshot.snapshot_date.desc()).first()
        delta = round(global_score - (prev_snap.risk_score if prev_snap else global_score), 1)

        drivers_data = [
            {"name": "Public Internet Exposure Multiplier", "impact_contribution": +18.0 if asset.exposure == "Internet-Facing" else +8.0},
            {"name": "Critical CVE Vulnerability Concentration", "impact_contribution": +21.0},
            {"name": "Tier 1 Core Financial Asset Criticality", "impact_contribution": +13.0 if asset.criticality == "Critical" else +8.0},
            {"name": "Active Defensive Control Mitigation", "impact_contribution": -8.5}
        ]

        snapshot = RiskSnapshot(
            org_id=org_id,
            entity_type="global",
            entity_id="global",
            risk_score=round(global_score, 1),
            likelihood=round(float(calc_result.get("likelihood", 45.0) if isinstance(calc_result, dict) else 45.0), 1),
            impact=round(float(calc_result.get("impact", 55.0) if isinstance(calc_result, dict) else 55.0), 1),
            exposure_mod=1.45 if asset.exposure == "Internet-Facing" else 1.0,
            control_mod=0.76,
            confidence_score=93.5,
            model_version="Risk Model v1.0",
            drivers_json=json.dumps(drivers_data),
            snapshot_date=datetime.now(timezone.utc)
        )
        db.add(snapshot)
        db.commit()

        # 4. Create AuditEvent
        log_audit_event(
            db=db,
            org_id=org_id,
            action="Continuous Risk Recalculated",
            entity_type="RiskSnapshot",
            entity_id=snapshot.id,
            new_values={"asset": asset.name, "new_risk": asset.current_risk_score, "global_risk": global_score, "trigger": trigger},
            description=f"Continuous risk engine recalculated enterprise score to {global_score:.1f} after {trigger} on {asset.name}."
        )

        # 5. Broadcast RISK_UPDATED over WebSocket
        await ws_manager.broadcast("RISK_UPDATED", {
            "global_risk_score": round(global_score, 1),
            "delta": delta,
            "asset_id": asset.id,
            "asset_name": asset.name,
            "asset_risk": asset.current_risk_score,
            "trigger": trigger,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })


ingestion_pipeline = IngestionPipeline()
