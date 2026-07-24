"""Pure SQLAlchemy metadata tests for the Project table: no database
connection is opened, matching the rest of the default backend suite
(see tests/conftest.py)."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import CheckConstraint

from app.database.base import Base
from app.database.tables import Project
from app.database.tables.project import STATUS_ALLOWED_VALUES, STATUS_DEFAULT


def test_importing_the_table_registry_registers_projects() -> None:
    assert "projects" in Base.metadata.tables


def test_projects_table_has_the_expected_columns() -> None:
    columns = Base.metadata.tables["projects"].columns
    assert set(columns.keys()) == {
        "id",
        "name",
        "description",
        "status",
        "due_date",
        "created_at",
        "updated_at",
    }


def test_id_is_a_uuid_primary_key() -> None:
    table = Base.metadata.tables["projects"]
    id_column = table.columns["id"]

    assert id_column.primary_key is True
    assert id_column.nullable is False
    assert id_column.type.python_type is UUID
    assert [column.name for column in table.primary_key.columns] == ["id"]


def test_name_is_required_with_no_application_default() -> None:
    column = Base.metadata.tables["projects"].columns["name"]

    assert column.nullable is False
    assert column.type.length == 255
    assert column.default is None
    assert column.server_default is None


def test_description_is_nullable_text() -> None:
    column = Base.metadata.tables["projects"].columns["description"]

    assert column.nullable is True
    assert column.type.python_type is str


def test_due_date_is_a_nullable_date() -> None:
    column = Base.metadata.tables["projects"].columns["due_date"]

    assert column.nullable is True
    assert column.type.python_type is date


def test_timestamps_are_timezone_aware_and_required() -> None:
    table = Base.metadata.tables["projects"]

    for column_name in ("created_at", "updated_at"):
        column = table.columns[column_name]
        assert column.nullable is False
        assert column.type.python_type is datetime
        assert column.type.timezone is True
        assert column.server_default is not None


def test_updated_at_is_managed_by_sqlalchemy_onupdate_not_a_trigger() -> None:
    column = Base.metadata.tables["projects"].columns["updated_at"]

    assert column.onupdate is not None


def test_created_at_has_no_application_side_onupdate() -> None:
    column = Base.metadata.tables["projects"].columns["created_at"]

    assert column.onupdate is None


def test_status_is_required_with_the_expected_server_default() -> None:
    column = Base.metadata.tables["projects"].columns["status"]

    assert column.nullable is False
    assert column.type.length == 20
    assert STATUS_DEFAULT == "planned"
    assert column.server_default.arg == STATUS_DEFAULT


def test_status_check_constraint_exists_with_the_expected_name_and_values() -> None:
    table = Base.metadata.tables["projects"]
    check_constraints = [
        constraint for constraint in table.constraints if isinstance(constraint, CheckConstraint)
    ]

    assert len(check_constraints) == 1
    constraint = check_constraints[0]
    assert constraint.name == "ck_projects_status_allowed"
    assert str(constraint.sqltext) == f"status IN {STATUS_ALLOWED_VALUES}"


def test_status_allowed_values_are_exactly_the_four_lifecycle_states() -> None:
    assert STATUS_ALLOWED_VALUES == ("planned", "active", "completed", "archived")


def test_projects_defines_no_foreign_keys_or_relationships() -> None:
    table = Base.metadata.tables["projects"]

    assert list(table.foreign_keys) == []


def test_new_project_has_no_id_until_flushed_since_the_default_is_python_side() -> None:
    """`default=uuid4` is a SQLAlchemy Python-side column default: it fires
    when the ORM builds the INSERT (at flush/commit time), never at
    `__init__`. Constructing a `Project()` must not eagerly populate `id`,
    proving the UUID is generated at the correct SQLAlchemy lifecycle
    point rather than by some other mechanism (e.g. a mutable class-level
    default) that would run too early."""
    project = Project(name="Untitled")

    assert project.id is None
