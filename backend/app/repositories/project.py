from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.tables import Project


class ProjectRepository:
    """Persistence operations for Project records, without business policy."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list(self) -> list[Project]:
        # Return newest Projects first. The descending UUID tie-breaker keeps
        # equal timestamps deterministic, and frontend reconciliation adopts
        # this canonical backend order.
        statement = select(Project).order_by(
            Project.created_at.desc(), Project.id.desc()
        )
        result = await self._session.execute(statement)
        return list(result.scalars().all())

    async def get(self, project_id: UUID) -> Project | None:
        return await self._session.get(Project, project_id)

    async def get_for_update(self, project_id: UUID) -> Project | None:
        statement = select(Project).where(Project.id == project_id).with_for_update()
        result = await self._session.execute(statement)
        return result.scalar_one_or_none()

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

    async def restore(self, project: Project) -> Project:
        await self._session.flush()
        return project

    async def commit(self) -> None:
        await self._session.commit()

    async def refresh(self, project: Project) -> None:
        await self._session.refresh(project)
