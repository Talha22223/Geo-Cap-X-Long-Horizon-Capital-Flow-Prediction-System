"""v5.2 network exposure results

Revision ID: 005
Revises: 004
Create Date: 2026-09-08 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'event_exposure_results',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('chain_id', sa.String(length=36), nullable=False),
        sa.Column('source_event_id', sa.String(length=36), nullable=False),
        sa.Column('exposure_score', sa.Float(), nullable=False, server_default="0.0"),
        sa.Column('exposure_json', sa.JSON(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_exposure_results_chain_id'), 'event_exposure_results', ['chain_id'], unique=False)
    op.create_index(op.f('ix_event_exposure_results_source_event_id'), 'event_exposure_results', ['source_event_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_event_exposure_results_source_event_id'), table_name='event_exposure_results')
    op.drop_index(op.f('ix_event_exposure_results_chain_id'), table_name='event_exposure_results')
    op.drop_table('event_exposure_results')
