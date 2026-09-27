import React, { useState } from 'react';
import { 
  Play, RotateCcw, AlertTriangle, ShieldCheck, ArrowRight, 
  CheckCircle, Zap, TrendingUp, Sliders, FileText, X, Check
} from 'lucide-react';
import { demoApi } from '../services/api';
import { RiskScoreBadge } from './RiskScoreBadge';

interface LiveRiskDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoCompleted?: () => void;
}

export const LiveRiskDemoModal: React.FC<LiveRiskDemoModalProps> = ({
  isOpen,
  onClose,
  onDemoCompleted,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [injectedData, setInjectedData] = useState<any>(null);
  const [mitigationData, setMitigationData] = useState<any>(null);

  if (!isOpen) return null;

  const handleStep2Inject = async () => {
    setLoading(true);
    try {
      const res = await demoApi.injectVulnerability();
      setInjectedData(res.data);
      setCurrentStep(3);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStep5Simulate = async () => {
    setLoading(true);
    try {
      const res = await demoApi.simulateMitigation();
      setMitigationData(res.data);
      setCurrentStep(5);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await demoApi.resetBaseline();
      setCurrentStep(1);
      setInjectedData(null);
      setMitigationData(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0D1B12] border border-[rgba(74,222,128,0.3)] rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.15)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(74,222,128,0.15)] bg-[#102417]/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#4ADE80]">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                Continuous Risk & Investment Guided Demo
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#22C55E]/10 text-[#4ADE80] border border-[#22C55E]/30">
                  RISKFORGE AI
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Live Ingestion → Recalculation → What-If Simulation → OR-Tools Optimization
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#102417]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-5 px-6 py-3 border-b border-[rgba(74,222,128,0.12)] bg-[#06110B] text-xs font-mono">
          {[
            { step: 1, label: '1. Baseline' },
            { step: 2, label: '2. Ingest CVE' },
            { step: 3, label: '3. Recalculate' },
            { step: 4, label: '4. What-If' },
            { step: 5, label: '5. Optimize' },
          ].map((item) => (
            <div
              key={item.step}
              className={`flex items-center gap-2 ${
                currentStep >= item.step ? 'text-[#4ADE80] font-medium' : 'text-slate-500'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep >= item.step
                    ? 'bg-[#22C55E] text-[#06110B] font-bold'
                    : 'bg-[#102417] text-slate-500 border border-[rgba(74,222,128,0.1)]'
                }`}
              >
                {currentStep > item.step ? '✓' : item.step}
              </div>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Dynamic Content Body */}
        <div className="p-6 min-h-[300px] flex flex-col justify-between">
          {/* STEP 1: Baseline */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#102417] border border-[rgba(74,222,128,0.15)]">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-white font-mono">Target Service: Payment Gateway (Tier 1)</div>
                  <RiskScoreBadge score={61.0} category="High" size="lg" />
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  The primary payment API gateway (<code className="text-[#4ADE80] font-mono">pay-api-gw-01</code>) 
                  handles production card tokenization and merchant settlement. Current posture is evaluated at 
                  <strong className="text-white"> 61.0 / 100</strong> based on active HTTP/2 DDoS protection and perimeter WAF rules.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                    <div className="text-[11px] text-slate-400 font-mono">Likelihood</div>
                    <div className="text-sm font-mono font-semibold text-cyan-300">58.0</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                    <div className="text-[11px] text-slate-400 font-mono">Impact Exposure</div>
                    <div className="text-sm font-mono font-semibold text-amber-300">₹12 Lakh / hr</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                    <div className="text-[11px] text-slate-400 font-mono">Confidence</div>
                    <div className="text-sm font-mono font-semibold text-[#4ADE80]">92.0%</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-slate-400 font-mono">
                  Ready to simulate real-time zero-day threat intelligence ingestion.
                </div>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold text-xs flex items-center gap-2 transition-all font-mono shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  Proceed to Step 2: Inject CVE
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Ingest CVE */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-sm mb-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  Simulating Real-Time Threat Intelligence Ingestion
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  We will now introduce a weaponized Critical zero-day vulnerability into active database state:
                </p>
                <div className="mt-3 p-3.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.15)] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CVE Identifier:</span>
                    <span className="text-rose-400 font-bold">CVE-2026-9999</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CVSS Base Score:</span>
                    <span className="text-rose-400 font-bold">9.8 (CRITICAL)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Asset:</span>
                    <span className="text-[#4ADE80]">pay-api-gw-01 (Internet-Facing)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Exploitability:</span>
                    <span className="text-amber-400">Remote Code Execution (Unauthenticated)</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-mono"
                >
                  Back
                </button>
                <button
                  onClick={handleStep2Inject}
                  disabled={loading}
                  className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-2 transition-all font-mono shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-50"
                >
                  {loading ? 'Ingesting & Calculating...' : 'Inject CVE & Recalculate Risk'}
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 & 4: Continuous Recalculation Results */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#102417] border border-[rgba(74,222,128,0.15)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Continuous Risk Engine Output</div>
                    <div className="text-sm font-semibold text-white font-mono">Payment Gateway Recalculated</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs line-through text-slate-400 font-mono">61.0</span>
                    <ArrowRight className="w-4 h-4 text-rose-400" />
                    <RiskScoreBadge score={84.0} category="Critical" size="lg" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>Risk Surge: +23.0 points.</strong> New critical vulnerability detected on an externally exposed critical asset.
                  </span>
                </div>

                {/* Primary Drivers */}
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase font-mono mb-2">Authoritative Contributors (Drivers):</div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between p-2 rounded bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                      <span className="text-slate-300">Critical Vulnerability (CVE-2026-9999, CVSS 9.8)</span>
                      <span className="font-mono text-rose-400 font-semibold">+21.0 pts</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                      <span className="text-slate-300">Public Internet Exposure Multiplier</span>
                      <span className="font-mono text-amber-400 font-semibold">+18.0 pts</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-[#0D1B12] border border-[rgba(74,222,128,0.1)]">
                      <span className="text-slate-300">Tier 1 Core Financial Asset Criticality</span>
                      <span className="font-mono text-amber-400 font-semibold">+13.0 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs font-mono"
                >
                  Back
                </button>
                <button
                  onClick={handleStep5Simulate}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold text-xs flex items-center gap-2 transition-all font-mono shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                >
                  {loading ? 'Simulating...' : 'Proceed: Simulate What-If Mitigation'}
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: What-If Scenario Result */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#102417] border border-[rgba(74,222,128,0.2)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">What-If Simulation Comparison</div>
                    <div className="text-sm font-semibold text-white font-mono">Hardware MFA + Micro-Segmentation</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs line-through text-rose-400 font-mono">84.0</span>
                    <ArrowRight className="w-4 h-4 text-[#4ADE80]" />
                    <RiskScoreBadge score={52.0} category="High" size="lg" />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-xs text-[#4ADE80] flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                    <strong>Projected Risk Reduction: -32.0 points.</strong>
                  </span>
                  <span className="font-mono text-white">Estimated Cost: ₹12,00,000</span>
                </div>

                <div className="mt-3 p-3.5 rounded-lg bg-[#0D1B12] border border-[rgba(74,222,128,0.15)] text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase font-mono">Impact on Threat Surface:</div>
                  <div className="text-slate-300">
                    • Enforcing Hardware MFA blocks credential reuse and API token impersonation (-11.0 pts).
                  </div>
                  <div className="text-slate-300">
                    • East-West Micro-segmentation confines blast radius to outer ingress, protecting ledger DB (-12.5 pts).
                  </div>
                  <div className="text-slate-300">
                    • Residual Risk settles at 52.0 (down from 84.0 critical peak).
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-[#4ADE80] text-xs flex items-center gap-1.5 font-mono"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Baseline
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      if (onDemoCompleted) onDemoCompleted();
                    }}
                    className="px-4 py-2 rounded-lg bg-[#102417] hover:bg-[#102417]/80 text-white font-mono text-xs border border-[rgba(74,222,128,0.2)] transition-all"
                  >
                    View in Dashboard
                  </button>
                  <button
                    onClick={() => {
                      onClose();
                      window.location.href = '/optimization';
                    }}
                    className="px-4 py-2 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-[#06110B] font-bold text-xs flex items-center gap-2 transition-all font-mono shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    Open Investment Optimizer (₹50L)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
