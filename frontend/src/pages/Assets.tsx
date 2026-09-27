import React, { useState, useEffect, useMemo } from 'react';
import { Server, Search, Filter, ArrowRight, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { assetApi, serviceApi } from '../services/api';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Assets: React.FC = () => {
  const { mode } = useDataMode();
  const [assets, setAssets] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [exposureFilter, setExposureFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sortField, setSortField] = useState<string>('current_risk_score');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const pageSize = 12;

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        assetApi.list({
          search: search || undefined,
          criticality: criticalityFilter || undefined,
          exposure: exposureFilter || undefined,
          service_id: serviceFilter || undefined,
        }),
        serviceApi.list()
      ]);
      setAssets(aRes.data);
      setServices(sRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, criticalityFilter, exposureFilter, serviceFilter]);

  // Client-side sorting and filtering
  const processedAssets = useMemo(() => {
    let list = [...assets];
    if (typeFilter) {
      list = list.filter((a) => a.asset_type === typeFilter);
    }

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [assets, typeFilter, sortField, sortAsc]);

  const totalPages = Math.ceil(processedAssets.length / pageSize) || 1;
  const paginatedAssets = processedAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Server className="w-5 h-5 text-cyber-bright" />
              ENTERPRISE ASSET INVENTORY & RISK EXPOSURE
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            43 Infrastructure Nodes • Continuous Risk Scoring & Control Coverage Tracking
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search assets, IP, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-cyber-darker border border-cyber-border rounded-lg text-xs text-cyber-text focus:outline-none focus:border-cyber-bright placeholder-cyber-subtext"
            />
          </div>

          <select
            value={criticalityFilter}
            onChange={(e) => setCriticalityFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Criticality: All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={exposureFilter}
            onChange={(e) => setExposureFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Exposure: All</option>
            <option value="Internet-Facing">Internet-Facing</option>
            <option value="DMZ">DMZ</option>
            <option value="Internal">Internal</option>
            <option value="Partner">Partner</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Type: All</option>
            <option value="Server">Server</option>
            <option value="Database">Database</option>
            <option value="API Gateway">API Gateway</option>
            <option value="Cloud Service">Cloud Service</option>
            <option value="Endpoint">Endpoint</option>
          </select>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">Service: All</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-cyber-darker text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
              <tr>
                <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('name')}>
                  <div className="flex items-center gap-1">
                    <span>Asset & Code</span>
                    <ArrowUpDown className="w-3 h-3 text-cyber-subtext" />
                  </div>
                </th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Zone / IP</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Criticality</th>
                <th className="py-3 px-4">Exposure</th>
                <th className="py-3 px-4 cursor-pointer" onClick={() => toggleSort('current_risk_score')}>
                  <div className="flex items-center gap-1">
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-3 h-3 text-cyber-subtext" />
                  </div>
                </th>
                <th className="py-3 px-4">Vulnerabilities</th>
                <th className="py-3 px-4">Controls</th>
                <th className="py-3 px-4">Last Seen</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {paginatedAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-cyber-surface/60 transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      to={`/assets/${asset.id}`}
                      className="font-semibold text-cyber-text hover:text-cyber-bright block"
                    >
                      {asset.name}
                    </Link>
                    <span className="text-[10px] font-mono text-cyber-bright">
                      {asset.asset_id_code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyber-panel border border-cyber-border text-cyber-subtext">
                      {asset.asset_type || 'Server'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    <div className="text-cyber-text">{asset.ip_address || '10.0.x.x'}</div>
                    <div className="text-[10px] text-cyber-subtext truncate max-w-[120px]">
                      {asset.hostname || 'internal.host'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-cyber-subtext">{asset.owner || 'SecOps Team'}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        asset.criticality === 'Critical'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : asset.criticality === 'High'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        asset.exposure === 'Internet-Facing'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-cyber-panel text-cyber-subtext border-cyber-border'
                      }`}
                    >
                      {asset.exposure}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskScoreBadge score={asset.current_risk_score} size="sm" showCategory={false} />
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">
                    <span className={asset.vulnerabilities_count > 0 ? 'text-amber-400 font-bold' : 'text-cyber-subtext'}>
                      {asset.vulnerabilities_count || 0} CVEs
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-cyber-bright">
                    {asset.control_coverage || 75}%
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-cyber-subtext">
                    {asset.last_seen ? asset.last_seen.split('T')[0] : 'Today'}
                  </td>
                  <td className="py-3 px-4">
                    <DataModeBadge size="xs" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to={`/assets/${asset.id}`}
                      className="p-1 rounded text-cyber-subtext hover:text-cyber-bright inline-flex items-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-cyber-border bg-cyber-darker text-xs text-cyber-subtext">
          <span className="font-mono">
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, processedAssets.length)} of {processedAssets.length} assets
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-cyber-panel border border-cyber-border disabled:opacity-40 hover:text-cyber-bright"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-cyber-bright font-bold">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-cyber-panel border border-cyber-border disabled:opacity-40 hover:text-cyber-bright"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
