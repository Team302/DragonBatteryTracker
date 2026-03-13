"""add battery flags for comp and bad cells

Revision ID: 0007
Revises: 0006
Create Date: 2026-03-12 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("batteries", sa.Column("bad_cells", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("batteries", sa.Column("comp_battery", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.alter_column("batteries", "bad_cells", server_default=None)
    op.alter_column("batteries", "comp_battery", server_default=None)


def downgrade() -> None:
    op.drop_column("batteries", "comp_battery")
    op.drop_column("batteries", "bad_cells")