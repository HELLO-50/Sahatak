from flask import Blueprint, request
from flask_login import current_user
from routes.auth import api_login_required
from datetime import datetime
from models import db, Doctor, DoctorVerificationLog, User
from utils.responses import success_response, error_response, validation_error_response, not_found_response, forbidden_response
from utils.validators import validate_json_data, sanitize_input
from utils.logging_config import app_logger
import os
from werkzeug.utils import secure_filename
import json

doctor_verification_bp = Blueprint('doctor_verification', __name__, url_prefix='/doctor-verification')

# Allowed file extensions for document uploads
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@doctor_verification_bp.route('/status', methods=['GET'])
@api_login_required
def get_verification_status():
    """
    Get current verification status for logged-in doctor
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can check verification status")
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        # Get latest verification logs
        logs = DoctorVerificationLog.query.filter_by(
            doctor_id=doctor.id
        ).order_by(DoctorVerificationLog.created_at.desc()).limit(5).all()
        
        return success_response(
            message="Verification status retrieved successfully",
            data={
                'profile_completed': doctor.profile_completed,
                'verification_status': doctor.verification_status,
                'is_verified': doctor.is_verified,
                'rejection_reason': doctor.rejection_reason,
                'verification_submitted_at': doctor.verification_submitted_at.isoformat() if doctor.verification_submitted_at else None,
                'verification_reviewed_at': doctor.verification_reviewed_at.isoformat() if doctor.verification_reviewed_at else None,
                'verification_logs': [log.to_dict() for log in logs]
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error getting verification status: {str(e)}")
        return error_response("Failed to get verification status", 500)

@doctor_verification_bp.route('/complete-profile', methods=['POST'])
@api_login_required
def complete_profile():
    """
    Complete doctor profile for verification
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can complete profile")
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        # Check if already submitted
        if doctor.verification_status in ['submitted', 'under_review', 'approved']:
            return error_response("Profile already submitted for verification")
        
        data = request.get_json()
        if not data:
            return error_response("No data provided")
        
        # Required fields for verification
        required_fields = [
            'education_details',
            'languages_spoken',
            'consultation_areas',
            'office_phone',
            'office_address'
        ]
        
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return validation_error_response(
                'missing_fields',
                f"Missing required fields: {', '.join(missing_fields)}"
            )
        
        # Update doctor profile
        doctor.education_details = sanitize_input(data['education_details'], 2000)
        doctor.office_phone = sanitize_input(data['office_phone'], 20)
        doctor.office_address = sanitize_input(data['office_address'], 500)
        doctor.emergency_contact = sanitize_input(data.get('emergency_contact', ''), 20)
        
        # Handle JSON fields
        if isinstance(data.get('certifications'), list):
            doctor.certifications = data['certifications']
        
        if isinstance(data.get('professional_memberships'), list):
            doctor.professional_memberships = data['professional_memberships']
        
        if isinstance(data.get('languages_spoken'), list):
            doctor.languages_spoken = data['languages_spoken']
        
        if isinstance(data.get('consultation_areas'), list):
            doctor.consultation_areas = data['consultation_areas']
        
        # Mark profile as completed
        doctor.profile_completed = True
        doctor.profile_completion_date = datetime.utcnow()
        
        # Create verification log
        log = DoctorVerificationLog(
            doctor_id=doctor.id,
            action='updated',
            performed_by_id=current_user.id,
            notes='Doctor completed profile information',
            previous_status=doctor.verification_status,
            new_status=doctor.verification_status
        )
        
        db.session.add(log)
        db.session.commit()
        
        app_logger.info(f"Doctor {doctor.id} completed profile information")
        
        return success_response(
            message="Profile completed successfully",
            data={'profile_completed': True}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error completing doctor profile: {str(e)}")
        return error_response("Failed to complete profile", 500)

@doctor_verification_bp.route('/submit-for-verification', methods=['POST'])
@api_login_required
def submit_for_verification():
    """
    Submit doctor profile for admin verification
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can submit for verification")
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        # Check if profile is completed
        if not doctor.profile_completed:
            return error_response("Please complete your profile first")
        
        # Check current status
        if doctor.verification_status == 'approved':
            return error_response("Profile already approved")
        
        if doctor.verification_status in ['submitted', 'under_review']:
            return error_response("Profile already submitted and under review")
        
        # Update verification status
        previous_status = doctor.verification_status
        doctor.verification_status = 'submitted'
        doctor.verification_submitted_at = datetime.utcnow()
        doctor.rejection_reason = None  # Clear any previous rejection
        
        # Create verification log
        log = DoctorVerificationLog(
            doctor_id=doctor.id,
            action='submitted',
            performed_by_id=current_user.id,
            notes='Profile submitted for verification',
            previous_status=previous_status,
            new_status='submitted'
        )
        
        db.session.add(log)
        db.session.commit()
        
        app_logger.info(f"Doctor {doctor.id} submitted profile for verification")
        
        # TODO: Send notification to admins about new verification request
        
        return success_response(
            message="Profile submitted for verification successfully. You will be notified once reviewed.",
            data={
                'verification_status': 'submitted',
                'submitted_at': doctor.verification_submitted_at.isoformat()
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error submitting for verification: {str(e)}")
        return error_response("Failed to submit for verification", 500)

@doctor_verification_bp.route('/upload-document', methods=['POST'])
@api_login_required
def upload_document():
    """
    Upload verification documents
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can upload documents")
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        # Check if file is present
        if 'file' not in request.files:
            return error_response("No file provided")
        
        file = request.files['file']
        if file.filename == '':
            return error_response("No file selected")
        
        # Check file type from form data
        doc_type = request.form.get('doc_type')
        if doc_type not in ['license', 'degree', 'id', 'other']:
            return validation_error_response('doc_type', 'Invalid document type')
        
        # Validate file
        if not allowed_file(file.filename):
            return validation_error_response(
                'file',
                f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return validation_error_response('file', 'File size exceeds 5MB limit')
        
        # Generate secure filename
        filename = secure_filename(file.filename)
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"doctor_{doctor.id}_{doc_type}_{timestamp}_{filename}"
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join('uploads', 'doctor_documents')
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)
        
        # Update doctor record with file path
        if doc_type == 'license':
            doctor.license_document_path = file_path
        elif doc_type == 'degree':
            doctor.degree_document_path = file_path
        elif doc_type == 'id':
            doctor.id_document_path = file_path
        else:
            # Add to other documents
            if not doctor.other_documents:
                doctor.other_documents = []
            doctor.other_documents.append({
                'filename': filename,
                'path': file_path,
                'uploaded_at': datetime.utcnow().isoformat(),
                'description': request.form.get('description', '')
            })
        
        db.session.commit()
        
        app_logger.info(f"Doctor {doctor.id} uploaded {doc_type} document: {filename}")
        
        return success_response(
            message="Document uploaded successfully",
            data={
                'doc_type': doc_type,
                'filename': filename
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error uploading document: {str(e)}")
        return error_response("Failed to upload document", 500)

# Admin endpoints for verification management

@doctor_verification_bp.route('/admin/pending', methods=['GET'])
@api_login_required
def get_pending_verifications():
    """
    Get list of doctors pending verification (admin only)
    """
    try:
        if current_user.user_type != 'admin':
            return forbidden_response("Admin access required")
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        
        # Query pending verifications
        query = Doctor.query.join(User, Doctor.user_id == User.id).filter(
            Doctor.verification_status.in_(['submitted', 'under_review'])
        ).order_by(Doctor.verification_submitted_at.asc())
        
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        
        doctors_data = []
        for doctor in paginated.items:
            data = {
                'doctor_id': doctor.id,
                'user_id': doctor.user_id,
                'full_name': doctor.user.get_full_name(),
                'email': doctor.user.email,
                'specialty': doctor.specialty,
                'license_number': doctor.license_number,
                'verification_status': doctor.verification_status,
                'submitted_at': doctor.verification_submitted_at.isoformat() if doctor.verification_submitted_at else None,
                'profile_completed': doctor.profile_completed,
                'has_documents': bool(doctor.license_document_path or doctor.degree_document_path or doctor.id_document_path)
            }
            doctors_data.append(data)
        
        return success_response(
            message="Pending verifications retrieved successfully",
            data={
                'doctors': doctors_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages,
                    'has_next': paginated.has_next,
                    'has_prev': paginated.has_prev
                }
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error getting pending verifications: {str(e)}")
        return error_response("Failed to get pending verifications", 500)

@doctor_verification_bp.route('/admin/review/<int:doctor_id>', methods=['GET'])
@api_login_required
def get_doctor_verification_details(doctor_id):
    """
    Get detailed doctor information for verification review (admin only)
    """
    try:
        if current_user.user_type != 'admin':
            return forbidden_response("Admin access required")
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return not_found_response("Doctor", doctor_id)
        
        # Get verification logs
        logs = DoctorVerificationLog.query.filter_by(
            doctor_id=doctor_id
        ).order_by(DoctorVerificationLog.created_at.desc()).all()
        
        # Prepare comprehensive data
        data = doctor.to_dict()
        data['user'] = doctor.user.to_dict()
        data['verification_logs'] = [log.to_dict() for log in logs]
        data['documents'] = {
            'license': bool(doctor.license_document_path),
            'degree': bool(doctor.degree_document_path),
            'id': bool(doctor.id_document_path),
            'other': len(doctor.other_documents) if doctor.other_documents else 0
        }
        
        return success_response(
            message="Doctor verification details retrieved successfully",
            data=data
        )
        
    except Exception as e:
        app_logger.error(f"Error getting doctor verification details: {str(e)}")
        return error_response("Failed to get verification details", 500)

@doctor_verification_bp.route('/admin/approve/<int:doctor_id>', methods=['POST'])
@api_login_required
def approve_doctor(doctor_id):
    """
    Approve doctor verification (admin only)
    """
    try:
        if current_user.user_type != 'admin':
            return forbidden_response("Admin access required")
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return not_found_response("Doctor", doctor_id)
        
        data = request.get_json()
        notes = data.get('notes', 'Verification approved')
        
        # Update doctor status
        previous_status = doctor.verification_status
        doctor.verification_status = 'approved'
        doctor.is_verified = True
        doctor.verification_reviewed_at = datetime.utcnow()
        doctor.verified_by_admin_id = current_user.id
        doctor.rejection_reason = None
        
        # Create verification log
        log = DoctorVerificationLog(
            doctor_id=doctor_id,
            action='approved',
            performed_by_id=current_user.id,
            notes=notes,
            previous_status=previous_status,
            new_status='approved'
        )
        
        db.session.add(log)
        db.session.commit()
        
        app_logger.info(f"Admin {current_user.id} approved doctor {doctor_id}")
        
        # TODO: Send notification to doctor about approval
        
        return success_response(
            message="Doctor verification approved successfully",
            data={'doctor_id': doctor_id, 'status': 'approved'}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error approving doctor: {str(e)}")
        return error_response("Failed to approve doctor", 500)

@doctor_verification_bp.route('/admin/reject/<int:doctor_id>', methods=['POST'])
@api_login_required
def reject_doctor(doctor_id):
    """
    Reject doctor verification (admin only)
    """
    try:
        if current_user.user_type != 'admin':
            return forbidden_response("Admin access required")
        
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            return not_found_response("Doctor", doctor_id)
        
        data = request.get_json()
        if not data or not data.get('reason'):
            return error_response("Rejection reason is required")
        
        reason = sanitize_input(data['reason'], 1000)
        notes = data.get('notes', 'Verification rejected')
        
        # Update doctor status
        previous_status = doctor.verification_status
        doctor.verification_status = 'rejected'
        doctor.is_verified = False
        doctor.verification_reviewed_at = datetime.utcnow()
        doctor.verified_by_admin_id = current_user.id
        doctor.rejection_reason = reason
        
        # Create verification log
        log = DoctorVerificationLog(
            doctor_id=doctor_id,
            action='rejected',
            performed_by_id=current_user.id,
            notes=f"{notes}. Reason: {reason}",
            previous_status=previous_status,
            new_status='rejected'
        )
        
        db.session.add(log)
        db.session.commit()
        
        app_logger.info(f"Admin {current_user.id} rejected doctor {doctor_id}")
        
        # TODO: Send notification to doctor about rejection with reason
        
        return success_response(
            message="Doctor verification rejected",
            data={'doctor_id': doctor_id, 'status': 'rejected'}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error rejecting doctor: {str(e)}")
        return error_response("Failed to reject doctor", 500)