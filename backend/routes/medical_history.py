from flask import Blueprint, request
from flask_login import current_user
from routes.auth import api_login_required
from datetime import datetime
from typing import Dict, Any

from models import db, Patient, Doctor, MedicalHistoryUpdate, Appointment
from utils.responses import success_response, error_response, validation_error_response, not_found_response, forbidden_response, ErrorCodes
from utils.validators import validate_medical_history_data, validate_blood_type, validate_history_update_type, validate_json_data, sanitize_input
from utils.logging_config import app_logger

medical_history_bp = Blueprint('medical_history', __name__, url_prefix='/medical-history')

@medical_history_bp.route('/patient/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_medical_history(patient_id):
    """
    Get patient's complete medical history
    Patients can access their own, doctors can access their patients during appointments
    Following established patterns from appointments.py and prescriptions.py
    """
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return not_found_response("Patient", patient_id)
        
        # Check access permissions
        can_access = False
        user_profile = current_user.get_profile()
        if not user_profile:
            return not_found_response("User profile")
        
        if current_user.user_type == 'patient' and patient.id == user_profile.id:
            can_access = True
        elif current_user.user_type == 'doctor':
            # Doctor can access if they have an appointment with this patient
            has_appointment = Appointment.query.filter_by(
                patient_id=patient_id,
                doctor_id=user_profile.id
            ).first()
            if has_appointment:
                can_access = True
        
        if not can_access:
            app_logger.warning(f"User {current_user.id} denied access to medical history of patient {patient_id}")
            return forbidden_response("Access denied to this patient's medical history")
        
        # Get complete medical history
        medical_history = patient.to_dict()
        
        # Get history updates for audit trail (if doctor or own records)
        history_updates = []
        if current_user.user_type == 'doctor' or (current_user.user_type == 'patient' and patient.id == user_profile.id):
            updates = MedicalHistoryUpdate.query.filter_by(patient_id=patient_id).order_by(
                MedicalHistoryUpdate.created_at.desc()
            ).limit(10).all()
            history_updates = [update.to_dict() for update in updates]
        
        app_logger.info(f"Retrieved medical history for patient {patient_id} by user {current_user.id}")
        return success_response(
            message="Medical history retrieved successfully",
            data={
                'patient_medical_history': medical_history,
                'recent_updates': history_updates,
                'history_completed': patient.medical_history_completed
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error getting medical history for patient {patient_id}: {str(e)}")
        return error_response("Failed to retrieve medical history", 500)

@medical_history_bp.route('/complete', methods=['POST'])
@api_login_required
def complete_medical_history():
    """
    Complete medical history during initial registration or update
    Following established patterns
    """
    try:
        if current_user.user_type != 'patient':
            return forbidden_response("Only patients can complete their medical history")
        
        patient = current_user.get_profile()
        if not patient:
            return not_found_response("Patient profile")
        
        data = request.get_json()
        if not data:
            return error_response("No data provided")
        
        # Validate medical history data
        validation_result = validate_medical_history_data(data)
        if not validation_result['valid']:
            return validation_error_response('medical_history', validation_result['message'])
        
        # Validate blood type if provided
        if 'blood_type' in data and data['blood_type']:
            blood_type_validation = validate_blood_type(data['blood_type'])
            if not blood_type_validation['valid']:
                return validation_error_response('blood_type', blood_type_validation['message'])
        
        # Prepare previous values for audit trail
        previous_values = {}
        updated_fields = []
        
        # Update medical history fields
        medical_fields = [
            'medical_history', 'allergies', 'current_medications', 'chronic_conditions',
            'family_history', 'surgical_history', 'smoking_status', 'alcohol_consumption',
            'exercise_frequency', 'height', 'weight', 'blood_type'
        ]
        
        for field in medical_fields:
            if field in data:
                # Store previous value
                previous_values[field] = getattr(patient, field)
                
                # Update with new value
                if field in ['height', 'weight'] and data[field]:
                    setattr(patient, field, float(data[field]))
                elif field == 'blood_type' and data[field]:
                    setattr(patient, field, data[field].upper())
                elif data[field]:  # Text fields and enums
                    max_length = 2000 if field in ['medical_history', 'family_history', 'surgical_history'] else 1000
                    setattr(patient, field, sanitize_input(str(data[field]), max_length))
                else:
                    setattr(patient, field, None)
                
                updated_fields.append(field)
        
        # Mark medical history as completed
        patient.medical_history_completed = True
        patient.medical_history_last_updated = datetime.utcnow()
        
        # Create history update record
        update_type = 'initial_registration' if not any(previous_values.values()) else 'patient_self_update'
        
        history_update = MedicalHistoryUpdate(
            patient_id=patient.id,
            update_type=update_type,
            updated_fields=updated_fields,
            previous_values=previous_values,
            new_values={field: getattr(patient, field) for field in updated_fields},
            notes=data.get('notes', 'Medical history completed by patient')
        )
        
        db.session.add(history_update)
        db.session.commit()
        
        app_logger.info(f"Patient {patient.id} completed medical history with {len(updated_fields)} fields updated")
        return success_response(
            message="Medical history completed successfully",
            data={'patient_medical_history': patient.to_dict()},
            status_code=201 if update_type == 'initial_registration' else 200
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error completing medical history: {str(e)}")
        return error_response("Failed to complete medical history", 500)

@medical_history_bp.route('/update', methods=['PUT'])
@api_login_required
def update_medical_history():
    """
    Update medical history (patients or doctors during appointments)
    Following established patterns
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided")
        
        # Determine patient and permissions
        patient_id = data.get('patient_id')
        appointment_id = data.get('appointment_id')
        
        if current_user.user_type == 'patient':
            patient = current_user.get_profile()
            if not patient:
                return not_found_response("Patient profile")
            update_type = 'patient_self_update'
            updated_by_doctor_id = None
            
        elif current_user.user_type == 'doctor':
            if not patient_id:
                return error_response("Patient ID is required for doctor updates")
            
            patient = Patient.query.get(patient_id)
            if not patient:
                return not_found_response("Patient", patient_id)
            
            doctor = current_user.get_profile()
            if not doctor:
                return not_found_response("Doctor profile")
            
            # Verify doctor has access to this patient
            if appointment_id:
                appointment = Appointment.query.filter_by(
                    id=appointment_id,
                    patient_id=patient_id,
                    doctor_id=doctor.id
                ).first()
                if not appointment:
                    return forbidden_response("Invalid appointment or access denied")
                update_type = 'appointment_update'
            else:
                update_type = 'doctor_update'
            
            updated_by_doctor_id = doctor.id
        else:
            return forbidden_response("Invalid user type")
        
        # Validate medical history data
        validation_result = validate_medical_history_data(data)
        if not validation_result['valid']:
            return validation_error_response('medical_history', validation_result['message'])
        
        # Prepare previous values for audit trail
        previous_values = {}
        updated_fields = []
        
        # Update medical history fields
        medical_fields = [
            'medical_history', 'allergies', 'current_medications', 'chronic_conditions',
            'family_history', 'surgical_history', 'smoking_status', 'alcohol_consumption',
            'exercise_frequency', 'height', 'weight', 'blood_type'
        ]
        
        for field in medical_fields:
            if field in data:
                # Store previous value
                previous_values[field] = getattr(patient, field)
                
                # Update with new value
                if field in ['height', 'weight'] and data[field]:
                    setattr(patient, field, float(data[field]))
                elif field == 'blood_type' and data[field]:
                    setattr(patient, field, data[field].upper())
                elif data[field]:  # Text fields and enums
                    max_length = 2000 if field in ['medical_history', 'family_history', 'surgical_history'] else 1000
                    setattr(patient, field, sanitize_input(str(data[field]), max_length))
                else:
                    setattr(patient, field, None)
                
                updated_fields.append(field)
        
        if updated_fields:
            # Update timestamp
            patient.medical_history_last_updated = datetime.utcnow()
            
            # Create history update record
            history_update = MedicalHistoryUpdate(
                patient_id=patient.id,
                appointment_id=appointment_id,
                updated_by_doctor_id=updated_by_doctor_id,
                update_type=update_type,
                updated_fields=updated_fields,
                previous_values=previous_values,
                new_values={field: getattr(patient, field) for field in updated_fields},
                notes=data.get('notes', f'Medical history updated by {current_user.user_type}')
            )
            
            db.session.add(history_update)
            db.session.commit()
            
            app_logger.info(f"Medical history updated for patient {patient.id} by {current_user.user_type} {current_user.id}, fields: {updated_fields}")
        
        return success_response(
            message="Medical history updated successfully",
            data={'patient_medical_history': patient.to_dict()}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error updating medical history: {str(e)}")
        return error_response("Failed to update medical history", 500)

@medical_history_bp.route('/check-completion', methods=['GET'])
@api_login_required
def check_medical_history_completion():
    """
    Check if patient's medical history is completed
    Used to prompt completion during login or appointment booking
    Following established patterns
    """
    try:
        if current_user.user_type != 'patient':
            return forbidden_response("Only patients can check their medical history completion status")
        
        patient = current_user.get_profile()
        if not patient:
            return not_found_response("Patient profile")
        
        # Calculate completion percentage
        required_fields = ['medical_history', 'allergies', 'current_medications']
        optional_fields = ['chronic_conditions', 'family_history', 'surgical_history', 
                          'smoking_status', 'alcohol_consumption', 'exercise_frequency', 
                          'height', 'weight', 'blood_type']
        
        completed_required = sum(1 for field in required_fields if getattr(patient, field))
        completed_optional = sum(1 for field in optional_fields if getattr(patient, field))
        
        total_fields = len(required_fields) + len(optional_fields)
        completion_percentage = int(((completed_required + completed_optional) / total_fields) * 100)
        
        needs_completion = not patient.medical_history_completed or completed_required < len(required_fields)
        
        app_logger.info(f"Checked medical history completion for patient {patient.id}: {completion_percentage}%")
        return success_response(
            message="Medical history completion status retrieved",
            data={
                'completed': patient.medical_history_completed,
                'needs_completion': needs_completion,
                'completion_percentage': completion_percentage,
                'last_updated': patient.medical_history_last_updated.isoformat() if patient.medical_history_last_updated else None,
                'required_fields_completed': completed_required,
                'total_required_fields': len(required_fields)
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error checking medical history completion: {str(e)}")
        return error_response("Failed to check medical history completion", 500)

@medical_history_bp.route('/updates/<int:patient_id>', methods=['GET'])
@api_login_required
def get_medical_history_updates(patient_id):
    """
    Get medical history update audit trail
    Following established patterns with pagination
    """
    try:
        patient = Patient.query.get(patient_id)
        if not patient:
            return not_found_response("Patient", patient_id)
        
        # Check access permissions
        can_access = False
        user_profile = current_user.get_profile()
        if not user_profile:
            return not_found_response("User profile")
        
        if current_user.user_type == 'patient' and patient.id == user_profile.id:
            can_access = True
        elif current_user.user_type == 'doctor':
            # Doctor can access if they have treated this patient
            has_treated = Appointment.query.filter_by(
                patient_id=patient_id,
                doctor_id=user_profile.id
            ).first()
            if has_treated:
                can_access = True
        
        if not can_access:
            app_logger.warning(f"User {current_user.id} denied access to medical history updates of patient {patient_id}")
            return forbidden_response("Access denied")
        
        # Get paginated updates
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 50)
        
        updates_query = MedicalHistoryUpdate.query.filter_by(patient_id=patient_id).order_by(
            MedicalHistoryUpdate.created_at.desc()
        )
        
        paginated = updates_query.paginate(page=page, per_page=per_page, error_out=False)
        updates = [update.to_dict() for update in paginated.items]
        
        meta = {
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': paginated.total,
                'pages': paginated.pages,
                'has_next': paginated.has_next,
                'has_prev': paginated.has_prev
            }
        }
        
        app_logger.info(f"Retrieved {len(updates)} medical history updates for patient {patient_id}")
        return success_response(
            message="Medical history updates retrieved successfully",
            data={'updates': updates},
            meta=meta
        )
        
    except Exception as e:
        app_logger.error(f"Error getting medical history updates: {str(e)}")
        return error_response("Failed to retrieve medical history updates", 500)

@medical_history_bp.route('/appointment-prompt/<int:appointment_id>', methods=['GET'])
@api_login_required
def get_appointment_history_prompt(appointment_id):
    """
    Get medical history status and prompts for appointment
    Used to ask patients about changes before appointments
    Following established patterns
    """
    try:
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return not_found_response("Appointment", appointment_id)
        
        # Check access - patient or their doctor
        user_profile = current_user.get_profile()
        if not user_profile:
            return not_found_response("User profile")
        
        can_access = False
        if current_user.user_type == 'patient' and appointment.patient_id == user_profile.id:
            can_access = True
        elif current_user.user_type == 'doctor' and appointment.doctor_id == user_profile.id:
            can_access = True
        
        if not can_access:
            return forbidden_response("Access denied to this appointment")
        
        patient = appointment.patient
        
        # Check when medical history was last updated
        days_since_update = None
        if patient.medical_history_last_updated:
            days_since_update = (datetime.utcnow() - patient.medical_history_last_updated).days
        
        # Determine if update is needed
        needs_update = False
        prompt_message = ""
        
        if not patient.medical_history_completed:
            needs_update = True
            prompt_message = "Please complete your medical history before the appointment"
        elif days_since_update is None or days_since_update > 90:  # 3 months
            needs_update = True
            prompt_message = "Please review and update your medical history - it's been over 3 months since your last update"
        elif days_since_update > 30:  # 1 month
            needs_update = True
            prompt_message = "Please review your medical history for any changes since your last visit"
        
        app_logger.info(f"Medical history prompt for appointment {appointment_id}: needs_update={needs_update}")
        return success_response(
            message="Medical history appointment prompt retrieved",
            data={
                'appointment_id': appointment_id,
                'patient_id': patient.id,
                'needs_update': needs_update,
                'prompt_message': prompt_message,
                'last_updated': patient.medical_history_last_updated.isoformat() if patient.medical_history_last_updated else None,
                'days_since_update': days_since_update,
                'history_completed': patient.medical_history_completed
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error getting appointment history prompt: {str(e)}")
        return error_response("Failed to get appointment history prompt", 500)