import React, { useState, useEffect } from 'react';
import { 
  Activity, Filter, RefreshCw, X, Shield, Server, 
  AlertTriangle, ArrowRight, ExternalLink, Sliders 
} from 'lucide-react';
import { 
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, 
  ZAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';
import { riskApi, serviceApi } from '../services/api';
import { RiskScoreBadge } from '../components/RiskScoreBadge';
import { DataModeBadge } from '../components/DataModeBadge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { Link } from 'react-router-dom';
import { useDataMode } from '../context/DataModeContext';

export const RiskLandscape: React.FC = () => {
  const { lastUpdated, dataMode } = useDataMode();
  const [bubbles, setBubbles] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedBubble, setSelectedBubble] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState('');
  const [exposureFilter, setExposureFilter] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [minCoverage, setMinCoverage] = useState<number>(0);

  const fetchLandscape = async () => {
    setLoading(true);
    try {
      const [landRes, srvRes] = await Promise.all([
        riskApi.getLandscape({
          criticality: criticalityFilter || undefined,
          exposure: exposureFilter || undefined,
          service_id: serviceFilter || undefined,
        }),
        serviceApi.list()
      ]);
      setBubbles(landRes.data);
      setServices(srvRes.data);
      if (landRes.data.length > 0 && !selectedBubble) {
        setSelectedBubble(landRes.data[0]);
      }
    } catch (e) {
      console.error('Failed to load risk landscape', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandscape();
  }, [criticalityFilter, exposureFilter, serviceFilter, lastUpdated]);

  const getColorBySeverity = (severity: string, score: number) => {
    if (score >= 75 || severity?.toLowerCase() === 'critical') return '#EF4444';
    if (score >= 50 || severity?.toLowerCase() === 'high') return '#F97316';
    if (score >= 25 || severity?.toLowerCase() === 'medium') return '#EAB308';
    return '#22C55E';
  };

  // Client-side filtering for risk level and control coverage
  const filteredBubbles = bubbles.filter((b) => {
    if (riskLevelFilter === 'Critical' && b.risk_score < 75) return false;
    if (riskLevelFilter === 'High' && (b.risk_score < 50 || b.risk_score >= 75)) return false;
    if (riskLevelFilter === 'Moderate' && (b.risk_score < 25 || b.risk_score >= 50)) return false;
    if (riskLevelFilter === 'Low' && b.risk_score >= 25) return false;
    if (minCoverage > 0 && (b.control_coverage || 0) < minCoverage) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Title & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cyber-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-cyber-text flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyber-bright" />
              RISKFORGE AI — RISK LANDSCAPE
            </h1>
            <DataModeBadge />
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyber-panel text-cyber-muted border border-cyber-border">
              {filteredBubbles.length} Nodes Mapped
            </span>
          </div>
          <p className="text-xs text-cyber-subtext mt-1">
            Likelihood vs. Impact 2D Scatter Matrix • Bubble Size = Financial Exposure Modifier • Color = Quantified Risk
          </p>
        </div>

        <button
          onClick={fetchLandscape}
          className="px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright hover:border-cyber-borderHover text-xs flex items-center gap-1.5 transition-all self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Scatter
        </button>
      </div>

      {/* Multi-Factor Filter Strip */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-cyber-panel border border-cyber-border text-xs">
        <div className="flex items-center gap-2 text-cyber-subtext">
          <Filter className="w-3.5 h-3.5 text-cyber-bright" />
          <span className="font-semibold text-cyber-text">Filters:</span>
        </div>

        <select
          value={riskLevelFilter}
          onChange={(e) => setRiskLevelFilter(e.target.value)}
          className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
        >
          <option value="">All Risk Levels</option>
          <option value="Critical">Critical (≥ 75)</option>
          <option value="High">High (50 - 74)</option>
          <option value="Moderate">Moderate (25 - 49)</option>
          <option value="Low">Low (&lt; 25)</option>
        </select>

        <select
          value={criticalityFilter}
          onChange={(e) => setCriticalityFilter(e.target.value)}
          className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
        >
          <option value="">All Criticalities</option>
          <option value="Critical">Critical Assets</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={exposureFilter}
          onChange={(e) => setExposureFilter(e.target.value)}
          className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
        >
          <option value="">All Exposure Zones</option>
          <option value="Internet-Facing">Internet-Facing</option>
          <option value="DMZ">DMZ Boundary</option>
          <option value="Internal">Internal Core</option>
          <option value="Partner">Partner Integration</option>
        </select>

        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-cyber-darker border border-cyber-border rounded-lg px-2.5 py-1.5 text-cyber-text focus:outline-none focus:border-cyber-bright"
        >
          <option value="">All Business Services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {(riskLevelFilter || criticalityFilter || exposureFilter || serviceFilter || minCoverage > 0) && (
          <button
            onClick={() => {
              setRiskLevelFilter('');
              setCriticalityFilter('');
              setExposureFilter('');
              setServiceFilter('');
              setMinCoverage(0);
            }}
            className="text-[11px] text-rose-400 hover:underline font-mono ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Scatter Grid & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scatter Matrix (2 columns) */}
        <div className="cyber-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-cyber-subtext border-b border-cyber-border/40 pb-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical Risk (≥75)
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High Risk (50-74)
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-cyber-primary" /> Low/Moderate Risk (&lt;50)
              </span>
            </div>
            <span className="font-mono text-cyber-bright text-[11px]">Click any node for deep quantification</span>
          </div>

          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 222, 128, 0.08)" />
                <XAxis
                  type="number"
                  dataKey="likelihood"
                  name="Likelihood"
                  domain={[0, 100]}
                  unit="%"
                  stroke="#86EFAC"
                  opacity={0.6}
                  tick={{ fontSize: 10, fill: '#A7BFAE' }}
                  label={{ value: 'Likelihood Score (CVEs & Threat Context) →', position: 'bottom', offset: 0, fill: '#A7BFAE', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="impact"
                  name="Impact"
                  domain={[0, 100]}
                  unit="%"
                  stroke="#86EFAC"
                  opacity={0.6}
                  tick={{ fontSize: 10, fill: '#A7BFAE' }}
                  label={{ value: '← Business Impact Score (Asset Criticality & Downtime Loss)', angle: -90, position: 'left', offset: 0, fill: '#A7BFAE', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="size" range={[60, 420]} name="Exposure" />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(74,222,128,0.3)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-cyber-panel border border-cyber-border rounded-lg shadow-2xl text-xs space-y-1 font-mono">
                          <div className="font-bold text-cyber-bright text-sm">{data.name}</div>
                          <div className="text-cyber-text">Code: <span className="text-cyber-muted">{data.asset_id_code}</span></div>
                          <div className="text-cyber-subtext">Service: {data.service_name || 'Infrastructure'}</div>
                          <div className="text-cyber-text">Risk Score: <strong className="text-rose-400">{data.risk_score}</strong></div>
                          <div className="text-cyber-subtext">Likelihood: {data.likelihood} | Impact: {data.impact}</div>
                          <div className="text-cyber-bright">Exposure: {data.exposure}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter
                  name="Assets"
                  data={filteredBubbles}
                  onClick={(e) => setSelectedBubble(e)}
                  className="cursor-pointer"
                >
                  {filteredBubbles.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColorBySeverity(entry.criticality, entry.risk_score)}
                      fillOpacity={selectedBubble?.id === entry.id ? 1.0 : 0.75}
                      stroke={selectedBubble?.id === entry.id ? '#FFFFFF' : 'rgba(0,0,0,0.4)'}
                      strokeWidth={selectedBubble?.id === entry.id ? 2 : 1}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Selected Asset/Node Detail Panel (1 column) */}
        <div className="cyber-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
            <span className="text-xs uppercase font-mono text-cyber-subtext">Node Inspection</span>
            <DataModeBadge size="xs" />
          </div>

          {selectedBubble ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-cyber-text">{selectedBubble.name}</h3>
                  <RiskScoreBadge score={selectedBubble.risk_score} />
                </div>
                <div className="text-xs font-mono text-cyber-bright mt-0.5">
                  {selectedBubble.asset_id_code} • {selectedBubble.asset_type || 'Server'}
                </div>
                <div className="text-xs text-cyber-subtext mt-1">
                  Service: <strong className="text-cyber-text">{selectedBubble.service_name || 'Core Services'}</strong>
                </div>
              </div>

              {/* Likelihood & Impact Bars */}
              <div className="space-y-2 p-3 rounded-lg bg-cyber-panel border border-cyber-border text-xs">
                <div>
                  <div className="flex justify-between text-cyber-subtext mb-1">
                    <span>Likelihood:</span>
                    <span className="font-mono text-cyber-text font-bold">{selectedBubble.likelihood} / 100</span>
                  </div>
                  <div className="w-full bg-cyber-darker rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${selectedBubble.likelihood}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-cyber-subtext mb-1">
                    <span>Impact:</span>
                    <span className="font-mono text-cyber-text font-bold">{selectedBubble.impact} / 100</span>
                  </div>
                  <div className="w-full bg-cyber-darker rounded-full h-1.5 overflow-hidden">
                    <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${selectedBubble.impact}%` }} />
                  </div>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded bg-cyber-darker border border-cyber-border">
                  <span className="text-cyber-subtext block text-[10px]">Exposure:</span>
                  <span className="font-semibold text-cyber-bright font-mono">{selectedBubble.exposure}</span>
                </div>
                <div className="p-2.5 rounded bg-cyber-darker border border-cyber-border">
                  <span className="text-cyber-subtext block text-[10px]">Criticality:</span>
                  <span className="font-semibold text-rose-400 font-mono">{selectedBubble.criticality}</span>
                </div>
                <div className="p-2.5 rounded bg-cyber-darker border border-cyber-border">
                  <span className="text-cyber-subtext block text-[10px]">Control Coverage:</span>
                  <span className="font-semibold text-cyber-text font-mono">{selectedBubble.control_coverage || 80}%</span>
                </div>
                <div className="p-2.5 rounded bg-cyber-darker border border-cyber-border">
                  <span className="text-cyber-subtext block text-[10px]">Active CVEs:</span>
                  <span className="font-semibold text-amber-400 font-mono">{selectedBubble.vulnerabilities_count || 2} detected</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Link
                  to={`/assets/${selectedBubble.id}`}
                  className="w-full py-2 px-3 rounded-lg bg-cyber-bright hover:bg-cyber-primary text-[#06110B] font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <span>Open Complete Asset Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to="/scenarios"
                  className="w-full py-2 px-3 rounded-lg bg-cyber-panel hover:bg-cyber-surface border border-cyber-border text-cyber-bright text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Run Countermeasure Simulation</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-cyber-subtext">
              Select any bubble in the scatter matrix to view quantified exposure and drivers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
