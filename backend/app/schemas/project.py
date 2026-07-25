from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectStatus(StrEnum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


def _validated_name(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("Project name must not be blank.")
    return stripped


class ProjectCreate(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    status: ProjectStatus = ProjectStatus.PLANNED
    due_date: date | None = Field(default=None, alias="dueDate")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _validated_name(value)


class ProjectUpdate(BaseModel):
    # A non-null type with a default makes the field omittable without
    # advertising or accepting explicit null. `exclude_unset=True` still
    # distinguishes omission from the nullable fields below.
    name: str = Field(default=None, max_length=255)  # type: ignore[assignment]
    description: str | None = None
    status: ProjectStatus = None  # type: ignore[assignment]
    due_date: date | None = Field(default=None, alias="dueDate")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return _validated_name(value)


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    status: ProjectStatus
    due_date: date | None = Field(alias="dueDate")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
