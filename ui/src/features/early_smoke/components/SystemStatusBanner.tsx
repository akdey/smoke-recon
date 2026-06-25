import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { HealthResponse } from '../types';

interface SystemStatusBannerProps {
  status: HealthResponse | null;
}

export default function SystemStatusBanner({ status }: SystemStatusBannerProps) {
  if (!status) return null;

  const isDegraded = status.status === 'degraded';
  const twitterCB = status.circuit_breakers.twitter;

  return (
    <div className={`p-4 rounded-lg flex items-center justify-between border ${
      isDegraded 
        ? 'bg-yellow-950/40 border-yellow-800 text-yellow-200' 
        : 'bg-green-950/30 border-green-800 text-green-300'
    }`}>
      <div className="flex items-center gap-3">
        {isDegraded ? (
          <AlertTriangle className="h-5 w-5 text-yellow-500 animate-pulse" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-success" />
        )}
        <div>
          <span className="font-semibold block">
            System Status: {isDegraded ? 'Service Degraded' : 'Fully Operational'}
          </span>
          <span className="text-sm opacity-80">
            {isDegraded 
              ? (twitterCB.degradation_message || 'Twitter scraping has been temporarily rate-limited and is cooling down.')
              : 'All ingestion pipelines (Reddit, Twitter, Scrapy message boards) running normally.'}
          </span>
        </div>
      </div>
      
      {isDegraded && twitterCB.retry_at && (
        <span className="text-xs px-2.5 py-1 bg-yellow-900/60 border border-yellow-700 rounded-full font-medium">
          Cooling down: Retry in {Math.max(1, Math.round((new Date(twitterCB.retry_at).getTime() - Date.now()) / 60000))} min
        </span>
      )}
    </div>
  );
}
