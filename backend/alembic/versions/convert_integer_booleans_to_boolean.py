"""Convert integer boolean fields to proper Boolean type

Revision ID: convert_integer_booleans
Revises: add_prompt_templates_table
Create Date: 2026-01-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'convert_integer_booleans'
down_revision = 'add_prompt_templates_table'
branch_labels = None
depends_on = None


def upgrade():
    """Convert Integer(0/1) boolean fields to Boolean type"""

    # Check if we're using PostgreSQL
    connection = op.get_bind()

    # ChatMessage.is_cancelled: Integer -> Boolean
    # Create temp column, migrate data, drop old, rename new
    op.add_column('chat_messages', sa.Column('is_cancelled_new', sa.Boolean(), nullable=True))
    connection.execute(sa.text(
        "UPDATE chat_messages SET is_cancelled_new = CASE WHEN is_cancelled = 1 THEN true ELSE false END"
    ))
    op.drop_column('chat_messages', 'is_cancelled')
    op.alter_column('chat_messages', 'is_cancelled_new', new_column_name='is_cancelled', nullable=False)

    # Note.is_deleted: Integer -> Boolean
    op.add_column('notes', sa.Column('is_deleted_new', sa.Boolean(), nullable=True))
    connection.execute(sa.text(
        "UPDATE notes SET is_deleted_new = CASE WHEN is_deleted = 1 THEN true ELSE false END"
    ))
    op.drop_column('notes', 'is_deleted')
    op.alter_column('notes', 'is_deleted_new', new_column_name='is_deleted', nullable=False)

    # PromptTemplate.is_favorite: Integer -> Boolean
    op.add_column('prompt_templates', sa.Column('is_favorite_new', sa.Boolean(), nullable=True))
    connection.execute(sa.text(
        "UPDATE prompt_templates SET is_favorite_new = CASE WHEN is_favorite = 1 THEN true ELSE false END"
    ))
    op.drop_column('prompt_templates', 'is_favorite')
    op.alter_column('prompt_templates', 'is_favorite_new', new_column_name='is_favorite', nullable=False)

    # PromptTemplate.is_system_prompt: Integer -> Boolean
    op.add_column('prompt_templates', sa.Column('is_system_prompt_new', sa.Boolean(), nullable=True))
    connection.execute(sa.text(
        "UPDATE prompt_templates SET is_system_prompt_new = CASE WHEN is_system_prompt = 1 THEN true ELSE false END"
    ))
    op.drop_column('prompt_templates', 'is_system_prompt')
    op.alter_column('prompt_templates', 'is_system_prompt_new', new_column_name='is_system_prompt', nullable=False)


def downgrade():
    """Revert Boolean fields back to Integer for rollback"""

    connection = op.get_bind()

    # ChatMessage.is_cancelled: Boolean -> Integer
    op.add_column('chat_messages', sa.Column('is_cancelled_old', sa.Integer(), nullable=True))
    connection.execute(sa.text(
        "UPDATE chat_messages SET is_cancelled_old = CASE WHEN is_cancelled THEN 1 ELSE 0 END"
    ))
    op.drop_column('chat_messages', 'is_cancelled')
    op.alter_column('chat_messages', 'is_cancelled_old', new_column_name='is_cancelled', nullable=False)

    # Note.is_deleted: Boolean -> Integer
    op.add_column('notes', sa.Column('is_deleted_old', sa.Integer(), nullable=True))
    connection.execute(sa.text(
        "UPDATE notes SET is_deleted_old = CASE WHEN is_deleted THEN 1 ELSE 0 END"
    ))
    op.drop_column('notes', 'is_deleted')
    op.alter_column('notes', 'is_deleted_old', new_column_name='is_deleted', nullable=False)

    # PromptTemplate.is_favorite: Boolean -> Integer
    op.add_column('prompt_templates', sa.Column('is_favorite_old', sa.Integer(), nullable=True))
    connection.execute(sa.text(
        "UPDATE prompt_templates SET is_favorite_old = CASE WHEN is_favorite THEN 1 ELSE 0 END"
    ))
    op.drop_column('prompt_templates', 'is_favorite')
    op.alter_column('prompt_templates', 'is_favorite_old', new_column_name='is_favorite', nullable=False)

    # PromptTemplate.is_system_prompt: Boolean -> Integer
    op.add_column('prompt_templates', sa.Column('is_system_prompt_old', sa.Integer(), nullable=True))
    connection.execute(sa.text(
        "UPDATE prompt_templates SET is_system_prompt_old = CASE WHEN is_system_prompt THEN 1 ELSE 0 END"
    ))
    op.drop_column('prompt_templates', 'is_system_prompt')
    op.alter_column('prompt_templates', 'is_system_prompt_old', new_column_name='is_system_prompt', nullable=False)
