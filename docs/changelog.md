# Changelog

All notable changes to this project will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added the Next.js App Router frontend foundation with TypeScript, Tailwind CSS, and ESLint (`fe47ff7`).
- Added the FastAPI backend foundation, served with `uv` and exposing OpenAPI documentation (`560829b`).
- Added backend environment configuration using Pydantic Settings, validated at startup and loaded from `.env` with a committed `.env.example` (`a55a9e2`).
- Added structured request logging and request-scoped `X-Request-ID` handling, including start and completion logs with duration and the request ID echoed in every response (`7dbcc4d`).
- Added production-style `GET /health` and `GET /ready` endpoints for application liveness and readiness monitoring, with database readiness deferred until the database layer exists.
- Added centralized application, HTTP, validation, and unexpected-exception handling with a consistent request-ID-aware error envelope.
- Added a domain-neutral async PostgreSQL and SQLAlchemy 2 foundation: a single async engine and session factory, a deterministic constraint naming convention, one database session per request via dependency injection, and a `/ready` database connectivity check that returns `503` through the standard error envelope when the database is unreachable.

### Changed

- Reorganized the FastAPI backend into an `app/` package with a dedicated routes layer and a `pyproject.toml` entrypoint (`d00046a`).
- Replaced the generated Next.js starter markup with the formatted project landing page (`13a16b7`).

### Fixed

- Isolated the default CORS origins list so `Settings` instances do not share mutable state (`839b61c`).
- Fixed Next.js Turbopack workspace-root detection for the duplex repository layout.

### Documentation

- Defined the project development standards covering architecture, coding, API, database, testing, and contribution rules (`7d6668d`).
- Added the project philosophy and updated the implementation roadmap (`9b344b5`).
- Revised the implementation roadmap to match the current build sequence (`6b6f1ab`).
- Added Architecture Decision Records under `docs/adr/` covering the core technology and sequencing decisions (`067231c`).
- Replaced the planned Todo example with a Project Management reference application while keeping the database foundation domain-neutral.
- Clarified that the repository is a complete full-stack foundation with optional authentication, multi-tenancy, billing, storage, and other product-specific extensions.

### Developer Experience

- Added root development commands that start the frontend and backend together with clearly labeled logs (`ae5bc4a`).
- Adopted pnpm for frontend and root package management (`fe47ff7`).
- Included agent guidance files (`frontend/CLAUDE.md`, `frontend/AGENTS.md`) for AI-assisted development (`fe47ff7`).
- Verified that the applications start independently and through the combined root command (`ae5bc4a`).

<!--
When a release is created:

## [0.1.0] - YYYY-MM-DD

Move the appropriate entries from [Unreleased] into the new version section.
Leave [Unreleased] at the top for future changes.
-->
