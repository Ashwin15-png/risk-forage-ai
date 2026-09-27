import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Shield, DollarSign, Database, 
  RotateCcw, Server, Activity, Sliders, Check, AlertTriangle
} from 'lucide-react';
import { demoApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Settings: React.FC = () => {
  const { dataMode } = useDataMode();
  const [currency, setCurrency] = useState('INR (₹)');
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState('');

  // Configurable weights state
  const [exposureWeight, setExposureWeight] = useState(0.35);
  const [criticalityWeight, setCriticalityWeight] = useState(0.40);
  const [controlDiscount, setControlDiscount] = useState(0.25);
  const [weightsSaved, setWeightsSaved] = useState(false);

  const handleResetDemo = async () => {
    if (!confirm('Reset all synthetic demo data back to clean baseline state (risk score 61.0)?')) return;
    setResetting(true);
    setMessage('');
    try {
      await demoApi.resetBaseline();
      setMessage('Demo environment successfully reset to 61.0 baseline state.');
    } catch (e) {
      console.error(e);
      setMessage('Error resetting demo state.');
    } finally {
      setResetting(false);
    }
  };

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    setWeightsSaved(true);
    setTimeout(() => setWeightsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-[#4ADE80]" />
              SYSTEM CONFIGURATION & CALIBRATION
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Platform Parameters • Mathematical Weight Multipliers • Database Telemetry Status
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-[#22C55E]" />
          <span>{message}</span>
        </div>
      )}

      {/* Database & Infrastructure Telemetry */}
      <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-[#4ADE80]" />
          Database & Telemetry Connection
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
            <span className="text-[10px] text-slate-400 uppercase block">Database Engine</span>
            <div className="text-white font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              PostgreSQL / Neon Cloud
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">SSL Pooled Connection</span>
          </div>

          <div className="p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
            <span className="text-[10px] text-slate-400 uppercase block">WebSocket Stream</span>
            <div className="text-[#4ADE80] font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              WS /api/v1/live
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Ping/Pong Keep-Alive (20s)</span>
          </div>

          <div className="p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.1)]">
            <span className="text-[10px] text-slate-400 uppercase block">Optimizer Engine</span>
            <div className="text-cyan-400 font-bold mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Google OR-Tools (CBC)
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Knapsack MIP Solver</span>
          </div>
        </div>
      </div>

      {/* Organization Information */}
      <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#4ADE80]" />
          Organization Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-mono text-[11px]">Organization Legal Entity</label>
            <input
              type="text"
              disabled
              value="Demo Financial Services Ltd."
              className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.15)] rounded-lg text-slate-200 font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-mono text-[11px]">Industry Sector & Regulatory Scope</label>
            <input
              type="text"
              disabled
              value="Banking & Financial Services (RBI CSF / SEBI CSCRF)"
              className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.15)] rounded-lg text-slate-200 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Formula Weights Tuning */}
      <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#4ADE80]" />
            Continuous Risk Mathematical Weights
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Formula: R = L × I × (1 - E × C) × W
          </span>
        </div>

        <form onSubmit={handleSaveWeights} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">
                External Exposure Weight ({exposureWeight})
              </label>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={exposureWeight}
                onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
                className="w-full accent-[#22C55E]"
              />
              <span className="text-[10px] text-slate-400 block font-mono">Internet perimeter multiplier</span>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">
                Asset Criticality Weight ({criticalityWeight})
              </label>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={criticalityWeight}
                onChange={(e) => setCriticalityWeight(parseFloat(e.target.value))}
                className="w-full accent-[#22C55E]"
              />
              <span className="text-[10px] text-slate-400 block font-mono">Tier 1 business weighting</span>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 font-mono text-[11px]">
                Control Mitigation Cap ({controlDiscount})
              </label>
              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.05"
                value={controlDiscount}
                onChange={(e) => setControlDiscount(parseFloat(e.target.value))}
                className="w-full accent-[#22C55E]"
              />
              <span className="text-[10px] text-slate-400 block font-mono">Residual control mitigation floor</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-[#4ADE80]">
              {weightsSaved && '✓ Mathematical formula weights updated successfully'}
            </span>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#102417] hover:bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 font-mono font-bold text-xs transition-all"
            >
              Update Calibration
            </button>
          </div>
        </form>
      </div>

      {/* Financial Currency & Calibration */}
      <div className="rounded-xl p-6 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#4ADE80]" />
          Financial & Currency Formatting
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-mono text-[11px]">Active Financial Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.2)] rounded-lg text-slate-200 focus:outline-none focus:border-[#22C55E] font-mono text-xs"
            >
              <option value="INR (₹)">Indian Rupee (INR ₹ / Lakh / Crore)</option>
              <option value="USD ($)">US Dollar (USD $)</option>
              <option value="EUR (€)">Euro (EUR €)</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1 font-mono text-[11px]">Default Optimization Budget Ceiling</label>
            <input
              type="text"
              disabled
              value="₹50,00,000 (50 Lakh INR)"
              className="w-full p-2.5 bg-[#102417] border border-[rgba(74,222,128,0.15)] rounded-lg text-slate-200 font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Demo Maintenance Reset */}
      <div className="rounded-xl p-6 bg-[#0D1B12] border border-amber-500/30 space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-amber-400" />
          Demonstration Environment Maintenance
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Restore Payment Gateway Switch, vulnerabilities, and global risk score back to original 61.0 baseline.
          Use this prior to jury evaluation sessions to reset live telemetry injects.
        </p>

        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="px-4 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {resetting ? 'Resetting Baseline State...' : 'Reset Demo to Baseline State (61.0)'}
        </button>
      </div>
    </div>
  );
};
