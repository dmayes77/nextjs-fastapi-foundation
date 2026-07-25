from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.tables import Project


class ProjectRepository:
    """Persistence operations for Project records, without business policy."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Project]:
        statement = select(Project).order_by(Project.created_at, Project.id)
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def get(self, project_id: UUID) -> Project | None:
        return await self._session.get(Project, project_id)

    async def create(self, project: Project) -> Project:
        self._session.add(project)
        await self._session.flush()
        return project

    async def update(self, project: Project) -> Project:
        await self._session.flush()
        return project

    async def archive(self, project: Project) -> Project:
        await self._session.flush()
        return project

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, project: Project) -> None:
        await self._session.refresh(project)
