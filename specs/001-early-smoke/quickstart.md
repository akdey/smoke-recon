# Validation Quickstart: Early Smoke Reconnaissance Engine

This guide describes how to run and verify the Early Smoke Reconnaissance Engine end-to-end.

## Prerequisites

1.  **Environment Setup**: Python 3.11+ and Node.js 18+ installed.
2.  **UV Tool**: Ensure `uv` package manager is installed:
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ```
3.  **Dependencies Setup**:
    *   **Backend**: Navigate to `api/` and run:
        ```bash
        uv sync
        ```
    *   **Frontend**: Navigate to `ui/` and run:
        ```bash
        npm install
        ```

---

## Running the Application

### 1. Start the Backend API & Scrapers
From the `api/` directory:
```bash
uv run uvicorn app.main:app --reload --port 8000
```
*   Verify the API is running by checking `http://localhost:8000/api/health`.

### 2. Start the Frontend Dashboard
From the `ui/` directory:
```bash
npm run dev -- --port 3000
```
*   Open `http://localhost:3000` in your web browser.

---

## Validation Scenarios

### Scenario A: Ingestion & Fuzzy Ticker Resolution Validation
Verify that the scraper captures comments, runs them in the thread pool, and maps abbreviations (like "Infy") to the correct exchange ticker.
1.  **Command**: Run the ingestion unit test suite:
    ```bash
    uv run pytest app/features/early_smoke/tests/test_ingestion.py
    ```
2.  **Expected Outcome**: The test feeds a comment `"Buying Infy at CMP"` to the mock extraction service. It must successfully map it to `INFY` and persist it with an `exact_match` or `fuzzy_match` confidence score.

### Scenario B: Asymmetric Set Difference Breakout Alpha Validation
Verify that Set A (social) and Set B (mainstream) asymmetric difference logic resolves correctly.
1.  **Command**: Run the breakout logic test suite:
    ```bash
    uv run pytest app/features/early_smoke/tests/test_breakout.py
    ```
2.  **Expected Outcome**:
    *   Set A: `["INFY", "TCS", "RELIANCE"]`
    *   Set B: `["TCS", "RELIANCE"]`
    *   Computed `Breakout_Alpha`: `Set_A.difference(Set_B)` = `{"INFY"}`.
    *   Watchlist endpoint must return only `INFY`.

### Scenario C: Sliding Window Purge Validation
Verify that records older than configured window are successfully pruned and the database is vacuumed.
1.  **Command**: Run the purge lifecycle test:
    ```bash
    uv run pytest app/features/early_smoke/tests/test_purge.py
    ```
2.  **Expected Outcome**: Inserts historical mock data (11 days old) and triggers the purge service. The database query counts must match `0` records older than the threshold, and the database file size must shrink after `VACUUM`.
