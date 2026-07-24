---
applyTo: "**/*.md"
---

# Documentation Instructions

- Keep documentation aligned with implemented behavior.
- Do not describe planned functionality as complete.
- Use `INSTRUCTIONS.md` as the roadmap and Resume Point source of truth.
- Keep the active roadmap step unchecked until its pull request is merged.
- Do not alter later roadmap scope unless explicitly instructed.
- Add at most one relevant changelog entry per implementation step unless a correction requires editing the existing entry.
- Place new changelog entries under `[Unreleased]`.
- Do not include commit hashes in changelog entries.
- Do not create release headings for unreleased work.
- Preserve historical changelog entries unless correcting a factual error.
- Document security boundaries precisely.
- Distinguish browser, Next.js server, and FastAPI responsibilities clearly.
- State explicitly when a generated client, CI enforcement, authentication, deployment, or other future capability is not yet implemented.
- Do not duplicate detailed roadmap tasks inside GitHub instruction files.
- Avoid stale status language such as "not committed" after a task is being committed.
