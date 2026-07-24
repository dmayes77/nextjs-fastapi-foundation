"""Fixtures for the real-PostgreSQL, real-Alembic integration suite (see
docs/testing-standards.md's "Real database and Alembic integration
tests" category). This suite is separate from the default backend suite
established in Step 13: the default suite must not require PostgreSQL,
so every test here skips cleanly (does not fail the run) when the
dedicated test database is unreachable.

Never targets the development or production database. `TEST_DATABASE_URL`
defaults to a database whose name makes its purpose obvious
(`next_fastapi_test`, per docs/testing-standards.md); a resolved URL whose
database name does not contain "test" is rejected outright, before any
migration command can run against it.
"""

import os
from urllib.parse import urlsplit

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine

from app.core.config import get_settings

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASELINE_REVISION = "211caf2bc442"

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_test",
)


def _looks_like_a_test_database(url: str) -> bool:
    database_name = urlsplit(url).path.lstrip("/")
    return "test" in database_name.lower()


if not _looks_like_a_test_database(TEST_DATABASE_URL):
    raise RuntimeError(
        "Refusing to run PostgreSQL integration tests against a database whose name "
        f"does not contain \"test\": {TEST_DATABASE_URL!r}. Set TEST_DATABASE_URL to a "
        "dedicated test database, e.g. "
        "postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_test."
    )


def alembic_config() -> Config:
    return Config(os.path.join(BACKEND_DIR, "alembic.ini"))


def upgrade_test_database(config: Config, revision: str) -> None:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    get_settings.cache_clear()
    try:
        command.upgrade(config, revision)
    finally:
        get_settings.cache_clear()


def downgrade_test_database(config: Config, revision: str) -> None:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    get_settings.cache_clear()
    try:
        command.downgrade(config, revision)
    finally:
        get_settings.cache_clear()


@pytest.fixture(scope="session", autouse=True)
def _require_reachable_test_database():
    """Connects once per session; skips the whole integration suite
    (rather than failing it) when the dedicated test database is not
    reachable, and otherwise establishes it at the baseline revision as a
    known-clean starting point."""
    try:
        engine = create_engine(TEST_DATABASE_URL)
        with engine.connect():
            pass
        engine.dispose()
    except Exception as exc:
        pytest.skip(f"PostgreSQL test database is not reachable: {exc}")

    config = alembic_config()
    upgrade_test_database(config, BASELINE_REVISION)
    yield
    downgrade_test_database(config, "base")


@pytest.fixture(autouse=True)
def _reset_to_baseline_between_tests():
    """Every test starts and ends at the baseline revision, so no test in
    this module depends on state a previous test left behind."""
    config = alembic_config()
    downgrade_test_database(config, BASELINE_REVISION)
    yield
    downgrade_test_database(config, BASELINE_REVISION)
