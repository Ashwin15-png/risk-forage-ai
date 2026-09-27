import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Shield, RefreshCw, Zap, User, LogOut,
  Wifi, WifiOff, AlertTriangle, CheckCircle2 
} from 'lucide-react';
import { socketService, ConnectionStatus } from '../services/socket';
import { useDataMode } from '../context/DataModeContext';
import { useAuth } from '../context/AuthContext';
import { healthApi } from '../services/api';
import { DataMode } from '../types';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onOpenDemo }) => {
  const { mode, setMode, lastUpdated, refreshAll } = useDataMode();
  const { appUser, firebaseUser, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>(socketService.getStatus());
  const [httpStatus, setHttpStatus] = useState<'ONLINE' | 'CONNECTING' | 'OFFLINE'>('CONNECTING');
  
  const [notifications, setNotifications] = useState<any[]>([
    {
      id: 1,
      type: 'warning',
      title: 'Evidence Feed Alert',
      message: 'Qualys Web App Scanner telemetry feed refresh threshold warning.',
      time: '12m ago'
    },
    {
      id: 2,
      type: 'info',
      title: 'Risk Baseline Quantified',
      message: 'Daily continuous enterprise risk calculated at 72.4 (High Risk).',
      time: '1h ago'
    },
    {
      id: 3,
      type: 'success',
      title: 'Model Calibrated',
      message: 'Continuous Risk Model v1.0 weights & assumptions verified.',
      time: '3h ago'
    }
  ]);

  // Track real backend HTTP health & WebSocket status
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        await healthApi.check();
        if (isMounted) setHttpStatus('ONLINE');
      } catch (e) {
        if (isMounted) setHttpStatus('OFFLINE');
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);

    const unsubStatus = socketService.onStatusChange((status) => {
      setWsStatus(status);
    });

    const unsubEvents = socketService.subscribe('*', (event: any) => {
      if (event && event.payload) {
        const payload = event.payload;
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: event.type?.includes('SURGE') || event.type?.includes('CRITICAL') ? 'error' : 'info',
            title: event.type?.replace(/_/g, ' ') || 'Live Event',
            message: payload.message || payload.reason || JSON.stringify(payload).slice(0, 80),
            time: 'Just now'
          },
          ...prev.slice(0, 8)
        ]);
      }
    });

    return () => {
      isMounted = false;
      clearInterval(healthInterval);
      unsubStatus();
      unsubEvents();
    };
  }, []);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const modes: DataMode[] = ['DEMO', 'LIVE', 'SIMULATION'];

  // Derive user display info from Firebase/app user or fallback to localStorage
  const displayName = appUser?.full_name || appUser?.display_name || firebaseUser?.displayName || 'Rajesh Sharma';
  const displayEmail = appUser?.email || firebaseUser?.email || 'ciso@demofinancial.com';
  const displayPhoto = appUser?.photo_url || firebaseUser?.photoURL || null;
  const displayRole = appUser?.role || 'ciso';
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-16 border-b border-[rgba(74,222,128,0.12)] bg-[#08150D]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Left: Organization & Real Live Status */}
      <div className="flex items-center gap-4">
        {/* Organization Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border">
          <Shield className="w-3.5 h-3.5 text-cyber-bright" />
          <span className="text-xs font-semibold text-cyber-text">Demo Financial Services Ltd.</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyber-card text-cyber-muted border border-cyber-border">
            PROD
          </span>
        </div>

        {/* Global Data Mode Selector: [ DEMO ] [ LIVE ] [ SIMULATION ] */}
        <div className="flex items-center p-0.5 rounded-lg bg-cyber-panel border border-cyber-border">
          {modes.map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
                  active
                    ? m === 'SIMULATION'
                      ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                      : m === 'LIVE'
                      ? 'bg-emerald-900/70 text-emerald-200 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                      : 'bg-cyber-surface text-cyber-bright border border-cyber-borderHover shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                    : 'text-cyber-subtext hover:text-cyber-text'
                }`}
                title={`Switch to ${m} mode`}
              >
                {m}
              </button>
            );
          })}
        </div>

        {/* Real Backend HTTP & Live WebSocket Connection Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 text-xs">
          {httpStatus === 'ONLINE' ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/30" title="Backend HTTP API Operational">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ONLINE
            </span>
          ) : httpStatus === 'CONNECTING' ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-cyan-950/80 text-cyan-400 border border-cyan-500/30" title="Connecting to Backend API">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              CONNECTING
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-rose-950/80 text-rose-400 border border-rose-500/30" title="Backend HTTP API Offline">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              OFFLINE
            </span>
          )}

          {wsStatus === 'LIVE' && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/30" title="Live WebSocket Feed Connected">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ● LIVE
            </span>
          )}
          {wsStatus === 'RECONNECTING' && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-amber-950/80 text-amber-400 border border-amber-500/30" title="Reconnecting WebSocket Feed">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              ○ RECONNECTING
            </span>
          )}
          <span className="text-cyber-subtext text-[11px] font-mono">Updated: {lastUpdated}</span>
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden lg:block w-72">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-xs text-cyber-subtext hover:text-cyber-text hover:border-cyber-borderHover transition-all shadow-inner"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-cyber-bright" />
            <span>Search assets, CVEs, services...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-cyber-card text-cyber-muted border border-cyber-border rounded">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Refresh Data, Guided Demo, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Refresh Data Button */}
        <button
          onClick={handleManualRefresh}
          className="p-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright hover:border-cyber-borderHover transition-all"
          title="Refresh Telemetry Data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyber-bright' : ''}`} />
        </button>

        {/* Run Live Risk Demo Action Button */}
        <button
          onClick={onOpenDemo}
          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyber-secondary/30 via-cyber-primary/25 to-cyber-emerald/30 hover:from-cyber-secondary/50 hover:to-cyber-emerald/50 border border-cyber-borderHover text-cyber-bright font-semibold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] group"
        >
          <Zap className="w-3.5 h-3.5 text-cyber-bright group-hover:scale-110 transition-transform" />
          <span>Run Live Demo</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-text hover:border-cyber-borderHover transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cyber-primary text-[#06110B] text-[9px] font-extrabold flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-cyber-panel border border-cyber-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyber-border bg-cyber-darker">
                <span className="text-xs font-semibold text-cyber-text">Live Telemetry Alerts</span>
                <span className="text-[10px] font-mono text-cyber-bright">
                  {wsStatus === 'LIVE' ? 'Connected' : wsStatus}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-cyber-border/40">
                {notifications.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-cyber-surface/60 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold ${
                          item.type === 'error'
                            ? 'text-rose-400'
                            : item.type === 'warning'
                            ? 'text-amber-400'
                            : 'text-cyber-bright'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] text-cyber-subtext font-mono">{item.time}</span>
                    </div>
                    <p className="text-xs text-cyber-subtext">{item.message}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t border-cyber-border bg-cyber-darker/60 text-center">
                <button
                  onClick={() => setNotifications([])}
                  className="text-[11px] text-cyber-subtext hover:text-cyber-bright"
                >
                  Clear all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Badge — Dynamic from Firebase/Auth */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 pl-2 border-l border-cyber-border cursor-pointer hover:opacity-90 transition-opacity"
          >
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={displayName}
                className="w-8 h-8 rounded-lg object-cover shadow-md border border-cyber-border"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-secondary to-cyber-primary flex items-center justify-center text-[#06110B] font-extrabold text-xs shadow-md">
                {initials}
              </div>
            )}
            <div className="hidden xl:block text-left">
              <div className="text-xs font-semibold text-cyber-text">{displayName}</div>
              <div className="text-[10px] text-cyber-subtext font-mono">
                {displayRole === 'ciso' ? 'CISO (Decision Lead)' : displayRole.toUpperCase()}
              </div>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-cyber-panel border border-cyber-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in duration-150">
              <div className="p-4 border-b border-cyber-border bg-cyber-darker">
                <div className="flex items-center gap-3">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={displayName}
                      className="w-10 h-10 rounded-lg object-cover border border-cyber-border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-cyber-secondary to-cyber-primary flex items-center justify-center text-[#06110B] font-extrabold text-sm shadow-md">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-cyber-text truncate">{displayName}</div>
                    <div className="text-[11px] text-cyber-subtext font-mono truncate">{displayEmail}</div>
                  </div>
                </div>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-cyber-text hover:bg-cyber-surface/60 transition-colors"
                >
                  <User className="w-4 h-4 text-cyber-bright" />
                  Profile &amp; Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
