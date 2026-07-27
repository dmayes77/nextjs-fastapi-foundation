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
names are rejected before any migration command can run. Query parameters
that can override the database target are forbidden.
"""

import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine

from scripts.database_safety import (
    looks_like_a_test_database,
    normalize_test_database_url,
    test_database_environment,
    validate_test_database_url,
)

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASELINE_REVISION = "211caf2bc442"
TEST_DATABASE_URL = normalize_test_database_url(
    os.environ.get(
        "TEST_DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/next_fastapi_test",
    )
)


_looks_like_a_test_database = looks_like_a_test_database
_validate_test_database_url = validate_test_database_url
_test_database_environment = test_database_environment


_validate_test_database_url(TEST_DATABASE_URL)


def alembic_config() -> Config:
    return Config(os.path.join(BACKEND_DIR, "alembic.ini"))


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
    validated_url = normalize_test_database_url(TEST_DATABASE_URL)
    engine = None
    try:
        engine = create_engine(validated_url)
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
