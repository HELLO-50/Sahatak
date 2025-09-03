from flask import Blueprint, request, current_app
from flask_login import login_required, current_user
from models import db, Appointment, Doctor, Patient, User
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from sqlalchemy.orm import joinedload
from utils.responses import APIResponse, ErrorCodes
from utils.validators import validate_date, validate_appointment_type, validate_text_field_length
from utils.logging_config import app_logger, log_user_action
from utils.db_optimize import OptimizedQueries, QueryOptimizer, invalidate_appointment_cache, cached_query
from routes.auth import api_login_required

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/doctors', methods=['GET'])
@api_login_required
def get_available_doctors():
    """Get list of available doctors for appointment booking"""
    try:
        # Get query parameters
        specialty = request.args.get('specialty')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)  # Max 100 per page
        
        # Base query: verified and active doctors
        query = Doctor.query.filter_by(is_verified=True).join(User).filter_by(is_active=True)
        
        # Filter by specialty if provided
        if specialty:
            query = query.filter(Doctor.specialty.ilike(f'%{specialty}%'))
        
        # Pagination
        paginated_doctors = query.order_by(Doctor.rating.desc(), Doctor.total_reviews.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Format doctor data
        doctors_data = []
        for doctor in paginated_doctors.items:
            doctor_data = doctor.to_dict()
            # Add user information
            doctor_data['user'] = {
                'full_name': doctor.user.full_name,
                'email': doctor.user.email if doctor.user.email else None,
                'language_preference': doctor.user.language_preference
            }
            doctors_data.append(doctor_data)
        
        return APIResponse.success(
            data={
                'doctors': doctors_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated_doctors.total,
                    'pages': paginated_doctors.pages,
                    'has_next': paginated_doctors.has_next,
                    'has_prev': paginated_doctors.has_prev
                }
            },
            message='Available doctors retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get available doctors error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get available doctors')

@appointments_bp.route('/', methods=['GET'])
@api_login_required
def get_appointments():
    """Get user's appointments with optimized queries"""
    try:
        # Get appointments based on user type using optimized queries
        if current_user.user_type == 'patient':
            appointments = OptimizedQueries.get_patient_appointments(current_user.patient_profile.id)
        elif current_user.user_type == 'doctor':
            appointments = OptimizedQueries.get_doctor_appointments(current_user.doctor_profile.id)
        else:
            return APIResponse.validation_error(message='Invalid user type')
        
        return APIResponse.success(
            data={'appointments': [appointment.to_dict() for appointment in appointments]},
            message='Appointments retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get appointments error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get appointments')

@appointments_bp.route('/', methods=['POST'])
@login_required
def create_appointment():
    """Create new appointment (patients only)"""
    from utils.validators import validate_json_payload, validate_id_parameter, validate_enum_field, handle_api_errors
    
    try:
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can book appointments')
        
        # Check if patient has completed medical history
        patient = current_user.get_profile()
        if not patient:
            return APIResponse.error(message='Patient profile not found')
        
        # If medical history is not completed, return a special response
        if not patient.medical_history_completed:
            return APIResponse.error(
                message='Please complete your medical history before booking an appointment',
                status_code=428,  # Precondition Required
                error_code='MEDICAL_HISTORY_REQUIRED',
                data={'redirect': '/medical/patient/medical-history-form.html'}
            )
        
        data = request.get_json()
        
        # Validate JSON payload structure
        required_fields = ['doctor_id', 'appointment_date', 'appointment_type']
        optional_fields = ['notes']
        validation = validate_json_payload(data, required_fields, optional_fields)
        
        if not validation['valid']:
            return APIResponse.validation_error(
                message=validation['message'],
                field=validation.get('missing_fields', validation.get('unexpected_fields'))
            )
        
        # Validate doctor_id
        doctor_validation = validate_id_parameter(data['doctor_id'], 'doctor_id')
        if not doctor_validation['valid']:
            return APIResponse.validation_error(
                field='doctor_id',
                message=doctor_validation['message']
            )
        
        # Validate appointment_type
        allowed_types = ['video', 'audio', 'chat']
        type_validation = validate_enum_field(data['appointment_type'], allowed_types, 'appointment_type')
        if not type_validation['valid']:
            return APIResponse.validation_error(
                field='appointment_type',
                message=type_validation['message']
            )
        
        # Validate doctor exists and is verified
        doctor = Doctor.query.filter_by(id=data['doctor_id'], is_verified=True).join(User).filter_by(is_active=True).first()
        if not doctor:
            return APIResponse.validation_error(
                field='doctor_id',
                message='Doctor not found or not available'
            )
        
        # Validate appointment type
        appointment_type_validation = validate_appointment_type(data['appointment_type'])
        if not appointment_type_validation['valid']:
            return APIResponse.validation_error(
                field='appointment_type',
                message=appointment_type_validation['message']
            )
        
        # Validate text fields for length and content
        text_validations = [
            ('reason_for_visit', data.get('reason_for_visit', ''), 500, 0),
            ('symptoms', data.get('symptoms', ''), 1000, 0)
        ]
        
        for field_name, value, max_len, min_len in text_validations:
            if value:  # Only validate if field has content
                validation = validate_text_field_length(value, field_name, max_len, min_len)
                if not validation['valid']:
                    return APIResponse.validation_error(
                        field=field_name,
                        message=validation['message']
                    )
        
        # Parse and validate appointment date
        try:
            appointment_date = datetime.fromisoformat(data['appointment_date'])
        except ValueError:
            return APIResponse.validation_error(
                field='appointment_date',
                message='Invalid appointment date format'
            )
        
        # Check if appointment is in the future
        if appointment_date <= datetime.now():
            return APIResponse.validation_error(
                field='appointment_date',
                message='Appointment must be scheduled in the future'
            )
        
        # Use database transaction with SELECT FOR UPDATE to prevent race conditions
        try:
            # Begin transaction with row-level locking
            db.session.begin()
            
            # Lock and check availability atomically
            existing_appointment = Appointment.query.filter(
                and_(
                    Appointment.doctor_id == data['doctor_id'],
                    Appointment.appointment_date == appointment_date,
                    Appointment.status.in_(['scheduled', 'confirmed', 'in_progress', 'blocked'])
                )
            ).with_for_update().first()
            
            if existing_appointment:
                db.session.rollback()
                # Log double booking attempt for security monitoring
                log_user_action(
                    current_user.id,
                    'double_booking_attempt',
                    {
                        'doctor_id': data['doctor_id'],
                        'appointment_date': appointment_date.isoformat(),
                        'existing_appointment_id': existing_appointment.id,
                        'existing_status': existing_appointment.status
                    },
                    request
                )
                if existing_appointment.status == 'blocked':
                    return APIResponse.conflict(
                        message='This time slot is blocked by the doctor'
                    )
                else:
                    return APIResponse.conflict(
                        message='This time slot is already booked'
                    )
            
            # Create appointment with consultation fee from doctor profile
            appointment = Appointment(
                patient_id=current_user.patient_profile.id,
                doctor_id=data['doctor_id'],
                appointment_date=appointment_date,
                appointment_type=data['appointment_type'],
                reason_for_visit=data.get('reason_for_visit'),
                symptoms=data.get('symptoms'),
                consultation_fee=doctor.consultation_fee  # Auto-populate fee from doctor
            )
            
            db.session.add(appointment)
            db.session.commit()  # Commit the transaction
            
            # Invalidate related caches
            invalidate_appointment_cache()
            
        except Exception as e:
            db.session.rollback()
            app_logger.error(f"Error creating appointment: {str(e)}")
            return APIResponse.server_error(message='Failed to create appointment')
        
        # Log successful appointment creation
        log_user_action(
            current_user.id,
            'appointment_created',
            {
                'appointment_id': appointment.id,
                'doctor_id': data['doctor_id'],
                'appointment_type': data['appointment_type'],
                'appointment_date': appointment_date.isoformat()
            },
            request
        )
        
        app_logger.info(f"Appointment created: ID {appointment.id} by patient {current_user.id}")
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment created successfully',
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Create appointment error: {str(e)}")
        return APIResponse.internal_error(message='Failed to create appointment')

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@login_required
def get_appointment(appointment_id):
    """Get specific appointment details"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        
        # Check if user has access to this appointment
        if current_user.user_type == 'patient' and appointment.patient_id != current_user.patient_profile.id:
            return APIResponse.forbidden(message='Access denied')
        elif current_user.user_type == 'doctor' and appointment.doctor_id != current_user.doctor_profile.id:
            return APIResponse.forbidden(message='Access denied')
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment details retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get appointment error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get appointment')

@appointments_bp.route('/doctors/<int:doctor_id>/availability', methods=['GET'])
@login_required
def get_doctor_availability(doctor_id):
    """Get available time slots for a specific doctor"""
    try:
        # Validate doctor exists and is active
        doctor = Doctor.query.filter_by(id=doctor_id, is_verified=True).join(User).filter_by(is_active=True).first()
        if not doctor:
            return APIResponse.not_found(message='Doctor not found')
        
        # Get date parameter (default to today)
        date_str = request.args.get('date')
        if date_str:
            date_validation = validate_date(date_str)
            if not date_validation['valid']:
                return APIResponse.validation_error(
                    field='date',
                    message=date_validation['message']
                )
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        else:
            target_date = datetime.now().date()
        
        # Don't allow booking in the past
        if target_date < datetime.now().date():
            return APIResponse.validation_error(
                field='date',
                message='Cannot book appointments in the past'
            )
        
        # Get doctor's available hours (default 9 AM to 5 PM if not set)
        available_hours = doctor.available_hours or {
            'monday': {'start': '09:00', 'end': '17:00'},
            'tuesday': {'start': '09:00', 'end': '17:00'},
            'wednesday': {'start': '09:00', 'end': '17:00'},
            'thursday': {'start': '09:00', 'end': '17:00'},
            'sunday': {'start': '09:00', 'end': '17:00'}
        }
        
        # Get day of week
        day_name = target_date.strftime('%A').lower()
        
        if day_name not in available_hours:
            return APIResponse.success(
                data={'available_slots': []},
                message=f'Doctor is not available on {day_name.capitalize()}'
            )
        
        day_schedule = available_hours[day_name]
        start_time = datetime.strptime(day_schedule['start'], '%H:%M').time()
        end_time = datetime.strptime(day_schedule['end'], '%H:%M').time()
        
        # Generate 30-minute time slots
        slots = []
        current_time = datetime.combine(target_date, start_time)
        end_datetime = datetime.combine(target_date, end_time)
        
        while current_time < end_datetime:
            slot_end = current_time + timedelta(minutes=30)
            if slot_end <= end_datetime:
                slots.append({
                    'start': current_time.strftime('%H:%M'),
                    'end': slot_end.strftime('%H:%M'),
                    'datetime': current_time.isoformat()
                })
            current_time = slot_end
        
        # Check for existing appointments and blocked slots
        existing_appointments = Appointment.query.filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= datetime.combine(target_date, start_time),
                Appointment.appointment_date < datetime.combine(target_date + timedelta(days=1), datetime.min.time()),
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress', 'blocked'])
            )
        ).all()
        
        booked_times = set()
        for appointment in existing_appointments:
            booked_times.add(appointment.appointment_date.strftime('%H:%M'))
        
        # Update slot availability
        for slot in slots:
            slot['available'] = slot['start'] not in booked_times
        
        return APIResponse.success(
            data={
                'date': target_date.isoformat(),
                'doctor_id': doctor_id,
                'doctor_name': doctor.user.get_full_name(),
                'available_slots': slots
            },
            message='Available time slots retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get doctor availability error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get doctor availability')

@appointments_bp.route('/<int:appointment_id>/cancel', methods=['PUT'])
@login_required
def cancel_appointment(appointment_id):
    """Cancel an appointment (patients only)"""
    try:
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can cancel appointments')
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return APIResponse.not_found(resource='Appointment', resource_id=appointment_id)
        
        # Check if user owns this appointment
        if appointment.patient_id != current_user.patient_profile.id:
            return APIResponse.forbidden(message='Access denied')
        
        # Check if appointment can be cancelled
        if appointment.status in ['completed', 'cancelled']:
            return APIResponse.validation_error(
                field='status',
                message=f'Cannot cancel appointment that is already {appointment.status}'
            )
        
        # Check if appointment is in the near future (allow cancellation up to 1 hour before)
        if appointment.appointment_date <= datetime.now() + timedelta(hours=1):
            return APIResponse.validation_error(
                field='appointment_date',
                message='Cannot cancel appointments less than 1 hour before scheduled time'
            )
        
        data = request.get_json() or {}
        
        # Update appointment status
        old_status = appointment.status
        appointment.status = 'cancelled'
        appointment.notes = data.get('cancellation_reason', appointment.notes)
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Log the cancellation
        log_user_action(
            current_user.id,
            'appointment_cancelled',
            {
                'appointment_id': appointment_id,
                'old_status': old_status,
                'cancellation_reason': data.get('cancellation_reason')
            },
            request
        )
        
        app_logger.info(f"Appointment {appointment_id} cancelled by patient {current_user.id}")
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment cancelled successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Cancel appointment error: {str(e)}")
        return APIResponse.internal_error(message='Failed to cancel appointment')

@appointments_bp.route('/<int:appointment_id>/reschedule', methods=['PUT'])
@login_required
def reschedule_appointment(appointment_id):
    """Reschedule an appointment (patients only)"""
    try:
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can reschedule appointments')
        
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return APIResponse.not_found(resource='Appointment', resource_id=appointment_id)
        
        # Check if user owns this appointment
        if appointment.patient_id != current_user.patient_profile.id:
            return APIResponse.forbidden(message='Access denied')
        
        # Check if appointment can be rescheduled
        if appointment.status in ['completed', 'cancelled', 'in_progress']:
            return APIResponse.validation_error(
                field='status',
                message=f'Cannot reschedule appointment that is {appointment.status}'
            )
        
        data = request.get_json()
        if not data.get('new_appointment_date'):
            return APIResponse.validation_error(
                field='new_appointment_date',
                message='New appointment date is required'
            )
        
        # Parse and validate new appointment date
        try:
            new_appointment_date = datetime.fromisoformat(data['new_appointment_date'])
        except ValueError:
            return APIResponse.validation_error(
                field='new_appointment_date',
                message='Invalid appointment date format'
            )
        
        # Check if new appointment is in the future
        if new_appointment_date <= datetime.now():
            return APIResponse.validation_error(
                field='new_appointment_date',
                message='New appointment must be scheduled in the future'
            )
        
        # Check if new time slot is available (including blocked slots)
        existing_appointment = Appointment.query.filter(
            and_(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == new_appointment_date,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress', 'blocked']),
                Appointment.id != appointment_id  # Exclude current appointment
            )
        ).first()
        
        if existing_appointment:
            if existing_appointment.status == 'blocked':
                return APIResponse.conflict(
                    message='The new time slot is blocked by the doctor'
                )
            else:
                return APIResponse.conflict(
                    message='The new time slot is already booked'
                )
        
        # Update appointment
        old_date = appointment.appointment_date
        appointment.appointment_date = new_appointment_date
        appointment.status = 'scheduled'  # Reset to scheduled after reschedule
        appointment.notes = data.get('reschedule_reason', appointment.notes)
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Log the reschedule
        log_user_action(
            current_user.id,
            'appointment_rescheduled',
            {
                'appointment_id': appointment_id,
                'old_date': old_date.isoformat(),
                'new_date': new_appointment_date.isoformat(),
                'reschedule_reason': data.get('reschedule_reason')
            },
            request
        )
        
        app_logger.info(f"Appointment {appointment_id} rescheduled by patient {current_user.id}")
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment rescheduled successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Reschedule appointment error: {str(e)}")
        return APIResponse.internal_error(message='Failed to reschedule appointment')


@appointments_bp.route('/patients', methods=['GET'])
@api_login_required
def get_doctor_patients():
    """Get list of patients for a doctor"""
    try:
        # Check if the current user is a doctor
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access patient list')
        
        # Get doctor record
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get unique patients from appointments
        patients_query = db.session.query(Patient).join(
            Appointment, Patient.id == Appointment.patient_id
        ).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status.in_(['completed', 'scheduled', 'confirmed'])
        ).distinct()
        
        patients = patients_query.all()
        
        # Format patient data
        patients_data = []
        for patient in patients:
            # Get last appointment date for this patient with this doctor
            last_appointment = Appointment.query.filter_by(
                doctor_id=doctor.id,
                patient_id=patient.id
            ).order_by(Appointment.appointment_date.desc()).first()
            
            patient_data = {
                'id': patient.id,
                'patient_id': patient.patient_id,
                'full_name': patient.user.full_name if patient.user else 'Unknown',
                'age': patient.calculate_age() if hasattr(patient, 'calculate_age') else None,
                'last_appointment_date': last_appointment.appointment_date.isoformat() if last_appointment else None
            }
            patients_data.append(patient_data)
        
        return APIResponse.success(
            data=patients_data,
            message='Patients retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Error getting doctor patients: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve patients')


@appointments_bp.route('/stats', methods=['GET'])
@api_login_required
def get_doctor_stats():
    """Get statistics for doctor dashboard"""
    try:
        # Check if the current user is a doctor
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access statistics')
        
        # Get doctor record
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Calculate statistics
        today = datetime.now().date()
        
        # Total unique patients
        total_patients = db.session.query(Patient).join(
            Appointment, Patient.id == Appointment.patient_id
        ).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status.in_(['completed', 'scheduled', 'confirmed'])
        ).distinct().count()
        
        # Appointments today
        appointments_today = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            db.func.date(Appointment.appointment_date) == today,
            Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
        ).count()
        
        # Total consultations completed
        consultations_completed = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            Appointment.status == 'completed'
        ).count()
        
        stats = {
            'total_patients': total_patients,
            'appointments_today': appointments_today,
            'consultations_completed': consultations_completed
        }
        
        return APIResponse.success(
            data=stats,
            message='Statistics retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Error getting doctor stats: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve statistics')


@appointments_bp.route('/waiting', methods=['GET'])
@api_login_required
def get_waiting_patients():
    """Get list of waiting patients for today"""
    try:
        # Check if the current user is a doctor
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access waiting patients')
        
        # Get doctor record
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get today's appointments that are scheduled or confirmed
        today = datetime.now().date()
        waiting_appointments = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            db.func.date(Appointment.appointment_date) == today,
            Appointment.status.in_(['scheduled', 'confirmed'])
        ).order_by(Appointment.appointment_date).all()
        
        # Format waiting patients data
        waiting_patients = []
        for appointment in waiting_appointments:
            patient = appointment.patient
            patient_data = {
                'id': appointment.id,
                'patient_id': patient.patient_id,
                'full_name': patient.user.full_name if patient.user else 'Unknown',
                'appointment_time': appointment.appointment_date.strftime('%H:%M'),
                'appointment_type': appointment.appointment_type,
                'status': appointment.status
            }
            waiting_patients.append(patient_data)
        
        return APIResponse.success(
            data=waiting_patients,
            message='Waiting patients retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Error getting waiting patients: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve waiting patients')


@appointments_bp.route('/activity', methods=['GET'])
@api_login_required
def get_recent_activity():
    """Get recent activity for doctor dashboard"""
    try:
        # Check if the current user is a doctor
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access activity')
        
        # Get doctor record
        doctor = Doctor.query.filter_by(user_id=current_user.id).first()
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get recent appointments (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_appointments = Appointment.query.filter(
            Appointment.doctor_id == doctor.id,
            Appointment.updated_at >= seven_days_ago
        ).order_by(Appointment.updated_at.desc()).limit(10).all()
        
        # Format activity data
        activity = []
        for appointment in recent_appointments:
            patient = appointment.patient
            activity_item = {
                'id': appointment.id,
                'type': 'appointment',
                'patient_name': patient.user.full_name if patient.user else 'Unknown',
                'appointment_date': appointment.appointment_date.isoformat(),
                'status': appointment.status,
                'appointment_type': appointment.appointment_type,
                'updated_at': appointment.updated_at.isoformat()
            }
            activity.append(activity_item)
        
        return APIResponse.success(
            data=activity,
            message='Recent activity retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Error getting recent activity: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve recent activity')