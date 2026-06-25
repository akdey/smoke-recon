import os
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.features.early_smoke.circuit_breaker import twitter_circuit_breaker
from app.features.early_smoke.pipeline import ingest_social_post

logger = logging.getLogger("twitter_worker")


def scrape_twitter() -> List[Dict[str, Any]]:
    """
    Scrapes X/Twitter. If X_SCRAPE_FAIL is set to 'true', raises an Exception
    to test the Circuit Breaker.
    """
    if os.getenv("X_SCRAPE_FAIL") == "true":
        raise RuntimeError("HTTP 429 Too Many Requests (Rate Limited)")

    return []


def run_twitter_ingestion(db: Session) -> None:
    """
    Runs the X/Twitter scraping worker. Tracks status using the circuit breaker.
    """
    logger.info("Checking X/Twitter circuit breaker availability...")
    if not twitter_circuit_breaker.is_available(db):
        logger.warning(
            "X/Twitter circuit breaker is OPEN. Suspending scraper run (cooling down)."
        )
        return

    logger.info("Executing X/Twitter scraper...")
    try:
        tweets = scrape_twitter()

        success_count = 0
        for tweet in tweets:
            if ingest_social_post(db, tweet):
                success_count += 1

        # Record success to close/reset the circuit
        twitter_circuit_breaker.record_success(db)
        logger.info(
            f"X/Twitter ingestion completed successfully. Saved {success_count}/{len(tweets)} tweets."
        )

    except Exception as e:
        logger.error(f"X/Twitter scraper failed: {e}")
        # Record failure to increment error counter and potentially trip the circuit
        twitter_circuit_breaker.record_failure(db)
