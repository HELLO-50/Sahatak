from flask import Blueprint, request, current_app
from flask_login import login_required, current_user
from models import db, Appointment, Doctor, Patient, User
from datetime import datetime, timedelta
from sqlalchemy import and_
from utils.responses import APIResponse, ErrorCodes
from utils.validators import validate_date, validate_appointment_type
from utils.logging_config import app_logger, log_user_action

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/', methods=['GET'])
@login_required
def get_appointments():
    """Get user's appointments"""
    try:
        # Get appointments based on user type
        if current_user.user_type == 'patient':
            appointments = Appointment.query.filter_by(patient_id=current_user.patient_profile.id).order_by(Appointment.appointment_date.desc()).all()
        elif current_user.user_type == 'doctor':
            appointments = Appointment.query.filter_by(doctor_id=current_user.doctor_profile.id).order_by(Appointment.appointment_date.desc()).all()
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
    try:
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can book appointments')
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['doctor_id', 'appointment_date', 'appointment_type']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.validation_error(
                    field=field,
                    message=f'{field} is required'
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
        
        # Check if time slot is available
        existing_appointment = Appointment.query.filter(
            and_(
                Appointment.doctor_id == data['doctor_id'],
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
            )
        ).first()
        
        if existing_appointment:
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
        db.session.commit()
        
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
        
        # Check for existing appointments
        existing_appointments = Appointment.query.filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= datetime.combine(target_date, start_time),
                Appointment.appointment_date < datetime.combine(target_date + timedelta(days=1), datetime.min.time()),
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
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
        from datetime import timedelta
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
        
        # Check if new time slot is available
        existing_appointment = Appointment.query.filter(
            and_(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == new_appointment_date,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress']),
                Appointment.id != appointment_id  # Exclude current appointment
            )
        ).first()
        
        if existing_appointment:
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