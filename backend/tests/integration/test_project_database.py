"""Real-PostgreSQL, real-Alembic verification of the Project migration:
upgrade/downgrade/re-upgrade behavior, autogeneration parity, and the
UUID-on-flush lifecycle — all against a dedicated test database, never
SQLite (SQLite cannot validate PostgreSQL-specific behavior such as the
native UUID type or the CHECK constraint's exact rendering).
"""

from uuid import UUID

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.tables import Project
from tests.integration.conftest import (
    BASELINE_REVISION,
    TEST_DATABASE_URL,
    alembic_config,
    downgrade_test_database,
    reset_test_database_to_baseline,
    upgrade_test_database,
)


def _table_exists(engine) -> bool:
    return inspect(engine).has_table("projects")


def test_upgrade_creates_projects() -> None:
    engine = create_engine(TEST_DATABASE_URL)
    try:
        assert _table_exists(engine) is False

        upgrade_test_database(alembic_config(), "head")

        assert _table_exists(engine) is True
    finally:
        engine.dispose()


def test_downgrade_removes_projects() -> None:
    config = alembic_config()
    engine = create_engine(TEST_DATABASE_URL)
    try:
        upgrade_test_database(config, "head")
        assert _table_exists(engine) is True

        downgrade_test_database(config, BASELINE_REVISION)

        assert _table_exists(engine) is False
    finally:
        engine.dispose()


def test_reupgrade_recreates_projects_after_a_downgrade() -> None:
    config = alembic_config()
    engine = create_engine(TEST_DATABASE_URL)
    try:
        upgrade_test_database(config, "head")
        assert _table_exists(engine) is True

        downgrade_test_database(config, BASELINE_REVISION)
        assert _table_exists(engine) is False

        upgrade_test_database(config, "head")
        assert _table_exists(engine) is True
    finally:
        engine.dispose()


def test_reset_to_baseline_handles_a_database_already_at_head() -> None:
    config = alembic_config()
    engine = create_engine(TEST_DATABASE_URL)
    try:
        upgrade_test_database(config, "head")
        assert _table_exists(engine) is True

        reset_test_database_to_baseline(config)

        assert _table_exists(engine) is False
    finally:
        engine.dispose()


def test_autogenerate_detects_no_drift_after_upgrading_to_head() -> None:
    upgrade_test_database(alembic_config(), "head")

    engine = create_engine(TEST_DATABASE_URL)
    try:
        with engine.connect() as connection:
            migration_context = MigrationContext.configure(connection)
            diff = compare_metadata(migration_context, Base.metadata)
    finally:
        engine.dispose()

    assert diff == []


def test_uuid_is_generated_on_flush_not_on_construction() -> None:
    upgrade_test_database(alembic_config(), "head")

    engine = create_engine(TEST_DATABASE_URL)
    try:
        with Session(engine) as session:
            project = Project(name="Integration Test Project")
            assert project.id is None

            session.add(project)
            session.flush()

            assert isinstance(project.id, UUID)

            session.rollback()
    finally:
        engine.dispose()
