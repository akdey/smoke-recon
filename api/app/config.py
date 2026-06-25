from pathlib import Path
from pydantic import BaseModel, Field
import yaml


class WeightSettings(BaseModel):
    reddit_thread_body: float = 1.0
    reddit_nested_comment: float = 0.5
    twitter_tweet_text: float = 0.4
    message_board_comment: float = 0.8


class Settings(BaseModel):
    database_url: str = "sqlite:///early_smoke.db"
    retention_days: int = 10
    scraping_interval_minutes: int = 60
    weights: WeightSettings = Field(default_factory=WeightSettings)


def load_settings(config_path: str | Path = "config.yaml") -> Settings:
    path = Path(config_path)
    if not path.is_absolute():
        # Resolve relative to the api/ directory containing pyproject.toml
        path = Path(__file__).resolve().parent.parent / config_path

    if not path.exists():
        return Settings()

    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    return Settings(**data)


# Singleton configuration instance
settings = load_settings()
