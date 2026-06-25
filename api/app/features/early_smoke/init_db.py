import logging
from app.db import engine
from app.features.early_smoke.models import Base

logger = logging.getLogger("db_init")


def init_db() -> None:
    """
    Creates database tables defined in the SQLAlchemy metadata.
    """
    logger.info("Creating SQLite database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("SQLite database tables created successfully.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
