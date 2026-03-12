"""add robots table

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "robots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("robot_type", sa.String(50), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.add_column(
        "events",
        sa.Column("robot_id", sa.Integer(), sa.ForeignKey("robots.id"), nullable=True),
    )

    op.create_index("ix_events_robot_id", "events", ["robot_id"])


def downgrade() -> None:
    op.drop_index("ix_events_robot_id", table_name="events")
    op.drop_column("events", "robot_id")
    op.drop_table("robots")
