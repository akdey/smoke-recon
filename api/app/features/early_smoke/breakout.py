from datetime import datetime, timedelta
from typing import List, Dict, Any, Set
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.features.early_smoke.models import Mention, MediaMention, Signal


def compute_breakout_tickers(db: Session, window_days: int = 7) -> Set[str]:
    """
    Computes asymmetric set difference: Set_A (social tickers) - Set_B (media tickers)
    """
    cutoff_time = datetime.utcnow() - timedelta(days=window_days)

    # Set_A: Tickers mentioned in social comments
    social_tickers = db.scalars(
        select(Mention.ticker).where(Mention.timestamp >= cutoff_time).distinct()
    ).all()
    Set_A = set(social_tickers)

    # Set_B: Tickers mentioned in mainstream media
    media_tickers = db.scalars(
        select(MediaMention.ticker)
        .where(MediaMention.timestamp >= cutoff_time)
        .distinct()
    ).all()
    Set_B = set(media_tickers)

    return Set_A.difference(Set_B)


def generate_watchlist_data(
    db: Session, days: int = 7, min_mentions: int = 3
) -> Dict[str, Any]:
    """
    Finds breakout tickers and constructs full payload for frontend watchlist visualization.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=days)
    breakout_tickers = compute_breakout_tickers(db, window_days=days)

    watchlist = []
    for ticker in breakout_tickers:
        # Query all mentions for this ticker in the sliding window
        mentions_stmt = (
            select(Mention, Signal.platform, Signal.weight)
            .join(Signal, Mention.signal_id == Signal.id)
            .where(Mention.ticker == ticker)
            .where(Mention.timestamp >= cutoff_time)
        )
        results = db.execute(mentions_stmt).all()

        total_mentions = len(results)
        if total_mentions < min_mentions:
            continue

        # Compute source distribution and collect timestamps
        source_dist: Dict[str, int] = {}
        timestamp_vectors: List[str] = []
        total_weighted_score = 0.0

        for mention, platform, weight in results:
            source_dist[platform] = source_dist.get(platform, 0) + 1
            timestamp_vectors.append(mention.timestamp.isoformat() + "Z")
            # Score contribution = signal weight * mention match confidence
            total_weighted_score += float(weight) * float(mention.confidence)

        # Sort timestamp vectors chronologically
        timestamp_vectors.sort()

        # Company name fallback matching
        company_name = ticker
        if ticker == "INFY":
            company_name = "Infosys Limited"
        elif ticker == "RELIANCE":
            company_name = "Reliance Industries"
        elif ticker == "TATAMOTORS":
            company_name = "Tata Motors Limited"
        elif ticker == "M&M":
            company_name = "Mahindra & Mahindra"
        elif ticker == "YESBANK":
            company_name = "Yes Bank Limited"
        elif ticker == "TCS":
            company_name = "Tata Consultancy Services"
        elif ticker == "GOODRICKE":
            company_name = "Goodricke Group Limited"

        watchlist.append(
            {
                "ticker": ticker,
                "company_name": company_name,
                "breakout_alpha_score": round(total_weighted_score, 2),
                "social_mentions": total_mentions,
                "media_mentions": 0,
                "source_distribution": {
                    "reddit": source_dist.get("reddit", 0),
                    "twitter": source_dist.get("twitter", 0),
                    "chittorgarh": source_dist.get("chittorgarh", 0),
                    "et_times": source_dist.get("et_times", 0),
                },
                "timestamp_vectors": timestamp_vectors,
            }
        )

    # Sort watchlist by breakout_alpha_score descending
    watchlist.sort(key=lambda x: x["breakout_alpha_score"], reverse=True)

    return {
        "window_days": days,
        "min_mentions_threshold": min_mentions,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "watchlist": watchlist,
    }
