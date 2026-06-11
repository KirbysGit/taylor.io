"""add email send throttling columns to users

Revision ID: b41e7a93c5d2
Revises: 8f2c41d09a7e
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b41e7a93c5d2"
down_revision: Union[str, None] = "8f2c41d09a7e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default='0' keeps SQLite happy adding NOT NULL columns to existing rows.
    op.add_column("users", sa.Column("verification_email_last_sent_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("verification_email_daily_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("verification_email_count_date", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("reset_email_last_sent_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("reset_email_daily_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("reset_email_count_date", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_column("reset_email_count_date")
        batch_op.drop_column("reset_email_daily_count")
        batch_op.drop_column("reset_email_last_sent_at")
        batch_op.drop_column("verification_email_count_date")
        batch_op.drop_column("verification_email_daily_count")
        batch_op.drop_column("verification_email_last_sent_at")
