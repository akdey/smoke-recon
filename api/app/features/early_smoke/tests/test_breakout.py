import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.features.early_smoke.models import (
    Base,
    Signal,
    Mention,
    MediaBaseline,
    MediaMention,
)
from app.features.early_smoke.breakout import (
    compute_breakout_tickers,
    generate_watchlist_data,
)


@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


def test_asymmetric_set_difference(db_session):
    """
    Verifies that Breakout_Alpha = Set_A.difference(Set_B) computes correctly.
    """
    now = datetime.utcnow()

    # Seed Social Signal (Set A)
    sig_infy = Signal(
        unique_post_hash="h1",
        platform="reddit",
        content_body="INFY looks good",
        engagement_depth="reddit_nested_comment",
        weight=0.5,
        timestamp=now,
    )
    sig_tcs = Signal(
        unique_post_hash="h2",
        platform="reddit",
        content_body="TCS is awesome",
        engagement_depth="reddit_nested_comment",
        weight=0.5,
        timestamp=now,
    )
    db_session.add_all([sig_infy, sig_tcs])
    db_session.flush()

    m_infy = Mention(
        signal_id=sig_infy.id,
        ticker="INFY",
        unique_post_hash="h1",
        timestamp=now,
        match_type="exact",
        confidence=1.0,
    )
    m_tcs = Mention(
        signal_id=sig_tcs.id,
        ticker="TCS",
        unique_post_hash="h2",
        timestamp=now,
        match_type="exact",
        confidence=1.0,
    )
    db_session.add_all([m_infy, m_tcs])

    # Seed Media Baseline (Set B) -> TCS is in mainstream media
    base_tcs = MediaBaseline(
        article_id="ma1",
        source="google_news",
        headline="TCS stock report",
        timestamp=now,
    )
    db_session.add(base_tcs)
    db_session.flush()

    mm_tcs = MediaMention(baseline_id=base_tcs.id, ticker="TCS", timestamp=now)
    db_session.add(mm_tcs)
    db_session.commit()

    # Run set difference processor: Set A = {INFY, TCS}, Set B = {TCS}
    # Breakout_Alpha = Set A - Set B = {INFY}
    breakouts = compute_breakout_tickers(db_session, window_days=7)
    assert "INFY" in breakouts
    assert "TCS" not in breakouts

    # Check watchlist generator output format
    data = generate_watchlist_data(db_session, days=7, min_mentions=1)
    assert len(data["watchlist"]) == 1
    assert data["watchlist"][0]["ticker"] == "INFY"
