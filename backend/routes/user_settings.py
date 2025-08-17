from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from datetime import datetime
from decimal import Decimal

from models import db, User, Doctor, Patient
from utils.responses import success_response, error_response, not_found_response, validation_error_response
from utils.validators import (
    validate_doctor_participation_data, 
    validate_consultation_fee,
    validate_participation_type,
    validate_json_data
)
from utils.logging_config import app_logger

user_settings_bp = Blueprint('user_settings', __name__)

# =============================================================================
# DOCTOR SETTINGS MANAGEMENT
# =============================================================================

@user_settings_bp.route('/doctor/participation', methods=['GET'])
@login_required
def get_doctor_participation_settings():
    """
    Get doctor's current participation settings
    """
    try:
        if current_user.user_type != 'doctor':
            return error_response("Access denied. Doctor account required.", 403)
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        settings = {
            'participation_type': doctor.participation_type,
            'consultation_fee': str(doctor.consultation_fee) if doctor.consultation_fee else '0.00',
            'can_change_participation': doctor.can_change_participation,
            'participation_changed_at': doctor.participation_changed_at.isoformat() if doctor.participation_changed_at else None,
            'patient_notification_method': doctor.patient_notification_method,
            'notification_settings': doctor.notification_settings or {}
        }
        
        app_logger.info(f"Retrieved participation settings for doctor {current_user.id}")
        return success_response(
            message="Doctor participation settings retrieved successfully",
            data={'settings': settings}
        )
        
    except Exception as e:
        app_logger.error(f"Get doctor participation settings error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get participation settings", 500)

@user_settings_bp.route('/doctor/participation', methods=['PUT'])
@login_required
def update_doctor_participation_settings():
    """
    Update doctor's participation type and consultation fee
    """
    try:
        if current_user.user_type != 'doctor':
            return error_response("Access denied. Doctor account required.", 403)
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        if not doctor.can_change_participation:
            return error_response("Participation type changes are restricted for your account. Please contact administrator.", 403)
        
        data = request.get_json()
        if not data:
            return validation_error_response("No data provided")
        
        # Validate the participation data
        validation_result = validate_doctor_participation_data(data)
        if not validation_result['valid']:
            return validation_error_response(validation_result['message'])
        
        # Update participation type if provided
        if 'participation_type' in data:
            new_type = data['participation_type']
            
            # Validate participation type
            type_validation = validate_participation_type(new_type)
            if not type_validation['valid']:
                return validation_error_response(type_validation['message'])
            
            doctor.participation_type = new_type
            doctor.participation_changed_at = datetime.utcnow()
            
            # Auto-adjust consultation fee based on participation type
            if new_type == 'volunteer':
                doctor.consultation_fee = Decimal('0.00')
            elif new_type == 'paid' and doctor.consultation_fee == Decimal('0.00'):
                # If switching to paid but fee is 0, require them to set a fee
                if 'consultation_fee' not in data or not data['consultation_fee']:
                    return validation_error_response("Consultation fee is required when switching to paid participation")
        
        # Update consultation fee if provided
        if 'consultation_fee' in data:
            fee = data['consultation_fee']
            
            # Validate consultation fee with context
            fee_validation = validate_consultation_fee(fee, doctor.participation_type)
            if not fee_validation['valid']:
                return validation_error_response(fee_validation['message'])
            
            doctor.consultation_fee = Decimal(str(fee))
        
        # Update notification settings if provided
        if 'patient_notification_method' in data:
            valid_methods = ['email', 'sms', 'both']
            if data['patient_notification_method'] in valid_methods:
                doctor.patient_notification_method = data['patient_notification_method']
        
        if 'notification_settings' in data and isinstance(data['notification_settings'], dict):
            doctor.notification_settings = data['notification_settings']
        
        db.session.commit()
        
        app_logger.info(f"Updated participation settings for doctor {current_user.id}")
        return success_response(
            message="Participation settings updated successfully",
            data={
                'participation_type': doctor.participation_type,
                'consultation_fee': str(doctor.consultation_fee),
                'participation_changed_at': doctor.participation_changed_at.isoformat()
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update doctor participation settings error for user {current_user.id}: {str(e)}")
        return error_response("Failed to update participation settings", 500)

@user_settings_bp.route('/doctor/switch-to-volunteer', methods=['POST'])
@login_required
def switch_to_volunteer():
    """
    Switch doctor to volunteer participation type
    """
    try:
        if current_user.user_type != 'doctor':
            return error_response("Access denied. Doctor account required.", 403)
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        if not doctor.can_change_participation:
            return error_response("Participation type changes are restricted for your account.", 403)
        
        if doctor.participation_type == 'volunteer':
            return validation_error_response("You are already a volunteer doctor")
        
        # Switch to volunteer and set fee to 0
        doctor.participation_type = 'volunteer'
        doctor.consultation_fee = Decimal('0.00')
        doctor.participation_changed_at = datetime.utcnow()
        
        db.session.commit()
        
        app_logger.info(f"Doctor {current_user.id} switched to volunteer participation")
        return success_response(
            message="Successfully switched to volunteer participation. Your consultation fee has been set to 0.",
            data={
                'participation_type': 'volunteer',
                'consultation_fee': '0.00',
                'changed_at': doctor.participation_changed_at.isoformat()
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Switch to volunteer error for doctor {current_user.id}: {str(e)}")
        return error_response("Failed to switch to volunteer participation", 500)

@user_settings_bp.route('/doctor/switch-to-paid', methods=['POST'])
@login_required
def switch_to_paid():
    """
    Switch doctor to paid participation type with consultation fee
    """
    try:
        if current_user.user_type != 'doctor':
            return error_response("Access denied. Doctor account required.", 403)
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        if not doctor.can_change_participation:
            return error_response("Participation type changes are restricted for your account.", 403)
        
        if doctor.participation_type == 'paid':
            return validation_error_response("You are already a paid doctor")
        
        data = request.get_json()
        if not data or 'consultation_fee' not in data:
            return validation_error_response("Consultation fee is required when switching to paid participation")
        
        fee = data['consultation_fee']
        
        # Validate consultation fee for paid doctors
        fee_validation = validate_consultation_fee(fee, 'paid')
        if not fee_validation['valid']:
            return validation_error_response(fee_validation['message'])
        
        # Switch to paid and set the fee
        doctor.participation_type = 'paid'
        doctor.consultation_fee = Decimal(str(fee))
        doctor.participation_changed_at = datetime.utcnow()
        
        db.session.commit()
        
        app_logger.info(f"Doctor {current_user.id} switched to paid participation with fee {fee}")
        return success_response(
            message=f"Successfully switched to paid participation. Your consultation fee is set to {fee}.",
            data={
                'participation_type': 'paid',
                'consultation_fee': str(doctor.consultation_fee),
                'changed_at': doctor.participation_changed_at.isoformat()
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Switch to paid error for doctor {current_user.id}: {str(e)}")
        return error_response("Failed to switch to paid participation", 500)

@user_settings_bp.route('/doctor/notification-settings', methods=['PUT'])
@login_required
def update_doctor_notification_settings():
    """
    Update doctor's notification preferences
    """
    try:
        if current_user.user_type != 'doctor':
            return error_response("Access denied. Doctor account required.", 403)
        
        doctor = current_user.get_profile()
        if not doctor:
            return not_found_response("Doctor profile")
        
        data = request.get_json()
        if not data:
            return validation_error_response("No data provided")
        
        # Update patient notification method
        if 'patient_notification_method' in data:
            valid_methods = ['email', 'sms', 'both']
            if data['patient_notification_method'] not in valid_methods:
                return validation_error_response(f"Invalid notification method. Must be one of: {', '.join(valid_methods)}")
            doctor.patient_notification_method = data['patient_notification_method']
        
        # Update detailed notification settings
        if 'notification_settings' in data:
            if not isinstance(data['notification_settings'], dict):
                return validation_error_response("Notification settings must be a valid object")
            doctor.notification_settings = data['notification_settings']
        
        db.session.commit()
        
        app_logger.info(f"Updated notification settings for doctor {current_user.id}")
        return success_response(
            message="Notification settings updated successfully",
            data={
                'patient_notification_method': doctor.patient_notification_method,
                'notification_settings': doctor.notification_settings
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update doctor notification settings error for user {current_user.id}: {str(e)}")
        return error_response("Failed to update notification settings", 500)

# =============================================================================
# PATIENT SETTINGS MANAGEMENT
# =============================================================================

@user_settings_bp.route('/patient/preferences', methods=['GET'])
@login_required
def get_patient_preferences():
    """
    Get patient's current preferences and settings
    """
    try:
        if current_user.user_type != 'patient':
            return error_response("Access denied. Patient account required.", 403)
        
        patient = current_user.get_profile()
        if not patient:
            return not_found_response("Patient profile")
        
        preferences = {
            'preferred_contact_method': patient.preferred_contact_method,
            'notification_preferences': patient.notification_preferences or {},
            'medical_history_completed': patient.medical_history_completed,
            'medical_history_last_updated': patient.medical_history_last_updated.isoformat() if patient.medical_history_last_updated else None,
            'language_preference': current_user.language_preference
        }
        
        app_logger.info(f"Retrieved preferences for patient {current_user.id}")
        return success_response(
            message="Patient preferences retrieved successfully",
            data={'preferences': preferences}
        )
        
    except Exception as e:
        app_logger.error(f"Get patient preferences error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get patient preferences", 500)

@user_settings_bp.route('/patient/preferences', methods=['PUT'])
@login_required
def update_patient_preferences():
    """
    Update patient's preferences and settings
    """
    try:
        if current_user.user_type != 'patient':
            return error_response("Access denied. Patient account required.", 403)
        
        patient = current_user.get_profile()
        if not patient:
            return not_found_response("Patient profile")
        
        data = request.get_json()
        if not data:
            return validation_error_response("No data provided")
        
        # Update preferred contact method
        if 'preferred_contact_method' in data:
            valid_methods = ['email', 'sms', 'both']
            if data['preferred_contact_method'] not in valid_methods:
                return validation_error_response(f"Invalid contact method. Must be one of: {', '.join(valid_methods)}")
            patient.preferred_contact_method = data['preferred_contact_method']
        
        # Update notification preferences
        if 'notification_preferences' in data:
            if not isinstance(data['notification_preferences'], dict):
                return validation_error_response("Notification preferences must be a valid object")
            patient.notification_preferences = data['notification_preferences']
        
        # Update language preference
        if 'language_preference' in data:
            valid_languages = ['ar', 'en']
            if data['language_preference'] not in valid_languages:
                return validation_error_response(f"Invalid language. Must be one of: {', '.join(valid_languages)}")
            current_user.language_preference = data['language_preference']
        
        db.session.commit()
        
        app_logger.info(f"Updated preferences for patient {current_user.id}")
        return success_response(
            message="Patient preferences updated successfully",
            data={
                'preferred_contact_method': patient.preferred_contact_method,
                'notification_preferences': patient.notification_preferences,
                'language_preference': current_user.language_preference
            }
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update patient preferences error for user {current_user.id}: {str(e)}")
        return error_response("Failed to update patient preferences", 500)

# =============================================================================
# GENERAL USER SETTINGS
# =============================================================================

@user_settings_bp.route('/profile', methods=['GET'])
@login_required
def get_user_profile():
    """
    Get user's general profile information
    """
    try:
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        user_data = current_user.to_dict()
        profile_data = profile.to_dict()
        
        app_logger.info(f"Retrieved profile for user {current_user.id}")
        return success_response(
            message="User profile retrieved successfully",
            data={
                'user': user_data,
                'profile': profile_data
            }
        )
        
    except Exception as e:
        app_logger.error(f"Get user profile error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get user profile", 500)

@user_settings_bp.route('/language', methods=['PUT'])
@login_required
def update_language_preference():
    """
    Update user's language preference
    """
    try:
        data = request.get_json()
        if not data or 'language' not in data:
            return validation_error_response("Language is required")
        
        language = data['language']
        valid_languages = ['ar', 'en']
        
        if language not in valid_languages:
            return validation_error_response(f"Invalid language. Must be one of: {', '.join(valid_languages)}")
        
        current_user.language_preference = language
        db.session.commit()
        
        app_logger.info(f"Updated language preference to {language} for user {current_user.id}")
        return success_response(
            message="Language preference updated successfully",
            data={'language_preference': language}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update language preference error for user {current_user.id}: {str(e)}")
        return error_response("Failed to update language preference", 500)

@user_settings_bp.route('/password', methods=['PUT'])
@login_required
def change_password():
    """
    Change user's password
    """
    try:
        data = request.get_json()
        required_fields = ['current_password', 'new_password']
        
        validation_result = validate_json_data(data, required_fields)
        if not validation_result['valid']:
            return validation_error_response(validation_result['message'])
        
        # Verify current password
        if not current_user.check_password(data['current_password']):
            return validation_error_response("Current password is incorrect")
        
        # Validate new password
        from utils.validators import validate_password
        password_validation = validate_password(data['new_password'])
        if not password_validation['valid']:
            return validation_error_response(password_validation['message'])
        
        # Update password
        current_user.set_password(data['new_password'])
        db.session.commit()
        
        app_logger.info(f"Password changed for user {current_user.id}")
        return success_response(message="Password changed successfully")
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Change password error for user {current_user.id}: {str(e)}")
        return error_response("Failed to change password", 500)

# =============================================================================
# SETTINGS SUMMARY
# =============================================================================

@user_settings_bp.route('/summary', methods=['GET'])
@login_required
def get_settings_summary():
    """
    Get a summary of all user settings and preferences
    """
    try:
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        summary = {
            'user_info': {
                'full_name': current_user.full_name,
                'email': current_user.email,
                'user_type': current_user.user_type,
                'language_preference': current_user.language_preference,
                'is_verified': current_user.is_verified
            }
        }
        
        # Add type-specific settings
        if current_user.user_type == 'doctor':
            summary['doctor_settings'] = {
                'specialty': profile.specialty,
                'participation_type': profile.participation_type,
                'consultation_fee': str(profile.consultation_fee) if profile.consultation_fee else '0.00',
                'can_change_participation': profile.can_change_participation,
                'patient_notification_method': profile.patient_notification_method,
                'is_verified': profile.is_verified
            }
        elif current_user.user_type == 'patient':
            summary['patient_settings'] = {
                'preferred_contact_method': profile.preferred_contact_method,
                'medical_history_completed': profile.medical_history_completed,
                'medical_history_last_updated': profile.medical_history_last_updated.isoformat() if profile.medical_history_last_updated else None
            }
        
        app_logger.info(f"Retrieved settings summary for user {current_user.id}")
        return success_response(
            message="Settings summary retrieved successfully",
            data={'summary': summary}
        )
        
    except Exception as e:
        app_logger.error(f"Get settings summary error for user {current_user.id}: {str(e)}")
        return error_response("Failed to get settings summary", 500)