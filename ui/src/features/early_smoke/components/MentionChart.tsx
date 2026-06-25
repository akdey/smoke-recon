import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MentionChartProps {
  timestamps: string[];
  ticker: string;
}

export default function MentionChart({ timestamps, ticker }: MentionChartProps) {
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

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm">
        No temporal data points recorded.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold tracking-wide uppercase text-slate-400">
          Mention Density Timeline: {ticker}
        </span>
        <span className="text-xs text-accent">Hourly Aggregation</span>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#6b7280" 
              fontSize={10}
              tickLine={false}
              axisLine={false} 
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={10} 
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#12161f', 
                borderColor: '#374151',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
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
