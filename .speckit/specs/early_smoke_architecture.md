# Technical Architecture Blueprint: Early Smoke Reconnaissance Engine

This document details the concrete technical architecture blueprint for the Early Smoke Reconnaissance Engine.

---

## 1. Data Pipelines & Persistence Layers

### Async Scheduler (APScheduler)
Ingestion tasks run continuously on a background scheduler without overlapping execution.
We utilize `AsyncIOScheduler` from `APScheduler`, configuring it with an in-memory job store. To prevent execution overlap (e.g., if a crawling cycle takes longer than the scheduled interval), we declare `max_instances=1` on the job settings.

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore

jobstores = {
    'default': MemoryJobStore()
}
job_defaults = {
    'coalesce': True,
    'max_instances': 1
}

scheduler = AsyncIOScheduler(jobstores=jobstores, job_defaults=job_defaults)
```

### SQLAlchemy Entity Relationship Mapping (SQLite)
The database contains a strict composite index declared on the `mentions` table over the tuple `(ticker, unique_post_hash, timestamp)` to optimize sliding window density counts and asset breakout calculations.

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unique_post_hash = Column(String, unique=True, nullable=False, index=True)
    platform = Column(String, nullable=False)
    thread_id = Column(String, nullable=True)
    content_body = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    engagement_depth = Column(String, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)

    mentions = relationship("Mention", back_populates="signal", cascade="all, delete-orphan")


class Mention(Base):
    __tablename__ = "mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signal_id = Column(Integer, ForeignKey("signals.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String, nullable=False)
    unique_post_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    match_type = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)

    signal = relationship("Signal", back_populates="mentions")

# Strict composite database index declaration for optimized analysis queries
Index(
    "idx_ticker_hash_time",
    Mention.ticker,
    Mention.unique_post_hash,
    Mention.timestamp
)
```

---

## 2. The Sliding Window Purge Engine

A cron job runs every 24 hours to delete historical data older than the configured sliding window (e.g., 10 days) and reclaim disk space.

```python
import logging
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger("purge_engine")

def purge_expired_records(db: Session, retention_days: int = 10):
    """
    Executes a high-speed delete query for records older than the sliding window,
    followed immediately by an SQLite VACUUM to reclaim filesystem disk space.
    """
    try:
        # Perform cascade delete on signals (automatically deletes related mentions via ForeignKey cascade)
        delete_query = text(
            "DELETE FROM signals WHERE timestamp < datetime('now', :retention_window)"
        )
        result = db.execute(delete_query, {"retention_window": f"-{retention_days} days"})
        db.commit()
        
        logger.info(f"Purged expired records older than {retention_days} days. Rows affected: {result.rowcount}")

        # Vacuum the database to reclaim space on the ephemeral filesystem
        db.execute(text("VACUUM"))
        logger.info("Database VACUUM completed successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to execute purge engine cycle: {e}")
```

---

## 3. Mathematical Set Difference Processor

At the core of the Early Smoke scanner is the identification of assets that are actively discussed in social forums (high noise/alpha) but have not yet registered in mainstream media feeds. 

The breakout identification is performed in memory using Python's optimized hashing-based `set` data structures.

$$\text{Breakout\_Alpha} = \text{Set\_A} \setminus \text{Set\_B}$$

```python
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select

def compute_breakout_alpha(db: Session, window_days: int = 7) -> list[str]:
    """
    Computes the asymmetric set difference to find early breakout stock tickers.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=window_days)

    # Set_A: Validated stock tickers occurring in social channels (Reddit, Chittorgarh, etc.)
    social_tickers_stmt = (
        select(Mention.ticker)
        .where(Mention.timestamp >= cutoff_time)
        .distinct()
    )
    Set_A = set(db.scalars(social_tickers_stmt).all())

    # Set_B: Tickers recognized inside mainstream media channels (Google News, DDG)
    media_tickers_stmt = (
        select(MediaMention.ticker)
        .where(MediaMention.timestamp >= cutoff_time)
        .distinct()
    )
    Set_B = set(db.scalars(media_tickers_stmt).all())

    # Asymmetric Set Difference: assets present in social stream but missing from mainstream media
    Breakout_Alpha = Set_A.difference(Set_B)
    
    return list(Breakout_Alpha)
```

---

## 4. Component Architecture Maps

### Backend Module Layout (`api/app/features/early_smoke/`)

```text
early_smoke/
├── __init__.py
├── models.py          # SQLAlchemy models (Signal, Mention, MediaBaseline, etc.)
├── schemas.py         # Pydantic schemas for API response validation
├── router.py          # FastAPI path endpoints and API routers
├── services.py        # Business logic (Fuzzy lookup dictionary, Set difference processor)
├── tasks.py           # Background scraper workers and Purge Engine
└── tests/             # Pytest unit and integration tests
```

#### FastAPI Watchlist Endpoint (`GET /api/features/early-smoke/watchlist`)
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db import get_db
from app.features.early_smoke import services, schemas

router = APIRouter(prefix="/api/features/early-smoke", tags=["Early Smoke"])

@router.get("/watchlist", response_model=schemas.WatchlistResponse)
def get_watchlist(
    days: int = Query(default=7, ge=1, le=30),
    min_mentions: int = Query(default=3, ge=1),
    db: Session = Depends(get_db)
):
    """
    Returns identified breakout assets with source distributions and mention metadata.
    """
    return services.generate_watchlist_data(db, days=days, min_mentions=min_mentions)
```

---

### Frontend Component Layout (`ui/src/features/early_smoke/`)

```text
early_smoke/
├── components/
│   ├── WatchlistDashboard.tsx     # Main layout view container
│   ├── BreakoutCard.tsx           # Individual breakout ticker card component
│   ├── MentionChart.tsx           # Recharts timeline visualization
│   └── SystemStatusBanner.tsx     # Degraded state indicator (Circuit Breaker status)
├── hooks/
│   ├── useWatchlist.ts            # Custom React hook for watchlist fetching
│   └── useSystemStatus.ts         # Custom React hook for polling /api/health
└── types.ts                       # TypeScript interfaces for API payloads
```

#### React Component Lifecycle & Data State Flow

```
[ Dashboard Mounted ] 
        │
        ├──► [ Trigger useWatchlist Hook ] ────► fetch('/api/.../watchlist') ──► Set: watchlistData
        └──► [ Trigger useSystemStatus Hook ] ──► fetch('/api/health') ───────► Set: systemStatus
        │
        ▼
[ Render Tree ]
        ├──► If (systemStatus.circuit_breakers.twitter.state == "OPEN") 
        │       └──► Render <SystemStatusBanner message="Twitter Cooling Down" />
        │
        ├──► Render Grid: <BreakoutCard data={item} />
        └──► Render: <MentionChart timeline={item.timestamp_vectors} />
```

1.  **State Declaration**: The dashboard manages `watchlistData` (breakout assets array), `healthStatus` (health check fields), `isLoading` (boolean loading spinner state), and `error` (network/parse error boundary).
2.  **Hook Integrations**:
    *   `useWatchlist`: Fetches `GET /api/features/early-smoke/watchlist` when `days` or `min_mentions` inputs are toggled.
    *   `useSystemStatus`: Polls `/api/health` every 60 seconds.
3.  **UI Layout Template**:
    *   **Header Section**: Interactive selectors for sliding window size (e.g., 7 days vs 10 days) and minimum mention counts. Includes a dynamic, state-driven warning banner if any circuit breakers are open (`degraded` service).
    *   **Breakout Grid**: Displays responsive grid cards showing the asset ticker, company name, alpha breakout score, total social mention density, and source distribution badges (e.g. Reddit: 8, Chittorgarh: 12).
    *   **Visualization Panel**: Charts representing timestamp vectors (mention density over time) using standard charting elements.
