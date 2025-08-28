"""
Add doctor verification fields migration
This migration adds fields to support doctor profile completion and verification workflow
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    # Add doctor verification fields
    with op.batch_alter_table('doctors') as batch_op:
        # Profile completion tracking
        batch_op.add_column(sa.Column('profile_completed', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('profile_completion_date', sa.DateTime(), nullable=True))
        
        # Verification details
        batch_op.add_column(sa.Column('verification_status', 
            sa.Enum('pending', 'submitted', 'under_review', 'approved', 'rejected', name='verification_statuses'), 
            nullable=False, server_default='pending'))
        batch_op.add_column(sa.Column('verification_submitted_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('verification_reviewed_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('verified_by_admin_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('rejection_reason', sa.Text(), nullable=True))
        
        # Additional profile fields for verification
        batch_op.add_column(sa.Column('education_details', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('certifications', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('professional_memberships', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('languages_spoken', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('consultation_areas', sa.JSON(), nullable=True))
        
        # Document uploads for verification
        batch_op.add_column(sa.Column('license_document_path', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('degree_document_path', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('id_document_path', sa.String(500), nullable=True))
        batch_op.add_column(sa.Column('other_documents', sa.JSON(), nullable=True))
        
        # Contact information for verification
        batch_op.add_column(sa.Column('office_phone', sa.String(20), nullable=True))
        batch_op.add_column(sa.Column('office_address', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('emergency_contact', sa.String(20), nullable=True))
        
        # Add foreign key for admin who verified
        batch_op.create_foreign_key('fk_doctor_verified_by_admin', 
                                   'users', ['verified_by_admin_id'], ['id'])
    
    # Create doctor verification log table for audit trail
    op.create_table('doctor_verification_logs',
        sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.Enum('submitted', 'reviewed', 'approved', 'rejected', 'updated', name='verification_actions'), nullable=False),
        sa.Column('performed_by_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('previous_status', sa.String(50), nullable=True),
        sa.Column('new_status', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ),
        sa.ForeignKeyConstraint(['performed_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Add indexes for performance
    op.create_index('idx_doctor_verification_status', 'doctors', ['verification_status'])
    op.create_index('idx_doctor_profile_completed', 'doctors', ['profile_completed'])
    op.create_index('idx_verification_log_doctor', 'doctor_verification_logs', ['doctor_id'])
    op.create_index('idx_verification_log_date', 'doctor_verification_logs', ['created_at'])

def downgrade():
    # Drop verification log table
    op.drop_table('doctor_verification_logs')
    
    # Remove indexes
    op.drop_index('idx_doctor_verification_status', 'doctors')
    op.drop_index('idx_doctor_profile_completed', 'doctors')
    
    # Remove columns from doctors table
    with op.batch_alter_table('doctors') as batch_op:
        batch_op.drop_constraint('fk_doctor_verified_by_admin', type_='foreignkey')
        batch_op.drop_column('profile_completed')
        batch_op.drop_column('profile_completion_date')
        batch_op.drop_column('verification_status')
        batch_op.drop_column('verification_submitted_at')
        batch_op.drop_column('verification_reviewed_at')
        batch_op.drop_column('verified_by_admin_id')
        batch_op.drop_column('rejection_reason')
        batch_op.drop_column('education_details')
        batch_op.drop_column('certifications')
        batch_op.drop_column('professional_memberships')
        batch_op.drop_column('languages_spoken')
        batch_op.drop_column('consultation_areas')
        batch_op.drop_column('license_document_path')
        batch_op.drop_column('degree_document_path')
        batch_op.drop_column('id_document_path')
        batch_op.drop_column('other_documents')
        batch_op.drop_column('office_phone')
        batch_op.drop_column('office_address')
        batch_op.drop_column('emergency_contact')
    
    # Drop enum types
    sa.Enum(name='verification_statuses').drop(op.get_bind())
    sa.Enum(name='verification_actions').drop(op.get_bind())