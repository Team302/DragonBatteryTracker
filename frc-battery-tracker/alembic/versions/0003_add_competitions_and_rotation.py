"""add competitions and rotation

Revision ID: 0003
Revises: 0002
Create Date: 2026-03-10 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "competitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("location", sa.String(200), nullable=True),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.add_column("events", sa.Column("competition_id", sa.Integer(), sa.ForeignKey("competitions.id"), nullable=True))
    op.add_column("events", sa.Column("voltage_0a", sa.Numeric(5, 3), nullable=True))
    op.add_column("events", sa.Column("voltage_1a", sa.Numeric(5, 3), nullable=True))
    op.add_column("events", sa.Column("voltage_18a", sa.Numeric(5, 3), nullable=True))

    op.add_column("batteries", sa.Column("rotation_status", sa.String(50), nullable=False, server_default="ready"))
    op.add_column("batteries", sa.Column("rotation_updated_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_events_competition_id", "events", ["competition_id"])
    op.create_index("ix_batteries_rotation_status", "batteries", ["rotation_status"])


def downgrade() -> None:
    op.drop_index("ix_batteries_rotation_status", table_name="batteries")
    op.drop_index("ix_events_competition_id", table_name="events")

    op.drop_column("batteries", "rotation_updated_at")
    op.drop_column("batteries", "rotation_status")

    op.drop_column("events", "voltage_18a")
    op.drop_column("events", "voltage_1a")
    op.drop_column("events", "voltage_0a")
    op.drop_column("events", "competition_id")

    op.drop_table("competitions")
