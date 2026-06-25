<!--
Sync Impact Report:
- Version change: [CONSTITUTION_VERSION] -> 1.0.0
- List of modified principles:
  - PRINCIPLE_1: Directory Architecture (Vertical Slices)
  - PRINCIPLE_2: Technology Stack Commitments
  - PRINCIPLE_3: System Core Limits
- Added sections:
  - Additional Constraints & Ephemeral Environment Compatibility
  - Development Workflow & Feature Isolation
- Removed sections:
  - None
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
- Follow-up TODOs:
  - None
-->

# smoke-signal-recon Constitution

## Core Principles

### I. Directory Architecture (Vertical Slices)
The workspace MUST be cleanly separated into two root-level modules: `api/` (Backend Engine) and `ui/` (Frontend Dashboard). Both layers MUST follow a strict feature-isolated vertical slice pattern. Features MUST bundle their own models, database schemas, processing tools, endpoints, and display components together. New sources or alternative technical analyzers MUST be dropped in as a parallel folder inside the `features/` directory without mutating global application spaces.
- Backend Folder Scheme: `api/app/features/[feature_name]/` (e.g., `api/app/features/early_smoke/`)
- Frontend Folder Scheme: `ui/src/features/[feature_name]/` (e.g., `ui/src/features/early_smoke/`)

### II. Technology Stack Commitments
The application MUST be built using only the designated technologies:
- **Backend**: Python 3.11+ using the FastAPI web framework. Package management and environment dependencies MUST be handled exclusively via `uv`.
- **Frontend**: React with TypeScript, Vite build toolchain, and Tailwind CSS for styling.
- **Persistent Storage**: SQLite database managed via SQLAlchemy ORM. All storage MUST be serverless and file-based to support execution in ephemeral environments.

### III. System Core Limits
The system MUST adhere to strict operational limits to support low-cost deployment:
- Strictly avoid premium cloud-hosted GenAI or LLM API endpoints to maintain a 100% free hosting tier profile.
- Centralize all configurations in a dedicated configuration file (`config.yaml` or a Pydantic Settings class) to house runtime configurations, including a configurable trailing sliding temporal window (defaulting to a 7-10 day retention band).

## Additional Constraints & Ephemeral Environment Compatibility
- **Ephemeral Storage**: Since Hugging Face Spaces provides ephemeral environments, any local SQLite files MUST be considered volatile. The backend MUST gracefully bootstrap and initialize a clean database structure if the database file is missing or reset.
- **Centralized Configuration**: Hardcoded thresholds, temporal windows, or external environment parameters are prohibited. They MUST be read dynamically from the centralized configuration.

## Development Workflow & Feature Isolation
- **Feature Parallelism**: Features MUST be developed and tested in isolation inside their respective vertical slice directory. No feature should directly modify the codebase of another feature or cross-import internal utilities unless explicitly defined as a shared core service in `api/app/core/` or `ui/src/core/`.
- **Quality Gates**: Linting and formatting checks MUST be run. Python code must be formatted and linted using `uv run ruff`. TypeScript/React code must be checked using standard Vite and TypeScript compilers.

## Governance
- The constitution is the ultimate authority on architecture and technology stack commitments.
- Amendments to the constitution require a version bump: MAJOR for backward-incompatible structural changes, MINOR for new principle additions, and PATCH for refinements or clarifications.
- Compliance audits against these principles MUST be performed before merging feature branches.

**Version**: 1.0.0 | **Ratified**: 2026-06-25 | **Last Amended**: 2026-06-25
