from flask import Blueprint, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_

from models import db, Prescription, Patient, Doctor, Appointment
from utils.responses import success_response, error_response, validation_error_response, not_found_response, forbidden_response, ErrorCodes
from utils.validators import validate_prescription_data, validate_prescription_status, validate_json_data, sanitize_input
from utils.logging_config import app_logger
from routes.auth import api_login_required

prescriptions_bp = Blueprint('prescriptions', __name__)

@prescriptions_bp.route('/', methods=['GET'])
@api_login_required
def get_prescriptions():
    """
    Get user's prescriptions (patients see their own, doctors see their prescribed)
    Following established patterns from appointments.py
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 10, type=int), 50)
        status_filter = request.args.get('status', '')
        
        profile = current_user.get_profile()
        if not profile:
            app_logger.warning(f"User {current_user.id} has no profile")
            return not_found_response("User profile")
        
        # Build query based on user type
        if current_user.user_type == 'patient':
            query = Prescription.query.filter_by(patient_id=profile.id)
        elif current_user.user_type == 'doctor':
            query = Prescription.query.filter_by(doctor_id=profile.id)
        else:
            app_logger.warning(f"Invalid user type {current_user.user_type} for prescriptions")
            return forbidden_response("Access denied")
        
        # Apply status filter if provided
        if status_filter and validate_prescription_status(status_filter)['valid']:
            query = query.filter_by(status=status_filter.lower())
        
        # Order by most recent first
        query = query.order_by(Prescription.created_at.desc())
        
        # Paginate results
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        prescriptions = [p.to_dict() for p in paginated.items]
        
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
        
        app_logger.info(f"Retrieved {len(prescriptions)} prescriptions for user {current_user.id}")
        return success_response(
            message="Prescriptions retrieved successfully",
            data={'prescriptions': prescriptions},
            meta=meta
        )
        
    except Exception as e:
        app_logger.error(f"Error getting prescriptions for user {current_user.id}: {str(e)}")
        return error_response("Failed to retrieve prescriptions", 500)

@prescriptions_bp.route('/<int:prescription_id>', methods=['GET'])
@login_required
def get_prescription_details(prescription_id):
    """
    Get detailed prescription information
    Following established patterns from appointments.py
    """
    try:
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            app_logger.warning(f"Prescription {prescription_id} not found")
            return not_found_response("Prescription", prescription_id)
        
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        # Check access permissions
        has_access = False
        if current_user.user_type == 'patient' and prescription.patient_id == profile.id:
            has_access = True
        elif current_user.user_type == 'doctor' and prescription.doctor_id == profile.id:
            has_access = True
        
        if not has_access:
            app_logger.warning(f"User {current_user.id} denied access to prescription {prescription_id}")
            return forbidden_response("Access denied to this prescription")
        
        app_logger.info(f"Retrieved prescription {prescription_id} for user {current_user.id}")
        return success_response(
            message="Prescription details retrieved successfully",
            data={'prescription': prescription.to_dict()}
        )
        
    except Exception as e:
        app_logger.error(f"Error getting prescription {prescription_id}: {str(e)}")
        return error_response("Failed to retrieve prescription details", 500)

@prescriptions_bp.route('/', methods=['POST'])
@login_required
def create_prescription():
    """
    Create a new prescription (doctors only)
    Following established patterns from appointments.py
    """
    try:
        # Only doctors can create prescriptions
        if current_user.user_type != 'doctor':
            app_logger.warning(f"Non-doctor user {current_user.id} attempted to create prescription")
            return forbidden_response("Only doctors can create prescriptions")
        
        data = request.get_json()
        if not data:
            return error_response("No data provided")
        
        # Validate required fields
        required_fields = ['appointment_id', 'patient_id', 'medication_name', 'dosage', 'frequency', 'duration']
        validation_result = validate_json_data(data, required_fields)
        if not validation_result['valid']:
            return validation_error_response('data', validation_result['message'])
        
        # Validate prescription data
        prescription_validation = validate_prescription_data(data)
        if not prescription_validation['valid']:
            return validation_error_response('prescription_data', prescription_validation['message'])
        
        doctor_profile = current_user.get_profile()
        if not doctor_profile:
            return not_found_response("Doctor profile")
        
        # Verify appointment exists and belongs to this doctor
        appointment = Appointment.query.filter_by(
            id=data['appointment_id'],
            doctor_id=doctor_profile.id
        ).first()
        if not appointment:
            app_logger.warning(f"Doctor {doctor_profile.id} tried to create prescription for invalid appointment {data['appointment_id']}")
            return not_found_response("Appointment")
        
        # Verify patient
        patient = Patient.query.get(data['patient_id'])
        if not patient or patient.id != appointment.patient_id:
            app_logger.warning(f"Patient mismatch for prescription: {data['patient_id']} vs {appointment.patient_id}")
            return error_response("Invalid patient for this appointment")
        
        # Create prescription
        prescription = Prescription(
            appointment_id=appointment.id,
            patient_id=patient.id,
            doctor_id=doctor_profile.id,
            medication_name=sanitize_input(data['medication_name'], 200),
            dosage=sanitize_input(data['dosage'], 100),
            frequency=sanitize_input(data['frequency'], 100),
            duration=sanitize_input(data['duration'], 100),
            quantity=sanitize_input(data.get('quantity', ''), 50) if data.get('quantity') else None,
            instructions=sanitize_input(data.get('instructions', ''), 1000) if data.get('instructions') else None,
            notes=sanitize_input(data.get('notes', ''), 1000) if data.get('notes') else None,
            refills_allowed=max(0, min(int(data.get('refills_allowed', 0)), 10)),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d') if data.get('start_date') else None,
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d') if data.get('end_date') else None
        )
        
        db.session.add(prescription)
        db.session.commit()
        
        app_logger.info(f"Doctor {doctor_profile.id} created prescription {prescription.id} for patient {patient.id}")
        return success_response(
            message="Prescription created successfully",
            data={'prescription': prescription.to_dict()},
            status_code=201
        )
        
    except ValueError as e:
        app_logger.error(f"Date parsing error in create prescription: {str(e)}")
        return validation_error_response('date', 'Invalid date format. Use YYYY-MM-DD')
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error creating prescription: {str(e)}")
        return error_response("Failed to create prescription", 500)

@prescriptions_bp.route('/<int:prescription_id>', methods=['PUT'])
@login_required
def update_prescription(prescription_id):
    """
    Update prescription details (doctors only for their own prescriptions)
    Following established patterns from appointments.py
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can update prescriptions")
        
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return not_found_response("Prescription", prescription_id)
        
        doctor_profile = current_user.get_profile()
        if not doctor_profile or prescription.doctor_id != doctor_profile.id:
            app_logger.warning(f"Doctor {current_user.id} denied access to prescription {prescription_id}")
            return forbidden_response("Access denied to this prescription")
        
        data = request.get_json()
        if not data:
            return error_response("No data provided")
        
        # Validate prescription data if provided
        if any(key in data for key in ['medication_name', 'dosage', 'frequency', 'duration']):
            prescription_validation = validate_prescription_data({**prescription.to_dict(), **data})
            if not prescription_validation['valid']:
                return validation_error_response('prescription_data', prescription_validation['message'])
        
        # Update fields
        updateable_fields = [
            'medication_name', 'dosage', 'frequency', 'duration', 'quantity',
            'instructions', 'notes', 'refills_allowed', 'status'
        ]
        
        updated_fields = []
        for field in updateable_fields:
            if field in data:
                if field == 'status':
                    # Validate status
                    status_validation = validate_prescription_status(data[field])
                    if not status_validation['valid']:
                        return validation_error_response('status', status_validation['message'])
                    setattr(prescription, field, data[field].lower())
                elif field == 'refills_allowed':
                    setattr(prescription, field, max(0, min(int(data[field]), 10)))
                elif field in ['medication_name', 'dosage', 'frequency', 'duration']:
                    setattr(prescription, field, sanitize_input(data[field], 200 if field == 'medication_name' else 100))
                elif field in ['instructions', 'notes']:
                    setattr(prescription, field, sanitize_input(data[field], 1000) if data[field] else None)
                else:
                    setattr(prescription, field, sanitize_input(data[field], 50) if data[field] else None)
                updated_fields.append(field)
        
        # Handle date updates
        for date_field in ['start_date', 'end_date']:
            if date_field in data:
                if data[date_field]:
                    try:
                        setattr(prescription, date_field, datetime.strptime(data[date_field], '%Y-%m-%d'))
                        updated_fields.append(date_field)
                    except ValueError:
                        return validation_error_response(date_field, 'Invalid date format. Use YYYY-MM-DD')
                else:
                    setattr(prescription, date_field, None)
                    updated_fields.append(date_field)
        
        if updated_fields:
            prescription.updated_at = datetime.utcnow()
            db.session.commit()
            app_logger.info(f"Doctor {doctor_profile.id} updated prescription {prescription_id}, fields: {updated_fields}")
        
        return success_response(
            message="Prescription updated successfully",
            data={'prescription': prescription.to_dict()}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error updating prescription {prescription_id}: {str(e)}")
        return error_response("Failed to update prescription", 500)

@prescriptions_bp.route('/<int:prescription_id>/status', methods=['PUT'])
@login_required
def update_prescription_status(prescription_id):
    """
    Update prescription status (doctors and patients can update certain statuses)
    Following established patterns from appointments.py
    """
    try:
        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return not_found_response("Prescription", prescription_id)
        
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        # Check access permissions
        has_access = False
        if current_user.user_type == 'patient' and prescription.patient_id == profile.id:
            has_access = True
        elif current_user.user_type == 'doctor' and prescription.doctor_id == profile.id:
            has_access = True
        
        if not has_access:
            return forbidden_response("Access denied to this prescription")
        
        data = request.get_json()
        if not data or 'status' not in data:
            return error_response("Status is required")
        
        # Validate status
        status_validation = validate_prescription_status(data['status'])
        if not status_validation['valid']:
            return validation_error_response('status', status_validation['message'])
        
        new_status = data['status'].lower()
        
        # Check status transition rules
        if current_user.user_type == 'patient':
            # Patients can only mark as completed
            if new_status not in ['completed']:
                return forbidden_response("Patients can only mark prescriptions as completed")
        
        old_status = prescription.status
        prescription.status = new_status
        prescription.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        app_logger.info(f"User {current_user.id} updated prescription {prescription_id} status from {old_status} to {new_status}")
        return success_response(
            message="Prescription status updated successfully",
            data={'prescription': prescription.to_dict()}
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error updating prescription status {prescription_id}: {str(e)}")
        return error_response("Failed to update prescription status", 500)

@prescriptions_bp.route('/patient/<int:patient_id>', methods=['GET'])
@login_required
def get_patient_prescriptions(patient_id):
    """
    Get prescriptions for a specific patient (doctors only)
    Following established patterns from appointments.py
    """
    try:
        if current_user.user_type != 'doctor':
            return forbidden_response("Only doctors can view patient prescriptions")
        
        doctor_profile = current_user.get_profile()
        if not doctor_profile:
            return not_found_response("Doctor profile")
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return not_found_response("Patient", patient_id)
        
        # Only show prescriptions this doctor prescribed
        prescriptions = Prescription.query.filter_by(
            patient_id=patient_id,
            doctor_id=doctor_profile.id
        ).order_by(Prescription.created_at.desc()).all()
        
        prescription_data = [p.to_dict() for p in prescriptions]
        
        app_logger.info(f"Doctor {doctor_profile.id} retrieved {len(prescriptions)} prescriptions for patient {patient_id}")
        return success_response(
            message="Patient prescriptions retrieved successfully",
            data={
                'prescriptions': prescription_data,
                'patient_name': patient.user.get_full_name()
            }
        )
        
    except Exception as e:
        app_logger.error(f"Error getting patient prescriptions: {str(e)}")
        return error_response("Failed to retrieve patient prescriptions", 500)

@prescriptions_bp.route('/stats', methods=['GET'])
@login_required
def get_prescription_stats():
    """
    Get prescription statistics for the user
    Following established patterns from appointments.py
    """
    try:
        profile = current_user.get_profile()
        if not profile:
            return not_found_response("User profile")
        
        if current_user.user_type == 'patient':
            # Patient statistics
            total = Prescription.query.filter_by(patient_id=profile.id).count()
            active = Prescription.query.filter_by(patient_id=profile.id, status='active').count()
            completed = Prescription.query.filter_by(patient_id=profile.id, status='completed').count()
            
            stats = {
                'total_prescriptions': total,
                'active_prescriptions': active,
                'completed_prescriptions': completed,
                'cancelled_prescriptions': Prescription.query.filter_by(patient_id=profile.id, status='cancelled').count()
            }
            
        elif current_user.user_type == 'doctor':
            # Doctor statistics
            total = Prescription.query.filter_by(doctor_id=profile.id).count()
            this_month = Prescription.query.filter(
                Prescription.doctor_id == profile.id,
                Prescription.created_at >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            ).count()
            
            stats = {
                'total_prescribed': total,
                'prescribed_this_month': this_month,
                'active_prescriptions': Prescription.query.filter_by(doctor_id=profile.id, status='active').count(),
                'patients_with_prescriptions': db.session.query(Prescription.patient_id).filter_by(doctor_id=profile.id).distinct().count()
            }
        else:
            return forbidden_response("Invalid user type")
        
        app_logger.info(f"Retrieved prescription stats for user {current_user.id}")
        return success_response(
            message="Prescription statistics retrieved successfully",
            data={'stats': stats}
        )
        
    except Exception as e:
        app_logger.error(f"Error getting prescription stats: {str(e)}")
        return error_response("Failed to retrieve prescription statistics", 500)