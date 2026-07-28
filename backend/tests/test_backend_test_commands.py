import json
import re
from dataclasses import dataclass
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
ROOT_PACKAGE_JSON = ROOT_DIR / "package.json"
FRONTEND_PACKAGE_JSON = ROOT_DIR / "frontend/package.json"
CI_WORKFLOW = ROOT_DIR / ".github" / "workflows" / "ci.yml"
E2E_DIR = ROOT_DIR / "e2e"
PLAYWRIGHT_CONFIG = E2E_DIR / "playwright.config.ts"
COMPOUND_COMMAND = re.compile(r"\s*(?:&&|\|\||;)\s*")
ROOT_SCRIPT_REFERENCE = re.compile(r"^pnpm(?:\s+run)?\s+(?P<script>[A-Za-z0-9:_-]+)$")
NON_ALIAS_PNPM_COMMANDS = frozenset({"exec", "install", "playwright:install"})
WORKFLOW_STEP = re.compile(
    r"(?ms)^      - name: (?P<name>[^\n]+)\n"
    r"(?P<body>.*?)(?=^      - name:|\Z)"
)
UNSAFE_CHECK_ALIASES = frozenset(
    {
        "test:backend:integration",
        "test:e2e",
        "db:upgrade",
        "db:downgrade",
        "db:revision",
        "dev",
        "dev:frontend",
        "dev:backend",
    }
)
UNSAFE_CHECK_LEAF_PATTERNS = {
    "Playwright": re.compile(r"\bplaywright\b", re.IGNORECASE),
    "database creation or preparation": re.compile(
        r"\b(?:e2e_database|createdb|create\s+database|"
        r"(?:prepare|setup)\w*[\s_.-]*database|"
        r"database[\s_.-]*(?:prepare|setup)\w*)\b",
        re.IGNORECASE,
    ),
    "Alembic": re.compile(r"\balembic\b", re.IGNORECASE),
    "FastAPI server": re.compile(r"\bfastapi\s+(?:dev|run)\b", re.IGNORECASE),
    "Next.js server": re.compile(r"\bnext\s+(?:dev|start)\b", re.IGNORECASE),
    "Uvicorn server": re.compile(r"\buvicorn\b", re.IGNORECASE),
    "pnpm development server": re.compile(
        r"\bpnpm(?:\s+--dir\s+\S+)?\s+(?:run\s+)?dev(?:\s|$)",
        re.IGNORECASE,
    ),
}


@dataclass(frozen=True)
class CommandGraph:
    aliases: frozenset[str]
    leaves: tuple[str, ...]


def _root_scripts() -> dict[str, str]:
    package = json.loads(ROOT_PACKAGE_JSON.read_text())
    return package["scripts"]


def _frontend_scripts() -> dict[str, str]:
    package = json.loads(FRONTEND_PACKAGE_JSON.read_text())
    return package["scripts"]


def _workflow_steps(workflow: str) -> dict[str, str]:
    steps = {
        match["name"]: match["body"].rstrip()
        for match in WORKFLOW_STEP.finditer(workflow)
    }
    assert steps, "No named GitHub Actions steps were found."
    return steps


def _root_script_reference(
    command: str,
    scripts: dict[str, str],
) -> str | None:
    match = ROOT_SCRIPT_REFERENCE.fullmatch(command)
    if match is None:
        return None

    script = match["script"]
    if script in NON_ALIAS_PNPM_COMMANDS:
        return None
    return script if script in scripts else None


def _expand_command_graph(
    scripts: dict[str, str],
    root: str,
) -> CommandGraph:
    assert root in scripts, f"Root script {root!r} does not exist."
    aliases: set[str] = set()
    leaves: list[str] = []

    def visit(script: str, path: tuple[str, ...]) -> None:
        if script in path:
            cycle_start = path.index(script)
            cycle = (*path[cycle_start:], script)
            raise AssertionError(
                f"Root script command cycle detected: {' -> '.join(cycle)}"
            )

        aliases.add(script)
        next_path = (*path, script)
        commands = (
            command for command in COMPOUND_COMMAND.split(scripts[script]) if command
        )
        for command in commands:
            dependency = _root_script_reference(command, scripts)
            if dependency is None:
                leaves.append(command)
            else:
                visit(dependency, next_path)

    visit(root, ())
    return CommandGraph(aliases=frozenset(aliases), leaves=tuple(leaves))


def _assert_safe_check_graph(graph: CommandGraph) -> None:
    unsafe_aliases = sorted(graph.aliases & UNSAFE_CHECK_ALIASES)
    assert not unsafe_aliases, "pnpm check reaches unsafe root scripts: " + ", ".join(
        unsafe_aliases
    )

    for command in graph.leaves:
        for description, pattern in UNSAFE_CHECK_LEAF_PATTERNS.items():
            assert pattern.search(command) is None, (
                f"pnpm check reaches unsafe {description} command: {command}"
            )


def _assert_has_leaf(graph: CommandGraph, *parts: str) -> None:
    assert any(all(part in command for part in parts) for command in graph.leaves), (
        f"No terminal command contains all required parts {parts!r}. "
        f"Expanded leaves: {graph.leaves!r}"
    )


def test_default_backend_command_excludes_the_integration_directory() -> None:
    assert _root_scripts()["test:backend"] == (
        "cd backend && uv run --group dev pytest --ignore=tests/integration"
    )


def test_integration_command_selects_the_integration_directory() -> None:
    assert _root_scripts()["test:backend:integration"] == (
        "cd backend && uv run --group dev pytest tests/integration"
    )


def test_root_test_command_composes_only_the_unit_suites() -> None:
    graph = _expand_command_graph(_root_scripts(), "test")

    assert "test:backend:integration" not in graph.aliases
    _assert_has_leaf(graph, "pnpm --dir frontend test")
    _assert_has_leaf(graph, "pytest", "--ignore=tests/integration")


def test_root_build_command_composes_frontend_build_and_backend_compile() -> None:
    graph = _expand_command_graph(_root_scripts(), "build")

    _assert_has_leaf(graph, "pnpm --dir frontend build")
    _assert_has_leaf(graph, "python -m compileall", "app tests")


def test_root_check_command_expands_to_only_safe_pre_commit_work() -> None:
    graph = _expand_command_graph(_root_scripts(), "check")
    frontend_scripts = _frontend_scripts()

    _assert_safe_check_graph(graph)
    _assert_has_leaf(graph, "pnpm --dir frontend lint")
    _assert_has_leaf(graph, "ruff check")
    _assert_has_leaf(graph, "ruff format --check")
    _assert_has_leaf(graph, "pnpm --dir frontend test")
    _assert_has_leaf(graph, "pytest", "--ignore=tests/integration")
    _assert_has_leaf(graph, "scripts.export_openapi", "--check")
    _assert_has_leaf(graph, "pnpm --dir frontend api:check")
    _assert_has_leaf(graph, "pnpm --dir frontend build")
    _assert_has_leaf(graph, "python -m compileall", "app tests")

    assert frontend_scripts["lint"] == "eslint"
    assert frontend_scripts["test"] == "jest"
    assert frontend_scripts["api:check"] == "node scripts/check-generated-api.mjs"
    assert frontend_scripts["build"] == "next build"


def test_explicit_database_and_browser_commands_remain_outside_check() -> None:
    scripts = _root_scripts()
    check_graph = _expand_command_graph(scripts, "check")

    assert "test:backend:integration" in scripts
    assert "pytest tests/integration" in scripts["test:backend:integration"]
    assert "test:e2e" in scripts
    assert "scripts.e2e_database prepare" in scripts["test:e2e"]
    assert "playwright test" in scripts["test:e2e"]
    assert {"test:backend:integration", "test:e2e"}.isdisjoint(check_graph.aliases)


def test_root_e2e_command_prepares_the_database_exactly_once() -> None:
    command = _root_scripts()["test:e2e"]

    assert command.count("scripts.e2e_database prepare") == 1
    assert "&&" in command, "test:e2e must run preparation before playwright test"
    prepare_index = command.index("scripts.e2e_database prepare")
    playwright_index = command.index("playwright test")
    assert prepare_index < playwright_index, (
        "database preparation must run before Playwright starts"
    )


def test_playwright_config_no_longer_performs_its_own_preparation() -> None:
    config = PLAYWRIGHT_CONFIG.read_text()

    assert "globalSetup" not in config, (
        "Playwright must not run a second, redundant database preparation; "
        "the root pnpm test:e2e command is the sole preparation owner"
    )
    assert not (E2E_DIR / "global-setup.ts").exists(), (
        "global-setup.ts should be removed once nothing references it"
    )


def test_playwright_config_still_validates_and_tears_down() -> None:
    config = PLAYWRIGHT_CONFIG.read_text()

    # The cheap, non-mutating safety guard remains: it fails closed on an
    # unsafe target before either web server can start, independent of
    # whether preparation already ran.
    assert 'runDatabaseCommand("validate")' in config
    # Cleanup ownership is unchanged: teardown still runs after the suite.
    assert 'globalTeardown: "./global-teardown.ts"' in config


def test_global_teardown_still_owns_cleanup() -> None:
    teardown = (E2E_DIR / "global-teardown.ts").read_text()

    assert 'runDatabaseCommand("cleanup")' in teardown


def test_command_graph_detects_a_direct_cycle() -> None:
    with pytest.raises(
        AssertionError,
        match=r"Root script command cycle detected: a -> a",
    ):
        _expand_command_graph({"a": "pnpm a"}, "a")


def test_command_graph_detects_an_indirect_cycle() -> None:
    scripts = {
        "a": "pnpm run b",
        "b": "pnpm c",
        "c": "pnpm a",
    }

    with pytest.raises(
        AssertionError,
        match=r"Root script command cycle detected: a -> b -> c -> a",
    ):
        _expand_command_graph(scripts, "a")


def test_command_graph_expands_safe_nested_aliases_and_compound_commands() -> None:
    scripts = {
        "check": "pnpm lint && echo checked || true; pnpm run test",
        "lint": "pnpm run lint:backend",
        "lint:backend": "ruff check .",
        "test": "pytest",
    }

    graph = _expand_command_graph(scripts, "check")

    assert graph.aliases == {"check", "lint", "lint:backend", "test"}
    assert graph.leaves == ("ruff check .", "echo checked", "true", "pytest")


def test_command_graph_rejects_an_unsafe_nested_alias() -> None:
    scripts = {
        "check": "pnpm test",
        "test": "pnpm test:e2e",
        "test:e2e": "playwright test",
    }

    graph = _expand_command_graph(scripts, "check")

    with pytest.raises(AssertionError, match=r"test:e2e"):
        _assert_safe_check_graph(graph)


@pytest.mark.parametrize(
    "command",
    [
        "pnpm --dir frontend test",
        "pnpm exec ruff check .",
        "pnpm install",
        "pnpm playwright:install",
    ],
)
def test_command_graph_preserves_non_root_pnpm_commands(command: str) -> None:
    scripts = {
        "check": command,
        "test": "should not run",
        "playwright:install": "should not run",
    }

    graph = _expand_command_graph(scripts, "check")

    assert graph.aliases == {"check"}
    assert graph.leaves == (command,)


def test_ci_uses_the_safe_root_check_and_explicit_database_suites() -> None:
    workflow = CI_WORKFLOW.read_text()
    steps = _workflow_steps(workflow)

    assert "run: pnpm check" in steps["Run safe repository checks"]
    assert "run: pnpm db:upgrade" in steps["Upgrade the integration database"]
    assert (
        "run: pnpm test:backend:integration"
        in steps["Run PostgreSQL integration tests"]
    )
    assert "run: pnpm test:e2e" in steps["Run Playwright end-to-end tests"]
    assert "pytest --ignore=tests/integration" not in workflow


def test_ci_scopes_database_targets_to_the_steps_that_require_them() -> None:
    workflow = CI_WORKFLOW.read_text()
    job_environment = workflow.partition("    steps:")[0]
    steps = _workflow_steps(workflow)
    safe_checks = steps["Run safe repository checks"]
    migration = steps["Upgrade the integration database"]
    integration = steps["Run PostgreSQL integration tests"]
    end_to_end = steps["Run Playwright end-to-end tests"]

    unreachable_url = "postgresql+psycopg://invalid:invalid@127.0.0.1:1/invalid"
    integration_url = (
        "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/next_fastapi_test"
    )
    end_to_end_url = (
        "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/next_fastapi_e2e_test"
    )

    assert "DATABASE_URL:" not in job_environment
    assert "DATABASE_MIGRATION_URL:" not in job_environment
    assert "TEST_DATABASE_URL:" not in job_environment
    assert "PLAYWRIGHT_DATABASE_URL:" not in job_environment

    assert f"DATABASE_URL: {unreachable_url}" in safe_checks
    assert f"DATABASE_MIGRATION_URL: {unreachable_url}" in safe_checks
    assert integration_url not in safe_checks
    assert end_to_end_url not in safe_checks

    assert f"DATABASE_URL: {integration_url}" in migration
    assert f"DATABASE_MIGRATION_URL: {integration_url}" in migration
    assert f"TEST_DATABASE_URL: {integration_url}" in integration
    assert f"PLAYWRIGHT_DATABASE_URL: {end_to_end_url}" in end_to_end


def test_ci_always_preserves_playwright_test_results() -> None:
    artifact_upload = _workflow_steps(CI_WORKFLOW.read_text())[
        "Upload Playwright test results"
    ]

    assert "if: always()" in artifact_upload
    assert (
        "uses: actions/upload-artifact@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0"
    ) in artifact_upload
    assert "name: playwright-test-results" in artifact_upload
    assert "path: e2e/test-results/" in artifact_upload
    assert "if-no-files-found: ignore" in artifact_upload
    assert "retention-days: 7" in artifact_upload
