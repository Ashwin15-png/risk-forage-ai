import React from 'react';

interface ConfidenceBarProps {
  score: number; // 0 - 100
  size?: 'sm' | 'md';
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ score, size = 'md' }) => {
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2';

  let colorClass = 'bg-cyber-bright';
  if (score < 70) colorClass = 'bg-amber-400';
  if (score < 50) colorClass = 'bg-rose-400';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-16 bg-slate-800 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-300">{score.toFixed(0)}%</span>
    </div>
  );
};
