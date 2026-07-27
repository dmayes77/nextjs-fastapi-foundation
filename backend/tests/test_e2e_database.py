import inspect
import os

import pytest
from alembic.config import Config
from sqlalchemy.exc import OperationalError

from scripts import e2e_database
from scripts.database_safety import validate_test_database_url

SAFE_URL = (
    "postgresql+psycopg://postgres:secret@localhost:5432/"
    "next_fastapi_e2e_test"
)


@pytest.mark.parametrize(
    "url",
    [
        SAFE_URL,
        "postgresql+psycopg://postgres:secret@localhost:5432/next_fastapi_test",
    ],
)
def test_safe_database_urls_are_accepted(url: str) -> None:
    assert validate_test_database_url(url) == url


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+psycopg://postgres:secret@localhost:5432/next_fastapi",
        "postgresql+psycopg://postgres:secret@localhost:5432/contest",
        "mysql+pymysql://postgres:secret@localhost:5432/next_fastapi_test",
        "not a database URL",
        "postgresql+psycopg:///next_fastapi_test",
        "postgresql+psycopg://postgres:secret@localhost:notaport/next_test",
        "postgresql+psycopg://postgres:secret@localhost:70000/next_test",
        "postgresql+psycopg://postgres:secret@localhost:5432/next%ZZtest",
        f"{SAFE_URL}?dbname=production",
        f"{SAFE_URL}?database=production",
        f"{SAFE_URL}?service=production",
        f"{SAFE_URL}?servicefile=/tmp/pg_service.conf",
    ],
)
def test_unsafe_or_malformed_database_urls_are_rejected(url: str) -> None:
    with pytest.raises(RuntimeError):
        validate_test_database_url(url)


def _operational_error(sqlstate: str | None) -> OperationalError:
    class DriverError(Exception):
        pass

    original = DriverError("driver details")
    original.sqlstate = sqlstate  # type: ignore[attr-defined]
    return OperationalError("statement", {}, original)


def test_only_invalid_catalog_is_classified_as_a_missing_database() -> None:
    assert e2e_database.is_missing_database_error(_operational_error("3D000"))


def test_psycopg_aggregate_missing_database_is_classified_for_exact_target() -> None:
    error = e2e_database.psycopg.OperationalError(
        'connection failed: FATAL: database "next_fastapi_e2e_test" does not exist\n'
        '- retry: FATAL: database "next_fastapi_e2e_test" does not exist'
    )

    assert e2e_database.is_missing_database_error(
        error,
        "next_fastapi_e2e_test",
    )
    assert not e2e_database.is_missing_database_error(error, "another_test")


@pytest.mark.parametrize("sqlstate", ["28P01", "08001", "42501", None])
def test_other_failures_are_not_classified_as_a_missing_database(
    sqlstate: str | None,
) -> None:
    assert not e2e_database.is_missing_database_error(_operational_error(sqlstate))


def test_non_missing_connection_failure_never_attempts_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created = False

    def fail_connection(database_url: str) -> None:
        raise _operational_error("28P01")

    def track_creation(target) -> None:
        nonlocal created
        created = True

    monkeypatch.setattr(e2e_database, "_connect_to_target", fail_connection)
    monkeypatch.setattr(e2e_database, "_create_target_database", track_creation)

    with pytest.raises(e2e_database.E2EDatabaseError, match="Could not connect"):
        e2e_database.ensure_database_exists(SAFE_URL)
    assert created is False


def test_missing_database_creates_only_the_validated_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created_database = None

    def fail_connection(database_url: str) -> None:
        raise _operational_error("3D000")

    def capture_creation(target) -> None:
        nonlocal created_database
        created_database = target.database

    monkeypatch.setattr(e2e_database, "_connect_to_target", fail_connection)
    monkeypatch.setattr(e2e_database, "_create_target_database", capture_creation)

    e2e_database.ensure_database_exists(SAFE_URL)
    assert created_database == "next_fastapi_e2e_test"


def test_prepare_uses_exact_url_for_runtime_and_migrations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    observed: dict[str, str | None] = {}
    monkeypatch.setattr(e2e_database, "ensure_database_exists", lambda url: None)

    def capture_upgrade(database_url: str) -> None:
        with e2e_database.test_database_environment(database_url):
            observed["runtime"] = os.environ.get("DATABASE_URL")
            observed["migration"] = os.environ.get("DATABASE_MIGRATION_URL")

    monkeypatch.setattr(e2e_database, "_upgrade_to_head", capture_upgrade)
    monkeypatch.setattr(
        e2e_database,
        "_expected_migration_head",
        lambda config: "expected-head",
    )
    monkeypatch.setattr(
        e2e_database,
        "_delete_projects_and_read_revision",
        lambda url: "expected-head",
    )

    e2e_database.prepare(SAFE_URL)
    assert observed == {"runtime": SAFE_URL, "migration": SAFE_URL}


def test_cleanup_uses_only_the_exact_validated_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    targets: list[str] = []
    monkeypatch.setattr(
        e2e_database,
        "_delete_projects_and_read_revision",
        lambda url: targets.append(url),
    )

    e2e_database.cleanup(SAFE_URL)
    assert targets == [SAFE_URL]


def test_unsafe_cleanup_fails_before_database_access(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    accessed = False

    def track_access(url: str):
        nonlocal accessed
        accessed = True

    monkeypatch.setattr(
        e2e_database,
        "_delete_projects_and_read_revision",
        track_access,
    )

    with pytest.raises(RuntimeError):
        e2e_database.cleanup(
            "postgresql+psycopg://postgres:secret@localhost:5432/production"
        )
    assert accessed is False


def test_errors_do_not_expose_credentials(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        e2e_database,
        "_connect_to_target",
        lambda url: (_ for _ in ()).throw(_operational_error("28P01")),
    )

    with pytest.raises(e2e_database.E2EDatabaseError) as exc_info:
        e2e_database.ensure_database_exists(SAFE_URL)
    assert "postgres" not in str(exc_info.value)
    assert "secret" not in str(exc_info.value)


def test_cli_hides_unexpected_exception_details(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        e2e_database,
        "_parse_args",
        lambda: type("Args", (), {"command": "prepare"})(),
    )
    monkeypatch.setattr(
        e2e_database,
        "prepare",
        lambda url: (_ for _ in ()).throw(
            Exception("postgresql://sensitive_user:sensitive_password@host/database")
        ),
    )

    assert e2e_database.main() == 1
    captured = capsys.readouterr()
    assert "sensitive_user" not in captured.err
    assert "sensitive_password" not in captured.err
    assert "postgresql://" not in captured.err


def test_lifecycle_has_no_schema_creation_or_database_destruction() -> None:
    source = inspect.getsource(e2e_database)
    assert "create_all" not in source
    assert "DROP DATABASE" not in source
    assert "command.downgrade" not in source
