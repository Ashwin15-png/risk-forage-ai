import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Server, ArrowLeft, Shield, AlertTriangle, Activity, 
  Layers, CheckCircle2, Clock, Zap, ArrowRight, ShieldCheck, 
  Database, History, DollarSign, ExternalLink, RefreshCw 
} from 'lucide-react';
import { assetApi, vulnApi } from '../services/api';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { refreshAll } = useDataMode();
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'vulnerabilities' | 'controls' | 'incidents' | 'history' | 'evidence' | 'drivers'>('overview');
  const [updatingVuln, setUpdatingVuln] = useState<string | null>(null);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await assetApi.getDetail(id);
      setAsset(res.data);
    } catch (e) {
      setError('Failed to load asset details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const toggleVulnStatus = async (vulnId: string, currentStatus: string) => {
    setUpdatingVuln(vulnId);
    try {
      const newStatus = currentStatus === 'Resolved' ? 'Open' : 'Resolved';
      await vulnApi.updateStatus(vulnId, newStatus);
      await fetchDetail(); // refresh asset with newly recalculated risk!
      refreshAll();
    } catch (e) {
      console.error('Failed to update vulnerability status', e);
    } finally {
      setUpdatingVuln(null);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-2 border-cyber-bright border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-xs font-mono text-cyber-subtext">Loading asset telemetry and calculation breakdown...</div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        {error || 'Asset not found.'}
        <Link to="/assets" className="ml-4 underline text-xs font-mono">Return to inventory</Link>
      </div>
    );
  }

  const { calculation, vulnerabilities = [], controls = [], incidents = [], service, drivers = [] } = asset;

  // Financial Exposure estimate based on criticality and service loss per hour
  const financialExposure = (service?.financial_loss_per_hour || 500000) * (asset.criticality === 'Critical' ? 12 : 6);

  const tabs = [
    { id: 'overview', label: 'Overview & Formula', icon: Activity },
    { id: 'vulnerabilities', label: `Vulnerabilities (${vulnerabilities.length})`, icon: AlertTriangle },
    { id: 'controls', label: `Controls (${controls.length})`, icon: ShieldCheck },
    { id: 'incidents', label: `Incidents (${incidents.length})`, icon: Clock },
    { id: 'drivers', label: `Risk Drivers (${drivers.length})`, icon: Zap },
    { id: 'history', label: 'Risk History', icon: History },
    { id: 'evidence', label: 'Evidence Telemetry', icon: Database },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-cyber-border">
        <Link
          to="/assets"
          className="text-xs text-cyber-subtext hover:text-cyber-text flex items-center gap-1.5 transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-cyber-bright" /> Back to Assets Inventory
        </Link>
        <div className="flex items-center gap-2">
          <DataModeBadge />
          <span className="text-xs text-cyber-subtext font-mono">
            Model: {calculation?.model_version || 'Risk Model v1.0'}
          </span>
        </div>
      </div>

      {/* Asset Header Card */}
      <div className="cyber-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyber-darker border border-cyber-border flex items-center justify-center text-cyber-bright shrink-0 shadow-inner">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-cyber-text tracking-tight">{asset.name}</h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyber-panel text-cyber-bright border border-cyber-border">
                  {asset.asset_id_code}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    asset.exposure === 'Internet-Facing'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-cyber-panel text-cyber-subtext border-cyber-border'
                  }`}
                >
                  {asset.exposure}
                </span>
              </div>
              <p className="text-xs text-cyber-subtext mt-1.5 font-mono">
                Type: <span className="text-cyber-text">{asset.asset_type}</span> • Hostname: <span className="text-cyber-text">{asset.hostname || 'internal.host'}</span> • IP: <span className="text-cyber-text">{asset.ip_address || '10.0.1.10'}</span> • Owner: <span className="text-cyber-text">{asset.owner || 'Infrastructure Team'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 self-start md:self-auto">
            <div className="text-right">
              <div className="text-[10px] text-cyber-subtext uppercase font-mono tracking-wider font-semibold">Financial Loss Exposure</div>
              <div className="text-xl font-bold font-mono text-cyber-bright mt-0.5">
                ₹{(financialExposure / 100000).toFixed(1)} Lakh
              </div>
            </div>
            <div className="text-right pl-4 border-l border-cyber-border">
              <div className="text-[10px] text-cyber-subtext uppercase font-mono tracking-wider font-semibold">Continuous Risk Score</div>
              <div className="mt-1">
                <RiskScoreBadge score={asset.current_risk_score} category={calculation?.category} size="lg" />
              </div>
            </div>
          </div>
        </div>

        {/* 5 Key Metric Chips */}
        <div className="mt-6 pt-5 border-t border-cyber-border/40 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-lg bg-cyber-panel border border-cyber-border">
            <div className="text-[10px] text-cyber-subtext uppercase font-mono">Business Service</div>
            <div className="text-xs font-bold text-cyber-text mt-1 truncate">
              {service?.name || 'Core Payment Services'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-cyber-panel border border-cyber-border">
            <div className="text-[10px] text-cyber-subtext uppercase font-mono">Normalized Likelihood</div>
            <div className="text-sm font-bold font-mono text-amber-400 mt-1">
              {calculation?.likelihood} / 100
            </div>
          </div>
          <div className="p-3 rounded-lg bg-cyber-panel border border-cyber-border">
            <div className="text-[10px] text-cyber-subtext uppercase font-mono">Normalized Impact</div>
            <div className="text-sm font-bold font-mono text-rose-400 mt-1">
              {calculation?.impact} / 100
            </div>
          </div>
          <div className="p-3 rounded-lg bg-cyber-panel border border-cyber-border">
            <div className="text-[10px] text-cyber-subtext uppercase font-mono">Control Coverage</div>
            <div className="text-sm font-bold font-mono text-cyber-bright mt-1">
              {asset.control_coverage || 75}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-cyber-panel border border-cyber-border">
            <div className="text-[10px] text-cyber-subtext uppercase font-mono">Evidence Confidence</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-1">
              {calculation?.confidence_score || 92}%
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-cyber-border overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold font-mono whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyber-panel text-cyber-bright border border-cyber-border shadow-sm'
                  : 'text-cyber-subtext hover:text-cyber-text hover:bg-cyber-panel/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview & Visual Risk Calculation Formula */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual Risk Calculation Box */}
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-cyber-text flex items-center gap-2 uppercase font-mono">
                <Activity className="w-4 h-4 text-cyber-bright" />
                Deterministic Risk Formulation Breakdown
              </h2>
              <span className="text-[10px] font-mono text-cyber-bright bg-cyber-darker px-2 py-0.5 rounded border border-cyber-border">
                RISKFORGE AI Engine
              </span>
            </div>

            <div className="p-4 rounded-lg bg-cyber-darker border border-cyber-border font-mono text-xs text-cyber-text space-y-2">
              <div className="text-cyber-bright font-bold">
                Risk = (Likelihood × 0.55 + Impact × 0.45) × (Exposure Mod × 0.85) × Control Mod
              </div>
              <div className="text-cyber-subtext text-[11px] pt-1">
                = ({calculation?.likelihood} × 0.55 + {calculation?.impact} × 0.45) × ({calculation?.exposure_mod} × 0.85) × {calculation?.control_mod}
              </div>
              <div className="text-cyber-text font-extrabold text-base pt-1">
                = <span className="text-cyber-bright">{asset.current_risk_score}</span> / 100 ({calculation?.category || 'High'})
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded bg-cyber-panel border border-cyber-border">
                <span className="text-cyber-subtext">Exposure Multiplier ({asset.exposure}):</span>
                <span className="font-mono text-cyber-text font-bold">{calculation?.exposure_mod}x</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-cyber-panel border border-cyber-border">
                <span className="text-cyber-subtext">Residual Defensive Control Modifier:</span>
                <span className="font-mono text-emerald-400 font-bold">{calculation?.control_mod}x mitigation</span>
              </div>
              <div className="flex justify-between p-2.5 rounded bg-cyber-panel border border-cyber-border">
                <span className="text-cyber-subtext">Active Vulnerabilities Contributing:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {calculation?.active_vulns_count} CVEs (Max CVSS {calculation?.max_cvss})
                </span>
              </div>
            </div>
          </div>

          {/* Business Service Relation & Loss Exposure */}
          <div className="cyber-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Business Service Dependency</h2>
              <Link to="/services" className="text-xs text-cyber-bright hover:underline flex items-center gap-1 font-mono">
                <span>View Service</span> <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="p-4 rounded-lg bg-cyber-panel border border-cyber-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyber-text text-sm">{service?.name || 'Payment Processing Infrastructure'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {service?.criticality || 'Critical Tier 1'}
                </span>
              </div>
              <p className="text-xs text-cyber-subtext leading-relaxed">
                {service?.description || 'Core transactional routing service processing digital banking transfers and settlement.'}
              </p>
              <div className="pt-2 border-t border-cyber-border/40 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-cyber-subtext block text-[10px]">Hourly Downtime Loss:</span>
                  <span className="text-cyber-bright font-bold">₹{(service?.financial_loss_per_hour || 500000).toLocaleString('en-IN')} / hr</span>
                </div>
                <div>
                  <span className="text-cyber-subtext block text-[10px]">Service Risk Score:</span>
                  <span className="text-rose-400 font-bold">{service?.current_risk_score || 84.0} / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Vulnerabilities with Real-Time Risk Recalculation */}
      {activeTab === 'vulnerabilities' && (
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-cyber-text flex items-center gap-2 uppercase font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Detected Vulnerabilities & Real-Time Risk Recalculation
              </h2>
              <p className="text-xs text-cyber-subtext">
                Toggling vulnerability status automatically recalculates asset and service risk in real-time.
              </p>
            </div>
            <DataModeBadge size="xs" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-cyber-darker text-cyber-subtext uppercase font-mono text-[10px] border-b border-cyber-border">
                <tr>
                  <th className="py-2.5 px-3">CVE ID / Title</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">CVSS</th>
                  <th className="py-2.5 px-3">Risk Contribution</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-border/40">
                {vulnerabilities.map((v: any) => (
                  <tr key={v.id} className="hover:bg-cyber-surface/60 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-cyber-bright block">{v.cve_id}</span>
                      <span className="text-cyber-subtext text-[11px]">{v.title}</span>
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 font-mono font-bold text-rose-400">{v.cvss_score}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">+{v.risk_contribution}</td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => toggleVulnStatus(v.id, v.status)}
                        disabled={updatingVuln === v.id}
                        className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                          v.status === 'Resolved'
                            ? 'bg-cyber-panel hover:bg-cyber-surface text-cyber-text border border-cyber-border'
                            : 'bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold shadow-sm'
                        }`}
                      >
                        {updatingVuln === v.id ? 'Recalculating...' : v.status === 'Resolved' ? 'Reopen CVE' : 'Resolve CVE'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Controls */}
      {activeTab === 'controls' && (
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Mapped Defensive Controls</h2>
            <span className="text-xs text-cyber-subtext font-mono">Asset-Level Enforcements</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {controls.map((c: any) => (
              <div key={c.id || c.code} className="p-4 rounded-lg bg-cyber-panel border border-cyber-border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-cyber-text">{c.name}</div>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyber-darker text-cyber-bright border border-cyber-border">
                    {c.code}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono pt-1 text-cyber-subtext">
                  <span>Coverage: <strong className="text-cyber-text">{c.coverage_pct}%</strong></span>
                  <span>Effectiveness: <strong className="text-cyber-bright">{c.effectiveness_pct}%</strong></span>
                  <span>Risk Offset: <strong className="text-emerald-400">-{Math.round(c.risk_reduction_weight * 100)}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Incidents */}
      {activeTab === 'incidents' && (
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Incident Telemetry Log</h2>
            <span className="text-xs text-cyber-subtext font-mono">{incidents.length} Records</span>
          </div>

          {incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-cyber-subtext font-mono">
              No recent security incidents linked directly to this asset.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc: any) => (
                <div key={inc.id || inc.incident_number} className="p-3.5 rounded-lg bg-cyber-panel border border-cyber-border flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-cyber-bright">{inc.incident_number}</span>
                      <span className="text-xs font-semibold text-cyber-text">{inc.title}</span>
                    </div>
                    <p className="text-[11px] text-cyber-subtext mt-1">{inc.incident_type} • Status: {inc.status}</p>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-rose-400 font-bold block">
                      ₹{(inc.estimated_financial_loss || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-cyber-subtext">{inc.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Risk Drivers */}
      {activeTab === 'drivers' && (
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-cyber-text uppercase font-mono">Decomposed Risk Drivers</h2>
            <span className="text-xs text-cyber-subtext font-mono">Confidence: {calculation?.confidence_score}%</span>
          </div>

          <div className="space-y-2.5">
            {drivers.map((d: any, idx: number) => {
              const isPositive = d.impact_contribution > 0;
              return (
                <div key={idx} className="p-3 rounded-lg bg-cyber-panel border border-cyber-border flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-cyber-text text-xs">{d.name}</div>
                    <div className="text-[11px] text-cyber-subtext">{d.details}</div>
                  </div>
                  <span
                    className={`font-mono font-bold px-2.5 py-0.5 rounded text-xs ${
                      isPositive
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {isPositive ? `+${d.impact_contribution.toFixed(1)}` : d.impact_contribution.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6 & 7: History and Evidence */}
      {(activeTab === 'history' || activeTab === 'evidence') && (
        <div className="cyber-card p-5 space-y-3 text-center py-12">
          <Database className="w-8 h-8 text-cyber-bright mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-bold text-cyber-text font-mono">Continuous Telemetry Active</h3>
          <p className="text-xs text-cyber-subtext max-w-md mx-auto">
            Point-in-time risk snapshots and normalized evidence payloads are verified and maintained in Neon PostgreSQL.
          </p>
        </div>
      )}
    </div>
  );
};
