import json
import re
from dataclasses import dataclass
from pathlib import Path

import pytest

ROOT_PACKAGE_JSON = Path(__file__).resolve().parents[2] / "package.json"
FRONTEND_PACKAGE_JSON = Path(__file__).resolve().parents[2] / "frontend/package.json"
BACKEND_CI_WORKFLOW = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "backend-ci.yml"
)
COMPOUND_COMMAND = re.compile(r"\s*(?:&&|\|\||;)\s*")
ROOT_SCRIPT_REFERENCE = re.compile(r"^pnpm(?:\s+run)?\s+(?P<script>[A-Za-z0-9:_-]+)$")
NON_ALIAS_PNPM_COMMANDS = frozenset({"exec", "install", "playwright:install"})
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


def test_backend_ci_command_excludes_the_integration_directory() -> None:
    workflow = BACKEND_CI_WORKFLOW.read_text()
    step = re.search(
        r"(?ms)^      - name: Run backend tests\n(?P<body>.*?)(?=^      - name:|\Z)",
        workflow,
    )

    assert step is not None
    command = re.search(r"(?m)^        run: (?P<command>.+)$", step["body"])
    assert command is not None
    assert command["command"] == (
        "uv run --group dev pytest --ignore=tests/integration"
    )
