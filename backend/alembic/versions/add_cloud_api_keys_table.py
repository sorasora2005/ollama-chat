"""Add cloud_api_keys table

Revision ID: add_cloud_api_keys_table
Revises: add_notes_table
Create Date: 2025-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_cloud_api_keys_table'
down_revision = 'add_notes_table'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if table already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()
    
    table_exists = 'cloud_api_keys' in tables
    
    if not table_exists:
        # Create cloud_api_keys table
        op.create_table(
            'cloud_api_keys',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('provider', sa.String(), nullable=True),
            sa.Column('api_key', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
    
    # Check if indexes exist before creating them
    indexes = []
    if table_exists:
        indexes = [idx['name'] for idx in inspector.get_indexes('cloud_api_keys')]
    
    if 'ix_cloud_api_keys_user_id' not in indexes:
        try:
            op.create_index(op.f('ix_cloud_api_keys_user_id'), 'cloud_api_keys', ['user_id'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass
    
    if 'ix_cloud_api_keys_provider' not in indexes:
        try:
            op.create_index(op.f('ix_cloud_api_keys_provider'), 'cloud_api_keys', ['provider'], unique=False)
        except Exception:
            # Index might already exist, ignore
            pass


def downgrade() -> None:
    op.drop_index(op.f('ix_cloud_api_keys_provider'), table_name='cloud_api_keys')
    op.drop_index(op.f('ix_cloud_api_keys_user_id'), table_name='cloud_api_keys')
    op.drop_table('cloud_api_keys')


