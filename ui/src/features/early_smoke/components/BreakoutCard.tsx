import React from 'react';
import { Flame } from 'lucide-react';
import { WatchlistEntry } from '../types';

interface BreakoutCardProps {
  data: WatchlistEntry;
  onSelect: (ticker: string) => void;
  isSelected: boolean;
}

export default function BreakoutCard({ data, onSelect, isSelected }: BreakoutCardProps) {
  const avgSent = data.average_sentiment || 0.0;
  const sentimentLabel = avgSent > 0.15 ? 'Bullish' : avgSent < -0.15 ? 'Bearish' : 'Neutral';
  const sentimentColor = avgSent > 0.15 
    ? 'text-emerald-450' 
    : avgSent < -0.15 
      ? 'text-rose-400' 
      : 'text-slate-400';

  return (
    <div 
      onClick={() => onSelect(data.ticker)}
      className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all border-b border-white/[0.03] select-none ${
        isSelected 
          ? 'bg-white/[0.04] border-l-2 border-l-blue-500'
          : 'hover:bg-white/[0.015]'
      }`}
    >
      {/* Ticker & Company details */}
      <div className="min-w-0 flex-1 pr-3">
        <span className="text-sm font-bold text-white block tracking-tight truncate">{data.ticker}</span>
        <span className="text-[9px] text-slate-500 font-mono block tracking-wider truncate mt-0.5 uppercase">
          {data.company_name}
        </span>
      </div>

      {/* Sentiment alignment & Score */}
      <div className="flex items-center gap-5 shrink-0 font-mono">
        <span className={`text-[9px] font-bold uppercase tracking-wider ${sentimentColor}`}>
          {sentimentLabel}
        </span>
        <div className="flex items-center gap-1 min-w-[50px] justify-end">
          <Flame className="h-3.5 w-3.5 fill-orange-500/10 text-orange-500" />
          <span className="text-xs font-bold text-slate-200">{data.breakout_alpha_score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
