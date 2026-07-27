import inspect
import os

import pytest
from alembic.config import Config
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

from scripts import e2e_database
from scripts.database_safety import (
    normalize_test_database_url,
    validate_test_database_url,
)

SAFE_URL = (
    "postgresql+psycopg://postgres:secret@localhost:5432/"
    "next_fastapi_e2e_test"
)
PLAIN_URL = (
    "postgresql://postgres:secret@localhost:5432/"
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


def test_plain_postgresql_url_is_normalized_to_psycopg_3() -> None:
    normalized = normalize_test_database_url(PLAIN_URL)
    original = make_url(PLAIN_URL)
    canonical = make_url(normalized)

    assert canonical.drivername == "postgresql+psycopg"
    assert canonical.username == original.username
    assert canonical.password == original.password
    assert canonical.host == original.host
    assert canonical.port == original.port
    assert canonical.database == original.database


def test_explicit_psycopg_3_url_remains_unchanged() -> None:
    assert normalize_test_database_url(SAFE_URL) == SAFE_URL


def test_normalization_preserves_permitted_query_parameters() -> None:
    plain_url = f"{PLAIN_URL}?sslmode=require&application_name=playwright"
    normalized = normalize_test_database_url(plain_url)

    assert make_url(normalized).query == make_url(plain_url).query


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
        f"{SAFE_URL}?host=production.example.com",
        f"{SAFE_URL}?hostaddr=203.0.113.10",
        f"{SAFE_URL}?port=6432",
        f"{SAFE_URL}?service=production",
        f"{SAFE_URL}?servicefile=/tmp/pg_service.conf",
    ],
)
def test_unsafe_or_malformed_database_urls_are_rejected(url: str) -> None:
    with pytest.raises(RuntimeError):
        validate_test_database_url(url)
    with pytest.raises(RuntimeError):
        normalize_test_database_url(url)


def test_normalization_error_never_exposes_credentials() -> None:
    password = "normalization_secret"
    unsafe_url = (
        f"postgresql://sensitive_user:{password}@localhost:5432/production"
        "?sslmode=require"
    )

    with pytest.raises(RuntimeError) as exc_info:
        normalize_test_database_url(unsafe_url)
    assert password not in str(exc_info.value)
    assert unsafe_url not in str(exc_info.value)


def test_server_target_override_error_never_exposes_connection_details() -> None:
    password = "server_override_secret"
    override_host = "production.database.example.com"
    unsafe_url = (
        f"postgresql://sensitive_user:{password}@localhost:5432/safe_test"
        f"?host={override_host}"
    )

    with pytest.raises(RuntimeError) as exc_info:
        normalize_test_database_url(unsafe_url)
    message = str(exc_info.value)
    assert password not in message
    assert override_host not in message
    assert unsafe_url not in message


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


def test_target_connectivity_receives_the_canonical_psycopg_3_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    targets: list[str] = []
    monkeypatch.setattr(
        e2e_database,
        "_connect_to_target",
        lambda url: targets.append(url),
    )

    e2e_database.ensure_database_exists(PLAIN_URL)
    assert targets == [normalize_test_database_url(PLAIN_URL)]


def test_missing_database_creates_only_the_validated_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    created_database = None
    created_driver = None

    def fail_connection(database_url: str) -> None:
        raise _operational_error("3D000")

    def capture_creation(target) -> None:
        nonlocal created_database, created_driver
        created_database = target.database
        created_driver = target.drivername

    monkeypatch.setattr(e2e_database, "_connect_to_target", fail_connection)
    monkeypatch.setattr(e2e_database, "_create_target_database", capture_creation)

    e2e_database.ensure_database_exists(PLAIN_URL)
    assert created_database == "next_fastapi_e2e_test"
    assert created_driver == "postgresql+psycopg"


def test_database_creation_derives_same_server_admin_url_from_canonical_target(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    connection_urls: list[str] = []

    class Cursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback) -> None:
            pass

        def execute(self, statement) -> None:
            pass

    class Connection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback) -> None:
            pass

        def cursor(self) -> Cursor:
            return Cursor()

    def capture_connection(connection_url: str, *, autocommit: bool) -> Connection:
        assert autocommit is True
        connection_urls.append(connection_url)
        return Connection()

    monkeypatch.setattr(e2e_database.psycopg, "connect", capture_connection)
    canonical_target = make_url(f"{SAFE_URL}?sslmode=require")

    e2e_database._create_target_database(canonical_target)

    admin_target = make_url(connection_urls[0])
    assert canonical_target.drivername == "postgresql+psycopg"
    assert admin_target.drivername == "postgresql"
    assert admin_target.username == canonical_target.username
    assert admin_target.password == canonical_target.password
    assert admin_target.host == canonical_target.host
    assert admin_target.port == canonical_target.port
    assert admin_target.database == "postgres"
    assert admin_target.query == canonical_target.query


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

    e2e_database.prepare(PLAIN_URL)
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

    e2e_database.cleanup(PLAIN_URL)
    assert targets == [SAFE_URL]


def test_sqlalchemy_engines_always_receive_the_canonical_psycopg_3_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine_urls: list[str] = []

    class ScalarResult:
        def scalar_one_or_none(self) -> str:
            return "expected-head"

    class Connection:
        def execute(self, statement):
            return ScalarResult()

    class Context:
        def __enter__(self) -> Connection:
            return Connection()

        def __exit__(self, exc_type, exc, traceback) -> None:
            pass

    class Engine:
        def connect(self) -> Context:
            return Context()

        def begin(self) -> Context:
            return Context()

        def dispose(self) -> None:
            pass

    def capture_engine(database_url: str) -> Engine:
        engine_urls.append(database_url)
        return Engine()

    monkeypatch.setattr(e2e_database, "create_engine", capture_engine)

    e2e_database._connect_to_target(PLAIN_URL)
    e2e_database._delete_projects_and_read_revision(PLAIN_URL)

    assert engine_urls == [SAFE_URL, SAFE_URL]
    assert all(make_url(url).drivername == "postgresql+psycopg" for url in engine_urls)


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


def test_server_target_override_fails_before_engine_creation(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    engine_created = False

    def track_engine_creation(url: str):
        nonlocal engine_created
        engine_created = True
        raise AssertionError("create_engine must not receive an unsafe URL")

    monkeypatch.setattr(e2e_database, "create_engine", track_engine_creation)

    with pytest.raises(RuntimeError, match="query parameters are forbidden"):
        e2e_database.cleanup(f"{SAFE_URL}?host=production.example.com")
    assert engine_created is False


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


def test_normalize_command_returns_the_canonical_url_for_the_typescript_bridge(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setattr(
        e2e_database,
        "_parse_args",
        lambda: type("Args", (), {"command": "normalize"})(),
    )
    monkeypatch.setattr(
        e2e_database,
        "get_playwright_database_url",
        lambda: PLAIN_URL,
    )

    assert e2e_database.main() == 0
    captured = capsys.readouterr()
    assert captured.out.strip() == SAFE_URL
    assert captured.err == ""


def test_lifecycle_has_no_schema_creation_or_database_destruction() -> None:
    source = inspect.getsource(e2e_database)
    assert "create_all" not in source
    assert "DROP DATABASE" not in source
    assert "command.downgrade" not in source
