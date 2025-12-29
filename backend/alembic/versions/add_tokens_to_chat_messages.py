"""Add tokens columns to chat_messages

Revision ID: add_tokens_columns
Revises: add_feedback_table
Create Date: 2025-12-29 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_tokens_columns'
down_revision = 'add_feedback_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add token columns (only if they don't exist)
    try:
        op.add_column('chat_messages', sa.Column('prompt_tokens', sa.Integer(), nullable=True))
    except Exception:
        # Column might already exist, ignore
        pass
    
    try:
        op.add_column('chat_messages', sa.Column('completion_tokens', sa.Integer(), nullable=True))
    except Exception:
        # Column might already exist, ignore
        pass
    
    # Add index to model column if it doesn't exist
    # Check if index exists first
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    indexes = [idx['name'] for idx in inspector.get_indexes('chat_messages')]
    
    if 'ix_chat_messages_model' not in indexes:
        try:
            op.create_index('ix_chat_messages_model', 'chat_messages', ['model'], unique=False)
        except Exception:
            # Index creation failed, ignore
            pass


def downgrade() -> None:
    op.drop_index('ix_chat_messages_model', table_name='chat_messages')
    op.drop_column('chat_messages', 'completion_tokens')
    op.drop_column('chat_messages', 'prompt_tokens')

