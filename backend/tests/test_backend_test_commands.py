import json
from pathlib import Path

ROOT_PACKAGE_JSON = Path(__file__).resolve().parents[2] / "package.json"


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
