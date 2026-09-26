"""v3 canonical events

Revision ID: 001_v3_canonical_events
Revises: 
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_v3_canonical_events'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch_alter_table to support SQLite column drops
    with op.batch_alter_table('extracted_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('summary', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('subtype', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('countries', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('regions', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('sectors', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('asset_classes', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('commodities', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('publication_timestamp', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('source_provider', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('source_url', sa.String(length=1000), nullable=True))
        batch_op.add_column(sa.Column('data_origin', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('extraction_method', sa.String(length=100), nullable=True))
        
        batch_op.create_index(batch_op.f('ix_extracted_events_subtype'), ['subtype'], unique=False)
        batch_op.create_index(batch_op.f('ix_extracted_events_source_provider'), ['source_provider'], unique=False)

        # Drop old scalar columns
        batch_op.drop_index('ix_extracted_events_country', if_exists=True)
        batch_op.drop_index('ix_extracted_events_region', if_exists=True)
        batch_op.drop_index('ix_extracted_events_sector', if_exists=True)
        batch_op.drop_index('ix_extracted_events_commodity', if_exists=True)
        batch_op.drop_index('ix_extracted_events_asset_class', if_exists=True)


        batch_op.drop_column('country')
        batch_op.drop_column('region')
        batch_op.drop_column('sector')
        batch_op.drop_column('commodity')
        batch_op.drop_column('asset_class')


def downgrade() -> None:
    with op.batch_alter_table('extracted_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('asset_class', sa.VARCHAR(length=100), nullable=True))
        batch_op.add_column(sa.Column('commodity', sa.VARCHAR(length=100), nullable=True))
        batch_op.add_column(sa.Column('sector', sa.VARCHAR(length=100), nullable=True))
        batch_op.add_column(sa.Column('region', sa.VARCHAR(length=100), nullable=True))
        batch_op.add_column(sa.Column('country', sa.VARCHAR(length=100), nullable=True))

        batch_op.create_index('ix_extracted_events_asset_class', ['asset_class'], unique=False)
        batch_op.create_index('ix_extracted_events_commodity', ['commodity'], unique=False)
        batch_op.create_index('ix_extracted_events_sector', ['sector'], unique=False)
        batch_op.create_index('ix_extracted_events_region', ['region'], unique=False)
        batch_op.create_index('ix_extracted_events_country', ['country'], unique=False)

        batch_op.drop_index(batch_op.f('ix_extracted_events_source_provider'))
        batch_op.drop_index(batch_op.f('ix_extracted_events_subtype'))

        batch_op.drop_column('extraction_method')
        batch_op.drop_column('data_origin')
        batch_op.drop_column('source_url')
        batch_op.drop_column('source_provider')
        batch_op.drop_column('publication_timestamp')
        batch_op.drop_column('commodities')
        batch_op.drop_column('asset_classes')
        batch_op.drop_column('sectors')
        batch_op.drop_column('regions')
        batch_op.drop_column('countries')
        batch_op.drop_column('subtype')
        batch_op.drop_column('summary')
