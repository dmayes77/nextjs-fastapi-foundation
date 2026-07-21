"""establish baseline

Establishes Alembic's migration history before any domain tables exist.
This revision intentionally makes no schema changes; it exists so that
future migrations (starting with the Project Management vertical slice)
have a single, versioned starting point.

Revision ID: 211caf2bc442
Revises:
Create Date: 2026-07-21 02:20:59.131351

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '211caf2bc442'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
