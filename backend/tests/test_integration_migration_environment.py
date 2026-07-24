import os

import pytest
from alembic import command
from alembic.config import Config

from app.core.config import get_settings
from tests.integration.conftest import (
    _assert_test_database_is_reachable,
    _test_database_environment,
    _validate_test_database_url,
    upgrade_test_database,
)

TEST_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/focused_test_database"
)
PREVIOUS_DATABASE_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/development"
)
PREVIOUS_MIGRATION_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/production"
)


def _set_previous_database_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", PREVIOUS_DATABASE_URL)
    monkeypatch.setenv("DATABASE_MIGRATION_URL", PREVIOUS_MIGRATION_URL)
    get_settings.cache_clear()


def test_alembic_receives_the_validated_test_url_for_both_variables(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set_previous_database_environment(monkeypatch)
    received_environment: dict[str, str | None] = {}

    def capture_upgrade(config: Config, revision: str) -> None:
        received_environment["database_url"] = os.environ.get("DATABASE_URL")
        received_environment["migration_url"] = os.environ.get(
            "DATABASE_MIGRATION_URL"
        )
        settings = get_settings()
        received_environment["resolved_url"] = (
            settings.database_migration_url or settings.database_url
        )

    monkeypatch.setattr(command, "upgrade", capture_upgrade)
    monkeypatch.setattr(
        "tests.integration.conftest.TEST_DATABASE_URL",
        TEST_URL,
    )

    upgrade_test_database(Config(), "head")

    assert received_environment == {
        "database_url": TEST_URL,
        "migration_url": TEST_URL,
        "resolved_url": TEST_URL,
    }


def test_previous_database_environment_is_restored_after_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set_previous_database_environment(monkeypatch)

    with _test_database_environment(TEST_URL):
        pass

    assert os.environ["DATABASE_URL"] == PREVIOUS_DATABASE_URL
    assert os.environ["DATABASE_MIGRATION_URL"] == PREVIOUS_MIGRATION_URL
    settings = get_settings()
    assert settings.database_url == PREVIOUS_DATABASE_URL
    assert settings.database_migration_url == PREVIOUS_MIGRATION_URL


def test_previous_database_environment_is_restored_after_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _set_previous_database_environment(monkeypatch)

    def fail_upgrade(config: Config, revision: str) -> None:
        raise RuntimeError("migration failed")

    monkeypatch.setattr(command, "upgrade", fail_upgrade)
    monkeypatch.setattr(
        "tests.integration.conftest.TEST_DATABASE_URL",
        TEST_URL,
    )

    with pytest.raises(RuntimeError, match="migration failed"):
        upgrade_test_database(Config(), "head")

    assert os.environ["DATABASE_URL"] == PREVIOUS_DATABASE_URL
    assert os.environ["DATABASE_MIGRATION_URL"] == PREVIOUS_MIGRATION_URL
    settings = get_settings()
    assert settings.database_url == PREVIOUS_DATABASE_URL
    assert settings.database_migration_url == PREVIOUS_MIGRATION_URL


def test_database_safety_guard_rejects_a_non_test_database() -> None:
    with pytest.raises(RuntimeError, match='name does not contain "test"'):
        _validate_test_database_url(PREVIOUS_DATABASE_URL)


def test_unreachable_integration_database_fails_instead_of_skipping(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    class UnreachableEngine:
        disposed = False

        def connect(self):
            raise RuntimeError("connection refused")

        def dispose(self) -> None:
            self.disposed = True

    engine = UnreachableEngine()
    monkeypatch.setattr(
        "tests.integration.conftest.create_engine",
        lambda url: engine,
    )

    with pytest.raises(
        pytest.fail.Exception,
        match="PostgreSQL test database is not reachable: connection refused",
    ):
        _assert_test_database_is_reachable()

    assert engine.disposed is True
