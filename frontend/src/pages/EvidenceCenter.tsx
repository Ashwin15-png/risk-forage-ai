import React, { useState, useEffect } from 'react';
import { 
  Database, UploadCloud, RefreshCw, CheckCircle2, AlertTriangle, 
  XCircle, Clock, FileCode, Check, ArrowRight, ShieldCheck, Activity, AlertCircle 
} from 'lucide-react';
import { evidenceApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { useDataMode } from '../context/DataModeContext';

export const EvidenceCenter: React.FC = () => {
  const { refreshAll, lastUpdated, dataMode } = useDataMode();
  const [sources, setSources] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [inputFormat, setInputFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [sourceName, setSourceName] = useState('Compliance CSV Telemetry Feed');
  const [recordType, setRecordType] = useState('vulnerability');
  const [payloadText, setPayloadText] = useState(`[
  {
    "asset_id": "pay-api-gw-01",
    "cve_id": "CVE-2024-3400",
    "title": "Palo Alto Command Injection in PAN-OS",
    "cvss_score": 10.0,
    "severity": "Critical"
  }
]`);
  const [uploadStatus, setUploadStatus] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const [srcRes, recRes] = await Promise.all([
        evidenceApi.getSources(),
        evidenceApi.getRecords({ limit: 50 })
      ]);
      setSources(srcRes.data);
      setRecords(recRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, [lastUpdated]);

  const handleRefreshSource = async (id: string) => {
    try {
      await evidenceApi.refreshSource(id);
      await fetchEvidence();
      await refreshAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let parsedRecords: any[] = [];
      if (inputFormat === 'JSON') {
        parsedRecords = JSON.parse(payloadText);
      } else {
        // Simple CSV parser
        const lines = payloadText.trim().split('\n');
        const headers = lines[0].split(',').map((h) => h.trim());
        parsedRecords = lines.slice(1).map((line) => {
          const values = line.split(',').map((v) => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            const val = values[i];
            obj[h] = isNaN(Number(val)) ? val : Number(val);
          });
          return obj;
        });
      }

      const res = await evidenceApi.ingestBatch({
        source_name: sourceName,
        record_type: recordType,
        records: parsedRecords
      });
      setUploadStatus(res.data);
      await fetchEvidence();
      await refreshAll();
    } catch (err: any) {
      alert('Error validating/ingesting payload: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Database className="w-5 h-5 text-cyber-bright" />
              EVIDENCE INGESTION & DATA NORMALIZATION CENTER
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Canonical Data Transformation • Automated Validation • Evidence Freshness & Mathematical Quality Assurance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUploadOpen(!uploadOpen)}
            className="px-3.5 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)]"
          >
            <UploadCloud className="w-4 h-4" />
            Ingest Evidence Feed
          </button>
        </div>
      </div>

      {/* Section 28: DATA QUALITY DASHBOARD */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-cyber-text uppercase font-mono flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyber-bright" />
            Continuous Evidence Quality Index
          </h2>
          <span className="text-xs font-mono text-cyber-bright font-bold px-2 py-0.5 rounded bg-cyber-darker border border-cyber-border">
            Overall Score: 92%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border text-center">
            <span className="text-[10px] uppercase font-mono text-cyber-subtext block">Freshness</span>
            <span className="text-xl font-bold font-mono text-cyber-bright mt-0.5 block">94%</span>
            <span className="text-[10px] text-cyber-subtext font-mono">&lt; 24h cadence</span>
          </div>
          <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border text-center">
            <span className="text-[10px] uppercase font-mono text-cyber-subtext block">Completeness</span>
            <span className="text-xl font-bold font-mono text-cyber-bright mt-0.5 block">91%</span>
            <span className="text-[10px] text-cyber-subtext font-mono">Full metadata</span>
          </div>
          <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border text-center">
            <span className="text-[10px] uppercase font-mono text-cyber-subtext block">Consistency</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">89%</span>
            <span className="text-[10px] text-cyber-subtext font-mono">Cross-feed match</span>
          </div>
          <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border text-center">
            <span className="text-[10px] uppercase font-mono text-cyber-subtext block">Confidence</span>
            <span className="text-xl font-bold font-mono text-cyber-bright mt-0.5 block">93%</span>
            <span className="text-[10px] text-cyber-subtext font-mono">Authoritative</span>
          </div>
          <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border text-center">
            <span className="text-[10px] uppercase font-mono text-cyber-subtext block">Active Feeds</span>
            <span className="text-xl font-bold font-mono text-cyber-text mt-0.5 block">{sources.length}</span>
            <span className="text-[10px] text-cyber-subtext font-mono">Configured</span>
          </div>
        </div>

        {/* Data Quality Issues Badges Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-amber-950/60 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> 1 Stale Feed (Qualys WAS)
          </span>
          <span className="px-2.5 py-1 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> 1 Missing Feed (Vendor Portal)
          </span>
          <span className="px-2.5 py-1 rounded bg-cyber-panel text-cyber-bright border border-cyber-border flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> 6 Feeds Ingesting Continuously
          </span>
          <span className="px-2.5 py-1 rounded bg-cyber-panel text-cyber-subtext border border-cyber-border flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-cyber-muted" /> 0 Conflicting Feeds
          </span>
        </div>
      </div>

      {/* Upload Ingestion Drawer */}
      {uploadOpen && (
        <div className="cyber-card p-6 border-cyber-bright/40 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-cyber-text flex items-center gap-2 uppercase font-mono">
              <UploadCloud className="w-4 h-4 text-cyber-bright" />
              Ingest & Normalize Heterogeneous Evidence Feed
            </h2>
            <button
              onClick={() => setUploadOpen(false)}
              className="text-cyber-subtext hover:text-cyber-text text-sm font-mono"
            >
              ✕ Close
            </button>
          </div>

          <form onSubmit={handleIngest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-cyber-subtext mb-1">Target Source Feed</label>
                <select
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-subtext mb-1">Canonical Entity Type</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-3 py-1.5 text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
                >
                  <option value="vulnerability">Vulnerability (CVE)</option>
                  <option value="asset">Infrastructure Asset</option>
                  <option value="control">Defensive Security Control</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-subtext mb-1">Payload Format</label>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setInputFormat('JSON');
                      setPayloadText(`[\n  {\n    "asset_id": "pay-api-gw-01",\n    "cve_id": "CVE-2024-3400",\n    "title": "Palo Alto Command Injection in PAN-OS",\n    "cvss_score": 10.0,\n    "severity": "Critical"\n  }\n]`);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold ${
                      inputFormat === 'JSON' ? 'bg-cyber-surface text-cyber-bright border border-cyber-border' : 'bg-cyber-darker text-cyber-subtext'
                    }`}
                  >
                    JSON Array
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputFormat('CSV');
                      setPayloadText(`asset_id,cve_id,title,cvss_score,severity\npay-api-gw-01,CVE-2024-3400,Palo Alto Command Injection,10.0,Critical`);
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold ${
                      inputFormat === 'CSV' ? 'bg-cyber-surface text-cyber-bright border border-cyber-border' : 'bg-cyber-darker text-cyber-subtext'
                    }`}
                  >
                    CSV Raw Text
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-cyber-subtext mb-1">
                Raw Telemetry Payload ({inputFormat})
              </label>
              <textarea
                rows={6}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="w-full p-3 bg-cyber-darker border border-cyber-border rounded-lg text-xs font-mono text-cyber-text focus:outline-none focus:border-cyber-bright"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-cyber-subtext font-mono">
                Ingested records are validated, schema-normalized, and recalculate risk deterministically.
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {submitting ? 'Normalizing & Recalculating...' : 'Validate & Ingest Batch'}
              </button>
            </div>

            {uploadStatus && (
              <div className="p-3 rounded-lg bg-cyber-surface border border-cyber-border text-xs space-y-1 font-mono text-cyber-bright">
                <div>Batch Ingested Successfully: {uploadStatus.ingested_count} records</div>
                <div className="text-cyber-subtext text-[11px]">
                  Valid: {uploadStatus.valid_count} | Validation Warnings/Errors: {uploadStatus.errors_count}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Evidence Sources Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Configured Evidence Telemetry Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sources.map((s) => (
            <div key={s.id} className="cyber-card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between">
                  <div className="font-bold text-xs text-cyber-text">{s.name}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      s.status === 'Healthy'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : s.status === 'Stale'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <div className="text-[11px] text-cyber-subtext font-mono mt-1">{s.source_type}</div>

                <div className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-cyber-subtext">Freshness:</span>
                    <span className="text-cyber-bright font-bold">{s.freshness_score}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-cyber-subtext">Confidence:</span>
                    <span className="text-emerald-400 font-bold">{s.confidence_score}%</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-cyber-subtext">Total Telemetry:</span>
                    <span className="text-cyber-text">{s.total_records} records</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-cyber-border/40 flex items-center justify-between text-[10px] text-cyber-subtext font-mono">
                <span>Sync: {s.last_sync}</span>
                <button
                  onClick={() => handleRefreshSource(s.id)}
                  className="text-cyber-bright hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Sync
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Normalized Records Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">
              Normalized Evidence Records Log
            </h2>
            <p className="text-xs text-cyber-subtext">
              Authoritative canonical representations verified by the ingestion parser
            </p>
          </div>
          <span className="text-xs font-mono text-cyber-subtext">{records.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-cyber-darker text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
              <tr>
                <th className="py-2.5 px-3">Source Name</th>
                <th className="py-2.5 px-3">Entity Type</th>
                <th className="py-2.5 px-3">Quality Score</th>
                <th className="py-2.5 px-3">Validation Status</th>
                <th className="py-2.5 px-3">Normalized Payload Preview</th>
                <th className="py-2.5 px-3">Ingested At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-cyber-surface/60 transition-colors">
                  <td className="py-3 px-3 font-semibold text-cyber-text">{r.source_name}</td>
                  <td className="py-3 px-3 font-mono text-cyber-bright text-xs uppercase">{r.record_type}</td>
                  <td className="py-3 px-3">
                    <ConfidenceBar score={r.data_quality_score} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.validation_status === 'Valid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : r.validation_status === 'Warning'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {r.validation_status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-cyber-subtext max-w-sm truncate">
                    {JSON.stringify(r.normalized_payload || r.raw_payload)}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-cyber-subtext">{r.ingestion_timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
