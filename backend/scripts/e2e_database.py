"""Prepare and clean the dedicated Playwright PostgreSQL database."""

import argparse
import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote

import psycopg
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
from psycopg import sql
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from scripts.database_safety import (
    normalize_test_database_url,
    parse_test_database_url,
    test_database_environment,
)

DEFAULT_PLAYWRIGHT_DATABASE_URL = (
    "postgresql+psycopg://postgres:postgres@localhost:5432/"
    "next_fastapi_e2e_test"
)
MISSING_DATABASE_SQLSTATE = "3D000"
BACKEND_DIR = Path(__file__).resolve().parent.parent


class E2EDatabaseError(RuntimeError):
    """A credential-safe database lifecycle failure."""


def get_playwright_database_url() -> str:
    return os.environ.get(
        "PLAYWRIGHT_DATABASE_URL",
        DEFAULT_PLAYWRIGHT_DATABASE_URL,
    )


def is_missing_database_error(
    exc: BaseException,
    database_name: str | None = None,
) -> bool:
    """Recognize only PostgreSQL's invalid-catalog error."""
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if getattr(current, "sqlstate", None) == MISSING_DATABASE_SQLSTATE:
            return True
        if isinstance(current, psycopg.OperationalError):
            # Psycopg aggregates IPv4/IPv6 attempts for hostnames such as
            # ``localhost`` and loses the server SQLSTATE on the wrapper. Accept
            # that wrapper only when every PostgreSQL FATAL response is the exact
            # missing-database response for the validated target.
            fatal_messages = re.findall(r"FATAL:\s+([^\n]+)", str(current))
            expected_message = (
                f'database "{database_name}" does not exist'
                if database_name is not None
                else None
            )
            if fatal_messages and (
                all(message == expected_message for message in fatal_messages)
                if expected_message is not None
                else len(set(fatal_messages)) == 1
                and fatal_messages[0].startswith('database "')
                and fatal_messages[0].endswith('" does not exist')
            ):
                return True
        nested = getattr(current, "orig", None)
        current = (
            nested
            if isinstance(nested, BaseException)
            else current.__cause__ or current.__context__
        )
    return False


def _connect_to_target(database_url: str) -> None:
    canonical_url = normalize_test_database_url(database_url)
    engine = create_engine(canonical_url)
    try:
        with engine.connect():
            pass
    finally:
        engine.dispose()


def _create_target_database(target: URL) -> None:
    admin_url = target.set(drivername="postgresql", database="postgres")
    connection_info = admin_url.render_as_string(hide_password=False)
    database_name = unquote(target.database or "")
    try:
        with psycopg.connect(connection_info, autocommit=True) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name))
                )
    except Exception as exc:
        raise E2EDatabaseError(
            "Could not create the validated Playwright database."
        ) from exc


def ensure_database_exists(database_url: str) -> None:
    canonical_url = normalize_test_database_url(database_url)
    target = parse_test_database_url(canonical_url)
    try:
        _connect_to_target(canonical_url)
    except Exception as exc:
        if not is_missing_database_error(exc, unquote(target.database or "")):
            raise E2EDatabaseError(
                "Could not connect to the validated Playwright database."
            ) from exc
        _create_target_database(target)


def _alembic_config() -> Config:
    return Config(str(BACKEND_DIR / "alembic.ini"))


def _expected_migration_head(config: Config) -> str:
    expected_head = ScriptDirectory.from_config(config).get_current_head()
    if expected_head is None:
        raise E2EDatabaseError("Alembic does not define an expected migration head.")
    return expected_head


def _upgrade_to_head(database_url: str) -> None:
    canonical_url = normalize_test_database_url(database_url)
    config = _alembic_config()
    with test_database_environment(canonical_url):
        command.upgrade(config, "head")


def _delete_projects_and_read_revision(database_url: str) -> str | None:
    canonical_url = normalize_test_database_url(database_url)
    engine = create_engine(canonical_url)
    try:
        with engine.begin() as connection:
            connection.execute(text("DELETE FROM projects"))
            return connection.execute(
                text("SELECT version_num FROM alembic_version")
            ).scalar_one_or_none()
    finally:
        engine.dispose()


def prepare(database_url: str | None = None) -> None:
    target_url = normalize_test_database_url(
        database_url or get_playwright_database_url()
    )
    target = parse_test_database_url(target_url)
    print(f"Validated Playwright database: {unquote(target.database or '')}")
    ensure_database_exists(target_url)
    _upgrade_to_head(target_url)

    expected_head = _expected_migration_head(_alembic_config())
    try:
        actual_head = _delete_projects_and_read_revision(target_url)
    except Exception as exc:
        raise E2EDatabaseError(
            "Could not clean the validated Playwright database after migration."
        ) from exc
    if actual_head != expected_head:
        raise E2EDatabaseError(
            "The validated Playwright database is not at the expected migration head."
        )
    print("Playwright database prepared at the expected migration head.")


def cleanup(database_url: str | None = None) -> None:
    target_url = normalize_test_database_url(
        database_url or get_playwright_database_url()
    )
    target = parse_test_database_url(target_url)
    try:
        _delete_projects_and_read_revision(target_url)
    except Exception as exc:
        raise E2EDatabaseError(
            "Could not clean the validated Playwright database."
        ) from exc
    print(f"Cleaned Playwright database: {unquote(target.database or '')}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("validate", "normalize", "prepare", "cleanup"),
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    try:
        database_url = get_playwright_database_url()
        if args.command == "validate":
            target = parse_test_database_url(database_url)
            print(f"Validated Playwright database: {unquote(target.database or '')}")
        elif args.command == "normalize":
            print(normalize_test_database_url(database_url))
        elif args.command == "prepare":
            prepare(database_url)
        else:
            cleanup(database_url)
    except Exception:
        print(
            "Playwright database lifecycle failed. Check the dedicated test database "
            "configuration.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
