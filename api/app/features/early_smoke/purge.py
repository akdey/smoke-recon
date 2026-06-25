import logging
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.features.early_smoke.models import Signal, MediaBaseline

logger = logging.getLogger("purge")


def purge_expired_records(db: Session, retention_days: int = 10) -> int:
    """
    Deletes records older than retention window, followed by database VACUUM.
    """
    cutoff_time = datetime.utcnow() - timedelta(days=retention_days)
    logger.info(
        f"Starting database purge for records older than {retention_days} days (Cutoff: {cutoff_time})..."
    )

    deleted_signals = 0
    try:
        # Delete old social signals (foreign key cascade deletes linked mentions)
        signals_query = db.query(Signal).filter(Signal.timestamp < cutoff_time)
        deleted_signals = signals_query.count()
        signals_query.delete(synchronize_session=False)

        # Delete old media baselines (foreign key cascade deletes linked media_mentions)
        db.query(MediaBaseline).filter(MediaBaseline.timestamp < cutoff_time).delete(
            synchronize_session=False
        )

        db.commit()
        logger.info(f"Purge committed. Deleted {deleted_signals} old signals.")

        # Reclaim unused database file space
        db.execute(text("VACUUM"))
        logger.info("Database VACUUM completed.")
    except Exception as e:
        db.rollback()
        logger.error(f"Purge execution failed: {e}")
        raise e

    return deleted_signals
