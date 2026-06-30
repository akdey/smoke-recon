import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart3, Terminal, Settings, RefreshCw, AlertCircle, 
  Flame, Database, Cpu, X, HelpCircle, SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '../hooks/useWatchlist';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useActivityStream } from '../hooks/useActivityStream';
import { useMostDiscussed } from '../hooks/useMostDiscussed';
import { useMentions } from '../hooks/useMentions';
import BreakoutCard from './BreakoutCard';
import MentionChart from './MentionChart';
import ActivityConsole from './ActivityConsole';

export default function WatchlistDashboard() {
  const [days, setDays] = useState<number>(7);
  const [minMentions, setMinMentions] = useState<number>(3);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'analytics' | 'activity'>('watchlist');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'breakouts' | 'mostDiscussed'>('breakouts');

  // Load API hooks
  const { data, loading, error } = useWatchlist(days, minMentions);
  const { data: mostDiscussedData, loading: mostDiscussedLoading, error: mostDiscussedError } = useMostDiscussed(days);
  const { data: mentionsData, loading: mentionsLoading } = useMentions(selectedTicker, days);
  const status = useSystemStatus();
  const { activities, connected } = useActivityStream();

  const mappedMostDiscussed = mostDiscussedData?.map(item => ({
    ticker: item.ticker,
    company_name: item.company_name,
    breakout_alpha_score: item.breakout_alpha_score,
    social_mentions: item.social_mentions,
    media_mentions: item.media_mentions,
    source_distribution: {
      reddit: item.social_mentions,
      twitter: 0,
      chittorgarh: 0,
      et_times: 0
    },
    timestamp_vectors: []
  })) || [];

  const watchlistEntries = activeView === 'breakouts' ? (data?.watchlist || []) : mappedMostDiscussed;
  const listLoading = activeView === 'breakouts' ? loading : mostDiscussedLoading;
  const listError = activeView === 'breakouts' ? error : mostDiscussedError;

  // Reset selected ticker if it's no longer in the list
  useEffect(() => {
    if (watchlistEntries && watchlistEntries.length > 0) {
      const exists = watchlistEntries.some(w => w.ticker === selectedTicker);
      if (!exists) {
        setSelectedTicker(watchlistEntries[0].ticker);
      }
    } else {
      setSelectedTicker(null);
    }
  }, [watchlistEntries, selectedTicker]);

  // Handle ticker selection
  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    // On mobile/tablet, switch to analytics tab so the chart is shown immediately
    setActiveTab('analytics');
  };

  const selectedData = watchlistEntries.find(w => w.ticker === selectedTicker) || null;
  const mentionsTimestamps = mentionsData?.map(m => m.timestamp).sort() || [];

  // Filter activities to show matching posts for the selected ticker
  const matchingActivities = activities.filter(
    (act) => act.ticker === selectedTicker && act.event_type === 'mention'
  );

  const dbConnected = status?.database?.status === 'connected';
  const isDegraded = status?.status === 'degraded';

  return (
    <div className="flex-grow flex flex-col h-full bg-[#030712] text-slate-100 pb-20 lg:pb-8 relative overflow-hidden">
      {/* Liquid Glass Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-gradient-to-br from-blue-600/10 to-indigo-600/10 blur-[130px] animate-pulse" style={{ animationDuration: '9s' }} />
        <div className="absolute bottom-[-10%] right-[-15%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-purple-600/10 to-pink-600/10 blur-[160px] animate-pulse" style={{ animationDuration: '13s' }} />
        <div className="absolute top-[30%] right-[15%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-cyan-600/8 to-blue-600/8 blur-[120px] animate-pulse" style={{ animationDuration: '11s' }} />
      </div>

      {/* SVG Refraction Filter Definitions */}
      <svg width="0" height="0" className="absolute pointer-events-none z-[-1]">
        <defs>
          <filter id="liquid-glass-refraction">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* 🚀 GLOW HEADER */}
      <header className="bg-white/[0.02] backdrop-blur-md border-b border-white/[0.06] px-4 py-3 flex items-center justify-between sticky top-0 z-30 relative">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Flame className="h-4.5 w-4.5 text-white fill-white" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent uppercase">
              SMOKE RECON
            </span>
            <span className="text-[9px] text-gray-500 font-mono ml-2">v1.2</span>
          </div>
        </div>

        {/* Live / Status Indicators */}
        <div className="flex items-center gap-3">
          {/* Connection state */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06]">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider font-mono">
              {connected ? 'Live' : 'Syncing'}
            </span>
          </div>

          {/* Settings button */}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] text-slate-300 transition-all active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 📱 MOBILE TABS CONTAINER */}
      <main className="flex-grow overflow-x-hidden overflow-y-auto px-4 py-4 flex flex-col lg:hidden relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'watchlist' && (
            <motion.div
              key="watchlist"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.15 }}
              className="flex-grow flex flex-col gap-3 h-full"
            >
              {/* View Toggle */}
              <div className="grid grid-cols-2 p-1 bg-[#0b0f19] border border-gray-900 rounded-lg text-xs mb-3 select-none">
                <button
                  onClick={() => setActiveView('breakouts')}
                  className={`py-1.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                    activeView === 'breakouts'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Breakouts
                </button>
                <button
                  onClick={() => setActiveView('mostDiscussed')}
                  className={`py-1.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                    activeView === 'mostDiscussed'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Most Discussed
                </button>
              </div>

              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {activeView === 'breakouts' ? 'Breakouts' : 'Most Discussed'} ({watchlistEntries.length})
                </h2>
                {listLoading && <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
              </div>

              {listError && (
                <div className="p-4 bg-red-950/25 border border-red-900/50 rounded-xl flex items-center gap-3 text-red-300 text-xs">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>Failed to sync: {listError}</span>
                </div>
              )}

              {!listLoading && !listError && watchlistEntries.length === 0 && (
                <div className="flex-grow min-h-[350px] flex flex-col items-center justify-center text-center p-8 bg-[#0a0e17]/30 border border-dashed border-gray-800 rounded-2xl">
                  <HelpCircle className="h-10 w-10 text-slate-700 mb-3" />
                  <span className="font-semibold text-slate-300 text-sm">No speculative data</span>
                  <span className="text-[11px] text-slate-500 max-w-xs mt-1">
                    No active assets matching parameters.
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {!listLoading && watchlistEntries.map((item) => (
                  <BreakoutCard 
                    key={item.ticker}
                    data={item}
                    isSelected={selectedTicker === item.ticker}
                    onSelect={handleSelectTicker}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.15 }}
              className="flex-grow flex flex-col gap-4 h-full"
            >
              {selectedData ? (
                <div className="flex-grow flex flex-col gap-4">
                  {/* Meta details */}
                  <div className="bg-[#0c101b]/50 border border-gray-900 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-white">{selectedData.ticker}</h2>
                        <span className="text-xs text-slate-400">{selectedData.company_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 uppercase tracking-widest block font-bold">Alpha Score</span>
                        <span className="text-xl font-black text-blue-400">{selectedData.breakout_alpha_score.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 border-t border-gray-800/40 mt-3 pt-3">
                      Asymmetric activity: <strong>{selectedData.social_mentions}</strong> social mentions with <strong>{selectedData.media_mentions}</strong> mainstream media baselines over {days} days.
                    </p>
                  </div>

                  {/* Chart */}
                  <div className="bg-[#0c101b]/50 border border-gray-900 rounded-xl p-4 h-[280px]">
                    <MentionChart 
                      timestamps={mentionsTimestamps.length > 0 ? mentionsTimestamps : (selectedData?.timestamp_vectors || [])} 
                      ticker={selectedData?.ticker || ''} 
                    />
                  </div>

                  {/* Matching Feeds */}
                  <div className="flex-1 flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Recent Live Chatter Mentions ({mentionsData ? mentionsData.length : 0})
                    </h3>
                    <div className="flex-grow max-h-[220px] overflow-y-auto space-y-2 font-mono text-[10px]">
                      {mentionsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                        </div>
                      ) : !mentionsData || mentionsData.length === 0 ? (
                        <div className="p-4 text-center text-gray-600 bg-[#0c101b]/20 border border-gray-900 rounded-lg italic">
                          No recent matching comments in database.
                        </div>
                      ) : (
                        mentionsData.map((mention, index) => (
                          <div key={mention.id || index} className="p-3 bg-[#0c101b]/40 border border-gray-900 rounded-lg flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-gray-500">
                              <span>{new Date(mention.timestamp).toLocaleTimeString()}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-orange-400 font-semibold">{mention.platform}</span>
                                {mention.url && (
                                  <a 
                                    href={mention.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-450 hover:text-blue-300 font-bold hover:underline"
                                  >
                                    [Source]
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-300">"{mention.content_body}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                  <BarChart3 className="h-10 w-10 text-slate-700 mb-2" />
                  <span className="text-sm text-slate-400">Select a stock in the Watchlist tab to view charts.</span>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.15 }}
              className="flex-grow flex flex-col h-full"
            >
              <ActivityConsole />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 💻 DESKTOP DUAL-GRID WORKSPACE */}
      <main className="hidden lg:grid grid-cols-12 gap-6 flex-1 px-8 py-6 max-w-[1600px] w-full mx-auto overflow-hidden z-10 relative">
        
        {/* LEFT COLUMN: Controls & Cards (Span 4) */}
        <section className="col-span-4 flex flex-col gap-4 overflow-hidden h-full">
          {/* Params header */}
          <div className="liquid-glass rounded-xl p-4">
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-blue-400" />
                <span>Filter Criteria</span>
              </div>
              <span className="text-gray-500 font-mono text-[10px] hover:text-slate-300">
                {isFiltersExpanded ? '[ Hide ]' : '[ Expand ]'}
              </span>
            </button>
            
            <AnimatePresence>
              {isFiltersExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Window Duration</span>
                      <span className="text-blue-400 font-mono font-bold">{days} days</span>
                    </div>
                    <input 
                      type="range" min="1" max="30" value={days} 
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="h-1 w-full bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Minimum Mentions</span>
                      <span className="text-blue-400 font-mono font-bold">{minMentions}</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" value={minMentions} 
                      onChange={(e) => setMinMentions(Number(e.target.value))}
                      className="h-1 w-full bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* List Header & Toggle */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* View Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-[#0b0f19] border border-gray-900 rounded-lg text-[10px] select-none">
              <button
                onClick={() => setActiveView('breakouts')}
                className={`py-1.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                  activeView === 'breakouts'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Breakouts
              </button>
              <button
                onClick={() => setActiveView('mostDiscussed')}
                className={`py-1.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                  activeView === 'mostDiscussed'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Most Discussed
              </button>
            </div>

            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {activeView === 'breakouts' ? 'Speculative Breakouts' : 'Most Discussed'} ({watchlistEntries.length})
              </h3>
              {listLoading && <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
            </div>

            {listError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>Sync Error: {listError}</span>
              </div>
            )}

            <div className="flex-grow overflow-y-auto pr-1 space-y-3 pb-4">
              {!listLoading && watchlistEntries.map((item) => (
                <BreakoutCard 
                  key={item.ticker}
                  data={item}
                  isSelected={selectedTicker === item.ticker}
                  onSelect={handleSelectTicker}
                />
              ))}
              {!listLoading && !listError && watchlistEntries.length === 0 && (
                <div className="p-8 text-center bg-[#0a0e17]/20 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
                  No assets detected under current parameters.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CENTER COLUMN: Analytics & Chart (Span 5) */}
        <section className="col-span-5 flex flex-col gap-4 overflow-hidden h-full">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Stock Analytics
            </h3>
          </div>

          <div className="flex-1 liquid-glass p-5 flex flex-col overflow-hidden h-full">
            {selectedData ? (
              <div className="flex-grow flex flex-col gap-5 overflow-hidden h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white leading-none">{selectedData.ticker}</h2>
                    <span className="text-xs text-slate-400 mt-1 block">{selectedData.company_name}</span>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 rounded-lg text-right">
                    <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold block">Alpha Delta</span>
                    <span className="text-2xl font-black text-blue-400 leading-none">{selectedData.breakout_alpha_score.toFixed(1)}</span>
                  </div>
                </div>

                <div className="flex-1 min-h-[220px] max-h-[300px]">
                  <MentionChart 
                    timestamps={mentionsTimestamps.length > 0 ? mentionsTimestamps : (selectedData?.timestamp_vectors || [])} 
                    ticker={selectedData?.ticker || ''} 
                  />
                </div>

                {/* Filtered logs matching this stock */}
                <div className="flex-grow flex flex-col gap-2 overflow-hidden min-h-[150px]">
                  <div className="border-t border-gray-850 pt-3 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Targeted Mentions Feed
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-400 border border-blue-800/40 font-mono">
                      {mentionsData ? mentionsData.length : 0} logs in database
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[10px] pb-4">
                    {mentionsLoading ? (
                      <div className="flex items-center justify-center p-8">
                        <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                      </div>
                    ) : !mentionsData || mentionsData.length === 0 ? (
                      <div className="p-4 text-center text-gray-600 bg-[#0c101b]/20 border border-gray-900 rounded-lg italic">
                        No historical mentions found for ${selectedTicker} in the sliding window.
                      </div>
                    ) : (
                      mentionsData.map((mention, index) => (
                        <div key={mention.id || index} className="p-2.5 bg-[#0c101b]/45 border border-gray-900/60 rounded-lg flex flex-col gap-1.5">
                          <div className="flex items-center justify-between text-gray-500 text-[9px]">
                            <span className="text-[10px] text-gray-400">{new Date(mention.timestamp).toLocaleString()}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-orange-400 font-semibold">{mention.platform}</span>
                              {mention.url && (
                                <a 
                                  href={mention.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-405 hover:text-blue-300 font-bold hover:underline transition-all"
                                >
                                  [Source]
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-300 leading-normal">"{mention.content_body}"</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-500">
                <BarChart3 className="h-10 w-10 text-slate-700 mb-2 animate-pulse" />
                <span className="text-xs">Select a watchlist stock card to open analytical dimensions.</span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Terminal Log Feed Console (Span 3) */}
        <section className="col-span-3 overflow-hidden h-full flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Live Feed
            </h3>
          </div>
          <div className="flex-grow overflow-hidden h-full">
            <ActivityConsole />
          </div>
        </section>
      </main>

      {/* 📱 MOBILE BOTTOM NAVIGATION TAB BAR */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#080c14]/90 backdrop-blur-lg border-t border-gray-950 flex justify-around items-center z-40 lg:hidden shadow-[0_-5px_15px_rgba(0,0,0,0.4)]">
        <button 
          onClick={() => setActiveTab('watchlist')}
          className={`flex flex-col items-center gap-1 py-1 w-full text-center transition-all ${
            activeTab === 'watchlist' ? 'text-blue-400' : 'text-slate-500'
          }`}
        >
          <TrendingUp className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Watchlist</span>
        </button>

        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex flex-col items-center gap-1 py-1 w-full text-center transition-all ${
            activeTab === 'analytics' ? 'text-blue-400' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Analytics</span>
        </button>

        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex flex-col items-center gap-1 py-1 w-full text-center transition-all ${
            activeTab === 'activity' ? 'text-blue-400' : 'text-slate-500'
          }`}
        >
          <Terminal className="h-4.5 w-4.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Live Logs</span>
        </button>
      </nav>

      {/* ⚙️ UNIFIED DIAGNOSTICS & SETTINGS DRAWER (Slide-over) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsSettingsOpen(false)}
            />
            
            {/* Slide-over panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 max-w-sm w-full bg-[#0a0e17] border-l border-gray-900 p-6 z-50 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-950 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Config & Diagnostics
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Parameters Sliders (Only visible on mobile inside drawer) */}
                <div className="space-y-4 lg:hidden">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Scraping Parameters
                  </h4>
                  
                  <div className="space-y-3 bg-[#111524] p-3 rounded-lg border border-gray-950">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Days Range</span>
                        <span className="text-blue-400 font-mono font-bold">{days}d</span>
                      </div>
                      <input 
                        type="range" min="1" max="30" value={days} 
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="h-1 w-full bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Min Mentions</span>
                        <span className="text-blue-400 font-mono font-bold">{minMentions}</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" value={minMentions} 
                        onChange={(e) => setMinMentions(Number(e.target.value))}
                        className="h-1 w-full bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* System Diagnostics Metrics */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Core Health Status
                  </h4>

                  {/* Database status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#111524] border border-gray-950">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-indigo-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">SQLite Database</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Size: {status?.database?.size_bytes ? `${(status.database.size_bytes / 1024).toFixed(1)} KB` : '0 KB'}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      dbConnected ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/20 text-red-400'
                    }`}>
                      {dbConnected ? 'Active' : 'Offline'}
                    </span>
                  </div>

                  {/* Scheduler Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#111524] border border-gray-950">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-blue-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Task Scheduler</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          Active jobs: {status?.scheduler?.active_jobs?.length || 0}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      status?.scheduler?.status === 'running' 
                        ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                        : 'bg-[#1a2236] text-slate-500'
                    }`}>
                      {status?.scheduler?.status || 'Stopped'}
                    </span>
                  </div>

                  {/* Circuit Breaker Status */}
                  <div className="p-3 rounded-lg bg-[#111524] border border-gray-950 space-y-2">
                    <div className="flex items-center justify-between border-b border-gray-950 pb-2">
                      <span className="text-xs font-semibold text-slate-200">Twitter Breaker</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isDegraded ? 'bg-yellow-950/20 text-yellow-400 border border-yellow-900/30' : 'bg-emerald-950/20 text-emerald-400'
                      }`}>
                        {status?.circuit_breakers?.twitter?.state || 'CLOSED'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Consecutive Failures:</span>
                        <span className="font-mono">{status?.circuit_breakers?.twitter?.failures || 0} / 3</span>
                      </div>
                      {isDegraded && status?.circuit_breakers?.twitter?.retry_at && (
                        <div className="flex justify-between text-yellow-400 font-medium">
                          <span>Retry Cooldown:</span>
                          <span>
                            {Math.max(1, Math.round((new Date(status.circuit_breakers.twitter.retry_at).getTime() - Date.now()) / 60000))} min
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[10px] text-gray-600 border-t border-gray-950 pt-4 font-mono text-center">
                Smoke Recon Engine &copy; 2026
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
