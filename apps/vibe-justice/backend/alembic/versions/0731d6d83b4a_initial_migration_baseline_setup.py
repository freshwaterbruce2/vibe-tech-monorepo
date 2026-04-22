"""Initial migration - baseline setup

Revision ID: 0731d6d83b4a
Revises:
Create Date: 2026-01-19 12:36:08.113301

This baseline migration is intentionally a snapshot of whatever SQLModel
schema is registered at the time ``alembic upgrade head`` runs. The
application's runtime code historically created tables via
``SQLModel.metadata.create_all()``; this migration delegates to the same
mechanism using the active Alembic connection so the two paths stay in
sync and ``alembic upgrade head`` on an empty database produces the
expected schema.

Future deltas should use proper ``op.create_table`` / ``op.add_column``
calls so migrations remain reversible and auditable.
"""
from typing import Sequence, Union

from alembic import op
from sqlmodel import SQLModel  # noqa: F401 — needed so metadata is populated


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
    bind = op.get_bind()
    SQLModel.metadata.create_all(bind)


def downgrade() -> None:
    """Drop all SQLModel-registered tables.

    This is a destructive operation (it drops every table the SQLModel
    metadata knows about). Only intended for teardown in tests / dev.
    """
    bind = op.get_bind()
    SQLModel.metadata.drop_all(bind)
