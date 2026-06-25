import React from 'react';
import { Flame, MessageSquare, TrendingUp, Share2 } from 'lucide-react';
import { WatchlistEntry } from '../types';

interface BreakoutCardProps {
  data: WatchlistEntry;
  onSelect: (ticker: string) => void;
  isSelected: boolean;
}

export default function BreakoutCard({ data, onSelect, isSelected }: BreakoutCardProps) {
  const sources = data.source_distribution;

  return (
    <div 
      onClick={() => onSelect(data.ticker)}
      className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        isSelected 
          ? 'bg-gradient-to-br from-blue-950/40 to-slate-900/60 border-blue-500 shadow-lg shadow-blue-500/10'
          : 'bg-[#12161f]/60 hover:bg-[#12161f]/90 border-[#1f2937] hover:border-slate-700'
      }`}
    >
      <div>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-2xl font-bold tracking-tight text-white block">{data.ticker}</span>
            <span className="text-xs text-gray-400 block truncate max-w-[180px]">{data.company_name}</span>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-950/30 border border-orange-900/50 text-orange-400 text-sm font-semibold">
            <Flame className="h-4 w-4 fill-orange-500 text-orange-500 animate-pulse" />
            <span>{data.breakout_alpha_score}</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <MessageSquare className="h-4 w-4 text-accent" />
            <span>{data.social_mentions} Mentions</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <TrendingUp className="h-4 w-4 text-success" />
            <span>0 Mainstream</span>
          </div>
        </div>

        {/* Source Badges */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {sources.reddit > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-950/20 text-orange-400 border border-orange-900/40">
              Reddit: {sources.reddit}
            </span>
          )}
          {sources.twitter > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/20 text-sky-400 border border-sky-900/40">
              Twitter: {sources.twitter}
            </span>
          )}
          {sources.chittorgarh > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950/20 text-teal-400 border border-teal-900/40">
              IPO Board: {sources.chittorgarh}
            </span>
          )}
          {sources.et_times > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/20 text-emerald-400 border border-emerald-900/40">
              ET Times: {sources.et_times}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-500">
        <span>Last Signal: {data.timestamp_vectors.length > 0 
          ? new Date(data.timestamp_vectors[data.timestamp_vectors.length - 1]).toLocaleTimeString() 
          : 'N/A'}</span>
        <Share2 className="h-3.5 w-3.5 hover:text-white cursor-pointer" />
      </div>
    </div>
  );
}
