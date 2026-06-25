import os
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db
from app.config import settings
from app.features.early_smoke import schemas, breakout
from app.features.early_smoke.circuit_breaker import twitter_circuit_breaker
from app.features.early_smoke.scheduler import scheduler

router = APIRouter(prefix="/api/features/early-smoke", tags=["Early Smoke"])


@router.get("/watchlist", response_model=schemas.WatchlistResponse)
def get_watchlist(
    days: int = Query(default=7, ge=1, le=30),
    min_mentions: int = Query(default=3, ge=1),
    db: Session = Depends(get_db),
):
    """
    Exposes computed breakout assets filtered by trailing sliding window and density limits.
    """
    try:
        return breakout.generate_watchlist_data(
            db, days=days, min_mentions=min_mentions
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate watchlist: {e}"
        )


@router.get("/health", response_model=schemas.HealthResponse)
def get_health(db: Session = Depends(get_db)):
    """
    Exposes database, background scheduler, and Twitter circuit breaker status metrics.
    """
    # 1. Check Database connection
    db_status = "connected"
    db_size = 0
    try:
        db.execute(text("SELECT 1"))
        # Parse db file size from settings path (SQLite specific)
        db_path = settings.database_url.replace("sqlite:///", "")
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path)
    except Exception:
        db_status = "disconnected"

    # 2. Check Circuit Breaker
    cb_data = twitter_circuit_breaker.get_status(db)
    cb_status = schemas.CircuitBreakerDetail(
        state=cb_data["state"],
        failures=cb_data["failures"],
        retry_at=cb_data["retry_at"],
        degradation_message=(
            "Twitter Stream Cooling Down due to rate-limiting (429)."
            if cb_data["state"] == "OPEN"
            else None
        ),
    )

    # 3. Check Scheduler
    jobs = [job.id for job in scheduler.get_jobs()]
    sched_status = schemas.SchedulerStatus(
        status="running" if scheduler.running else "stopped", active_jobs=jobs
    )

    # Overall health matches circuit breaker status
    overall_status = "ok"
    if cb_status.state == "OPEN":
        overall_status = "degraded"
    if db_status == "disconnected":
        overall_status = "error"

    return schemas.HealthResponse(
        status=overall_status,
        database=schemas.DatabaseStatus(status=db_status, size_bytes=db_size),
        scheduler=sched_status,
        circuit_breakers=schemas.CircuitBreakersStatus(twitter=cb_status),
    )
