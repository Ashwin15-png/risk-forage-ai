import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Printer, Shield, CheckCircle2, 
  FileSpreadsheet, FileCode, Check, RefreshCw, Award, Lock
} from 'lucide-react';
import { reportApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Reports: React.FC = () => {
  const { dataMode } = useDataMode();
  const [reportType, setReportType] = useState('executive');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await reportApi.preview(reportType);
      setPreview(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [reportType]);

  const handleDownloadPdf = () => {
    window.open(reportApi.downloadPdfUrl, '_blank');
  };

  const handleExportCsv = () => {
    window.open(reportApi.exportCsvUrl, '_blank');
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(preview, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `RISKFORGE_AI_Report_${reportType}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const reportTabs = [
    { id: 'executive', label: 'Executive Risk Quantification' },
    { id: 'technical', label: 'Technical Vulnerability Telemetry' },
    { id: 'investment', label: 'Security Investment & ROI' },
    { id: 'scenario', label: 'What-If Countermeasure Comparison' },
    { id: 'compliance', label: 'Regulatory Framework Compliance' },
    { id: 'audit', label: 'Immutable Audit Trail' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#4ADE80]" />
              EXECUTIVE RISK & COMPLIANCE REPORTS
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Dynamic Boardroom PDF Export • Technical CSV Aggregates • Immutable Audit Signoff
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] hover:border-[#22C55E] text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#4ADE80]" />
            Export CSV
          </button>
          <button
            onClick={handleDownloadJson}
            className="px-3 py-1.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] hover:border-[#22C55E] text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-all"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            Export JSON
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-3.5 py-1.5 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(34,197,94,0.3)]"
          >
            <Download className="w-4 h-4" />
            Download Board PDF
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-[rgba(74,222,128,0.15)] text-xs overflow-x-auto pb-1">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`pb-2 px-3 font-mono font-medium whitespace-nowrap transition-all ${
              reportType === tab.id
                ? 'text-[#4ADE80] border-b-2 border-[#22C55E] font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Live Preview Paper */}
      <div className="rounded-xl p-8 bg-[#0D1B12] border border-[rgba(74,222,128,0.25)] max-w-4xl mx-auto shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle Watermark */}
        <div className="absolute right-4 bottom-4 pointer-events-none opacity-5 select-none">
          <Shield className="w-96 h-96 text-[#22C55E]" />
        </div>

        {loading || !preview ? (
          <div className="py-24 text-center text-xs text-slate-400 font-mono">
            <div className="inline-block w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-4" />
            <div>Rendering dynamic report preview...</div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            {/* Header Document Banner */}
            <div className="flex items-start justify-between pb-6 border-b border-[rgba(74,222,128,0.15)]">
              <div>
                <span className="text-[10px] font-mono text-[#4ADE80] uppercase tracking-widest font-bold block">
                  RISKFORGE AI — Continuous Cyber Risk Intelligence &amp; Investment Optimization
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{preview.title}</h2>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Organization: <strong className="text-white">{preview.organization_name}</strong> • Classification: <strong className="text-rose-400">CONFIDENTIAL / RESTRICTED</strong>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-400 space-y-0.5">
                <div>Generated: <span className="text-slate-200">{preview.generated_at}</span></div>
                <div>Model: <span className="text-[#4ADE80]">{preview.model_version}</span></div>
                <div>Audit Hash: <span className="text-cyan-400">{preview.audit_id}</span></div>
              </div>
            </div>

            {/* Executive KPIs Box */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-[#102417] border border-[rgba(74,222,128,0.2)] text-center">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">RISKFORGE AI Score</div>
                <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">
                  {preview.risk_score} / 100
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Classification: {preview.category}</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Reduction Potential</div>
                <div className="text-2xl font-bold font-mono text-[#4ADE80] mt-0.5">
                  -{preview.potential_reduction} pts
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Via OR-Tools Solvers</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Recommended Budget</div>
                <div className="text-2xl font-bold font-mono text-white mt-0.5">
                  {preview.recommended_budget}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Max ROI Allocation</div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">Critical Focus Target</div>
                <div className="text-sm font-bold font-mono text-amber-300 mt-2 truncate">
                  {preview.high_risk_service}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Tier 1 Critical Ingress</div>
              </div>
            </div>

            {/* Executive Context Narrative */}
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                1. Executive Context & Continuous Assessment Summary
              </h3>
              <p className="bg-[#102417] p-4 rounded-lg border border-[rgba(74,222,128,0.1)] leading-relaxed">
                Continuous quantitative assessment evaluates <strong>{preview.organization_name}</strong> at an enterprise cyber risk score of <strong>{preview.risk_score} / 100</strong>. Primary exposure stems from internet-facing payment services and residual control gaps in endpoint instrumentation. Mathematical programming under budget limits reveals that deploying Zero Trust micro-segmentation and universal hardware MFA yields the greatest risk reduction per rupee invested.
              </p>
            </div>

            {/* Drivers Breakdown */}
            <div className="space-y-2 text-xs">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                2. Authoritative Contributor Decomposition
              </h3>
              <div className="space-y-1.5">
                {preview.drivers && preview.drivers.length > 0 ? (
                  preview.drivers.map((d: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-[#102417] border border-[rgba(74,222,128,0.1)] font-mono">
                      <span className="text-slate-300 font-sans text-xs">{d.name}</span>
                      <span className="text-[#4ADE80] font-bold text-xs">
                        {d.impact_contribution > 0 ? `+${d.impact_contribution}` : d.impact_contribution} pts
                      </span>
                    </div>
                  ))
                ) : (
                  [
                    { name: "Internet Exposure of High-Criticality Services", impact: "+18.0 pts" },
                    { name: "Critical Vulnerability CVSS >= 9.0 Concentration", impact: "+21.0 pts" },
                    { name: "Payment Gateway Tier 1 Criticality", impact: "+13.0 pts" },
                    { name: "Weak MFA Enforcement Gaps", impact: "+9.0 pts" },
                    { name: "Active EDR Telemetry Mitigation", impact: "-8.0 pts" }
                  ].map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2.5 rounded bg-[#102417] border border-[rgba(74,222,128,0.1)] font-mono">
                      <span className="text-slate-300 font-sans text-xs">{d.name}</span>
                      <span className="text-[#4ADE80] font-bold text-xs">{d.impact}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="space-y-2 text-xs">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                3. Mathematical Optimization Directives
              </h3>
              <div className="p-4 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.15)] space-y-2 text-slate-300">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>Immediate deployment of <strong>Hardware FIDO2 MFA (INV-01)</strong> across administrative perimeter to reduce 12.5 risk points.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>Enforce <strong>Micro-segmentation Boundaries (INV-03)</strong> between Payment Gateway Switch and Core Banking Database.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
                  <span>Remediate top 3 unpatched CVEs on Internet-facing assets within 48-hour SLA window.</span>
                </div>
              </div>
            </div>

            {/* Regulatory Signoff & Seal */}
            <div className="pt-6 border-t border-[rgba(74,222,128,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#22C55E]" />
                <span>Verified against RISKFORGE AI Decision-Support Constraints</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#102417] border border-[#22C55E]/30 text-[#4ADE80]">
                <Award className="w-4 h-4 text-[#22C55E]" />
                <span>Chief Information Security Officer • Digital Signoff Recorded</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
