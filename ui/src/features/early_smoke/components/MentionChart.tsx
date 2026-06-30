import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MentionChartProps {
  timestamps: string[];
  ticker: string;
  sentiment?: number;
}

export default function MentionChart({ timestamps, ticker, sentiment = 0.0 }: MentionChartProps) {
  const chartData = useMemo(() => {
    if (!timestamps || timestamps.length === 0) return [];

    // Group timestamps by day + hour (e.g., "06/25 10:00")
    const counts: { [key: string]: number } = {};
    timestamps.forEach((t) => {
      try {
        const date = new Date(t);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const key = `${month}/${day} ${hours}:00`;
        counts[key] = (counts[key] || 0) + 1;
      } catch (e) {
        // Skip invalid timestamps
      }
    });

    // Convert to sorted array
    return Object.entries(counts)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [timestamps]);

  const chartColor = useMemo(() => {
    if (sentiment > 0.15) return '#10b981'; // Bullish Emerald
    if (sentiment < -0.15) return '#f43f5e'; // Bearish Rose
    return '#6366f1'; // Neutral Indigo
  }, [sentiment]);

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-xs italic">
        No temporal data points recorded.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4 select-none">
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 font-mono">
          Mention Density: {ticker}
        </span>
        <span className="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-widest">
          Hourly Distribution
        </span>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={9}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false} 
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              fontSize={9}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(10, 15, 30, 0.8)', 
                backdropFilter: 'blur(12px)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.5)'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke={chartColor} 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorCount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
