# Implementation Plan: Early Smoke Reconnaissance Engine

**Branch**: `001-early-smoke` | **Date**: 2026-06-25 | **Spec**: [specs/001-early-smoke/spec.md](file:///Users/amitkumardey/Workspace/Projects/alpha-smoke-recon/specs/001-early-smoke/spec.md)

**Input**: Feature specification from `/specs/001-early-smoke/spec.md`

## Summary

The goal of this feature is to implement the "Early Smoke Reconnaissance Engine" which crawls and parses social media discussions (Reddit, X/Twitter, Chittorgarh, ET Times) and mainstream media (Google News RSS, DuckDuckGo search tracking) to detect early speculative retail asset breakouts. 
Our technical approach will use Scrapy, PRAW, and headless scrapers managed by `APScheduler` in an async FastAPI service. Ingested text is processed using `RapidFuzz` and a token blacklist, and unique items are stored in SQLite using SQLAlchemy ORM. Breakout assets are calculated by computing the set difference `Set_A.difference(Set_B)` (representing assets mentioned in social channels but not in mainstream media). A React dashboard with TypeScript, Vite, and Tailwind CSS will visualize the results.

## Technical Context

**Language/Version**: Python 3.11+, TypeScript, JavaScript

**Primary Dependencies**: FastAPI, SQLAlchemy, APScheduler, PRAW, Scrapy, BeautifulSoup4, RapidFuzz, spaCy, React, Vite, Tailwind CSS

**Storage**: SQLite database (self-contained, serverless, file-based)

**Testing**: pytest, vitest (React Testing Library)

**Target Platform**: Hugging Face Spaces (CPU instance)

**Project Type**: Web application (Vite frontend + FastAPI backend)

**Performance Goals**: Frontend dashboard loads in < 3 seconds; background ingestion loops complete without event-loop blocking; database operations remain fast within standard memory constraints.

**Constraints**: 100% free hosting tier (no paid GenAI or LLM APIs). Sliding window of 7-10 days trailing retention.

**Scale/Scope**: Monitoring specific subreddits, top 20 trending threads on ET Times, and Chittorgarh IPO forums.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Separated workspace cleanly into root-level modules: `api/` and `ui/` -> **PASS**
- Follows strict feature-isolated vertical slice pattern: `api/app/features/early_smoke/` and `ui/src/features/early_smoke/` -> **PASS**
- Backend: Python 3.11+, FastAPI, managed exclusively via `uv` -> **PASS**
- Frontend: React with TypeScript, Vite, Tailwind CSS -> **PASS**
- Persistent Storage: SQLite managed via SQLAlchemy -> **PASS**
- System Core Limits: 100% free-tier, no premium GenAI/LLM API endpoints, sliding temporal window config -> **PASS**

## Project Structure

### Documentation (this feature)

```text
specs/001-early-smoke/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Feature-isolated vertical slice structure (MANDATORY)
api/
└── app/
    └── features/
        └── early_smoke/         # Feature-isolated backend slice
            ├── models.py
            ├── schemas.py
            ├── services.py
            ├── router.py
            └── tests/

ui/
└── src/
    └── features/
        └── early_smoke/         # Feature-isolated frontend slice
            ├── components/
            ├── hooks/
            ├── types.ts
            └── tests/
```

**Structure Decision**: Fully committed to the feature-isolated vertical slice structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations recorded.
