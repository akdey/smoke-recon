# API Interface Contract: Early Smoke Reconnaissance Engine

This contract defines the FastAPI REST endpoints exposed by the backend for consumption by the React dashboard frontend.

---

## Endpoint: GET `/api/features/early-smoke/watchlist`

Retrieves the currently identified breakout assets (speculative retail interest not yet matching mainstream baselines) within the configured sliding temporal window.

### Query Parameters

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `days` | `Integer` | No | `7` | Size of the trailing sliding temporal window in days. |
| `min_mentions` | `Integer` | No | `3` | Minimum mention density threshold before a ticker qualifies. |

### Success Response (`200 OK`)

*   **Content-Type**: `application/json`

```json
{
  "window_days": 7,
  "min_mentions_threshold": 3,
  "generated_at": "2026-06-25T13:41:57Z",
  "watchlist": [
    {
      "ticker": "INFY",
      "company_name": "Infosys Limited",
      "breakout_alpha_score": 8.4,
      "social_mentions": 12,
      "media_mentions": 0,
      "source_distribution": {
        "reddit": 5,
        "twitter": 3,
        "chittorgarh": 4,
        "et_times": 0
      },
      "timestamp_vectors": [
        "2026-06-25T10:00:00Z",
        "2026-06-25T11:15:00Z",
        "2026-06-25T13:00:00Z"
      ]
    }
  ]
}
```

---

## Endpoint: GET `/api/health`

Retrieves system operational health, background task scheduler status, and scraper circuit breaker states.

### Success Response (`200 OK`)

*   **Content-Type**: `application/json`

```json
{
  "status": "degraded",
  "database": {
    "status": "connected",
    "size_bytes": 1048576,
    "last_purged_at": "2026-06-25T00:00:00Z"
  },
  "scheduler": {
    "status": "running",
    "active_jobs": ["ingest_social_stream", "ingest_media_baseline", "purge_sliding_window"]
  },
  "circuit_breakers": {
    "twitter": {
      "state": "OPEN",
      "consecutive_failures": 3,
      "retry_at": "2026-06-25T14:30:25Z",
      "degradation_message": "Twitter Stream Cooling Down due to rate-limiting (429)."
    },
    "reddit": {
      "state": "CLOSED"
    },
    "message_boards": {
      "state": "CLOSED"
    }
  }
}
```
