export interface SourceDistribution {
  reddit: number;
  twitter: number;
  chittorgarh: number;
  et_times: number;
}

export interface WatchlistEntry {
  ticker: string;
  company_name: string;
  breakout_alpha_score: number;
  social_mentions: number;
  media_mentions: number;
  average_sentiment: number;
  source_distribution: SourceDistribution;
  timestamp_vectors: string[];
}

export interface WatchlistResponse {
  window_days: number;
  min_mentions_threshold: number;
  generated_at: string;
  watchlist: WatchlistEntry[];
}

export interface CircuitBreakerDetail {
  state: string;
  failures: number;
  retry_at: string | null;
  degradation_message: string | null;
}

export interface CircuitBreakersStatus {
  twitter: CircuitBreakerDetail;
  reddit?: CircuitBreakerDetail;
  message_boards?: CircuitBreakerDetail;
}

export interface DatabaseStatus {
  status: string;
  size_bytes: number;
  last_purged_at: string | null;
}

export interface SchedulerStatus {
  status: string;
  active_jobs: string[];
}

export interface HealthResponse {
  status: string;
  database: DatabaseStatus;
  scheduler: SchedulerStatus;
  circuit_breakers: CircuitBreakersStatus;
}

export interface MentionDetail {
  id: number;
  platform: string;
  content_body: string;
  timestamp: string;
  url: string | null;
  sentiment: number;
  match_type: string;
  confidence: number;
}

export interface MostDiscussedEntry {
  ticker: string;
  company_name: string;
  total_mentions: number;
  social_mentions: number;
  media_mentions: number;
  breakout_alpha_score: number;
  average_sentiment: number;
}
