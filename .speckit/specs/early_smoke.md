# Feature Specification: Early Smoke Reconnaissance Engine

**Feature Branch**: `001-early-smoke`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "/speckit-specify Run the specify sequence to output a functional requirements definition file located at `.speckit/specs/early_smoke.md`. This document must specify the precise operational pipeline requirements for the "Early Smoke Reconnaissance Engine": Ingestion Pipelines (Set A - Social Stream), Baseline Tracker (Set B - Mainstream Baseline), Analytics & Weightage Matrix, Continuous Processing Constraints..."

## Clarifications

### Session 2026-06-25
- Q: How to resolve casual/abbreviated name matching failures? → A: Initialize an index-cached corporate dictionary at startup from official NSE/BSE corporate master lists, and use fuzzy matching (RapidFuzz) or spaCy rules to map colloquial terms directly to exchange tickers.
- Q: How to prevent false positives from conversational word ticker overlaps? → A: Apply an absolute word exclusion filter/blacklist to drop common conversational words that mimic standard ticker symbols (e.g., YES, GOOD).
- Q: How to avoid CPU event-loop stalling under heavy tokenization/extraction load? → A: Execute all text extraction, tokenization, and entity mapping computations within asyncio.to_thread or isolated thread pools.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Social Ingestion & Deduplication (Priority: P1)

The system continuously pulls and monitors retail speculative comments from Reddit, X, Chittorgarh, and ET Times. It must drill down to nested comments where early speculative interest occurs, and deduplicate these signals across continuous loop cycles to prevent database pollution.

**Why this priority**: Core ingestion feeds the entire analytical system. Without raw, clean data, the dashboard cannot display any insights.

**Independent Test**: Verify that nested comments from a test forum are successfully ingested, correctly mapped to their respective parent threads, and that duplicates with identical content/platform IDs are discarded during subsequent ingestion cycles.

**Acceptance Scenarios**:

1. **Given** new nested comments are posted in specified threads on Chittorgarh, **When** the ingestion pipeline runs, **Then** the historical comment blocks are extracted and saved with appropriate engagement depth tags.
2. **Given** a post has already been ingested, **When** the crawler encounters the exact same platform post ID and comment body hash, **Then** the deduplication layer discards the item and does not create a duplicate record in the database.

---

### User Story 2 - Mainstream Media Baseline (Priority: P2)

The system continuously tracks a mainstream media baseline using open Google News RSS feeds and DuckDuckGo search tracking layers for comparison against social momentum.

**Why this priority**: Helps analysts contextualize social media hype against mainstream media attention.

**Independent Test**: Query DuckDuckGo search tracking and Google News RSS for a list of target assets, verifying that headlines and search result baseline scores are properly parsed and recorded.

**Acceptance Scenarios**:

1. **Given** a set of asset keywords, **When** the mainstream baseline job triggers, **Then** matching news headlines from Google News RSS are retrieved and saved.
2. **Given** the DuckDuckGo search tracking runs, **When** search results are returned, **Then** the system logs the asset's search visibility baseline.

---

### User Story 3 - Analytics Dashboard & Weightage Matrix (Priority: P1)

The frontend dashboard visualizes the source distribution, total mention densities, and timestamp vectors for analyzed assets. It applies an adjustable weightage matrix based on signal engagement depth.

**Why this priority**: Critical for analysts to interpret the gathered data and identify trends at a glance.

**Independent Test**: Configure the weightage matrix, ingest test data with different depths, and verify that the dashboard renders the weighted mention densities and distributions correctly.

**Acceptance Scenarios**:

1. **Given** ingested signals with varying depths (e.g. Reddit body = 1.0, nested comment = 0.5), **When** the dashboard computes asset momentum, **Then** it applies the configured weights and updates the visual total mention density graphs.
2. **Given** a set of asset signals over time, **When** the dashboard loads, **Then** it displays a timeline (timestamp vectors) and source breakdown charts.

### Edge Cases

- **Rate Limiting / IP Bans**: Ingestion scripts get rate-limited or blocked by target platforms (especially X/Twitter and scrapers). The system handles this using an isolated **Circuit Breaker Pattern** for X/Twitter scraping:
  1. **State Isolation**: If X/Twitter ingestion hits 3 consecutive HTTP 429s, connection timeouts, or empty DOM returns, the circuit breaker for the X source trips to an `OPEN` state.
  2. **Graceful Decay / Exponential Backoff**: Once tripped, the scheduler suspends X ingestion and schedules retry queries using exponential backoff with random jitter (retry after 1 hour, then 2, then 4 max) to prevent the application from continuously spamming X and locking the container IP.
  3. **Dashboard Degradation Indicator**: While the circuit is open, a local state record in SQLite updates and is communicated via the FastAPI `GET /api/health` endpoint, allowing the React frontend to display a "Service Degraded: Twitter Stream Cooling Down" warning badge while other scrapers (Reddit, Chittorgarh, ET Times) continue normally.
- **Deep Nesting Performance**: Scraping comments at arbitrary depths could lead to memory or execution timeouts. Ingestion must cap maximum nesting depth to maintain stable continuous runs.
- **Message Board Layout Changes**: Board structures (like Chittorgarh or ET Times forums) change their HTML class names. Scrapers must handle parsing errors without crashing the continuous service.
- **Ticker Collision / False Positives**: Conversational words mimicking ticker symbols (e.g., "YES", "GOOD") can trigger false positives. The extraction engine must filter these out using a strict token blacklist.
- **CPU Stalling on Ephemeral Host**: Intense tokenization and fuzzy matching on a shared, free-tier Hugging Face CPU instance can block the single-threaded asynchronous event loop. Calculations must be offloaded to threads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST scrape Reddit comments using PRAW, X/Twitter posts, and web message boards Chittorgarh & ET Times:
  - **Chittorgarh Target Boundary**: Scope the scraper to target the **Mainboard IPO Discussions and SME IPO Forums exclusively** to extract active retail comments regarding unlisted gray market premiums (GMP) and speculative sentiment.
  - **ET Times Target Boundary**: Scope the parser to crawl the **Top 20 most active/trending individual stock discussion threads** listed dynamically on their community overview page.
- **FR-002**: The ingestion pipeline MUST parse and extract historical nested comments and comment blocks where speculative retail interest is initiated.
- **FR-003**: The baseline tracker MUST query open Google News RSS endpoints and DuckDuckGo search results for asset mentions.
- **FR-004**: The system MUST generate a unique identifier for each ingested item by computing a string hash of the platform, thread ID, timestamp, and cleaned comment text:
  $$\text{unique\_hash} = \text{MD5}(\text{platform} + \text{thread\_id} + \text{timestamp} + \text{cleaned\_comment\_text})$$
- **FR-005**: The deduplication layer MUST discard any incoming item whose unique identifier matches an existing record in the SQLite database, utilizing an `INSERT OR IGNORE` strategy to eliminate duplicates within the 7-10 day sliding window efficiently.
- **FR-006**: The system MUST apply an adjustable weightage matrix to signals based on engagement source depth (e.g., Reddit thread body = 1.0, deeply nested comment = 0.5, Twitter tweet = 0.4).
- **FR-007**: The dashboard MUST visualize total mention densities, source distribution charts, and timeline/timestamp vectors of mentions.
- **FR-008**: The system MUST operate continuously as a background process within a Hugging Face Space instance.
- **FR-009**: The backend MUST initialize an internal index-cached corporate dictionary at application startup by reading the official, publicly available NSE/BSE corporate master exchange list.
- **FR-010**: The extraction engine MUST utilize `RapidFuzz` or localized `spaCy` matching rules to map colloquial names, abbreviations, and snippets (e.g. "Infy", "Tata Motors") directly back to their official underlying stock exchange tickers.
- **FR-011**: The system MUST apply an absolute word exclusion blacklist to filter out ambiguous conversational words (e.g. "YES", "GOOD", "ON") mimicking tickers.
- **FR-012**: The text extraction and tokenization computations MUST be executed inside `asyncio.to_thread` or isolated ThreadPool blocks to prevent event-loop stalling.

### Key Entities

- **Signal**: Represents an ingested unit of speculative retail comment/post.
  - Attributes: `id` (hash), `platform_post_id`, `platform` (Reddit/X/MessageBoard), `content_body`, `timestamp`, `engagement_depth` (body, nested, tweet, etc.), `weight`.
- **MediaBaseline**: Represents a mainstream news item or search visibility metric.
  - Attributes: `id`, `asset_id`, `source` (Google News/DuckDuckGo), `headline`, `timestamp`, `baseline_score`.
- **CentralConfig**: Holds runtime settings.
  - Attributes: `weightage_matrix` (dict of depths to weights), `retention_days` (default 7-10 days), `scraping_intervals`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Newly posted comments on social channels must be processed, deduplicated, and visible on the dashboard within 5 minutes of publication.
- **SC-002**: The frontend dashboard must load and display all asset charts in under 3 seconds under normal network conditions.
- **SC-003**: The deduplication rate must be 100% for duplicate items (zero duplicate records in database).
- **SC-004**: System must run continuously in the ephemeral space without manual intervention, maintaining a trailing sliding temporal window of 7-10 days of data.

## Assumptions

- Target message boards (Chittorgarh & ET Times) do not require user authentication to view discussion threads.
- Scraping volumes will remain within public rate limits or standard developer tier thresholds.
