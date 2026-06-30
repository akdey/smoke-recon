import React from 'react';
import { Flame, MessageSquare, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { WatchlistEntry } from '../types';

interface BreakoutCardProps {
  data: WatchlistEntry;
  onSelect: (ticker: string) => void;
  isSelected: boolean;
}

export default function BreakoutCard({ data, onSelect, isSelected }: BreakoutCardProps) {
  const sources = data.source_distribution;
  const avgSent = data.average_sentiment || 0.0;
  const sentimentLabel = avgSent > 0.15 ? 'Bullish' : avgSent < -0.15 ? 'Bearish' : 'Neutral';
  const sentimentColor = avgSent > 0.15 
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
    : avgSent < -0.15 
      ? 'text-rose-450 bg-rose-500/10 border-rose-500/20' 
      : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <motion.div 
      onClick={() => onSelect(data.ticker)}
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${
        isSelected 
          ? 'glass-card-selected'
          : 'liquid-glass hover:bg-white/[0.07] hover:border-white/[0.14]'
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-xl font-bold tracking-tight text-white block truncate">{data.ticker}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{data.company_name}</span>
              <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono shrink-0 ${sentimentColor}`}>
                {sentimentLabel}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold">
            <Flame className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
            <span>{data.breakout_alpha_score.toFixed(1)}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-white/[0.03] pt-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
            <span>{data.social_mentions} social</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <TrendingUp className="h-3.5 w-3.5 text-slate-500" />
            <span>{data.media_mentions} media</span>
          </div>
        </div>

        {/* Source Badges */}
        <div className="mt-3.5 flex flex-wrap gap-1">
          {sources.reddit > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950/20 text-orange-400/90 border border-orange-900/30">
              r/{sources.reddit}
            </span>
          )}
          {sources.twitter > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950/20 text-sky-400/90 border border-sky-900/30">
              x/{sources.twitter}
            </span>
          )}
          {sources.chittorgarh > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-950/20 text-teal-400/90 border border-teal-900/30">
              board/{sources.chittorgarh}
            </span>
          )}
          {sources.et_times > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950/20 text-emerald-400/90 border border-emerald-900/30">
              et/{sources.et_times}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
