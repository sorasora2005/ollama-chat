"""Add is_cancelled column to chat_messages

Revision ID: add_is_cancelled_column
Revises: add_tokens_columns
Create Date: 2025-12-29 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_is_cancelled_column'
down_revision = 'add_tokens_columns'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_cancelled column (only if it doesn't exist)
    try:
        op.add_column('chat_messages', sa.Column('is_cancelled', sa.Integer(), nullable=True, server_default='0'))
    except Exception:
        # Column might already exist, ignore
        pass


def downgrade() -> None:
    op.drop_column('chat_messages', 'is_cancelled')

