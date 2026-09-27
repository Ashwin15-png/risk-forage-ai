import React, { useState, useEffect } from 'react';
import { 
  History, Search, Filter, RefreshCw, CheckCircle2, 
  Clock, Shield, User, FileText, ChevronRight, X, ArrowRight, Eye, Code
} from 'lucide-react';
import { auditApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const AuditTrail: React.FC = () => {
  const { dataMode } = useDataMode();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({
        action: actionFilter || undefined,
        entity_type: entityFilter || undefined,
        limit: 100,
      });
      setEvents(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [actionFilter, entityFilter]);

  const filteredEvents = events.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (e.user && e.user.toLowerCase().includes(term)) ||
      (e.action && e.action.toLowerCase().includes(term)) ||
      (e.entity && e.entity.toLowerCase().includes(term)) ||
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.model_version && e.model_version.toLowerCase().includes(term))
    );
  });

  const getActionColor = (action: string) => {
    if (action.includes('Vulnerability') || action.includes('Incident')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    if (action.includes('Optimization') || action.includes('Decision')) {
      return 'bg-[#22C55E]/20 text-[#4ADE80] border-[#22C55E]/40';
    }
    if (action.includes('Scenario')) {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
    if (action.includes('Report')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#4ADE80]" />
              REGULATORY IMMUTABLE AUDIT TRAIL
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Cryptographic Chain of Custody: Telemetry Ingestion → Computations → Decisions → Approvals
          </p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-[#0D1B12] p-1 border border-[rgba(74,222,128,0.15)] text-xs font-mono">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'table' ? 'bg-[#22C55E] text-[#06110B] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ledger Table
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 rounded transition-all ${
                viewMode === 'timeline' ? 'bg-[#22C55E] text-[#06110B] font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Timeline View
            </button>
          </div>

          <button
            onClick={fetchAudit}
            className="p-2 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] text-slate-400 hover:text-[#4ADE80] transition-all"
            title="Refresh Audit Trail"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0D1B12] border border-[rgba(74,222,128,0.2)]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by actor, action, target entity, or keywords..."
            className="w-full bg-[#06110B] border border-[rgba(74,222,128,0.15)] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E] font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#06110B] border border-[rgba(74,222,128,0.2)] rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-[#22C55E] font-mono text-xs"
          >
            <option value="">All Actions</option>
            <option value="Live Vulnerability Ingested">Vulnerability Ingested</option>
            <option value="Vulnerability Status Updated">Vulnerability Status Updated</option>
            <option value="Scenario Executed">Scenario Executed</option>
            <option value="Optimization Run Executed">Optimization Executed</option>
            <option value="Investment Decision Recorded">Decision Recorded</option>
            <option value="Report Generated">Report Generated</option>
          </select>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-[#06110B] border border-[rgba(74,222,128,0.2)] rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-[#22C55E] font-mono text-xs"
          >
            <option value="">All Entities</option>
            <option value="Vulnerability">Vulnerability</option>
            <option value="ScenarioRun">ScenarioRun</option>
            <option value="OptimizationRun">OptimizationRun</option>
            <option value="ExecutiveRiskReport">ExecutiveRiskReport</option>
            <option value="InvestmentInitiative">InvestmentInitiative</option>
            <option value="Asset">Asset</option>
          </select>

          <span className="text-[11px] font-mono text-[#4ADE80] px-2 py-1 bg-[#102417] rounded border border-[rgba(74,222,128,0.15)]">
            {filteredEvents.length} records
          </span>
        </div>
      </div>

      {/* Main Content Area: Table vs Timeline */}
      {viewMode === 'table' ? (
        <div className="rounded-xl overflow-hidden bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#102417] text-slate-400 border-b border-[rgba(74,222,128,0.15)] font-mono">
                  <th className="py-3 px-4 font-semibold">Timestamp (UTC)</th>
                  <th className="py-3 px-4 font-semibold">Actor / Role</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Target Entity</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Model</th>
                  <th className="py-3 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(74,222,128,0.1)] font-mono text-[11px]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-sans">
                      <div className="inline-block w-6 h-6 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Retrieving cryptographic audit events...</div>
                    </td>
                  </tr>
                ) : filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 font-sans">
                      No matching audit records found.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((e) => (
                    <tr 
                      key={e.id} 
                      onClick={() => setSelectedEvent(e)}
                      className="hover:bg-[#102417] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{e.timestamp}</td>
                      <td className="py-3 px-4 font-sans text-white font-medium">{e.user}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${getActionColor(e.action)}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">{e.entity}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans max-w-xs truncate">
                        {e.description}
                      </td>
                      <td className="py-3 px-4 text-[#4ADE80] font-mono text-[10px]">{e.model_version}</td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-slate-400 hover:text-[#4ADE80] p-1">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-6">
          <div className="relative border-l border-[rgba(74,222,128,0.2)] ml-4 space-y-8">
            {filteredEvents.map((e) => (
              <div key={e.id} className="relative pl-6">
                {/* Dot */}
                <div className="absolute -left-2 top-1 w-4 h-4 rounded-full bg-[#0D1B12] border-2 border-[#22C55E] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                </div>

                <div 
                  onClick={() => setSelectedEvent(e)}
                  className="p-4 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.15)] hover:border-[#22C55E]/40 cursor-pointer transition-all space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-bold ${getActionColor(e.action)}`}>
                        {e.action}
                      </span>
                      <span className="text-xs font-semibold text-white">{e.entity}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-[#4ADE80]" />
                      <span>{e.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {e.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-[rgba(74,222,128,0.1)] text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>Actor: <span className="text-slate-200">{e.user}</span></span>
                      <span>Source: <span className="text-[#4ADE80]">{e.source || 'Automated Pipeline'}</span></span>
                    </div>
                    <div>
                      Model: <span className="text-cyan-400">{e.model_version}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Details Inspection Drawer / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.4)] max-w-2xl w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[rgba(74,222,128,0.2)] pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#4ADE80]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Audit Record Verification
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#102417]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-[#102417] p-3 rounded-lg border border-[rgba(74,222,128,0.15)]">
              <div>
                <span className="text-slate-400 block text-[10px]">RECORD ID</span>
                <span className="text-white font-bold">{selectedEvent.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TIMESTAMP (UTC)</span>
                <span className="text-slate-200">{selectedEvent.timestamp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">AUTHENTICATED ACTOR</span>
                <span className="text-cyan-400">{selectedEvent.user}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SYSTEM ACTION</span>
                <span className="text-[#4ADE80] font-bold">{selectedEvent.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TARGET ENTITY</span>
                <span className="text-white">{selectedEvent.entity}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MODEL VERSION</span>
                <span className="text-white">{selectedEvent.model_version}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Operational Description:</span>
              <p className="text-xs text-slate-200 bg-[#102417] p-3 rounded-lg border border-[rgba(74,222,128,0.15)] font-sans leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            {/* Old vs New State Comparison */}
            {(selectedEvent.old_values || selectedEvent.new_values) && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#4ADE80]" />
                  State Transition Delta (Old vs New):
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-rose-400">Previous State:</span>
                    <pre className="text-[11px] font-mono p-3 rounded-lg bg-[#06110B] border border-rose-500/20 text-slate-300 overflow-x-auto max-h-40">
                      {selectedEvent.old_values || 'null'}
                    </pre>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#4ADE80]">Updated State:</span>
                    <pre className="text-[11px] font-mono p-3 rounded-lg bg-[#06110B] border border-[#22C55E]/30 text-slate-200 overflow-x-auto max-h-40">
                      {selectedEvent.new_values || 'null'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold text-xs"
              >
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
