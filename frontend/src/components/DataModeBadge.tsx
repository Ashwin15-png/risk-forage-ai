import React from 'react';
import { useDataMode } from '../context/DataModeContext';
import { DataMode } from '../types';

interface DataModeBadgeProps {
  mode?: DataMode | 'DEMO DATA' | 'LIVE DATA' | 'SIMULATION';
  className?: string;
  size?: 'sm' | 'xs';
}

export const DataModeBadge: React.FC<DataModeBadgeProps> = ({ mode: explicitMode, className = '', size = 'xs' }) => {
  const { mode: currentMode } = useDataMode();
  const effectiveMode = explicitMode || currentMode;

  let text = 'DEMO DATA';
  let styles = 'bg-cyber-surface/90 text-cyber-bright border-cyber-border';

  if (effectiveMode === 'LIVE' || effectiveMode === 'LIVE DATA') {
    text = 'LIVE DATA';
    styles = 'bg-emerald-950/70 text-emerald-400 border-emerald-500/30';
  } else if (effectiveMode === 'SIMULATION') {
    text = 'SIMULATION';
    styles = 'bg-purple-950/70 text-purple-300 border-purple-500/30';
  } else {
    text = 'DEMO DATA';
    styles = 'bg-cyber-card/80 text-cyber-muted border-cyber-border';
  }

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded tracking-wide border uppercase ${sizeStyles} ${styles} ${className}`}
      title={`Data mode source: ${text}`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-75" />
      [{text}]
    </span>
  );
};
