import os

import pytest
from alembic import command
from alembic.config import Config

from app.core.config import get_settings
from tests.integration.conftest import (
    _assert_test_database_is_reachable,
    _looks_like_a_test_database,
    _test_database_environment,
    _validate_test_database_url,
    upgrade_test_database,
)

TEST_URL = "postgresql://postgres:postgres@localhost:5432/focused_test_database"
CANONICAL_TEST_URL = (
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
        received_environment["migration_url"] = os.environ.get("DATABASE_MIGRATION_URL")
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
        "database_url": CANONICAL_TEST_URL,
        "migration_url": CANONICAL_TEST_URL,
        "resolved_url": CANONICAL_TEST_URL,
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


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://user:password@localhost:5432/next_fastapi_test",
        "postgresql://user:password@localhost:5432/test?sslmode=require",
        "postgresql+psycopg://user:password@localhost:5432/test_projects",
        "postgresql+psycopg://user:password@localhost:5432/projects_test",
        "postgresql+psycopg://user:password@localhost:5432/next_test_database",
        "postgresql+psycopg://user:password@localhost:5432/"
        "next%5Ffastapi%5Ftest?sslmode=require",
    ],
)
def test_database_safety_guard_accepts_unambiguous_test_names(url: str) -> None:
    assert _looks_like_a_test_database(url) is True
    assert _validate_test_database_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://user:password@localhost:5432/"
        "safe_test?sslmode=require&connect_timeout=5",
        "postgresql://user:password@localhost:5432/"
        "safe_test?application_name=integration_tests",
    ],
)
def test_database_safety_guard_accepts_harmless_query_parameters(url: str) -> None:
    assert _validate_test_database_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://host/safe_test?dbname=production",
        "postgresql://host/safe_test?database=production",
        "postgresql+psycopg://host/safe_test?dbname=another_test",
        "postgresql://host/safe_test?DbNaMe=production",
        "postgresql+psycopg://host/safe_test?db%6Eame=production",
        "postgresql://host/safe_test?database=pro%64uction",
        "postgresql+psycopg://host/safe_test?service=production",
        "postgresql://host/safe_test?service%66ile=%2Ftmp%2Fpg_service.conf",
        "postgresql+psycopg://user:password@localhost:5432/"
        "safe_test?host=production.example.com",
        "postgresql://user:password@localhost:5432/safe_test?HOSTADDR=203.0.113.10",
        "postgresql+psycopg://user:password@localhost:5432/safe_test?po%72t=6432",
    ],
)
def test_database_safety_guard_rejects_database_target_query_overrides(
    url: str,
) -> None:
    with pytest.raises(RuntimeError, match="query parameters are forbidden"):
        _validate_test_database_url(url)


@pytest.mark.parametrize(
    "database_name",
    ["latest", "contest", "attestation", "productiontest"],
)
def test_database_safety_guard_rejects_incidental_substring_matches(
    database_name: str,
) -> None:
    url = (
        "postgresql+psycopg://user:password@localhost:5432/"
        f"{database_name}?sslmode=require"
    )

    assert _looks_like_a_test_database(url) is False
    with pytest.raises(RuntimeError, match="underscore-delimited segment"):
        _validate_test_database_url(url)


def test_database_safety_error_never_exposes_connection_credentials() -> None:
    username = "sensitive_user"
    password = "sensitive_password"
    url = (
        f"postgresql+psycopg://{username}:{password}@database.example.com:5432/"
        "production?sslmode=require"
    )

    with pytest.raises(RuntimeError) as exc_info:
        _validate_test_database_url(url)

    message = str(exc_info.value)
    assert username not in message
    assert password not in message
    assert url not in message


def test_database_target_override_error_never_exposes_connection_details() -> None:
    username = "sensitive_user"
    password = "sensitive_password"
    hostname = "production.database.example.com"
    url = (
        f"postgresql+psycopg://{username}:{password}@{hostname}:5432/"
        "safe_test?dbname=production"
    )

    with pytest.raises(RuntimeError) as exc_info:
        _validate_test_database_url(url)

    message = str(exc_info.value)
    assert username not in message
    assert password not in message
    assert hostname not in message
    assert url not in message


def test_database_target_override_is_rejected_before_engine_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine_created = False

    def track_engine_creation(url: str):
        nonlocal engine_created
        engine_created = True
        raise AssertionError("create_engine must not receive an unsafe URL")

    monkeypatch.setattr(
        "tests.integration.conftest.TEST_DATABASE_URL",
        "postgresql+psycopg://host/safe_test?dbname=production",
    )
    monkeypatch.setattr(
        "tests.integration.conftest.create_engine",
        track_engine_creation,
    )

    with pytest.raises(RuntimeError, match="query parameters are forbidden"):
        _assert_test_database_is_reachable()

    assert engine_created is False


def test_plain_integration_url_is_normalized_before_engine_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    received_urls: list[str] = []

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback) -> None:
            pass

    class Engine:
        disposed = False

        def connect(self) -> Connection:
            return Connection()

        def dispose(self) -> None:
            self.disposed = True

    engine = Engine()

    def capture_engine(url: str) -> Engine:
        received_urls.append(url)
        return engine

    monkeypatch.setattr(
        "tests.integration.conftest.TEST_DATABASE_URL",
        TEST_URL,
    )
    monkeypatch.setattr(
        "tests.integration.conftest.create_engine",
        capture_engine,
    )

    _assert_test_database_is_reachable()

    assert received_urls == [CANONICAL_TEST_URL]
    assert engine.disposed is True


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
