import React from 'react';
import { Terminal, Wifi, WifiOff } from 'lucide-react';
import { useActivityStream, ActivityEvent } from '../hooks/useActivityStream';

export default function ActivityConsole() {
  const { activities, connected } = useActivityStream();

  const getEventStyles = (type: string) => {
    switch (type) {
      case 'mention':
        return {
          bg: 'bg-emerald-950/30 text-emerald-400 border-emerald-800/40',
          label: 'MENTION',
        };
      case 'media':
        return {
          bg: 'bg-purple-950/30 text-purple-400 border-purple-800/40',
          label: 'MEDIA',
        };
      case 'circuit_breaker':
        return {
          bg: 'bg-amber-950/30 text-amber-400 border-amber-800/40',
          label: 'WARNING',
        };
      case 'purge':
        return {
          bg: 'bg-slate-900/50 text-slate-400 border-slate-700/40',
          label: 'PURGE',
        };
      case 'system':
      default:
        return {
          bg: 'bg-blue-950/30 text-blue-400 border-blue-800/40',
          label: 'SYSTEM',
        };
    }
  };

  const getSourceStyle = (source: string | null) => {
    if (!source) return '';
    const src = source.toLowerCase();
    if (src.includes('reddit')) return 'text-orange-400 font-semibold';
    if (src.includes('twitter') || src.includes('x')) return 'text-sky-400 font-semibold';
    if (src.includes('chittorgarh') || src.includes('et_times')) return 'text-green-400 font-semibold';
    if (src.includes('google')) return 'text-rose-400 font-semibold';
    return 'text-gray-400 font-semibold';
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '--:--:--';
    }
  };

  return (
    <div className="bg-[#0b0f19]/70 border border-[#1f2937] rounded-xl overflow-hidden flex flex-col h-[280px]">
      {/* Console Header */}
      <div className="bg-[#121622] px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200 tracking-wider uppercase">
            Live Stream Feed Console
          </span>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Live
              </span>
            </>
          ) : (
            <>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Reconnecting...
              </span>
            </>
          )}
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-2.5 scrollbar-thin scrollbar-thumb-gray-800">
        {activities.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-600 italic">
            Waiting for live activity logs...
          </div>
        ) : (
          activities.map((event, index) => {
            const styles = getEventStyles(event.event_type);
            return (
              <div
                key={index}
                className="flex items-start gap-3 py-1.5 px-2.5 rounded hover:bg-[#121622]/40 transition-colors border border-transparent hover:border-gray-800/40"
              >
                {/* Timestamp */}
                <span className="text-gray-500 select-none font-medium">
                  [{formatTime(event.timestamp)}]
                </span>

                {/* Event Type Badge */}
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border font-extrabold tracking-wider ${styles.bg}`}
                >
                  {styles.label}
                </span>

                {/* Message & Details */}
                <div className="flex-1 text-slate-300 leading-relaxed">
                  {event.source && (
                    <span className="mr-1.5 text-gray-500">
                      [<span className={getSourceStyle(event.source)}>{event.source}</span>]
                    </span>
                  )}

                  <span>{event.message}</span>

                  {event.ticker && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold rounded bg-blue-950/50 text-blue-400 border border-blue-800/30">
                      ${event.ticker}
                    </span>
                  )}

                  {/* Optional body snippets */}
                  {event.details?.body && (
                    <p className="mt-1 text-gray-500 text-[11px] max-w-4xl truncate border-l border-gray-800 pl-2">
                      "{event.details.body}"
                    </p>
                  )}
                  {event.details?.headline && (
                    <p className="mt-1 text-gray-500 text-[11px] max-w-4xl truncate border-l border-gray-800 pl-2">
                      "{event.details.headline}"
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
