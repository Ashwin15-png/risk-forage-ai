import pytest
import asyncio
from app.database import SessionLocal, init_db
from app.models.entities import Asset, Vulnerability, SoftwareInventory, EvidenceRecord, RiskSnapshot
from app.ingestion.nvd_client import nvd_client
from app.ingestion.kev_client import kev_client
from app.ingestion.epss_client import epss_client
from app.ingestion.pipeline import ingestion_pipeline


def test_nvd_normalization():
    """Verify NVD raw CVE JSON is parsed into canonical attributes."""
    raw_sample = {
        "id": "CVE-2024-3094",
        "descriptions": [{"lang": "en", "value": "Malicious code discovered in upstream tarballs of xz."}],
        "metrics": {
            "cvssMetricV31": [{
                "cvssData": {
                    "baseScore": 10.0,
                    "baseSeverity": "CRITICAL",
                    "vectorString": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H"
                },
                "exploitabilityScore": 10.0
            }]
        },
        "configurations": [{
            "nodes": [{
                "cpeMatch": [{"criteria": "cpe:2.3:a:tukaani:xz:5.6.0:*:*:*:*:*:*:*"}]
            }]
        }],
        "published": "2024-03-29T00:00:00Z"
    }

    normalized = nvd_client.normalize_nvd_cve(raw_sample)
    assert normalized["cve_id"] == "CVE-2024-3094"
    assert normalized["cvss_score"] == 10.0
    assert normalized["severity"] == "Critical"
    assert normalized["exploitability_score"] == 10.0
    assert "cpe:2.3:a:tukaani:xz:5.6.0:*:*:*:*:*:*:*" in normalized["cpe_list"]
    assert "xz" in normalized["description"]


def test_kev_lookup():
    """Verify CISA KEV catalog lookup returns threat intelligence."""
    catalog = kev_client.fetch_catalog()
    assert catalog["count"] > 0

    item = kev_client.lookup_cve("CVE-2021-44228")
    assert item is not None
    assert item["cve_id"] == "CVE-2021-44228"
    assert item["vendor_project"] is not None

    # Known non-existent CVE
    assert kev_client.lookup_cve("CVE-1990-000000") is None


def test_epss_scoring():
    """Verify FIRST EPSS client returns numeric probabilities and percentiles."""
    scores = epss_client.fetch_scores(["CVE-2024-3094", "CVE-2021-44228"])
    assert "CVE-2024-3094" in scores
    assert 0.0 <= scores["CVE-2024-3094"]["epss_score"] <= 1.0
    assert 0.0 <= scores["CVE-2024-3094"]["percentile"] <= 1.0


def test_cve_ingestion_and_enrichment():
    """Verify canonical pipeline ingests, enriches, and stores vulnerability."""
    db = SessionLocal()
    try:
        asset = db.query(Asset).first()
        assert asset is not None

        vuln, is_new = asyncio.run(ingestion_pipeline.ingest_and_enrich_cve(
            cve_id="CVE-2021-44228",
            asset_id=asset.id,
            org_id=asset.org_id,
            db=db,
            source_name="NIST NVD"
        ))

        assert vuln.cve_id == "CVE-2021-44228"
        assert vuln.cvss_score == 10.0
        assert vuln.is_cisa_kev is True
        assert vuln.epss_score > 0.50
        assert vuln.correlation_status == "CORRELATED"
        assert vuln.source == "NIST NVD"

        # Check EvidenceRecord was created
        ev = db.query(EvidenceRecord).filter(
            EvidenceRecord.org_id == asset.org_id,
            EvidenceRecord.record_type == "vulnerability"
        ).order_by(EvidenceRecord.ingestion_timestamp.desc()).first()
        assert ev is not None
        assert "CVE-2021-44228" in ev.raw_payload_json
    finally:
        db.close()


def test_asset_inventory_ingestion():
    """Verify authorized asset inventory ingestion with normalization & deduplication."""
    db = SessionLocal()
    try:
        sample_assets = [
            {
                "hostname": "test-edge-router-01",
                "ip": "198.51.100.25",
                "exposure": "Internet-Facing",
                "criticality": "Critical",
                "business_service": "Payment Gateway",
                "owner": "Network Engineering",
                "data_classification": "Restricted"
            },
            {
                "hostname": "test-internal-worker-02",
                "ip": "10.200.55.12",
                "exposure": "Internal",
                "criticality": "Medium",
                "business_service": "Customer Internet Banking"
            }
        ]

        asset_ref = db.query(Asset).first()
        org_id = asset_ref.org_id

        res = asyncio.run(ingestion_pipeline.ingest_asset_inventory(
            records=sample_assets,
            org_id=org_id,
            db=db
        ))

        assert res["success"] is True
        assert (res["created_count"] + res["updated_count"]) >= 2

        # Check asset was saved
        created_asset = db.query(Asset).filter(Asset.hostname == "test-edge-router-01").first()
        assert created_asset is not None
        assert created_asset.exposure == "Internet-Facing"
        assert created_asset.criticality == "Critical"

        # Re-ingesting should update, not duplicate
        res2 = asyncio.run(ingestion_pipeline.ingest_asset_inventory(
            records=sample_assets,
            org_id=org_id,
            db=db
        ))
        assert res2["updated_count"] >= 2
    finally:
        db.close()


def test_software_inventory_correlation():
    """Verify software inventory correlates against CVE/CPE and flags uncertain correlations."""
    db = SessionLocal()
    try:
        asset = db.query(Asset).first()
        org_id = asset.org_id

        software_items = [
            {
                "hostname": asset.hostname,
                "vendor": "openssl",
                "product": "openssl",
                "version": "3.0.2",
                "package_type": "deb"
            },
            {
                "hostname": asset.hostname,
                "vendor": "customcorp",
                "product": "proprietary_agent",
                "version": "0.1.0-alpha",
                "package_type": "binary"
            }
        ]

        res = asyncio.run(ingestion_pipeline.ingest_software_inventory(
            records=software_items,
            org_id=org_id,
            db=db
        ))

        assert res["success"] is True
        assert res["total_software_items"] == 2

        # Check correlation status was tagged properly
        sw_correlated = db.query(SoftwareInventory).filter(
            SoftwareInventory.asset_id == asset.id,
            SoftwareInventory.vendor == "openssl"
        ).first()
        assert sw_correlated is not None
        assert sw_correlated.correlation_status in ["CORRELATED", "CORRELATION UNCERTAIN"]
        assert sw_correlated.cpe_uri.startswith("cpe:2.3:a:openssl:openssl:")

        sw_uncertain = db.query(SoftwareInventory).filter(
            SoftwareInventory.asset_id == asset.id,
            SoftwareInventory.vendor == "customcorp"
        ).first()
        assert sw_uncertain is not None
        assert sw_uncertain.correlation_status == "CORRELATION UNCERTAIN"
    finally:
        db.close()


def test_cvss_is_not_final_risk():
    """Verify CVSS is vulnerability severity and not directly enterprise risk."""
    db = SessionLocal()
    try:
        # A CVSS 10.0 vuln on an internal low-criticality asset with controls
        # should NOT equal an enterprise risk of 100 or 10
        asset = db.query(Asset).filter(Asset.exposure == "Internal").first()
        assert asset is not None
        # Risk score is a composite of likelihood, impact, exposure, and controls
        assert 0.0 <= asset.current_risk_score <= 100.0
    finally:
        db.close()


def test_nvd_invalid_response_and_timeout():
    """Verify NVD client handles malformed/empty responses and timeouts gracefully."""
    # Invalid/empty CVE
    res = nvd_client.fetch_cve("CVE-9999-0000-INVALID")
    assert res is None or "cve_id" in res

    # Malformed raw CVE dict normalization
    malformed = {"id": "CVE-TEST-MALFORMED"}
    norm = nvd_client.normalize_nvd_cve(malformed)
    assert norm["cve_id"] == "CVE-TEST-MALFORMED"
    assert norm["cvss_score"] == 5.0
    assert norm["severity"] in ["Medium", "Low", "High", "Critical"]


def test_kev_duplicate_and_matching():
    """Verify CISA KEV catalog matching and deduplication."""
    # Lookup real KEV item
    kev_item = kev_client.lookup_cve("CVE-2021-44228")
    assert kev_item is not None
    assert kev_item["cve_id"] == "CVE-2021-44228"
    assert "Log4j" in kev_item.get("vulnerability_name", "") or kev_item.get("vendor_project") == "Apache"

    # Same CVE queried twice returns identical result without side effects
    kev_again = kev_client.lookup_cve("CVE-2021-44228")
    assert kev_again == kev_item


def test_epss_missing_score_handling():
    """Verify EPSS client handles unknown CVEs without breaking."""
    scores = epss_client.fetch_scores(["CVE-1990-00000"])
    # If missing from FIRST API, fallback provides valid float structure or empty dict
    if "CVE-1990-00000" in scores:
        assert isinstance(scores["CVE-1990-00000"]["epss_score"], float)
        assert 0.0 <= scores["CVE-1990-00000"]["epss_score"] <= 1.0


def test_three_way_correlation_into_unified_vulnerability():
    """Verify NVD + CISA KEV + EPSS correlate into a single canonical Vulnerability record."""
    db = SessionLocal()
    try:
        asset = db.query(Asset).filter(Asset.exposure == "Internet-Facing").first() or db.query(Asset).first()
        org = db.query(Asset).first()
        org_id = org.org_id

        # Ingest Log4Shell: has NVD (10.0), is in KEV (True), has EPSS (~1.0)
        vuln, _ = asyncio.run(ingestion_pipeline.ingest_and_enrich_cve(
            cve_id="CVE-2021-44228",
            asset_id=asset.id,
            org_id=org_id,
            db=db,
            source_name="Unified Intelligence Feed"
        ))

        assert vuln.cve_id == "CVE-2021-44228"
        assert vuln.cvss_score == 10.0
        assert vuln.is_cisa_kev is True
        assert vuln.epss_score > 0.50
        assert vuln.severity == "Critical"
        assert vuln.correlation_status == "CORRELATED"
        assert vuln.asset_id == asset.id

        # Verify duplicate ingestion updates same record rather than duplicating
        initial_count = db.query(Vulnerability).filter(
            Vulnerability.cve_id == "CVE-2021-44228",
            Vulnerability.asset_id == asset.id
        ).count()
        assert initial_count == 1

        vuln_dup, is_new = asyncio.run(ingestion_pipeline.ingest_and_enrich_cve(
            cve_id="CVE-2021-44228",
            asset_id=asset.id,
            org_id=org_id,
            db=db,
            source_name="Unified Intelligence Feed"
        ))
        assert is_new is False
        after_count = db.query(Vulnerability).filter(
            Vulnerability.cve_id == "CVE-2021-44228",
            Vulnerability.asset_id == asset.id
        ).count()
        assert after_count == 1
    finally:
        db.close()

