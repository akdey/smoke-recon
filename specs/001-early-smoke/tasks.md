# Tasks: Early Smoke Reconnaissance Engine

**Input**: Design documents from `/specs/001-early-smoke/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Clean Vertical Slice Modules**: `api/app/features/early_smoke/`, `ui/src/features/early_smoke/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize the FastAPI project with `uv` package manager and define dependencies in `api/pyproject.toml`
- [x] T002 Initialize the React project with Vite, TypeScript, and Tailwind CSS in `ui/package.json`
- [x] T003 [P] Create the feature-isolated directory structures at `api/app/features/early_smoke/` and `ui/src/features/early_smoke/`
- [x] T004 [P] Configure the centralized configuration loader class in `api/app/config.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database and entity processing infrastructure that MUST be completed before user stories

- [x] T005 Create the SQLite database connection engine and session factory in `api/app/db.py`
- [x] T006 Implement the SQLAlchemy entity models (Signal, Mention, MediaBaseline, MediaMention) with composite index index_ticker_hash_time in `api/app/features/early_smoke/models.py`
- [x] T007 Implement database initialization scripts and table creations in `api/app/features/early_smoke/init_db.py`
- [x] T008 [P] Implement the startup loader service to cache the NSE/BSE corporate master listings in `api/app/features/early_smoke/dictionary.py`
- [x] T009 [P] Implement the `RapidFuzz` and token blacklist matching utility in `api/app/features/early_smoke/matcher.py`
- [x] T010 Create thread pool worker executors for CPU-bound extraction tasks in `api/app/features/early_smoke/executor.py`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Social Ingestion & Deduplication (Priority: P1) 🎯 MVP

**Goal**: Continuously ingest comments, drill down to nested threads, and perform unique composite hash deduplication and circuit breaker status tracking.

**Independent Test**: Write and execute tests to verify that mock comments are scraped, fuzzy matched to tickers, and that duplicate comments are ignored while preserving circuit breaker states.

### Tests for User Story 1
- [x] T011 [P] [US1] Write ingestion unit and integration test suite in `api/app/features/early_smoke/tests/test_ingestion.py`

### Implementation for User Story 1
- [x] T012 [P] [US1] Create PRAW-based Reddit comments scraper worker in `api/app/features/early_smoke/reddit_worker.py`
- [x] T013 [P] [US1] Create Scrapy spiders targeting Chittorgarh IPO and ET Times top 20 active threads in `api/app/features/early_smoke/scrapy_spiders.py`
- [x] T014 [P] [US1] Create X/Twitter headless crawler/ntscraper task in `api/app/features/early_smoke/twitter_worker.py`
- [x] T015 [US1] Implement circuit breaker logic with exponential backoff & jitter for the X/Twitter task in `api/app/features/early_smoke/circuit_breaker.py`
- [x] T016 [US1] Implement MD5 composite unique hashing and SQLite `INSERT OR IGNORE` deduplication pipeline in `api/app/features/early_smoke/pipeline.py`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Mainstream Media Baseline (Priority: P2)

**Goal**: Monitor Google News RSS feeds and DuckDuckGo search tracking to establish a comparison baseline.

**Independent Test**: Query mock RSS feeds and verify that baseline media mentions are parsed and saved.

### Implementation for User Story 2
- [x] T017 [P] [US2] Implement Google News RSS ingestion scraper task in `api/app/features/early_smoke/rss_worker.py`
- [x] T018 [P] [US2] Implement DuckDuckGo search tracking scraper task in `api/app/features/early_smoke/ddg_worker.py`
- [x] T019 [US2] Integrate media scrapers with database mention extraction in `api/app/features/early_smoke/media_pipeline.py`

**Checkpoint**: User Stories 1 and 2 work and run independently.

---

## Phase 5: User Story 3 - Analytics Dashboard & Weightage Matrix (Priority: P1)

**Goal**: Schedule workers, calculate asymmetric set difference breakouts, run daily data purges, and expose API endpoints to React dashboard visualization.

**Independent Test**: Configure matrix weights, trigger the sliding window purge, run breakout logic, and verify that API and UI render charts correctly.

### Tests for User Story 3
- [x] T020 [P] [US3] Write breakout calculations unit test suite in `api/app/features/early_smoke/tests/test_breakout.py`
- [x] T021 [P] [US3] Write sliding window purge unit test suite in `api/app/features/early_smoke/tests/test_purge.py`

### Implementation for User Story 3
- [x] T022 [US3] Implement the asymmetric set difference processor in `api/app/features/early_smoke/breakout.py`
- [x] T023 [US3] Implement the 24-hour Sliding Window Purge Engine with SQL delete and database `VACUUM` in `api/app/features/early_smoke/purge.py`
- [x] T024 [US3] Implement background job scheduler using `AsyncIOScheduler` in `api/app/features/early_smoke/scheduler.py`
- [x] T025 [US3] Define Pydantic request/response schemas in `api/app/features/early_smoke/schemas.py`
- [x] T026 [US3] Implement FastAPI endpoints (`/watchlist` and `/health`) in `api/app/features/early_smoke/router.py`
- [x] T027 [P] [US3] Write TypeScript interfaces for API payloads in `ui/src/features/early_smoke/types.ts`
- [x] T028 [P] [US3] Implement custom React hooks (`useWatchlist` and `useSystemStatus`) in `ui/src/features/early_smoke/hooks/`
- [x] T029 [P] [US3] Create frontend dashboard component tree (SystemStatusBanner, BreakoutCard, MentionChart, WatchlistDashboard) in `ui/src/features/early_smoke/components/`

**Checkpoint**: The entire system is fully integrated, scheduled, and visualizes breakout indicators.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality control, linting, and final validation

- [x] T030 [P] Format and lint Python code using `uv run ruff format api/` and `uv run ruff check api/`
- [x] T031 Run validation scenarios in quickstart.md and ensure all tests pass
- [x] T032 Verify production frontend bundler build using `npm run build` in `ui/`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Stories (Phases 3, 4, 5)**: All depend on Foundational completion.
  - User Story 1 (P1) and User Story 3 (P1) should be completed in sequence for MVP.
  - User Story 2 (P2) can run in parallel with User Story 3.
- **Polish (Phase 6)**: Depends on all user stories being completed.

### Parallel Opportunities
- All Setup tasks marked `[P]` can run in parallel.
- All Foundational tasks marked `[P]` can run in parallel.
- Scraper tasks `T012`, `T013`, and `T014` can run in parallel.
- Scrapers `T017` and `T018` can run in parallel.
- Frontend components and hooks (`T027`, `T028`, `T029`) can be developed in parallel once schemas (`T025`) are established.

---

## Implementation Strategy

### MVP First (User Story 1 & 3 Core)
1. Complete Setup and Foundational.
2. Implement User Story 1 (Reddit, Chittorgarh, ET Times scrapers + deduplication).
3. Implement core User Story 3 API and Dashboard to visualize the social list (Set B empty).
4. Verify core flow works before implementing Google News/DuckDuckGo baselines (User Story 2).
