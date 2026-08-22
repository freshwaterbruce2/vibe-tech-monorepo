"""Historical baseline marker.

The additive successor revision owns the frozen runtime schema so legacy
unversioned databases can be inspected and upgraded without runtime metadata.

Revision ID: 0731d6d83b4a
Revises:
Create Date: 2026-01-19 12:36:08.113301

Older development builds bootstrapped their database from runtime metadata.
The additive successor revision freezes that historical shape explicitly.
"""
from typing import Sequence, Union



# revision identifiers, used by Alembic.
revision: str = "0731d6d83b4a"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all SQLModel-registered tables on the active connection.

    Safe to run on an empty database. If a table already exists the call
    is a no-op (``checkfirst=True`` is the SQLAlchemy default).
    """
    pass


def downgrade() -> None:
    """Drop all SQLModel-registered tables.

    This is a destructive operation (it drops every table the SQLModel
    metadata knows about). Only intended for teardown in tests / dev.
    """
    pass
