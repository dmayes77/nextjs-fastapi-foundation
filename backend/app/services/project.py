from uuid import UUID

from app.core.exceptions import ConflictError, ResourceNotFoundError
from app.database.tables import Project
from app.repositories.project import ProjectRepository
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
)


class ProjectService:
    """Project workflows and lifecycle policy."""

    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def list_projects(self) -> list[ProjectResponse]:
        projects = await self._repository.list()
        return [ProjectResponse.model_validate(project) for project in projects]

    async def get_project(self, project_id: UUID) -> ProjectResponse:
        project = await self._get_project(project_id)
        return ProjectResponse.model_validate(project)

    async def create_project(self, data: ProjectCreate) -> ProjectResponse:
        if data.status is ProjectStatus.ARCHIVED:
            raise ConflictError(
                code="project_archive_requires_action",
                message="Use the archive action to archive a project.",
            )

        project = Project(
            name=data.name,
            description=data.description,
            status=data.status.value,
            due_date=data.due_date,
        )
        await self._repository.create(project)
        await self._repository.refresh(project)
        response = ProjectResponse.model_validate(project)
        await self._repository.commit()
        return response

    async def update_project(
        self, project_id: UUID, data: ProjectUpdate
    ) -> ProjectResponse:
        project = await self._get_project_for_update(project_id)
        if project.status == ProjectStatus.ARCHIVED.value:
            raise ConflictError(
                code="project_archived",
                message="Archived projects cannot be edited.",
            )

        changes = data.model_dump(exclude_unset=True)
        if changes.get("status") == ProjectStatus.ARCHIVED:
            raise ConflictError(
                code="project_archive_requires_action",
                message="Use the archive action to archive a project.",
            )

        for field, value in changes.items():
            if isinstance(value, ProjectStatus):
                value = value.value
            setattr(project, field, value)

        await self._repository.update(project)
        await self._repository.refresh(project)
        response = ProjectResponse.model_validate(project)
        await self._repository.commit()
        return response

    async def archive_project(self, project_id: UUID) -> ProjectResponse:
        project = await self._get_project_for_update(project_id)
        if project.status == ProjectStatus.ARCHIVED.value:
            raise ConflictError(
                code="project_already_archived",
                message="Project is already archived.",
            )

        project.status = ProjectStatus.ARCHIVED.value
        await self._repository.archive(project)
        await self._repository.refresh(project)
        response = ProjectResponse.model_validate(project)
        await self._repository.commit()
        return response

    async def _get_project(self, project_id: UUID) -> Project:
        project = await self._repository.get(project_id)
        return self._require_project(project)

    async def _get_project_for_update(self, project_id: UUID) -> Project:
        project = await self._repository.get_for_update(project_id)
        return self._require_project(project)

    @staticmethod
    def _require_project(project: Project | None) -> Project:
        if project is None:
            raise ResourceNotFoundError(
                code="project_not_found",
                message="Project not found",
            )
        return project
