# Technical Research: Early Smoke Reconnaissance Engine

This document details the architectural choices, tradeoffs, and designs for the core components of the Early Smoke Reconnaissance Engine.

---

### Decision 1: Background Job Scheduling via APScheduler
*   **Decision**: Deploy `APScheduler` using `AsyncIOScheduler` to execute background ingestion jobs.
*   **Rationale**:
    *   Integrates seamlessly with FastAPI's asynchronous lifecycle.
    *   Allows configuration of a max execution count (e.g., `max_instances=1`) to prevent the same job from running concurrently in multiple threads if a previous loop is slow.
    *   Operates purely in-process, requiring no external message brokers or dependency servers (keeping deployment simple and within free-tier limits).
*   **Alternatives Considered**:
    *   *Celery / Redis*: Requires a running Redis server which increases hosting cost and architectural footprint.
    *   *Asyncio infinite loop*: Lacks job monitoring, scheduling precision, and retry behavior.

---

### Decision 2: Entity Deduplication via MD5 Composite Hashing
*   **Decision**: Generate a composite unique key using the MD5 hash of `platform + thread_id + timestamp + cleaned_comment_text` and map it to an `INSERT OR IGNORE` SQLite instruction.
*   **Rationale**:
    *   Protects database integrity from overlapping continuous crawls.
    *   The `INSERT OR IGNORE` strategy delegates deduplication directly to SQLite's indexed storage layer, reducing application memory utilization.
    *   MD5 computation is fast, lightweight, and has negligible collision rates in small-scale temporal datasets.
*   **Alternatives Considered**:
    *   *Before-write SQL Queries*: Checking if a record exists before inserting doubles the number of database roundtrips, slowing down parsing loops.

---

### Decision 3: Asset Identification & Fuzzy Corporate Mapping
*   **Decision**: Initialize a cached search dictionary at startup based on public BSE/NSE corporate registers. Use `RapidFuzz` for colloquial name extraction and filter the output via a strict token blacklist (e.g., excluding terms like "YES", "GOOD"). Perform this operation in `asyncio.to_thread`.
*   **Rationale**:
    *   `RapidFuzz` is highly optimized in C and provides rapid string comparison.
    *   Offloading CPU-bound fuzzy matching and string searches to `asyncio.to_thread` ensures that the main FastAPI event loop remains responsive to incoming HTTP requests.
    *   The blacklist prevents false positives from common uppercase conversational terms.
*   **Alternatives Considered**:
    *   *LLM Entity Extraction*: Excluded due to the zero-cost hosting constraint.
    *   *Pure spaCy NER Model*: Spacy is too heavy for standard Hugging Face free CPU spaces and has poor extraction rates for local Indian abbreviations (e.g., "Infy", "Reliance").

---

### Decision 4: Sliding Window Purge Engine
*   **Decision**: Execute an automated daily cleanup running `DELETE FROM ... WHERE ...` immediately followed by `VACUUM`.
*   **Rationale**:
    *   SQLite does not automatically reduce the database file size when data is deleted. Running `VACUUM` defragments the database and shrinks the file on the ephemeral disk space.
    *   Ensures that memory and disk limits are never breached during continuous long-term execution.
*   **Alternatives Considered**:
    *   *InMemory SQLite*: Discarded because we need data persistence across container recycles/reboots.
