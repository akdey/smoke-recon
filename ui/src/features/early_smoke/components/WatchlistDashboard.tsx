import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, BarChart3, Terminal, Settings, RefreshCw, AlertCircle, 
  Flame, Database, Cpu, X, HelpCircle, SlidersHorizontal, Bell, BellOff,
  Gauge, Volume2, Sparkles, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWatchlist } from '../hooks/useWatchlist';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useActivityStream } from '../hooks/useActivityStream';
import { useMostDiscussed } from '../hooks/useMostDiscussed';
import { useMentions } from '../hooks/useMentions';
import BreakoutCard from './BreakoutCard';
import MentionChart from './MentionChart';

export default function WatchlistDashboard() {
  const [days, setDays] = useState<number>(7);
  const [minMentions, setMinMentions] = useState<number>(3);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'activity'>('watchlist');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<'breakouts' | 'mostDiscussed'>('breakouts');
  const [notifPermission, setNotifPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        setDeferredPrompt(null);
        setShowInstallBtn(false);
      });
    }
  };

  const requestNotificationPermission = () => {
    if (typeof Notification !== 'undefined') {
      Notification.requestPermission().then((permission) => {
        setNotifPermission(permission);
      });
    }
  };

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
    average_sentiment: item.average_sentiment || 0.0,
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
  };

  const selectedData = watchlistEntries.find(w => w.ticker === selectedTicker) || null;
  const mentionsTimestamps = mentionsData?.map(m => m.timestamp).sort() || [];

  const dbConnected = status?.database?.status === 'connected';
  const isDegraded = status?.status === 'degraded';

  // Calculate macroeconomic statistics for top horizontal panel
  const totalSpeculativeSignals = useMemo(() => {
    return watchlistEntries.reduce((sum, item) => sum + (item.social_mentions || 0), 0);
  }, [watchlistEntries]);

  const overallMarketSentiment = useMemo(() => {
    if (!watchlistEntries || watchlistEntries.length === 0) return 0;
    const sum = watchlistEntries.reduce((acc, item) => acc + (item.average_sentiment || 0), 0);
    return roundToTwo(sum / watchlistEntries.length);
  }, [watchlistEntries]);

  function roundToTwo(num: number) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // Local Push Notification Trigger for speculative alerts
  useEffect(() => {
    if (activities.length > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const lastAct = activities[activities.length - 1];
      const isFresh = (Date.now() - new Date(lastAct.timestamp).getTime()) < 10000;
      if (lastAct.event_type === 'mention' && isFresh) {
        new Notification('🚨 Speculative Smoke Breakout!', {
          body: `Ticker $${lastAct.ticker} matched in ${lastAct.source} chatter. Detail: ${lastAct.message}`,
          tag: `mention-${lastAct.ticker}`,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>💨</text></svg>'
        });
      }
    }
  }, [activities]);

  return (
    <div className="flex-grow flex flex-row h-full min-h-screen bg-[#04060a] text-slate-100 relative overflow-hidden font-sans">
      {/* 🔮 ADVANCED LIQUID BACKGROUND WITH MESH BLOBS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-blue-600/10 via-indigo-500/10 to-violet-600/5 blur-[120px] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-fuchsia-600/10 via-purple-600/10 to-indigo-600/5 blur-[140px] animate-pulse" style={{ animationDuration: '18s' }} />
        <div className="absolute top-[30%] left-[25%] w-[35%] h-[35%] rounded-full bg-gradient-to-br from-cyan-600/5 via-blue-600/5 to-teal-500/5 blur-[100px] animate-pulse" style={{ animationDuration: '15s' }} />
        
        {/* SVG Textured Noise Overlay */}
        <div className="absolute inset-0 opacity-[0.012] pointer-events-none mix-blend-overlay" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} />
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

      {/* ==================== DESKTOP COLUMN 1: DIAGNOSTICS & SYSTEM SIDEBAR ==================== */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-white/[0.05] bg-[#07090f]/75 backdrop-blur-xl relative z-20 p-5 select-none shrink-0 justify-between">
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.05]">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-sky-400 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.3)]">
              <Flame className="h-5 w-5 text-white fill-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-widest bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent uppercase block">
                SMOKE RECON
              </span>
              <span className="text-[8px] text-slate-500 font-mono tracking-wider font-bold">SPECULATIVE CORE</span>
            </div>
          </div>

          {/* Quick Controls Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              <span>Parameters</span>
              <SlidersHorizontal className="h-3 w-3 text-slate-500" />
            </div>

            <div className="space-y-3 bg-[#0a0e17]/50 border border-white/[0.03] p-3 rounded-lg">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Sliding Window</span>
                  <span className="text-blue-400 font-bold">{days} Days</span>
                </div>
                <input 
                  type="range" min="1" max="30" value={days} 
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="h-1 w-full bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Min Mentions</span>
                  <span className="text-blue-400 font-bold">{minMentions} Posts</span>
                </div>
                <input 
                  type="range" min="1" max="10" value={minMentions} 
                  onChange={(e) => setMinMentions(Number(e.target.value))}
                  className="h-1 w-full bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Core diagnostics */}
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block">
              Core Status
            </span>

            {/* DB Health */}
            <div className="p-2.5 rounded-lg bg-[#0a0e17]/40 border border-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-indigo-400" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Database Link</span>
                  <span className="text-[8px] text-slate-500 block font-mono">
                    {status?.database?.size_bytes ? `${(status.database.size_bytes / 1024).toFixed(1)} KB` : '0 KB'}
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                dbConnected ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/20 text-red-400'
              }`}>
                {dbConnected ? 'Active' : 'Offline'}
              </span>
            </div>

            {/* Scheduler Health */}
            <div className="p-2.5 rounded-lg bg-[#0a0e17]/40 border border-white/[0.03] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5 text-blue-400" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-200 block truncate">Job Scheduler</span>
                  <span className="text-[8px] text-slate-500 block font-mono">
                    Crawl loops: {status?.scheduler?.active_jobs?.length || 0}
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                status?.scheduler?.status === 'running' 
                  ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {status?.scheduler?.status || 'Stopped'}
              </span>
            </div>

            {/* Breaker States */}
            <div className="p-2.5 rounded-lg bg-[#0a0e17]/40 border border-white/[0.03] space-y-1.5 font-mono text-[9px] text-slate-400">
              <div className="flex items-center justify-between border-b border-white/[0.02] pb-1">
                <span className="font-semibold text-slate-200">Twitter Breaker</span>
                <span className={`text-[8px] font-extrabold px-1 py-0.2 rounded border uppercase ${
                  isDegraded ? 'text-yellow-450 bg-yellow-500/10 border-yellow-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  {status?.circuit_breakers?.twitter?.state || 'CLOSED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Failures:</span>
                <span>{status?.circuit_breakers?.twitter?.failures || 0} / 3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/[0.05]">
          {/* PWA CTA */}
          {showInstallBtn && (
            <button
              onClick={handleInstallClick}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Install Web App
            </button>
          )}

          {/* User Alert Settings / Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-500 tracking-wider font-mono">PUSH ALERTS</span>
              <button
                onClick={requestNotificationPermission}
                className={`p-1 rounded-md transition-all active:scale-95 flex items-center justify-center ${
                  notifPermission === 'granted'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-white/[0.03] border border-white/[0.05] text-slate-500 hover:text-slate-300'
                }`}
              >
                {notifPermission === 'granted' ? (
                  <Bell className="h-3.5 w-3.5" />
                ) : (
                  <BellOff className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <span className="text-[8px] text-slate-500 block leading-normal font-mono">
              {notifPermission === 'granted' 
                ? 'Real-time phone alerts enabled.'
                : 'Allow push notification access to trigger alerts in phone.'}
            </span>
          </div>
        </div>
      </aside>

      {/* ==================== DESKTOP COLUMN 2 & 3 CONTAINER ==================== */}
      <div className="flex-grow flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        
        {/* HEADER PANEL FOR MOBILE AND GLOBAL CONTROLS */}
        <header className="bg-[#07090f]/70 backdrop-blur-xl border-b border-white/[0.05] px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 select-none">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-7.5 w-7.5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
              <Flame className="h-4.5 w-4.5 text-white fill-white" />
            </div>
            <div>
              <span className="text-xs font-black tracking-widest bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent uppercase block">
                SMOKE RECON
              </span>
              <span className="text-[8px] text-gray-500 font-mono">SPECULATIVE PIPELINE</span>
            </div>
          </div>

          {/* Desktop telemetry indicator */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-blue-400 animate-pulse" /> Live Pipeline Command Center
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile PWA Install button */}
            {showInstallBtn && (
              <button
                onClick={handleInstallClick}
                className="px-2 py-1 rounded-md bg-blue-600/30 border border-blue-500/40 text-blue-450 font-black text-[9px] uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(59,130,246,0.15)] flex items-center gap-1 active:scale-95"
              >
                <Sparkles className="h-3 w-3" /> Install
              </button>
            )}

            {/* Mobile notification toggle */}
            <button
              onClick={requestNotificationPermission}
              className={`lg:hidden p-1.5 rounded-lg border transition-all active:scale-95 ${
                notifPermission === 'granted'
                  ? 'bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/50 text-blue-400'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-slate-400'
              }`}
            >
              {notifPermission === 'granted' ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>

            {/* Syncing Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`}></span>
              <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest font-mono">
                {connected ? 'Pipeline Ingestion Live' : 'Syncing Streams'}
              </span>
            </div>

            {/* Mobile Settings Toggle */}
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ==================== MACRO TELEMETRY STATS BARS ==================== */}
        <section className="px-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
          {/* Card 1: Speculative Alerts */}
          <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">SPECULATIVE VOLUME</span>
              <span className="text-xl font-extrabold text-white mt-1 block leading-none font-mono">{totalSpeculativeSignals} posts</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Volume2 className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Card 2: Active Watchlist */}
          <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">ACTIVE IN-FOCUS</span>
              <span className="text-xl font-extrabold text-white mt-1 block leading-none font-mono">{watchlistEntries.length} tickers</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Flame className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Card 3: Ingestion Rate */}
          <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">STREAM INTENSITY</span>
              <span className="text-xl font-extrabold text-white mt-1 block leading-none font-mono">
                {activities.filter(a => (Date.now() - new Date(a.timestamp).getTime()) < 60000).length} / min
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Gauge className="h-4.5 w-4.5" />
            </div>
          </div>

          {/* Card 4: Net Sentiment */}
          <div className="p-3.5 rounded-xl bg-white/[0.01] border border-white/[0.04] flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.02)]">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">NET SENTIMENT</span>
              <span className={`text-xl font-extrabold mt-1 block leading-none font-mono ${
                overallMarketSentiment > 0.15 ? 'text-emerald-400 animate-pulse' : overallMarketSentiment < -0.15 ? 'text-rose-450' : 'text-slate-350'
              }`}>
                {overallMarketSentiment > 0 ? `+${overallMarketSentiment.toFixed(2)}` : overallMarketSentiment.toFixed(2)}
              </span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
          </div>
        </section>

        {/* 📱 MOBILE VIEW TABS SELECTOR (Only visible below LG screens) */}
        <section className="lg:hidden px-6 pt-4 select-none">
          <div className="grid grid-cols-2 bg-[#0a0e16] border border-white/[0.05] rounded-xl p-1 text-xs">
            <button
              onClick={() => {
                setActiveTab('watchlist');
              }}
              className={`py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === 'watchlist' ? 'bg-blue-600/20 border border-blue-500/30 text-white' : 'text-slate-400'
              }`}
            >
              Watchlist
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === 'activity' ? 'bg-blue-600/20 border border-blue-500/30 text-white' : 'text-slate-400'
              }`}
            >
              Live Logs
            </button>
          </div>
        </section>

        {/* ==================== DESKTOP DUAL VIEW AND MOBILE ANCHOR CONTAINER ==================== */}
        <div className="flex-1 px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden h-full">

          {/* DESKTOP COLUMN 1: SPECULATIVE EXPLORER BOARD / MOBILE DRILL DOWN */}
          <section className={`lg:col-span-5 flex flex-col gap-4 overflow-hidden h-full ${activeTab === 'watchlist' ? 'flex' : 'hidden lg:flex'}`}>
            
            {/* Mobile List-Detail Drill-down Layout */}
            <div className="lg:hidden flex-grow flex flex-col overflow-hidden h-full">
              {selectedTicker && selectedData ? (
                /* Mobile Detailed Stock Drill Down view */
                <div className="flex-grow flex flex-col gap-4 overflow-y-auto pb-12 pr-1">
                  <button 
                    onClick={() => setSelectedTicker(null)} 
                    className="flex items-center gap-1.5 text-xs text-blue-400 font-mono font-bold uppercase tracking-wider mb-2 self-start active:scale-95 transition-transform"
                  >
                    ← Back to List
                  </button>

                  {/* Stock Meta details Card */}
                  <div className="bg-[#0c101b]/50 border border-white/[0.04] rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-white">{selectedData.ticker}</h2>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono shrink-0 ${
                            selectedData.average_sentiment > 0.15 
                              ? 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20' 
                              : selectedData.average_sentiment < -0.15 
                                ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' 
                                : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                          }`}>
                            {selectedData.average_sentiment > 0.15 ? 'Bullish' : selectedData.average_sentiment < -0.15 ? 'Bearish' : 'Neutral'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase mt-0.5 block">{selectedData.company_name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[9px] text-slate-550 uppercase tracking-widest block font-bold">Alpha Score</span>
                        <span className="text-xl font-black text-blue-400">{selectedData.breakout_alpha_score.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart section */}
                  <div className="bg-[#0c101b]/50 border border-white/[0.04] rounded-xl p-4 h-[240px] shrink-0">
                    <MentionChart 
                      timestamps={mentionsTimestamps.length > 0 ? mentionsTimestamps : (selectedData?.timestamp_vectors || [])} 
                      ticker={selectedData?.ticker || ''} 
                      sentiment={selectedData.average_sentiment}
                    />
                  </div>

                  {/* Comments feed */}
                  <div className="flex-1 flex flex-col gap-2.5 min-h-[180px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                      Recent Chatter Feed ({mentionsData ? mentionsData.length : 0})
                    </h3>
                    <div className="space-y-2 font-mono text-[10px]">
                      {mentionsLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                        </div>
                      ) : !mentionsData || mentionsData.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 bg-white/[0.01] border border-white/[0.03] rounded-xl italic">
                          No recent comment details found in database.
                        </div>
                      ) : (
                        mentionsData.map((mention, index) => (
                          <div 
                            key={mention.id || index} 
                            className={`p-3 bg-[#080a10]/50 border rounded-xl flex flex-col gap-1.5 relative overflow-hidden ${
                              mention.sentiment > 0.15 
                                ? 'border-emerald-500/10' 
                                : mention.sentiment < -0.15 
                                  ? 'border-rose-500/10' 
                                  : 'border-white/[0.03]'
                            }`}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                              mention.sentiment > 0.15 ? 'bg-emerald-500' : mention.sentiment < -0.15 ? 'bg-rose-500' : 'bg-slate-700'
                            }`} />
                            <div className="flex items-center justify-between text-gray-500 text-[9px] pl-1 font-bold">
                              <span>{new Date(mention.timestamp).toLocaleTimeString()}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-extrabold px-1 rounded uppercase border font-mono ${
                                  mention.sentiment > 0.15 
                                    ? 'text-emerald-450 bg-emerald-500/5 border-emerald-500/10' 
                                    : mention.sentiment < -0.15 
                                      ? 'text-rose-450 bg-rose-500/5 border-rose-500/10' 
                                      : 'text-slate-405 bg-slate-500/5 border-slate-500/10'
                                }`}>
                                  {mention.sentiment > 0.15 ? 'Bull' : mention.sentiment < -0.15 ? 'Bear' : 'Neut'} ({mention.sentiment > 0 ? `+${mention.sentiment.toFixed(1)}` : mention.sentiment.toFixed(1)})
                                </span>
                                <span className="text-orange-400 font-semibold">{mention.platform}</span>
                                {mention.url && (
                                  <a href={mention.url} target="_blank" rel="noopener noreferrer" className="text-blue-450 hover:underline">[Source]</a>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-300 pl-1 leading-normal">"{mention.content_body}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Score Explanation footer */}
                  <div className="p-3 bg-blue-950/15 border border-blue-900/30 rounded-xl text-[9px] text-slate-400 leading-normal flex items-start gap-2 select-none mt-2">
                    <HelpCircle className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-200 block mb-0.5">SPECULATIVE BREAKOUT SCORING</strong>
                      The <strong>Alpha Score</strong> represents cumulative retail discussion density weighted by sentiment. Bullish mentions increase the score, bearish mentions decrease it, and mainstream news articles are subtracted (Set Difference) to reveal stealth trends before they go public.
                    </div>
                  </div>
                </div>
              ) : (
                /* Mobile Cards List View */
                <div className="flex-grow flex flex-col gap-3 h-full">
                  <div className="grid grid-cols-2 p-1 bg-[#090b11] border border-white/[0.04] rounded-xl text-[10px] select-none font-mono">
                    <button
                      onClick={() => setActiveView('breakouts')}
                      className={`py-2 rounded-lg font-bold uppercase tracking-widest transition-all ${
                        activeView === 'breakouts'
                          ? 'bg-blue-600/20 border border-blue-500/20 text-blue-400 shadow-md'
                          : 'text-slate-500'
                      }`}
                    >
                      Breakouts
                    </button>
                    <button
                      onClick={() => setActiveView('mostDiscussed')}
                      className={`py-2 rounded-lg font-bold uppercase tracking-widest transition-all ${
                        activeView === 'mostDiscussed'
                          ? 'bg-blue-600/20 border border-blue-500/20 text-blue-400 shadow-md'
                          : 'text-slate-500'
                      }`}
                    >
                      Most Discussed
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                      {activeView === 'breakouts' ? 'Speculative Breakouts' : 'Most Discussed'} ({watchlistEntries.length})
                    </h2>
                    {listLoading && <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />}
                  </div>

                  <div className="space-y-2.5 overflow-y-auto flex-1 pb-16">
                    {watchlistEntries.map((item) => (
                      <BreakoutCard 
                        key={item.ticker}
                        data={item}
                        isSelected={selectedTicker === item.ticker}
                        onSelect={handleSelectTicker}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop-Only list explorer elements */}
            <div className="hidden lg:flex flex-col gap-4 overflow-hidden h-full w-full">
              {/* Heading and Filters toggle */}
              <div className="flex items-center justify-between select-none">
                {/* Premium Slide tab switcher */}
                <div className="flex items-center bg-[#090b11] border border-white/[0.04] p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={() => setActiveView('breakouts')}
                    className={`px-3 py-1 rounded font-bold uppercase tracking-widest font-mono transition-all ${
                      activeView === 'breakouts'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-blue-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Breakouts
                  </button>
                  <button
                    onClick={() => setActiveView('mostDiscussed')}
                    className={`px-3 py-1 rounded font-bold uppercase tracking-widest font-mono transition-all ${
                      activeView === 'mostDiscussed'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-blue-400'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Most Discussed
                  </button>
                </div>
              </div>

              {/* Error notifications */}
              {listError && (
                <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl flex items-center gap-3 text-red-300 text-xs">
                  <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                  <span>Synchronisation error: {listError}</span>
                </div>
              )}

              {/* Stock Cards Scrollable container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 relative min-h-[350px]">
                {listLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs gap-3 select-none">
                    <RefreshCw className="h-6 w-6 text-blue-400 animate-spin" />
                    <span>Telemetry feed syncing...</span>
                  </div>
                ) : !listLoading && watchlistEntries.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-[#0a0e17]/10 border border-dashed border-white/[0.03] rounded-2xl select-none">
                    <AlertCircle className="h-9 w-9 text-slate-700 mb-2" />
                    <span className="font-bold text-slate-400 text-sm">Speculative Feed Idle</span>
                    <span className="text-[10px] text-slate-500 max-w-xs mt-1">
                      Check scraping parameters, window scopes, or database connection settings.
                    </span>
                  </div>
                ) : (
                  watchlistEntries.map((item) => (
                    <BreakoutCard 
                      key={item.ticker}
                      data={item}
                      isSelected={selectedTicker === item.ticker}
                      onSelect={handleSelectTicker}
                    />
                  ))
                )}
              </div>
            </div>
          </section>

          {/* DESKTOP COLUMN 2: ANALYTICS TERMINAL (LG span 7, hidden on mobile since mobile uses drill-down) */}
          <section className="hidden lg:flex lg:col-span-7 flex-col gap-4 overflow-hidden h-full">
            <div className="flex-grow liquid-glass p-5 flex flex-col overflow-hidden h-full rounded-2xl relative shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
              
              {selectedData ? (
                <div className="flex-grow flex flex-col gap-5 overflow-hidden h-full">
                  
                  {/* Detailed Stock Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-4 select-none">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-white leading-none tracking-tight">{selectedData.ticker}</h2>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider font-mono shrink-0 ${
                          selectedData.average_sentiment > 0.15 
                            ? 'text-emerald-450 bg-emerald-500/10 border-emerald-500/20' 
                            : selectedData.average_sentiment < -0.15 
                              ? 'text-rose-450 bg-rose-500/10 border-rose-500/20' 
                              : 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        }`}>
                          {selectedData.average_sentiment > 0.15 ? 'Bullish' : selectedData.average_sentiment < -0.15 ? 'Bearish' : 'Neutral'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 mt-1 block font-mono uppercase tracking-wider">{selectedData.company_name}</span>
                    </div>

                    <div className="bg-blue-600/5 border border-blue-500/20 px-3.5 py-2 rounded-xl text-right">
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono font-bold block">Alpha Score</span>
                      <span className="text-2xl font-black text-blue-400 leading-none block mt-0.5">{selectedData.breakout_alpha_score.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Chart section */}
                  <div className="h-[210px] w-full shrink-0">
                    <MentionChart 
                      timestamps={mentionsTimestamps.length > 0 ? mentionsTimestamps : (selectedData?.timestamp_vectors || [])} 
                      ticker={selectedData?.ticker || ''} 
                      sentiment={selectedData.average_sentiment}
                    />
                  </div>

                  {/* Targeted Comments ledger stream */}
                  <div className="flex-grow flex flex-col gap-2.5 overflow-hidden min-h-[160px]">
                    <div className="border-t border-white/[0.04] pt-3 flex items-center justify-between select-none">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                        Targeted Speculative Comments Feed
                      </h4>
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-400 border border-white/[0.05] font-mono">
                        {mentionsData ? mentionsData.length : 0} elements recorded
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-[10px] pb-4">
                      {mentionsLoading ? (
                        <div className="flex items-center justify-center p-8">
                          <RefreshCw className="h-4.5 w-4.5 text-blue-400 animate-spin" />
                        </div>
                      ) : !mentionsData || mentionsData.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 bg-white/[0.01] border border-dashed border-white/[0.03] rounded-xl italic select-none">
                          No matching text mentions found in the current time-slice database.
                        </div>
                      ) : (
                        mentionsData.map((mention, index) => (
                          <div 
                            key={mention.id || index} 
                            className={`p-3 bg-[#080a10]/50 border rounded-xl flex flex-col gap-1.5 relative overflow-hidden transition-all duration-300 hover:border-white/[0.1] ${
                              mention.sentiment > 0.15 
                                ? 'border-emerald-500/10' 
                                : mention.sentiment < -0.15 
                                  ? 'border-rose-500/10' 
                                  : 'border-white/[0.03]'
                            }`}
                          >
                            {/* Accent Vertical Sentiment Indicator bar */}
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                              mention.sentiment > 0.15 
                                ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                                : mention.sentiment < -0.15 
                                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' 
                                  : 'bg-slate-700'
                            }`} />

                            <div className="flex items-center justify-between text-gray-500 text-[9px] pl-1 font-bold select-none">
                              <span className="text-gray-400">{new Date(mention.timestamp).toLocaleString()}</span>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-extrabold px-1 rounded uppercase border font-mono ${
                                  mention.sentiment > 0.15 
                                    ? 'text-emerald-450 bg-emerald-500/5 border-emerald-500/10' 
                                    : mention.sentiment < -0.15 
                                      ? 'text-rose-450 bg-rose-500/5 border-rose-500/10' 
                                      : 'text-slate-405 bg-slate-500/5 border-slate-500/10'
                                }`}>
                                  {mention.sentiment > 0.15 ? 'Bull' : mention.sentiment < -0.15 ? 'Bear' : 'Neut'} ({mention.sentiment > 0 ? `+${mention.sentiment.toFixed(1)}` : mention.sentiment.toFixed(1)})
                                </span>
                                <span className="text-blue-400 uppercase tracking-widest text-[8px] bg-blue-500/5 px-1 py-0.2 rounded border border-blue-500/10">
                                  {mention.platform}
                                </span>
                                {mention.url && (
                                  <a 
                                    href={mention.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-450 hover:text-blue-300 font-bold hover:underline transition-all"
                                  >
                                    [Source]
                                  </a>
                                )}
                              </div>
                            </div>
                            <p className="text-slate-300 leading-relaxed pl-1">"{mention.content_body}"</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Explanatory telemetry footer */}
                  <div className="p-3 bg-blue-950/15 border border-blue-900/30 rounded-xl text-[9px] text-slate-400 leading-normal flex items-start gap-2 select-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.01)]">
                    <HelpCircle className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-200 block mb-0.5">SPECULATIVE BREAKOUT SCORING METRICS</strong>
                      The <strong>Alpha Score</strong> represents cumulative retail discussion density weighted by sentiment. Bullish mentions increase the score, bearish mentions decrease it, and mainstream news articles are subtracted (Set Difference) to reveal stealth trends before they go public.
                    </div>
                  </div>
                </div>
              ) : (
                // Rotating radar sweeping empty state
                <div className="flex-grow flex flex-col items-center justify-center text-center p-8 select-none">
                  <div className="relative h-28 w-28 mb-5 flex items-center justify-center">
                    <div className="absolute top-4 left-6 h-1.5 w-1.5 rounded-full bg-emerald-450 animate-ping" />
                    <div className="absolute bottom-6 right-3 h-1.5 w-1.5 rounded-full bg-blue-450 animate-ping" />
                    <div className="absolute top-1/2 left-2/3 h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />

                    <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-radar" style={{ borderRightColor: '#60a5fa' }} />
                    <div className="absolute inset-4 rounded-full border border-dashed border-white/[0.04]" />
                    <div className="absolute inset-10 rounded-full border border-white/[0.03]" />
                    
                    <Terminal className="h-8 w-8 text-slate-700 animate-pulse" />
                  </div>
                  <span className="font-extrabold text-slate-400 uppercase tracking-widest text-[11px] font-mono">
                    NO TARGET LOCK ENABLED
                  </span>
                  <span className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Select an active speculative asset from the watchlist explorer to target telemetry.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* SYSTEM CONSOLE STREAM (collapsible/visible when logs tab selected on mobile) */}
          <section className={`lg:hidden flex flex-col gap-4 overflow-hidden h-full ${activeTab === 'activity' ? 'flex' : 'hidden'}`}>
            <div className="flex-grow bg-[#07090f]/75 border border-white/[0.05] rounded-xl p-4 overflow-y-auto space-y-2.5 font-mono text-[10px]">
              {activities.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 italic">
                  Telemetry logs streaming pending...
                </div>
              ) : (
                activities.map((event, index) => (
                  <div key={index} className="flex flex-col gap-1 border-b border-white/[0.02] pb-2">
                    <div className="flex items-center justify-between text-slate-500 text-[9px]">
                      <span>[{new Date(event.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-orange-400 font-bold uppercase">{event.event_type}</span>
                    </div>
                    <span className="text-slate-350">{event.message}</span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </div>

      {/* ==================== GLOBAL CONFIG & HEALTH DIAGNOSTICS MODAL ==================== */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            {/* Backdrop Blur layer */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            />
            {/* Drawer sheet */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 right-0 max-w-sm w-full bg-[#090b11] border-l border-white/[0.06] p-6 z-50 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-4 select-none">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-400" />
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-mono">
                      Diagnostics Terminal
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Parameters sliders for Mobile */}
                <div className="space-y-4 lg:hidden">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Scrape Scoping
                  </h4>
                  
                  <div className="space-y-3 bg-[#0c101a] p-4 rounded-xl border border-white/[0.03]">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Days Range</span>
                        <span className="text-blue-400 font-mono font-bold">{days}d</span>
                      </div>
                      <input 
                        type="range" min="1" max="30" value={days} 
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="h-1 w-full bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
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
                        className="h-1 w-full bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* System Diagnostics Metrics */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                    Node Health statuses
                  </h4>

                  {/* Database status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c101a] border border-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-indigo-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">SQLite Database</span>
                        <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c101a] border border-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-blue-400" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Task Scheduler</span>
                        <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                          Active jobs: {status?.scheduler?.active_jobs?.length || 0}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      status?.scheduler?.status === 'running' 
                        ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' 
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {status?.scheduler?.status || 'Stopped'}
                    </span>
                  </div>

                  {/* Circuit Breaker Status */}
                  <div className="p-3 rounded-lg bg-[#0c101a] border border-white/[0.03] space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.02] pb-2 font-mono text-xs">
                      <span className="text-slate-200">Twitter Breaker</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        isDegraded ? 'bg-yellow-950/20 text-yellow-400 border border-yellow-900/30' : 'bg-emerald-950/20 text-emerald-400'
                      }`}>
                        {status?.circuit_breakers?.twitter?.state || 'CLOSED'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-1 font-mono">
                      <div className="flex justify-between">
                        <span>Consecutive Failures:</span>
                        <span>{status?.circuit_breakers?.twitter?.failures || 0} / 3</span>
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
              <div className="text-[10px] text-slate-600 border-t border-white/[0.04] pt-4 font-mono text-center select-none">
                Smoke Recon Engine &copy; 2026
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
