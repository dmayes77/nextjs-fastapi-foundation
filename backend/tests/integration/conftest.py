"""Fixtures for the real-PostgreSQL, real-Alembic integration suite (see
docs/testing-standards.md's "Real database and Alembic integration
tests" category). This suite is separate from the default backend suite
established in Step 13: the default suite must not require PostgreSQL.
This suite is run explicitly and fails when its dedicated test database
is unreachable so it cannot report false-green migration coverage.

Never targets the development or production database. `TEST_DATABASE_URL`
defaults to a database whose name makes its purpose obvious
(`next_fastapi_test`, per docs/testing-standards.md). The database name
must contain `test` as a complete underscore-delimited segment; all other
names are rejected before any migration command can run.
"""

import os
from collections.abc import Iterator
from contextlib import contextmanager
from urllib.parse import unquote, urlsplit

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
    database_name = unquote(urlsplit(url).path.removeprefix("/"))
    return "test" in database_name.lower().split("_")


def _validate_test_database_url(url: str) -> str:
    if not _looks_like_a_test_database(url):
        raise RuntimeError(
            "Refusing to run PostgreSQL integration tests: the database name must "
            "contain 'test' as a complete underscore-delimited segment, for example "
            "'test', 'test_projects', or 'next_fastapi_test'."
        )
    return url


_validate_test_database_url(TEST_DATABASE_URL)


def alembic_config() -> Config:
    return Config(os.path.join(BACKEND_DIR, "alembic.ini"))


@contextmanager
def _test_database_environment(database_url: str) -> Iterator[None]:
    """Make Alembic use only a validated test URL, then restore the process env."""
    validated_url = _validate_test_database_url(database_url)
    variable_names = ("DATABASE_URL", "DATABASE_MIGRATION_URL")
    previous_values = {name: os.environ.get(name) for name in variable_names}

    try:
        for name in variable_names:
            os.environ[name] = validated_url

        get_settings.cache_clear()
        settings = get_settings()
        alembic_url = settings.database_migration_url or settings.database_url
        _validate_test_database_url(alembic_url)
        if alembic_url != validated_url:
            raise RuntimeError("Alembic did not resolve the validated test database URL.")

        # Ensure the Alembic environment loads settings itself from the overrides.
        get_settings.cache_clear()
        yield
    finally:
        for name, previous_value in previous_values.items():
            if previous_value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = previous_value
        get_settings.cache_clear()


def upgrade_test_database(config: Config, revision: str) -> None:
    with _test_database_environment(TEST_DATABASE_URL):
        command.upgrade(config, revision)


def downgrade_test_database(config: Config, revision: str) -> None:
    with _test_database_environment(TEST_DATABASE_URL):
        command.downgrade(config, revision)


def reset_test_database_to_baseline(config: Config) -> None:
    """Establish the baseline regardless of the database's prior revision."""
    downgrade_test_database(config, "base")
    upgrade_test_database(config, BASELINE_REVISION)


def _assert_test_database_is_reachable() -> None:
    engine = None
    try:
        engine = create_engine(TEST_DATABASE_URL)
        with engine.connect():
            pass
    except Exception as exc:
        pytest.fail(f"PostgreSQL test database is not reachable: {exc}", pytrace=False)
    finally:
        if engine is not None:
            engine.dispose()


@pytest.fixture(scope="session", autouse=True)
def _require_reachable_test_database():
    """Require PostgreSQL, then establish a known-clean baseline revision."""
    _assert_test_database_is_reachable()

    config = alembic_config()
    reset_test_database_to_baseline(config)
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
