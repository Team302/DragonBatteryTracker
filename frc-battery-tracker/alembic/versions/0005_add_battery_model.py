"""add battery model to batteries

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("batteries", sa.Column("battery_model", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("batteries", "battery_model")
