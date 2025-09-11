from flask import Blueprint, request, current_app
from flask_login import current_user
from routes.auth import api_login_required
from models import db, Doctor, User, Patient, Appointment
from datetime import datetime, datetime as dt, timedelta, time
from sqlalchemy import and_, or_
from utils.responses import APIResponse, ErrorCodes
from utils.validators import validate_date, validate_time
from utils.logging_config import app_logger, log_user_action

availability_bp = Blueprint('availability', __name__)

@availability_bp.route('/schedule', methods=['GET'])
@api_login_required
def get_doctor_schedule():
    """Get doctor's weekly availability schedule"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get current schedule or default schedule
        schedule = doctor.available_hours or {
            'monday': {'start': '09:00', 'end': '17:00', 'enabled': True},
            'tuesday': {'start': '09:00', 'end': '17:00', 'enabled': True},
            'wednesday': {'start': '09:00', 'end': '17:00', 'enabled': True},
            'thursday': {'start': '09:00', 'end': '17:00', 'enabled': True},
            'friday': {'start': '09:00', 'end': '17:00', 'enabled': True},
            'saturday': {'start': '09:00', 'end': '14:00', 'enabled': False},
            'sunday': {'start': '09:00', 'end': '17:00', 'enabled': True}
        }
        
        return APIResponse.success(
            data={
                'doctor_id': doctor.id,
                'doctor_name': doctor.user.get_full_name(),
                'schedule': schedule,
                'timezone': doctor.timezone or 'UTC'
            },
            message='Doctor schedule retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get doctor schedule error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get doctor schedule')

@availability_bp.route('/schedule', methods=['PUT'])
@api_login_required
def update_doctor_schedule():
    """Update doctor's weekly availability schedule with locking to prevent concurrent updates"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        # Check if doctor profile exists before starting transaction
        if not current_user.doctor_profile:
            app_logger.error(f"User {current_user.id} does not have a doctor profile")
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Lock the doctor record to prevent concurrent schedule updates
        doctor = Doctor.query.filter_by(id=current_user.doctor_profile.id).with_for_update().first()
        if not doctor:
            app_logger.error(f"Doctor profile {current_user.doctor_profile.id} not found in database")
            return APIResponse.not_found(message='Doctor profile not found')
        
        data = request.get_json()
        if not data or 'schedule' not in data:
            return APIResponse.validation_error(
                field='schedule',
                message='Schedule data is required'
            )
        
        schedule = data['schedule']
        
        # Validate schedule format
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        validated_schedule = {}
        
        try:
            for day in valid_days:
                if day in schedule:
                    day_schedule = schedule[day]
                    
                    # Validate required fields
                    if not isinstance(day_schedule, dict):
                        return APIResponse.validation_error(
                            field=f'schedule.{day}',
                            message=f'Invalid format for {day} schedule'
                        )
                    
                    # Validate time format
                    start_time = day_schedule.get('start', '09:00')
                    end_time = day_schedule.get('end', '17:00')
                    # Handle both 'enabled' and 'available' properties for backward compatibility
                    enabled = day_schedule.get('enabled', day_schedule.get('available', True))
                    
                    if not validate_time(start_time)['valid'] or not validate_time(end_time)['valid']:
                        return APIResponse.validation_error(
                            field=f'schedule.{day}',
                            message=f'Invalid time format for {day}. Use HH:MM format'
                        )
                    
                    # Validate that end time is after start time
                    start_datetime = dt.strptime(start_time, '%H:%M')
                    end_datetime = dt.strptime(end_time, '%H:%M')
                    
                    if end_datetime <= start_datetime:
                        return APIResponse.validation_error(
                            field=f'schedule.{day}',
                            message=f'End time must be after start time for {day}'
                        )
                    
                    validated_schedule[day] = {
                        'start': start_time,
                        'end': end_time,
                        'enabled': bool(enabled)
                    }
                else:
                    # Default for missing days
                    validated_schedule[day] = {
                        'start': '09:00',
                        'end': '17:00',
                        'enabled': False
                    }
        
            # Update doctor's schedule
            old_schedule = doctor.available_hours
            doctor.available_hours = validated_schedule
            doctor.updated_at = dt.utcnow()
            db.session.commit()
            
            # Log schedule changes for audit trail
            log_user_action(
                current_user.id,
                'schedule_updated',
                {
                    'doctor_id': doctor.id,
                    'old_schedule': old_schedule,
                    'new_schedule': validated_schedule,
                    'schedule_changes': len([day for day in validated_schedule 
                                           if validated_schedule[day] != old_schedule.get(day, {})])
                },
                request
            )
            
        except Exception as schedule_error:
            db.session.rollback()
            app_logger.error(f"Error updating doctor schedule: {str(schedule_error)}")
            app_logger.error(f"Schedule data received: {schedule}")
            # Log the full traceback to find the exact source of the datetime error
            import traceback
            app_logger.error(f"Full traceback: {traceback.format_exc()}")
            return APIResponse.internal_error(message=f'Failed to update schedule: {str(schedule_error)}')
        
        # Log the action
        log_user_action(
            current_user.id,
            'availability_schedule_updated',
            {
                'doctor_id': doctor.id,
                'schedule_summary': {day: f"{s['start']}-{s['end']}" if s['enabled'] else "disabled" 
                                   for day, s in validated_schedule.items()}
            },
            request
        )
        
        app_logger.info(f"Doctor {doctor.id} updated availability schedule")
        
        return APIResponse.success(
            data={
                'doctor_id': doctor.id,
                'schedule': validated_schedule,
                'updated_at': doctor.updated_at.isoformat()
            },
            message='Doctor schedule updated successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update doctor schedule error: {str(e)}")
        return APIResponse.internal_error(message='Failed to update doctor schedule')

@availability_bp.route('/calendar', methods=['GET'])
@api_login_required
def get_availability_calendar():
    """Get doctor's availability calendar for a date range"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get date range parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        
        # Default to current week if not provided
        if not start_date_str:
            today = dt.now().date()
            start_date = today - timedelta(days=today.weekday())  # Monday of current week
        else:
            try:
                start_date = dt.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.validation_error(
                    field='start_date',
                    message='Invalid start date format. Use YYYY-MM-DD'
                )
        
        if not end_date_str:
            end_date = start_date + timedelta(days=6)  # Sunday of current week
        else:
            try:
                end_date = dt.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.validation_error(
                    field='end_date',
                    message='Invalid end date format. Use YYYY-MM-DD'
                )
        
        # Validate date range
        if end_date < start_date:
            return APIResponse.validation_error(
                field='end_date',
                message='End date must be after start date'
            )
        
        if (end_date - start_date).days > 30:
            return APIResponse.validation_error(
                field='date_range',
                message='Date range cannot exceed 30 days'
            )
        
        # Get doctor's schedule
        schedule = doctor.available_hours or {}
        
        # Get existing appointments in the date range
        start_datetime = dt.combine(start_date, time.min)
        end_datetime = dt.combine(end_date + timedelta(days=1), time.min)
        
        # Include ALL appointments (completed, cancelled, etc.) for full calendar view
        appointments = Appointment.query.options(
            db.joinedload(Appointment.patient).joinedload(Patient.user)
        ).filter(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_datetime,
                Appointment.appointment_date < end_datetime
            )
        ).all()
        
        # Build calendar data
        calendar_data = []
        current_date = start_date
        
        while current_date <= end_date:
            day_name = current_date.strftime('%A').lower()
            day_schedule = schedule.get(day_name, {'enabled': False})
            
            day_data = {
                'date': current_date.isoformat(),
                'day_name': day_name,
                'enabled': day_schedule.get('enabled', False),
                'start_time': day_schedule.get('start', '09:00'),
                'end_time': day_schedule.get('end', '17:00'),
                'appointments': [],
                'available_slots': []
            }
            
            # Add appointments for this date
            day_appointments = [
                apt for apt in appointments 
                if apt.appointment_date.date() == current_date
            ]
            
            for appointment in day_appointments:
                # Include full appointment details for calendar and modal use
                appointment_data = {
                    'id': appointment.id,
                    'time': appointment.appointment_date.strftime('%H:%M'),
                    'patient_name': appointment.patient.user.get_full_name() if appointment.patient and appointment.patient.user else 'No Patient',
                    'appointment_type': appointment.appointment_type,
                    'status': appointment.status,
                    'appointment_date': appointment.appointment_date.isoformat(),
                    'reason_for_visit': appointment.reason_for_visit,
                    'notes': appointment.notes,
                    'session_started_at': appointment.session_started_at.isoformat() if appointment.session_started_at else None,
                    'session_ended_at': appointment.session_ended_at.isoformat() if appointment.session_ended_at else None,
                    'session_duration': appointment.session_duration
                }
                day_data['appointments'].append(appointment_data)
            
            # Generate available slots if day is enabled
            if day_data['enabled']:
                slots = generate_time_slots(
                    day_schedule.get('start', '09:00'),
                    day_schedule.get('end', '17:00'),
                    [apt.appointment_date.strftime('%H:%M') for apt in day_appointments]
                )
                day_data['available_slots'] = slots
            
            calendar_data.append(day_data)
            current_date += timedelta(days=1)
        
        return APIResponse.success(
            data={
                'doctor_id': doctor.id,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'calendar': calendar_data
            },
            message='Availability calendar retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get availability calendar error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get availability calendar')

@availability_bp.route('/block-time', methods=['POST'])
@api_login_required
def block_time_slot():
    """Block a specific time slot"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['date', 'start_time', 'end_time']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.validation_error(
                    field=field,
                    message=f'{field} is required'
                )
        
        # Parse and validate date/time
        try:
            block_date = dt.strptime(data['date'], '%Y-%m-%d').date()
            start_time = dt.strptime(data['start_time'], '%H:%M').time()
            end_time = dt.strptime(data['end_time'], '%H:%M').time()
        except ValueError as e:
            return APIResponse.validation_error(
                message='Invalid date or time format'
            )
        
        # Validate that end time is after start time
        if end_time <= start_time:
            return APIResponse.validation_error(
                message='End time must be after start time'
            )
        
        # Check if time slots are already booked
        start_datetime = dt.combine(block_date, start_time)
        end_datetime = dt.combine(block_date, end_time)
        
        existing_appointments = Appointment.query.filter(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_datetime,
                Appointment.appointment_date < end_datetime,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress']),
                Appointment.patient_id.isnot(None)  # Exclude blocked slots (which have null patient_id)
            )
        ).first()
        
        if existing_appointments:
            return APIResponse.conflict(
                message='Cannot block time slot with existing appointments'
            )
        
        # Create blocking appointment (internal appointment)
        try:
            blocking_appointment = Appointment(
                patient_id=None,  # No patient for blocked slots
                doctor_id=doctor.id,
                appointment_date=start_datetime,
                appointment_type='blocked',  # Use blocked type
                status='blocked',  # Use blocked status
                reason_for_visit='Time blocked by doctor',
                notes=data.get('reason', 'Doctor unavailable')
            )
            
            db.session.add(blocking_appointment)
            db.session.commit()
        except Exception as db_error:
            db.session.rollback()
            app_logger.error(f"Database error creating blocked appointment: {str(db_error)}")
            
            # Try fallback approach if 'blocked' enum values don't exist in database
            try:
                blocking_appointment = Appointment(
                    patient_id=None,  # No patient for blocked slots
                    doctor_id=doctor.id,
                    appointment_date=start_datetime,
                    appointment_type='video',  # Fallback to existing enum
                    status='cancelled',  # Fallback to existing enum
                    reason_for_visit='Time blocked by doctor',
                    notes=f"BLOCKED_SLOT: {data.get('reason', 'Doctor unavailable')}"
                )
                
                db.session.add(blocking_appointment)
                db.session.commit()
                app_logger.info("Used fallback approach for blocked appointment")
            except Exception as fallback_error:
                db.session.rollback()
                app_logger.error(f"Fallback approach also failed: {str(fallback_error)}")
                return APIResponse.internal_error(message='Failed to block time slot due to database constraints')
        
        # Log the action
        log_user_action(
            current_user.id,
            'time_slot_blocked',
            {
                'doctor_id': doctor.id,
                'date': data['date'],
                'start_time': data['start_time'],
                'end_time': data['end_time'],
                'reason': data.get('reason')
            },
            request
        )
        
        app_logger.info(f"Doctor {doctor.id} blocked time slot on {block_date} from {start_time} to {end_time}")
        
        return APIResponse.success(
            data={
                'block_id': blocking_appointment.id,
                'date': block_date.isoformat(),
                'start_time': start_time.strftime('%H:%M'),
                'end_time': end_time.strftime('%H:%M'),
                'reason': data.get('reason', 'Doctor unavailable')
            },
            message='Time slot blocked successfully',
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Block time slot error: {str(e)}")
        return APIResponse.internal_error(message='Failed to block time slot')

@availability_bp.route('/unblock-time/<int:block_id>', methods=['DELETE'])
@api_login_required
def unblock_time_slot(block_id):
    """Unblock a previously blocked time slot"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Find the blocked appointment - try both approaches
        blocked_appointment = Appointment.query.filter(
            and_(
                Appointment.id == block_id,
                Appointment.doctor_id == doctor.id,
                or_(
                    Appointment.status == 'blocked',  # Proper blocked status
                    and_(  # Fallback: cancelled status with null patient and BLOCKED_SLOT in notes
                        Appointment.status == 'cancelled',
                        Appointment.patient_id.is_(None),
                        Appointment.notes.like('BLOCKED_SLOT:%')
                    )
                )
            )
        ).first()
        
        if not blocked_appointment:
            return APIResponse.not_found(message='Blocked time slot not found')
        
        # Store info for logging before deletion
        block_info = {
            'date': blocked_appointment.appointment_date.date().isoformat(),
            'time': blocked_appointment.appointment_date.strftime('%H:%M')
        }
        
        # Delete the blocking appointment
        db.session.delete(blocked_appointment)
        db.session.commit()
        
        # Log the action
        log_user_action(
            current_user.id,
            'time_slot_unblocked',
            {
                'doctor_id': doctor.id,
                'block_id': block_id,
                'date': block_info['date'],
                'time': block_info['time']
            },
            request
        )
        
        app_logger.info(f"Doctor {doctor.id} unblocked time slot {block_id}")
        
        return APIResponse.success(
            message='Time slot unblocked successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Unblock time slot error: {str(e)}")
        return APIResponse.internal_error(message='Failed to unblock time slot')

def generate_time_slots(start_time, end_time, booked_times, slot_duration=30):
    """Generate available time slots"""
    slots = []
    
    try:
        # Parse times
        start = dt.strptime(start_time, '%H:%M')
        end = dt.strptime(end_time, '%H:%M')
        
        # Generate slots
        current_time = start
        while current_time < end:
            slot_end = current_time + timedelta(minutes=slot_duration)
            if slot_end <= end:
                time_str = current_time.strftime('%H:%M')
                slots.append({
                    'time': time_str,
                    'available': time_str not in booked_times,
                    'end_time': slot_end.strftime('%H:%M')
                })
            current_time = slot_end
        
    except Exception as e:
        app_logger.error(f"Generate time slots error: {str(e)}")
    
    return slots

