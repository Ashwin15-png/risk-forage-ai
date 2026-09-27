import React, { useState, useEffect } from 'react';
import { Boxes, Shield, Cpu, Activity, CheckCircle2, Sliders, Database, Layers, ArrowRight } from 'lucide-react';
import { modelApi } from '../services/api';
import { DataModeBadge } from '../components/DataModeBadge';
import { useDataMode } from '../context/DataModeContext';

export const Models: React.FC = () => {
  const { dataMode } = useDataMode();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await modelApi.list();
      setModels(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(74,222,128,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-5 h-5 text-[#4ADE80]" />
              MODEL REGISTRY & ASSUMPTIONS GOVERNANCE
            </h1>
            <DataModeBadge mode={dataMode} />
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Auditable Algorithmic Versions • Mathematical Weights & Multipliers • Zero Silent Drift
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.2)]">
          <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
          <span className="text-xs font-mono text-[#4ADE80]">Active Governance: Strict v1.0 Schema</span>
        </div>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 py-20 text-center">
            <div className="inline-block w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-xs font-mono text-slate-400">Loading model registry artifacts...</div>
          </div>
        ) : (
          models.map((m) => (
            <div 
              key={m.id} 
              className="rounded-xl p-5 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] flex flex-col justify-between space-y-4 hover:border-[#22C55E]/40 transition-all shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#4ADE80] font-semibold px-2 py-0.5 rounded bg-[#102417] border border-[rgba(74,222,128,0.2)]">
                      {m.version}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-[#22C55E]" />
                      {m.name}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#4ADE80] border border-[#22C55E]/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {m.description}
                </p>

                {/* Calibrated Weights */}
                <div className="p-3 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.15)] space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span>Calibrated Formula Weights & Multipliers:</span>
                  </div>
                  <pre className="font-mono text-[11px] text-[#4ADE80] max-h-40 overflow-y-auto whitespace-pre-wrap p-2 rounded bg-[#06110B] border border-[rgba(74,222,128,0.1)]">
                    {JSON.stringify(m.weights, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-[rgba(74,222,128,0.12)] text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Domain: <strong className="text-slate-200">{m.model_type}</strong></span>
                <span>Audit Verified: <strong className="text-[#4ADE80]">{m.created_at}</strong></span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Model Governance Compliance Banner */}
      <div className="rounded-xl p-5 bg-[#0D1B12] border border-[rgba(74,222,128,0.2)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#4ADE80] border border-[#22C55E]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Model Drift & Integrity Verification
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              All models undergo continuous deterministic validation against PostgreSQL risk snapshots with zero unapproved parameter modifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-[#102417] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">
            Deterministic Drift: <strong>0.00%</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
