import json
import re
from pathlib import Path

ROOT_PACKAGE_JSON = Path(__file__).resolve().parents[2] / "package.json"
BACKEND_CI_WORKFLOW = (
    Path(__file__).resolve().parents[2] / ".github" / "workflows" / "backend-ci.yml"
)


def _root_scripts() -> dict[str, str]:
    package = json.loads(ROOT_PACKAGE_JSON.read_text())
    return package["scripts"]


def test_default_backend_command_excludes_the_integration_directory() -> None:
    assert _root_scripts()["test:backend"] == (
        "cd backend && uv run --group dev pytest --ignore=tests/integration"
    )


def test_integration_command_selects_the_integration_directory() -> None:
    assert _root_scripts()["test:backend:integration"] == (
        "cd backend && uv run --group dev pytest tests/integration"
    )


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
