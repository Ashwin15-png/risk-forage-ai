import React, { useState, useEffect } from 'react';
import { AlertTriangle, Search, Filter, RefreshCw, CheckCircle2, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { vulnApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Vulnerabilities: React.FC = () => {
  const { refreshAll } = useDataMode();
  const [vulns, setVulns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchVulns = async () => {
    setLoading(true);
    try {
      const res = await vulnApi.list({
        search: search || undefined,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setVulns(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVulns();
  }, [search, severityFilter, statusFilter]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    setUpdatingId(id);
    try {
      const nextStatus = currentStatus === 'Resolved' ? 'Open' : 'Resolved';
      await vulnApi.updateStatus(id, nextStatus);
      await fetchVulns();
      await refreshAll();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              VULNERABILITY INTELLIGENCE & CONTINUOUS RECALCULATION
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Real-Time CVSS Quantification • Remediation Status Automatically Recalculates Asset & Service Risk Scores
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search CVE ID, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-cyber-darker border border-cyber-border rounded-lg text-xs text-cyber-text placeholder-cyber-subtext focus:outline-none focus:border-cyber-bright"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Severity: All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Status: All</option>
            <option value="Open">Open</option>
            <option value="Resolved">Resolved</option>
          </select>

          <button
            onClick={fetchVulns}
            className="p-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Vulnerabilities Table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-cyber-darker text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4">CVE ID & Title</th>
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">CVSS</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Exposure</th>
                <th className="py-3 px-4">Exploitability</th>
                <th className="py-3 px-4">Risk Contribution</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {vulns.map((v) => (
                <tr key={v.id} className="hover:bg-cyber-surface/60 transition-colors">
                  <td className="py-3 px-4 max-w-xs">
                    <span className="font-mono font-bold text-cyber-bright block">{v.cve_id}</span>
                    <span className="text-cyber-subtext text-[11px] truncate block">{v.title}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      to={`/assets/${v.asset_id}`}
                      className="font-mono text-xs text-cyber-text hover:text-cyber-bright flex items-center gap-1"
                    >
                      <span>{v.asset_id_code}</span>
                      <ExternalLink className="w-3 h-3 text-cyber-subtext" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-rose-400">{v.cvss_score}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        v.severity === 'Critical'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : v.severity === 'High'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-cyber-panel text-cyber-subtext border-cyber-border'
                      }`}
                    >
                      {v.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-cyber-subtext">{v.exposure}</td>
                  <td className="py-3 px-4 font-mono text-xs text-cyber-text">{v.exploitability_score || 'N/A'}</td>
                  <td className="py-3 px-4 font-mono font-bold text-amber-300">+{v.risk_contribution} pts</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        v.status === 'Resolved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-cyber-subtext">{v.first_seen}</td>
                  <td className="py-3 px-4">
                    <DataModeBadge size="xs" />
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(v.id, v.status)}
                      disabled={updatingId === v.id}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all ${
                        v.status === 'Resolved'
                          ? 'bg-cyber-panel hover:bg-cyber-surface text-cyber-text border border-cyber-border'
                          : 'bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold shadow-sm'
                      }`}
                    >
                      {updatingId === v.id ? 'Recalculating...' : v.status === 'Resolved' ? 'Reopen' : 'Resolve'}
                    </button>
                    <Link
                      to={`/assets/${v.asset_id}`}
                      className="px-2 py-1 rounded bg-cyber-panel border border-cyber-border text-cyber-bright text-xs font-mono hover:bg-cyber-surface inline-block"
                    >
                      View Risk
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
