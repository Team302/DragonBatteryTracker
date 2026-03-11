"""initial schema

Revision ID: 0001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "batteries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(50), nullable=False, unique=True),
        sa.Column("nfc_uid", sa.String(100), nullable=True, unique=True),
        sa.Column("purchased", sa.DateTime(timezone=True), nullable=True),
        sa.Column("manufacturer", sa.String(100), nullable=True),
        sa.Column("capacity_ah", sa.Numeric(5, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("retired", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("battery_id", sa.Integer(), sa.ForeignKey("batteries.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("voltage", sa.Numeric(5, 3), nullable=True),
        sa.Column("internal_resistance", sa.Numeric(6, 2), nullable=True),
        sa.Column("match_number", sa.Integer(), nullable=True),
        sa.Column("logged_by", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Indexes for common queries
    op.create_index("ix_events_battery_id", "events", ["battery_id"])
    op.create_index("ix_events_event_type", "events", ["event_type"])
    op.create_index("ix_events_created_at", "events", ["created_at"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("batteries")
