import hashlib
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.features.early_smoke.models import Signal, Mention
from app.features.early_smoke.matcher import ticker_matcher

logger = logging.getLogger("pipeline")


def compute_unique_hash(platform: str, thread_id: str, content_body: str) -> str:
    """
    Computes MD5 hash representing a unique comment/post.
    """
    payload = (
        f"{platform.strip().lower()}:{thread_id.strip().lower()}:{content_body.strip()}"
    )
    return hashlib.md5(payload.encode("utf-8")).hexdigest()


def ingest_social_post(db: Session, post_data: Dict[str, Any]) -> bool:
    """
    Ingests, deduplicates, parses, and persists a retail social comment/post.
    Returns True if successfully ingested, False if deduplicated/ignored.
    """
    platform = post_data.get("platform", "")
    thread_id = post_data.get("thread_id", "")
    content_body = post_data.get("content_body", "")
    engagement_depth = post_data.get("engagement_depth", "nested_comment")

    if not platform or not content_body:
        return False

    unique_post_hash = compute_unique_hash(platform, thread_id, content_body)

    # Fast check to avoid database write attempts on duplicates
    existing = db.query(Signal).filter_by(unique_post_hash=unique_post_hash).first()
    if existing:
        return False

    # Retrieve source weight based on engagement depth config
    weights = settings.weights
    weight = 1.0
    if engagement_depth == "reddit_thread_body":
        weight = weights.reddit_thread_body
    elif engagement_depth == "reddit_nested_comment":
        weight = weights.reddit_nested_comment
    elif engagement_depth == "twitter_tweet_text":
        weight = weights.twitter_tweet_text
    elif engagement_depth == "message_board_comment":
        weight = weights.message_board_comment

    # Create Signal
    signal = Signal(
        unique_post_hash=unique_post_hash,
        platform=platform,
        thread_id=thread_id,
        content_body=content_body,
        engagement_depth=engagement_depth,
        weight=weight,
    )

    try:
        db.add(signal)
        db.flush()  # Get signal ID
    except IntegrityError:
        db.rollback()
        return False

    # Extract ticker mentions
    mentions = ticker_matcher.extract_mentions(content_body)
    for m in mentions:
        mention = Mention(
            signal_id=signal.id,
            ticker=m["ticker"],
            unique_post_hash=unique_post_hash,
            timestamp=signal.timestamp,
            match_type=m["match_type"],
            confidence=m["confidence"],
        )
        db.add(mention)

    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit post ingestion to database: {e}")
        return False
