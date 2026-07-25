"""The deliberate table registry: importing this package registers every
SQLAlchemy table against `Base.metadata`.

Nothing outside this package needs to import a specific table module to
make Alembic aware of it — `backend/migrations/env.py` imports this
package (not just `app.database.base`), so `Base.metadata` is always fully
populated before Alembic reads it, in a fresh process, without depending
on the application having imported a table indirectly through some other
code path.

Add a new table's import here as each one is introduced.
"""

from app.database.tables.project import Project

__all__ = ["Project"]
