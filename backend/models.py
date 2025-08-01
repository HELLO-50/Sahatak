from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# This will be initialized in app.py
db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    user_type = db.Column(db.Enum('patient', 'doctor', 'admin', name='user_types'), nullable=False)
    language_preference = db.Column(db.Enum('ar', 'en', name='languages'), default='ar', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
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
        return f"{self.first_name} {self.last_name}"
    
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
    
    def to_dict(self, include_sensitive=False):
        """Convert user to dictionary"""
        data = {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': self.get_full_name(),
            'user_type': self.user_type,
            'language_preference': self.language_preference,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        
        if include_sensitive:
            data['verification_token'] = self.verification_token
            
        return data
    
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
    medical_history = db.Column(db.Text, nullable=True)
    allergies = db.Column(db.Text, nullable=True)
    current_medications = db.Column(db.Text, nullable=True)
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
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Patient {self.user.get_full_name()}>'

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    phone = db.Column(db.String(20), nullable=False)
    license_number = db.Column(db.String(50), nullable=False, unique=True)
    specialty = db.Column(db.String(100), nullable=False)
    years_of_experience = db.Column(db.Integer, nullable=False)
    qualification = db.Column(db.Text, nullable=True)
    hospital_affiliation = db.Column(db.String(200), nullable=True)
    consultation_fee = db.Column(db.Numeric(10, 2), nullable=True)
    available_hours = db.Column(db.JSON, nullable=True)  # Store as JSON
    bio = db.Column(db.Text, nullable=True)
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    rating = db.Column(db.Float, default=0.0, nullable=False)
    total_reviews = db.Column(db.Integer, default=0, nullable=False)
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
            'license_number': self.license_number,
            'specialty': self.specialty,
            'years_of_experience': self.years_of_experience,
            'qualification': self.qualification,
            'hospital_affiliation': self.hospital_affiliation,
            'consultation_fee': str(self.consultation_fee) if self.consultation_fee else None,
            'available_hours': self.available_hours,
            'bio': self.bio,
            'is_verified': self.is_verified,
            'rating': self.rating,
            'total_reviews': self.total_reviews,
            'created_at': self.created_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Doctor {self.user.get_full_name()} - {self.specialty}>'

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    appointment_type = db.Column(db.Enum('video', 'audio', 'chat', name='appointment_types'), default='video', nullable=False)
    status = db.Column(db.Enum('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', name='appointment_statuses'), default='scheduled', nullable=False)
    reason_for_visit = db.Column(db.Text, nullable=True)
    symptoms = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    diagnosis = db.Column(db.Text, nullable=True)
    prescription = db.Column(db.Text, nullable=True)
    follow_up_date = db.Column(db.DateTime, nullable=True)
    consultation_fee = db.Column(db.Numeric(10, 2), nullable=True)
    payment_status = db.Column(db.Enum('pending', 'paid', 'refunded', name='payment_statuses'), default='pending', nullable=False)
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def __repr__(self):
        return f'<Appointment {self.id} - {self.patient.user.get_full_name()} with {self.doctor.user.get_full_name()}>'


# =============================================================================
# ADMIN MODELS
# =============================================================================

class SystemSettings(db.Model):
    """
    Ahmed: System-wide configuration settings
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
    Ahmed: Audit trail for admin actions and important system events
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
    recipient_type = db.Column(db.Enum('user', 'email', 'phone', name='recipient_types'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # For user notifications
    recipient_value = db.Column(db.String(255), nullable=True)  # Email or phone for direct notifications
    notification_type = db.Column(db.Enum('email', 'sms', 'push', 'in_app', name='notification_types'), nullable=False)
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