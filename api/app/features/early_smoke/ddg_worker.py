import logging
import hashlib
from datetime import datetime
from typing import List, Dict, Any
from duckduckgo_search import DDGS

logger = logging.getLogger("ddg_worker")


def fetch_ddg_news_baseline() -> List[Dict[str, Any]]:
    """
    Queries DuckDuckGo search for active corporate news headlines.
    """
    articles = []
    try:
        with DDGS() as ddgs:
            results = list(
                ddgs.text("Indian stock market analysis bse nse", max_results=10)
            )
            for r in results:
                title = r.get("title", "")
                snippet = r.get("body", "")
                link = r.get("href", "")

                # Combine title and snippet to parse for tickers later
                full_text = f"{title}. {snippet}"
                article_id = hashlib.md5(f"ddg:{link}".encode("utf-8")).hexdigest()

                articles.append(
                    {
                        "article_id": article_id,
                        "source": "duckduckgo",
                        "headline": full_text,
                        "url": link,
                        "timestamp": datetime.utcnow(),
                    }
                )
    except Exception as e:
        logger.warning(f"DuckDuckGo search crawl failed or skipped: {e}")

    return articles
