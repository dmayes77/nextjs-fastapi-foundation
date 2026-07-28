from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.database.tables import Project
from app.schemas.project import (
    ProjectCreate,
    ProjectResponse,
    ProjectStatus,
    ProjectUpdate,
)


def test_project_create_accepts_valid_values_and_normalizes_name() -> None:
    data = ProjectCreate(
        name="  Launch foundation  ",
        description="First public release",
        status="active",
        dueDate="2026-08-01",
    )

    assert data.name == "Launch foundation"
    assert data.description == "First public release"
    assert data.status is ProjectStatus.ACTIVE
    assert data.due_date == date(2026, 8, 1)


def test_project_create_defaults_status_to_planned() -> None:
    data = ProjectCreate(name="Plan launch")

    assert data.status is ProjectStatus.PLANNED


def test_project_create_allows_an_omitted_due_date() -> None:
    data = ProjectCreate(name="No deadline")

    assert data.due_date is None


@pytest.mark.parametrize("name", ["", " ", "\t\n"])
def test_project_create_rejects_blank_names(name: str) -> None:
    with pytest.raises(ValidationError, match="must not be blank"):
        ProjectCreate(name=name)


def test_project_create_rejects_an_invalid_status() -> None:
    with pytest.raises(ValidationError):
        ProjectCreate(name="Invalid status", status="blocked")


def test_project_update_distinguishes_omitted_fields_from_explicit_null() -> None:
    omitted = ProjectUpdate()
    cleared = ProjectUpdate(description=None, dueDate=None)

    assert omitted.model_dump(exclude_unset=True) == {}
    assert cleared.model_dump(exclude_unset=True) == {
        "description": None,
        "due_date": None,
    }


@pytest.mark.parametrize("field", ["name", "status"])
def test_project_update_rejects_null_for_required_fields(field: str) -> None:
    with pytest.raises(ValidationError):
        ProjectUpdate.model_validate({field: None})


def test_project_response_reads_sqlalchemy_objects_and_uses_public_aliases() -> None:
    timestamp = datetime(2026, 7, 25, 12, 0, tzinfo=UTC)
    project = Project(
        id=uuid4(),
        name="Response project",
        description=None,
        status="planned",
        due_date=None,
        created_at=timestamp,
        updated_at=timestamp,
    )

    response = ProjectResponse.model_validate(project)

    assert response.model_dump(by_alias=True) == {
        "id": project.id,
        "name": "Response project",
        "description": None,
        "status": ProjectStatus.PLANNED,
        "dueDate": None,
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
