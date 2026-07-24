---
applyTo: "**/*.md"
---

# Documentation Instructions

- Keep documentation aligned with implemented behavior.
- Do not describe planned functionality as complete.
- Use `INSTRUCTIONS.md` as the roadmap and Resume Point source of truth.
- Update roadmap checkboxes and the Resume Point according to the workflow defined in `INSTRUCTIONS.md`.
- Do not mark a roadmap step complete before its implementation and required validation are complete.
- Keep status wording accurate for the current implementation, commit, push, review, and merge state.
- Do not alter later roadmap scope unless explicitly instructed.
- Add at most one relevant changelog entry per implementation step unless a correction requires editing the existing entry.
- Place new changelog entries under `[Unreleased]`.
- Include the implementation commit hash in a changelog entry once that commit exists, per `INSTRUCTIONS.md`'s Changelog Rule and `docs/contributing.md`'s Changelog Updates guidance.
- Never invent, predict, or use a placeholder commit hash before the implementation commit exists; add the hash afterward as a focused documentation follow-up commit when the implementation and changelog commit happen together.
- Do not create release headings for unreleased work.
- Preserve historical changelog entries unless correcting a factual error.
- Document security boundaries precisely.
- Distinguish browser, Next.js server, and FastAPI responsibilities clearly.
- State explicitly when a generated client, CI enforcement, authentication, deployment, or other future capability is not yet implemented.
- Do not duplicate detailed roadmap tasks inside GitHub instruction files.
- Avoid stale status language such as "not committed" after a task is being committed.
