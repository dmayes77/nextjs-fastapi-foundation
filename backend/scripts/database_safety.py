"""Shared safeguards for databases whose contents are owned by tests."""

import os
import re
from collections.abc import Iterator
from contextlib import contextmanager
from urllib.parse import parse_qsl, unquote, urlsplit

from sqlalchemy.engine import URL, make_url
from sqlalchemy.exc import ArgumentError

from app.core.config import get_settings

CONNECTION_TARGET_QUERY_PARAMETERS = frozenset(
    {
        "database",
        "dbname",
        "host",
        "hostaddr",
        "port",
        "service",
        "servicefile",
    }
)
POSTGRESQL_DRIVERS = frozenset({"postgresql", "postgresql+psycopg"})


def parse_test_database_url(url: str) -> URL:
    """Return a validated PostgreSQL test target without exposing it in errors."""
    if not isinstance(url, str) or re.search(r"%(?![0-9A-Fa-f]{2})", url):
        raise RuntimeError(
            "Refusing to use the test database: the database URL is malformed."
        )
    try:
        query_parameter_names = {
            name.casefold()
            for name, _ in parse_qsl(
                urlsplit(url).query,
                keep_blank_values=True,
                strict_parsing=True,
            )
        }
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            "Refusing to use the test database: the database URL is malformed."
        ) from exc

    if query_parameter_names & CONNECTION_TARGET_QUERY_PARAMETERS:
        raise RuntimeError(
            "Refusing to use the test database: connection-target query parameters "
            "are forbidden."
        )

    try:
        parsed = make_url(url)
    except (ArgumentError, TypeError, ValueError) as exc:
        raise RuntimeError(
            "Refusing to use the test database: the database URL is malformed."
        ) from exc

    try:
        port = parsed.port
    except ValueError as exc:
        raise RuntimeError(
            "Refusing to use the test database: the database URL is malformed."
        ) from exc

    if parsed.drivername not in POSTGRESQL_DRIVERS:
        raise RuntimeError(
            "Refusing to use the test database: a supported PostgreSQL URL is required."
        )
    if not parsed.username or not parsed.host or not parsed.database:
        raise RuntimeError(
            "Refusing to use the test database: the PostgreSQL URL must include a "
            "username, host, and explicit database name."
        )
    if port is not None and not 1 <= port <= 65_535:
        raise RuntimeError(
            "Refusing to use the test database: the database URL is malformed."
        )
    database_name = unquote(parsed.database)
    if "/" in database_name or "test" not in database_name.casefold().split("_"):
        raise RuntimeError(
            "Refusing to use the test database: the database name must contain "
            "'test' as a complete underscore-delimited segment, for example "
            "'test', 'test_projects', or 'next_fastapi_test'."
        )

    return parsed


def looks_like_a_test_database(url: str) -> bool:
    """Report whether the URL has a complete ``test`` database-name segment."""
    try:
        parsed = make_url(url)
    except (ArgumentError, TypeError, ValueError):
        return False
    if not parsed.database:
        return False
    database_name = unquote(parsed.database)
    return "/" not in database_name and "test" in database_name.casefold().split("_")


def validate_test_database_url(url: str) -> str:
    parse_test_database_url(url)
    return url


def normalize_test_database_url(url: str) -> str:
    """Return a validated URL that explicitly selects the installed Psycopg 3 driver."""
    parsed = parse_test_database_url(url)
    if parsed.drivername == "postgresql+psycopg":
        return url
    return parsed.set(drivername="postgresql+psycopg").render_as_string(
        hide_password=False
    )


@contextmanager
def test_database_environment(database_url: str) -> Iterator[None]:
    """Make runtime and Alembic settings use one validated URL, then restore them."""
    canonical_url = normalize_test_database_url(database_url)
    variable_names = ("DATABASE_URL", "DATABASE_MIGRATION_URL")
    previous_values = {name: os.environ.get(name) for name in variable_names}

    try:
        for name in variable_names:
            os.environ[name] = canonical_url

        get_settings.cache_clear()
        settings = get_settings()
        alembic_url = settings.database_migration_url or settings.database_url
        if normalize_test_database_url(alembic_url) != canonical_url:
            raise RuntimeError(
                "Alembic did not resolve the validated test database URL."
            )

        get_settings.cache_clear()
        yield
    finally:
        for name, previous_value in previous_values.items():
            if previous_value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = previous_value
        get_settings.cache_clear()
