"""Add prompt_templates table

Revision ID: add_prompt_templates_table
Revises: add_cloud_api_keys_table
Create Date: 2026-01-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_prompt_templates_table'
down_revision = 'add_cloud_api_keys_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    table_exists = 'prompt_templates' in tables

    if not table_exists:
        # Create prompt_templates table
        op.create_table(
            'prompt_templates',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('prompt_text', sa.Text(), nullable=False),
            sa.Column('categories', sa.JSON(), nullable=True),
            sa.Column('is_favorite', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('is_system_prompt', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('use_count', sa.Integer(), nullable=True, server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )

    # Check if indexes exist before creating them
    indexes = []
    if table_exists:
        indexes = [idx['name'] for idx in inspector.get_indexes('prompt_templates')]

    if 'ix_prompt_templates_user_id' not in indexes:
        try:
            op.create_index(op.f('ix_prompt_templates_user_id'), 'prompt_templates', ['user_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass

    if 'ix_prompt_templates_is_favorite' not in indexes:
        try:
            op.create_index(op.f('ix_prompt_templates_is_favorite'), 'prompt_templates', ['is_favorite'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass

    if 'ix_prompt_templates_created_at' not in indexes:
        try:
            op.create_index(op.f('ix_prompt_templates_created_at'), 'prompt_templates', ['created_at'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass


def downgrade() -> None:
    op.drop_index(op.f('ix_prompt_templates_created_at'), table_name='prompt_templates')
    op.drop_index(op.f('ix_prompt_templates_is_favorite'), table_name='prompt_templates')
    op.drop_index(op.f('ix_prompt_templates_user_id'), table_name='prompt_templates')
    op.drop_table('prompt_templates')
