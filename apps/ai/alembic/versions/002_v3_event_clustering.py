"""v3 event clustering

Revision ID: 002_v3_event_clustering
Revises: 001_v3_canonical_events
Create Date: 2026-09-08 00:00:01.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_v3_event_clustering'
down_revision = '001_v3_canonical_events'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create canonical_events table
    op.create_table(
        'canonical_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.Float(), nullable=False, server_default="0.0"),
        sa.Column('confidence', sa.Float(), nullable=False, server_default="0.0"),
        
        sa.Column('countries', sa.JSON(), nullable=True),
        sa.Column('regions', sa.JSON(), nullable=True),
        sa.Column('sectors', sa.JSON(), nullable=True),
        sa.Column('organizations', sa.JSON(), nullable=True),
        sa.Column('people', sa.JSON(), nullable=True),
        
        sa.Column('event_time_start', sa.DateTime(), nullable=True),
        sa.Column('event_time_end', sa.DateTime(), nullable=True),
        
        sa.Column('supporting_article_count', sa.Integer(), nullable=False, server_default="1"),
        sa.Column('independent_source_count', sa.Integer(), nullable=False, server_default="1"),
        
        sa.Column('has_conflicting_evidence', sa.Boolean(), nullable=False, server_default="0"),
        sa.Column('conflict_details', sa.Text(), nullable=True),
        
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index(op.f('ix_canonical_events_category'), 'canonical_events', ['category'], unique=False)
    
    # 2. Add canonical_event_id to extracted_events
    with op.batch_alter_table('extracted_events', schema=None) as batch_op:
        batch_op.add_column(sa.Column('canonical_event_id', sa.String(length=36), nullable=True))
        batch_op.create_foreign_key(
            'fk_extracted_canonical', 
            'canonical_events', 
            ['canonical_event_id'], 
            ['id'], 
            ondelete='SET NULL'
        )
        batch_op.create_index(batch_op.f('ix_extracted_events_canonical_event_id'), ['canonical_event_id'], unique=False)

def downgrade() -> None:
    with op.batch_alter_table('extracted_events', schema=None) as batch_op:
        batch_op.drop_constraint('fk_extracted_canonical', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_extracted_events_canonical_event_id'))
        batch_op.drop_column('canonical_event_id')
        
    op.drop_index(op.f('ix_canonical_events_category'), table_name='canonical_events')
    op.drop_table('canonical_events')
