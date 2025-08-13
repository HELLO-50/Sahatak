from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from datetime import datetime
from models import db, User, Patient, Doctor
from utils.validators import validate_email, validate_password, validate_phone
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import auth_logger, log_user_action
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (patient or doctor)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'full_name', 'user_type']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.validation_error(
                    field=field,
                    message=f'{field} is required'
                )
        
        # Validate email format
        if not validate_email(data['email']):
            return APIResponse.validation_error(
                field='email',
                message='Invalid email format'
            )
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=data['email'].lower()).first()
        if existing_user:
            auth_logger.warning(f"Registration attempt with existing email: {data['email']}")
            return APIResponse.conflict(
                message='Email already registered',
                field='email'
            )
        
        # Validate password
        password_validation = validate_password(data['password'])
        if not password_validation['valid']:
            return APIResponse.validation_error(
                field='password',
                message=password_validation['message']
            )
        
        # Validate user type
        if data['user_type'] not in ['patient', 'doctor']:
            return APIResponse.validation_error(
                field='user_type',
                message='Invalid user type. Must be patient or doctor'
            )
        
        # Validate full name
        from backend.utils.validators import validate_full_name
        full_name_validation = validate_full_name(data['full_name'])
        if not full_name_validation['valid']:
            return APIResponse.validation_error(
                field='full_name',
                message=full_name_validation['message']
            )
        
        # Create user
        user = User(
            email=data['email'].lower().strip(),
            full_name=data['full_name'].strip(),
            user_type=data['user_type'],
            language_preference=data.get('language_preference', 'ar')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.flush()  # Get user ID without committing
        
        # Create specific profile based on user type
        if data['user_type'] == 'patient':
            # Validate patient-specific fields
            patient_required = ['phone', 'age', 'gender']
            for field in patient_required:
                if not data.get(field):
                    return jsonify({
                        'success': False,
                        'message': f'{field} is required for patients',
                        'field': field
                    }), 400
            
            # Validate phone
            if not validate_phone(data['phone']):
                return jsonify({
                    'success': False,
                    'message': 'Invalid phone number format',
                    'field': 'phone'
                }), 400
            
            # Validate age
            try:
                age = int(data['age'])
                if age < 1 or age > 120:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'Age must be between 1 and 120',
                    'field': 'age'
                }), 400
            
            # Validate gender
            if data['gender'] not in ['male', 'female']:
                return jsonify({
                    'success': False,
                    'message': 'Gender must be male or female',
                    'field': 'gender'
                }), 400
            
            # Create patient profile
            patient = Patient(
                user_id=user.id,
                phone=data['phone'].strip(),
                age=age,
                gender=data['gender'],
                blood_type=data.get('blood_type'),
                emergency_contact=data.get('emergency_contact'),
                medical_history=data.get('medical_history'),
                allergies=data.get('allergies'),
                current_medications=data.get('current_medications')
            )
            db.session.add(patient)
            
        elif data['user_type'] == 'doctor':
            # Validate doctor-specific fields
            doctor_required = ['phone', 'license_number', 'specialty', 'years_of_experience']
            for field in doctor_required:
                if not data.get(field):
                    return jsonify({
                        'success': False,
                        'message': f'{field} is required for doctors',
                        'field': field
                    }), 400
            
            # Validate phone
            if not validate_phone(data['phone']):
                return jsonify({
                    'success': False,
                    'message': 'Invalid phone number format',
                    'field': 'phone'
                }), 400
            
            # Validate years of experience
            try:
                experience = int(data['years_of_experience'])
                if experience < 0 or experience > 50:
                    raise ValueError()
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'Years of experience must be between 0 and 50',
                    'field': 'years_of_experience'
                }), 400
            
            # Check if license number already exists
            existing_license = Doctor.query.filter_by(license_number=data['license_number']).first()
            if existing_license:
                return jsonify({
                    'success': False,
                    'message': 'License number already registered',
                    'field': 'license_number'
                }), 409
            
            # Create doctor profile
            doctor = Doctor(
                user_id=user.id,
                phone=data['phone'].strip(),
                license_number=data['license_number'].strip(),
                specialty=data['specialty'].strip(),
                years_of_experience=experience,
                qualification=data.get('qualification'),
                hospital_affiliation=data.get('hospital_affiliation'),
                consultation_fee=data.get('consultation_fee'),
                bio=data.get('bio')
            )
            db.session.add(doctor)
        
        # Commit transaction
        db.session.commit()
        
        # Log successful registration
        log_user_action(user.id, 'user_registered', {
            'user_type': user.user_type,
            'email': user.email
        }, request)
        
        auth_logger.info(f"New user registered: {user.email} ({user.user_type})")
        
        return APIResponse.success(
            data=user.to_dict(),
            message='User registered successfully',
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        auth_logger.error(f"Registration error: {str(e)}")
        return APIResponse.internal_error(
            message='Registration failed. Please try again.'
        )

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Email and password are required'
            }), 400
        
        # Find user by email
        user = User.query.filter_by(email=data['email'].lower().strip()).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid email or password'
            }), 401
        
        # Check if user is active
        if not user.is_active:
            return jsonify({
                'success': False,
                'message': 'Account is deactivated. Please contact support.'
            }), 401
        
        # Login user and update last login
        login_user(user, remember=data.get('remember_me', False))
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Prepare response with user data and profile
        user_data = user.to_dict()
        profile = user.get_profile()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Login failed. Please try again.'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user"""
    try:
        logout_user()
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Logout failed'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """Get current user information"""
    try:
        user_data = current_user.to_dict()
        profile = current_user.get_profile()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get current user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get user information'
        }), 500

@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        # Check current password
        if not current_user.check_password(data['current_password']):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Validate new password
        password_validation = validate_password(data['new_password'])
        if not password_validation['valid']:
            return jsonify({
                'success': False,
                'message': password_validation['message']
            }), 400
        
        # Update password
        current_user.set_password(data['new_password'])
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Change password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to change password'
        }), 500

@auth_bp.route('/update-language', methods=['POST'])
@login_required
def update_language():
    """Update user language preference"""
    try:
        data = request.get_json()
        
        # Validate language
        if not data.get('language') or data['language'] not in ['ar', 'en']:
            return jsonify({
                'success': False,
                'message': 'Invalid language. Must be ar or en'
            }), 400
        
        # Update language preference
        current_user.language_preference = data['language']
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Language preference updated successfully',
            'language': current_user.language_preference
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update language error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update language preference'
        }), 500