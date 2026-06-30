from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Index, Text
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Signal(Base):
    """
    Represents an ingested social media comment, post, or thread.
    """

    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    unique_post_hash = Column(String, unique=True, nullable=False, index=True)
    platform = Column(String, nullable=False)
    thread_id = Column(String, nullable=True)
    content_body = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    engagement_depth = Column(String, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    url = Column(String, nullable=True)

    mentions = relationship(
        "Mention",
        back_populates="signal",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Mention(Base):
    """
    Stores extracted stock ticker occurrences found in retail comments.
    """

    __tablename__ = "mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signal_id = Column(
        Integer, ForeignKey("signals.id", ondelete="CASCADE"), nullable=False
    )
    ticker = Column(String, nullable=False)
    unique_post_hash = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    match_type = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)

    signal = relationship("Signal", back_populates="mentions")


# Declare composite index on (ticker, unique_post_hash, timestamp) for rapid density checks
Index(
    "idx_ticker_hash_time", Mention.ticker, Mention.unique_post_hash, Mention.timestamp
)


class MediaBaseline(Base):
    """
    Represents mainstream news articles and search baseline tracking elements.
    """

    __tablename__ = "media_baselines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    article_id = Column(String, unique=True, nullable=False, index=True)
    source = Column(String, nullable=False)
    headline = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    url = Column(String, nullable=True)

    mentions = relationship(
        "MediaMention",
        back_populates="baseline",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class MediaMention(Base):
    """
    Stores stock ticker occurrences extracted from mainstream media.
    """

    __tablename__ = "media_mentions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    baseline_id = Column(
        Integer, ForeignKey("media_baselines.id", ondelete="CASCADE"), nullable=False
    )
    ticker = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)

    baseline = relationship("MediaBaseline", back_populates="mentions")


class SystemState(Base):
    """
    Generic key-value store for system states, config, and circuit breakers.
    """

    __tablename__ = "system_state"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
