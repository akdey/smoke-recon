import React, { useState, useEffect } from 'react';
import { RefreshCw, SlidersHorizontal, BarChart3, AlertCircle } from 'lucide-react';
import { useWatchlist } from '../hooks/useWatchlist';
import { useSystemStatus } from '../hooks/useSystemStatus';
import SystemStatusBanner from './SystemStatusBanner';
import BreakoutCard from './BreakoutCard';
import MentionChart from './MentionChart';

export default function WatchlistDashboard() {
  const [days, setDays] = useState<number>(7);
  const [minMentions, setMinMentions] = useState<number>(3);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  // Load API data hooks
  const { data, loading, error } = useWatchlist(days, minMentions);
  const status = useSystemStatus();

  // Reset selected ticker if it's no longer in the list
  useEffect(() => {
    if (data?.watchlist && data.watchlist.length > 0) {
      const exists = data.watchlist.some(w => w.ticker === selectedTicker);
      if (!exists) {
        setSelectedTicker(data.watchlist[0].ticker);
      }
    } else {
      setSelectedTicker(null);
    }
  }, [data, selectedTicker]);

  const selectedData = data?.watchlist.find(w => w.ticker === selectedTicker) || null;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6">
      
      {/* Glow Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">
              EARLY SMOKE RECON
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-950/40 text-blue-400 border border-blue-800/40 font-semibold tracking-wider uppercase">
              V1.0
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Indian Equities Speculative Retail Breakout Watchlist (Asymmetric Social vs Media Difference)
          </p>
        </div>

        {/* Configurations panel */}
        <div className="flex items-center gap-4 flex-wrap bg-[#12161f]/35 p-3 rounded-xl border border-gray-800/50">
          <div className="flex items-center gap-2 text-xs">
            <SlidersHorizontal className="h-4 w-4 text-slate-400" />
            <span className="text-slate-300 font-semibold uppercase tracking-wider">Params:</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Window (Days)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={days} 
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 w-24"
                />
                <span className="text-xs text-white font-mono">{days}d</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 uppercase font-semibold">Min Mentions</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={minMentions} 
                  onChange={(e) => setMinMentions(Number(e.target.value))}
                  className="h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 w-24"
                />
                <span className="text-xs text-white font-mono">{minMentions}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* System Warning Banner */}
      <SystemStatusBanner status={status} />

      {/* Main Grid Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Ticker Grid (Span 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-800/40 pb-2">
            <span className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
              Breakout Watchlist ({data?.watchlist.length || 0})
            </span>
            {loading && <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />}
          </div>

          {error && (
            <div className="p-4 bg-red-950/20 border border-red-800 rounded-xl flex items-center gap-3 text-red-300">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>Failed to load breakout watchlist data: {error}</span>
            </div>
          )}

          {!loading && !error && data?.watchlist.length === 0 && (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-[#12161f]/20 border border-dashed border-gray-800 rounded-2xl">
              <BarChart3 className="h-12 w-12 text-gray-600 mb-3" />
              <span className="font-semibold text-gray-300 block">No Breakout Assets Detected</span>
              <span className="text-xs text-gray-500 max-w-sm mt-1">
                All stocks discussed in community forums match mainstream media baselines, or do not meet the minimum mentions threshold of {minMentions}.
              </span>
            </div>
          )}

          {!loading && !error && data && data.watchlist.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.watchlist.map((item) => (
                <BreakoutCard 
                  key={item.ticker}
                  data={item}
                  isSelected={selectedTicker === item.ticker}
                  onSelect={setSelectedTicker}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Details Panel (Span 1) */}
        <div className="flex flex-col gap-4">
          <div className="border-b border-gray-800/40 pb-2">
            <span className="text-sm font-semibold text-slate-400 tracking-wider uppercase">
              Asset Analytics
            </span>
          </div>

          <div className="flex-1 bg-[#12161f]/30 border border-[#1f2937] rounded-xl p-6 flex flex-col min-h-[320px]">
            {selectedData ? (
              <div className="flex-1 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-white tracking-tight">{selectedData.ticker}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-950/40 text-blue-400 border border-blue-800/30 font-medium">
                      Alpha: {selectedData.breakout_alpha_score}
                    </span>
                  </div>
                  <h4 className="text-sm text-gray-300 mb-1">{selectedData.company_name}</h4>
                  <p className="text-xs text-gray-500 mb-6">
                    This asset shows elevated retail social volume (<strong>{selectedData.social_mentions}</strong> mentions) with zero mainstream media baseline coverage.
                  </p>
                </div>

                <div className="flex-1 min-h-[220px]">
                  <MentionChart 
                    timestamps={selectedData.timestamp_vectors} 
                    ticker={selectedData.ticker} 
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                <BarChart3 className="h-8 w-8 text-gray-700 mb-2" />
                <span className="text-xs">Select a breakout card to view detailed timeline aggregation.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
