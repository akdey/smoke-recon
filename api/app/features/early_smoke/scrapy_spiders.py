import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.features.early_smoke.pipeline import ingest_social_post

logger = logging.getLogger("scrapy_spiders")


def scrape_chittorgarh_forum() -> List[Dict[str, Any]]:
    """
    Scrapes the Chittorgarh Mainboard and SME IPO discussion forum comments.
    """
    url = "https://www.chittorgarh.com/ipo_forum/"
    comments = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            # Parse comments (specific elements depending on Chittorgarh forum layout)
            # Standard post body container is typically table rows or list items
            posts = soup.find_all("div", class_="forum-comment") or soup.find_all(
                "p", class_="comment-text"
            )
            for i, post in enumerate(posts[:10]):
                comments.append(
                    {
                        "platform": "chittorgarh",
                        "thread_id": f"chit_thread_{i}",
                        "content_body": post.get_text().strip(),
                        "engagement_depth": "message_board_comment",
                        "url": url,
                    }
                )
    except Exception as e:
        logger.warning(f"Chittorgarh live scraping skipped/failed: {e}")
    return comments


def scrape_et_times_forum() -> List[Dict[str, Any]]:
    """
    Scrapes the Economictimes stock forum threads.
    """
    url = "https://economictimes.indiatimes.com/et-board/trending"
    comments = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            posts = soup.find_all("div", class_="msgText") or soup.find_all(
                "div", class_="trending_msg"
            )
            for i, post in enumerate(posts[:10]):
                comments.append(
                    {
                        "platform": "et_times",
                        "thread_id": f"et_thread_{i}",
                        "content_body": post.get_text().strip(),
                        "engagement_depth": "message_board_comment",
                        "url": url,
                    }
                )
    except Exception as e:
        logger.warning(f"ET Times live scraping skipped/failed: {e}")
    return comments


def run_message_boards_ingestion(db: Session) -> None:
    """
    Scrapes and ingests comments from local forums (Chittorgarh and ET Times).
    Falls back to mock data if live pages are inaccessible.
    """
    logger.info("Starting Web Message Boards scraping...")

    posts = []
    posts.extend(scrape_chittorgarh_forum())
    posts.extend(scrape_et_times_forum())

    # Log if empty, but do not seed mock items
    if not posts:
        logger.info("Message boards crawl returned empty.")

    success_count = 0
    for post in posts:
        if ingest_social_post(db, post):
            success_count += 1

    logger.info(
        f"Message board ingestion completed. Saved {success_count}/{len(posts)} new messages."
    )
