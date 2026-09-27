import pytest
from app.routes.compliance import FRAMEWORKS

def test_compliance_framework_mappings():
    assert len(FRAMEWORKS) == 5
    framework_ids = [f["id"] for f in FRAMEWORKS]
    assert "iso-27001" in framework_ids
    assert "nist-csf" in framework_ids
    assert "cis-v8" in framework_ids
    assert "rbi-csf" in framework_ids
    assert "sebi-cscrf" in framework_ids

    for fw in FRAMEWORKS:
        assert len(fw["controls"]) >= 5
        for c in fw["controls"]:
            assert "mapped_control_code" in c
            assert c["mapped_control_code"].startswith("CTL-")
            assert len(c["remediation"]) > 10
