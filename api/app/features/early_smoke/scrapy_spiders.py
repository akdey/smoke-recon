import logging
import requests
import hashlib
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.features.early_smoke.pipeline import ingest_social_post

logger = logging.getLogger("scrapy_spiders")


def scrape_chittorgarh_forum() -> List[Dict[str, Any]]:
    """
    Scrapes the Chittorgarh Mainboard and SME IPO discussion forum comments.
    Falls back to DDG search crawl if direct requests are blocked.
    """
    url = "https://www.chittorgarh.com/ipo_forum/"
    comments = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            # Parse comments
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
        logger.warning(f"Chittorgarh direct scraping failed: {e}")

    # Fallback to DDG search if no comments found
    if not comments:
        try:
            logger.info("Chittorgarh direct crawl empty. Initializing DDG fallback search...")
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(
                    ddgs.text("site:chittorgarh.com/ipo_forum/", max_results=10)
                )
                for r in results:
                    title = r.get("title", "")
                    body = r.get("body", "")
                    link = r.get("href", "")
                    comments.append(
                        {
                            "platform": "chittorgarh",
                            "thread_id": f"chit_ddg_{hashlib.md5(link.encode('utf-8')).hexdigest()[:12]}",
                            "content_body": f"{title}. {body}",
                            "engagement_depth": "message_board_comment",
                            "url": link,
                        }
                    )
        except Exception as e2:
            logger.warning(f"Chittorgarh DDG fallback search failed: {e2}")

    return comments


def scrape_et_times_forum() -> List[Dict[str, Any]]:
    """
    Scrapes the Economictimes stock forum threads.
    Falls back to DDG search crawl if direct requests are blocked.
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
        logger.warning(f"ET Times direct scraping failed: {e}")

    # Fallback to DDG search if no comments found
    if not comments:
        try:
            logger.info("ET Times direct crawl empty. Initializing DDG fallback search...")
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(
                    ddgs.text("site:economictimes.indiatimes.com/et-board/", max_results=10)
                )
                for r in results:
                    title = r.get("title", "")
                    body = r.get("body", "")
                    link = r.get("href", "")
                    comments.append(
                        {
                            "platform": "et_times",
                            "thread_id": f"et_ddg_{hashlib.md5(link.encode('utf-8')).hexdigest()[:12]}",
                            "content_body": f"{title}. {body}",
                            "engagement_depth": "message_board_comment",
                            "url": link,
                        }
                    )
        except Exception as e2:
            logger.warning(f"ET Times DDG fallback search failed: {e2}")

    return comments


def run_message_boards_ingestion(db: Session) -> None:
    """
    Scrapes and ingests comments from local forums (Chittorgarh and ET Times).
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
