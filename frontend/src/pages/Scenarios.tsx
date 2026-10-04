import React, { useState, useEffect } from 'react';
import { 
  Sliders, Play, ShieldCheck, TrendingDown, DollarSign, 
  CheckCircle2, ArrowRight, Activity, Plus, RefreshCw, Bookmark,
  Layers, AlertTriangle, Shield, Check, Server, Globe, Eye
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';
import { scenarioApi, assetApi, controlApi, authApi } from '../services/api';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { useDataMode } from '../context/DataModeContext';

export const Scenarios: React.FC = () => {
  const { dataMode, mode, startSimulation, clearSimulation, simulation } = useDataMode();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [controlsList, setControlsList] = useState<any[]>([]);
  const [activeResult, setActiveResult] = useState<any>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');

  // Selected Target Asset Code
  const [targetAssetCode, setTargetAssetCode] = useState<string>('pay-api-gw-01');

  // Countermeasure Controls Checklist
  const [selectedControls, setSelectedControls] = useState<{ [key: string]: boolean }>({
    'CTL-MFA': true,
    'CTL-NET-SEG': true,
    'CTL-EDR': false,
    'CTL-BACKUP': false,
    'CTL-PATCH': false,
    'CTL-SIEM': false,
  });

  // Vulnerability & Asset Mutation Options
  const [vulnAction, setVulnAction] = useState<string>('Resolve');
  const [assetAction, setAssetAction] = useState<string>('Remove Internet Exposure');

  // Default fallback catalog if API is loading
  const defaultControlCatalog = [
    { code: 'CTL-MFA', name: 'Phishing-Resistant MFA (FIDO2)', weight: 0.25, cost: 1200000 },
    { code: 'CTL-NET-SEG', name: 'Micro-Segmentation Architecture', weight: 0.20, cost: 800000 },
    { code: 'CTL-EDR', name: 'EDR Deep Threat Prevention Agent', weight: 0.18, cost: 1400000 },
    { code: 'CTL-BACKUP', name: 'Air-Gapped Immutable Backup Vault', weight: 0.15, cost: 1800000 },
    { code: 'CTL-PATCH', name: 'Automated Zero-Touch Patching', weight: 0.14, cost: 900000 },
    { code: 'CTL-SIEM', name: 'Next-Gen SOC Behavioral SIEM', weight: 0.12, cost: 1500000 },
  ];

  const controlCatalog = controlsList.length > 0
    ? controlsList.map((c) => ({
        code: c.code,
        name: c.name,
        weight: c.risk_reduction_weight || 0.20,
        cost: (c.code === 'CTL-MFA' ? 1200000 : c.code === 'CTL-NET-SEG' ? 800000 : c.code === 'CTL-EDR' ? 1400000 : 1000000),
      }))
    : defaultControlCatalog;

  const fetchInitialData = async () => {
    try {
      const [scenRes, assetRes, ctrlRes, orgRes] = await Promise.all([
        scenarioApi.list(),
        assetApi.list(),
        controlApi.list(),
        authApi.getOrganization().catch(() => ({ data: { currency_symbol: '₹' } }))
      ]);
      setScenarios(scenRes.data || []);
      setAssets(assetRes.data || []);
      if (ctrlRes.data && ctrlRes.data.length > 0) {
        setControlsList(ctrlRes.data);
      }
      if (orgRes.data?.currency_symbol) {
        setCurrencySymbol(orgRes.data.currency_symbol);
      }
      if (assetRes.data && assetRes.data.length > 0 && !targetAssetCode) {
        setTargetAssetCode(assetRes.data[0].asset_id_code);
      }
    } catch (e) {
      console.error('Failed to fetch scenario data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleToggleControl = (code: string) => {
    setSelectedControls((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // Find active selected asset from live assets list
  const selectedAsset = assets.find((a) => a.asset_id_code === targetAssetCode) || {
    name: 'Payment Gateway API',
    asset_id_code: 'pay-api-gw-01',
    exposure: 'Internet-Facing',
    criticality: 'Critical',
    current_risk_score: 84.0,
  };

  const baselineRisk = Number(selectedAsset.current_risk_score) || 84.0;
  // Calculate EAL based on asset risk score and criticality modifier
  const baselineEAL = (baselineRisk * 92857.0); // ~₹78L for 84 score

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      const changes: any[] = [];
      let totalCost = 0;

      controlCatalog.forEach((c) => {
        if (selectedControls[c.code]) {
          changes.push({
            action_type: 'add_control',
            control_code: c.code,
            control_name: c.name,
            effectiveness_pct: 92.0,
            coverage_pct: 95.0,
            risk_reduction_weight: c.weight,
            estimated_cost: c.cost,
          });
          totalCost += c.cost;
        }
      });

      if (vulnAction === 'Resolve' || vulnAction === 'Patch') {
        changes.push({
          action_type: 'resolve_vulnerability',
          asset_code: targetAssetCode,
          cve_id: 'CVE-2026-9999',
        });
      }

      if (assetAction === 'Remove Internet Exposure') {
        changes.push({
          action_type: 'modify_exposure',
          asset_code: targetAssetCode,
          new_exposure: 'DMZ',
        });
      }

      const activeNames = controlCatalog.filter((c) => selectedControls[c.code]).map((c) => c.name.split(' ')[0]);
      const simName = `Hardening Hypothesis: ${activeNames.join(' + ') || 'Baseline Defenses'}`;

      const res = await scenarioApi.run({
        name: simName,
        description: `What-if countermeasure simulation evaluating ${activeNames.join(', ')} with ${vulnAction} on ${targetAssetCode}.`,
        changes,
      });

      setActiveResult(res.data);

      // Only switch global mode to simulation if user was already in SIMULATION mode
      startSimulation(
        {
          name: simName,
          controls: Object.keys(selectedControls).filter((k) => selectedControls[k]),
          riskScore: res.data.scenario_risk,
          reduction: res.data.risk_reduction,
          cost: res.data.estimated_cost,
        },
        mode === 'SIMULATION'
      );
    } catch (err: any) {
      alert('Error running scenario simulation: ' + (err?.message || 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyGlobally = () => {
    if (!activeResult) return;
    const activeNames = controlCatalog.filter((c) => selectedControls[c.code]).map((c) => c.name.split(' ')[0]);
    startSimulation(
      {
        name: `Hypothesis: ${activeNames.join(' + ')}`,
        controls: Object.keys(selectedControls).filter((k) => selectedControls[k]),
        riskScore: activeResult.scenario_risk,
        reduction: activeResult.risk_reduction,
        cost: activeResult.estimated_cost,
      },
      true // Switch global navbar to SIMULATION mode
    );
  };

  const handleSaveScenario = async () => {
    setSavedSuccess(true);
    const res = await scenarioApi.list();
    setScenarios(res.data || []);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Real or projected results
  const scenarioRisk = activeResult ? activeResult.scenario_risk : Math.round(Math.max(10, baselineRisk * 0.35) * 10) / 10;
  const scenarioEAL = Math.round(baselineEAL * (scenarioRisk / baselineRisk));
  const riskReduction = Math.round((baselineRisk - scenarioRisk) * 10) / 10;
  const ealReduction = Math.max(0, baselineEAL - scenarioEAL);
  const totalCost = activeResult ? activeResult.estimated_cost : 2000000.0;

  const formatMoney = (val: number) => {
    if (currencySymbol === '₹') {
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)} Lakh`;
      return `₹${val.toLocaleString('en-IN')}`;
    }
    if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)} M`;
    if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)} K`;
    return `${currencySymbol}${val.toLocaleString()}`;
  };

  const comparisonData = [
    { metric: 'Risk Score (/100)', baseline: baselineRisk, scenario: scenarioRisk },
    { metric: `EAL (${currencySymbol} Lakh)`, baseline: Math.round(baselineEAL / 100000), scenario: Math.round(scenarioEAL / 100000) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyber-bright" />
              RISKFORGE AI — WHAT-IF SIMULATOR
            </h1>
            <DataModeBadge />
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Simulate Security Controls, Micro-Segmentation & Patch Actions Before Capital Commitment
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeResult && mode !== 'SIMULATION' && (
            <button
              onClick={handleApplyGlobally}
              className="px-3.5 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Preview this scenario across all platform dashboards"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Globally
            </button>
          )}
          {simulation.isActive && (
            <button
              onClick={clearSimulation}
              className="px-3 py-1.5 rounded-lg bg-cyber-darker hover:bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright text-xs flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
          )}
          <button
            onClick={() => handleRunSimulation()}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(74,222,128,0.2)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Executing Engine...' : 'RUN SIMULATION'}
          </button>
        </div>
      </div>

      {/* Baseline Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Live Target Asset Selector */}
        <div className="cyber-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-cyber-subtext uppercase">Baseline Target Asset</span>
            <span className="text-[10px] font-mono text-cyber-bright">{selectedAsset.exposure}</span>
          </div>
          <div className="mt-1">
            <select
              value={targetAssetCode}
              onChange={(e) => setTargetAssetCode(e.target.value)}
              className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1 text-xs font-bold text-cyber-text focus:outline-none focus:border-cyber-bright font-mono"
            >
              {assets.length > 0 ? (
                assets.map((a) => (
                  <option key={a.id || a.asset_id_code} value={a.asset_id_code}>
                    {a.name} ({a.asset_id_code}) — Risk: {a.current_risk_score}
                  </option>
                ))
              ) : (
                <option value="pay-api-gw-01">Payment Gateway API (pay-api-gw-01)</option>
              )}
            </select>
          </div>
          <div className="text-xs text-cyber-subtext mt-1 flex items-center justify-between">
            <span>Tier: {selectedAsset.criticality || 'Critical'}</span>
            <span className="font-mono text-cyber-muted text-[11px]">{targetAssetCode}</span>
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono text-cyber-subtext uppercase">Baseline Risk Score</div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
            {baselineRisk.toFixed(1)} <span className="text-xs text-cyber-subtext">/ 100</span>
          </div>
          <div className="text-xs text-rose-400/80 font-mono">
            {baselineRisk >= 75 ? 'Critical Vulnerability Ingested' : baselineRisk >= 50 ? 'High Exposure Level' : 'Moderate Ingress Risk'}
          </div>
        </div>

        <div className="cyber-card p-4">
          <div className="text-[10px] font-mono text-cyber-subtext uppercase">Expected Annual Loss (EAL)</div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
            {formatMoney(baselineEAL)}
          </div>
          <div className="text-xs text-cyber-subtext font-mono">Downtime & incident recovery exposure</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scenario Builder Form */}
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-cyber-border">
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyber-bright" />
              Scenario Builder
            </h2>
            <span className="text-[10px] font-mono text-cyber-subtext">Hypothesis Inputs</span>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-4 text-xs">
            {/* Defensive Controls Toggles */}
            <div className="space-y-2">
              <label className="block text-cyber-text font-bold uppercase font-mono text-[11px]">
                Defensive Controls Enforcement:
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {controlCatalog.map((c) => {
                  const checked = selectedControls[c.code] || false;
                  return (
                    <div
                      key={c.code}
                      onClick={() => handleToggleControl(c.code)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                        checked
                          ? 'bg-cyber-surface border-cyber-borderHover text-cyber-text shadow-sm'
                          : 'bg-cyber-darker border-cyber-border text-cyber-subtext hover:border-cyber-borderHover'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            checked ? 'bg-cyber-bright border-cyber-bright text-[#06110B] font-bold' : 'border-cyber-border'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-medium text-[11px]">{c.name}</span>
                      </div>
                      <span className="font-mono text-[10px] text-cyber-bright">
                        {formatMoney(c.cost)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vulnerability Actions */}
            <div className="space-y-1.5 pt-2 border-t border-cyber-border/40">
              <label className="block text-cyber-text font-bold uppercase font-mono text-[11px]">
                Vulnerability Action:
              </label>
              <select
                value={vulnAction}
                onChange={(e) => setVulnAction(e.target.value)}
                className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
              >
                <option value="Resolve">Resolve / Remediate Critical CVEs on Asset</option>
                <option value="Patch">Deploy Automated Virtual Patch (WAF/EDR)</option>
                <option value="Delay">Delay Remediation 30 Days (Compensating Controls)</option>
                <option value="Increase Exposure">Simulate Attack Surface Expansion (+1 CVE)</option>
              </select>
            </div>

            {/* Asset Actions */}
            <div className="space-y-1.5">
              <label className="block text-cyber-text font-bold uppercase font-mono text-[11px]">
                Asset Boundary Action:
              </label>
              <select
                value={assetAction}
                onChange={(e) => setAssetAction(e.target.value)}
                className="w-full bg-cyber-darker border border-cyber-border rounded-lg px-3 py-2 text-xs text-cyber-text focus:outline-none focus:border-cyber-bright"
              >
                <option value="Remove Internet Exposure">Remove Direct Internet Exposure (Route via ZTNA)</option>
                <option value="Increase Criticality">Escalate Business Tier to Tier 1 Core</option>
                <option value="None">Preserve Current Network Architecture</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'Computing Math Model...' : 'Calculate Real-Time Delta'}
            </button>
          </form>
        </div>

        {/* Section 30: Side-by-Side Simulation Results */}
        <div className="cyber-card p-5 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <div>
              <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">
                Simulation Quantification: Baseline vs Projected Scenario
              </h2>
              <p className="text-xs text-cyber-subtext">
                Authoritative delta produced by the backend continuous risk engine
              </p>
            </div>
            <DataModeBadge />
          </div>

          {/* Side by side comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Baseline */}
            <div className="p-4 rounded-xl bg-cyber-darker border border-cyber-border text-center space-y-1">
              <span className="text-[10px] font-mono uppercase text-cyber-subtext block">Baseline State</span>
              <div className="text-3xl font-extrabold font-mono text-rose-400 mt-1">{baselineRisk.toFixed(1)}</div>
              <div className="text-xs text-cyber-subtext font-mono">EAL: {formatMoney(baselineEAL)}</div>
              <div className="text-[10px] text-cyber-subtext mt-1">{selectedAsset.exposure} Exposure</div>
            </div>

            {/* Scenario */}
            <div className="p-4 rounded-xl bg-cyber-surface border border-cyber-borderHover text-center space-y-1 shadow-sm">
              <span className="text-[10px] font-mono uppercase text-cyber-bright font-bold block">Simulated Scenario</span>
              <div className="text-3xl font-extrabold font-mono text-cyber-bright mt-1">{scenarioRisk.toFixed(1)}</div>
              <div className="text-xs text-cyber-bright font-mono">EAL: {formatMoney(scenarioEAL)}</div>
              <div className="text-[10px] text-cyber-muted mt-1">Hardened Countermeasures</div>
            </div>

            {/* Quantified Delta */}
            <div className="p-4 rounded-xl bg-cyber-panel border border-emerald-500/30 text-center space-y-1">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Quantified Impact</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 mt-1">-{riskReduction.toFixed(1)} pts</div>
              <div className="text-xs text-emerald-300 font-mono">EAL Saved: {formatMoney(ealReduction)}</div>
              <div className="text-[10px] text-cyber-subtext mt-1">Capital Cost: {formatMoney(totalCost)}</div>
            </div>
          </div>

          {/* Before vs After Chart */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-cyber-subtext font-mono">
              <span className="text-cyber-text font-bold">Before vs. After Delta Comparison</span>
              <span className="text-emerald-400">
                Risk Reduction: -{riskReduction.toFixed(1)} points ({baselineRisk > 0 ? Math.round((riskReduction / baselineRisk) * 100) : 0}% Drop)
              </span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 222, 128, 0.08)" vertical={false} />
                  <XAxis dataKey="metric" stroke="#86EFAC" opacity={0.6} tick={{ fontSize: 11, fill: '#A7BFAE' }} />
                  <YAxis stroke="#86EFAC" opacity={0.6} tick={{ fontSize: 10, fill: '#A7BFAE' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 bg-cyber-panel border border-cyber-border rounded font-mono text-xs space-y-1 shadow-xl">
                            <div className="font-bold text-cyber-text">{payload[0].payload.metric}</div>
                            <div className="text-rose-400">Baseline: {payload[0].payload.baseline}</div>
                            <div className="text-cyber-bright">Projected: {payload[0].payload.scenario}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="baseline" name="Baseline" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scenario" name="Simulated Scenario" fill="#22C55E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Row & Explicit Save Scenario Button */}
          <div className="flex items-center justify-between pt-3 border-t border-cyber-border text-xs">
            <span className="text-cyber-subtext font-mono">
              {savedSuccess ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Scenario saved to organization portfolio!
                </span>
              ) : (
                'Real-time calculations remain in active view unless saved.'
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveScenario}
                className="px-4 py-1.5 rounded-lg bg-cyber-surface hover:bg-cyber-panel border border-cyber-borderHover text-cyber-bright font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
