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
    user_type = db.Column(db.Enum('patient', 'doctor', name='user_types'), nullable=False)
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