from datetime import datetime, timedelta
from typing import List, Dict, Any, Set
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.features.early_smoke.models import Mention, MediaMention, Signal
from app.features.early_smoke.dictionary import corporate_dict


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

        # Resolve company name dynamically using corporate dictionary
        company_name = corporate_dict.get_company_name(ticker)

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


def get_recent_mentions_for_ticker(
    db: Session, ticker: str, days: int = 7
) -> List[Dict[str, Any]]:
    """
    Returns recent historical social media comment mentions for a specific ticker symbol.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=days)
    stmt = (
        select(Mention, Signal.platform, Signal.content_body, Signal.url)
        .join(Signal, Mention.signal_id == Signal.id)
        .where(Mention.ticker == ticker)
        .where(Mention.timestamp >= cutoff_time)
        .order_by(Mention.timestamp.desc())
    )
    results = db.execute(stmt).all()
    
    mentions = []
    for mention, platform, content_body, url in results:
        mentions.append(
            {
                "id": mention.id,
                "platform": platform,
                "content_body": content_body,
                "timestamp": mention.timestamp.isoformat() + "Z",
                "url": url,
                "match_type": mention.match_type,
                "confidence": float(mention.confidence),
            }
        )
    return mentions


def generate_most_discussed_data(db: Session, days: int = 7) -> List[Dict[str, Any]]:
    """
    Exposes the most discussed stocks across all platforms (social + media) by mention volume.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=days)
    
    # 1. Query social mentions grouped by ticker
    social_stmt = (
        select(Mention.ticker, func.count(Mention.id))
        .where(Mention.timestamp >= cutoff_time)
        .group_by(Mention.ticker)
    )
    social_res = db.execute(social_stmt).all()
    social_map = {ticker: count for ticker, count in social_res}
    
    # 2. Query media mentions grouped by ticker
    media_stmt = (
        select(MediaMention.ticker, func.count(MediaMention.id))
        .where(MediaMention.timestamp >= cutoff_time)
        .group_by(MediaMention.ticker)
    )
    media_res = db.execute(media_stmt).all()
    media_map = {ticker: count for ticker, count in media_res}
    
    # 3. Collect all tickers
    all_tickers = set(social_map.keys()).union(media_map.keys())
    
    most_discussed = []
    for ticker in all_tickers:
        social_count = social_map.get(ticker, 0)
        media_count = media_map.get(ticker, 0)
        total_count = social_count + media_count
        
        # Calculate total weighted breakout score for social mentions
        mentions_stmt = (
            select(Mention, Signal.weight)
            .join(Signal, Mention.signal_id == Signal.id)
            .where(Mention.ticker == ticker)
            .where(Mention.timestamp >= cutoff_time)
        )
        results = db.execute(mentions_stmt).all()
        total_weighted_score = sum(float(weight) * float(mention.confidence) for mention, weight in results)
        
        company_name = corporate_dict.get_company_name(ticker)
        
        most_discussed.append(
            {
                "ticker": ticker,
                "company_name": company_name,
                "total_mentions": total_count,
                "social_mentions": social_count,
                "media_mentions": media_count,
                "breakout_alpha_score": round(total_weighted_score, 2),
            }
        )
        
    # Sort by total_mentions descending
    most_discussed.sort(key=lambda x: x["total_mentions"], reverse=True)
    return most_discussed

