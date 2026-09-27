import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Shield, CheckCircle2, AlertTriangle, XCircle, 
  ExternalLink, Search, Filter, ShieldCheck, RefreshCw, ChevronRight, FileText 
} from 'lucide-react';
import { complianceApi } from '../services/api';
import { ComplianceFramework, ComplianceControl } from '../types';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';

export const Compliance: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedControl, setSelectedControl] = useState<ComplianceControl | null>(null);

  const fetchCompliance = async () => {
    try {
      setLoading(true);
      const res = await complianceApi.getOverview(selectedFramework === 'all' ? undefined : selectedFramework);
      setData(res.data);
    } catch (e) {
      console.error('Failed to fetch compliance overview', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, [selectedFramework]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-2 border-cyber-bright border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-mono text-cyber-subtext">Benchmarking Controls Against Regulatory Frameworks...</div>
      </div>
    );
  }

  const frameworks: ComplianceFramework[] = data?.frameworks || [];
  
  // Aggregate all controls across selected frameworks
  const allControls: ComplianceControl[] = frameworks.flatMap((f) => f.controls);

  // Apply search & status filter
  const filteredControls = allControls.filter((c) => {
    const matchesSearch = 
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mapped_control.code.toLowerCase().includes(search.toLowerCase()) ||
      c.owner.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text">
              REGULATORY COMPLIANCE & FRAMEWORK BENCHMARKING
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Real-time compliance posture mapped to ISO 27001, NIST CSF, CIS v8, RBI, and SEBI CSCRF.
          </p>
        </div>

        <button
          onClick={fetchCompliance}
          className="px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright hover:border-cyber-borderHover text-xs flex items-center gap-1.5 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Benchmarks
        </button>
      </div>

      {/* Framework Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {frameworks.map((fw) => {
          const isSelected = selectedFramework === fw.id;
          return (
            <div
              key={fw.id}
              onClick={() => setSelectedFramework(isSelected ? 'all' : fw.id)}
              className={`cyber-card p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-cyber-bright bg-cyber-surface shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                  : 'hover:border-cyber-borderHover'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-cyber-text truncate" title={fw.name}>
                  {fw.name.split(':')[0]}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-panel text-cyber-bright border border-cyber-border">
                  {fw.score}%
                </span>
              </div>
              <div className="w-full bg-cyber-darker rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-cyber-bright h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${fw.score}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-cyber-subtext font-mono">
                <span className="text-emerald-400 font-semibold">{fw.compliant_count} Pass</span>
                <span className="text-amber-400 font-semibold">{fw.partial_count} Partial</span>
                <span className="text-rose-400 font-semibold">{fw.non_compliant_count} Gap</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-cyber-panel border border-cyber-border">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by control code, title, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-cyber-darker border border-cyber-border text-xs text-cyber-text placeholder-cyber-subtext focus:outline-none focus:border-cyber-bright"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-cyber-subtext" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-cyber-darker border border-cyber-border text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
            >
              <option value="all">All Statuses</option>
              <option value="Implemented">Implemented</option>
              <option value="Partially Implemented">Partially Implemented</option>
              <option value="Non-Compliant">Non-Compliant</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-cyber-subtext font-mono">
          Showing <span className="text-cyber-bright font-bold">{filteredControls.length}</span> controls
        </div>
      </div>

      {/* Controls Table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-cyber-text border-collapse">
            <thead className="bg-cyber-darker/90 text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4">Framework & Code</th>
                <th className="py-3 px-4">Requirement Title</th>
                <th className="py-3 px-4">Mapped Control</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Evidence Quality</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Last Review</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {filteredControls.map((ctrl, i) => (
                <tr
                  key={`${ctrl.framework_id}-${ctrl.code}-${i}`}
                  onClick={() => setSelectedControl(ctrl)}
                  className="hover:bg-cyber-surface/60 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-cyber-bright font-mono">{ctrl.code}</div>
                    <div className="text-[10px] text-cyber-subtext truncate max-w-[140px]">
                      {ctrl.framework_name.split(':')[0]}
                    </div>
                  </td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-medium text-cyber-text">{ctrl.name}</div>
                    <div className="text-[10px] text-cyber-subtext truncate">{ctrl.domain}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border text-cyber-bright">
                      {ctrl.mapped_control.code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                        ctrl.status === 'Implemented'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ctrl.status === 'Partially Implemented'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ctrl.status === 'Implemented'
                            ? 'bg-emerald-400'
                            : ctrl.status === 'Partially Implemented'
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                      />
                      {ctrl.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <ConfidenceBar score={ctrl.mapped_control.evidence_quality} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-cyber-subtext">{ctrl.owner}</td>
                  <td className="py-3 px-4 font-mono text-[11px] text-cyber-subtext">{ctrl.last_review}</td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1 rounded hover:bg-cyber-panel text-cyber-bright">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Control Details Modal / Drawer */}
      {selectedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-cyber-panel border border-cyber-border rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyber-darker text-cyber-bright font-mono text-xs border border-cyber-border">
                  {selectedControl.code}
                </span>
                <h3 className="text-base font-semibold text-cyber-text">{selectedControl.name}</h3>
              </div>
              <button
                onClick={() => setSelectedControl(null)}
                className="text-cyber-subtext hover:text-cyber-text p-1 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <div className="text-cyber-subtext mb-1">Framework Reference</div>
                <div className="font-semibold text-cyber-text">{selectedControl.framework_name}</div>
                <div className="text-cyber-bright text-[11px] mt-1">{selectedControl.domain}</div>
              </div>
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <div className="text-cyber-subtext mb-1">Enforcement Status</div>
                <div className="font-bold text-cyber-bright">{selectedControl.status}</div>
                <div className="text-[11px] text-cyber-subtext mt-1">
                  Residual Risk: <strong className="text-rose-400">{selectedControl.risk_contribution}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-cyber-surface/60 border border-cyber-border space-y-2">
              <div className="text-xs font-semibold text-cyber-bright flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyber-bright" />
                Mapped Active Defensive Control
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-cyber-subtext block text-[11px]">Control Code:</span>
                  <span className="font-mono text-cyber-text font-bold">
                    {selectedControl.mapped_control.code}
                  </span>
                </div>
                <div>
                  <span className="text-cyber-subtext block text-[11px]">Coverage:</span>
                  <span className="font-mono text-cyber-bright font-bold">
                    {selectedControl.mapped_control.coverage_pct}%
                  </span>
                </div>
                <div>
                  <span className="text-cyber-subtext block text-[11px]">Effectiveness:</span>
                  <span className="font-mono text-cyber-bright font-bold">
                    {selectedControl.mapped_control.effectiveness_pct}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-cyber-text">Recommended Remediation Action:</span>
              <p className="text-xs text-cyber-subtext p-3 rounded-lg bg-cyber-darker border border-cyber-border leading-relaxed">
                {selectedControl.remediation}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-cyber-border text-xs text-cyber-subtext">
              <span>Accountable Owner: <strong className="text-cyber-text">{selectedControl.owner}</strong></span>
              <button
                onClick={() => setSelectedControl(null)}
                className="px-4 py-1.5 rounded-lg bg-cyber-bright text-[#06110B] font-bold hover:bg-cyber-primary transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
