# Appointment Booking System - Sahatak Platform

This document provides a comprehensive guide to the appointment booking and management system implementation in the Sahatak healthcare platform, explaining all booking workflows, validation rules, and management features with proper code references for junior developers.

## Overview

The Sahatak platform implements a comprehensive appointment booking system that handles the complete lifecycle of medical appointments from discovery to completion. The system supports multiple consultation types (video, audio, chat), prevents double-booking with database locks, and includes complete appointment management features.

**Main Implementation Files**:
- **Main Routes**: `backend/routes/appointments.py` - All appointment operations
- **Database Models**: `backend/models.py` - Appointment and related models
- **Optimized Queries**: `backend/utils/db_optimize.py` - Performance optimizations
- **Validators**: `backend/utils/validators.py` - Input validation rules

## Architecture Overview

### Appointment System Stack
```
Appointment Booking Stack
├── Frontend Booking Flow
│   ├── Doctor discovery and selection
│   ├── Date/time slot selection
│   ├── Appointment type selection
│   └── Booking confirmation
├── Backend API Layer
│   ├── Doctor availability queries
│   ├── Appointment creation with validation
│   ├── Conflict prevention (double-booking)
│   └── Appointment lifecycle management
├── Database Layer
│   ├── Appointment table with status tracking
│   ├── Database locks for race condition prevention
│   ├── Optimized queries for performance
│   └── Cache invalidation strategies
├── Business Logic
│   ├── Appointment type validation
│   ├── Medical history requirements (optional)
│   ├── Time slot availability checking
│   └── Consultation fee calculation
```

---

## Core Components and Code Structure

### 1. Doctor Discovery and Selection
**Location**: `backend/routes/appointments.py:16-78`

The system provides doctor discovery with filtering and pagination:

```python
@appointments_bp.route('/doctors', methods=['GET'])
@api_login_required
def get_available_doctors():
    """Get list of available doctors for appointment booking"""
    try:
        # Get query parameters
        specialty = request.args.get('specialty')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 20)), 100)
        
        # Base query: verified and active doctors
        query = Doctor.query.filter_by(is_verified=True).join(User, Doctor.user_id == User.id).filter_by(is_active=True)
        
        # Filter by specialty if provided
        if specialty:
            query = query.filter(Doctor.specialty.ilike(f'%{specialty}%'))
        
        # Get paginated results
        paginated_doctors = query.order_by(Doctor.id.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format doctor data
        doctors_data = []
        for doctor in paginated_doctors.items:
            try:
                doctor_data = {
                    'id': doctor.id,
                    'user': {
                        'full_name': doctor.user.full_name
                    },
                    'specialty': doctor.specialty,
                    'years_of_experience': doctor.years_of_experience,
                    'consultation_fee': doctor.consultation_fee,
                    'is_volunteer': doctor.consultation_fee == 0,
                    'is_verified': doctor.is_verified,
                    'rating': 4.5  # Default rating since we may not have this column
                }
                doctors_data.append(doctor_data)
            except Exception as doc_error:
                app_logger.error(f"Error formatting doctor {doctor.id}: {str(doc_error)}")
                continue
        
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
```

**Doctor Discovery Features**:
1. **Verified Doctors Only**: Only shows verified and active doctors
2. **Specialty Filtering**: Can filter by medical specialty
3. **Pagination**: Supports pagination for large doctor lists
4. **Fee Transparency**: Shows consultation fees and volunteer status
5. **Error Recovery**: Handles individual doctor data errors gracefully

### 2. Appointment Creation Flow
**Location**: `backend/routes/appointments.py:131-341`

The core appointment booking logic with comprehensive validation:

```python
@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    """Create new appointment (patients only)"""
    from utils.validators import validate_json_payload, validate_id_parameter, validate_enum_field, handle_api_errors
    
    try:
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can book appointments')
        
        # Get patient profile (medical history completion is now optional)
        patient = current_user.get_profile()
        if not patient:
            return APIResponse.error(message='Patient profile not found')
        
        # Medical history is now optional - patients can complete it anytime later
        # if not patient.medical_history_completed:
        #     return APIResponse.error(
        #         message='Please complete your medical history before booking an appointment',
        #         status_code=428,  # Precondition Required
        #         error_code='MEDICAL_HISTORY_REQUIRED',
        #         details={'redirect': '/medical/patient/medical-history-form.html'}
        #     )
        
        data = request.get_json()
        
        # Validate JSON payload structure
        required_fields = ['doctor_id', 'appointment_date', 'appointment_type']
        optional_fields = ['notes']
        validation = validate_json_payload(data, required_fields, optional_fields)
        
        if not validation['valid']:
            return APIResponse.validation_error(
                field=validation.get('missing_fields', validation.get('unexpected_fields', 'data')),
                message=validation['message']
            )
```

**Important Note**: The medical history requirement is commented out (lines 147-153), meaning patients can book appointments without completing their medical history first.

### 3. Appointment Validation Rules
**Location**: `backend/routes/appointments.py:168-230`

```python
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
        doctor = Doctor.query.filter_by(id=data['doctor_id'], is_verified=True).join(User, Doctor.user_id == User.id).filter(User.is_active == True).first()
        if not doctor:
            return APIResponse.validation_error(
                field='doctor_id',
                message='Doctor not found or not available'
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
```

**Validation Rules**:
1. **User Type**: Only patients can book appointments
2. **Doctor Verification**: Doctor must be verified and active
3. **Appointment Types**: Limited to 'video', 'audio', 'chat'
4. **Text Field Limits**: Reason (500 chars), Symptoms (1000 chars)
5. **Date Validation**: Must be future date in ISO format
6. **Profile Requirements**: Patient must have a profile

### 4. Double-Booking Prevention
**Location**: `backend/routes/appointments.py:232-286`

The system uses database locks to prevent race conditions:

```python
        # Use database transaction with SELECT FOR UPDATE to prevent race conditions
        try:
            # Lock and check availability atomically (Flask-SQLAlchemy manages transactions automatically)
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
```

**Race Condition Prevention**:
1. **SELECT FOR UPDATE**: Locks the conflicting record during check
2. **Atomic Operations**: Check and create in single transaction
3. **Status Checking**: Respects 'blocked' time slots
4. **Security Logging**: Logs double-booking attempts
5. **Cache Invalidation**: Clears cached appointment data

### 5. Appointment Confirmation Email
**Location**: `backend/routes/appointments.py:303-341`

```python
        # Send appointment confirmation email using templates
        try:
            patient_email = current_user.email if hasattr(current_user, 'email') else None
            patient_language = getattr(current_user, 'language_preference', 'ar')  # Default to Arabic
            
            # Only send email if patient has an email address
            if patient_email:
                # Get appointment data and add related information for template
                appointment_dict = appointment.to_dict()
                appointment_dict.update({
                    'doctor_name': doctor.user.full_name,
                    'patient_name': current_user.full_name,
                    'appointment_date': appointment_date.strftime('%Y-%m-%d'),
                    'appointment_time': appointment_date.strftime('%H:%M')
                })
                
                email_sent = send_appointment_confirmation(
                    recipient_email=patient_email,
                    appointment_data=appointment_dict,
                    language=patient_language
                )
                
                if email_sent:
                    app_logger.info(f"Appointment confirmation email sent to {patient_email}")
                else:
                    app_logger.warning(f"Failed to send appointment confirmation email to {patient_email}")
            else:
                app_logger.info(f"No email address for patient {current_user.id}, skipping confirmation email")
```

**Email Integration Features**:
1. **Language Support**: Uses patient's language preference (defaults to Arabic)
2. **Template Data**: Includes doctor name, patient name, date/time
3. **Optional Email**: Only sends if patient has email address
4. **Error Recovery**: Graceful handling of email failures
5. **Detailed Logging**: Tracks email success/failure

---

## Appointment Management Features

### 1. Appointment Retrieval
**Location**: `backend/routes/appointments.py:80-130`

```python
@appointments_bp.route('/', methods=['GET'])
@api_login_required
def get_appointments():
    """Get user's appointments with optimized queries"""
    try:
        app_logger.info(f"Getting appointments for user {current_user.id}, type: {current_user.user_type}")
        
        # Get appointments based on user type using optimized queries
        if current_user.user_type == 'patient':
            if not current_user.patient_profile:
                app_logger.error(f"Patient profile not found for user {current_user.id}")
                return APIResponse.not_found(message='Patient profile not found')
            appointments = OptimizedQueries.get_patient_appointments(current_user.patient_profile.id)
        elif current_user.user_type == 'doctor':
            if not current_user.doctor_profile:
                app_logger.error(f"Doctor profile not found for user {current_user.id}")
                return APIResponse.not_found(message='Doctor profile not found')
            app_logger.info(f"Getting appointments for doctor {current_user.doctor_profile.id}")
            appointments = OptimizedQueries.get_doctor_appointments(current_user.doctor_profile.id)
            app_logger.info(f"Found {len(appointments)} appointments for doctor")
        else:
            return APIResponse.forbidden(message='Invalid user type for appointments')
```

**Optimized Query Features**:
1. **User Type Specific**: Different queries for patients vs doctors
2. **Optimized Queries**: Uses `OptimizedQueries` class for performance
3. **Profile Validation**: Ensures user has appropriate profile
4. **Error Handling**: Proper error responses for missing profiles

### 2. Appointment Cancellation
**Location**: `backend/routes/appointments.py:475-538`

```python
@appointments_bp.route('/<int:appointment_id>/cancel', methods=['PUT'])
@api_login_required
def cancel_appointment(appointment_id):
    """Cancel an appointment (patients and doctors can cancel)"""
    try:
        # Get the appointment
        appointment = Appointment.query.get_or_404(appointment_id)
        
        # Check if user has permission to cancel this appointment
        has_permission = False
        if current_user.user_type == 'patient':
            has_permission = (current_user.patient_profile and 
                            appointment.patient_id == current_user.patient_profile.id)
        elif current_user.user_type == 'doctor':
            has_permission = (current_user.doctor_profile and 
                            appointment.doctor_id == current_user.doctor_profile.id)
        
        if not has_permission:
            return APIResponse.forbidden(message='You do not have permission to cancel this appointment')
        
        # Check if appointment can be cancelled
        if appointment.status in ['cancelled', 'completed']:
            return APIResponse.conflict(
                message=f'Cannot cancel appointment with status: {appointment.status}'
            )
        
        # Get cancellation reason from request
        data = request.get_json() or {}
        cancellation_reason = data.get('cancellation_reason', 'No reason provided')
        
        # Update appointment status
        appointment.status = 'cancelled'
        appointment.cancellation_reason = cancellation_reason
        appointment.cancelled_at = datetime.utcnow()
        appointment.cancelled_by = current_user.user_type
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Invalidate appointment cache
        invalidate_appointment_cache()
        
        # Log the cancellation
        log_user_action(
            current_user.id,
            'appointment_cancelled',
            {
                'appointment_id': appointment_id,
                'cancelled_by': current_user.user_type,
                'cancellation_reason': cancellation_reason,
                'original_status': appointment.status
            },
            request
        )
        
        app_logger.info(f"Appointment {appointment_id} cancelled by {current_user.user_type} {current_user.id}")
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment cancelled successfully'
        )
```

**Cancellation Features**:
1. **Permission Checking**: Only patient or doctor can cancel their appointments
2. **Status Validation**: Cannot cancel already cancelled or completed appointments
3. **Reason Tracking**: Captures cancellation reason
4. **Audit Trail**: Logs who cancelled and when
5. **Cache Management**: Invalidates relevant caches

### 3. Appointment Rescheduling
**Location**: `backend/routes/appointments.py:539-637`

```python
@appointments_bp.route('/<int:appointment_id>/reschedule', methods=['PUT'])
@api_login_required
def reschedule_appointment(appointment_id):
    """Reschedule an appointment (patients only)"""
    try:
        # Only patients can reschedule appointments
        if current_user.user_type != 'patient':
            return APIResponse.forbidden(message='Only patients can reschedule appointments')
        
        # Get the appointment
        appointment = Appointment.query.get_or_404(appointment_id)
        
        # Check if user owns this appointment
        if not current_user.patient_profile or appointment.patient_id != current_user.patient_profile.id:
            return APIResponse.forbidden(message='You do not have permission to reschedule this appointment')
        
        # Check if appointment can be rescheduled
        if appointment.status not in ['scheduled', 'confirmed']:
            return APIResponse.conflict(
                message=f'Cannot reschedule appointment with status: {appointment.status}'
            )
        
        data = request.get_json()
        if not data or 'new_appointment_date' not in data:
            return APIResponse.validation_error(
                field='new_appointment_date',
                message='New appointment date is required'
            )
        
        # Parse new appointment date
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
        
        # Check if the new time slot is available
        existing_appointment = Appointment.query.filter(
            and_(
                Appointment.doctor_id == appointment.doctor_id,
                Appointment.appointment_date == new_appointment_date,
                Appointment.status.in_(['scheduled', 'confirmed', 'in_progress']),
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
```

**Rescheduling Features**:
1. **Patient Only**: Only patients can reschedule appointments
2. **Status Restrictions**: Only 'scheduled' or 'confirmed' appointments
3. **Availability Checking**: Ensures new time slot is available
4. **Audit Logging**: Tracks old and new dates with reasons
5. **Status Reset**: Resets status to 'scheduled' after reschedule

---

## Doctor Features

### 1. Doctor Patient List
**Location**: `backend/routes/appointments.py:640-691`

```python
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
                'patient_id': f'PAT-{patient.id:06d}',  # Generate display ID like PAT-000001
                'full_name': patient.user.full_name if patient.user else 'Unknown',
                'age': patient.age if patient.age else None,
                'phone': patient.phone if patient.phone else None,
                'gender': patient.gender if patient.gender else None,
                'last_appointment_date': last_appointment.appointment_date.isoformat() if last_appointment else None
            }
            patients_data.append(patient_data)
        
        return APIResponse.success(
            data=patients_data,
            message='Patients retrieved successfully'
        )
```

**Doctor Patient Features**:
1. **Doctor Only Access**: Only doctors can view patient lists
2. **Appointment-Based**: Only patients with actual appointments
3. **Status Filtering**: Only completed, scheduled, or confirmed appointments
4. **Patient ID Generation**: Creates display IDs like PAT-000001
5. **Last Appointment**: Shows most recent appointment date

### 2. Doctor Statistics
**Location**: `backend/routes/appointments.py:694-747`

```python
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
        
        # Get current date for filtering
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=today_start.weekday())
        month_start = today_start.replace(day=1)
        
        # Calculate various statistics
        stats = {
            'total_appointments': Appointment.query.filter_by(doctor_id=doctor.id).count(),
            'today_appointments': Appointment.query.filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= today_start,
                Appointment.appointment_date < today_start + timedelta(days=1)
            ).count(),
            'this_week_appointments': Appointment.query.filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= week_start,
                Appointment.appointment_date < week_start + timedelta(days=7)
            ).count(),
            'this_month_appointments': Appointment.query.filter(
                Appointment.doctor_id == doctor.id,
                Appointment.appointment_date >= month_start
            ).count(),
            'completed_appointments': Appointment.query.filter_by(
                doctor_id=doctor.id,
                status='completed'
            ).count(),
            'cancelled_appointments': Appointment.query.filter_by(
                doctor_id=doctor.id,
                status='cancelled'
            ).count(),
            'unique_patients': db.session.query(Appointment.patient_id).filter_by(
                doctor_id=doctor.id
            ).distinct().count()
        }
        
        return APIResponse.success(
            data=stats,
            message='Doctor statistics retrieved successfully'
        )
```

**Statistics Features**:
1. **Time-Based Stats**: Today, this week, this month statistics
2. **Status Breakdown**: Completed vs cancelled appointments
3. **Patient Count**: Unique patients served
4. **Total Appointments**: Complete appointment history

---

## Appointment Status Flow

### Appointment Lifecycle
```
Appointment Status Flow
├── Creation
│   ├── Status: 'scheduled' (default)
│   ├── Database lock prevents double-booking
│   ├── Confirmation email sent
│   └── Cache invalidated
├── Management Actions
│   ├── Reschedule (patients only)
│   │   ├── Validates new time slot
│   │   ├── Updates date
│   │   └── Resets to 'scheduled'
│   ├── Cancel (both parties)
│   │   ├── Sets status to 'cancelled'
│   │   ├── Records cancellation reason
│   │   └── Tracks who cancelled
│   └── Complete (via video consultation)
│       ├── Sets status to 'completed'
│       ├── Records session duration
│       └── Enables post-consultation actions
├── Status Values
│   ├── 'scheduled': Initial booking state
│   ├── 'confirmed': Doctor confirmed (if applicable)
│   ├── 'in_progress': Video consultation active
│   ├── 'completed': Consultation finished
│   ├── 'cancelled': Cancelled by either party
│   └── 'blocked': Time slot blocked by doctor
```

---

## Business Rules and Validation

### Appointment Creation Rules
1. **User Type**: Only patients can book appointments
2. **Doctor Verification**: Doctor must be verified and active
3. **Future Dates**: Appointments must be scheduled in the future
4. **Consultation Types**: Limited to 'video', 'audio', 'chat'
5. **Text Limits**: Reason (500 chars), Symptoms (1000 chars)
6. **Medical History**: Currently optional (can be required by uncommenting code)

### Time Slot Rules
1. **One Per Slot**: Only one appointment per doctor per time slot
2. **Blocked Slots**: Doctors can block time slots
3. **Race Conditions**: Database locks prevent simultaneous booking
4. **Status Checking**: Respects existing appointment statuses

### Permission Rules
1. **View Appointments**: Users see only their own appointments
2. **Cancel Appointments**: Both patients and doctors can cancel
3. **Reschedule**: Only patients can reschedule
4. **Patient Lists**: Only doctors can view their patient lists
5. **Statistics**: Only doctors can view appointment statistics

---

## Error Handling

### Common Booking Errors
```python
# Double booking attempt
if existing_appointment:
    return APIResponse.conflict(
        message='This time slot is already booked'
    )

# Invalid appointment type
if appointment_type not in ['video', 'audio', 'chat']:
    return APIResponse.validation_error(
        field='appointment_type',
        message='Invalid appointment type'
    )

# Past date booking
if appointment_date <= datetime.now():
    return APIResponse.validation_error(
        field='appointment_date',
        message='Appointment must be scheduled in the future'
    )

# Unauthorized user
if current_user.user_type != 'patient':
    return APIResponse.forbidden(
        message='Only patients can book appointments'
    )
```

### Database Error Recovery
```python
try:
    # Database operations
    db.session.add(appointment)
    db.session.commit()
    invalidate_appointment_cache()
except Exception as e:
    db.session.rollback()
    app_logger.error(f"Error creating appointment: {str(e)}")
    return APIResponse.internal_error(message='Failed to create appointment')
```

---

## Testing Checklist

### Appointment Booking Testing
- [ ] Patient can book appointment with verified doctor
- [ ] Cannot book appointment in the past
- [ ] Cannot double-book same time slot
- [ ] Appointment types validation (video/audio/chat)
- [ ] Text field length validation
- [ ] Email confirmation sent successfully
- [ ] Doctor fee auto-populated correctly
- [ ] Only patients can book appointments

### Appointment Management Testing
- [ ] Patient can view their appointments
- [ ] Doctor can view their appointments
- [ ] Patient can cancel their appointment
- [ ] Doctor can cancel appointments
- [ ] Patient can reschedule appointment
- [ ] Cannot reschedule to occupied slot
- [ ] Cancellation reason recorded properly
- [ ] Audit logs created correctly

### Doctor Features Testing
- [ ] Doctor can view patient list
- [ ] Only shows patients with appointments
- [ ] Patient display IDs generated correctly
- [ ] Doctor statistics calculated correctly
- [ ] Time-based stats accurate
- [ ] Only doctors can access doctor features

---

## Summary

The Sahatak appointment booking system provides a comprehensive healthcare appointment management platform:

### Key Features:
1. **Complete Booking Flow**: Doctor discovery to appointment confirmation
2. **Race Condition Prevention**: Database locks prevent double-booking
3. **Multi-Type Consultations**: Video, audio, and chat appointments
4. **Comprehensive Validation**: Input validation and business rule enforcement
5. **Appointment Management**: Cancel, reschedule, and status tracking
6. **Doctor Tools**: Patient lists, statistics, and appointment management
7. **Email Integration**: Confirmation emails with template support
8. **Audit Logging**: Complete audit trail of all actions

### File References:
- **Main Routes**: `backend/routes/appointments.py`
- **Database Models**: `backend/models.py`
- **Optimized Queries**: `backend/utils/db_optimize.py`
- **Validators**: `backend/utils/validators.py`
- **Email Service**: `backend/services/email_service.py`

For additional information, refer to:
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Flask-SQLAlchemy Documentation](https://flask-sqlalchemy.palletsprojects.com/)
