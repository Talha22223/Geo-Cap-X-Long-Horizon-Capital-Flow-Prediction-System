"""v5.1 sna snapshot metadata

Revision ID: 004
Revises: 003
Create Date: 2026-09-08 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('network_analysis_results', sa.Column('metadata_json', sa.JSON(), nullable=True))
    op.add_column('network_analysis_results', sa.Column('metric_status_json', sa.JSON(), nullable=True))
    op.add_column('network_analysis_results', sa.Column('community_summary_json', sa.JSON(), nullable=True))
    op.add_column('network_analysis_results', sa.Column('bridge_events_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('network_analysis_results', 'bridge_events_json')
    op.drop_column('network_analysis_results', 'community_summary_json')
    op.drop_column('network_analysis_results', 'metric_status_json')
    op.drop_column('network_analysis_results', 'metadata_json')
