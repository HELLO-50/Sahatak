from flask import Blueprint, request, current_app
from flask_login import login_required, current_user
from models import db, Doctor, User, Appointment
from datetime import datetime, timedelta, time
from sqlalchemy import and_, or_
from utils.responses import APIResponse, ErrorCodes
from utils.validators import validate_date, validate_time
from utils.logging_config import app_logger, log_user_action

availability_bp = Blueprint('availability', __name__)

@availability_bp.route('/schedule', methods=['GET'])
@login_required
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
@login_required
def update_doctor_schedule():
    """Update doctor's weekly availability schedule"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
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
                enabled = day_schedule.get('enabled', True)
                
                if not validate_time(start_time) or not validate_time(end_time):
                    return APIResponse.validation_error(
                        field=f'schedule.{day}',
                        message=f'Invalid time format for {day}. Use HH:MM format'
                    )
                
                # Validate that end time is after start time
                start_datetime = datetime.strptime(start_time, '%H:%M')
                end_datetime = datetime.strptime(end_time, '%H:%M')
                
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
        doctor.available_hours = validated_schedule
        doctor.updated_at = datetime.utcnow()
        db.session.commit()
        
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
@login_required
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
            today = datetime.now().date()
            start_date = today - timedelta(days=today.weekday())  # Monday of current week
        else:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return APIResponse.validation_error(
                    field='start_date',
                    message='Invalid start date format. Use YYYY-MM-DD'
                )
        
        if not end_date_str:
            end_date = start_date + timedelta(days=6)  # Sunday of current week
        else:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
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
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date + timedelta(days=1), time.min)
        
        appointments = Appointment.query.filter(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_datetime,
                Appointment.appointment_date < end_datetime,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
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
                day_data['appointments'].append({
                    'id': appointment.id,
                    'time': appointment.appointment_date.strftime('%H:%M'),
                    'patient_name': appointment.patient.user.get_full_name(),
                    'type': appointment.appointment_type,
                    'status': appointment.status
                })
            
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
@login_required
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
            block_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            start_time = datetime.strptime(data['start_time'], '%H:%M').time()
            end_time = datetime.strptime(data['end_time'], '%H:%M').time()
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
        start_datetime = datetime.combine(block_date, start_time)
        end_datetime = datetime.combine(block_date, end_time)
        
        existing_appointments = Appointment.query.filter(
            and_(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= start_datetime,
                Appointment.appointment_date < end_datetime,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress'])
            )
        ).first()
        
        if existing_appointments:
            return APIResponse.conflict(
                message='Cannot block time slot with existing appointments'
            )
        
        # Create blocking appointment (internal appointment)
        blocking_appointment = Appointment(
            patient_id=None,  # No patient for blocked slots
            doctor_id=doctor.id,
            appointment_date=start_datetime,
            appointment_type='blocked',  # Custom type for blocked slots
            status='blocked',  # Custom status for blocked slots
            reason_for_visit='Time blocked by doctor',
            notes=data.get('reason', 'Doctor unavailable')
        )
        
        db.session.add(blocking_appointment)
        db.session.commit()
        
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
@login_required
def unblock_time_slot(block_id):
    """Unblock a previously blocked time slot"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can access this endpoint')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Find the blocked appointment
        blocked_appointment = Appointment.query.filter(
            and_(
                Appointment.id == block_id,
                Appointment.doctor_id == doctor.id,
                Appointment.status == 'blocked'
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
        start = datetime.strptime(start_time, '%H:%M')
        end = datetime.strptime(end_time, '%H:%M')
        
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

def validate_time(time_str):
    """Validate time format HH:MM"""
    try:
        datetime.strptime(time_str, '%H:%M')
        return True
    except ValueError:
        return False