from flask import Blueprint, request
from flask_login import login_required, current_user

from models import db, Prescription, Appointment
from utils.responses import success_response, error_response, not_found_response
from utils.logging_config import app_logger
from routes.auth import api_login_required

medical_bp = Blueprint('medical', __name__)

@medical_bp.route('/records', methods=['GET'])
@api_login_required
def get_medical_records():
    """
    Get user's medical records (placeholder - to be fully implemented)
    Following established patterns
    """
    try:
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        # Placeholder implementation - return appointments as medical records
        if current_user.user_type == 'patient':
            appointments = Appointment.query.filter_by(patient_id=profile.id).filter(
                Appointment.status.in_(['completed'])
            ).order_by(Appointment.appointment_date.desc()).limit(10).all()
            
            records = []
            for appointment in appointments:
                if appointment.diagnosis or appointment.prescription or appointment.notes:
                    records.append({
                        'id': appointment.id,
                        'date': appointment.appointment_date.isoformat(),
                        'doctor_name': appointment.doctor.user.get_full_name(),
                        'diagnosis': appointment.diagnosis,
                        'notes': appointment.notes,
                        'type': 'consultation'
                    })
        else:
            records = []
        
        app_logger.info(f"Retrieved {len(records)} medical records for user {current_user.id}")
        return success_response(
            message="Medical records retrieved successfully",
            data={'records': records}
        )
        
    except Exception as e:
        app_logger.error(f"Get medical records error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get medical records", 500)

@medical_bp.route('/prescriptions', methods=['GET'])
@api_login_required
def get_prescriptions():
    """
    Get user's prescriptions - redirects to prescriptions endpoint
    Following established patterns
    """
    try:
        # This is now handled by the dedicated prescriptions blueprint
        # Keep this endpoint for backward compatibility but redirect logic
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        if current_user.user_type == 'patient':
            prescriptions = Prescription.query.filter_by(patient_id=profile.id).order_by(
                Prescription.created_at.desc()
            ).limit(5).all()
        elif current_user.user_type == 'doctor':
            prescriptions = Prescription.query.filter_by(doctor_id=profile.id).order_by(
                Prescription.created_at.desc()
            ).limit(5).all()
        else:
            prescriptions = []
        
        prescription_data = [p.to_dict() for p in prescriptions]
        
        app_logger.info(f"Retrieved {len(prescriptions)} prescriptions for user {current_user.id}")
        return success_response(
            message="Prescriptions retrieved successfully (use /api/prescriptions for full functionality)",
            data={'prescriptions': prescription_data}
        )
        
    except Exception as e:
        app_logger.error(f"Get prescriptions error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get prescriptions", 500)