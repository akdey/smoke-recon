from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Enforce check_same_thread=False for SQLite compatibility with FastAPI async event loop
connect_args = (
    {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)


# Force SQLite to honor foreign key constraints and cascade deletes
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if settings.database_url.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency for database session context management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
