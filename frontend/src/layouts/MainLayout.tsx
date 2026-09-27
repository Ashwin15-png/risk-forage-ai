import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { GlobalSearchModal } from '../components/GlobalSearchModal';
import { LiveRiskDemoModal } from '../components/LiveRiskDemoModal';
import { socketService } from '../services/socket';
import { useDataMode } from '../context/DataModeContext';
import { AlertCircle, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { authApi } from '../services/api';

/** Silently log in as the demo CISO user if no auth token is stored. */
async function ensureDemoLogin() {
  if (localStorage.getItem('token')) return;
  try {
    const res = await authApi.login({
      email: 'ciso@demofinancial.com',
      password: 'DemoPassword2026!',
    });
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    console.info('[RiskForge] Demo CISO session established');
  } catch (e) {
    console.warn('[RiskForge] Demo auto-login skipped (backend may not be ready)');
  }
}

export const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [liveBanner, setLiveBanner] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [authReady, setAuthReady] = useState(() => !!localStorage.getItem('token'));
  const { refreshAll } = useDataMode();

  // ── Eager demo login + WebSocket setup ──────────────────────────────────
  useEffect(() => {
    // Step 1: ensure we have a token before WS and pages fire their fetches
    ensureDemoLogin().then(() => {
      setAuthReady(true);
      // Step 2: only connect WebSocket after login is confirmed
      socketService.connect();
    });

    const unsubSurge = socketService.subscribe('RISK_SURGE_EVENT', (data: any) => {
      setLiveBanner({
        text: `🔴 RISK SURGE: ${data.cve || 'New vulnerability'} on ${data.asset_name}. Risk +${data.delta} pts — ${data.reason || 'Active threat intelligence update'}`,
        type: 'error'
      });
      refreshAll();
      setTimeout(() => setLiveBanner(null), 10000);
    });

    const unsubResolved = socketService.subscribe('VULNERABILITY_RESOLVED', (data: any) => {
      setLiveBanner({
        text: `✅ REMEDIATED: ${data.cve_id} on ${data.asset_name}. Risk recalculated → ${data.new_risk} (${data.delta} pts). Action: ${data.action}`,
        type: 'success'
      });
      refreshAll();
      setTimeout(() => setLiveBanner(null), 8000);
    });

    const unsubRecalc = socketService.subscribe('RISK_UPDATED', (data: any) => {
      setLiveBanner({
        text: `⚡ LIVE RECALC: ${data.message || data.reason}`,
        type: 'info'
      });
      refreshAll();
      setTimeout(() => setLiveBanner(null), 6000);
    });

    const unsubOpt = socketService.subscribe('OPTIMIZATION_COMPLETED', (data: any) => {
      setLiveBanner({
        text: `🎯 OPTIMIZATION: Risk reduced ${data.risk_reduction} pts | Controls: ${Array.isArray(data.controls) ? data.controls.join(', ') : 'Deployed'} | ROI: ${data.roi || '3.2x'}`,
        type: 'success'
      });
      setTimeout(() => setLiveBanner(null), 7000);
    });

    return () => {
      unsubSurge();
      unsubResolved();
      unsubRecalc();
      unsubOpt();
      socketService.disconnect();
    };
  }, [refreshAll]);


  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#06110B] text-cyber-text flex font-sans selection:bg-cyber-primary selection:text-[#06110B]">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-18' : 'ml-64'
        }`}
      >
        <Navbar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenDemo={() => setDemoOpen(true)}
        />

        {/* Live Event Floating Banner */}
        {liveBanner && (
          <div
            className={`border-b px-6 py-2.5 text-xs flex items-center justify-between shadow-xl sticky top-16 z-20 animate-in fade-in slide-in-from-top-2 duration-300 ${
              liveBanner.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : liveBanner.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : 'bg-cyber-panel/95 border-cyber-border text-cyber-bright'
            }`}
          >
            <span className="font-semibold flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  liveBanner.type === 'error'
                    ? 'bg-rose-400 animate-ping'
                    : liveBanner.type === 'success'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-cyber-bright animate-ping'
                }`}
              />
              {liveBanner.text}
            </span>
            <button
              onClick={() => setLiveBanner(null)}
              className="text-cyber-subtext hover:text-cyber-text px-2 text-xs font-mono"
            >
              ✕
            </button>
          </div>
        )}

        <main className="p-6 flex-1 max-w-7xl mx-auto w-full">
          {authReady ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-cyber-bright border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-cyber-subtext">Establishing secure session...</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <LiveRiskDemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
};
