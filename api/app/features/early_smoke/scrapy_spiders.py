import logging
import hashlib
import random
import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.features.early_smoke.pipeline import ingest_social_post
from app.features.early_smoke.broadcaster import broadcaster

logger = logging.getLogger("scrapy_spiders")

# Rotating UA pool — avoids bot detection on direct scrapes
_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
]


def _get(url: str, timeout: int = 10) -> httpx.Response | None:
    """Shared httpx fetch with rotating UA and redirect following."""
    try:
        headers = {
            "User-Agent": random.choice(_USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            r = client.get(url, headers=headers)
            r.raise_for_status()
            return r
    except Exception as e:
        logger.warning(f"HTTP fetch failed for {url}: {e}")
        return None


def scrape_chittorgarh_forum() -> List[Dict[str, Any]]:
    """
    Scrapes the Chittorgarh IPO listing page for IPO-related company names and
    discussion content. The /ipo_forum/ path no longer exists; the active page
    is /ipo/ which lists all current and upcoming IPOs with company names and GMP.
    """
    url = "https://www.chittorgarh.com/ipo/"
    comments = []

    resp = _get(url)
    if resp:
        soup = BeautifulSoup(resp.text, "html.parser")
        # Each IPO row has company name, GMP, subscription data — very ticker-rich
        rows = soup.find_all("tr")
        for row in rows[:30]:
            cells = row.find_all("td")
            if len(cells) >= 2:
                row_text = " ".join(c.get_text(separator=" ").strip() for c in cells)
                if len(row_text) > 10:
                    row_hash = hashlib.md5(row_text.encode("utf-8")).hexdigest()[:12]
                    comments.append(
                        {
                            "platform": "chittorgarh",
                            "thread_id": f"chit_{row_hash}",
                            "content_body": row_text,
                            "engagement_depth": "message_board_comment",
                            "url": url,
                        }
                    )

        # Also grab any paragraph text (GMP forum commentary sections)
        paras = soup.find_all("p")
        for p in paras[:10]:
            text = p.get_text().strip()
            if len(text) > 30:
                p_hash = hashlib.md5(text.encode("utf-8")).hexdigest()[:12]
                comments.append(
                    {
                        "platform": "chittorgarh",
                        "thread_id": f"chit_para_{p_hash}",
                        "content_body": text,
                        "engagement_depth": "message_board_comment",
                        "url": url,
                    }
                )

    if not comments:
        logger.warning("Chittorgarh scrape returned no content.")

    return comments

def run_message_boards_ingestion(db: Session) -> None:
    """
    Scrapes and ingests content from Chittorgarh (IPO data).
    """
    logger.info("Starting Web Message Boards scraping...")
    broadcaster.broadcast(
        event_type="system",
        message="Message board crawlers started. Fetching Chittorgarh IPOs...",
        source="message_boards",
    )

    posts = []
    chit_posts = scrape_chittorgarh_forum()
    posts.extend(chit_posts)

    broadcaster.broadcast(
        event_type="system",
        message=f"Crawl fetched: {len(chit_posts)} Chittorgarh rows.",
        source="message_boards",
        details={"chittorgarh": len(chit_posts)},
    )

    if not posts:
        logger.info("Message boards crawl returned empty.")

    success_count = 0
    for post in posts:
        if ingest_social_post(db, post):
            success_count += 1

    logger.info(
        f"Message board ingestion completed. Saved {success_count}/{len(posts)} new messages."
    )
    broadcaster.broadcast(
        event_type="system",
        message=f"Message board ingestion completed. Saved {success_count}/{len(posts)} new entries.",
        source="message_boards",
        details={"ingested": success_count, "total": len(posts)},
    )
