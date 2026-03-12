"""update internal resistance precision for ohms

Revision ID: 0006
Revises: 0005
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "events",
        "internal_resistance",
        existing_type=sa.Numeric(precision=6, scale=2),
        type_=sa.Numeric(precision=7, scale=3),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "events",
        "internal_resistance",
        existing_type=sa.Numeric(precision=7, scale=3),
        type_=sa.Numeric(precision=6, scale=2),
        existing_nullable=True,
    )