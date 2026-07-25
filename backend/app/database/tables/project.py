from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Date, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PostgresUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

STATUS_ALLOWED_VALUES = ("planned", "active", "completed", "archived")
STATUS_DEFAULT = "planned"


class Project(Base):
    """The first domain table: a minimal, single-tenant Project record.

    `status` is a bounded `String` column with a named `CHECK` constraint
    rather than a PostgreSQL enum, matching `docs/database-standards.md`'s
    guidance to prefer a string+CHECK column for values expected to evolve
    (a future allowed status requires only a new migration adding it to the
    constraint, not an `ALTER TYPE ... ADD VALUE` enum migration).
    """

    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            f"status IN {STATUS_ALLOWED_VALUES}",
            name="ck_projects_status_allowed",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        PostgresUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default=STATUS_DEFAULT,
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    # `onupdate` only fires for updates issued through this SQLAlchemy model
    # (an UPDATE it builds itself) — it is not a database trigger, so a raw
    # external SQL UPDATE against this table will not refresh `updated_at`.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
