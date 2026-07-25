"""Real-PostgreSQL, real-Alembic verification of the Project migration:
upgrade/downgrade/re-upgrade behavior, autogeneration parity, and the
UUID-on-flush lifecycle — all against a dedicated test database, never
SQLite (SQLite cannot validate PostgreSQL-specific behavior such as the
native UUID type or the CHECK constraint's exact rendering).
"""

import asyncio
from uuid import UUID

import pytest
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.database.base import Base
from app.database.tables import Project
from app.repositories.project import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
)
from app.services.project import ProjectService
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


class CommitGateProjectRepository(ProjectRepository):
    """Hold a mutation lock immediately before commit for concurrency tests."""

    def __init__(
        self,
        session: AsyncSession,
        commit_reached: asyncio.Event,
        allow_commit: asyncio.Event,
    ) -> None:
        super().__init__(session)
        self._commit_reached = commit_reached
        self._allow_commit = allow_commit

    async def commit(self) -> None:
        self._commit_reached.set()
        await self._allow_commit.wait()
        await super().commit()


async def _wait_until_postgres_reports_blocked(
    session_factory: async_sessionmaker[AsyncSession],
    backend_pid: int,
) -> None:
    async with asyncio.timeout(5):
        while True:
            async with session_factory() as monitor:
                is_blocked = await monitor.scalar(
                    text(
                        "SELECT cardinality(pg_blocking_pids(:backend_pid)) > 0"
                    ),
                    {"backend_pid": backend_pid},
                )
            if is_blocked:
                return
            await asyncio.sleep(0)


@pytest.fixture
def project_schema_at_head() -> None:
    upgrade_test_database(alembic_config(), "head")


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


async def test_project_repository_and_service_persist_the_project_lifecycle(
    project_schema_at_head: None,
) -> None:
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            service = ProjectService(ProjectRepository(session))

            created = await service.create_project(
                ProjectCreate(
                    name="Repository integration",
                    dueDate="2026-08-15",
                )
            )
            listed = await service.list_projects()
            retrieved = await service.get_project(created.id)
            updated = await service.update_project(
                created.id,
                ProjectUpdate(description="Persisted", status="active"),
            )
            archived = await service.archive_project(created.id)
            restored = await service.restore_project(created.id)

            assert [project.id for project in listed] == [created.id]
            assert retrieved.id == created.id
            assert updated.description == "Persisted"
            assert updated.status is ProjectStatus.ACTIVE
            assert archived.status is ProjectStatus.ARCHIVED
            assert restored.status is ProjectStatus.PLANNED
    finally:
        await engine.dispose()


async def test_repeated_restore_returns_conflict_and_remains_planned(
    project_schema_at_head: None,
) -> None:
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as session:
            service = ProjectService(ProjectRepository(session))
            created = await service.create_project(
                ProjectCreate(name="Repeated restore")
            )
            await service.archive_project(created.id)

            restored = await service.restore_project(created.id)

            assert restored.status is ProjectStatus.PLANNED

            with pytest.raises(ConflictError) as exc_info:
                await service.restore_project(created.id)

            assert exc_info.value.code == "project_not_archived"
            assert exc_info.value.status_code == 409

            persisted = await service.get_project(created.id)
            assert persisted.status is ProjectStatus.PLANNED
    finally:
        await engine.dispose()


async def test_concurrent_archives_serialize_with_one_success_and_one_conflict(
    project_schema_at_head: None,
) -> None:
    engine = create_async_engine(TEST_DATABASE_URL)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    try:
        async with session_factory() as setup_session:
            created = await ProjectService(
                ProjectRepository(setup_session)
            ).create_project(ProjectCreate(name="Concurrent archive"))

        commit_reached = asyncio.Event()
        allow_commit = asyncio.Event()

        async with (
            session_factory() as first_session,
            session_factory() as second_session,
        ):
            first_service = ProjectService(
                CommitGateProjectRepository(
                    first_session,
                    commit_reached,
                    allow_commit,
                )
            )
            second_service = ProjectService(ProjectRepository(second_session))
            second_backend_pid = await second_session.scalar(
                text("SELECT pg_backend_pid()")
            )
            assert second_backend_pid is not None

            first_archive = asyncio.create_task(
                first_service.archive_project(created.id)
            )
            await asyncio.wait_for(commit_reached.wait(), timeout=5)

            second_archive = asyncio.create_task(
                second_service.archive_project(created.id)
            )
            try:
                await _wait_until_postgres_reports_blocked(
                    session_factory,
                    second_backend_pid,
                )
            finally:
                allow_commit.set()

            first_result = await asyncio.wait_for(first_archive, timeout=5)
            assert isinstance(first_result, ProjectResponse)
            assert first_result.status is ProjectStatus.ARCHIVED

            with pytest.raises(ConflictError) as exc_info:
                await asyncio.wait_for(second_archive, timeout=5)
            assert exc_info.value.code == "project_already_archived"
            assert exc_info.value.status_code == 409
    finally:
        await engine.dispose()
