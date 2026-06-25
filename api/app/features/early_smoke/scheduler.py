import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from app.config import settings
from app.db import SessionLocal
from app.features.early_smoke.reddit_worker import run_reddit_ingestion
from app.features.early_smoke.scrapy_spiders import run_message_boards_ingestion
from app.features.early_smoke.twitter_worker import run_twitter_ingestion
from app.features.early_smoke.media_pipeline import run_media_baseline_ingestion
from app.features.early_smoke.purge import purge_expired_records

logger = logging.getLogger("scheduler")

jobstores = {"default": MemoryJobStore()}
job_defaults = {"coalesce": True, "max_instances": 1}

scheduler = AsyncIOScheduler(jobstores=jobstores, job_defaults=job_defaults)


def run_task_with_db(task_fn) -> None:
    """
    Helper wrapper to execute scheduler tasks within a local DB session context.
    """
    db = SessionLocal()
    try:
        task_fn(db)
    except Exception as e:
        logger.error(f"Error executing scheduled task {task_fn.__name__}: {e}")
    finally:
        db.close()


def start_scheduler() -> None:
    """
    Registers ingestion jobs and starts the background AsyncIO task loop scheduler.
    """
    interval = settings.scraping_interval_minutes

    logger.info("Registering background crawler jobs...")

    # Ingestion Jobs
    scheduler.add_job(
        run_task_with_db,
        "interval",
        minutes=interval,
        args=[run_reddit_ingestion],
        id="reddit_ingestion",
        replace_existing=True,
    )
    scheduler.add_job(
        run_task_with_db,
        "interval",
        minutes=interval,
        args=[run_message_boards_ingestion],
        id="message_boards_ingestion",
        replace_existing=True,
    )
    scheduler.add_job(
        run_task_with_db,
        "interval",
        minutes=interval,
        args=[run_twitter_ingestion],
        id="twitter_ingestion",
        replace_existing=True,
    )
    scheduler.add_job(
        run_task_with_db,
        "interval",
        minutes=interval,
        args=[run_media_baseline_ingestion],
        id="media_baseline_ingestion",
        replace_existing=True,
    )

    # Purge engine: run once every 24 hours
    scheduler.add_job(
        run_task_with_db,
        "interval",
        hours=24,
        args=[lambda db: purge_expired_records(db, settings.retention_days)],
        id="database_cleanup_purge",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Background job scheduler started successfully.")


def shutdown_scheduler() -> None:
    """
    Gracefully shuts down the background task scheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background job scheduler shutdown.")
