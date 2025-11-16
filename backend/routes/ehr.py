from flask import Blueprint, request
from flask_login import current_user
from routes.auth import api_login_required
from datetime import datetime, timedelta
from sqlalchemy import and_, or_, desc

from models import db, Patient, Doctor, Appointment, Diagnosis, VitalSigns, User
from utils.responses import APIResponse, ErrorCodes
from utils.validators import validate_date, validate_vital_signs_ranges, validate_text_field_length
from utils.logging_config import app_logger, log_user_action

ehr_bp = Blueprint('ehr', __name__)

@ehr_bp.route('/patients/search', methods=['GET'])
@api_login_required
def search_patients():
    """Search for patients by name, ID, or phone number"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can search patients')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get search parameters
        query = request.args.get('q', '').strip()
        if not query or len(query) < 2:
            return APIResponse.validation_error(
                field='q',
                message='Search query must be at least 2 characters'
            )
        
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50 results
        
        # Search patients by name or phone
        search_pattern = f'%{query}%'
        
        # Join with User table to get basic user info and search by name
        patients = db.session.query(Patient, User).join(
            User, Patient.user_id == User.id
        ).filter(
            or_(
                User.full_name.ilike(search_pattern),
                Patient.phone.ilike(search_pattern)
            )
        ).limit(limit).all()
        
        # Format results
        search_results = []
        for patient, user in patients:
            # Check if doctor has any appointment history with this patient
            has_appointment = Appointment.query.filter_by(
                patient_id=patient.id,
                doctor_id=doctor.id
            ).first() is not None
            
            # Get last visit date if any
            last_appointment = Appointment.query.filter_by(
                patient_id=patient.id,
                doctor_id=doctor.id
            ).order_by(desc(Appointment.appointment_date)).first()
            
            search_results.append({
                'id': patient.id,
                'name': user.full_name,
                'patient_id': f'PAT-{patient.id:06d}',  # Generate a display ID from patient ID
                'age': patient.age,
                'phone': patient.phone,
                'gender': patient.gender,
                'has_history': has_appointment,
                'last_visit': last_appointment.appointment_date.strftime('%Y-%m-%d') if last_appointment else None
            })
        
        # Log the search action
        log_user_action(
            current_user.id,
            'patient_search',
            {
                'query': query,
                'results_count': len(search_results),
                'doctor_id': doctor.id
            },
            request
        )
        
        return APIResponse.success(
            data={'patients': search_results, 'query': query},
            message=f'Found {len(search_results)} patient(s)'
        )

    except Exception as e:
        app_logger.error(f"Patient search error: {str(e)}")
        return APIResponse.internal_error(message='Failed to search patients')

@ehr_bp.route('/patient/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_ehr(patient_id):
    """Get comprehensive EHR for a patient"""
    try:
        # Resolve patient ID (can be either User ID or Patient ID)
        original_patient_id = patient_id
        patient = Patient.query.get(patient_id)
        
        # If not found, try to get patient by user ID (common case from frontend)
        if not patient:
            user = User.query.get(patient_id)
            if user and user.user_type == 'patient' and user.patient_profile:
                patient = user.patient_profile
                patient_id = patient.id  # Use the actual patient ID for access checks
                app_logger.debug(f"Resolved user ID {original_patient_id} to patient profile ID {patient.id}")
        
        if not patient:
            return APIResponse.not_found(message=f'Patient not found with ID {original_patient_id}')
        
        # Verify access permissions using the resolved patient ID
        if not has_patient_access(patient_id):
            # Log unauthorized access attempt
            log_user_action(
                current_user.id,
                'unauthorized_ehr_access_attempt',
                {
                    'patient_id': patient_id,
                    'original_id': original_patient_id,
                    'endpoint': 'get_patient_ehr',
                    'user_type': current_user.user_type
                },
                request
            )
            return APIResponse.forbidden(message='Access denied to this patient\'s records')
        
        # Log successful EHR access
        log_user_action(
            current_user.id,
            'ehr_access_granted',
            {
                'patient_id': patient_id,
                'original_id': original_patient_id,
                'endpoint': 'get_patient_ehr',
                'user_type': current_user.user_type
            },
            request
        )
        
        # Get comprehensive medical data - safely handle missing tables
        ehr_data = {
            'patient_info': patient.to_dict(),
        }
        
        # Safely get diagnoses if table exists
        try:
            ehr_data['diagnoses'] = [d.to_dict() for d in patient.diagnoses]
        except Exception as e:
            app_logger.warning(f"Diagnoses table not found: {str(e)}")
            ehr_data['diagnoses'] = []
        
        # Safely get vital signs if table exists
        try:
            vital_signs_query = patient.vital_signs.order_by(desc(VitalSigns.measured_at)).limit(10)
            ehr_data['vital_signs'] = [v.to_dict() for v in vital_signs_query.all()]
        except Exception as e:
            app_logger.warning(f"Vital signs table not found: {str(e)}")
            ehr_data['vital_signs'] = []
        
        # Get appointments
        try:
            appointments_query = patient.appointments.order_by(desc(Appointment.appointment_date)).limit(10)
            ehr_data['appointments'] = [a.to_dict() for a in appointments_query.all()]
        except Exception as e:
            app_logger.warning(f"Error fetching appointments: {str(e)}")
            ehr_data['appointments'] = []
        
        # Safely get medical history updates if table exists
        try:
            medical_history_query = patient.medical_history_updates.limit(5)
            ehr_data['medical_history_updates'] = [u.to_dict() for u in medical_history_query.all()]
        except Exception as e:
            app_logger.warning(f"Medical history updates table not found: {str(e)}")
            ehr_data['medical_history_updates'] = []
        
        app_logger.info(f"EHR accessed for patient {patient_id} by user {current_user.id}")
        
        return APIResponse.success(
            data={'ehr': ehr_data},
            message='Patient EHR retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get patient EHR error: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve patient EHR')

@ehr_bp.route('/diagnoses', methods=['POST'])
@api_login_required
def create_diagnosis():
    """Create a new diagnosis (doctors only)"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can create diagnoses')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'primary_diagnosis']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.validation_error(
                    field=field,
                    message=f'{field} is required'
                )
        
        # Resolve patient ID (can be User ID or Patient ID)
        patient_id = data['patient_id']
        patient = Patient.query.get(patient_id)
        
        # If not found, try to get patient by user ID
        if not patient:
            user = User.query.get(patient_id)
            if user and user.user_type == 'patient' and user.patient_profile:
                patient = user.patient_profile
                patient_id = patient.id  # Use the actual patient ID
                app_logger.debug(f"Resolved user ID {data['patient_id']} to patient ID {patient_id}")
        
        if not patient:
            return APIResponse.not_found(message=f'Patient not found with ID {data["patient_id"]}')
        
        # Verify patient access with resolved patient ID
        if not has_patient_access(patient_id):
            return APIResponse.forbidden(message='Access denied to this patient')
        
        # Validate appointment if provided
        appointment_id = data.get('appointment_id')
        if appointment_id:
            appointment = Appointment.query.filter_by(
                id=appointment_id,
                patient_id=patient_id,  # Use resolved patient ID
                doctor_id=doctor.id
            ).first()
            if not appointment:
                return APIResponse.validation_error(
                    field='appointment_id',
                    message='Invalid appointment or access denied'
                )
        
        # Validate text fields for length and content
        text_validations = [
            ('primary_diagnosis', data.get('primary_diagnosis', ''), 1500, 10),
            ('clinical_findings', data.get('clinical_findings', ''), 2000, 0),
            ('treatment_plan', data.get('treatment_plan', ''), 2000, 0),
            ('follow_up_notes', data.get('follow_up_notes', ''), 1000, 0)
        ]
        
        for field_name, value, max_len, min_len in text_validations:
            if value:  # Only validate if field has content
                validation = validate_text_field_length(value, field_name, max_len, min_len)
                if not validation['valid']:
                    return APIResponse.validation_error(
                        field=field_name,
                        message=validation['message']
                    )
        
        # Parse dates
        diagnosis_date = datetime.utcnow()
        if data.get('diagnosis_date'):
            try:
                diagnosis_date = datetime.fromisoformat(data['diagnosis_date'])
            except ValueError:
                return APIResponse.validation_error(
                    field='diagnosis_date',
                    message='Invalid date format'
                )
        
        follow_up_date = None
        if data.get('follow_up_date'):
            try:
                follow_up_date = datetime.fromisoformat(data['follow_up_date'])
            except ValueError:
                return APIResponse.validation_error(
                    field='follow_up_date',
                    message='Invalid follow-up date format'
                )
        
        # Create diagnosis with resolved patient ID
        diagnosis = Diagnosis(
            patient_id=patient_id,  # Use resolved patient ID
            doctor_id=doctor.id,
            appointment_id=appointment_id,
            primary_diagnosis=data['primary_diagnosis'],
            secondary_diagnoses=data.get('secondary_diagnoses', []),
            icd_10_code=data.get('icd_10_code'),
            severity=data.get('severity'),
            status=data.get('status', 'provisional'),
            symptoms_reported=data.get('symptoms_reported', []),
            clinical_findings=data.get('clinical_findings'),
            diagnostic_tests=data.get('diagnostic_tests', []),
            treatment_plan=data.get('treatment_plan'),
            follow_up_required=data.get('follow_up_required', False),
            follow_up_date=follow_up_date,
            follow_up_notes=data.get('follow_up_notes'),
            diagnosis_date=diagnosis_date
        )
        
        db.session.add(diagnosis)
        db.session.commit()
        
        # Log the action
        log_user_action(
            current_user.id,
            'diagnosis_created',
            {
                'diagnosis_id': diagnosis.id,
                'patient_id': data['patient_id'],
                'primary_diagnosis': data['primary_diagnosis']
            },
            request
        )
        
        app_logger.info(f"Diagnosis created: ID {diagnosis.id} by doctor {doctor.id}")
        
        return APIResponse.success(
            data={'diagnosis': diagnosis.to_dict()},
            message='Diagnosis created successfully',
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Create diagnosis error: {str(e)}")
        return APIResponse.internal_error(message='Failed to create diagnosis')

@ehr_bp.route('/diagnoses/<int:diagnosis_id>', methods=['PUT'])
@api_login_required
def update_diagnosis(diagnosis_id):
    """Update a diagnosis (doctors only)"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can update diagnoses')
        
        doctor = current_user.doctor_profile
        diagnosis = Diagnosis.query.get_or_404(diagnosis_id)
        
        # Check if doctor owns this diagnosis
        if diagnosis.doctor_id != doctor.id:
            return APIResponse.forbidden(message='Access denied')
        
        data = request.get_json()
        
        # Update fields
        updatable_fields = [
            'primary_diagnosis', 'secondary_diagnoses', 'icd_10_code', 'severity',
            'status', 'symptoms_reported', 'clinical_findings', 'diagnostic_tests',
            'treatment_plan', 'follow_up_required', 'follow_up_notes', 'resolved',
            'resolution_notes'
        ]
        
        for field in updatable_fields:
            if field in data:
                setattr(diagnosis, field, data[field])
        
        # Handle date fields
        if 'follow_up_date' in data and data['follow_up_date']:
            try:
                diagnosis.follow_up_date = datetime.fromisoformat(data['follow_up_date'])
            except ValueError:
                return APIResponse.validation_error(
                    field='follow_up_date',
                    message='Invalid follow-up date format'
                )
        
        if 'resolved' in data and data['resolved'] and not diagnosis.resolved:
            diagnosis.resolution_date = datetime.utcnow()
        
        diagnosis.updated_at = datetime.utcnow()
        db.session.commit()
        
        log_user_action(
            current_user.id,
            'diagnosis_updated',
            {
                'diagnosis_id': diagnosis_id,
                'patient_id': diagnosis.patient_id
            },
            request
        )
        
        app_logger.info(f"Diagnosis {diagnosis_id} updated by doctor {doctor.id}")
        
        return APIResponse.success(
            data={'diagnosis': diagnosis.to_dict()},
            message='Diagnosis updated successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Update diagnosis error: {str(e)}")
        return APIResponse.internal_error(message='Failed to update diagnosis')

@ehr_bp.route('/vital-signs', methods=['POST'])
@api_login_required
def record_vital_signs():
    """Record vital signs (doctors or patients)"""
    try:
        data = request.get_json()
        
        if current_user.user_type == 'doctor':
            doctor = current_user.doctor_profile
            if not doctor:
                return APIResponse.not_found(message='Doctor profile not found')
            
            # Patient ID required for doctors
            if not data.get('patient_id'):
                return APIResponse.validation_error(
                    field='patient_id',
                    message='Patient ID is required'
                )
            
            # Resolve patient ID (can be User ID or Patient ID)
            patient_id = data['patient_id']
            patient = Patient.query.get(patient_id)
            
            # If not found, try to get patient by user ID
            if not patient:
                user = User.query.get(patient_id)
                if user and user.user_type == 'patient' and user.patient_profile:
                    patient = user.patient_profile
                    patient_id = patient.id  # Use the actual patient ID
                    app_logger.debug(f"Resolved user ID {data['patient_id']} to patient ID {patient_id}")
            
            if not patient:
                return APIResponse.not_found(message=f'Patient not found with ID {data["patient_id"]}')
            
            # Verify patient access with resolved patient ID
            if not has_patient_access(patient_id):
                return APIResponse.forbidden(message='Access denied to this patient')
            
            recorded_by_doctor_id = doctor.id
            
        elif current_user.user_type == 'patient':
            patient = current_user.patient_profile
            if not patient:
                return APIResponse.not_found(message='Patient profile not found')
            
            patient_id = patient.id
            recorded_by_doctor_id = None
        else:
            return APIResponse.forbidden(message='Invalid user type')
        
        # Validate vital signs ranges
        validation_result = validate_vital_signs_ranges(data)
        if not validation_result['valid']:
            return APIResponse.validation_error(
                message=validation_result['message']
            )
        
        # Helper function to convert to int/float or None
        def safe_int(value):
            if value is None or value == '':
                return None
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        
        def safe_float(value):
            if value is None or value == '':
                return None
            try:
                return float(value)
            except (ValueError, TypeError):
                return None
        
        # Create vital signs record with proper type conversion
        vital_signs = VitalSigns(
            patient_id=patient_id,
            appointment_id=data.get('appointment_id'),
            recorded_by_doctor_id=recorded_by_doctor_id,
            systolic_bp=safe_int(data.get('systolic_bp')),
            diastolic_bp=safe_int(data.get('diastolic_bp')),
            heart_rate=safe_int(data.get('heart_rate')),
            temperature=safe_float(data.get('temperature')),
            respiratory_rate=safe_int(data.get('respiratory_rate')),
            oxygen_saturation=safe_float(data.get('oxygen_saturation')),
            height=safe_float(data.get('height')),
            weight=safe_float(data.get('weight')),
            pain_scale=safe_int(data.get('pain_scale')),
            pain_location=data.get('pain_location') if data.get('pain_location') else None,
            notes=data.get('notes') if data.get('notes') else None
        )
        
        # Calculate BMI if possible
        vital_signs.calculate_bmi()
        
        # Set measurement time
        if data.get('measured_at'):
            try:
                vital_signs.measured_at = datetime.fromisoformat(data['measured_at'])
            except ValueError:
                return APIResponse.validation_error(
                    field='measured_at',
                    message='Invalid measurement date format'
                )
        
        db.session.add(vital_signs)
        db.session.commit()
        
        # Log vital signs recording
        log_user_action(
            current_user.id,
            'vital_signs_recorded',
            {
                'patient_id': patient_id,
                'vital_signs_id': vital_signs.id,
                'recorded_by_type': current_user.user_type,
                'appointment_id': data.get('appointment_id')
            },
            request
        )
        
        log_user_action(
            current_user.id,
            'vital_signs_recorded',
            {
                'vital_signs_id': vital_signs.id,
                'patient_id': patient_id
            },
            request
        )
        
        app_logger.info(f"Vital signs recorded: ID {vital_signs.id} for patient {patient_id}")
        
        return APIResponse.success(
            data={'vital_signs': vital_signs.to_dict()},
            message='Vital signs recorded successfully',
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Record vital signs error: {str(e)}")
        return APIResponse.internal_error(message='Failed to record vital signs')

@ehr_bp.route('/vital-signs/patient/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_vital_signs(patient_id):
    """Get patient's vital signs history"""
    try:
        # Resolve patient ID (can be either User ID or Patient ID)
        original_patient_id = patient_id
        patient = Patient.query.get(patient_id)
        
        # If not found, try to get patient by user ID
        if not patient:
            user = User.query.get(patient_id)
            if user and user.user_type == 'patient' and user.patient_profile:
                patient = user.patient_profile
                patient_id = patient.id
                app_logger.debug(f"Resolved user ID {original_patient_id} to patient profile ID {patient.id} for vital signs")
        
        if not patient:
            return APIResponse.not_found(message=f'Patient not found with ID {original_patient_id}')
        
        if not has_patient_access(patient_id):
            return APIResponse.forbidden(message='Access denied')
        
        # Get date range
        days = min(int(request.args.get('days', 30)), 365)  # Max 1 year
        limit = min(int(request.args.get('limit', 50)), 200)  # Max 200 records
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        vital_signs = VitalSigns.query.filter(
            and_(
                VitalSigns.patient_id == patient_id,
                VitalSigns.measured_at >= start_date,
                VitalSigns.measured_at <= end_date
            )
        ).order_by(desc(VitalSigns.measured_at)).limit(limit).all()
        
        return APIResponse.success(
            data={
                'vital_signs': [vs.to_dict() for vs in vital_signs],
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                }
            },
            message='Vital signs retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get patient vital signs error: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve vital signs')

@ehr_bp.route('/diagnoses/patient/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_diagnoses(patient_id):
    """Get patient's diagnosis history"""
    try:
        # Resolve patient ID (can be either User ID or Patient ID)
        original_patient_id = patient_id
        patient = Patient.query.get(patient_id)
        
        # If not found, try to get patient by user ID
        if not patient:
            user = User.query.get(patient_id)
            if user and user.user_type == 'patient' and user.patient_profile:
                patient = user.patient_profile
                patient_id = patient.id
                app_logger.debug(f"Resolved user ID {original_patient_id} to patient profile ID {patient.id} for diagnoses")
        
        if not patient:
            return APIResponse.not_found(message=f'Patient not found with ID {original_patient_id}')
        
        if not has_patient_access(patient_id):
            return APIResponse.forbidden(message='Access denied')
        
        # Get query parameters
        status = request.args.get('status')  # active, resolved, all
        limit = min(int(request.args.get('limit', 50)), 200)
        
        query = Diagnosis.query.filter_by(patient_id=patient_id)
        
        if status == 'active':
            query = query.filter_by(resolved=False)
        elif status == 'resolved':
            query = query.filter_by(resolved=True)
        
        diagnoses = query.order_by(desc(Diagnosis.diagnosis_date)).limit(limit).all()
        
        return APIResponse.success(
            data={'diagnoses': [d.to_dict() for d in diagnoses]},
            message='Patient diagnoses retrieved successfully'
        )
        
    except Exception as e:
        app_logger.error(f"Get patient diagnoses error: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve diagnoses')

def has_patient_access(patient_id, emergency_access=False):
    """
    Check if current user has access to patient records
    
    Args:
        patient_id: ID of the patient whose records are being accessed
        emergency_access: Whether this is an emergency access request
    
    Returns:
        bool: True if access is allowed, False otherwise
    """
    user_profile = current_user.get_profile()
    if not user_profile:
        return False
    
    # Admin users have full access (with logging)
    if current_user.user_type == 'admin':
        app_logger.warning(
            f"Admin {current_user.id} accessed patient {patient_id} records"
        )
        return True
    
    if current_user.user_type == 'patient':
        return patient_id == user_profile.id
    elif current_user.user_type == 'doctor':
        from datetime import datetime, timedelta
        
        # Define access timeframe: doctors can access patient records:
        # - 30 days before scheduled appointment
        # - During active appointments (extended window)
        # - Up to 1 year after completed appointments
        now = datetime.utcnow()
        access_start = now - timedelta(days=30)  # 30 days before future appointments
        access_end_past = now - timedelta(days=365)  # 1 year after past appointments
        
        # Check for appointments within valid timeframes
        valid_appointment = Appointment.query.filter(
            and_(
                Appointment.patient_id == patient_id,
                Appointment.doctor_id == user_profile.id,
                or_(
                    # Future appointments (within 30 days)
                    and_(
                        Appointment.appointment_date > now,
                        Appointment.appointment_date <= now + timedelta(days=30),
                        Appointment.status.in_(['scheduled', 'confirmed'])
                    ),
                    # Active appointments (24-hour window)
                    and_(
                        Appointment.status.in_(['in_progress', 'confirmed', 'completed']),
                        Appointment.appointment_date <= now + timedelta(hours=24)  # 24-hour window
                    ),
                    # Recent past appointments (within 1 year)
                    and_(
                        Appointment.appointment_date >= access_end_past,
                        Appointment.appointment_date <= now,
                        Appointment.status.in_(['completed', 'cancelled', 'no_show'])
                    )
                )
            )
        ).first()
        
        # Emergency access override (must be logged and reviewed)
        if emergency_access and not valid_appointment:
            app_logger.critical(
                f"EMERGENCY ACCESS: Doctor {user_profile.id} accessed patient {patient_id} "
                f"without valid appointment - requires review"
            )
            # In a real system, this would trigger alerts to administrators
            return True
        
        # Log access attempt for audit
        if not valid_appointment:
            app_logger.warning(
                f"Doctor {user_profile.id} attempted to access patient {patient_id} "
                f"without valid timeframe appointment"
            )
            # Also use structured logging for security monitoring
            from flask import request
            log_user_action(
                user_profile.id,
                'patient_access_denied_timeframe',
                {
                    'patient_id': patient_id,
                    'reason': 'no_valid_appointment_in_timeframe',
                    'doctor_id': user_profile.id
                },
                request if 'request' in locals() else None
            )
        
        return bool(valid_appointment)
    
    return False