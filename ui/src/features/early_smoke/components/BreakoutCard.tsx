import React from 'react';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
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
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]' 
    : avgSent < -0.15 
      ? 'text-rose-450 bg-rose-500/10 border-rose-500/20' 
      : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <motion.div 
      onClick={() => onSelect(data.ticker)}
      whileHover={{ 
        scale: 1.015, 
        y: -1,
        boxShadow: '0 8px 30px rgba(0,0,0,0.45)'
      }}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`p-3.5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between select-none ${
        isSelected 
          ? 'glass-card-selected'
          : 'liquid-glass hover:bg-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      <div className="min-w-0 flex-grow pr-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-white block truncate">{data.ticker}</span>
          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono shrink-0 ${sentimentColor}`}>
            {sentimentLabel}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 block truncate mt-1.5 font-mono uppercase tracking-wider">
          {data.company_name}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)] shrink-0">
        <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
        <span>{data.breakout_alpha_score.toFixed(1)}</span>
      </div>
    </motion.div>
  );
}
