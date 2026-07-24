import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi import FastAPI, routing
from fastapi.routing import APIRoute

from app.main import create_app
from scripts.export_openapi import OUTPUT_PATH, build_openapi_json, is_up_to_date

EXPECTED_OPERATION_IDS = {"root_get", "health_get", "ready_get"}

# Methods FastAPI/Starlette add automatically and that a route's own author
# never explicitly declared.
_FRAMEWORK_ADDED_METHODS = {"HEAD", "OPTIONS"}


def _operation_ids(schema: dict) -> list[str]:
    return [
        operation["operationId"]
        for methods in schema["paths"].values()
        for operation in methods.values()
        if "operationId" in operation
    ]


def _api_routes(app: FastAPI) -> list[APIRoute]:
    """Resolves an app's actual `APIRoute` objects.

    `app.routes` cannot be filtered with a plain `isinstance(route,
    APIRoute)` here: this FastAPI version resolves routes registered
    through `include_router()` lazily behind a private `_IncludedRouter`
    wrapper, so `app.routes` never contains flat `APIRoute` instances for
    an app assembled the way `create_app()` assembles this one (nested
    `include_router()` calls). `fastapi.routing.iter_route_contexts()` is
    the same resolution FastAPI's own `get_openapi()` uses internally, so
    it's used here too rather than depending on `app.routes`' shape.
    """
    return [
        route_context.original_route
        for route_context in routing.iter_route_contexts(app.routes)
        if isinstance(route_context.original_route, APIRoute)
    ]


def _declared_methods(route: APIRoute) -> set[str]:
    return set(route.methods or set()) - _FRAMEWORK_ADDED_METHODS


def test_operation_ids_are_explicit_and_unique():
    schema = create_app().openapi()

    operation_ids = _operation_ids(schema)

    assert set(operation_ids) == EXPECTED_OPERATION_IDS
    assert len(operation_ids) == len(set(operation_ids))


def test_every_api_route_declares_exactly_one_http_method() -> None:
    # A single `APIRoute` spanning multiple HTTP methods gets one FastAPI
    # unique ID across all of them, which can silently collide operation
    # IDs between those methods. This repository's convention is one
    # intended HTTP method per `APIRoute` (a separate @router.get/.post/...
    # call each) — checked here against each route object itself, not
    # against how OpenAPI happens to group operations by path. Two
    # *separate* routes are allowed to share a path with different methods
    # (see test_separate_routes_may_share_a_path_with_different_methods);
    # grouping by `schema["paths"]` would incorrectly flag that as a
    # violation, which is the bug this test replaces.
    for route in _api_routes(create_app()):
        methods = _declared_methods(route)
        assert len(methods) == 1, (
            f"{route.path} must declare exactly one HTTP method; found {sorted(methods)}"
        )


def test_separate_routes_may_share_a_path_with_different_methods() -> None:
    # Regression test: a normal REST pair (GET + POST on the same path) is
    # two separate `APIRoute` objects, each with one intended method, even
    # though OpenAPI groups them under one path object with two operations.
    app = FastAPI()

    @app.get("/items")
    async def list_items():
        return []

    @app.post("/items")
    async def create_item():
        return {}

    api_routes = _api_routes(app)
    assert len(api_routes) == 2

    for route in api_routes:
        assert len(_declared_methods(route)) == 1


def test_export_produces_a_valid_openapi_document():
    schema = json.loads(build_openapi_json())

    assert schema["openapi"].startswith("3.")
    assert "/health" in schema["paths"]
    assert schema["paths"]["/health"]["get"]["operationId"] == "health_get"


def test_export_is_deterministic_json_formatting():
    generated = build_openapi_json()

    assert generated.endswith("\n")
    assert not generated.endswith("\n\n")
    # sort_keys=True guarantees "components" (the first top-level key
    # alphabetically) always precedes "paths", independent of route or
    # schema registration order.
    assert generated.index('"components"') < generated.index('"paths"')


def test_repeated_export_produces_identical_output():
    first = build_openapi_json()
    second = build_openapi_json()

    assert first == second


def test_committed_specification_matches_a_fresh_export():
    # Read-only: proves `backend/openapi.json` as committed to the repo is
    # not stale, without ever writing to it.
    committed = OUTPUT_PATH.read_text(encoding="utf-8")

    assert committed == build_openapi_json()


def test_drift_check_succeeds_when_the_file_matches(tmp_path: Path):
    generated = build_openapi_json()
    up_to_date_file = tmp_path / "openapi.json"
    up_to_date_file.write_text(generated, encoding="utf-8")

    assert is_up_to_date(up_to_date_file, generated) is True


def test_drift_check_fails_when_the_file_differs(tmp_path: Path):
    generated = build_openapi_json()
    stale_file = tmp_path / "openapi.json"
    stale_file.write_text('{"stale": true}\n', encoding="utf-8")

    assert is_up_to_date(stale_file, generated) is False


def test_drift_check_fails_when_the_file_is_missing(tmp_path: Path):
    generated = build_openapi_json()
    missing_file = tmp_path / "does-not-exist.json"

    assert is_up_to_date(missing_file, generated) is False


def test_export_check_succeeds_without_database_url(monkeypatch, tmp_path: Path):
    """Regression test for a Codex-flagged portability bug: exporting the
    OpenAPI schema required `DATABASE_URL`, because importing `app.main`
    validates application settings as an import-time side effect
    (transitively, through `app.database.engine`) — even though OpenAPI
    generation needs no database connection at all.

    A fresh subprocess is required to genuinely reproduce this: `app.main`
    is already imported and cached in this test process, so removing
    `DATABASE_URL` here in-process could never re-trigger the import-time
    validation the original bug depended on. The subprocess also runs with
    `cwd` set to an empty temporary directory rather than `backend/`, so a
    developer's local, gitignored `backend/.env` — which would otherwise
    silently supply a real `DATABASE_URL` and mask a regression, exactly as
    it did while manually reproducing this bug — can never paper over a
    real failure here; `app`/`scripts` still resolve via `PYTHONPATH`.
    """
    monkeypatch.delenv("DATABASE_URL", raising=False)
    backend_dir = Path(__file__).resolve().parent.parent

    env = dict(os.environ)
    env.pop("DATABASE_URL", None)
    env["PYTHONPATH"] = str(backend_dir)

    result = subprocess.run(
        [sys.executable, "-m", "scripts.export_openapi", "--check"],
        cwd=tmp_path,
        env=env,
        capture_output=True,
        text=True,
        timeout=30,
    )

    assert result.returncode == 0, result.stdout + result.stderr
    assert "up to date" in result.stdout
