"""v6.1 capital flow intelligence engine

Revision ID: 006
Revises: 005
Create Date: 2026-09-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. market_observations
    op.create_table(
        'market_observations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('instrument_symbol', sa.String(length=50), nullable=False),
        sa.Column('asset_class', sa.String(length=50), nullable=False),
        sa.Column('market', sa.String(length=50), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('open_price', sa.Float(), nullable=True),
        sa.Column('high_price', sa.Float(), nullable=True),
        sa.Column('low_price', sa.Float(), nullable=True),
        sa.Column('close_price', sa.Float(), nullable=True),
        sa.Column('volume', sa.Float(), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='USD'),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.Column('source_identifier', sa.String(length=100), nullable=True),
        sa.Column('ingestion_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('data_quality', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('data_origin', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_market_observations_instrument_symbol'), 'market_observations', ['instrument_symbol'], unique=False)
    op.create_index(op.f('ix_market_observations_timestamp'), 'market_observations', ['timestamp'], unique=False)
    op.create_index(op.f('ix_market_observations_source'), 'market_observations', ['source'], unique=False)
    op.create_index(op.f('ix_market_observations_data_origin'), 'market_observations', ['data_origin'], unique=False)

    # 2. derived_market_indicators
    op.create_table(
        'derived_market_indicators',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('instrument_symbol', sa.String(length=50), nullable=False),
        sa.Column('indicator_name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('z_score', sa.Float(), nullable=True),
        sa.Column('formula', sa.Text(), nullable=False),
        sa.Column('source_variables', sa.JSON(), nullable=True),
        sa.Column('time_window', sa.String(length=50), nullable=False),
        sa.Column('calculation_timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('methodology_version', sa.String(length=20), nullable=False, server_default='v6.1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_derived_market_indicators_instrument_symbol'), 'derived_market_indicators', ['instrument_symbol'], unique=False)
    op.create_index(op.f('ix_derived_market_indicators_indicator_name'), 'derived_market_indicators', ['indicator_name'], unique=False)

    # 3. event_asset_mappings
    op.create_table(
        'event_asset_mappings',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('instrument_symbol', sa.String(length=50), nullable=False),
        sa.Column('asset_class', sa.String(length=50), nullable=False),
        sa.Column('sector', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('mapping_confidence', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('mapping_rule', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['extracted_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_asset_mappings_event_id'), 'event_asset_mappings', ['event_id'], unique=False)
    op.create_index(op.f('ix_event_asset_mappings_instrument_symbol'), 'event_asset_mappings', ['instrument_symbol'], unique=False)

    # 4. event_window_analyses
    op.create_table(
        'event_window_analyses',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('event_id', sa.String(length=36), nullable=False),
        sa.Column('instrument_symbol', sa.String(length=50), nullable=False),
        sa.Column('event_timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('pre_event_baseline_mean', sa.Float(), nullable=True),
        sa.Column('pre_event_baseline_std', sa.Float(), nullable=True),
        sa.Column('event_day_value', sa.Float(), nullable=True),
        sa.Column('post_event_value', sa.Float(), nullable=True),
        sa.Column('abnormality_z_score', sa.Float(), nullable=True),
        sa.Column('signal_type', sa.String(length=100), nullable=False),
        sa.Column('data_quality_score', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('signal_strength', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('supporting_sources', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['extracted_events.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_event_window_analyses_event_id'), 'event_window_analyses', ['event_id'], unique=False)

    # 5. data_source_metadata
    op.create_table(
        'data_source_metadata',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('provider_name', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('last_successful_fetch', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('data_freshness_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider_name')
    )
    op.create_index(op.f('ix_data_source_metadata_provider_name'), 'data_source_metadata', ['provider_name'], unique=True)


def downgrade() -> None:
    op.drop_table('data_source_metadata')
    op.drop_table('event_window_analyses')
    op.drop_table('event_asset_mappings')
    op.drop_table('derived_market_indicators')
    op.drop_table('market_observations')
