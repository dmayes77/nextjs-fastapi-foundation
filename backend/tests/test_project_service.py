from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, Mock
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.database.tables import Project
from app.schemas.project import ProjectCreate, ProjectStatus, ProjectUpdate
from app.services.project import ProjectService

TIMESTAMP = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)


def project_record(
    *,
    project_id: UUID | None = None,
    name: str = "Existing project",
    description: str | None = "Description",
    status: str = "planned",
    due_date: date | None = date(2026, 8, 1),
) -> Project:
    return Project(
        id=project_id or uuid4(),
        name=name,
        description=description,
        status=status,
        due_date=due_date,
        created_at=TIMESTAMP,
        updated_at=TIMESTAMP,
    )


def repository_mock() -> Mock:
    repository = Mock()
    repository.list = AsyncMock()
    repository.get = AsyncMock()
    repository.get_for_update = AsyncMock()
    repository.create = AsyncMock()
    repository.update = AsyncMock()
    repository.archive = AsyncMock()
    repository.commit = AsyncMock()
    repository.refresh = AsyncMock()
    return repository


async def test_create_applies_defaults_and_commits_the_repository_work() -> None:
    repository = repository_mock()
    calls: list[str] = []

    async def assign_database_values(project: Project) -> None:
        calls.append("refresh")
        project.id = uuid4()
        project.created_at = TIMESTAMP
        project.updated_at = TIMESTAMP

    repository.create.side_effect = lambda _project: calls.append("create")
    repository.refresh.side_effect = assign_database_values
    repository.commit.side_effect = lambda: calls.append("commit")
    service = ProjectService(repository)

    response = await service.create_project(ProjectCreate(name="  New project  "))

    created = repository.create.await_args.args[0]
    assert created.name == "New project"
    assert created.status == "planned"
    assert created.due_date is None
    assert response.status is ProjectStatus.PLANNED
    repository.commit.assert_awaited_once_with()
    repository.refresh.assert_awaited_once_with(created)
    assert calls == ["create", "refresh", "commit"]


async def test_create_accepts_a_non_archived_status() -> None:
    repository = repository_mock()

    async def assign_database_values(project: Project) -> None:
        project.id = uuid4()
        project.created_at = TIMESTAMP
        project.updated_at = TIMESTAMP

    repository.refresh.side_effect = assign_database_values
    service = ProjectService(repository)

    response = await service.create_project(
        ProjectCreate(name="Active project", status="active")
    )

    created = repository.create.await_args.args[0]
    assert created.status == "active"
    assert response.status is ProjectStatus.ACTIVE
    repository.commit.assert_awaited_once_with()


async def test_create_rejects_archived_status_and_does_not_persist() -> None:
    repository = repository_mock()
    service = ProjectService(repository)

    with pytest.raises(ConflictError) as exc_info:
        await service.create_project(
            ProjectCreate(name="Already archived", status="archived")
        )

    assert exc_info.value.code == "project_archive_requires_action"
    assert exc_info.value.status_code == 409
    repository.create.assert_not_awaited()
    repository.commit.assert_not_awaited()


async def test_update_changes_only_explicitly_provided_fields() -> None:
    project = project_record()
    repository = repository_mock()
    calls: list[str] = []
    repository.get_for_update.side_effect = lambda _project_id: (
        calls.append("get_for_update") or project
    )
    repository.update.side_effect = lambda _project: calls.append("update")
    repository.refresh.side_effect = lambda _project: calls.append("refresh")
    repository.commit.side_effect = lambda: calls.append("commit")
    service = ProjectService(repository)

    response = await service.update_project(
        project.id,
        ProjectUpdate(description=None, dueDate=None, status="active"),
    )

    assert response.name == "Existing project"
    assert response.description is None
    assert response.due_date is None
    assert response.status is ProjectStatus.ACTIVE
    repository.update.assert_awaited_once_with(project)
    repository.commit.assert_awaited_once_with()
    repository.refresh.assert_awaited_once_with(project)
    repository.get_for_update.assert_awaited_once_with(project.id)
    repository.get.assert_not_awaited()
    assert calls == ["get_for_update", "update", "refresh", "commit"]


async def test_missing_project_raises_the_standard_not_found_error() -> None:
    repository = repository_mock()
    repository.get.return_value = None
    service = ProjectService(repository)
    project_id = uuid4()

    with pytest.raises(ResourceNotFoundError) as exc_info:
        await service.get_project(project_id)

    assert exc_info.value.code == "project_not_found"
    assert exc_info.value.status_code == 404
    repository.get.assert_awaited_once_with(project_id)


@pytest.mark.parametrize("operation", ["update", "archive"])
async def test_missing_mutation_target_uses_locked_lookup_and_returns_not_found(
    operation: str,
) -> None:
    repository = repository_mock()
    repository.get_for_update.return_value = None
    service = ProjectService(repository)
    project_id = uuid4()

    with pytest.raises(ResourceNotFoundError) as exc_info:
        if operation == "update":
            await service.update_project(project_id, ProjectUpdate(name="Changed"))
        else:
            await service.archive_project(project_id)

    assert exc_info.value.code == "project_not_found"
    assert exc_info.value.status_code == 404
    repository.get_for_update.assert_awaited_once_with(project_id)
    repository.get.assert_not_awaited()
    repository.commit.assert_not_awaited()


async def test_archived_project_cannot_be_edited() -> None:
    project = project_record(status="archived")
    repository = repository_mock()
    repository.get_for_update.return_value = project
    service = ProjectService(repository)

    with pytest.raises(ConflictError) as exc_info:
        await service.update_project(project.id, ProjectUpdate(name="Changed"))

    assert exc_info.value.code == "project_archived"
    assert exc_info.value.status_code == 409
    repository.update.assert_not_awaited()
    repository.commit.assert_not_awaited()
    repository.get_for_update.assert_awaited_once_with(project.id)


async def test_generic_update_cannot_replace_the_archive_action() -> None:
    project = project_record()
    repository = repository_mock()
    repository.get_for_update.return_value = project
    service = ProjectService(repository)

    with pytest.raises(ConflictError) as exc_info:
        await service.update_project(project.id, ProjectUpdate(status="archived"))

    assert exc_info.value.code == "project_archive_requires_action"
    repository.update.assert_not_awaited()
    repository.commit.assert_not_awaited()


async def test_archive_transitions_a_non_archived_project_and_commits() -> None:
    project = project_record(status="completed")
    repository = repository_mock()
    calls: list[str] = []
    repository.get_for_update.side_effect = lambda _project_id: (
        calls.append("get_for_update") or project
    )
    repository.archive.side_effect = lambda _project: calls.append("archive")
    repository.refresh.side_effect = lambda _project: calls.append("refresh")
    repository.commit.side_effect = lambda: calls.append("commit")
    service = ProjectService(repository)

    response = await service.archive_project(project.id)

    assert project.status == "archived"
    assert response.status is ProjectStatus.ARCHIVED
    repository.archive.assert_awaited_once_with(project)
    repository.commit.assert_awaited_once_with()
    repository.refresh.assert_awaited_once_with(project)
    repository.get_for_update.assert_awaited_once_with(project.id)
    repository.get.assert_not_awaited()
    assert calls == ["get_for_update", "archive", "refresh", "commit"]


async def test_archiving_an_already_archived_project_is_a_conflict() -> None:
    project = project_record(status="archived")
    repository = repository_mock()
    repository.get_for_update.return_value = project
    service = ProjectService(repository)

    with pytest.raises(ConflictError) as exc_info:
        await service.archive_project(project.id)

    assert exc_info.value.code == "project_already_archived"
    assert exc_info.value.status_code == 409
    repository.archive.assert_not_awaited()
    repository.commit.assert_not_awaited()
    repository.get_for_update.assert_awaited_once_with(project.id)


@pytest.mark.parametrize("operation", ["create", "update", "archive"])
async def test_refresh_failure_prevents_a_durable_commit(operation: str) -> None:
    repository = repository_mock()
    project = project_record()
    repository.get_for_update.return_value = project
    repository.refresh.side_effect = RuntimeError("refresh failed")
    service = ProjectService(repository)

    with pytest.raises(RuntimeError, match="refresh failed"):
        if operation == "create":
            await service.create_project(ProjectCreate(name="Refresh failure"))
        elif operation == "update":
            await service.update_project(
                project.id,
                ProjectUpdate(description="Changed"),
            )
        else:
            await service.archive_project(project.id)

    repository.refresh.assert_awaited_once()
    repository.commit.assert_not_awaited()


async def test_update_returns_the_response_captured_before_commit() -> None:
    project = project_record(description="Captured before commit")
    repository = repository_mock()
    repository.get_for_update.return_value = project

    async def mutate_after_response_capture() -> None:
        project.description = "Changed during commit"

    repository.commit.side_effect = mutate_after_response_capture
    service = ProjectService(repository)

    response = await service.update_project(
        project.id,
        ProjectUpdate(status="active"),
    )

    assert project.description == "Changed during commit"
    assert response.description == "Captured before commit"
    repository.commit.assert_awaited_once_with()
