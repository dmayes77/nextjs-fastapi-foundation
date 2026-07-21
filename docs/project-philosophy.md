# Project Philosophy

## Purpose

This project is not intended to be another boilerplate.

Its purpose is to become a production-ready reference implementation for building modern full-stack applications with Next.js, FastAPI, PostgreSQL, SQLAlchemy, and Alembic.

The foundation must work immediately after setup. Its core value is reliable, well-documented communication between Next.js, FastAPI, and PostgreSQL — not the breadth of features it includes.

Every architectural decision should favor clarity, maintainability, and long-term usability over adding more features.

The goal is not to build the biggest template.

The goal is to build the cleanest one.

---

# Vision

When a developer decides to build a production SaaS application, this repository should be a trusted starting point.

Not because it contains every possible feature.

Because the important architectural decisions have already been made thoughtfully and documented clearly.

The template should feel predictable, organized, and easy to extend.

The included Project Management feature exists only to demonstrate the architecture end to end; it may be removed or replaced without affecting the foundation.

---

# Core Principles

## 1. Convention Over Configuration

The template should answer common architectural questions before developers need to ask them.

Examples include:

- Where do database models belong?
- Where do services belong?
- How should API routes be organized?
- How are errors returned?
- Where do tests live?
- How are migrations created?
- How are frontend types generated?

A developer should spend time building features instead of inventing project structure.

---

## 2. Production First

Everything included in this repository should be something we would confidently deploy to production.

Examples include:

- SQLAlchemy 2
- Alembic migrations
- Request IDs
- Structured logging
- Health endpoints
- Readiness endpoints
- Environment validation
- OpenAPI documentation
- Generated frontend API client
- Automated testing

Development shortcuts that create long-term technical debt should not become part of the template.

---

## 3. Simplicity Wins

The simplest solution that satisfies today's requirements is usually the correct solution.

Avoid introducing additional layers, abstractions, or dependencies unless they solve a demonstrated problem.

Examples:

- No Turborepo in version one.
- No Docker in version one.
- No Redis until it is needed.
- No authentication or multi-tenancy in version one — these are valid future extensions, not version-one requirements.
- No infrastructure simply because another template includes it.
- No optional product feature forced into every generated project.

Every dependency should justify its existence.

---

## 4. Teach While Building

This repository should help developers learn.

Documentation is considered part of the product.

Major folders should contain small README files explaining:

- What belongs there.
- What does not belong there.
- Why the folder exists.
- When developers should modify its contents.

A developer should be able to understand the project by exploring it naturally.

---

## 5. Documentation Is Part of the Code

Documentation should always reflect the actual implementation.

The README should be written after features have been built and verified.

Every documented command should have been executed successfully.

Every documented workflow should have been tested.

Documentation that cannot be trusted is worse than no documentation.

---

# Architectural Philosophy

The repository is intentionally divided into two independent applications.

Each application foundation is completed independently before integration. The frontend should not be wired to an unfinished backend, and the backend should not be treated as complete only because the API routes exist. Integration should join two stable applications rather than two unfinished halves. This sequencing reduces avoidable refactoring and keeps the final template easier to reason about.

```text
Browser
    ↓
Next.js
    ↓
FastAPI
    ↓
SQLAlchemy
    ↓
PostgreSQL
```

Each layer has one primary responsibility.

## Next.js

Responsible for:

- User interface
- Server rendering
- Client interactions
- Forms
- Displaying API results
- Calling FastAPI

Next.js should never communicate directly with PostgreSQL.

---

## FastAPI

Responsible for:

- API endpoints
- Business rules
- Validation
- Database transactions
- OpenAPI documentation

FastAPI owns the application's business logic.

---

## PostgreSQL

Responsible for:

- Persistent data
- Constraints
- Relationships
- Indexes
- Data integrity

The database should protect important business rules whenever possible.

---

# OpenAPI Is the Contract

FastAPI generates the application's API contract.

The frontend consumes generated TypeScript clients rather than handwritten request definitions.

This eliminates duplicated contracts and keeps the frontend synchronized with backend changes.

Generated files must never be edited manually.

---

# Testing Philosophy

Testing is not added after development.

Testing is part of development.

Every meaningful feature should include appropriate tests.

Different tools exist for different responsibilities:

- Pytest for backend logic
- Jest for frontend utilities
- React Testing Library for components
- Playwright for complete application workflows

End-to-end tests should prove that the entire system works together.

---

# Folder Documentation

Large folders should explain themselves.

Examples include:

```text
backend/
backend/app/database/
frontend/features/
frontend/lib/api/
```

Each folder README should answer:

- What belongs here?
- What should not be placed here?
- Why does this folder exist?

This keeps the repository approachable for both experienced and newer developers.

---

# Quality Standard

Every new feature should satisfy five questions.

## 1. Is it simple?

Avoid unnecessary complexity.

## 2. Is it production ready?

Use patterns appropriate for real deployments.

## 3. Is it documented?

Every important architectural decision should be explained.

## 4. Is it tested?

Behavior should be verified before new work begins.

## 5. Can a junior developer understand it?

The repository should be approachable without requiring extensive prior knowledge.

If any answer is **No**, improve the feature before moving forward.

---

# Decision Making

When considering a new dependency or architectural change, ask:

- Does it solve a real problem?
- Does it simplify development?
- Does it improve maintainability?
- Can it be documented clearly?
- Does it align with the project's philosophy?

If the answer is **No**, it probably does not belong in the template.

---

# Long-Term Goal

This project should become a trusted reference implementation for developers building production-ready applications with Next.js and FastAPI.

The objective is not to include every feature.

The objective is to provide an exceptionally well-designed foundation that developers can confidently build upon for years.
