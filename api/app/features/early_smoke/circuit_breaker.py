import json
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.features.early_smoke.models import SystemState
from app.features.early_smoke.broadcaster import broadcaster


class CircuitBreaker:
    """
    Isolated Circuit Breaker with Persistent State in SQLite.
    Trips to OPEN after 3 consecutive failures.
    Triggers exponential backoff (1h -> 2h -> 4h max) with random jitter.
    """

    def __init__(
        self,
        name: str,
        threshold: int = 3,
        base_delay_seconds: int = 3600,
        max_delay_seconds: int = 14400,
    ) -> None:
        self.name = name
        self.threshold = threshold
        self.base_delay = base_delay_seconds
        self.max_delay = max_delay_seconds

    def _get_state(self, db: Session) -> dict:
        state_record = (
            db.query(SystemState).filter_by(key=f"circuit_breaker_{self.name}").first()
        )
        if not state_record:
            # Default state
            default_state = {"state": "CLOSED", "failures": 0, "retry_at": None}
            # Save default state
            new_record = SystemState(
                key=f"circuit_breaker_{self.name}", value=json.dumps(default_state)
            )
            db.add(new_record)
            db.commit()
            return default_state
        return json.loads(state_record.value)

    def _save_state(self, db: Session, state: dict) -> None:
        state_record = (
            db.query(SystemState).filter_by(key=f"circuit_breaker_{self.name}").first()
        )
        if state_record:
            state_record.value = json.dumps(state)
            db.commit()

    def is_available(self, db: Session) -> bool:
        """
        Checks if the scraper is available to execute.
        If OPEN but the retry cooldown has elapsed, it transitions to HALF_OPEN and returns True.
        """
        state_data = self._get_state(db)
        if state_data["state"] == "CLOSED":
            return True

        retry_at_str = state_data.get("retry_at")
        if not retry_at_str:
            return True

        retry_at = datetime.fromisoformat(retry_at_str)
        if datetime.utcnow() >= retry_at:
            # Transition to HALF_OPEN
            state_data["state"] = "HALF_OPEN"
            self._save_state(db, state_data)
            broadcaster.broadcast(
                event_type="circuit_breaker",
                message=f"Circuit Breaker '{self.name}' cooldown elapsed. Transitioned from OPEN to HALF_OPEN.",
                source=self.name
            )
            return True

        return False

    def record_success(self, db: Session) -> None:
        """
        Resets failure counters and closes the circuit on a successful scrape run.
        """
        state_data = self._get_state(db)
        old_state = state_data["state"]
        state_data["state"] = "CLOSED"
        state_data["failures"] = 0
        state_data["retry_at"] = None
        self._save_state(db, state_data)
        if old_state != "CLOSED":
            broadcaster.broadcast(
                event_type="circuit_breaker",
                message=f"Circuit Breaker '{self.name}' state recovered: {old_state} -> CLOSED.",
                source=self.name
            )

    def record_failure(self, db: Session) -> None:
        """
        Increments failures and trips the circuit to OPEN with exponential backoff if threshold met.
        """
        state_data = self._get_state(db)
        failures = state_data["failures"] + 1
        state_data["failures"] = failures
        old_state = state_data["state"]

        if failures >= self.threshold:
            state_data["state"] = "OPEN"

            # Exponential backoff: 1h -> 2h -> 4h max
            backoff_multiplier = min(2 ** (failures - self.threshold), 4)
            delay_seconds = self.base_delay * backoff_multiplier

            # Add random jitter (±10% to prevent synchronized retry storms)
            jitter = random.uniform(-0.1, 0.1) * delay_seconds
            total_delay = max(60, int(delay_seconds + jitter))

            retry_time = datetime.utcnow() + timedelta(seconds=total_delay)
            state_data["retry_at"] = retry_time.isoformat()

        self._save_state(db, state_data)
        if state_data["state"] == "OPEN" and old_state != "OPEN":
            broadcaster.broadcast(
                event_type="circuit_breaker",
                message=f"Circuit Breaker '{self.name}' tripped to OPEN due to consecutive failures ({failures}). Re-evaluation cooldown active.",
                source=self.name
            )

    def get_status(self, db: Session) -> dict:
        """
        Returns a dictionary representing the current status for health checks.
        """
        return self._get_state(db)


# Global circuit breaker instance for Twitter
twitter_circuit_breaker = CircuitBreaker("twitter")
