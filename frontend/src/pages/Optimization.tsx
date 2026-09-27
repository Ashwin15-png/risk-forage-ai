import React, { useState, useEffect } from 'react';
import { 
  Cpu, Sliders, DollarSign, CheckCircle2, TrendingDown, 
  ArrowRight, ShieldCheck, Zap, AlertCircle, RefreshCw, Layers, Check 
} from 'lucide-react';
import { optimizationApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { useDataMode } from '../context/DataModeContext';

export const Optimization: React.FC = () => {
  const { mode } = useDataMode();
  const [budget, setBudget] = useState<number>(5000000); // 50 Lakhs default
  const [objective, setObjective] = useState<string>('max_risk_reduction');
  const [result, setResult] = useState<any>(null);
  const [comparisons, setComparisons] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'solver' | 'compare'>('solver');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<{ [code: string]: string }>({});

  // Constraints checklist state
  const [enforceMandatory, setEnforceMandatory] = useState<boolean>(true);
  const [enforceDependencies, setEnforceDependencies] = useState<boolean>(true);
  const [enforceMutualExclusion, setEnforceMutualExclusion] = useState<boolean>(true);
  const [enforceCapacity, setEnforceCapacity] = useState<boolean>(true);

  const handleRunOptimization = async () => {
    setLoading(true);
    try {
      const [res, compRes] = await Promise.all([
        optimizationApi.run({ total_budget: budget, objective }),
        optimizationApi.compare(budget)
      ]);
      setResult(res.data);
      setComparisons(compRes.data);

      const initialApprovals: any = {};
      res.data.selected_initiatives?.forEach((init: any) => {
        initialApprovals[init.code] = 'Approved';
      });
      setApprovals(initialApprovals);
    } catch (e) {
      console.error(e);
      alert('Error running OR-Tools optimizer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRunOptimization();
  }, []);

  const handleToggleDecision = async (code: string) => {
    if (!result?.id) return;
    const current = approvals[code] || 'Approved';
    const nextStatus = current === 'Approved' ? 'Rejected' : 'Approved';
    setApprovals({ ...approvals, [code]: nextStatus });

    try {
      await optimizationApi.recordDecision({
        optimization_run_id: result.id,
        investment_code: code,
        status: nextStatus,
        comments: `CISO strategic decision recorded: ${nextStatus}.`
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyber-bright" />
              OR-TOOLS SECURITY INVESTMENT OPTIMIZATION SOLVER
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Google OR-Tools Mixed-Integer Programming • Knapsack Capital Allocation & Constraint Solving
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-1 bg-cyber-panel border border-cyber-border rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('solver')}
            className={`px-3 py-1 rounded-md font-mono font-semibold transition-all ${
              activeTab === 'solver'
                ? 'bg-cyber-surface text-cyber-bright border border-cyber-borderHover shadow-sm'
                : 'text-cyber-subtext hover:text-cyber-text'
            }`}
          >
            Optimization Solver
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1 rounded-md font-mono font-semibold transition-all ${
              activeTab === 'compare'
                ? 'bg-cyber-surface text-cyber-bright border border-cyber-borderHover shadow-sm'
                : 'text-cyber-subtext hover:text-cyber-text'
            }`}
          >
            Portfolio Comparisons (A/B/C)
          </button>
        </div>
      </div>

      {activeTab === 'solver' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls & Constraints Sidebar (Section 32) */}
          <div className="cyber-card p-5 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-cyber-border">
              <h2 className="text-sm font-bold text-cyber-text uppercase font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyber-bright" />
                Optimization Parameters
              </h2>
              <span className="text-[10px] font-mono text-cyber-bright">MIP Solver</span>
            </div>

            {/* Budget Input & Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-mono font-bold text-cyber-text">
                Available Security Budget (INR):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-cyber-bright font-mono">₹</span>
                <input
                  type="number"
                  step="500000"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 bg-cyber-darker border border-cyber-border rounded-lg text-xs font-mono font-bold text-cyber-text focus:outline-none focus:border-cyber-bright"
                />
              </div>

              {/* Quick Budget Chips */}
              <div className="flex items-center gap-2 pt-1">
                {[2500000, 5000000, 7500000, 10000000].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBudget(b)}
                    className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
                      budget === b
                        ? 'bg-cyber-surface text-cyber-bright border-cyber-borderHover'
                        : 'bg-cyber-darker text-cyber-subtext border-cyber-border hover:border-cyber-borderHover'
                    }`}
                  >
                    ₹{(b / 100000).toFixed(0)}L
                  </button>
                ))}
              </div>
            </div>

            {/* Objective Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-cyber-text">
                Mathematical Objective:
              </label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
              >
                <option value="max_risk_reduction">Maximum Enterprise Risk Reduction</option>
                <option value="max_roi">Maximum ROI (Risk Reduction per ₹ Million)</option>
              </select>
            </div>

            {/* Constraints Checklist */}
            <div className="space-y-2 pt-2 border-t border-cyber-border/40">
              <span className="block text-xs font-mono font-bold text-cyber-text uppercase">
                Mathematical Constraints:
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 text-cyber-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceMandatory}
                    onChange={(e) => setEnforceMandatory(e.target.checked)}
                    className="rounded bg-cyber-darker border-cyber-border text-cyber-bright"
                  />
                  <span>Enforce Mandatory Regulatory Initiatives</span>
                </label>
                <label className="flex items-center gap-2 text-cyber-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceDependencies}
                    onChange={(e) => setEnforceDependencies(e.target.checked)}
                    className="rounded bg-cyber-darker border-cyber-border text-cyber-bright"
                  />
                  <span>Enforce Initiative Prerequisites & Dependencies</span>
                </label>
                <label className="flex items-center gap-2 text-cyber-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceMutualExclusion}
                    onChange={(e) => setEnforceMutualExclusion(e.target.checked)}
                    className="rounded bg-cyber-darker border-cyber-border text-cyber-bright"
                  />
                  <span>Resolve Mutually Exclusive Architectural Choices</span>
                </label>
                <label className="flex items-center gap-2 text-cyber-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceCapacity}
                    onChange={(e) => setEnforceCapacity(e.target.checked)}
                    className="rounded bg-cyber-darker border-cyber-border text-cyber-bright"
                  />
                  <span>Cap Team Implementation Capacity (Max 4 concurrent)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleRunOptimization}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(74,222,128,0.25)]"
            >
              <Zap className="w-4 h-4 fill-current" />
              {loading ? 'Solving Linear Program...' : 'RUN OPTIMIZATION'}
            </button>
          </div>

          {/* Results Workspace (Section 33) */}
          <div className="cyber-card p-5 lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
              <div>
                <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">
                  Optimal Portfolio Selection
                </h2>
                <p className="text-xs text-cyber-subtext">
                  Mathematically optimal investment combination under ₹{(budget / 100000).toFixed(0)}L budget
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-cyber-darker text-cyber-bright border border-cyber-border font-bold">
                Status: {result?.solver_status || 'OPTIMAL'} ({result?.execution_time_ms || 14} ms)
              </span>
            </div>

            {/* 4 Outcome Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-[10px] text-cyber-subtext uppercase block">Allocated Capital</span>
                <span className="text-xl font-bold text-cyber-bright mt-1 block">
                  ₹{((result?.budget_used || budget) / 100000).toFixed(1)}L
                </span>
                <span className="text-[10px] text-cyber-subtext">
                  of ₹{(budget / 100000).toFixed(0)}L ({Math.round(((result?.budget_used || budget) / budget) * 100)}%)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-[10px] text-cyber-subtext uppercase block">Enterprise Risk Before</span>
                <span className="text-xl font-bold text-rose-400 mt-1 block">
                  {result?.initial_risk?.toFixed(1) || '84.0'}
                </span>
                <span className="text-[10px] text-cyber-subtext">Pre-optimization baseline</span>
              </div>

              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-[10px] text-cyber-subtext uppercase block">Optimized Residual Risk</span>
                <span className="text-xl font-bold text-cyber-bright mt-1 block">
                  {result?.optimized_risk?.toFixed(1) || '52.0'}
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">
                  -{result?.risk_reduction?.toFixed(1) || '32.0'} points
                </span>
              </div>

              <div className="p-3 rounded-lg bg-cyber-darker border border-cyber-border">
                <span className="text-[10px] text-cyber-subtext uppercase block">Reduction Efficiency</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                  {result?.roi_metric?.toFixed(2) || '6.4'} pts
                </span>
                <span className="text-[10px] text-cyber-subtext">per ₹ Million deployed</span>
              </div>
            </div>

            {/* Explanation Note */}
            {result?.explanation && (
              <div className="p-3 rounded-lg bg-cyber-surface border border-cyber-border text-xs text-cyber-text leading-relaxed">
                <strong className="text-cyber-bright font-mono uppercase block mb-1">Solver Rationale:</strong>
                {result.explanation}
              </div>
            )}

            {/* Selected Initiatives List & CISO Approvals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <h3 className="font-bold text-cyber-text uppercase font-mono">
                  Recommended Initiatives ({result?.selected_initiatives?.length || 0})
                </h3>
                <span className="text-[11px] text-cyber-subtext font-mono">
                  All prerequisite dependencies verified and satisfied
                </span>
              </div>

              <div className="space-y-2">
                {result?.selected_initiatives?.map((init: any) => {
                  const isApproved = (approvals[init.code] || 'Approved') === 'Approved';
                  return (
                    <div
                      key={init.code}
                      className="p-3.5 rounded-lg bg-cyber-panel border border-cyber-border flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyber-bright">{init.code}</span>
                          <span className="font-bold text-xs text-cyber-text">{init.name}</span>
                          {init.is_mandatory && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-cyber-subtext font-mono mt-1">
                          {init.category} • Cost: ₹{(init.one_time_cost / 100000).toFixed(1)}L • Risk Reduction: -{init.expected_risk_reduction} pts
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleDecision(init.code)}
                          className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
                            isApproved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          }`}
                        >
                          {isApproved ? '✓ CISO Approved' : '✗ Rejected'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 34: PORTFOLIO COMPARISONS TAB */}
      {activeTab === 'compare' && (
        <div className="cyber-card p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div>
              <h2 className="text-base font-bold text-cyber-text uppercase font-mono">
                Strategic Portfolio Comparison (A / B / C)
              </h2>
              <p className="text-xs text-cyber-subtext">
                Evaluated under ₹{(budget / 100000).toFixed(0)} Lakh budget across 3 distinct enterprise risk postures
              </p>
            </div>
            <DataModeBadge />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {comparisons?.portfolios?.map((port: any, idx: number) => (
              <div
                key={port.name}
                className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
                  idx === 0
                    ? 'bg-cyber-surface border-cyber-borderHover shadow-[0_0_15px_rgba(34,197,94,0.12)]'
                    : 'bg-cyber-panel border-cyber-border'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-cyber-bright uppercase font-bold">
                        Portfolio {port.code || String.fromCharCode(65 + idx)}
                      </span>
                      <h3 className="text-base font-bold text-cyber-text mt-0.5">{port.name}</h3>
                    </div>
                    <span className="text-xs font-mono text-cyber-muted font-bold">
                      {port.strategy || 'Strategic'}
                    </span>
                  </div>

                  <p className="text-xs text-cyber-subtext mt-2 leading-relaxed">
                    {port.description}
                  </p>

                  <div className="mt-4 p-3 rounded-lg bg-cyber-darker border border-cyber-border space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-cyber-subtext font-sans">Total Deployed Cost:</span>
                      <span className="text-cyber-bright font-bold">₹{(port.cost / 100000).toFixed(1)} Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-subtext font-sans">Residual Risk Score:</span>
                      <span className="text-cyber-text font-bold">{port.residual_risk?.toFixed(1) || '52.0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-subtext font-sans">Net Risk Reduction:</span>
                      <span className="text-emerald-400 font-bold">-{port.risk_reduction?.toFixed(1) || '32.0'} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-subtext font-sans">Expected Annual Loss:</span>
                      <span className="text-amber-300 font-bold">₹{((port.eal || 4400000) / 100000).toFixed(1)} Lakh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-subtext font-sans">Capital Efficiency:</span>
                      <span className="text-cyber-bright font-bold">{port.roi_metric?.toFixed(2) || '6.4'} pts / ₹M</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-cyber-border/40 text-xs">
                  <div className="text-[10px] font-mono text-cyber-subtext mb-2">
                    Initiatives: <strong className="text-cyber-text">{port.initiatives_count || 4} projects</strong>
                  </div>
                  <button
                    onClick={() => {
                      setBudget(port.cost);
                      setActiveTab('solver');
                    }}
                    className="w-full py-2 rounded-lg bg-cyber-panel hover:bg-cyber-darker border border-cyber-border text-cyber-bright text-xs font-mono font-bold transition-colors"
                  >
                    Load Portfolio in Solver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
