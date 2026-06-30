import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Terminal, Settings, RefreshCw, AlertCircle, 
  Flame, Bell, BellOff, Rocket, CheckCircle2, ChevronRight
} from 'lucide-react';
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
  
  // Matrix configurations (0-100 for sliders, converted to 0.0-1.0 for API)
  const [wRedditBody, setWRedditBody] = useState<number>(45);
  const [wRedditNested, setWRedditNested] = useState<number>(20);
  const [wTwitter, setWTwitter] = useState<number>(25);
  const [wBoards, setWBoards] = useState<number>(10);

  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'streams' | 'profile'>('home');
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
      deferredPrompt.userChoice.then(() => {
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

  // Load API hooks with weight parameters
  const { data, loading, error } = useWatchlist(
    days, minMentions, 
    wRedditBody/100, wRedditNested/100, wTwitter/100, wBoards/100
  );
  const { data: mostDiscussedData, loading: mostDiscussedLoading, error: mostDiscussedError } = useMostDiscussed(
    days,
    wRedditBody/100, wRedditNested/100, wTwitter/100, wBoards/100
  );
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

  const selectedData = watchlistEntries.find(w => w.ticker === selectedTicker) || null;
  const mentionsTimestamps = mentionsData?.map(m => m.timestamp).sort() || [];

  const dbConnected = status?.database?.status === 'connected';

  // Push Notifications
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

  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeTab === 'streams') {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities, activeTab]);

  return (
    <div className="font-body-base text-body-base min-h-screen relative overflow-hidden">
      <div className="mesh-gradient-bg"></div>

      {/* Top Navigation Anchor */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm flex justify-between items-center w-full px-gutter h-16">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">sensors</span>
          <span className="font-data-mono text-metadata-tiny tracking-widest text-primary font-bold">RECON_ENG</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={requestNotificationPermission}
            className={`material-symbols-outlined text-[20px] cursor-pointer transition-colors ${notifPermission === 'granted' ? 'text-primary' : 'text-on-surface-variant'}`}
          >
            {notifPermission === 'granted' ? 'notifications_active' : 'notifications'}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-8 h-8 rounded-full border border-primary-container/20 bg-surface-container-high overflow-hidden flex items-center justify-center text-on-surface hover:bg-surface-variant transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`px-gutter pb-32 transition-all ${isSettingsOpen ? 'opacity-30 pointer-events-none blur-sm' : ''}`}>
        
        {/* VIEW: HOME (Watchlist) */}
        {activeTab === 'home' && (
          <>
            {/* System Status Banner */}
            <section className="mt-6">
              <div className="glass-card px-4 py-3 flex justify-between items-center rounded-lg border-primary-container/10">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${dbConnected ? 'bg-primary animate-ping' : 'bg-error'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dbConnected ? 'bg-primary' : 'bg-error'}`}></span>
                  </span>
                  <span className={`font-data-mono text-data-mono uppercase tracking-tighter ${dbConnected ? 'text-primary' : 'text-error'}`}>
                    System Health: {dbConnected ? 'Nominal' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-data-mono text-data-mono text-on-surface-variant">Jobs: {status?.scheduler?.active_jobs?.length || 0}</span>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">terminal</span>
                </div>
              </div>
            </section>

            {/* Page Hero */}
            <section className="mt-8 mb-6">
              <h1 className="font-display-lg text-[32px] font-bold leading-tight tracking-tight">Hype Breakout Watchlist</h1>
              <p className="text-on-surface-variant mt-2 font-body-base leading-relaxed opacity-80">
                <span className="text-primary font-bold">Set Difference Logic:</span> Surfacing tickers active in social streams but absent from traditional financial media outlets.
              </p>
            </section>

            {/* Segmented Control Tabs */}
            <nav className="flex gap-1 p-1 bg-void-obsidian/60 border border-outline-variant/20 rounded-xl mb-8">
              <button 
                onClick={() => setActiveView('breakouts')}
                className={`flex-1 py-3 text-center rounded-lg font-headline-md text-[14px] transition-all ${activeView === 'breakouts' ? 'bg-primary-container/10 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Hype Breakouts
              </button>
              <button 
                onClick={() => setActiveView('mostDiscussed')}
                className={`flex-1 py-3 text-center rounded-lg font-headline-md text-[14px] transition-all ${activeView === 'mostDiscussed' ? 'bg-primary-container/10 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                Most Discussed
              </button>
            </nav>

            {/* Error Handling */}
            {listError && (
              <div className="mb-4 p-4 glass-card border-error/20 rounded-lg flex items-center gap-3 text-error text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Sync error: {listError}</span>
              </div>
            )}

            {/* Breakout Cards List */}
            <div className="space-y-4">
              {listLoading ? (
                <div className="py-12 flex justify-center">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : watchlistEntries.length === 0 ? (
                <div className="py-12 text-center text-on-surface-variant">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No anomalous activity detected.</p>
                </div>
              ) : (
                watchlistEntries.map(item => (
                  <BreakoutCard 
                    key={item.ticker}
                    data={item}
                    isSelected={selectedTicker === item.ticker}
                    onSelect={(t) => {
                      setSelectedTicker(t);
                      setActiveTab('explore');
                    }}
                  />
                ))
              )}
            </div>
          </>
        )}

        {/* VIEW: EXPLORE (Asset Detail) */}
        {activeTab === 'explore' && (
          <section className="mt-6 flex flex-col gap-6">
            <button 
              onClick={() => setActiveTab('home')}
              className="self-start flex items-center gap-2 text-primary font-data-mono text-[12px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Return to Watchlist
            </button>

            {selectedData ? (
              <>
                {/* Header Card */}
                <div className="glass-card rounded-xl p-5 flex justify-between items-center relative">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="font-display-lg text-[28px] font-bold leading-none">{selectedData.ticker}</h1>
                      <span className={`font-data-mono text-[10px] tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                        selectedData.average_sentiment > 0.15 
                          ? 'text-primary bg-primary/10 border-primary/20' 
                          : selectedData.average_sentiment < -0.15 
                            ? 'text-error bg-error/10 border-error/20' 
                            : 'text-on-secondary-container bg-secondary-container/20 border-secondary-container/30'
                      }`}>
                        {selectedData.average_sentiment > 0.15 ? 'BULLISH' : selectedData.average_sentiment < -0.15 ? 'BEARISH' : 'NEUTRAL'}
                      </span>
                    </div>
                    <span className="font-data-mono text-on-surface-variant text-[12px] uppercase">{selectedData.company_name}</span>
                  </div>
                  
                  {/* Circular Progress mimicking Alpha Score */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-outline-variant/30" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className={selectedData.average_sentiment > 0.15 ? "text-primary" : selectedData.average_sentiment < -0.15 ? "text-error" : "text-white"} strokeWidth="3" strokeDasharray={`${Math.min(selectedData.breakout_alpha_score, 100)}, 100`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`font-data-mono text-[14px] font-bold ${selectedData.average_sentiment > 0.15 ? 'sentiment-bull' : selectedData.average_sentiment < -0.15 ? 'sentiment-bear' : 'text-white'}`}>
                        {selectedData.breakout_alpha_score.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Chart */}
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-data-mono text-[12px] uppercase text-on-surface-variant tracking-widest">Mention Volume Timeline</h3>
                    <span className="material-symbols-outlined text-[16px] text-primary">monitoring</span>
                  </div>
                  <div className="h-[180px] w-full">
                    <MentionChart 
                      timestamps={mentionsTimestamps.length > 0 ? mentionsTimestamps : (selectedData?.timestamp_vectors || [])} 
                      ticker={selectedData?.ticker || ''} 
                      sentiment={selectedData.average_sentiment}
                    />
                  </div>
                </div>

                {/* Source Distribution Progress Bars */}
                <div className="glass-card p-4 rounded-xl">
                  <h3 className="font-data-mono text-[12px] uppercase text-on-surface-variant tracking-widest mb-4">Source Distribution</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-[11px] font-data-mono mb-1">
                        <span className="text-on-surface">Reddit Extracted</span>
                        <span className="text-primary">{selectedData.source_distribution.reddit}</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full shadow-[0_0_8px_rgba(0,242,161,0.5)]" style={{width: `${Math.min(100, (selectedData.source_distribution.reddit / selectedData.social_mentions) * 100)}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] font-data-mono mb-1">
                        <span className="text-on-surface">X / Twitter</span>
                        <span className="text-mesh-teal">{selectedData.source_distribution.twitter}</span>
                      </div>
                      <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-mesh-teal h-full rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" style={{width: `${Math.min(100, (selectedData.source_distribution.twitter / selectedData.social_mentions) * 100 || 0)}%`}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Signals Feed */}
                <div className="flex flex-col gap-3 pb-8">
                  <h3 className="font-data-mono text-[12px] uppercase text-on-surface-variant tracking-widest px-1">Raw Signals Feed ({mentionsData?.length || 0})</h3>
                  {mentionsLoading ? (
                    <div className="py-8 flex justify-center"><RefreshCw className="h-5 w-5 text-primary animate-spin" /></div>
                  ) : !mentionsData || mentionsData.length === 0 ? (
                    <div className="glass-card p-4 rounded-xl text-center text-on-surface-variant italic font-body-base text-[14px]">
                      No raw chatter elements recorded in this slice.
                    </div>
                  ) : (
                    mentionsData.map(mention => (
                      <div key={mention.id} className="glass-card p-3.5 rounded-xl border-l-2" style={{borderLeftColor: mention.sentiment > 0.15 ? '#00f2a1' : mention.sentiment < -0.15 ? '#ffb4ab' : '#849589'}}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/50">
                              <span className="font-display-lg text-[10px] font-bold text-on-surface uppercase">{mention.platform.substring(0, 1)}</span>
                            </div>
                            <span className="font-data-mono text-[10px] text-on-surface-variant">{new Date(mention.timestamp).toLocaleString()}</span>
                          </div>
                          <span className={`font-data-mono text-[9px] uppercase px-1.5 py-0.5 rounded border ${
                            mention.sentiment > 0.15 ? 'text-primary bg-primary/5 border-primary/20' : mention.sentiment < -0.15 ? 'text-error bg-error/5 border-error/20' : 'text-on-surface-variant bg-surface-container-high border-outline-variant/30'
                          }`}>
                            {mention.platform}
                          </span>
                        </div>
                        <p className="font-body-base text-[14px] text-on-surface leading-relaxed">
                          "{mention.content_body}"
                        </p>
                        {mention.url && (
                          <div className="mt-2 pt-2 border-t border-outline-variant/10 text-right">
                            <a href={mention.url} target="_blank" rel="noopener noreferrer" className="font-data-mono text-[10px] text-primary hover:underline">VIEW SOURCE →</a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">explore_off</span>
                <p className="font-data-mono text-on-surface-variant">No asset selected for exploration.</p>
              </div>
            )}
          </section>
        )}

        {/* VIEW: STREAMS (Live Logs) */}
        {activeTab === 'streams' && (
          <section className="mt-6 flex flex-col h-[calc(100vh-140px)]">
            <div className="flex justify-between items-center mb-4">
              <h1 className="font-display-lg text-[24px] font-bold">Live System Logs</h1>
              <span className={`flex h-2 w-2 relative`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-primary' : 'bg-error'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-primary' : 'bg-error'}`}></span>
              </span>
            </div>
            
            <div className="flex-grow bg-void-obsidian/90 border border-outline-variant/30 rounded-xl font-data-mono text-metadata-tiny p-4 overflow-y-auto flex flex-col gap-1 shadow-inner relative">
              {activities.length === 0 ? (
                <div className="text-on-surface-variant italic">Waiting for incoming telemetry...</div>
              ) : (
                activities.map((act, i) => (
                  <div key={i} className="group hover:bg-white/5 px-1 py-0.5 rounded transition-colors break-words">
                    <span className="text-on-surface-variant opacity-60 w-20 inline-block shrink-0">[{new Date(act.timestamp).toLocaleTimeString()}]</span>
                    {act.event_type === 'scraper' && <span className="text-mesh-teal mx-2">[SCRAPE]</span>}
                    {act.event_type === 'mention' && <span className="text-primary mx-2">[DETECT]</span>}
                    {act.event_type === 'error' && <span className="text-error mx-2">[ERROR]</span>}
                    <span className="text-on-surface">{act.message}</span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
              
              {/* Scanline effect overlay */}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%] opacity-20"></div>
            </div>
          </section>
        )}
      </main>

      {/* Settings / Matrix Configuration Overlay */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md bg-surface border-l border-outline-variant/20 h-full overflow-y-auto shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="sticky top-0 bg-surface/90 backdrop-blur border-b border-outline-variant/20 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="font-display-lg text-[20px] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Matrix Configuration
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Core Limits */}
              <div>
                <h3 className="font-data-mono text-[12px] uppercase text-primary tracking-widest mb-4">Core Search Limits</h3>
                
                <div className="space-y-6 bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">Sliding Window (Days)</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{days}</span>
                    </div>
                    <input type="range" min="1" max="30" value={days} onChange={e => setDays(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">Min Mentions Threshold</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{minMentions}</span>
                    </div>
                    <input type="range" min="1" max="10" value={minMentions} onChange={e => setMinMentions(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              </div>

              {/* Source Weightage Sliders */}
              <div>
                <h3 className="font-data-mono text-[12px] uppercase text-primary tracking-widest mb-4">Source Weightage</h3>
                <div className="space-y-6 bg-surface-container-low border border-outline-variant/20 rounded-xl p-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">Reddit Body Post</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{wRedditBody}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={wRedditBody} onChange={e => setWRedditBody(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">Reddit Nested Comment</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{wRedditNested}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={wRedditNested} onChange={e => setWRedditNested(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">X / Twitter</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{wTwitter}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={wTwitter} onChange={e => setWTwitter(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="font-body-base text-[14px]">Message Boards</label>
                      <span className="font-data-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{wBoards}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={wBoards} onChange={e => setWBoards(Number(e.target.value))} className="w-full h-1 bg-outline-variant rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary-fixed active:scale-95 transition-all mt-4 shadow-[0_0_15px_rgba(0,242,161,0.3)]"
              >
                <CheckCircle2 className="w-5 h-5" />
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Shell (Mobile/Desktop Hybrid for simplicity) */}
      <nav className="fixed bottom-0 left-0 w-full h-16 flex justify-around items-center bg-surface/80 backdrop-blur-xl border-t border-outline-variant/20 z-40">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${activeTab === 'home' || activeTab === 'explore' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: activeTab === 'home' || activeTab === 'explore' ? "'FILL' 1" : "'FILL' 0"}}>dashboard</span>
          <span className="font-metadata-tiny text-metadata-tiny">HOME</span>
        </button>
        <button 
          onClick={() => setActiveTab('explore')}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${activeTab === 'explore' && selectedTicker ? 'text-primary' : 'text-on-surface-variant opacity-50'}`}
          disabled={!selectedTicker}
        >
          <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: activeTab === 'explore' ? "'FILL' 1" : "'FILL' 0"}}>explore</span>
          <span className="font-metadata-tiny text-metadata-tiny">EXPLORE</span>
        </button>
        <button 
          onClick={() => setActiveTab('streams')}
          className={`flex flex-col items-center gap-1 active:scale-90 transition-transform ${activeTab === 'streams' ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: activeTab === 'streams' ? "'FILL' 1" : "'FILL' 0"}}>hub</span>
          <span className="font-metadata-tiny text-metadata-tiny">STREAMS</span>
        </button>
      </nav>

      {/* Contextual FAB (Deploy Probe) */}
      {activeTab === 'home' && showInstallBtn && (
        <button 
          onClick={handleInstallClick}
          className="fixed bottom-20 right-6 px-4 h-12 rounded-full bg-primary-container text-on-primary-container shadow-[0_0_20px_rgba(0,242,161,0.4)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all z-30 border border-white/20 font-data-mono text-metadata-tiny font-bold"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          <span>INSTALL PWA</span>
        </button>
      )}
    </div>
  );
}
