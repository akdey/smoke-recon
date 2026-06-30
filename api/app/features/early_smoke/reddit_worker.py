import os
import logging
import feedparser
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.features.early_smoke.pipeline import ingest_social_post

logger = logging.getLogger("reddit_worker")

# Target subreddits for retail investor chatter
SUBREDDITS = ["IndianStreetBets", "stocks", "wallstreetbets"]


def fetch_reddit_comments_rss() -> List[Dict[str, Any]]:
    """
    Fetches comments from public Reddit subreddits RSS feeds as a zero-auth fallback.
    """
    posts = []
    for sub in SUBREDDITS:
        url = f"https://www.reddit.com/r/{sub}/comments.rss"
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries:
                posts.append(
                    {
                        "platform": "reddit",
                        "thread_id": entry.get("id", ""),
                        "content_body": entry.get("summary", entry.get("title", "")),
                        "engagement_depth": "reddit_nested_comment",
                        "url": entry.get("link", ""),
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to fetch public RSS comments for r/{sub}: {e}")
    return posts


def fetch_reddit_comments_praw(client_id: str, client_secret: str) -> List[Dict[str, Any]]:
    """
    Fetches new submissions and nested comments using the official Reddit PRAW client.
    """
    import praw
    posts = []
    try:
        user_agent = os.getenv("REDDIT_USER_AGENT", "python:SmokeRecon:v1.2")
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent
        )
        for sub_name in SUBREDDITS:
            logger.info(f"PRAW: Fetching r/{sub_name} new submissions...")
            subreddit = reddit.subreddit(sub_name)
            for submission in subreddit.new(limit=15):
                # Thread submission body
                posts.append({
                    "platform": "reddit",
                    "thread_id": submission.id,
                    "content_body": f"{submission.title}. {submission.selftext}",
                    "engagement_depth": "reddit_thread_body",
                    "url": f"https://www.reddit.com{submission.permalink}"
                })
                # Nested top comments
                submission.comments.replace_more(limit=0)
                for comment in submission.comments.list()[:10]:
                    posts.append({
                        "platform": "reddit",
                        "thread_id": comment.id,
                        "content_body": comment.body,
                        "engagement_depth": "reddit_nested_comment",
                        "url": f"https://www.reddit.com{comment.permalink}"
                    })
    except Exception as e:
        logger.error(f"Failed fetching comments via PRAW: {e}")
    return posts


def run_reddit_ingestion(db: Session) -> None:
    """
    Runs the Reddit scraper. If PRAW credentials exist in environment variables,
    it queries PRAW. Otherwise, it falls back to public RSS feed scraping.
    """
    logger.info("Starting Reddit comments ingestion...")
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")

    posts = []
    if client_id and client_secret:
        logger.info("Reddit PRAW credentials found. Initializing PRAW feed...")
        posts = fetch_reddit_comments_praw(client_id, client_secret)
    else:
        logger.info(
            "No Reddit PRAW credentials found. Utilizing public RSS scraper fallback."
        )
        posts = fetch_reddit_comments_rss()

    # Log if empty, but do not seed mock items
    if not posts:
        logger.info("Reddit comments feed returned empty.")

    success_count = 0
    for post in posts:
        if ingest_social_post(db, post):
            success_count += 1

    logger.info(
        f"Reddit ingestion run completed. Ingested {success_count}/{len(posts)} new comments."
    )
