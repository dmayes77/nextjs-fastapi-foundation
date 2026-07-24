"""Pure Alembic script-graph tests: inspects the revision graph on disk,
never opens a database connection (real-database migration behavior is
covered separately in tests/integration/test_project_database.py)."""

import os

from alembic.config import Config
from alembic.script import ScriptDirectory

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_REVISION = "211caf2bc442"


def _script_directory() -> ScriptDirectory:
    config = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    return ScriptDirectory.from_config(config)


def test_there_is_exactly_one_alembic_head() -> None:
    script = _script_directory()

    assert len(script.get_heads()) == 1


def test_the_projects_migration_has_the_baseline_as_its_parent() -> None:
    script = _script_directory()
    (head,) = script.get_heads()
    head_revision = script.get_revision(head)

    assert head_revision.down_revision == BASELINE_REVISION
