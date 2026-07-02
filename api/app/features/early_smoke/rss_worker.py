import logging
import hashlib
import feedparser
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger("rss_worker")


def fetch_google_news_baseline() -> List[Dict[str, Any]]:
    """
    Fetches news headlines from the public Google News RSS feed for corporate finance topics.
    """
    url = "https://news.google.com/rss/search?q=NSE+BSE+stocks+business&hl=en-IN&gl=IN&ceid=IN:en"
    articles = []
    try:
        feed = feedparser.parse(url)
        for entry in feed.entries[:15]:
            title = entry.get("title", "")
            # Generate a unique article ID based on title and publication date
            pub_date = entry.get("published", "")
            article_id = hashlib.md5(f"{title}:{pub_date}".encode("utf-8")).hexdigest()

            articles.append(
                {
                    "article_id": article_id,
                    "source": "google_news",
                    "headline": title,
                    "url": entry.get("link", ""),
                    "timestamp": datetime.utcnow(),  # Fallback to current time
                }
            )
    except Exception as e:
        logger.warning(f"Google News RSS feed parsing failed: {e}")

    return articles


def fetch_et_times_baseline() -> List[Dict[str, Any]]:
    """
    Fetches news from Economic Times Markets RSS feed.
    """
    feed_url = "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms"
    articles = []
    try:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries[:25]:
            title = entry.get("title", "")
            summary = entry.get("summary", "")
            link = entry.get("link", "")
            entry_id = entry.get("id", link)

            # Combine title and summary for richer ticker matching in headline
            headline = f"{title}. {summary}".strip()
            if not headline:
                continue

            article_id = hashlib.md5(entry_id.encode("utf-8")).hexdigest()[:16]
            articles.append(
                {
                    "article_id": article_id,
                    "source": "et_times",
                    "headline": headline,
                    "url": link,
                    "timestamp": datetime.utcnow(),
                }
            )
    except Exception as e:
        logger.warning(f"ET Markets RSS feed parsing failed: {e}")

    return articles
