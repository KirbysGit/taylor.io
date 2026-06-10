"""add setup_completed flag to users

Revision ID: 8f2c41d09a7e
Revises: 3370e73b321a
Create Date: 2026-06-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8f2c41d09a7e"
down_revision: Union[str, None] = "3370e73b321a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default keeps SQLite happy adding a NOT NULL column to existing rows.
    # existing users predate onboarding tracking — treat them as already set up so
    # they aren't all bounced into /setup on next login.
    op.add_column(
        "users",
        sa.Column("setup_completed", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # new users start at false (model default handles inserts; reset the server default
    # so the column behaves going forward).
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("setup_completed", server_default=sa.false())


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("setup_completed")
