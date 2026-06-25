import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List

logger = logging.getLogger("broadcaster")

class ActivityBroadcaster:
    """
    Manages in-memory rolling logs history and broadcasts events to all active
    UI listeners via async Server-Sent Events (SSE) queues.
    """
    def __init__(self, max_history: int = 50):
        self.max_history = max_history
        self.history: List[Dict[str, Any]] = []
        self.listeners: List[asyncio.Queue] = []
        self._seed_initial_history()

    def _seed_initial_history(self):
        """Seeds initial system events so the UI feed is populated at first load."""
        startup_time = datetime.utcnow().isoformat() + "Z"
        self.history = [
            {
                "timestamp": startup_time,
                "event_type": "system",
                "message": "Early Smoke Engine core initialization started.",
                "ticker": None,
                "source": "system",
                "details": {}
            },
            {
                "timestamp": startup_time,
                "event_type": "system",
                "message": "Centralized database connected: sqlite:///early_smoke.db",
                "ticker": None,
                "source": "system",
                "details": {}
            },
            {
                "timestamp": startup_time,
                "event_type": "system",
                "message": "NSE/BSE Corporate Dictionary successfully cached in memory.",
                "ticker": None,
                "source": "dictionary",
                "details": {"size": 29}
            },
            {
                "timestamp": startup_time,
                "event_type": "system",
                "message": "Background cron scheduler started. Active routines: Ingestion, Purge, Analytics.",
                "ticker": None,
                "source": "scheduler",
                "details": {}
            }
        ]

    def broadcast(
        self,
        event_type: str,  # "system" | "scraper" | "mention" | "media" | "circuit_breaker" | "purge"
        message: str,
        ticker: str = None,
        source: str = None,
        details: Dict[str, Any] = None
    ):
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "message": message,
            "ticker": ticker,
            "source": source,
            "details": details or {}
        }
        
        # Append and trim history
        self.history.append(event)
        if len(self.history) > self.max_history:
            self.history.pop(0)

        # Put event into all active listener queues
        for queue in list(self.listeners):
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                logger.debug("Listener queue full. Skipping broadcast.")
            except Exception as e:
                logger.error(f"Error putting event to listener: {e}")

    async def subscribe(self):
        """Creates an async subscription yield engine for a connected client."""
        queue = asyncio.Queue(maxsize=100)
        
        # Populate history for the listener
        for event in list(self.history):
            await queue.put(event)
            
        self.listeners.append(queue)
        try:
            while True:
                event = await queue.get()
                yield event
                queue.task_done()
        finally:
            if queue in self.listeners:
                self.listeners.remove(queue)

# Global singleton broadcaster instance
broadcaster = ActivityBroadcaster()
