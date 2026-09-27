import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Shield, Activity, RefreshCw, ChevronRight, X, Sliders, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { controlApi } from '../services/api';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Controls: React.FC = () => {
  const { startSimulation } = useDataMode();
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedControl, setSelectedControl] = useState<any | null>(null);

  const fetchControls = async () => {
    setLoading(true);
    try {
      const res = await controlApi.list({ category: categoryFilter || undefined });
      setControls(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchControls();
  }, [categoryFilter]);

  const filtered = controls.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyber-bright" />
              DEFENSIVE CONTROLS POSTURE & RISK OFFSET
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Enterprise Countermeasure Posture • Direct Dampening Offsets on RISKFORGE AI Residual Risk
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 text-cyber-subtext absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search control..."
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
            <option value="Identity">Identity & Access</option>
            <option value="Endpoint">Endpoint Security</option>
            <option value="Network">Network Security</option>
            <option value="Data">Data Protection</option>
            <option value="AppSec">Application Security</option>
            <option value="Operations">SecOps & Monitoring</option>
          </select>

          <button
            onClick={fetchControls}
            className="p-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelectedControl(c)}
            className="cyber-card p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-cyber-borderHover transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyber-bright font-bold">{c.code}</span>
                  <h3 className="text-sm font-bold text-cyber-text mt-0.5">{c.name}</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyber-darker text-cyber-muted border border-cyber-border">
                  {c.category}
                </span>
              </div>

              <p className="text-xs text-cyber-subtext mt-2 line-clamp-2 leading-relaxed">
                {c.description || 'Active defensive safeguard mitigating lateral traversal and unauthorized credential abuse.'}
              </p>

              <div className="mt-4 space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-cyber-subtext mb-1">
                    <span>Effectiveness:</span>
                    <span className="font-mono text-cyber-bright font-bold">{c.effectiveness_pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-cyber-darker rounded-full overflow-hidden">
                    <div className="h-full bg-cyber-bright rounded-full" style={{ width: `${c.effectiveness_pct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-cyber-subtext mb-1">
                    <span>Perimeter Coverage:</span>
                    <span className="font-mono text-cyber-text font-bold">{c.coverage_pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-cyber-darker rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.coverage_pct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-cyber-border/40 flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 font-semibold">
                -{Math.round(c.risk_reduction_weight * 100)}% Risk Dampening
              </span>
              <span className="text-cyber-subtext text-[11px] flex items-center gap-1">
                Details <ChevronRight className="w-3.5 h-3.5 text-cyber-bright" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Control Detail Modal */}
      {selectedControl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-cyber-panel border border-cyber-border rounded-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded bg-cyber-darker text-cyber-bright font-mono text-xs border border-cyber-border">
                  {selectedControl.code}
                </span>
                <h3 className="text-base font-bold text-cyber-text">{selectedControl.name}</h3>
              </div>
              <button
                onClick={() => setSelectedControl(null)}
                className="text-cyber-subtext hover:text-cyber-text p-1 font-mono text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-cyber-subtext leading-relaxed">
              {selectedControl.description}
            </p>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-cyber-subtext block text-[10px]">Coverage</span>
                <span className="text-sm font-bold text-cyber-bright mt-0.5 block">{selectedControl.coverage_pct}%</span>
              </div>
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-cyber-subtext block text-[10px]">Effectiveness</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{selectedControl.effectiveness_pct}%</span>
              </div>
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-cyber-subtext block text-[10px]">Risk Weight</span>
                <span className="text-sm font-bold text-cyber-text mt-0.5 block">
                  {selectedControl.risk_reduction_weight}x
                </span>
              </div>
            </div>

            {/* Scenario Potential */}
            <div className="p-4 rounded-lg bg-cyber-surface/70 border border-cyber-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyber-bright flex items-center gap-1.5 font-mono">
                  <Sliders className="w-3.5 h-3.5 text-cyber-bright" />
                  What-If Scenario Potential
                </span>
                <span className="font-mono text-emerald-400 font-bold">-14.5 pts</span>
              </div>
              <p className="text-cyber-subtext text-[11px] leading-relaxed">
                Expanding {selectedControl.name} to 100% coverage across internet-facing APIs yields an estimated ₹28.5L reduction in Expected Annual Loss.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-cyber-border text-xs">
              <span className="text-cyber-subtext font-mono text-[11px]">
                Last Validated: {selectedControl.last_validated ? selectedControl.last_validated.split('T')[0] : '2026-09-24'}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/scenarios"
                  onClick={() => {
                    startSimulation({
                      name: `Scale ${selectedControl.name}`,
                      controls: [selectedControl.code],
                      riskScore: 52.0,
                      reduction: 32.0,
                      cost: 1200000.0,
                    });
                    setSelectedControl(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <Sliders className="w-3 h-3" /> Simulate Countermeasure
                </Link>
                <button
                  onClick={() => setSelectedControl(null)}
                  className="px-3 py-1.5 rounded-lg bg-cyber-darker text-cyber-subtext hover:text-cyber-text border border-cyber-border text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
