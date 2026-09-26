"""v6.2 capital flow signal fusion engine

Revision ID: 007
Revises: 006
Create Date: 2026-09-19 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'event_market_intelligence',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('instrument_symbol', sa.String(length=50), nullable=False),
        sa.Column('observation_window', sa.String(length=50), nullable=False, server_default='[-30_DAYS, +5_DAYS]'),
        sa.Column('layer1_event_signal', sa.JSON(), nullable=False),
        sa.Column('layer2_network_signal', sa.JSON(), nullable=False),
        sa.Column('layer3_market_signal', sa.JSON(), nullable=False),
        sa.Column('layer4_data_quality', sa.JSON(), nullable=False),
        sa.Column('fused_signal_score', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('interpretation_status', sa.String(length=50), nullable=False),
        sa.Column('cross_asset_alignment_json', sa.JSON(), nullable=True),
        sa.Column('methodology_version', sa.String(length=20), nullable=False, server_default='v6.2'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['extracted_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_market_intelligence_event_id'), 'event_market_intelligence', ['event_id'], unique=False)
    op.create_index(op.f('ix_event_market_intelligence_instrument_symbol'), 'event_market_intelligence', ['instrument_symbol'], unique=False)
    op.create_index(op.f('ix_event_market_intelligence_interpretation_status'), 'event_market_intelligence', ['interpretation_status'], unique=False)


def downgrade() -> None:
    op.drop_table('event_market_intelligence')
