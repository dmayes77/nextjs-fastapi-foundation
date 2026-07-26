from datetime import datetime, timezone
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from sqlalchemy.exc import OperationalError

from app.api.dependencies import get_project_service
from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.schemas.project import ProjectResponse, ProjectStatus

TIMESTAMP = datetime(2026, 7, 25, 12, 0, tzinfo=timezone.utc)


def project_response(
    *,
    project_id=None,
    name: str = "Route project",
    status: ProjectStatus = ProjectStatus.PLANNED,
) -> ProjectResponse:
    return ProjectResponse(
        id=project_id or uuid4(),
        name=name,
        description=None,
        status=status,
        dueDate=None,
        createdAt=TIMESTAMP,
        updatedAt=TIMESTAMP,
    )


@pytest.fixture
def project_service(app) -> Mock:
    service = Mock()
    service.list_projects = AsyncMock()
    service.get_project = AsyncMock()
    service.create_project = AsyncMock()
    service.update_project = AsyncMock()
    service.archive_project = AsyncMock()
    service.restore_project = AsyncMock()
    app.dependency_overrides[get_project_service] = lambda: service
    return service


async def test_list_projects_returns_200(app, client, project_service) -> None:
    project = project_response()
    project_service.list_projects.return_value = [project]

    response = await client.get("/api/v1/projects")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": str(project.id),
            "name": "Route project",
            "description": None,
            "status": "planned",
            "dueDate": None,
            "createdAt": "2026-07-25T12:00:00Z",
            "updatedAt": "2026-07-25T12:00:00Z",
        }
    ]
    project_service.list_projects.assert_awaited_once_with()


async def test_list_projects_returns_an_empty_list(
    app, client, project_service
) -> None:
    project_service.list_projects.return_value = []

    response = await client.get("/api/v1/projects")

    assert response.status_code == 200
    assert response.json() == []
    project_service.list_projects.assert_awaited_once_with()


async def test_list_projects_returns_safe_503_when_database_is_unavailable(
    app, client, project_service
) -> None:
    project_service.list_projects.side_effect = OperationalError(
        "SELECT projects.secret FROM projects",
        {},
        ConnectionRefusedError(
            "connection to 127.0.0.1:5432 failed for private-user"
        ),
    )

    response = await client.get(
        "/api/v1/projects",
        headers={"X-Request-ID": "projects-database-test"},
    )

    assert response.status_code == 503
    assert response.json()["error"] == {
        "code": "database_unavailable",
        "message": "The database is temporarily unavailable.",
        "details": None,
        "requestId": "projects-database-test",
    }
    assert response.headers.get("x-request-id") == "projects-database-test"
    assert "projects.secret" not in response.text
    assert "127.0.0.1" not in response.text
    assert "private-user" not in response.text
    project_service.list_projects.assert_awaited_once_with()


async def test_get_project_returns_200(app, client, project_service) -> None:
    project = project_response()
    project_service.get_project.return_value = project

    response = await client.get(f"/api/v1/projects/{project.id}")

    assert response.status_code == 200
    assert response.json()["id"] == str(project.id)
    project_service.get_project.assert_awaited_once_with(project.id)


async def test_create_project_returns_201(app, client, project_service) -> None:
    project = project_response(name="Created project")
    project_service.create_project.return_value = project

    response = await client.post(
        "/api/v1/projects",
        json={"name": "Created project", "dueDate": None},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Created project"
    request = project_service.create_project.await_args.args[0]
    assert request.name == "Created project"
    assert request.status is ProjectStatus.PLANNED


async def test_create_project_rejects_archived_status(
    app, client, project_service
) -> None:
    project_service.create_project.side_effect = ConflictError(
        code="project_archive_requires_action",
        message="Use the archive action to archive a project.",
    )

    response = await client.post(
        "/api/v1/projects",
        json={"name": "Already archived", "status": "archived"},
    )

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == "project_archive_requires_action"
    assert error["requestId"]
    request = project_service.create_project.await_args.args[0]
    assert request.status is ProjectStatus.ARCHIVED


async def test_patch_project_returns_200(app, client, project_service) -> None:
    project = project_response(name="Updated project", status=ProjectStatus.ACTIVE)
    project_service.update_project.return_value = project

    response = await client.patch(
        f"/api/v1/projects/{project.id}",
        json={"name": "Updated project", "status": "active"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "active"
    project_id, request = project_service.update_project.await_args.args
    assert project_id == project.id
    assert request.model_dump(exclude_unset=True) == {
        "name": "Updated project",
        "status": ProjectStatus.ACTIVE,
    }


async def test_archive_project_returns_200(app, client, project_service) -> None:
    project = project_response(status=ProjectStatus.ARCHIVED)
    project_service.archive_project.return_value = project

    response = await client.post(f"/api/v1/projects/{project.id}/archive")

    assert response.status_code == 200
    assert response.json()["status"] == "archived"
    project_service.archive_project.assert_awaited_once_with(project.id)


async def test_restore_project_returns_200(app, client, project_service) -> None:
    project = project_response(status=ProjectStatus.PLANNED)
    project_service.restore_project.return_value = project

    response = await client.post(f"/api/v1/projects/{project.id}/restore")

    assert response.status_code == 200
    assert response.json()["status"] == "planned"
    project_service.restore_project.assert_awaited_once_with(project.id)


async def test_missing_project_uses_the_standard_404_envelope(
    app, client, project_service
) -> None:
    project_service.get_project.side_effect = ResourceNotFoundError(
        code="project_not_found",
        message="Project not found",
    )

    response = await client.get(f"/api/v1/projects/{uuid4()}")

    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "project_not_found"
    assert error["message"] == "Project not found"
    assert error["requestId"]


@pytest.mark.parametrize("operation", ["update", "archive", "restore"])
async def test_invalid_lifecycle_action_uses_the_standard_409_envelope(
    operation, app, client, project_service
) -> None:
    project_id = uuid4()
    error_code = (
        "project_not_archived" if operation == "restore" else "project_archived"
    )
    conflict = ConflictError(
        code=error_code,
        message=(
            "Only archived projects can be restored."
            if operation == "restore"
            else "Archived projects cannot be edited."
        ),
    )
    if operation == "update":
        project_service.update_project.side_effect = conflict
        response = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Changed"},
        )
    elif operation == "archive":
        project_service.archive_project.side_effect = conflict
        response = await client.post(f"/api/v1/projects/{project_id}/archive")
    else:
        project_service.restore_project.side_effect = conflict
        response = await client.post(f"/api/v1/projects/{project_id}/restore")

    assert response.status_code == 409
    error = response.json()["error"]
    assert error["code"] == error_code
    assert error["message"] == conflict.message
    assert error["requestId"]


@pytest.mark.parametrize(
    "body,field",
    [
        ({"name": "   "}, "name"),
        ({"name": "Project", "status": "blocked"}, "status"),
    ],
)
async def test_create_validation_uses_the_standard_error_envelope(
    body, field, app, client, project_service
) -> None:
    response = await client.post("/api/v1/projects", json=body)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["field"] == field
    project_service.create_project.assert_not_awaited()


async def test_malformed_project_uuid_uses_predictable_path_validation(
    app, client, project_service
) -> None:
    response = await client.get("/api/v1/projects/not-a-uuid")

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert error["details"][0]["field"] == "project_id"
    project_service.get_project.assert_not_awaited()
