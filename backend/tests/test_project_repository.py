from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from app.database.tables import Project
from app.repositories.project import ProjectRepository


async def test_list_returns_projects_from_the_ordered_query() -> None:
    projects = [Project(name="First"), Project(name="Second")]
    scalar_result = Mock()
    scalar_result.all.return_value = projects
    result = Mock()
    result.scalars.return_value = scalar_result
    session = Mock()
    session.execute = AsyncMock(return_value=result)
    repository = ProjectRepository(session)

    returned = await repository.list()

    assert returned == projects
    session.execute.assert_awaited_once()


async def test_get_loads_a_project_by_uuid() -> None:
    project_id = uuid4()
    project = Project(id=project_id, name="Loaded")
    session = Mock()
    session.get = AsyncMock(return_value=project)
    repository = ProjectRepository(session)

    returned = await repository.get(project_id)

    assert returned is project
    session.get.assert_awaited_once_with(Project, project_id)


async def test_get_for_update_loads_a_project_with_a_row_lock() -> None:
    project_id = uuid4()
    project = Project(id=project_id, name="Locked")
    result = Mock()
    result.scalar_one_or_none.return_value = project
    session = Mock()
    session.execute = AsyncMock(return_value=result)
    repository = ProjectRepository(session)

    returned = await repository.get_for_update(project_id)

    assert returned is project
    statement = session.execute.await_args.args[0]
    assert statement._for_update_arg is not None
    assert str(statement.whereclause) == "projects.id = :id_1"
    result.scalar_one_or_none.assert_called_once_with()


async def test_create_adds_and_flushes_the_project() -> None:
    project = Project(name="Created")
    session = Mock()
    session.flush = AsyncMock()
    repository = ProjectRepository(session)

    returned = await repository.create(project)

    assert returned is project
    session.add.assert_called_once_with(project)
    session.flush.assert_awaited_once_with()


async def test_update_flushes_without_adding_a_second_object() -> None:
    project = Project(name="Updated")
    session = Mock()
    session.flush = AsyncMock()
    repository = ProjectRepository(session)

    returned = await repository.update(project)

    assert returned is project
    session.add.assert_not_called()
    session.flush.assert_awaited_once_with()


async def test_archive_persists_the_service_transition_with_a_flush() -> None:
    project = Project(name="Archived", status="archived")
    session = Mock()
    session.flush = AsyncMock()
    repository = ProjectRepository(session)

    returned = await repository.archive(project)

    assert returned is project
    assert project.status == "archived"
    session.flush.assert_awaited_once_with()


async def test_commit_and_refresh_delegate_to_the_session() -> None:
    project = Project(name="Committed")
    session = Mock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    repository = ProjectRepository(session)

    await repository.commit()
    await repository.refresh(project)

    session.commit.assert_awaited_once_with()
    session.refresh.assert_awaited_once_with(project)
