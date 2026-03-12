"""add beak status and charge percent to events

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("events", sa.Column("beak_status", sa.String(length=20), nullable=True))
    op.add_column("events", sa.Column("charge_percent", sa.Numeric(5, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "charge_percent")
    op.drop_column("events", "beak_status")
