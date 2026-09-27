from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.models.entities import SecurityControl, AssetControl, EvidenceRecord

router = APIRouter(prefix="/compliance", tags=["Compliance"])

# Framework Definitions & Mapping to Security Controls
FRAMEWORKS = [
    {
        "id": "iso-27001",
        "name": "ISO/IEC 27001:2022",
        "category": "International Standard",
        "description": "Information security management system (ISMS) controls across organizational, people, physical, and technological themes.",
        "controls": [
            {
                "code": "A.5.15",
                "name": "Access Control",
                "domain": "Organizational",
                "mapped_control_code": "CTL-IAM",
                "owner": "Identity & Access Team",
                "remediation": "Enforce strict RBAC with least privilege on all production resources."
            },
            {
                "code": "A.8.5",
                "name": "Secure Authentication (MFA)",
                "domain": "Technological",
                "mapped_control_code": "CTL-MFA",
                "owner": "IAM Operations",
                "remediation": "Mandate FIDO2/WebAuthn hardware MFA on all administrative interfaces."
            },
            {
                "code": "A.8.7",
                "name": "Protection Against Malware (EDR)",
                "domain": "Technological",
                "mapped_control_code": "CTL-EDR",
                "owner": "SecOps Team",
                "remediation": "Achieve 100% deployment of real-time EDR agent on virtual and physical endpoints."
            },
            {
                "code": "A.8.8",
                "name": "Management of Technical Vulnerabilities",
                "domain": "Technological",
                "mapped_control_code": "CTL-PATCH",
                "owner": "DevOps & Infrastructure",
                "remediation": "Automate patch staging and eliminate CVSS >= 7.0 vulnerabilities within 14 days."
            },
            {
                "code": "A.8.13",
                "name": "Information Backup",
                "domain": "Technological",
                "mapped_control_code": "CTL-BACKUP",
                "owner": "Infrastructure Team",
                "remediation": "Verify immutable, air-gapped backups with automated bi-weekly restoration tests."
            },
            {
                "code": "A.8.16",
                "name": "Monitoring Activities (SIEM/SOC)",
                "domain": "Technological",
                "mapped_control_code": "CTL-SIEM",
                "owner": "SOC Team",
                "remediation": "Ingest all perimeter firewall, auth, and database logs with automated alerting."
            },
            {
                "code": "A.8.20",
                "name": "Network Security & Segmentation",
                "domain": "Technological",
                "mapped_control_code": "CTL-NET-SEG",
                "owner": "Network Engineering",
                "remediation": "Isolate PCI/Payment Gateway VLANs with strict micro-segmentation rules."
            },
            {
                "code": "A.8.24",
                "name": "Use of Cryptography & TLS",
                "domain": "Technological",
                "mapped_control_code": "CTL-ENCRYPT",
                "owner": "Security Architecture",
                "remediation": "Enforce TLS 1.3 on all internal and external communication channels."
            }
        ]
    },
    {
        "id": "nist-csf",
        "name": "NIST Cybersecurity Framework 2.0",
        "category": "Federal / Enterprise Standard",
        "description": "Core functions covering Govern, Identify, Protect, Detect, Respond, and Recover.",
        "controls": [
            {
                "code": "PR.AA-01",
                "name": "Identities & Credentials Authenticated",
                "domain": "Protect",
                "mapped_control_code": "CTL-MFA",
                "owner": "IAM Operations",
                "remediation": "Expand MFA to legacy internal services and jump hosts."
            },
            {
                "code": "PR.DS-01",
                "name": "Data-at-Rest & In-Transit Protected",
                "domain": "Protect",
                "mapped_control_code": "CTL-ENCRYPT",
                "owner": "Security Architecture",
                "remediation": "Rotate customer data encryption keys annually with HSM protection."
            },
            {
                "code": "PR.PS-01",
                "name": "Configuration & Patch Management",
                "domain": "Protect",
                "mapped_control_code": "CTL-PATCH",
                "owner": "IT Operations",
                "remediation": "Implement automated zero-touch patching for critical server images."
            },
            {
                "code": "PR.IR-01",
                "name": "Network Segmentation & Boundary Defense",
                "domain": "Protect",
                "mapped_control_code": "CTL-NET-SEG",
                "owner": "Network Engineering",
                "remediation": "Implement zero-trust network access (ZTNA) policy for cloud services."
            },
            {
                "code": "DE.CM-01",
                "name": "Network & Endpoint Monitoring",
                "domain": "Detect",
                "mapped_control_code": "CTL-SIEM",
                "owner": "SOC Team",
                "remediation": "Deploy machine learning behavioral anomaly detection on authentication traffic."
            },
            {
                "code": "RC.RP-01",
                "name": "Recovery Plan Execution & Backups",
                "domain": "Recover",
                "mapped_control_code": "CTL-BACKUP",
                "owner": "Disaster Recovery",
                "remediation": "Conduct tabletop cyber incident recovery exercises quarterly."
            }
        ]
    },
    {
        "id": "cis-v8",
        "name": "CIS Controls v8",
        "category": "Technical Benchmark",
        "description": "Prioritized set of actions that mitigate the most pervasive cyber attacks.",
        "controls": [
            {
                "code": "CIS-06",
                "name": "Access Control Management",
                "domain": "Identity",
                "mapped_control_code": "CTL-MFA",
                "owner": "IAM Operations",
                "remediation": "Enforce MFA for all remote access and administrative accounts."
            },
            {
                "code": "CIS-07",
                "name": "Continuous Vulnerability Management",
                "domain": "Vulnerability",
                "mapped_control_code": "CTL-PATCH",
                "owner": "Vulnerability Management",
                "remediation": "Perform weekly automated vulnerability scans of all external IP blocks."
            },
            {
                "code": "CIS-08",
                "name": "Audit Log Management",
                "domain": "Monitoring",
                "mapped_control_code": "CTL-SIEM",
                "owner": "SOC Team",
                "remediation": "Centralize immutable audit log archive with 365-day retention policy."
            },
            {
                "code": "CIS-10",
                "name": "Malware Defenses",
                "domain": "Endpoint",
                "mapped_control_code": "CTL-EDR",
                "owner": "SecOps Team",
                "remediation": "Enable anti-tamper and behavioural blocking features in EDR policies."
            },
            {
                "code": "CIS-11",
                "name": "Data Recovery",
                "domain": "Resilience",
                "mapped_control_code": "CTL-BACKUP",
                "owner": "Infrastructure Team",
                "remediation": "Protect backup systems with separate, dedicated authentication domains."
            },
            {
                "code": "CIS-12",
                "name": "Network Infrastructure Management",
                "domain": "Network",
                "mapped_control_code": "CTL-NET-SEG",
                "owner": "Network Engineering",
                "remediation": "Enforce micro-segmentation between production and non-production environments."
            }
        ]
    },
    {
        "id": "rbi-csf",
        "name": "RBI Cyber Security Framework",
        "category": "Banking / Financial Regulatory",
        "description": "Reserve Bank of India guidelines for baseline cyber security and resilience for scheduled commercial banks and financial entities.",
        "controls": [
            {
                "code": "RBI-BC-01",
                "name": "Multi-Factor Authentication for Critical Systems",
                "domain": "Access Security",
                "mapped_control_code": "CTL-MFA",
                "owner": "CISO / IAM",
                "remediation": "Strict hardware token MFA for Core Banking, SWIFT, and Payment Switch access."
            },
            {
                "code": "RBI-BC-02",
                "name": "Network Segmentation & DMZ Architecture",
                "domain": "Network Security",
                "mapped_control_code": "CTL-NET-SEG",
                "owner": "Network Engineering",
                "remediation": "Strict separation between Internet banking, Core Banking, and corporate LAN."
            },
            {
                "code": "RBI-BC-03",
                "name": "Continuous Security Operations & Threat Hunting",
                "domain": "SOC / Threat Monitoring",
                "mapped_control_code": "CTL-SIEM",
                "owner": "Cyber SOC Lead",
                "remediation": "24x7 real-time monitoring and integration with Indian CERT-In advisories."
            },
            {
                "code": "RBI-BC-04",
                "name": "Anti-Ransomware & Disaster Recovery Backups",
                "domain": "Operational Resilience",
                "mapped_control_code": "CTL-BACKUP",
                "owner": "Resilience Office",
                "remediation": "Air-gapped WORM backups to safeguard transactional ledgers from ransomware."
            },
            {
                "code": "RBI-BC-05",
                "name": "Patch & Vulnerability Remediation SLAs",
                "domain": "Vulnerability Mgmt",
                "mapped_control_code": "CTL-PATCH",
                "owner": "IT Operations",
                "remediation": "Mandatory 48-hour patch window for zero-day/exploited vulnerabilities on banking interfaces."
            }
        ]
    },
    {
        "id": "sebi-cscrf",
        "name": "SEBI Cybersecurity & Resilience Framework (CSCRF)",
        "category": "Capital Markets Regulatory",
        "description": "Securities and Exchange Board of India comprehensive cybersecurity framework for market infrastructure institutions and intermediaries.",
        "controls": [
            {
                "code": "SEBI-SEC-01",
                "name": "Zero Trust Architecture & MFA",
                "domain": "Access & Governance",
                "mapped_control_code": "CTL-MFA",
                "owner": "Information Security",
                "remediation": "Enforce biometric or hardware token authentication for trading and depository APIs."
            },
            {
                "code": "SEBI-SEC-02",
                "name": "High Availability & Rapid RTO/RPO Recovery",
                "domain": "Business Continuity",
                "mapped_control_code": "CTL-BACKUP",
                "owner": "Disaster Recovery",
                "remediation": "Ensure RTO < 4 hours and RPO < 15 minutes for market-critical order matching systems."
            },
            {
                "code": "SEBI-SEC-03",
                "name": "Advanced Threat Protection & EDR",
                "domain": "Endpoint & Server",
                "mapped_control_code": "CTL-EDR",
                "owner": "SOC Operations",
                "remediation": "Behavioral threat prevention across all brokerage order routing nodes."
            },
            {
                "code": "SEBI-SEC-04",
                "name": "Network Zoning & Boundary Defense",
                "domain": "Perimeter Security",
                "mapped_control_code": "CTL-NET-SEG",
                "owner": "Infrastructure",
                "remediation": "Micro-segment trading engine networks from corporate analytics networks."
            },
            {
                "code": "SEBI-SEC-05",
                "name": "Security Information & Event Logging",
                "domain": "Incident Detection",
                "mapped_control_code": "CTL-SIEM",
                "owner": "CISO Office",
                "remediation": "Maintain tamper-evident audit logs with cryptographic hash verification."
            }
        ]
    }
]

@router.get("")
def get_compliance_overview(
    framework_id: Optional[str] = Query(None, description="Filter by framework ID"),
    db: Session = Depends(get_db)
):
    """
    Returns framework mappings, implementation status, and compliance scores
    benchmarked against active security controls and evidence.
    """
    # Fetch all security controls to correlate real status
    db_controls = {c.code: c for c in db.query(SecurityControl).all()}
    
    frameworks_to_process = [f for f in FRAMEWORKS if not framework_id or f["id"] == framework_id]
    
    total_requirements = 0
    compliant_requirements = 0
    partial_requirements = 0
    non_compliant_requirements = 0
    
    framework_summaries = []
    
    for fw in frameworks_to_process:
        fw_total = len(fw["controls"])
        fw_compliant = 0
        fw_partial = 0
        fw_non_compliant = 0
        enriched_controls = []
        
        for c_def in fw["controls"]:
            mapped_code = c_def["mapped_control_code"]
            ctrl = db_controls.get(mapped_code)
            
            coverage = ctrl.coverage_pct if ctrl else 0.0
            effectiveness = ctrl.effectiveness_pct if ctrl else 0.0
            evidence_score = ctrl.evidence_quality_score if ctrl else 0.0
            affected_count = len(ctrl.asset_mappings) if ctrl else 0
            
            # Determine implementation status
            if not ctrl or effectiveness < 50.0 or coverage < 60.0:
                status = "Non-Compliant"
                status_color = "red"
                fw_non_compliant += 1
            elif effectiveness >= 75.0 and coverage >= 80.0:
                status = "Implemented"
                status_color = "green"
                fw_compliant += 1
            else:
                status = "Partially Implemented"
                status_color = "amber"
                fw_partial += 1
                
            # Calculate residual risk rating
            risk_contribution = round(max(5.0, 100.0 - (effectiveness * 0.6 + coverage * 0.4)), 1)
            
            enriched_controls.append({
                "framework_id": fw["id"],
                "framework_name": fw["name"],
                "code": c_def["code"],
                "name": c_def["name"],
                "domain": c_def["domain"],
                "mapped_control": {
                    "id": ctrl.id if ctrl else None,
                    "code": mapped_code,
                    "name": ctrl.name if ctrl else mapped_code,
                    "coverage_pct": round(coverage, 1),
                    "effectiveness_pct": round(effectiveness, 1),
                    "evidence_quality": round(evidence_score, 1),
                    "affected_assets_count": affected_count
                },
                "status": status,
                "status_color": status_color,
                "risk_contribution": risk_contribution,
                "owner": c_def["owner"],
                "last_review": ctrl.last_validated_at.strftime("%Y-%m-%d") if (ctrl and ctrl.last_validated_at) else "2026-09-20",
                "remediation": c_def["remediation"]
            })
            
        score = round((fw_compliant * 100 + fw_partial * 50) / (fw_total * 100) * 100, 1) if fw_total > 0 else 0.0
        
        total_requirements += fw_total
        compliant_requirements += fw_compliant
        partial_requirements += fw_partial
        non_compliant_requirements += fw_non_compliant
        
        framework_summaries.append({
            "id": fw["id"],
            "name": fw["name"],
            "category": fw["category"],
            "description": fw["description"],
            "score": score,
            "total_controls": fw_total,
            "compliant_count": fw_compliant,
            "partial_count": fw_partial,
            "non_compliant_count": fw_non_compliant,
            "controls": enriched_controls
        })
        
    overall_score = round(
        (compliant_requirements * 100 + partial_requirements * 50) / (total_requirements * 100) * 100, 1
    ) if total_requirements > 0 else 0.0
    
    return {
        "overall_score": overall_score,
        "total_frameworks": len(framework_summaries),
        "total_requirements": total_requirements,
        "compliant_requirements": compliant_requirements,
        "partial_requirements": partial_requirements,
        "non_compliant_requirements": non_compliant_requirements,
        "frameworks": framework_summaries,
        "last_audit_date": "2026-09-25",
        "data_mode": "LIVE"
    }
