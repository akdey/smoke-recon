from pydantic import BaseModel
from typing import List, Optional


class SourceDistribution(BaseModel):
    reddit: int
    twitter: int
    chittorgarh: int
    et_times: int


class WatchlistEntry(BaseModel):
    ticker: str
    company_name: str
    breakout_alpha_score: float
    social_mentions: int
    media_mentions: int
    source_distribution: SourceDistribution
    timestamp_vectors: List[str]


class WatchlistResponse(BaseModel):
    window_days: int
    min_mentions_threshold: int
    generated_at: str
    watchlist: List[WatchlistEntry]


class CircuitBreakerDetail(BaseModel):
    state: str
    failures: int
    retry_at: Optional[str] = None
    degradation_message: Optional[str] = None


class CircuitBreakersStatus(BaseModel):
    twitter: CircuitBreakerDetail
    reddit: Optional[CircuitBreakerDetail] = None
    message_boards: Optional[CircuitBreakerDetail] = None


class DatabaseStatus(BaseModel):
    status: str
    size_bytes: int
    last_purged_at: Optional[str] = None


class SchedulerStatus(BaseModel):
    status: str
    active_jobs: List[str]


class HealthResponse(BaseModel):
    status: str
    database: DatabaseStatus
    scheduler: SchedulerStatus
    circuit_breakers: CircuitBreakersStatus


class MentionDetailResponse(BaseModel):
    id: int
    platform: str
    content_body: str
    timestamp: str
    url: Optional[str] = None
    match_type: str
    confidence: float


class MostDiscussedEntry(BaseModel):
    ticker: str
    company_name: str
    total_mentions: int
    social_mentions: int
    media_mentions: int
    breakout_alpha_score: float
