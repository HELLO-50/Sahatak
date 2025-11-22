from flask import Blueprint, request
from flask_login import login_required, current_user
from datetime import datetime, timedelta
from sqlalchemy import or_, and_

from models import db, Prescription, Patient, Doctor, Appointment
from utils.responses import success_response, error_response, validation_error_response, not_found_response, forbidden_response, ErrorCodes
from utils.validators import validate_prescription_data, validate_prescription_status, validate_json_data, sanitize_input
from utils.logging_config import app_logger
from routes.auth import api_login_required
from services.email_service import send_prescription_notification

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
@api_login_required
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

        # Check if prescription should be expired
        if prescription.status == 'active' and prescription.end_date:
            if prescription.end_date.date() < datetime.utcnow().date():
                prescription.status = 'expired'
                prescription.updated_at = datetime.utcnow()
                db.session.commit()
                app_logger.info(f"Auto-expired prescription {prescription_id}")

        app_logger.info(f"Retrieved prescription {prescription_id} for user {current_user.id}")
        return success_response(
            message="Prescription details retrieved successfully",
            data={'prescription': prescription.to_dict()}
        )

    except Exception as e:
        app_logger.error(f"Error getting prescription {prescription_id}: {str(e)}")
        return error_response("Failed to retrieve prescription details", 500)

@prescriptions_bp.route('/', methods=['POST'])
@api_login_required
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
        
        # Parse dates if provided
        start_date = None
        end_date = None
        if data.get('start_date'):
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d')
        if data.get('end_date'):
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d')

        # Validate date range
        if start_date and end_date and start_date.date() >= end_date.date():
            return validation_error_response('dates', 'End date must be after start date')

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
            start_date=start_date,
            end_date=end_date
        )
        
        db.session.add(prescription)
        db.session.commit()

        app_logger.info(f"Doctor {doctor_profile.id} created prescription {prescription.id} for patient {patient.id}")

        # Send prescription notification email to patient
        try:
            patient_email = patient.user.email if hasattr(patient.user, 'email') else None
            patient_language = getattr(patient.user, 'language_preference', 'ar')

            if patient_email:
                # Prepare prescription data for email template
                prescription_dict = prescription.to_dict()
                prescription_dict.update({
                    'doctor_name': doctor_profile.user.get_full_name(),
                    'patient_name': patient.user.get_full_name(),
                    'prescribed_date': prescription.prescribed_date.strftime('%Y-%m-%d')
                })

                # Add formatted dates if they exist
                if prescription.start_date:
                    prescription_dict['start_date'] = prescription.start_date.strftime('%Y-%m-%d')
                if prescription.end_date:
                    prescription_dict['end_date'] = prescription.end_date.strftime('%Y-%m-%d')

                email_sent = send_prescription_notification(
                    recipient_email=patient_email,
                    prescription_data=prescription_dict,
                    language=patient_language
                )

                if email_sent:
                    app_logger.info(f"Prescription notification email sent to {patient_email}")
                    # Update prescription to mark email as sent
                    prescription.email_sent = True
                    prescription.email_sent_at = datetime.utcnow()
                    db.session.commit()
                else:
                    app_logger.warning(f"Failed to send prescription notification email to {patient_email}")
            else:
                app_logger.warning(f"Patient {patient.id} has no email address, skipping notification")
        except Exception as e:
            app_logger.error(f"Error sending prescription notification email: {str(e)}")
            # Don't fail the prescription creation if email fails

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
@api_login_required
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
        temp_start_date = prescription.start_date
        temp_end_date = prescription.end_date

        for date_field in ['start_date', 'end_date']:
            if date_field in data:
                if data[date_field]:
                    try:
                        parsed_date = datetime.strptime(data[date_field], '%Y-%m-%d')
                        if date_field == 'start_date':
                            temp_start_date = parsed_date
                        else:
                            temp_end_date = parsed_date
                        setattr(prescription, date_field, parsed_date)
                        updated_fields.append(date_field)
                    except ValueError:
                        return validation_error_response(date_field, 'Invalid date format. Use YYYY-MM-DD')
                else:
                    setattr(prescription, date_field, None)
                    if date_field == 'start_date':
                        temp_start_date = None
                    else:
                        temp_end_date = None
                    updated_fields.append(date_field)

        # Validate date range if both dates exist
        if temp_start_date and temp_end_date:
            start_compare = temp_start_date.date() if hasattr(temp_start_date, 'date') else temp_start_date
            end_compare = temp_end_date.date() if hasattr(temp_end_date, 'date') else temp_end_date
            if start_compare >= end_compare:
                db.session.rollback()
                return validation_error_response('dates', 'End date must be after start date')

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
@api_login_required
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
@api_login_required
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
@api_login_required
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

@prescriptions_bp.route('/<int:prescription_id>/refill', methods=['POST'])
@api_login_required
def request_refill(prescription_id):
    """
    Request a refill for a prescription (patients only)
    Increments refills_used if refills are available
    """
    try:
        if current_user.user_type != 'patient':
            return forbidden_response("Only patients can request refills")

        prescription = Prescription.query.get(prescription_id)
        if not prescription:
            return not_found_response("Prescription", prescription_id)

        profile = current_user.get_profile()
        if not profile or prescription.patient_id != profile.id:
            return forbidden_response("Access denied to this prescription")

        # Check if prescription is active
        if prescription.status != 'active':
            return error_response("Can only request refills for active prescriptions")

        # Check if refills are available
        if prescription.refills_used >= prescription.refills_allowed:
            return error_response("No refills remaining for this prescription")

        # Increment refills_used
        prescription.refills_used += 1
        prescription.updated_at = datetime.utcnow()
        db.session.commit()

        app_logger.info(f"Patient {profile.id} requested refill for prescription {prescription_id}, refills used: {prescription.refills_used}/{prescription.refills_allowed}")

        # TODO: Send notification to doctor about refill request
        # This could be implemented as an email or in-app notification

        return success_response(
            message="Refill requested successfully",
            data={
                'prescription': prescription.to_dict(),
                'refills_remaining': prescription.refills_allowed - prescription.refills_used
            }
        )

    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error requesting refill for prescription {prescription_id}: {str(e)}")
        return error_response("Failed to request refill", 500)

@prescriptions_bp.route('/expire-outdated', methods=['POST'])
@api_login_required
def expire_outdated_prescriptions():
    """
    Check and expire prescriptions that have passed their end_date
    This can be called periodically or manually by admins/system
    """
    try:
        # For security, limit this to admin/system calls
        # For now, any authenticated user can call it
        # TODO: Add admin-only restriction

        today = datetime.utcnow().date()

        # Find all active prescriptions with end_date in the past
        outdated_prescriptions = Prescription.query.filter(
            Prescription.status == 'active',
            Prescription.end_date.isnot(None),
            Prescription.end_date < today
        ).all()

        expired_count = 0
        for prescription in outdated_prescriptions:
            prescription.status = 'expired'
            prescription.updated_at = datetime.utcnow()
            expired_count += 1

        if expired_count > 0:
            db.session.commit()
            app_logger.info(f"Expired {expired_count} outdated prescriptions")

        return success_response(
            message=f"Checked prescriptions, expired {expired_count} prescriptions",
            data={'expired_count': expired_count}
        )

    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Error expiring outdated prescriptions: {str(e)}")
        return error_response("Failed to expire outdated prescriptions", 500)