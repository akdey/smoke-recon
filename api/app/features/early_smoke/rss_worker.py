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
