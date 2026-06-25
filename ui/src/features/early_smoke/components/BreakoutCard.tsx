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
      className={`p-4 rounded-xl border transition-colors duration-300 cursor-pointer flex flex-col justify-between select-none ${
        isSelected 
          ? 'bg-gradient-to-br from-blue-950/20 to-slate-900/30 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
          : 'bg-[#0f172a]/30 backdrop-blur-md border-white/[0.04] hover:border-gray-700/60 hover:bg-[#121b2e]/30'
      }`}
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <span className="text-xl font-bold tracking-tight text-white block truncate">{data.ticker}</span>
            <span className="text-[11px] text-slate-400 block truncate mt-0.5">{data.company_name}</span>
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
