"""Add notes table

Revision ID: add_notes_table
Revises: add_message_feedback_table
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_notes_table'
down_revision = 'add_message_feedback_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()
    
    table_exists = 'notes' in tables
    
    if not table_exists:
        # Create notes table
        op.create_table(
            'notes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('session_id', sa.String(), nullable=True),
            sa.Column('title', sa.String(), nullable=True),
            sa.Column('content', sa.Text(), nullable=True),
            sa.Column('model', sa.String(), nullable=True),
            sa.Column('prompt', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Check if indexes exist before creating them
    indexes = []
    if table_exists:
        indexes = [idx['name'] for idx in inspector.get_indexes('notes')]
    
    if 'ix_notes_user_id' not in indexes:
        try:
            op.create_index(op.f('ix_notes_user_id'), 'notes', ['user_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass
    
    if 'ix_notes_session_id' not in indexes:
        try:
            op.create_index(op.f('ix_notes_session_id'), 'notes', ['session_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass
    
    if 'ix_notes_model' not in indexes:
        try:
            op.create_index(op.f('ix_notes_model'), 'notes', ['model'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass


def downgrade() -> None:
    op.drop_index(op.f('ix_notes_model'), table_name='notes')
    op.drop_index(op.f('ix_notes_session_id'), table_name='notes')
    op.drop_index(op.f('ix_notes_user_id'), table_name='notes')
    op.drop_table('notes')

