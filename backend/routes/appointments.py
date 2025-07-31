from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Appointment, Doctor, Patient
from datetime import datetime

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
            return jsonify({'success': False, 'message': 'Invalid user type'}), 400
        
        return jsonify({
            'success': True,
            'appointments': [appointment.to_dict() for appointment in appointments]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get appointments error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to get appointments'}), 500

@appointments_bp.route('/', methods=['POST'])
@login_required
def create_appointment():
    """Create new appointment (patients only)"""
    try:
        if current_user.user_type != 'patient':
            return jsonify({'success': False, 'message': 'Only patients can book appointments'}), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['doctor_id', 'appointment_date', 'appointment_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required', 'field': field}), 400
        
        # Create appointment
        appointment = Appointment(
            patient_id=current_user.patient_profile.id,
            doctor_id=data['doctor_id'],
            appointment_date=datetime.fromisoformat(data['appointment_date']),
            appointment_type=data['appointment_type'],
            reason_for_visit=data.get('reason_for_visit'),
            symptoms=data.get('symptoms')
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Appointment created successfully',
            'appointment': appointment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create appointment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to create appointment'}), 500

@appointments_bp.route('/<int:appointment_id>', methods=['GET'])
@login_required
def get_appointment(appointment_id):
    """Get specific appointment details"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        
        # Check if user has access to this appointment
        if current_user.user_type == 'patient' and appointment.patient_id != current_user.patient_profile.id:
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        elif current_user.user_type == 'doctor' and appointment.doctor_id != current_user.doctor_profile.id:
            return jsonify({'success': False, 'message': 'Access denied'}), 403
        
        return jsonify({
            'success': True,
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get appointment error: {str(e)}")
        return jsonify({'success': False, 'message': 'Failed to get appointment'}), 500