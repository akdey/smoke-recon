import React from 'react';
import { WatchlistEntry } from '../types';

interface BreakoutCardProps {
  data: WatchlistEntry;
  onSelect: (ticker: string) => void;
  isSelected: boolean;
}

export default function BreakoutCard({ data, onSelect, isSelected }: BreakoutCardProps) {
  const avgSent = data.average_sentiment || 0.0;
  
  const isBull = avgSent > 0.15;
  const isBear = avgSent < -0.15;
  const sentimentClass = isBull ? 'sentiment-bull' : isBear ? 'sentiment-bear' : 'text-primary';
  const sentimentText = isBull ? 'BULLISH' : isBear ? 'BEARISH' : 'STABLE';
  
  return (
    <div 
      onClick={() => onSelect(data.ticker)}
      className={`glass-card rounded-lg relative group active:scale-[0.98] transition-all p-3.5 flex flex-col gap-2.5 cursor-pointer hover:bg-white/[0.03] ${isSelected ? 'specular-highlight ring-1 ring-primary/30' : ''}`}
    >
      {/* Row 1: Ticker and Action */}
      <div className="flex justify-between items-center relative z-10 w-full">
        <h2 className="font-display-lg text-[22px] text-white font-extrabold tracking-wide select-none">
          ${data.ticker}
        </h2>
        <button className={`border font-data-mono text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider transition-all select-none ${
          isBear ? 'bg-error/10 border-error/20 text-error group-hover:bg-error/20' : 'bg-primary/10 border-primary/20 text-primary group-hover:bg-primary/20'
        }`}>
          Investigate
        </button>
      </div>

      {/* Row 2: Company Name (Allows much larger width without truncation) */}
      <div className="relative z-10 -mt-1">
        <p className="font-sans text-[12px] text-on-surface-variant font-medium tracking-wide truncate max-w-[90%] select-none">
          {data.company_name || 'UNKNOWN COMPANY'}
        </p>
      </div>

      {/* Row 3: Stats Grid (Uniform 3-column layout) */}
      <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-outline-variant/10 relative z-10">
        <div className="flex flex-col gap-0.5 select-none">
          <span className="font-metadata-tiny text-[9px] text-on-surface-variant uppercase tracking-wider">Mentions</span>
          <span className="font-data-mono text-[14px] text-white font-semibold">{data.social_mentions}</span>
        </div>
        <div className="flex flex-col gap-0.5 pl-3 border-l border-outline-variant/10 select-none">
          <span className="font-metadata-tiny text-[9px] text-on-surface-variant uppercase tracking-wider">Sentiment</span>
          <span className={`font-data-mono text-[14px] font-semibold ${sentimentClass}`}>{sentimentText}</span>
        </div>
        <div className="flex flex-col gap-0.5 pl-3 border-l border-outline-variant/10 select-none">
          <span className="font-metadata-tiny text-[9px] text-on-surface-variant uppercase tracking-wider">Alpha</span>
          <span className={`font-display-lg text-[14px] font-bold ${sentimentClass}`}>{data.breakout_alpha_score.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
