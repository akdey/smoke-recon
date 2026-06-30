import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.features.early_smoke.dictionary import corporate_dict
from app.features.early_smoke.matcher import ticker_matcher
from app.features.early_smoke.models import Base, Signal, Mention
from app.features.early_smoke.pipeline import ingest_social_post


# In-memory database setup for testing
@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    # Initialize dictionary
    corporate_dict.load()
    try:
        yield session
    finally:
        session.close()


def test_ticker_extraction_and_fuzzy_matching(db_session):
    """
    Verifies that spelling variations and abbreviations map correctly to target tickers.
    """
    # Test exact mapping
    mentions_exact = ticker_matcher.extract_mentions("I am buying some Wipro shares.")
    assert any(m["ticker"] == "WIPRO" for m in mentions_exact)

    # Test fuzzy/colloquial mapping
    mentions_fuzzy = ticker_matcher.extract_mentions("Tata Motors is flying today!")
    expected_tata = corporate_dict.get_ticker("tata motors")
    assert any(m["ticker"] == expected_tata for m in mentions_fuzzy)

    mentions_abbv = ticker_matcher.extract_mentions("Check out Infy reports.")
    assert any(m["ticker"] == "INFY" for m in mentions_abbv)


def test_blacklist_word_exclusions():
    """
    Verifies that conversational words that match tickers (e.g. YES, GOOD) are excluded.
    """
    # "YES" and "GOOD" should be excluded unless they are explicitly yes bank/goodricke
    mentions_conversational = ticker_matcher.extract_mentions(
        "YES I think it's a GOOD day to buy."
    )
    assert not any(m["ticker"] == "YESBANK" for m in mentions_conversational)
    assert not any(m["ticker"] == "GOODRICKE" for m in mentions_conversational)

    # Full names should still match
    mentions_explicit = ticker_matcher.extract_mentions(
        "YES Bank is looking extremely solid here."
    )
    assert any(m["ticker"] == "YESBANK" for m in mentions_explicit)


def test_deduplication_pipeline(db_session):
    """
    Verifies that identical posts are ignored on second ingestion attempt.
    """
    post_data = {
        "platform": "reddit",
        "thread_id": "thread123",
        "content_body": "Infosys is targeting high-performance sectors.",
        "engagement_depth": "thread_body",
    }

    # First ingestion must succeed
    success1 = ingest_social_post(db_session, post_data)
    assert success1 is True

    # Count signals
    assert db_session.query(Signal).count() == 1
    assert db_session.query(Mention).count() == 1

    # Second ingestion with same payload must return False (deduplicated)
    success2 = ingest_social_post(db_session, post_data)
    assert success2 is False

    # Counts must remain same
    assert db_session.query(Signal).count() == 1


def test_reddit_scraper_flow(db_session, monkeypatch):
    """
    Verifies that the custom Reddit HTML scraper correctly parses shreddit-post
    and shreddit-comment components, and successfully ingests them.
    """
    from app.features.early_smoke.reddit_worker import fetch_reddit_comments_scraper, run_reddit_ingestion

    # Mock fetch_url to return simulated HTML data
    def mock_fetch_url(url: str) -> str:
        if "comments" in url:
            return """
            <html>
                <body>
                    <shreddit-comment id="t1_98765" thingid="t1_98765" author="investor_beta" score="15" created-timestamp="2026-06-30T10:05:00Z">
                        <div slot="comment">Yes, Wipro is a solid buy.</div>
                    </shreddit-comment>
                </body>
            </html>
            """
        else:
            return """
            <html>
                <body>
                    <shreddit-post id="t3_12345" permalink="/r/IndianStreetBets/comments/12345/wipro_is_going_to_the_moon/" post-title="Wipro is going to the moon!" author="investor_alpha" score="120" comment-count="2" created-timestamp="2026-06-30T10:00:00Z">
                        Should we buy Wipro?
                    </shreddit-post>
                </body>
            </html>
            """

    monkeypatch.setattr("app.features.early_smoke.reddit_worker.fetch_url", mock_fetch_url)

    # 1. Test raw comments scraper list retrieval
    posts = fetch_reddit_comments_scraper()
    
    # We scrape 3 subreddits by default. Each returns 1 post + 1 comment
    assert len(posts) == 6
    
    # Verify content structure
    assert posts[0]["platform"] == "reddit"
    assert posts[0]["thread_id"] == "t3_12345"
    assert "Wipro is going to the moon!" in posts[0]["content_body"]
    assert posts[0]["engagement_depth"] == "reddit_thread_body"

    assert posts[1]["platform"] == "reddit"
    assert posts[1]["thread_id"] == "t1_98765"
    assert "Yes, Wipro is a solid buy." in posts[1]["content_body"]
    assert posts[1]["engagement_depth"] == "reddit_nested_comment"

    # 2. Test ingestion execution with DB
    run_reddit_ingestion(db_session)

    # Verify signals and mentions are stored
    signals = db_session.query(Signal).all()
    # Unique posts (1 thread + 1 comment) should be written once (because subsequent subreddits have same mock hashes)
    assert len(signals) == 2
    
    mentions = db_session.query(Mention).all()
    # WIPRO should be matched in both signals
    assert len(mentions) == 2
    assert all(m.ticker == "WIPRO" for m in mentions)

