from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.repositories.project import ProjectRepository
from app.services.project import ProjectService

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


def get_project_repository(session: DatabaseSession) -> ProjectRepository:
    return ProjectRepository(session)


ProjectRepositoryDependency = Annotated[
    ProjectRepository, Depends(get_project_repository)
]


def get_project_service(
    repository: ProjectRepositoryDependency,
) -> ProjectService:
    return ProjectService(repository)


ProjectServiceDependency = Annotated[ProjectService, Depends(get_project_service)]
