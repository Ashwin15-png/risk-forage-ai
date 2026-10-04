import React, { useState, useEffect } from 'react';
import { Layers, Search, ArrowRight, DollarSign, Activity, RefreshCw, Sliders, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { serviceApi } from '../services/api';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';

import { useDataMode } from '../context/DataModeContext';

export const Services: React.FC = () => {
  const { lastUpdated, dataMode } = useDataMode();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await serviceApi.list();
      setServices(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [lastUpdated]);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyber-bright" />
              BUSINESS SERVICES CATALOG & RISK QUANTIFICATION
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Aggregated RISKFORGE AI Scores &amp; Financial Outage Exposure across Core Banking Business Services
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search business services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-cyber-darker border border-cyber-border rounded-lg text-xs text-cyber-text placeholder-cyber-subtext focus:outline-none focus:border-cyber-bright"
            />
          </div>
          <button
            onClick={fetchServices}
            className="p-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((srv) => {
          const ealLakh = ((srv.current_risk_score / 100.0) * srv.financial_loss_per_hour * 24 * 7) / 100000;
          return (
            <div key={srv.id} className="cyber-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-cyber-bright font-semibold">
                      {srv.code || 'SVC'} • {srv.tier}
                    </span>
                    <h3 className="text-sm font-bold text-cyber-text mt-0.5">{srv.name}</h3>
                  </div>
                  <RiskScoreBadge score={srv.current_risk_score} category={srv.criticality} size="md" />
                </div>

                <div className="mt-4 p-3 rounded-lg bg-cyber-darker border border-cyber-border space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-cyber-subtext">Hourly Downtime Impact:</span>
                    <span className="font-mono text-amber-300 font-semibold">
                      ₹{(srv.financial_loss_per_hour / 100000).toFixed(1)} Lakh / hr
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-subtext">Expected Annual Loss (EAL):</span>
                    <span className="font-mono text-cyber-bright font-bold">
                      ₹{ealLakh.toFixed(1)} Lakh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-subtext">Assets Mapped:</span>
                    <span className="font-mono text-cyber-text font-bold">{srv.assets_count || 3} nodes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyber-subtext">Top Driver:</span>
                    <span className="text-cyber-muted truncate max-w-[150px] text-right font-mono text-[11px]">
                      {srv.top_driver}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-cyber-border/40 flex justify-between items-center">
                    <span className="text-cyber-subtext text-[11px]">Confidence:</span>
                    <ConfidenceBar score={srv.confidence || 90} size="sm" />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-cyber-border flex items-center justify-between text-xs">
                <span className="text-cyber-subtext font-mono text-[11px]">Owner: {srv.owner || 'SecOps Lead'}</span>
                <div className="flex items-center gap-2">
                  <Link
                    to="/scenarios"
                    className="text-cyber-subtext hover:text-cyber-bright text-xs font-mono flex items-center gap-1"
                  >
                    <Sliders className="w-3 h-3" /> Simulate
                  </Link>
                  <Link
                    to={`/assets?service_id=${srv.id}`}
                    className="text-cyber-bright hover:text-cyber-muted font-medium flex items-center gap-1 font-mono text-xs"
                  >
                    Inspect <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
