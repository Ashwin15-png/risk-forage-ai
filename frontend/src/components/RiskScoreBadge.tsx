import React from 'react';

interface RiskScoreBadgeProps {
  score: number;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  showCategory?: boolean;
}

export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  score,
  category,
  size = 'md',
  showCategory = true,
}) => {
  let cat = category;
  if (!cat) {
    if (score >= 75) cat = 'Critical';
    else if (score >= 50) cat = 'High';
    else if (score >= 25) cat = 'Moderate';
    else cat = 'Low';
  }

  let colorClasses = '';
  let dotColor = '';

  switch (cat.toLowerCase()) {
    case 'critical':
      colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      dotColor = 'bg-rose-500';
      break;
    case 'high':
      colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      dotColor = 'bg-amber-500';
      break;
    case 'moderate':
    case 'medium':
      colorClasses = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      dotColor = 'bg-yellow-500';
      break;
    default:
      colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      dotColor = 'bg-emerald-500';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono ${colorClasses} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      <span>{score.toFixed(1)}</span>
      {showCategory && <span className="opacity-80 font-sans uppercase text-[10px] tracking-wider">({cat})</span>}
    </span>
  );
};
