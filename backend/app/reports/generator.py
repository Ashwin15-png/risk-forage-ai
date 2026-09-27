import io
import csv
import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_executive_report_pdf(report_data: Dict[str, Any]) -> bytes:
    """
    Generates a high-quality PDF executive cybersecurity risk report using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#475569'),
        spaceAfter=15
    )
    heading2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Title Banner
    story.append(Paragraph("RISKFORGE AI — CYBER RISK INTELLIGENCE & INVESTMENT REPORT", title_style))
    org_name = report_data.get("organization_name", "Demo Financial Services Ltd.")
    gen_time = report_data.get("generated_at", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    story.append(Paragraph(f"Organization: <b>{org_name}</b> | Generated: {gen_time} | Classification: <b>CONFIDENTIAL</b>", subtitle_style))
    story.append(Spacer(1, 10))

    # Executive Summary Card Table
    risk_score = report_data.get("risk_score", 72.4)
    risk_cat = report_data.get("category", "High")
    potential_reduction = report_data.get("potential_reduction", 28.0)
    opt_budget = report_data.get("recommended_budget", "₹48,00,000")

    summary_table_data = [
        ["RISKFORGE AI Score", "Risk Severity", "Potential Reduction", "Recommended Investment"],
        [f"{risk_score} / 100", risk_cat, f"-{potential_reduction} pts", opt_budget]
    ]
    t = Table(summary_table_data, colWidths=[130, 130, 130, 140])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
    ]))
    story.append(t)
    story.append(Spacer(1, 15))

    # Executive Narrative
    story.append(Paragraph("Executive Context & Risk Analysis", heading2_style))
    narrative = report_data.get("narrative", (
        f"Continuous quantification evaluates {org_name}'s cyber posture at {risk_score}/100. "
        "Primary exposure stems from internet-facing payment services and residual control gaps in endpoint instrumentation. "
        "The algorithmic investment optimizer identifies that deploying micro-segmentation and universal MFA yields "
        "the highest risk reduction per rupee invested under existing capital budget limits."
    ))
    story.append(Paragraph(narrative, body_style))
    story.append(Spacer(1, 15))

    # Top Risk Drivers Table
    story.append(Paragraph("Authoritative Risk Contributors (Drivers)", heading2_style))
    drivers = report_data.get("drivers", [
        {"name": "Internet Exposure", "impact": "+18.0", "confidence": "94%"},
        {"name": "Critical Vulnerability CVSS >= 9.0", "impact": "+21.0", "confidence": "96%"},
        {"name": "Tier 1 Payment Service Criticality", "impact": "+13.0", "confidence": "95%"},
        {"name": "Missing Zero Trust Segmentation", "impact": "+7.5", "confidence": "90%"},
        {"name": "Active EDR Telemetry Mitigation", "impact": "-8.0", "confidence": "92%"}
    ])
    
    driver_table = [["Risk Driver", "Domain", "Score Impact", "Evidence Confidence"]]
    for d in drivers:
        driver_table.append([
            d.get("name", ""),
            d.get("driver_type", "Vulnerability / Exposure"),
            str(d.get("impact", d.get("impact_contribution", ""))),
            f"{d.get('confidence', 90)}%"
        ])
    
    dt = Table(driver_table, colWidths=[200, 140, 100, 90])
    dt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(dt)
    story.append(Spacer(1, 15))

    # Recommended Investments
    story.append(Paragraph("Optimized Security Investment Portfolio", heading2_style))
    investments = report_data.get("selected_investments", [
        {"name": "Universal Hardware MFA (FIDO2)", "cost": "₹12,00,000", "reduction": "11.5 pts"},
        {"name": "Micro-Segmentation Architecture", "cost": "₹18,00,000", "reduction": "9.5 pts"},
        {"name": "Automated Patch Pipeline & EDR", "cost": "₹18,00,000", "reduction": "7.0 pts"}
    ])
    inv_table = [["Initiative", "Estimated Cost", "Projected Risk Reduction"]]
    for inv in investments:
        inv_table.append([inv.get("name", ""), str(inv.get("cost", "")), str(inv.get("reduction", ""))])
    
    it = Table(inv_table, colWidths=[250, 140, 140])
    it.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F766E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCFBF1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(it)
    story.append(Spacer(1, 15))

    # Audit & Compliance Footnote
    story.append(Paragraph(
        f"Model: {report_data.get('model_version', 'Risk Model v1.0')} | "
        f"Alembic Schema v1.0 | Engine: Continuous Deterministic Quantifier | "
        f"Audit Hash: {report_data.get('audit_id', 'AUD-DEMO-26105')}",
        subtitle_style
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def generate_csv_export(rows: List[Dict[str, Any]], fieldnames: List[str]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue()
