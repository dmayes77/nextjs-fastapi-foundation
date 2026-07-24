import json
from pathlib import Path

from app.main import create_app
from scripts.export_openapi import OUTPUT_PATH, build_openapi_json, is_up_to_date

EXPECTED_OPERATION_IDS = {"root_get", "health_get", "ready_get"}


def _operation_ids(schema: dict) -> list[str]:
    return [
        operation["operationId"]
        for methods in schema["paths"].values()
        for operation in methods.values()
        if "operationId" in operation
    ]


def test_operation_ids_are_explicit_and_unique():
    schema = create_app().openapi()

    operation_ids = _operation_ids(schema)

    assert set(operation_ids) == EXPECTED_OPERATION_IDS
    assert len(operation_ids) == len(set(operation_ids))


def test_every_route_declares_exactly_one_http_method():
    # A single `APIRoute` spanning multiple HTTP methods gets one FastAPI
    # unique-ID per route, not per method, which can silently collide
    # operation IDs across methods. This repository's convention is one
    # method per route (a separate @router.get/@router.post/... call each),
    # enforced here against the actual exported schema rather than FastAPI's
    # internal routing objects, which this FastAPI version resolves lazily
    # and doesn't expose as a flat, directly-inspectable list.
    schema = create_app().openapi()

    for path, methods in schema["paths"].items():
        assert len(methods) == 1, f"{path} declares more than one HTTP method: {list(methods)}"


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
