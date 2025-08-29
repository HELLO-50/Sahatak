from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# This will be initialized in app.py
db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)
    user_type = db.Column(db.Enum('patient', 'doctor', 'admin', name='user_types'), nullable=False)
    language_preference = db.Column(db.Enum('ar', 'en', name='languages'), default='ar', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Online presence tracking (FR_10)
    is_online = db.Column(db.Boolean, default=False, nullable=False)
    last_seen_at = db.Column(db.DateTime, nullable=True)        # Last activity timestamp
    last_activity_at = db.Column(db.DateTime, nullable=True)    # Last meaningful interaction
    
    # Session management (NFR_7)
    session_expires_at = db.Column(db.DateTime, nullable=True)  # 15-minute timeout tracking
    auto_logout_warnings_sent = db.Column(db.Integer, default=0, nullable=False)  # Warning count
    
    # Relationships
    patient_profile = db.relationship('Patient', backref='user', uselist=False, cascade='all, delete-orphan')
    doctor_profile = db.relationship('Doctor', backref='user', uselist=False, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_full_name(self):
        """Get user's full name"""
        return self.full_name
    
    def is_admin(self):
        """Check if user is an admin"""
        return self.user_type == 'admin'
    
    def get_profile(self):
        """Get user's specific profile (patient or doctor)"""
        if self.user_type == 'patient':
            return self.patient_profile
        elif self.user_type == 'doctor':
            return self.doctor_profile
        return None
    
    @staticmethod
    def get_online_users():
        """Get all currently online users (FR_10)"""
        return User.query.filter_by(is_online=True).all()
    
    @staticmethod
    def cleanup_expired_sessions():
        """Mark users with expired sessions as offline (NFR_7)"""
        expired_users = User.query.filter(
            User.session_expires_at < datetime.utcnow(),
            User.is_online == True
        ).all()
        
        for user in expired_users:
            user.is_online = False
            user.session_expires_at = None
            user.auto_logout_warnings_sent = 0
        
        db.session.commit()
        return len(expired_users)
    
    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'user_type': self.user_type,
            'language_preference': self.language_preference,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None,
            # Online presence (FR_10)
            'is_online': self.is_online,
            'last_seen_at': self.last_seen_at.isoformat() if self.last_seen_at else None
        }
        
        if include_sensitive:
            data['verification_token'] = self.verification_token
            data['session_expires_at'] = self.session_expires_at.isoformat() if self.session_expires_at else None
            data['auto_logout_warnings_sent'] = self.auto_logout_warnings_sent
            
        return data
    
    def update_last_activity(self):
        """Update user's last activity timestamp (FR_10)"""
        self.last_activity_at = datetime.utcnow()
        self.last_seen_at = datetime.utcnow()
        if not self.is_online:
            self.is_online = True
        db.session.commit()
    
    def set_online_status(self, is_online):
        """Set user online/offline status (FR_10)"""
        self.is_online = is_online
        if is_online:
            self.last_seen_at = datetime.utcnow()
        db.session.commit()
    
    def extend_session(self, minutes=15):
        """Extend user session timeout (NFR_7)"""
        from datetime import timedelta
        self.session_expires_at = datetime.utcnow() + timedelta(minutes=minutes)
        self.auto_logout_warnings_sent = 0  # Reset warning count
        db.session.commit()
    
    def is_session_expired(self):
        """Check if user session has expired (NFR_7)"""
        if not self.session_expires_at:
            return True
        return datetime.utcnow() > self.session_expires_at
    
    def should_send_logout_warning(self, warning_minutes=5):
        """Check if logout warning should be sent (NFR_7)"""
        if not self.session_expires_at:
            return False
        from datetime import timedelta
        warning_time = self.session_expires_at - timedelta(minutes=warning_minutes)
        return datetime.utcnow() >= warning_time and self.auto_logout_warnings_sent == 0
    
    def increment_logout_warning(self):
        """Increment logout warning counter (NFR_7)"""
        self.auto_logout_warnings_sent += 1
        db.session.commit()
    
    def __repr__(self):
        return f'<User {self.email}>'

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.Enum('male', 'female', name='genders'), nullable=False)
    blood_type = db.Column(db.String(5), nullable=True)
    emergency_contact = db.Column(db.String(20), nullable=True)
    # Enhanced medical history fields
    medical_history = db.Column(db.Text, nullable=True)  # General medical history
    allergies = db.Column(db.Text, nullable=True)
    current_medications = db.Column(db.Text, nullable=True)
    chronic_conditions = db.Column(db.Text, nullable=True)  # Diabetes, hypertension, etc.
    family_history = db.Column(db.Text, nullable=True)  # Family medical history
    surgical_history = db.Column(db.Text, nullable=True)  # Previous surgeries
    smoking_status = db.Column(db.Enum('never', 'former', 'current', name='smoking_status'), nullable=True)
    alcohol_consumption = db.Column(db.Enum('none', 'occasional', 'moderate', 'heavy', name='alcohol_consumption'), nullable=True)
    exercise_frequency = db.Column(db.Enum('none', 'rare', 'weekly', 'daily', name='exercise_frequency'), nullable=True)
    
    # Health metrics
    height = db.Column(db.Float, nullable=True)  # in cm
    weight = db.Column(db.Float, nullable=True)  # in kg
    
    # History completion status
    medical_history_completed = db.Column(db.Boolean, default=False, nullable=False)
    medical_history_last_updated = db.Column(db.DateTime, nullable=True)
    # Notification preferences
    preferred_contact_method = db.Column(db.Enum('email', name='contact_methods'), default='email', nullable=False)
    notification_preferences = db.Column(db.JSON, nullable=True)  # Store detailed notification settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    appointments = db.relationship('Appointment', foreign_keys='Appointment.patient_id', backref='patient', lazy='dynamic')
    
    def to_dict(self):
        """Convert patient to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phone': self.phone,
            'age': self.age,
            'gender': self.gender,
            'blood_type': self.blood_type,
            'emergency_contact': self.emergency_contact,
            'medical_history': self.medical_history,
            'allergies': self.allergies,
            'current_medications': self.current_medications,
            'chronic_conditions': self.chronic_conditions,
            'family_history': self.family_history,
            'surgical_history': self.surgical_history,
            'smoking_status': self.smoking_status,
            'alcohol_consumption': self.alcohol_consumption,
            'exercise_frequency': self.exercise_frequency,
            'height': self.height,
            'weight': self.weight,
            'medical_history_completed': self.medical_history_completed,
            'medical_history_last_updated': self.medical_history_last_updated.isoformat() if self.medical_history_last_updated else None,
            'preferred_contact_method': self.preferred_contact_method,
            'notification_preferences': self.notification_preferences,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Patient {self.user.get_full_name()}>'

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=False)
    phone_country = db.Column(db.String(2), nullable=True)  # Country code like 'SD', 'US'
    license_number = db.Column(db.String(50), nullable=False, unique=True)
    license_country = db.Column(db.String(2), nullable=True)  # Country code for license validation
    specialty = db.Column(db.String(100), nullable=False)
    years_of_experience = db.Column(db.Integer, nullable=False)
    qualification = db.Column(db.Text, nullable=True)
    hospital_affiliation = db.Column(db.String(200), nullable=True)
    # Doctor participation model
    participation_type = db.Column(db.Enum('volunteer', 'paid', name='doctor_participation_types'), default='volunteer', nullable=False)
    consultation_fee = db.Column(db.Numeric(10, 2), nullable=True, default=0.00)
    available_hours = db.Column(db.JSON, nullable=True)  # Store as JSON
    timezone = db.Column(db.String(50), nullable=True, default='UTC')  # Doctor's timezone
    
    # Fee management
    can_change_participation = db.Column(db.Boolean, default=True, nullable=False)  # Admin can restrict changes
    participation_changed_at = db.Column(db.DateTime, nullable=True)  # Track when last changed
    bio = db.Column(db.Text, nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    rating = db.Column(db.Float, default=0.0, nullable=False)
    total_reviews = db.Column(db.Integer, default=0, nullable=False)
    
    # Profile completion and verification fields
    profile_completed = db.Column(db.Boolean, default=False, nullable=False)
    profile_completion_date = db.Column(db.DateTime, nullable=True)
    verification_status = db.Column(db.Enum('pending', 'submitted', 'under_review', 'approved', 'rejected', name='verification_statuses'), default='pending', nullable=False)
    verification_submitted_at = db.Column(db.DateTime, nullable=True)
    verification_reviewed_at = db.Column(db.DateTime, nullable=True)
    verified_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Additional profile fields for verification
    education_details = db.Column(db.Text, nullable=True)
    certifications = db.Column(db.JSON, nullable=True)
    professional_memberships = db.Column(db.JSON, nullable=True)
    languages_spoken = db.Column(db.JSON, nullable=True)
    consultation_areas = db.Column(db.JSON, nullable=True)
    
    # Document uploads for verification
    license_document_path = db.Column(db.String(500), nullable=True)
    degree_document_path = db.Column(db.String(500), nullable=True)
    id_document_path = db.Column(db.String(500), nullable=True)
    other_documents = db.Column(db.JSON, nullable=True)
    
    # Contact information for verification
    office_phone = db.Column(db.String(20), nullable=True)
    office_address = db.Column(db.Text, nullable=True)
    emergency_contact = db.Column(db.String(20), nullable=True)
    # Notification preferences for communicating with patients
    patient_notification_method = db.Column(db.Enum('email', name='doctor_contact_methods'), default='email', nullable=False)
    notification_settings = db.Column(db.JSON, nullable=True)  # Detailed notification settings
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    appointments = db.relationship('Appointment', foreign_keys='Appointment.doctor_id', backref='doctor', lazy='dynamic')
    
    def to_dict(self):
        """Convert doctor to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'phone': self.phone,
            'phone_country': self.phone_country,
            'license_number': self.license_number,
            'license_country': self.license_country,
            'specialty': self.specialty,
            'years_of_experience': self.years_of_experience,
            'qualification': self.qualification,
            'hospital_affiliation': self.hospital_affiliation,
            'participation_type': self.participation_type,
            'consultation_fee': str(self.consultation_fee) if self.consultation_fee else '0.00',
            'can_change_participation': self.can_change_participation,
            'participation_changed_at': self.participation_changed_at.isoformat() if self.participation_changed_at else None,
            'available_hours': self.available_hours,
            'timezone': self.timezone,
            'bio': self.bio,
            'is_verified': self.is_verified,
            'rating': self.rating,
            'total_reviews': self.total_reviews,
            'patient_notification_method': self.patient_notification_method,
            'notification_settings': self.notification_settings,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Doctor {self.user.get_full_name()} - {self.specialty}>'

class DoctorVerificationLog(db.Model):
    """
    Audit trail for doctor verification process
    """
    __tablename__ = 'doctor_verification_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    action = db.Column(db.Enum('submitted', 'reviewed', 'approved', 'rejected', 'updated', name='verification_actions'), nullable=False)
    performed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    previous_status = db.Column(db.String(50), nullable=True)
    new_status = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    doctor = db.relationship('Doctor', backref='verification_logs', lazy=True)
    performed_by = db.relationship('User', backref='doctor_verifications_performed', lazy=True)
    
    def to_dict(self):
        """Convert verification log to dictionary"""
        return {
            'id': self.id,
            'doctor_id': self.doctor_id,
            'action': self.action,
            'performed_by_id': self.performed_by_id,
            'performed_by_name': self.performed_by.get_full_name() if self.performed_by else 'System',
            'notes': self.notes,
            'previous_status': self.previous_status,
            'new_status': self.new_status,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<DoctorVerificationLog {self.id} - {self.action} for Doctor {self.doctor_id}>'

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)  # Nullable for blocked slots
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    appointment_type = db.Column(db.Enum('video', 'audio', 'chat', 'blocked', name='appointment_types'), default='video', nullable=False)
    status = db.Column(db.Enum('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'blocked', name='appointment_statuses'), default='scheduled', nullable=False)
    reason_for_visit = db.Column(db.Text, nullable=True)
    symptoms = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    diagnosis = db.Column(db.Text, nullable=True)
    prescription = db.Column(db.Text, nullable=True)
    follow_up_date = db.Column(db.DateTime, nullable=True)
    consultation_fee = db.Column(db.Numeric(10, 2), nullable=True)
    payment_status = db.Column(db.Enum('pending', 'paid', 'refunded', name='payment_statuses'), default='pending', nullable=False)
    
    # Virtual consultation session fields (FR_01, FR_04, NFR_11)
    session_id = db.Column(db.String(255), nullable=True, unique=True)  # Unique session identifier
    session_status = db.Column(db.Enum('waiting', 'connecting', 'connected', 'ended', 'failed', 'timeout', name='session_statuses'), nullable=True)
    session_started_at = db.Column(db.DateTime, nullable=True)  # When consultation actually started
    session_ended_at = db.Column(db.DateTime, nullable=True)    # When consultation ended
    session_duration = db.Column(db.Integer, nullable=True)     # Duration in seconds
    connection_quality = db.Column(db.Enum('excellent', 'good', 'fair', 'poor', 'unknown', name='connection_qualities'), nullable=True)
    
    # Recording and security (NFR_11)
    recording_enabled = db.Column(db.Boolean, default=False, nullable=False)
    recording_consent_patient = db.Column(db.Boolean, nullable=True)    # Patient consent for recording
    recording_consent_doctor = db.Column(db.Boolean, nullable=True)     # Doctor consent for recording
    recording_path = db.Column(db.String(500), nullable=True)           # Path to recording file if stored
    encryption_key_id = db.Column(db.String(255), nullable=True)        # Reference to encryption key
    
    # Consultation participants tracking
    participants_log = db.Column(db.JSON, nullable=True)  # Track join/leave events
    technical_issues = db.Column(db.JSON, nullable=True)  # Log any technical problems
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        """Convert appointment to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'doctor_id': self.doctor_id,
            'appointment_date': self.appointment_date.isoformat(),
            'appointment_type': self.appointment_type,
            'status': self.status,
            'reason_for_visit': self.reason_for_visit,
            'symptoms': self.symptoms,
            'notes': self.notes,
            'diagnosis': self.diagnosis,
            'prescription': self.prescription,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'consultation_fee': str(self.consultation_fee) if self.consultation_fee else None,
            'payment_status': self.payment_status,
            # Virtual consultation session info
            'session_id': self.session_id,
            'session_status': self.session_status,
            'session_started_at': self.session_started_at.isoformat() if self.session_started_at else None,
            'session_ended_at': self.session_ended_at.isoformat() if self.session_ended_at else None,
            'session_duration': self.session_duration,
            'connection_quality': self.connection_quality,
            'recording_enabled': self.recording_enabled,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Appointment {self.id} - {self.patient.user.get_full_name()} with {self.doctor.user.get_full_name()}>'

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    
    # Prescription details
    medication_name = db.Column(db.String(200), nullable=False)
    dosage = db.Column(db.String(100), nullable=False)
    frequency = db.Column(db.String(100), nullable=False)  # e.g., "3 times daily", "every 8 hours"
    duration = db.Column(db.String(100), nullable=False)   # e.g., "7 days", "2 weeks"
    quantity = db.Column(db.String(50), nullable=True)     # e.g., "30 tablets"
    
    # Instructions and notes
    instructions = db.Column(db.Text, nullable=True)       # How to take the medication
    notes = db.Column(db.Text, nullable=True)              # Doctor's notes
    
    # Status and tracking
    status = db.Column(db.Enum('active', 'completed', 'cancelled', 'expired', name='prescription_statuses'), default='active', nullable=False)
    refills_allowed = db.Column(db.Integer, default=0, nullable=False)
    refills_used = db.Column(db.Integer, default=0, nullable=False)
    
    # Dates
    prescribed_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    start_date = db.Column(db.DateTime, nullable=True)
    end_date = db.Column(db.DateTime, nullable=True)
    
    # Audit fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    appointment = db.relationship('Appointment', backref='prescriptions', lazy=True)
    patient = db.relationship('Patient', backref='prescriptions', lazy=True)
    doctor = db.relationship('Doctor', backref='issued_prescriptions', lazy=True)
    
    def to_dict(self):
        """Convert prescription to dictionary"""
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'patient_id': self.patient_id,
            'doctor_id': self.doctor_id,
            'medication_name': self.medication_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'duration': self.duration,
            'quantity': self.quantity,
            'instructions': self.instructions,
            'notes': self.notes,
            'status': self.status,
            'refills_allowed': self.refills_allowed,
            'refills_used': self.refills_used,
            'prescribed_date': self.prescribed_date.isoformat(),
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            # Include related data
            'doctor_name': self.doctor.user.get_full_name() if self.doctor else None,
            'patient_name': self.patient.user.get_full_name() if self.patient else None
        }
    
    def __repr__(self):
        return f'<Prescription {self.id} - {self.medication_name} for {self.patient.user.get_full_name()}>'

class MedicalHistoryUpdate(db.Model):
    __tablename__ = 'medical_history_updates'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)  # If updated during appointment
    updated_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=True)  # If doctor updated
    
    # What was updated
    update_type = db.Column(db.Enum('initial_registration', 'appointment_update', 'patient_self_update', 'doctor_update', name='history_update_types'), nullable=False)
    
    # Fields that were updated (JSON to track which fields changed)
    updated_fields = db.Column(db.JSON, nullable=False)  # ['allergies', 'medications', etc.]
    
    # Previous and new values for audit trail
    previous_values = db.Column(db.JSON, nullable=True)  # Store previous values
    new_values = db.Column(db.JSON, nullable=False)  # Store new values
    
    # Additional info
    notes = db.Column(db.Text, nullable=True)  # Notes about the update
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    patient = db.relationship('Patient', backref='medical_history_updates', lazy=True)
    appointment = db.relationship('Appointment', backref='medical_history_updates', lazy=True)
    updated_by_doctor = db.relationship('Doctor', backref='medical_history_updates', lazy=True)
    
    def to_dict(self):
        """Convert medical history update to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'appointment_id': self.appointment_id,
            'updated_by_doctor_id': self.updated_by_doctor_id,
            'update_type': self.update_type,
            'updated_fields': self.updated_fields,
            'previous_values': self.previous_values,
            'new_values': self.new_values,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'patient_name': self.patient.user.get_full_name() if self.patient else None,
            'doctor_name': self.updated_by_doctor.user.get_full_name() if self.updated_by_doctor else None
        }
    
    def __repr__(self):
        return f'<MedicalHistoryUpdate {self.id} - {self.update_type} for {self.patient.user.get_full_name()}>'

# =============================================================================
# EXTENDED EHR MODELS
# =============================================================================

class Diagnosis(db.Model):
    """
    Structured diagnosis tracking system for comprehensive EHR
    """
    __tablename__ = 'diagnoses'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)
    
    # Diagnosis information
    primary_diagnosis = db.Column(db.Text, nullable=False)  # Main diagnosis
    secondary_diagnoses = db.Column(db.JSON, nullable=True)  # Additional diagnoses as array
    icd_10_code = db.Column(db.String(10), nullable=True)  # ICD-10 diagnostic code
    
    # Diagnosis details
    severity = db.Column(db.Enum('mild', 'moderate', 'severe', 'critical', name='severity_levels'), nullable=True)
    status = db.Column(db.Enum('provisional', 'confirmed', 'differential', 'rule_out', name='diagnosis_status'), 
                      default='provisional', nullable=False)
    
    # Clinical information
    symptoms_reported = db.Column(db.JSON, nullable=True)  # Array of symptoms
    clinical_findings = db.Column(db.Text, nullable=True)  # Physical examination findings
    diagnostic_tests = db.Column(db.JSON, nullable=True)  # Tests ordered/performed
    
    # Treatment and follow-up
    treatment_plan = db.Column(db.Text, nullable=True)
    follow_up_required = db.Column(db.Boolean, default=False, nullable=False)
    follow_up_date = db.Column(db.DateTime, nullable=True)
    follow_up_notes = db.Column(db.Text, nullable=True)
    
    # Resolution
    resolved = db.Column(db.Boolean, default=False, nullable=False)
    resolution_date = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    diagnosis_date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    patient = db.relationship('Patient', backref='diagnoses', lazy=True)
    doctor = db.relationship('Doctor', backref='diagnoses', lazy=True)
    appointment = db.relationship('Appointment', backref='diagnoses', lazy=True)
    
    def to_dict(self):
        """Convert diagnosis to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'doctor_id': self.doctor_id,
            'appointment_id': self.appointment_id,
            'primary_diagnosis': self.primary_diagnosis,
            'secondary_diagnoses': self.secondary_diagnoses,
            'icd_10_code': self.icd_10_code,
            'severity': self.severity,
            'status': self.status,
            'symptoms_reported': self.symptoms_reported,
            'clinical_findings': self.clinical_findings,
            'diagnostic_tests': self.diagnostic_tests,
            'treatment_plan': self.treatment_plan,
            'follow_up_required': self.follow_up_required,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'follow_up_notes': self.follow_up_notes,
            'resolved': self.resolved,
            'resolution_date': self.resolution_date.isoformat() if self.resolution_date else None,
            'resolution_notes': self.resolution_notes,
            'diagnosis_date': self.diagnosis_date.isoformat(),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'patient_name': self.patient.user.get_full_name() if self.patient else None,
            'doctor_name': self.doctor.user.get_full_name() if self.doctor else None
        }
    
    def __repr__(self):
        return f'<Diagnosis {self.id} - {self.primary_diagnosis} for {self.patient.user.get_full_name()}>'

class VitalSigns(db.Model):
    """
    Vital signs tracking over time for comprehensive patient monitoring
    """
    __tablename__ = 'vital_signs'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)
    recorded_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=True)
    
    # Vital signs
    systolic_bp = db.Column(db.Integer, nullable=True)  # mmHg
    diastolic_bp = db.Column(db.Integer, nullable=True)  # mmHg
    heart_rate = db.Column(db.Integer, nullable=True)  # bpm
    temperature = db.Column(db.Float, nullable=True)  # Celsius
    respiratory_rate = db.Column(db.Integer, nullable=True)  # breaths per minute
    oxygen_saturation = db.Column(db.Float, nullable=True)  # percentage
    
    # Additional measurements
    height = db.Column(db.Float, nullable=True)  # cm
    weight = db.Column(db.Float, nullable=True)  # kg
    bmi = db.Column(db.Float, nullable=True)  # calculated BMI
    
    # Pain assessment
    pain_scale = db.Column(db.Integer, nullable=True)  # 0-10 pain scale
    pain_location = db.Column(db.String(100), nullable=True)
    
    # Notes
    notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    measured_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    patient = db.relationship('Patient', backref='vital_signs', lazy=True)
    appointment = db.relationship('Appointment', backref='vital_signs', lazy=True)
    recorded_by_doctor = db.relationship('Doctor', backref='recorded_vitals', lazy=True)
    
    def calculate_bmi(self):
        """Calculate BMI if height and weight are provided"""
        if self.height and self.weight and self.height > 0:
            height_m = self.height / 100  # convert cm to meters
            self.bmi = round(self.weight / (height_m ** 2), 1)
    
    def to_dict(self):
        """Convert vital signs to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'appointment_id': self.appointment_id,
            'recorded_by_doctor_id': self.recorded_by_doctor_id,
            'systolic_bp': self.systolic_bp,
            'diastolic_bp': self.diastolic_bp,
            'blood_pressure': f"{self.systolic_bp}/{self.diastolic_bp}" if self.systolic_bp and self.diastolic_bp else None,
            'heart_rate': self.heart_rate,
            'temperature': self.temperature,
            'respiratory_rate': self.respiratory_rate,
            'oxygen_saturation': self.oxygen_saturation,
            'height': self.height,
            'weight': self.weight,
            'bmi': self.bmi,
            'pain_scale': self.pain_scale,
            'pain_location': self.pain_location,
            'notes': self.notes,
            'measured_at': self.measured_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'patient_name': self.patient.user.get_full_name() if self.patient else None,
            'recorded_by': self.recorded_by_doctor.user.get_full_name() if self.recorded_by_doctor else 'Patient'
        }
    
    def __repr__(self):
        return f'<VitalSigns {self.id} for {self.patient.user.get_full_name()} at {self.measured_at}>'

# =============================================================================
# ADMIN MODELS
# =============================================================================

class SystemSettings(db.Model):
    """
    This model stores admin-configurable settings for the platform
    """
    __tablename__ = 'system_settings'
    
    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    setting_value = db.Column(db.Text, nullable=True)
    setting_type = db.Column(db.Enum('string', 'integer', 'boolean', 'json', name='setting_types'), default='string')
    description = db.Column(db.Text, nullable=True)
    is_public = db.Column(db.Boolean, default=False, nullable=False)  # Can non-admin users read this?
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    # Relationships
    updated_by_user = db.relationship('User', backref='updated_settings', lazy=True)
    
    def get_typed_value(self):
        """Convert string value to appropriate type"""
        if self.setting_type == 'boolean':
            return self.setting_value.lower() in ('true', '1', 'yes', 'on')
        elif self.setting_type == 'integer':
            try:
                return int(self.setting_value)
            except (ValueError, TypeError):
                return 0
        elif self.setting_type == 'json':
            try:
                import json
                return json.loads(self.setting_value)
            except (ValueError, TypeError):
                return {}
        else:
            return self.setting_value
    
    def to_dict(self):
        return {
            'id': self.id,
            'key': self.setting_key,
            'value': self.get_typed_value(),
            'type': self.setting_type,
            'description': self.description,
            'is_public': self.is_public,
            'updated_at': self.updated_at.isoformat(),
            'updated_by': self.updated_by_user.get_full_name() if self.updated_by_user else None
        }
    
    @staticmethod
    def get_setting(key, default=None):
        """Get a setting value by key"""
        setting = SystemSettings.query.filter_by(setting_key=key).first()
        return setting.get_typed_value() if setting else default
    
    @staticmethod
    def set_setting(key, value, setting_type='string', description=None, updated_by=None):
        """Set or update a setting"""
        setting = SystemSettings.query.filter_by(setting_key=key).first()
        if setting:
            setting.setting_value = str(value)
            setting.setting_type = setting_type
            setting.updated_by = updated_by
            setting.updated_at = datetime.utcnow()
        else:
            setting = SystemSettings(
                setting_key=key,
                setting_value=str(value),
                setting_type=setting_type,
                description=description,
                updated_by=updated_by
            )
            db.session.add(setting)
        
        db.session.commit()
        return setting
    
    def __repr__(self):
        return f'<SystemSetting {self.setting_key}: {self.setting_value}>'


class AuditLog(db.Model):
    """
    This model tracks all admin actions for security and compliance
    """
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Can be null for system actions
    action_type = db.Column(db.String(100), nullable=False, index=True)  # e.g., 'user_created', 'doctor_verified'
    target_type = db.Column(db.String(50), nullable=True)  # e.g., 'User', 'Doctor', 'Settings'
    target_id = db.Column(db.Integer, nullable=True)  # ID of the affected record
    action_description = db.Column(db.Text, nullable=False)
    ip_address = db.Column(db.String(45), nullable=True)  # IPv4 or IPv6
    user_agent = db.Column(db.Text, nullable=True)
    request_data = db.Column(db.JSON, nullable=True)  # Store request parameters
    response_data = db.Column(db.JSON, nullable=True)  # Store response or changes made
    status = db.Column(db.Enum('success', 'failure', 'warning', name='audit_statuses'), default='success')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = db.relationship('User', backref='audit_logs', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user': self.user.get_full_name() if self.user else 'System',
            'user_email': self.user.email if self.user else None,
            'action_type': self.action_type,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'description': self.action_description,
            'ip_address': self.ip_address,
            'status': self.status,
            'timestamp': self.timestamp.isoformat(),
            'request_data': self.request_data,
            'response_data': self.response_data
        }
    
    @staticmethod
    def log_action(user_id, action_type, description, target_type=None, target_id=None, 
                   ip_address=None, user_agent=None, request_data=None, response_data=None, status='success'):
        """Create an audit log entry"""
        audit_log = AuditLog(
            user_id=user_id,
            action_type=action_type,
            action_description=description,
            target_type=target_type,
            target_id=target_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_data=request_data,
            response_data=response_data,
            status=status
        )
        db.session.add(audit_log)
        db.session.commit()
        return audit_log
    
    def __repr__(self):
        return f'<AuditLog {self.id}: {self.action_type} by {self.user.email if self.user else "System"}>'


class NotificationQueue(db.Model):
    """
    Ahmed: Queue for system notifications (email, SMS, push notifications)
    This model manages outbound notifications from the admin system
    """
    __tablename__ = 'notification_queue'
    
    id = db.Column(db.Integer, primary_key=True)
    recipient_type = db.Column(db.Enum('user', 'email', name='recipient_types'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For user notifications
    recipient_value = db.Column(db.String(255), nullable=True)  # Email for direct notifications
    notification_type = db.Column(db.Enum('email', 'push', 'in_app', name='notification_types'), nullable=False)
    priority = db.Column(db.Enum('low', 'normal', 'high', 'urgent', name='notification_priorities'), default='normal')
    
    # Notification content
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    template_name = db.Column(db.String(100), nullable=True)  # For email templates
    template_data = db.Column(db.JSON, nullable=True)  # Data for template rendering
    
    # Delivery tracking
    status = db.Column(db.Enum('pending', 'processing', 'sent', 'failed', 'cancelled', name='notification_statuses'), default='pending')
    attempts = db.Column(db.Integer, default=0, nullable=False)
    max_attempts = db.Column(db.Integer, default=3, nullable=False)
    scheduled_at = db.Column(db.DateTime, nullable=True)  # For scheduled notifications
    sent_at = db.Column(db.DateTime, nullable=True)
    failed_at = db.Column(db.DateTime, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    
    # Metadata
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who created it
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    recipient_user = db.relationship('User', foreign_keys=[recipient_id], backref='received_notifications', lazy=True)
    created_by_user = db.relationship('User', foreign_keys=[created_by], backref='created_notifications', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'recipient_type': self.recipient_type,
            'recipient': self.recipient_user.get_full_name() if self.recipient_user else self.recipient_value,
            'notification_type': self.notification_type,
            'priority': self.priority,
            'title': self.title,
            'message': self.message,
            'status': self.status,
            'attempts': self.attempts,
            'max_attempts': self.max_attempts,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'created_by': self.created_by_user.get_full_name() if self.created_by_user else 'System',
            'created_at': self.created_at.isoformat(),
            'error_message': self.error_message
        }
    
    def mark_as_sent(self):
        """Mark notification as successfully sent"""
        self.status = 'sent'
        self.sent_at = datetime.utcnow()
        db.session.commit()
    
    def mark_as_failed(self, error_message):
        """Mark notification as failed"""
        self.status = 'failed'
        self.failed_at = datetime.utcnow()
        self.error_message = error_message
        db.session.commit()
    
    def increment_attempts(self):
        """Increment attempt counter"""
        self.attempts += 1
        if self.attempts >= self.max_attempts:
            self.status = 'failed'
        db.session.commit()
    
    @staticmethod
    def create_notification(recipient_type, title, message, notification_type='email', 
                          recipient_id=None, recipient_value=None, priority='normal',
                          template_name=None, template_data=None, created_by=None, scheduled_at=None):
        """Create a new notification"""
        notification = NotificationQueue(
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            recipient_value=recipient_value,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            template_name=template_name,
            template_data=template_data,
            created_by=created_by,
            scheduled_at=scheduled_at
        )
        db.session.add(notification)
        db.session.commit()
        return notification
    
    def __repr__(self):
        return f'<NotificationQueue {self.id}: {self.notification_type} to {self.recipient_value or self.recipient_user.email if self.recipient_user else "Unknown"}>'


class PlatformMetrics(db.Model):
    """
    Ahmed: Store platform metrics for analytics dashboard
    This model stores daily/hourly metrics for admin analytics
    """
    __tablename__ = 'platform_metrics'
    
    id = db.Column(db.Integer, primary_key=True)
    metric_date = db.Column(db.Date, nullable=False, index=True)
    metric_hour = db.Column(db.Integer, nullable=True)  # 0-23 for hourly metrics, null for daily
    
    # User metrics
    total_users = db.Column(db.Integer, default=0)
    new_users = db.Column(db.Integer, default=0)
    active_users = db.Column(db.Integer, default=0)
    
    # Doctor metrics
    total_doctors = db.Column(db.Integer, default=0)
    verified_doctors = db.Column(db.Integer, default=0)
    active_doctors = db.Column(db.Integer, default=0)
    
    # Appointment metrics
    total_appointments = db.Column(db.Integer, default=0)
    new_appointments = db.Column(db.Integer, default=0)
    completed_appointments = db.Column(db.Integer, default=0)
    cancelled_appointments = db.Column(db.Integer, default=0)
    
    # System metrics
    api_requests = db.Column(db.Integer, default=0)
    api_errors = db.Column(db.Integer, default=0)
    avg_response_time_ms = db.Column(db.Float, default=0.0)
    
    # Platform health
    cpu_usage_avg = db.Column(db.Float, default=0.0)
    memory_usage_avg = db.Column(db.Float, default=0.0)
    disk_usage_avg = db.Column(db.Float, default=0.0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.metric_date.isoformat(),
            'hour': self.metric_hour,
            'users': {
                'total': self.total_users,
                'new': self.new_users,
                'active': self.active_users
            },
            'doctors': {
                'total': self.total_doctors,
                'verified': self.verified_doctors,
                'active': self.active_doctors
            },
            'appointments': {
                'total': self.total_appointments,
                'new': self.new_appointments,
                'completed': self.completed_appointments,
                'cancelled': self.cancelled_appointments
            },
            'system': {
                'api_requests': self.api_requests,
                'api_errors': self.api_errors,
                'avg_response_time': self.avg_response_time_ms,
                'cpu_usage': self.cpu_usage_avg,
                'memory_usage': self.memory_usage_avg,
                'disk_usage': self.disk_usage_avg
            }
        }
    
    @staticmethod
    def get_daily_metrics(start_date, end_date):
        """Get daily metrics for a date range"""
        return PlatformMetrics.query.filter(
            PlatformMetrics.metric_date.between(start_date, end_date),
            PlatformMetrics.metric_hour.is_(None)
        ).order_by(PlatformMetrics.metric_date).all()
    
    @staticmethod
    def get_hourly_metrics(date):
        """Get hourly metrics for a specific date"""
        return PlatformMetrics.query.filter(
            PlatformMetrics.metric_date == date,
            PlatformMetrics.metric_hour.isnot(None)
        ).order_by(PlatformMetrics.metric_hour).all()
    
    def __repr__(self):
        return f'<PlatformMetrics {self.metric_date} {self.metric_hour or "daily"}>'

# =============================================================================
# AI ASSESSMENT MODELS (FR_06, FR_17, FR_18)
# =============================================================================

class AIAssessment(db.Model):
    """
    AI-powered symptom assessment and triage system
    Supports text, audio, and Sudanese Arabic dialect input
    """
    __tablename__ = 'ai_assessments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)  # Optional link to appointment
    
    # Input data (FR_06, FR_17, FR_18)
    assessment_type = db.Column(db.Enum('text', 'audio', 'mixed', name='assessment_types'), default='text', nullable=False)
    input_language = db.Column(db.Enum('ar', 'en', 'ar_sd', name='input_languages'), default='ar', nullable=False)  # ar_sd = Sudanese Arabic
    
    # Text input (FR_06, FR_17)
    symptoms_input = db.Column(db.Text, nullable=True)      # Original user input
    original_text = db.Column(db.Text, nullable=True)       # Raw text before processing
    translated_text = db.Column(db.Text, nullable=True)     # Translated version if needed
    processed_symptoms = db.Column(db.JSON, nullable=True)  # Structured symptom data
    
    # Audio input (FR_18)
    audio_file_path = db.Column(db.String(500), nullable=True)        # Path to uploaded audio file
    audio_file_name = db.Column(db.String(255), nullable=True)        # Original filename
    audio_duration = db.Column(db.Integer, nullable=True)             # Duration in seconds
    audio_format = db.Column(db.String(10), nullable=True)            # mp3, wav, etc.
    audio_size = db.Column(db.Integer, nullable=True)                 # File size in bytes
    
    # Secure audio file handling (NFR_15)
    audio_encrypted = db.Column(db.Boolean, default=False, nullable=False)      # Is audio file encrypted
    audio_checksum = db.Column(db.String(64), nullable=True)                    # SHA-256 checksum for integrity
    audio_encryption_key_id = db.Column(db.String(255), nullable=True)          # Reference to encryption key
    audio_access_log = db.Column(db.JSON, nullable=True)                        # Access history log
    virus_scan_status = db.Column(db.Enum('pending', 'clean', 'infected', 'failed', name='virus_scan_statuses'), default='pending', nullable=True)
    
    # Transcription data (FR_18)
    transcription_text = db.Column(db.Text, nullable=True)            # Speech-to-text result
    transcription_confidence = db.Column(db.Float, nullable=True)     # Confidence score 0-1
    transcription_language = db.Column(db.String(10), nullable=True)  # Detected language
    transcription_dialect = db.Column(db.String(20), nullable=True)   # Detected dialect (Sudanese, etc.)
    
    # AI Response and Analysis
    ai_response = db.Column(db.Text, nullable=True)                   # AI assessment result
    confidence_score = db.Column(db.Float, nullable=True)             # Overall confidence 0-1
    risk_level = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='risk_levels'), nullable=True)
    recommended_action = db.Column(db.Enum('self_care', 'pharmacy', 'doctor_consultation', 'emergency', name='recommendation_types'), nullable=True)
    
    # Structured AI analysis
    identified_symptoms = db.Column(db.JSON, nullable=True)           # List of identified symptoms
    possible_conditions = db.Column(db.JSON, nullable=True)           # Potential diagnoses with confidence
    red_flags = db.Column(db.JSON, nullable=True)                    # Warning signs detected
    follow_up_questions = db.Column(db.JSON, nullable=True)           # Additional questions to ask
    
    # Processing metadata
    processing_time_ms = db.Column(db.Integer, nullable=True)         # Time taken for AI processing
    ai_model_version = db.Column(db.String(50), nullable=True)        # Version of AI model used
    processing_errors = db.Column(db.JSON, nullable=True)             # Any errors during processing
    
    # Quality and feedback
    user_feedback_rating = db.Column(db.Integer, nullable=True)       # 1-5 rating from user
    user_feedback_text = db.Column(db.Text, nullable=True)            # User feedback comments
    doctor_review_status = db.Column(db.Enum('pending', 'reviewed', 'approved', 'disputed', name='review_statuses'), default='pending')
    doctor_review_notes = db.Column(db.Text, nullable=True)           # Doctor's review of AI assessment
    reviewed_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=True)
    
    # Audit and timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)              # When assessment was completed
    
    # Relationships
    patient = db.relationship('Patient', backref='ai_assessments', lazy=True)
    appointment = db.relationship('Appointment', backref='ai_assessments', lazy=True)
    reviewed_by_doctor = db.relationship('Doctor', backref='reviewed_ai_assessments', lazy=True)
    
    def to_dict(self):
        """Convert AI assessment to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'appointment_id': self.appointment_id,
            'assessment_type': self.assessment_type,
            'input_language': self.input_language,
            
            # Input data
            'symptoms_input': self.symptoms_input,
            'processed_symptoms': self.processed_symptoms,
            
            # Audio data
            'audio_file_name': self.audio_file_name,
            'audio_duration': self.audio_duration,
            'audio_format': self.audio_format,
            'audio_encrypted': self.audio_encrypted,
            'virus_scan_status': self.virus_scan_status,
            'transcription_text': self.transcription_text,
            'transcription_confidence': self.transcription_confidence,
            'transcription_language': self.transcription_language,
            'transcription_dialect': self.transcription_dialect,
            
            # AI analysis
            'ai_response': self.ai_response,
            'confidence_score': self.confidence_score,
            'risk_level': self.risk_level,
            'recommended_action': self.recommended_action,
            'identified_symptoms': self.identified_symptoms,
            'possible_conditions': self.possible_conditions,
            'red_flags': self.red_flags,
            'follow_up_questions': self.follow_up_questions,
            
            # Metadata
            'processing_time_ms': self.processing_time_ms,
            'ai_model_version': self.ai_model_version,
            'user_feedback_rating': self.user_feedback_rating,
            'doctor_review_status': self.doctor_review_status,
            
            # Timestamps
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            
            # Related data
            'patient_name': self.patient.user.get_full_name() if self.patient else None,
            'reviewed_by': self.reviewed_by_doctor.user.get_full_name() if self.reviewed_by_doctor else None
        }
    
    def mark_completed(self):
        """Mark assessment as completed"""
        self.completed_at = datetime.utcnow()
        db.session.commit()
    
    def add_doctor_review(self, doctor_id, notes, status='reviewed'):
        """Add doctor review to the assessment"""
        self.reviewed_by_doctor_id = doctor_id
        self.doctor_review_notes = notes
        self.doctor_review_status = status
        self.updated_at = datetime.utcnow()
        db.session.commit()
    
    def calculate_processing_time(self, start_time):
        """Calculate and store processing time"""
        if start_time:
            processing_time = datetime.utcnow() - start_time
            self.processing_time_ms = int(processing_time.total_seconds() * 1000)
    
    @staticmethod
    def get_recent_assessments(patient_id, limit=10):
        """Get recent assessments for a patient"""
        return AIAssessment.query.filter_by(patient_id=patient_id).order_by(
            AIAssessment.created_at.desc()
        ).limit(limit).all()
    
    @staticmethod
    def get_pending_reviews():
        """Get assessments pending doctor review"""
        return AIAssessment.query.filter_by(doctor_review_status='pending').order_by(
            AIAssessment.created_at.asc()
        ).all()
    
    def log_audio_access(self, accessed_by_user_id, access_type='view'):
        """Log audio file access for security (NFR_15)"""
        if not self.audio_access_log:
            self.audio_access_log = []
        
        access_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': accessed_by_user_id,
            'access_type': access_type,  # 'view', 'download', 'delete'
            'ip_address': None  # Can be added from request context
        }
        
        # Keep only last 50 access entries
        self.audio_access_log.append(access_entry)
        if len(self.audio_access_log) > 50:
            self.audio_access_log = self.audio_access_log[-50:]
        
        db.session.commit()
    
    def verify_audio_integrity(self):
        """Verify audio file hasn't been tampered with (NFR_15)"""
        import hashlib
        import os
        
        if not self.audio_file_path or not self.audio_checksum:
            return False
        
        if not os.path.exists(self.audio_file_path):
            return False
        
        # Calculate current checksum
        with open(self.audio_file_path, 'rb') as f:
            current_checksum = hashlib.sha256(f.read()).hexdigest()
        
        return current_checksum == self.audio_checksum
    
    def __repr__(self):
        return f'<AIAssessment {self.id} - {self.assessment_type} for patient {self.patient_id}>'


class ConsultationSession(db.Model):
    """
    Extended consultation session tracking for advanced analytics
    Separate from Appointment for detailed session management
    """
    __tablename__ = 'consultation_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False, unique=True)
    session_token = db.Column(db.String(255), nullable=False, unique=True)  # Secure session token
    
    # WebRTC and connection details
    webrtc_room_id = db.Column(db.String(255), nullable=True)         # WebRTC room identifier
    ice_servers_config = db.Column(db.JSON, nullable=True)            # ICE servers configuration used
    peer_connection_id = db.Column(db.String(255), nullable=True)     # Peer connection identifier
    
    # Participant tracking
    doctor_joined_at = db.Column(db.DateTime, nullable=True)
    patient_joined_at = db.Column(db.DateTime, nullable=True)
    doctor_left_at = db.Column(db.DateTime, nullable=True)
    patient_left_at = db.Column(db.DateTime, nullable=True)
    
    # Connection quality metrics
    initial_connection_time_ms = db.Column(db.Integer, nullable=True)  # Time to establish connection
    average_latency_ms = db.Column(db.Integer, nullable=True)          # Average latency during session
    packet_loss_percentage = db.Column(db.Float, nullable=True)        # Packet loss percentage
    bandwidth_usage_kb = db.Column(db.Integer, nullable=True)          # Total bandwidth used
    
    # Technical events log
    connection_events = db.Column(db.JSON, nullable=True)             # Log of connection events
    quality_reports = db.Column(db.JSON, nullable=True)               # Periodic quality reports
    error_events = db.Column(db.JSON, nullable=True)                  # Technical errors encountered
    
    # Security and encryption (NFR_11)
    encryption_protocol = db.Column(db.String(50), nullable=True)     # Encryption protocol used
    key_exchange_method = db.Column(db.String(50), nullable=True)     # Key exchange method
    security_events = db.Column(db.JSON, nullable=True)               # Security-related events
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    appointment = db.relationship('Appointment', backref=db.backref('session_details', uselist=False), lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'appointment_id': self.appointment_id,
            'session_token': self.session_token,
            'webrtc_room_id': self.webrtc_room_id,
            'doctor_joined_at': self.doctor_joined_at.isoformat() if self.doctor_joined_at else None,
            'patient_joined_at': self.patient_joined_at.isoformat() if self.patient_joined_at else None,
            'doctor_left_at': self.doctor_left_at.isoformat() if self.doctor_left_at else None,
            'patient_left_at': self.patient_left_at.isoformat() if self.patient_left_at else None,
            'initial_connection_time_ms': self.initial_connection_time_ms,
            'average_latency_ms': self.average_latency_ms,
            'packet_loss_percentage': self.packet_loss_percentage,
            'bandwidth_usage_kb': self.bandwidth_usage_kb,
            'encryption_protocol': self.encryption_protocol,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<ConsultationSession {self.id} for appointment {self.appointment_id}>'