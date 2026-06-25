import hashlib
import logging
import re
from bs4 import BeautifulSoup
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.config import settings
from app.features.early_smoke.models import Signal, Mention
from app.features.early_smoke.matcher import ticker_matcher
from app.features.early_smoke.broadcaster import broadcaster

logger = logging.getLogger("pipeline")


def clean_html(text: str) -> str:
    """
    Cleans raw HTML comments and tags from comments to ensure clean database storage
    and prevents false matches on markup strings.
    """
    if not text:
        return ""
    # Strip HTML comments first
    text_no_comments = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    if "<" in text_no_comments and ">" in text_no_comments:
        try:
            soup = BeautifulSoup(text_no_comments, "html.parser")
            return soup.get_text().strip()
        except Exception:
            pass
    # Regex fallback
    text_no_tags = re.sub(r"<[^>]+>", "", text_no_comments)
    return text_no_tags.strip()


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
    content_body_raw = post_data.get("content_body", "")
    content_body = clean_html(content_body_raw)
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
        # Broadcast the ingestion activity
        if mentions:
            for m in mentions:
                broadcaster.broadcast(
                    event_type="mention",
                    message=f"Matched '{m['ticker']}' in {platform} comment (Confidence: {int(m['confidence']*100)}%).",
                    ticker=m["ticker"],
                    source=platform,
                    details={"body": content_body, "match_type": m["match_type"]}
                )
        else:
            broadcaster.broadcast(
                event_type="scraper",
                message=f"Processed {platform} comment (no stock ticker match).",
                source=platform,
                details={"body": content_body}
            )
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit post ingestion to database: {e}")
        return False
