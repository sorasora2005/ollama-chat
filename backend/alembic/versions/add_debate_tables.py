"""Add debate tables

Revision ID: add_debate_tables
Revises: convert_integer_booleans
Create Date: 2026-01-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers
revision = 'add_debate_tables'
down_revision = 'convert_integer_booleans'
branch_labels = None
depends_on = None


def upgrade():
    """Create debate-related tables"""

    connection = op.get_bind()
    inspector = sa.inspect(connection)
    tables = inspector.get_table_names()

    # Create debate_sessions table
    if 'debate_sessions' not in tables:
        op.create_table(
            'debate_sessions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('creator_id', sa.Integer(), nullable=False),
            sa.Column('title', sa.String(200), nullable=False),
            sa.Column('topic', sa.Text(), nullable=False),
            sa.Column('status', sa.String(20), nullable=False, server_default='setup'),
            sa.Column('config', JSONB, nullable=True),
            sa.Column('winner_participant_id', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.Column('completed_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['creator_id'], ['users.id']),
            sa.PrimaryKeyConstraint('id')
        )

        # Create indexes for debate_sessions
        try:
            op.create_index('ix_debate_sessions_id', 'debate_sessions', ['id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_sessions_creator_id', 'debate_sessions', ['creator_id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_sessions_created_at', 'debate_sessions', ['created_at'], unique=False)
        except Exception:
            pass

    # Create debate_participants table
    if 'debate_participants' not in tables:
        op.create_table(
            'debate_participants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('debate_session_id', sa.Integer(), nullable=False),
            sa.Column('model_name', sa.String(100), nullable=False),
            sa.Column('position', sa.String(100), nullable=True),
            sa.Column('participant_order', sa.Integer(), nullable=False),
            sa.Column('color', sa.String(20), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['debate_session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        # Create indexes for debate_participants
        try:
            op.create_index('ix_debate_participants_id', 'debate_participants', ['id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_participants_debate_session_id', 'debate_participants', ['debate_session_id'], unique=False)
        except Exception:
            pass

    # Add foreign key for winner_participant_id (after participants table exists)
    try:
        op.create_foreign_key(
            'fk_debate_sessions_winner',
            'debate_sessions', 'debate_participants',
            ['winner_participant_id'], ['id']
        )
    except Exception:
        pass

    # Create debate_messages table
    if 'debate_messages' not in tables:
        op.create_table(
            'debate_messages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('debate_session_id', sa.Integer(), nullable=False),
            sa.Column('participant_id', sa.Integer(), nullable=True),
            sa.Column('content', sa.Text(), nullable=False),
            sa.Column('round_number', sa.Integer(), nullable=False),
            sa.Column('turn_number', sa.Integer(), nullable=False),
            sa.Column('message_type', sa.String(20), nullable=False, server_default='argument'),
            sa.Column('prompt_tokens', sa.Integer(), nullable=True),
            sa.Column('completion_tokens', sa.Integer(), nullable=True),
            sa.Column('response_time', sa.Float(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['debate_session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['participant_id'], ['debate_participants.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )

        # Create indexes for debate_messages
        try:
            op.create_index('ix_debate_messages_id', 'debate_messages', ['id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_messages_debate_session_id', 'debate_messages', ['debate_session_id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_messages_round_number', 'debate_messages', ['round_number'], unique=False)
        except Exception:
            pass

    # Create debate_evaluations table
    if 'debate_evaluations' not in tables:
        op.create_table(
            'debate_evaluations',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('debate_session_id', sa.Integer(), nullable=False),
            sa.Column('participant_id', sa.Integer(), nullable=False),
            sa.Column('evaluator_model', sa.String(100), nullable=False),
            sa.Column('qualitative_feedback', sa.Text(), nullable=True),
            sa.Column('scores', JSONB, nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['debate_session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['participant_id'], ['debate_participants.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )

        # Create indexes for debate_evaluations
        try:
            op.create_index('ix_debate_evaluations_id', 'debate_evaluations', ['id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_evaluations_debate_session_id', 'debate_evaluations', ['debate_session_id'], unique=False)
        except Exception:
            pass

    # Create debate_votes table
    if 'debate_votes' not in tables:
        op.create_table(
            'debate_votes',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('debate_session_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('winner_participant_id', sa.Integer(), nullable=False),
            sa.Column('reasoning', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(['debate_session_id'], ['debate_sessions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id']),
            sa.ForeignKeyConstraint(['winner_participant_id'], ['debate_participants.id']),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('debate_session_id', 'user_id', name='uq_debate_votes_session_user')
        )

        # Create indexes for debate_votes
        try:
            op.create_index('ix_debate_votes_id', 'debate_votes', ['id'], unique=False)
        except Exception:
            pass
        try:
            op.create_index('ix_debate_votes_debate_session_id', 'debate_votes', ['debate_session_id'], unique=False)
        except Exception:
            pass


def downgrade():
    """Drop debate tables"""
    op.drop_table('debate_votes')
    op.drop_table('debate_evaluations')
    op.drop_table('debate_messages')

    # Drop foreign key before dropping participants table
    try:
        op.drop_constraint('fk_debate_sessions_winner', 'debate_sessions', type_='foreignkey')
    except Exception:
        pass

    op.drop_table('debate_participants')
    op.drop_table('debate_sessions')
