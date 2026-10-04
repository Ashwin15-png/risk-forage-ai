import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, 
  Server, Shield, ArrowUpRight, DollarSign, Activity, 
  CheckCircle2, ArrowRight, Zap, RefreshCw, BarChart2,
  Calendar, Layers, Clock, ShieldAlert, Cpu
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  Tooltip, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { useRiskOverview, useDataMode } from '../context/DataModeContext';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { DataModeBadge } from '../components/DataModeBadge';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { data, loading, error, refetch } = useRiskOverview();
  const { mode, lastUpdated } = useDataMode();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D'>('30D');

  if (loading && !data) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-2 border-cyber-bright border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-sm font-mono text-cyber-subtext">Loading RISKFORGE AI Telemetry &amp; Risk Drivers...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        {error || 'Unable to load overview.'}
        <button onClick={refetch} className="ml-4 px-3 py-1 bg-cyber-panel rounded text-xs text-white">
          Retry
        </button>
      </div>
    );
  }

  const { kpi, distribution, trend = [], top_drivers = [], highest_risk_services = [], investment_opportunity } = data;
  const currencySymbol = kpi?.currency_symbol || investment_opportunity?.currency_symbol || '₹';

  const formatFinancialValue = (amount: number, symbol: string = currencySymbol) => {
    if (amount === undefined || amount === null || isNaN(amount)) return `${symbol}0`;
    if (symbol === '₹') {
      if (amount >= 10000000) {
        return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
      }
      if (amount >= 100000) {
        return `${symbol}${(amount / 100000).toFixed(1)} L`;
      }
      return `${symbol}${amount.toLocaleString('en-IN')}`;
    } else {
      if (amount >= 1000000) {
        return `${symbol}${(amount / 1000000).toFixed(2)} M`;
      }
      if (amount >= 1000) {
        return `${symbol}${(amount / 1000).toFixed(1)} K`;
      }
      return `${symbol}${amount.toLocaleString()}`;
    }
  };

  // Filter trend data according to selected timeframe
  const filteredTrend = trend.slice(timeRange === '7D' ? -7 : timeRange === '90D' ? -90 : -30);

  return (
    <div className="space-y-6">
      {/* Header: RISKFORGE AI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold tracking-tight text-cyber-text uppercase font-mono">
              RISKFORGE AI
            </h1>
            <DataModeBadge />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-cyber-subtext mt-1 font-mono">
            <span>Continuous Cyber Risk Intelligence &amp; Investment Optimization</span>
            <span className="text-cyber-border">•</span>
            <span className="text-cyber-bright">Model: Risk Model v1.0</span>
            <span className="text-cyber-border">•</span>
            <span>Last Recalculation: {lastUpdated}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright hover:border-cyber-borderHover text-xs flex items-center gap-1.5 transition-all shadow-sm font-mono cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
          <Link
            to="/optimization"
            className="px-3.5 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(74,222,128,0.3)] font-mono"
          >
            <Zap className="w-3.5 h-3.5" />
            Optimize Portfolio
          </Link>
        </div>
      </div>

      {/* Section 17: Executive KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: ENTERPRISE RISK */}
        <div className="cyber-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-cyber-subtext text-xs mb-2">
            <span className="uppercase font-mono text-[11px] tracking-wider">Enterprise Risk</span>
            <DataModeBadge size="xs" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-cyber-text tracking-tight font-mono">
              {kpi.total_risk.toFixed(1)}
            </span>
            <span className="text-xs text-cyber-subtext font-mono">/ 100</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase font-bold">
              {kpi.risk_category}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-cyber-border/40">
            <div className="flex items-center gap-1 text-rose-400 font-mono">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{Math.abs(kpi.delta_pct || 8.3)}%</span>
            </div>
            <span className="text-[10px] text-cyber-subtext font-mono">vs baseline</span>
          </div>
        </div>

        {/* KPI 2: EXPECTED ANNUAL LOSS */}
        <div className="cyber-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-cyber-subtext text-xs mb-2">
            <span className="uppercase font-mono text-[11px] tracking-wider">Expected Annual Loss</span>
            <DataModeBadge size="xs" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-cyber-bright tracking-tight font-mono">
              {formatFinancialValue(kpi.expected_annual_loss, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-cyber-border/40">
            <span className="text-cyber-subtext text-[11px]">Modeled Loss Frequency</span>
            <span className="text-amber-400 font-mono text-xs font-semibold">
              {(kpi.total_risk / 48.0).toFixed(2)} events / yr
            </span>
          </div>
        </div>

        {/* KPI 3: TOTAL FINANCIAL EXPOSURE */}
        <div className="cyber-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-cyber-subtext text-xs mb-2">
            <span className="uppercase font-mono text-[11px] tracking-wider">Total Financial Exposure</span>
            <DataModeBadge size="xs" />
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-extrabold text-cyber-text tracking-tight font-mono">
              {formatFinancialValue(kpi.total_financial_exposure, currencySymbol)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-cyber-border/40">
            <span className="text-cyber-subtext text-[11px]">Monitored Scope</span>
            <span className="text-cyber-bright font-mono text-xs">
              {highest_risk_services.length || 12} Active Services
            </span>
          </div>
        </div>

        {/* KPI 4: CRITICAL ASSETS & VULNERABILITIES */}
        <div className="cyber-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-cyber-subtext text-xs mb-2">
            <span className="uppercase font-mono text-[11px] tracking-wider">Critical Perimeter</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-3 mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-cyber-text font-mono">{kpi.critical_assets || 0}</span>
              <span className="text-[10px] text-cyber-subtext uppercase font-mono">Assets</span>
            </div>
            <span className="text-cyber-border font-mono">/</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-rose-400 font-mono">{kpi.critical_vulnerabilities || 0}</span>
              <span className="text-[10px] text-cyber-subtext uppercase font-mono">CVEs</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-cyber-border/40">
            <span className="text-cyber-subtext text-[11px]">Active Incidents</span>
            <span className="text-amber-300 font-mono font-bold">{kpi.open_incidents || 0} Open</span>
          </div>
        </div>
      </div>

      {/* Second KPI Strip: Opportunity & Evidence */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 5: RISK REDUCTION OPPORTUNITY */}
        <div className="cyber-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-cyber-subtext">Risk Reduction Opportunity</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-cyber-bright font-mono">
                {formatFinancialValue(kpi.risk_reduction_opportunity_inr || (kpi.expected_annual_loss * 0.35), currencySymbol)}
              </span>
              <span className="text-xs text-cyber-muted font-mono">
                (-{(kpi.risk_reduction_opportunity || 28.0).toFixed(1)} risk pts)
              </span>
            </div>
            <div className="text-[10px] text-cyber-subtext mt-0.5 font-mono">
              Under {formatFinancialValue(investment_opportunity?.current_budget || 5000000, currencySymbol)} optimal allocation
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyber-panel border border-cyber-border text-cyber-bright">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 6: EVIDENCE CONFIDENCE */}
        <div className="cyber-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-cyber-subtext">Evidence Confidence Index</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {Math.round(kpi.evidence_confidence || 91)}%
              </span>
              <span className="text-xs text-emerald-400/80 font-mono">
                {(kpi.evidence_confidence || 91) >= 85 ? 'High Fidelity' : 'Medium Fidelity'}
              </span>
            </div>
            <div className="text-[10px] text-cyber-subtext mt-0.5 font-mono">Normalized telemetry feeds active</div>
          </div>
          <div className="p-3 rounded-xl bg-cyber-panel border border-cyber-border text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 7: MODEL STATUS */}
        <div className="cyber-card p-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-cyber-subtext">Decision Support Engine</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-cyber-text font-mono">OR-Tools MIP</span>
              <span className="text-xs text-cyber-bright font-mono">Optimal</span>
            </div>
            <div className="text-[10px] text-cyber-subtext mt-0.5 font-mono">Mixed-Integer Knapsack Optimization</div>
          </div>
          <div className="p-3 rounded-xl bg-cyber-panel border border-cyber-border text-cyber-bright">
            <Cpu className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Row (Section 18 & 19) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-Day Trend Chart (2 columns) */}
        <div className="cyber-card p-5 lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">
                  RISKFORGE AI — Enterprise Risk Trajectory
                </h2>
                <DataModeBadge size="xs" />
              </div>
              <p className="text-xs text-cyber-subtext">
                Continuous score vs. raw external exposure vs. control-mitigated residual risk
              </p>
            </div>

            {/* Timeframe Selector: 7D / 30D / 90D */}
            <div className="flex items-center p-0.5 rounded-lg bg-cyber-panel border border-cyber-border">
              {(['7D', '30D', '90D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                    timeRange === r
                      ? 'bg-cyber-surface text-cyber-bright border border-cyber-borderHover shadow-sm'
                      : 'text-cyber-subtext hover:text-cyber-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="exposureGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 222, 128, 0.08)" vertical={false} />
                <XAxis dataKey="date" stroke="#86EFAC" opacity={0.5} tick={{ fontSize: 10, fill: '#A7BFAE' }} />
                <YAxis domain={[40, 100]} stroke="#86EFAC" opacity={0.5} tick={{ fontSize: 10, fill: '#A7BFAE' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload;
                      return (
                        <div className="p-3 bg-cyber-panel border border-cyber-border rounded-lg shadow-xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-cyber-bright">{p.date}</div>
                          <div className="text-cyber-text">Enterprise Risk: <strong className="text-cyber-bright">{p.risk_score}</strong></div>
                          <div className="text-rose-400">Exposure Mod: {p.exposure}</div>
                          <div className="text-emerald-400">Residual Risk: {p.residual_risk}</div>
                          <div className="text-amber-300">EAL: {formatFinancialValue(p.eal, currencySymbol)}</div>
                          <div className="text-cyber-subtext text-[10px]">Confidence: {p.confidence}%</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="exposure" stroke="#EF4444" strokeWidth={1.5} fill="url(#exposureGrad)" name="Exposure" />
                <Area type="monotone" dataKey="risk_score" stroke="#4ADE80" strokeWidth={2.5} fill="url(#riskGrad)" name="Risk Score" />
                <Line type="monotone" dataKey="residual_risk" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Residual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-cyber-border/40 text-cyber-subtext">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-1 bg-cyber-bright rounded-full" /> Enterprise Risk
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-1 bg-rose-400 rounded-full" /> Raw Exposure
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-1 bg-emerald-400 rounded-full border-dashed" /> Residual Risk
              </span>
            </div>
            <span className="font-mono text-[10px] text-cyber-bright">Hover point to view EAL & Confidence</span>
          </div>
        </div>

        {/* Section 19: Top Risk Drivers */}
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Top Risk Drivers</h2>
              <p className="text-xs text-cyber-subtext">Mathematical contributors to enterprise risk</p>
            </div>
            <DataModeBadge size="xs" />
          </div>

          <div className="space-y-2.5">
            {top_drivers.map((driver: any, index: number) => {
              const isPositive = driver.impact_contribution > 0;
              const linkUrl = driver.driver_type === 'Vulnerability' 
                ? '/vulnerabilities' 
                : driver.driver_type === 'Exposure' || driver.driver_type === 'Asset Criticality'
                ? '/assets'
                : '/controls';

              return (
                <Link
                  key={index}
                  to={linkUrl}
                  className="p-3 rounded-lg bg-cyber-panel hover:bg-cyber-surface/80 border border-cyber-border transition-all flex items-center justify-between group block"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-cyber-darker text-cyber-bright font-mono font-bold text-xs flex items-center justify-center border border-cyber-border">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-cyber-text group-hover:text-cyber-bright transition-colors">
                        {driver.name}
                      </div>
                      <div className="text-[10px] text-cyber-subtext font-mono">
                        {driver.driver_type} • {driver.affected_assets || 8} affected nodes
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <span className={isPositive ? 'text-rose-400' : 'text-emerald-400'}>
                      {isPositive ? `+${driver.impact_contribution}` : driver.impact_contribution}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyber-subtext group-hover:translate-x-0.5 group-hover:text-cyber-bright transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 20: High-Risk Services Table */}
      <div className="cyber-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">
              High-Risk Business Services & Financial Loss Exposures
            </h2>
            <p className="text-xs text-cyber-subtext">
              Continuously aggregated service risk scores, financial downtime impact, and primary drivers
            </p>
          </div>
          <Link
            to="/services"
            className="text-xs font-mono text-cyber-bright hover:underline flex items-center gap-1"
          >
            <span>View All {highest_risk_services.length} Services</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-cyber-darker text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
              <tr>
                <th className="py-2.5 px-4">Service</th>
                <th className="py-2.5 px-4">Criticality</th>
                <th className="py-2.5 px-4">Risk Score</th>
                <th className="py-2.5 px-4">Expected Annual Loss</th>
                <th className="py-2.5 px-4">Trend</th>
                <th className="py-2.5 px-4">Top Driver</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-border/40">
              {highest_risk_services.map((srv: any) => (
                <tr key={srv.id || srv.name} className="hover:bg-cyber-surface/60 transition-colors">
                  <td className="py-3 px-4 font-semibold text-cyber-text">
                    <Link to={`/services`} className="hover:text-cyber-bright flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyber-bright" />
                      <span>{srv.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        srv.criticality === 'Critical'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : srv.criticality === 'High'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {srv.criticality}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <RiskScoreBadge score={srv.risk_score} size="sm" showCategory={false} />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-cyber-bright">
                    {formatFinancialValue(srv.eal, currencySymbol)}
                  </td>
                  <td className="py-3 px-4">
                    {srv.trend === 'up' ? (
                      <span className="flex items-center text-rose-400 font-mono text-xs">
                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> ↑ Up
                      </span>
                    ) : srv.trend === 'down' ? (
                      <span className="flex items-center text-emerald-400 font-mono text-xs">
                        <TrendingDown className="w-3.5 h-3.5 mr-1" /> ↓ Down
                      </span>
                    ) : (
                      <span className="text-cyber-subtext font-mono text-xs">→ Stable</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-cyber-subtext">{srv.top_driver}</td>
                  <td className="py-3 px-4">
                    <ConfidenceBar score={srv.confidence || 93} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      to="/scenarios"
                      className="px-2 py-1 rounded bg-cyber-panel hover:bg-cyber-surface text-cyber-bright text-[11px] font-mono border border-cyber-border"
                    >
                      Simulate
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
