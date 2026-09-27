import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, Search, Filter, ShieldCheck, DollarSign, ArrowRight, Zap, RefreshCw, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { investmentApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';

export const Investments: React.FC = () => {
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await investmentApi.list({ category: categoryFilter || undefined });
      setInvestments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, [categoryFilter]);

  const filtered = investments.filter((inv) =>
    inv.name.toLowerCase().includes(search.toLowerCase()) ||
    inv.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-cyber-bright" />
              CYBERSECURITY INVESTMENT PORTFOLIO & INITIATIVES
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            18 Modeled Security Initiatives • Direct Empirical Risk Reduction Points • Budget in INR (₹)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/optimization"
            className="px-3.5 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)]"
          >
            <Zap className="w-4 h-4" />
            Launch Portfolio Optimizer
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-xl bg-cyber-panel border border-cyber-border text-xs">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search initiatives by name, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-cyber-darker border border-cyber-border rounded-lg text-xs text-cyber-text placeholder-cyber-subtext focus:outline-none focus:border-cyber-bright"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
          >
            <option value="">All Categories</option>
            <option value="Identity & Access">Identity & Access</option>
            <option value="Network Security">Network Security</option>
            <option value="Endpoint Security">Endpoint Security</option>
            <option value="Data Protection">Data Protection</option>
            <option value="Application Security">Application Security</option>
            <option value="Security Operations">Security Operations</option>
            <option value="Governance & Risk">Governance & Risk</option>
            <option value="Resilience">Resilience & DR</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-cyber-subtext font-mono">
          <span>{filtered.length} Initiatives Active</span>
          <button
            onClick={fetchInvestments}
            className="p-1 rounded bg-cyber-darker border border-cyber-border hover:text-cyber-bright"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Initiatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((inv) => (
          <div key={inv.id || inv.code} className="cyber-card p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyber-bright font-bold">{inv.code}</span>
                  <h3 className="text-sm font-bold text-cyber-text mt-0.5">{inv.name}</h3>
                </div>
                {inv.is_mandatory ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase font-bold">
                    Mandatory
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-darker text-cyber-muted border border-cyber-border">
                    {inv.category}
                  </span>
                )}
              </div>

              <p className="text-xs text-cyber-subtext mt-2 line-clamp-2 leading-relaxed">
                {inv.description}
              </p>

              <div className="mt-4 p-3 rounded-lg bg-cyber-darker border border-cyber-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-cyber-subtext font-sans">Capital Outlay (One-Time):</span>
                  <span className="text-cyber-bright font-bold">
                    ₹{(inv.one_time_cost / 100000).toFixed(1)} Lakh
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-subtext font-sans">Recurring Cost / Year:</span>
                  <span className="text-cyber-text">
                    ₹{(inv.recurring_cost / 100000).toFixed(1)} Lakh / yr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-subtext font-sans">Modeled Risk Reduction:</span>
                  <span className="text-emerald-400 font-bold">
                    -{inv.expected_risk_reduction} points
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-subtext font-sans">Implementation Duration:</span>
                  <span className="text-cyber-text">{inv.implementation_weeks || 6} weeks</span>
                </div>
                <div className="pt-1 border-t border-cyber-border/40 flex justify-between items-center">
                  <span className="text-cyber-subtext font-sans text-[11px]">Confidence:</span>
                  <ConfidenceBar score={inv.confidence_pct || 90} size="sm" />
                </div>
              </div>

              {inv.dependencies && inv.dependencies.length > 0 && (
                <div className="mt-2 text-[10px] font-mono text-cyber-subtext">
                  Prerequisites: <span className="text-amber-300">{inv.dependencies.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-cyber-border/40 flex items-center justify-between text-xs font-mono">
              <span className="text-cyber-subtext text-[11px]">Status: {inv.status || 'Catalog'}</span>
              <Link
                to="/optimization"
                className="text-cyber-bright hover:underline flex items-center gap-1 text-[11px]"
              >
                Include in Knapsack <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
