import pytest
from datetime import datetime, timedelta
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from app.features.early_smoke.models import Base, Signal, Mention
from app.features.early_smoke.purge import purge_expired_records


@pytest.fixture(name="db_session")
def fixture_db_session():
    # We use a file-based temporary sqlite db to test VACUUM properly
    import tempfile
    import os

    db_fd, db_path = tempfile.mkstemp()
    engine = create_engine(f"sqlite:///{db_path}")

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        os.close(db_fd)
        if os.path.exists(db_path):
            os.remove(db_path)


def test_sliding_window_purge(db_session):
    """
    Verifies that old signals and cascade-related mentions are purged.
    """
    now = datetime.utcnow()
    old_time = now - timedelta(days=11)
    new_time = now - timedelta(days=2)

    # 1. Seed old signal + mention
    sig_old = Signal(
        unique_post_hash="old_h",
        platform="reddit",
        content_body="Old post",
        engagement_depth="reddit_nested_comment",
        timestamp=old_time,
    )
    db_session.add(sig_old)
    db_session.flush()
    m_old = Mention(
        signal_id=sig_old.id,
        ticker="INFY",
        unique_post_hash="old_h",
        timestamp=old_time,
        match_type="exact",
        confidence=1.0,
    )
    db_session.add(m_old)

    # 2. Seed new signal + mention
    sig_new = Signal(
        unique_post_hash="new_h",
        platform="reddit",
        content_body="New post",
        engagement_depth="reddit_nested_comment",
        timestamp=new_time,
    )
    db_session.add(sig_new)
    db_session.flush()
    m_new = Mention(
        signal_id=sig_new.id,
        ticker="TCS",
        unique_post_hash="new_h",
        timestamp=new_time,
        match_type="exact",
        confidence=1.0,
    )
    db_session.add(m_new)

    db_session.commit()

    assert db_session.query(Signal).count() == 2
    assert db_session.query(Mention).count() == 2

    # Run purge for 10 days retention
    purge_expired_records(db_session, retention_days=10)

    # Old record should be deleted; new record preserved
    assert db_session.query(Signal).count() == 1
    assert db_session.query(Mention).count() == 1

    remaining_signal = db_session.query(Signal).first()
    assert remaining_signal.unique_post_hash == "new_h"

    remaining_mention = db_session.query(Mention).first()
    assert remaining_mention.ticker == "TCS"
