# Repository Instructions

## Source of Truth

- Read `INSTRUCTIONS.md` before planning or modifying the repository.
- Treat the current Resume Point in `INSTRUCTIONS.md` as the active implementation boundary.
- Work on one numbered roadmap step at a time.
- Do not begin a later step unless explicitly instructed.
- Repository instruction files define stable engineering rules. They do not override the roadmap.

## Change Discipline

- Keep changes focused on the requested scope.
- Do not modify unrelated files.
- Do not add dependencies without explicit justification and approval.
- Do not add generated files unless the active roadmap step requires them.
- Do not add authentication, deployment, CI, or domain features ahead of their assigned steps.
- Do not add co-author or authorship trailers.
- Do not amend existing commits unless explicitly instructed.

## Architecture

- Preserve the separation between `frontend/` and `backend/`.
- FastAPI is the source of truth for the backend contract.
- `backend/openapi.json` is the committed deterministic OpenAPI contract.
- Use `pnpm openapi:export` after intentional API-contract changes.
- Use `pnpm openapi:check` to detect contract drift.
- Do not hand-edit `backend/openapi.json`.
- Do not create a generated frontend client until the roadmap assigns that work.

## Security

- Never expose server-only environment variables to browser code.
- Never log secrets, full environment objects, credentials, tokens, or database URLs.
- Preserve safe error normalization at public boundaries.
- Do not forward raw upstream bodies to browser callers.
- Validate caller-controlled URLs, paths, and request identifiers before using them.
- Preserve request-ID correlation across Next.js and FastAPI.

## Validation

- Run the validation commands required by the active roadmap step.
- Backend changes should normally run compile and pytest checks.
- Frontend changes should normally run lint, TypeScript, tests, and production build checks.
- API-contract changes must run `pnpm openapi:check`.
- Do not claim validation passed unless it was actually run.

## Git and Pull Requests

- Use a focused branch for each task.
- Do not commit, push, open a pull request, merge, or delete branches unless explicitly instructed.
- Keep commits focused and use the requested commit message exactly when one is provided.
- Address valid review findings with new focused commits rather than amending reviewed commits.
- Resolve review threads only after the corresponding fix is present on the pull-request branch.
