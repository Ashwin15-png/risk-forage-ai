import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Activity,
  Server,
  AlertTriangle,
  ShieldCheck,
  Database,
  Sliders,
  TrendingDown,
  Cpu,
  Sparkles,
  ClipboardCheck,
  FileText,
  Boxes,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Radio
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/risks', label: 'Risk Landscape', icon: Activity },
    { to: '/assets', label: 'Assets & Services', icon: Server },
    { to: '/data-sources', label: 'Data Sources', icon: Radio },
    { to: '/vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle },
    { to: '/controls', label: 'Controls', icon: ShieldCheck },
    { to: '/evidence', label: 'Evidence', icon: Database },
    { to: '/scenarios', label: 'Scenarios', icon: Sliders },
    { to: '/investments', label: 'Investments', icon: TrendingDown },
    { to: '/optimization', label: 'Optimization', icon: Cpu },
    { to: '/ai-insights', label: 'AI Insights', icon: Sparkles },
    { to: '/compliance', label: 'Compliance', icon: ClipboardCheck },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/models', label: 'Models', icon: Boxes },
    { to: '/audit', label: 'Audit', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#08150D] border-r border-[rgba(74,222,128,0.12)] transition-all duration-300 flex flex-col justify-between ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Platform Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[rgba(74,222,128,0.12)] bg-[#06110B]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyber-secondary via-cyber-primary to-cyber-bright flex items-center justify-center text-[#06110B] shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.35)]">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <span className="font-extrabold text-sm tracking-wider text-cyber-text block uppercase">
                  RISKFORGE<span className="text-cyber-bright"> AI</span>
                </span>
                <span className="text-[10px] font-mono text-cyber-subtext tracking-wider uppercase block">
                  Continuous Risk Intelligence
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-cyber-panel border border-cyber-border text-cyber-subtext hover:text-cyber-bright hover:border-cyber-borderHover transition-all"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-130px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyber-surface text-cyber-bright border border-cyber-borderHover shadow-[0_0_12px_rgba(34,197,94,0.15)] font-semibold'
                      : 'text-cyber-subtext hover:text-cyber-text hover:bg-cyber-panel/80'
                  } ${collapsed ? 'justify-center px-2' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? 'w-5 h-5' : ''}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer / Model Version Badge */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-lg bg-cyber-panel/90 border border-cyber-border text-[11px] text-cyber-subtext">
          <div className="flex items-center justify-between text-cyber-text font-semibold mb-1">
            <span className="font-mono text-xs">Risk Model v1.0</span>
            <span className="inline-block w-2 h-2 rounded-full bg-cyber-bright animate-pulse" />
          </div>
          <p className="text-[10px] text-cyber-subtext font-mono">Continuous Quantification Active</p>
        </div>
      )}
    </aside>
  );
};
