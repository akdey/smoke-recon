import os
import logging
import feedparser
import urllib.request
import urllib.error
import hashlib
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup
from app.features.early_smoke.pipeline import ingest_social_post

logger = logging.getLogger("reddit_worker")

# Target subreddits for retail investor chatter
SUBREDDITS = ["IndianStreetBets", "stocks", "wallstreetbets"]


def fetch_url(url: str) -> str:
    """
    Fetches URL content using urllib.request with modern desktop browser headers.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        logger.warning(f"Scraper: failed to fetch {url}: {e}")
        return ""


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


def fetch_reddit_comments_scraper() -> List[Dict[str, Any]]:
    """
    Scrapes a subreddit interface and extracts structured comment data trees
    without using an API key.
    """
    posts = []
    for sub in SUBREDDITS:
        url = f"https://www.reddit.com/r/{sub}/new/"
        logger.info(f"Scraper: Fetching r/{sub} new posts...")
        html = fetch_url(url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")
        shreddit_posts = soup.find_all("shreddit-post")

        for post in shreddit_posts:
            permalink = post.get("permalink")
            full_url = f"https://www.reddit.com{permalink}" if permalink else url
            
            # Extract thread ID from id attribute or permalink
            post_id = post.get("id")
            if not post_id and permalink:
                parts = permalink.split("/")
                if len(parts) >= 3:
                    post_id = parts[-3]
            if not post_id:
                post_id = hashlib.md5(full_url.encode("utf-8")).hexdigest()[:12]

            post_title = post.get("post-title", "")
            post_body = post.text.strip()

            posts.append({
                "platform": "reddit",
                "thread_id": post_id,
                "content_body": f"{post_title}. {post_body}" if post_title else post_body,
                "engagement_depth": "reddit_thread_body",
                "url": full_url,
            })

            # Deep Ingestion: If the post contains comments, parse the inner thread view
            comment_count = 0
            try:
                comment_count = int(post.get("comment-count", 0))
            except (ValueError, TypeError):
                pass

            if comment_count > 0 and permalink:
                logger.info(f"Scraper: Fetching comments for thread {full_url}...")
                comment_html = fetch_url(full_url)
                if comment_html:
                    comment_soup = BeautifulSoup(comment_html, "html.parser")
                    shreddit_comments = comment_soup.find_all("shreddit-comment")
                    for comment in shreddit_comments:
                        comment_id = comment.get("id") or comment.get("thingid")
                        comment_div = comment.find("div", slot="comment")
                        if comment_div:
                            comment_body = comment_div.text.strip()
                        else:
                            p_tags = comment.find_all("p")
                            if p_tags:
                                comment_body = " ".join(p.text.strip() for p in p_tags)
                            else:
                                comment_body = comment.text.strip()

                        if comment_body:
                            if not comment_id:
                                comment_hash = hashlib.md5(comment_body.encode("utf-8")).hexdigest()[:12]
                                comment_id = f"{post_id}_comment_{comment_hash}"

                            posts.append({
                                "platform": "reddit",
                                "thread_id": comment_id,
                                "content_body": comment_body,
                                "engagement_depth": "reddit_nested_comment",
                                "url": full_url,
                            })
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
    it queries PRAW. Otherwise, it falls back to the HTML scraper, and finally
    the RSS fallback.
    """
    logger.info("Starting Reddit comments ingestion...")
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")

    posts = []
    if client_id and client_secret:
        logger.info("Reddit PRAW credentials found. Initializing PRAW feed...")
        posts = fetch_reddit_comments_praw(client_id, client_secret)

    if not posts:
        logger.info("PRAW not available or failed. Trying HTML Web Scraper...")
        posts = fetch_reddit_comments_scraper()

    if not posts:
        logger.info("HTML Web Scraper returned empty. Utilizing public RSS scraper fallback.")
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
