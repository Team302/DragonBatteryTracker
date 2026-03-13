"""add battery health event fields

Revision ID: 0008
Revises: 0007
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("amp_hours", sa.Numeric(precision=5, scale=2), nullable=True))
    op.add_column("events", sa.Column("watt_hours", sa.Numeric(precision=6, scale=1), nullable=True))
    op.add_column("events", sa.Column("tested_on", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "tested_on")
    op.drop_column("events", "watt_hours")
    op.drop_column("events", "amp_hours")