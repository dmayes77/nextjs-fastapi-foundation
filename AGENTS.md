# Repository Agent Instructions

This file guides AI coding agents (GitHub coding agents, Claude, Codex, and similar) working anywhere in this repository.

- This `AGENTS.md` applies repository-wide.
- Nested `AGENTS.md` files — for example `frontend/AGENTS.md` — add directory-specific guidance; they do not replace this file.
- When instructions conflict, the nearest applicable `AGENTS.md` takes precedence for that specific conflict.
- Non-conflicting repository-wide guidance from this file continues to apply everywhere, including inside directories with their own `AGENTS.md`.

## Source of Truth

- Read `INSTRUCTIONS.md` before planning or making changes. It owns the numbered implementation roadmap and the current Resume Point.
- Work on one roadmap step at a time. Do not begin a later step unless explicitly instructed.
- This file defines stable engineering constraints. It does not replace or duplicate the roadmap.

## Change Discipline

- Keep changes minimal and scoped to what was actually requested.
- Do not implement speculative or future-step functionality ahead of its assigned step.
- Do not add dependencies without explicit justification and approval.

## Architecture

- Preserve the separation between `frontend/` and `backend/` described in `docs/architecture.md`.
- `backend/openapi.json` is the committed, deterministic OpenAPI contract. Regenerate it with `pnpm openapi:export`; verify it with `pnpm openapi:check`. Never hand-edit it.

## Security

- Never expose server-only environment variables or secrets to browser code, logs, or committed files.
- Never forward raw upstream error bodies to public callers; normalize errors at public boundaries instead.

## Validation

- Run the validation commands the active roadmap step requires — backend compile and `pytest` from `backend/`; frontend lint, TypeScript, tests, and a production build for frontend changes.
- Report only validation that was actually run.

## Git

- Keep commits focused; address review findings with a new focused commit rather than amending one already reviewed.
- Never push, merge, rebase, or delete a branch unless explicitly instructed.

## Related Instructions

- `frontend/AGENTS.md` — Next.js-specific guidance scoped to `frontend/`.
- `.github/copilot-instructions.md` and `.github/instructions/*.instructions.md` — GitHub Copilot custom instructions, covering the same engineering constraints for Copilot specifically.
- `docs/contributing.md` — the full contribution workflow.
