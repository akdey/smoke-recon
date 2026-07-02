from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.features.early_smoke.models import MediaBaseline, MediaMention
from app.features.early_smoke.matcher import ticker_matcher
from app.features.early_smoke.rss_worker import fetch_google_news_baseline, fetch_et_times_baseline
from app.features.early_smoke.ddg_worker import fetch_ddg_news_baseline
from app.features.early_smoke.broadcaster import broadcaster

logger = logging.getLogger("media_pipeline")


def run_media_baseline_ingestion(db: Session) -> None:
    """
    Crawls mainstream Google News RSS, DuckDuckGo search baselines, and ET Markets RSS.
    Parses tickers, dedupes, and stores mentions in the database.
    """
    logger.info("Starting mainstream media baseline crawl...")
    articles = []
    articles.extend(fetch_google_news_baseline())
    articles.extend(fetch_ddg_news_baseline())
    articles.extend(fetch_et_times_baseline())

    # Log if empty, but do not seed mock items
    if not articles:
        logger.info("Mainstream crawl returned empty.")

    success_count = 0
    for art in articles:
        # Check deduplication
        existing = (
            db.query(MediaBaseline).filter_by(article_id=art["article_id"]).first()
        )
        if existing:
            continue

        baseline = MediaBaseline(
            article_id=art["article_id"],
            source=art["source"],
            headline=art["headline"],
            url=art["url"],
            timestamp=art["timestamp"],
        )

        try:
            db.add(baseline)
            db.flush()
        except IntegrityError:
            db.rollback()
            continue

        # Extract tickers
        mentions = ticker_matcher.extract_mentions(art["headline"])
        for m in mentions:
            media_mention = MediaMention(
                baseline_id=baseline.id,
                ticker=m["ticker"],
                timestamp=baseline.timestamp,
            )
            db.add(media_mention)
            # Broadcast the media mention
            broadcaster.broadcast(
                event_type="media",
                message=f"Matched baseline '{m['ticker']}' in media headline (Source: {art['source']}).",
                ticker=m["ticker"],
                source=art["source"],
                details={"headline": art["headline"]}
            )

        success_count += 1

    try:
        db.commit()
        # Broadcast completed crawl status
        broadcaster.broadcast(
            event_type="system",
            message=f"Mainstream media crawl completed. Ingested {success_count} new baseline articles.",
            source="media_pipeline",
            details={"total_processed": len(articles)}
        )
        logger.info(
            f"Media baseline ingestion completed. Ingested {success_count}/{len(articles)} new articles."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit media baseline ingestion: {e}")
