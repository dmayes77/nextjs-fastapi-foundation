from uuid import UUID

from fastapi import APIRouter, status

from app.api.dependencies import ProjectServiceDependency
from app.schemas.errors import ErrorResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])

NOT_FOUND_RESPONSE = {
    status.HTTP_404_NOT_FOUND: {
        "model": ErrorResponse,
        "description": "Project not found",
    }
}
CONFLICT_RESPONSE = {
    status.HTTP_409_CONFLICT: {
        "model": ErrorResponse,
        "description": "Invalid Project lifecycle action",
    }
}
PROJECT_CONFLICT_RESPONSES = {
    **NOT_FOUND_RESPONSE,
    **CONFLICT_RESPONSE,
}


@router.get(
    "",
    summary="List Projects",
    response_model=list[ProjectResponse],
    operation_id="projects_list",
)
async def list_projects(service: ProjectServiceDependency) -> list[ProjectResponse]:
    return await service.list_projects()


@router.get(
    "/{project_id}",
    summary="Get Project",
    response_model=ProjectResponse,
    responses=NOT_FOUND_RESPONSE,
    operation_id="projects_get",
)
async def get_project(
    project_id: UUID, service: ProjectServiceDependency
) -> ProjectResponse:
    return await service.get_project(project_id)


@router.post(
    "",
    summary="Create Project",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    responses=CONFLICT_RESPONSE,
    operation_id="projects_create",
)
async def create_project(
    data: ProjectCreate, service: ProjectServiceDependency
) -> ProjectResponse:
    return await service.create_project(data)


@router.patch(
    "/{project_id}",
    summary="Update Project",
    response_model=ProjectResponse,
    responses=PROJECT_CONFLICT_RESPONSES,
    operation_id="projects_update",
)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    service: ProjectServiceDependency,
) -> ProjectResponse:
    return await service.update_project(project_id, data)


@router.post(
    "/{project_id}/archive",
    summary="Archive Project",
    response_model=ProjectResponse,
    responses=PROJECT_CONFLICT_RESPONSES,
    operation_id="projects_archive",
)
async def archive_project(
    project_id: UUID, service: ProjectServiceDependency
) -> ProjectResponse:
    return await service.archive_project(project_id)
