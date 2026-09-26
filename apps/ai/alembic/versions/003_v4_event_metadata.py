"""v4 event metadata

Revision ID: 003
Revises: 002
Create Date: 2026-09-08 19:48:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002_v3_event_clustering'
branch_labels = None
depends_on = None



def upgrade() -> None:
    op.add_column('event_chains', sa.Column('metadata_json', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('event_chains', 'metadata_json')
