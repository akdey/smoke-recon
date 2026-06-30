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
  
  const badgeClass = isBull 
    ? 'text-primary bg-primary/10 border-primary/20' 
    : isBear 
      ? 'text-error bg-error/10 border-error/20' 
      : 'text-on-secondary-container bg-secondary-container/20 border-secondary-container/30';

  return (
    <div 
      onClick={() => onSelect(data.ticker)}
      className={`glass-card rounded-lg relative group active:scale-[0.98] transition-transform p-3 flex flex-col gap-2 cursor-pointer ${isSelected ? 'specular-highlight' : ''}`}
    >
      <div className="flex justify-between items-center relative z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-display-lg text-[20px] text-white font-bold truncate max-w-[120px]">${data.ticker}</h2>
          <span className={`font-data-mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${badgeClass} truncate max-w-[100px]`}>
            {data.company_name || 'UNKNOWN'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="font-metadata-tiny text-[10px] text-on-surface-variant uppercase mr-2">Alpha</span>
            <span className={`font-display-lg text-[18px] font-bold ${sentimentClass}`}>
              {data.breakout_alpha_score.toFixed(1)}
            </span>
          </div>
          <button className={`border font-data-mono text-[10px] px-2 py-1 rounded uppercase transition-all ${
            isBear ? 'bg-error/10 border-error/20 text-error hover:bg-error/20' : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
          }`}>
            Investigate
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/10 relative z-10">
        <div className="flex items-center justify-between">
          <span className="font-metadata-tiny text-[10px] text-on-surface-variant uppercase">Mentions</span>
          <span className="font-data-mono text-[14px] text-white">{data.social_mentions}</span>
        </div>
        <div className="flex items-center justify-between pl-2 border-l border-outline-variant/10">
          <span className="font-metadata-tiny text-[10px] text-on-surface-variant uppercase">Sentiment</span>
          <span className={`font-data-mono text-[14px] ${sentimentClass}`}>{sentimentText}</span>
        </div>
      </div>
    </div>
  );
}
