"""Add message_feedbacks table

Revision ID: add_message_feedback_table
Revises: add_is_cancelled_column
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_message_feedback_table'
down_revision = 'add_is_cancelled_column'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()
    
    table_exists = 'message_feedbacks' in tables
    
    if not table_exists:
        # Create message_feedbacks table
        op.create_table(
            'message_feedbacks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('message_id', sa.Integer(), nullable=True),
            sa.Column('model', sa.String(), nullable=True),
            sa.Column('feedback_type', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['message_id'], ['chat_messages.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Check if indexes exist before creating them
    indexes = []
    if table_exists:
        indexes = [idx['name'] for idx in inspector.get_indexes('message_feedbacks')]
    
    if 'ix_message_feedbacks_user_id' not in indexes:
        try:
            op.create_index(op.f('ix_message_feedbacks_user_id'), 'message_feedbacks', ['user_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass
    
    if 'ix_message_feedbacks_message_id' not in indexes:
        try:
            op.create_index(op.f('ix_message_feedbacks_message_id'), 'message_feedbacks', ['message_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass
    
    if 'ix_message_feedbacks_model' not in indexes:
        try:
            op.create_index(op.f('ix_message_feedbacks_model'), 'message_feedbacks', ['model'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass


def downgrade() -> None:
    op.drop_index(op.f('ix_message_feedbacks_model'), table_name='message_feedbacks')
    op.drop_index(op.f('ix_message_feedbacks_message_id'), table_name='message_feedbacks')
    op.drop_index(op.f('ix_message_feedbacks_user_id'), table_name='message_feedbacks')
    op.drop_table('message_feedbacks')

