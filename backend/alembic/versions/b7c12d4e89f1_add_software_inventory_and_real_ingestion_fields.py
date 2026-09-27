"""add_software_inventory_and_real_ingestion_fields

Revision ID: b7c12d4e89f1
Revises: da16b99afdae
Create Date: 2026-09-26 23:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c12d4e89f1'
down_revision: Union[str, Sequence[str], None] = 'da16b99afdae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create software_inventory table
    op.create_table(
        'software_inventory',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('org_id', sa.String(length=36), nullable=False),
        sa.Column('asset_id', sa.String(length=36), nullable=False),
        sa.Column('vendor', sa.String(length=100), nullable=False),
        sa.Column('product', sa.String(length=100), nullable=False),
        sa.Column('version', sa.String(length=50), nullable=False),
        sa.Column('cpe_uri', sa.String(length=255), nullable=True),
        sa.Column('package_type', sa.String(length=50), nullable=True),
        sa.Column('installed_path', sa.String(length=255), nullable=True),
        sa.Column('correlation_status', sa.String(length=50), nullable=True),
        sa.Column('matched_cves_count', sa.Integer(), nullable=True),
        sa.Column('last_scanned_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. Add columns to vulnerabilities
    op.add_column('vulnerabilities', sa.Column('epss_score', sa.Float(), nullable=True))
    op.add_column('vulnerabilities', sa.Column('epss_percentile', sa.Float(), nullable=True))
    op.add_column('vulnerabilities', sa.Column('is_cisa_kev', sa.Boolean(), nullable=True))
    op.add_column('vulnerabilities', sa.Column('kev_date_added', sa.String(length=50), nullable=True))
    op.add_column('vulnerabilities', sa.Column('affected_product', sa.String(length=255), nullable=True))
    op.add_column('vulnerabilities', sa.Column('cpe_uri', sa.String(length=255), nullable=True))
    op.add_column('vulnerabilities', sa.Column('confidence_score', sa.Float(), nullable=True))
    op.add_column('vulnerabilities', sa.Column('source', sa.String(length=100), nullable=True))
    op.add_column('vulnerabilities', sa.Column('source_timestamp', sa.DateTime(timezone=True), nullable=True))
    op.add_column('vulnerabilities', sa.Column('correlation_status', sa.String(length=50), nullable=True))
    op.add_column('vulnerabilities', sa.Column('correlation_confidence', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_table('software_inventory')
    op.drop_column('vulnerabilities', 'correlation_confidence')
    op.drop_column('vulnerabilities', 'correlation_status')
    op.drop_column('vulnerabilities', 'source_timestamp')
    op.drop_column('vulnerabilities', 'source')
    op.drop_column('vulnerabilities', 'confidence_score')
    op.drop_column('vulnerabilities', 'cpe_uri')
    op.drop_column('vulnerabilities', 'affected_product')
    op.drop_column('vulnerabilities', 'kev_date_added')
    op.drop_column('vulnerabilities', 'is_cisa_kev')
    op.drop_column('vulnerabilities', 'epss_percentile')
    op.drop_column('vulnerabilities', 'epss_score')
