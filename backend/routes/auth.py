from flask import Blueprint, request, jsonify, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from datetime import datetime
from models import db, User, Patient, Doctor
from utils.validators import validate_email, validate_password, validate_phone
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import auth_logger, log_user_action
from services.notification_service import NotificationService
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (patient or doctor)"""
    try:
        data = request.get_json()
        
        # Validate required fields - email is now required for all users
        required_fields = ['password', 'full_name', 'user_type', 'phone', 'email']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.validation_error(
                    field=field,
                    message=f'{field} is required'
                )
        
        # Validate phone number (required)
        if not validate_phone(data['phone']):
            return APIResponse.validation_error(
                field='phone',
                message='Invalid phone number format'
            )
        
        # Validate email format (now required)
        email = data.get('email', '').strip()
        if not validate_email(email):
            return APIResponse.validation_error(
                field='email',
                message='Invalid email format'
            )
        
        # Check if phone already exists
        existing_user_phone = User.query.join(Patient).filter(Patient.phone == data['phone']).first()
        if not existing_user_phone:
            existing_user_phone = User.query.join(Doctor).filter(Doctor.phone == data['phone']).first()
        if existing_user_phone:
            auth_logger.warning(f"Registration attempt with existing phone: {data['phone']}")
            return APIResponse.conflict(
                message='Phone number already registered',
                field='phone'
            )
        
        # Check if email already exists (now always provided)
        existing_user_email = User.query.filter_by(email=email.lower()).first()
        if existing_user_email:
            auth_logger.warning(f"Registration attempt with existing email: {email}")
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
        from utils.validators import validate_full_name
        full_name_validation = validate_full_name(data['full_name'])
        if not full_name_validation['valid']:
            return APIResponse.validation_error(
                field='full_name',
                message=full_name_validation['message']
            )
        
        # Create user
        user = User(
            email=email.lower(),
            full_name=data['full_name'].strip(),
            user_type=data['user_type'],
            language_preference=data.get('language_preference', 'ar'),
            is_verified=False  # All users must verify email before account activation
        )
        user.set_password(data['password'])
        
        # Generate verification token (always required now)
        import secrets
        user.verification_token = secrets.token_urlsafe(32)
        
        db.session.add(user)
        db.session.flush()  # Get user ID without committing
        
        # Create specific profile based on user type
        if data['user_type'] == 'patient':
            # Validate patient-specific fields (phone already validated above)
            patient_required = ['age', 'gender']
            for field in patient_required:
                if not data.get(field):
                    return APIResponse.validation_error(
                        field=field,
                        message=f'{field} is required for patients'
                    )
            
            # Validate age
            from utils.validators import validate_age
            age_validation = validate_age(data['age'])
            if not age_validation['valid']:
                return APIResponse.validation_error(
                    field='age',
                    message=age_validation['message']
                )
            age = int(data['age'])
            
            # Validate gender
            if data['gender'] not in ['male', 'female']:
                return APIResponse.validation_error(
                    field='gender',
                    message='Gender must be male or female'
                )
            
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
            # Validate doctor-specific fields (phone already validated above)
            doctor_required = ['license_number', 'specialty', 'years_of_experience']
            for field in doctor_required:
                if not data.get(field):
                    return APIResponse.validation_error(
                        field=field,
                        message=f'{field} is required for doctors'
                    )
            
            # Validate license number
            from utils.validators import validate_license_number
            license_validation = validate_license_number(data['license_number'])
            if not license_validation['valid']:
                return APIResponse.validation_error(
                    field='license_number',
                    message=license_validation['message']
                )
            
            # Validate specialty
            from utils.validators import validate_specialty
            specialty_validation = validate_specialty(data['specialty'])
            if not specialty_validation['valid']:
                return APIResponse.validation_error(
                    field='specialty',
                    message=specialty_validation['message']
                )
            
            # Validate years of experience
            try:
                experience = int(data['years_of_experience'])
                if experience < 0 or experience > 50:
                    raise ValueError()
            except (ValueError, TypeError):
                return APIResponse.validation_error(
                    field='years_of_experience',
                    message='Years of experience must be between 0 and 50'
                )
            
            # Check if license number already exists
            existing_license = Doctor.query.filter_by(license_number=data['license_number']).first()
            if existing_license:
                return APIResponse.conflict(
                    message='License number already registered',
                    field='license_number'
                )
            
            # Create doctor profile
            doctor = Doctor(
                user_id=user.id,
                phone=data['phone'].strip(),
                phone_country=data.get('phone_country'),
                license_number=data['license_number'].strip(),
                license_country=data.get('license_country'),
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
        
        # Send email confirmation (always required now)
        try:
            email_language = data.get('language_preference', 'ar')
            auth_logger.info(f"=== EMAIL LANGUAGE DEBUG ===")
            auth_logger.info(f"Raw registration data keys: {list(data.keys())}")
            auth_logger.info(f"Language preference in data: '{data.get('language_preference')}'")
            auth_logger.info(f"Language preference type: {type(data.get('language_preference'))}")
            auth_logger.info(f"Final email language: '{email_language}'")
            auth_logger.info(f"Will use template: templates/email/{email_language}/email_confirmation.html")
            auth_logger.info(f"=============================")
            
            from services.email_service import email_service
            email_success = email_service.send_email_confirmation(
                recipient_email=email,
                user_data={
                    'full_name': user.full_name,
                    'verification_token': user.verification_token,
                    'user_type': user.user_type
                },
                language=email_language
            )
            
            if email_success:
                auth_logger.info(f"Email confirmation sent to {email}")
            else:
                auth_logger.warning(f"Failed to send email confirmation to {email}")
                
        except Exception as e:
            auth_logger.error(f"Error sending email confirmation: {str(e)}")
        
        # Log successful registration
        log_user_action(user.id, 'user_registered', {
            'user_type': user.user_type,
            'email': user.email
        }, request)
        
        auth_logger.info(f"New user registered: {user.email} ({user.user_type})")
        
        # Prepare response message (email verification always required)
        message = 'User registered successfully. Please check your email to verify your account.'
        
        return APIResponse.success(
            data={
                **user.to_dict(),
                'requires_email_verification': True  # Always true now since email is always required
            },
            message=message,
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
    """Login user with email or phone"""
    try:
        data = request.get_json()
        
        # Validate required fields
        login_identifier = data.get('login_identifier', '').strip()  # Can be email or phone
        password = data.get('password')
        
        if not login_identifier or not password:
            return APIResponse.validation_error(
                message='Email/phone and password are required'
            )
        
        # Find user by email or phone
        user = None
        
        # Try to find by email first
        if validate_email(login_identifier):
            user = User.query.filter_by(email=login_identifier.lower()).first()
        
        # If not found by email, try to find by phone
        if not user and validate_phone(login_identifier):
            # Search in patient profiles
            patient_user = User.query.join(Patient).filter(Patient.phone == login_identifier).first()
            if patient_user:
                user = patient_user
            else:
                # Search in doctor profiles
                doctor_user = User.query.join(Doctor).filter(Doctor.phone == login_identifier).first()
                if doctor_user:
                    user = doctor_user
        
        if not user or not user.check_password(password):
            return APIResponse.unauthorized(
                message='Invalid email/phone or password'
            )
        
        # Check if user is active
        if not user.is_active:
            return APIResponse.unauthorized(
                message='Account is deactivated. Please contact support.'
            )
        
        # Check if email verification is required  
        if user.email and not user.is_verified:
            return APIResponse.error(
                message="Please verify your email address before logging in. Check your email for verification link.",
                status_code=401,
                error_code=ErrorCodes.USER_NOT_VERIFIED
            )
        
        # Login user and update last login
        login_user(user, remember=data.get('remember_me', False))
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Prepare response with user data and profile
        user_data = user.to_dict()
        profile = user.get_profile()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        # Check if doctor needs to complete profile verification
        needs_verification = False
        verification_redirect = None
        
        if user.user_type == 'doctor' and profile:
            if not profile.profile_completed:
                needs_verification = True
                verification_redirect = '/doctor/complete-profile'
            elif profile.verification_status == 'pending':
                needs_verification = True
                verification_redirect = '/doctor/submit-verification'
            elif profile.verification_status == 'rejected':
                needs_verification = True
                verification_redirect = '/doctor/resubmit-verification'
        
        response_data = {
            'user': user_data,
            'needs_verification': needs_verification,
            'verification_redirect': verification_redirect
        }
        
        # Add verification status to response for doctors
        if user.user_type == 'doctor' and profile:
            response_data['verification_status'] = profile.verification_status
            response_data['profile_completed'] = profile.profile_completed
        
        return APIResponse.success(
            data=response_data,
            message='Login successful'
        )
        
    except Exception as e:
        auth_logger.error(f"Login error: {str(e)}")
        return APIResponse.internal_error(
            message='Login failed. Please try again.'
        )

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user and clear session"""
    try:
        user_id = current_user.id if current_user.is_authenticated else None
        user_email = current_user.email if current_user.is_authenticated else None
        
        # Log the logout action
        if user_id:
            log_user_action(user_id, 'user_logout', {
                'email': user_email
            }, request)
        
        # Clear the user session
        logout_user()
        
        auth_logger.info(f"User logged out: {user_email}")
        
        return APIResponse.success(
            message='Logout successful'
        )
        
    except Exception as e:
        auth_logger.error(f"Logout error: {str(e)}")
        return APIResponse.internal_error(
            message='Logout failed. Please try again.'
        )

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

@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    """Verify user email with token"""
    try:
        token = request.args.get('token')
        
        if not token:
            return APIResponse.validation_error(
                message='Verification token is required',
                field='token'
            )
        
        # Find user by verification token
        user = User.query.filter_by(verification_token=token).first()
        
        if not user:
            return APIResponse.not_found(
                message='Invalid or expired verification token'
            )
        
        # Check if user is already verified
        if user.is_verified:
            return APIResponse.success(
                data={
                    'verified': True,
                    'already_verified': True,
                    'user': {
                        'id': user.id,
                        'user_type': user.user_type,
                        'full_name': user.full_name,
                        'email': user.email
                    }
                },
                message='Email is already verified'
            )
        
        # Verify the user
        user.is_verified = True
        user.verification_token = None  # Clear the token
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log successful verification
        log_user_action(user.id, 'email_verified', {
            'email': user.email
        }, request)
        
        auth_logger.info(f"Email verified for user: {user.email}")
        
        return APIResponse.success(
            data={
                'verified': True,
                'user': {
                    'id': user.id,
                    'user_type': user.user_type,
                    'full_name': user.full_name,
                    'email': user.email
                }
            },
            message='Email verified successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        auth_logger.error(f"Email verification error: {str(e)}")
        return APIResponse.internal_error(
            message='Email verification failed. Please try again.'
        )

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend email verification"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return APIResponse.validation_error(
                message='Email is required',
                field='email'
            )
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return APIResponse.not_found(
                message='User not found'
            )
        
        # Check if user is already verified
        if user.is_verified:
            return APIResponse.success(
                message='Email is already verified'
            )
        
        # Generate new verification token
        import secrets
        user.verification_token = secrets.token_urlsafe(32)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Send verification email
        try:
            from services.email_service import email_service
            email_success = email_service.send_email_confirmation(
                recipient_email=email,
                user_data={
                    'full_name': user.full_name,
                    'verification_token': user.verification_token,
                    'user_type': user.user_type
                },
                language=user.language_preference
            )
            
            if email_success:
                auth_logger.info(f"Verification email resent to {email}")
            else:
                auth_logger.warning(f"Failed to resend verification email to {email}")
                
        except Exception as e:
            auth_logger.error(f"Error resending verification email: {str(e)}")
        
        return APIResponse.success(
            message='Verification email sent successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        auth_logger.error(f"Resend verification error: {str(e)}")
        return APIResponse.internal_error(
            message='Failed to resend verification email. Please try again.'
        )