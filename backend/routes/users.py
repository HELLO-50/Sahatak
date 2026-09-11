from flask import Blueprint, request, current_app, jsonify, send_from_directory
from flask_login import login_required, current_user
from models import db, User, Patient, Doctor
from utils.validators import validate_name, validate_phone, validate_age
from utils.responses import APIResponse, success_response, error_response, not_found_response
from utils.logging_config import app_logger
from datetime import datetime
from routes.auth import api_login_required
import os
import uuid

users_bp = Blueprint('users', __name__)

# Allowed image extensions for profile picture uploads
AVATAR_ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5MB (MAX_CONTENT_LENGTH of 16MB still applies globally)

@users_bp.route('/profile', methods=['GET'])
@api_login_required
def get_profile():
    """Get user profile with complete information"""
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
        current_app.logger.error(f"Get profile error: {str(e)}")
        return APIResponse.internal_error(message='Failed to get profile')

@users_bp.route('/profile', methods=['PUT'])
@api_login_required
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        
        # Update basic user information
        if 'full_name' in data:
            from utils.validators import validate_full_name
            name_validation = validate_full_name(data['full_name'])
            if not name_validation['valid']:
                return APIResponse.validation_error(
                    message=name_validation['message'],
                    field='full_name'
                )
            current_user.full_name = data['full_name'].strip()
        
        if 'language_preference' in data:
            from utils.validators import validate_enum_field
            lang_validation = validate_enum_field(
                data['language_preference'], 
                current_app.config.get('LANGUAGES', ['ar', 'en']), 
                'language_preference'
            )
            if not lang_validation['valid']:
                return APIResponse.validation_error(
                    message=lang_validation['message'],
                    field='language_preference'
                )
            current_user.language_preference = data['language_preference']
        
        # Update profile-specific information
        profile = current_user.get_profile()
        if profile:
            if current_user.user_type == 'patient':
                # Update patient profile
                if 'phone' in data:
                    phone_validation = validate_phone(data['phone'])
                    if not phone_validation['valid']:
                        return APIResponse.validation_error(
                            message=phone_validation['message'],
                            field='phone'
                        )
                    profile.phone = data['phone'].strip()
                
                if 'age' in data:
                    age_validation = validate_age(data['age'])
                    if not age_validation['valid']:
                        return APIResponse.validation_error(
                            message=age_validation['message'],
                            field='age'
                        )
                    profile.age = int(data['age'])
                
                if 'gender' in data:
                    if data['gender'] not in ['male', 'female']:
                        return jsonify({
                            'success': False,
                            'message': 'Invalid gender',
                            'field': 'gender'
                        }), 400
                    profile.gender = data['gender']
                
                # Update optional fields
                optional_fields = ['blood_type', 'emergency_contact', 'medical_history', 'allergies', 'current_medications']
                for field in optional_fields:
                    if field in data:
                        setattr(profile, field, data[field])
                        
            elif current_user.user_type == 'doctor':
                # Update doctor profile
                if 'phone' in data:
                    if not validate_phone(data['phone']):
                        return jsonify({
                            'success': False,
                            'message': 'Invalid phone number format',
                            'field': 'phone'
                        }), 400
                    profile.phone = data['phone'].strip()
                
                # Update optional fields
                optional_fields = ['qualification', 'hospital_affiliation', 'consultation_fee', 'bio', 'available_hours']
                for field in optional_fields:
                    if field in data:
                        setattr(profile, field, data[field])
        
        # Update timestamps
        current_user.updated_at = datetime.utcnow()
        if profile:
            profile.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Return updated profile
        user_data = current_user.to_dict()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update profile error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to update profile'
        }), 500

@users_bp.route('/doctors', methods=['GET'])
def get_doctors():
    """Get list of verified doctors with participation filtering"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        specialty = request.args.get('specialty')
        participation_type = request.args.get('participation_type')  # New filter
        
        # Build query
        query = Doctor.query.filter_by(is_verified=True).join(User, Doctor.user_id == User.id).filter_by(is_active=True)
        
        # Filter by specialty if provided
        if specialty:
            query = query.filter(Doctor.specialty == specialty)
        
        # Filter by participation type if provided
        if participation_type and participation_type in ['volunteer', 'paid']:
            query = query.filter(Doctor.participation_type == participation_type)
        
        # Add ordering - prioritize volunteer doctors, then by rating and experience
        query = query.order_by(
            Doctor.participation_type.asc(),  # volunteer comes before paid
            Doctor.rating.desc(), 
            Doctor.years_of_experience.desc()
        )
        
        # Paginate
        doctors = query.paginate(
            page=page, 
            per_page=min(per_page, 50),  # Limit max per_page
            error_out=False
        )
        
        # Format response with enhanced participation info
        doctor_list = []
        for doctor in doctors.items:
            doctor_data = doctor.to_dict()
            doctor_data['user'] = {
                'full_name': doctor.user.get_full_name(),
                'language_preference': doctor.user.language_preference
            }
            # Highlight participation info for patient booking
            doctor_data['participation_info'] = {
                'type': doctor.participation_type,
                'is_free': doctor.participation_type == 'volunteer',
                'consultation_fee': str(doctor.consultation_fee) if doctor.consultation_fee else '0.00',
                'display_fee': 'Free' if doctor.participation_type == 'volunteer' else f"{doctor.consultation_fee} SDG"
            }
            doctor_list.append(doctor_data)
        
        return success_response(
            message="Doctors retrieved successfully",
            data={
                'doctors': doctor_list,
                'pagination': {
                    'page': doctors.page,
                    'pages': doctors.pages,
                    'per_page': doctors.per_page,
                    'total': doctors.total,
                    'has_next': doctors.has_next,
                    'has_prev': doctors.has_prev
                }
            }
        )
        
    except Exception as e:
        app_logger.error(f"Get doctors error: {str(e)}")
        return error_response("Failed to get doctors list", 500)

@users_bp.route('/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor_details(doctor_id):
    """Get detailed information about a specific doctor"""
    try:
        doctor = Doctor.query.filter_by(id=doctor_id, is_verified=True).join(User, Doctor.user_id == User.id).filter_by(is_active=True).first()
        
        if not doctor:
            return not_found_response("Doctor")
        
        doctor_data = doctor.to_dict()
        doctor_data['user'] = {
            'full_name': doctor.user.get_full_name(),
            'language_preference': doctor.user.language_preference,
            'created_at': doctor.user.created_at.isoformat()
        }
        # Add participation info for detailed view
        doctor_data['participation_info'] = {
            'type': doctor.participation_type,
            'is_free': doctor.participation_type == 'volunteer',
            'consultation_fee': str(doctor.consultation_fee) if doctor.consultation_fee else '0.00',
            'display_fee': 'Free' if doctor.participation_type == 'volunteer' else f"{doctor.consultation_fee} SDG"
        }
        
        return success_response(
            message="Doctor details retrieved successfully",
            data={'doctor': doctor_data}
        )
        
    except Exception as e:
        app_logger.error(f"Get doctor details error: {str(e)}")
        return error_response("Failed to get doctor details", 500)

@users_bp.route('/specialties', methods=['GET'])
def get_specialties():
    """Get available medical specialties"""
    try:
        # Get unique specialties from active, verified doctors
        specialties = db.session.query(Doctor.specialty).join(User, Doctor.user_id == User.id).filter(
            Doctor.is_verified == True,
            User.is_active == True
        ).distinct().all()
        
        specialty_list = [specialty[0] for specialty in specialties if specialty[0]]
        
        return jsonify({
            'success': True,
            'data': {
                'specialties': specialty_list
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get specialties error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to get specialties'
        }), 500

@users_bp.route('/deactivate', methods=['POST'])
@api_login_required
def deactivate_account():
    """Deactivate user account"""
    try:
        data = request.get_json()
        
        # Verify password for security
        if not data.get('password'):
            return jsonify({
                'success': False,
                'message': 'Password is required to deactivate account'
            }), 400
        
        if not current_user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid password'
            }), 401
        
        # Deactivate account
        current_user.is_active = False
        current_user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account deactivated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Deactivate account error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to deactivate account'
        }), 500


@users_bp.route('/profile/avatar', methods=['POST'])
@api_login_required
def upload_profile_avatar():
    """
    Upload/replace the authenticated user's profile picture.
    Expects multipart/form-data with an 'image' field (also accepts 'file'/'avatar').
    Returns: { success, message, data: { avatar, profile_picture, user } }
    (Top-level 'avatar'/'user' duplicates are included for mobile-app compatibility.)
    """
    try:
        file = (request.files.get('image')
                or request.files.get('file')
                or request.files.get('avatar'))

        if not file or file.filename == '':
            return APIResponse.validation_error(
                field='image',
                message='No image file provided'
            )

        filename = file.filename or ''
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
        if ext not in AVATAR_ALLOWED_EXTENSIONS:
            return APIResponse.validation_error(
                field='image',
                message='File type not supported. Use PNG, JPG, JPEG, WEBP, or GIF.'
            )

        # Enforce a per-file size limit (Flask's MAX_CONTENT_LENGTH also guards the request)
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > AVATAR_MAX_SIZE_BYTES:
            return APIResponse.validation_error(
                field='image',
                message='Image too large. Maximum size is 5MB.'
            )

        upload_dir = current_app.config.get(
            'UPLOAD_FOLDER',
            os.path.join(current_app.root_path, 'static', 'uploads')
        )
        os.makedirs(upload_dir, exist_ok=True)

        safe_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
        file_path = os.path.join(upload_dir, safe_filename)
        file.save(file_path)

        avatar_url = f"/static/uploads/{safe_filename}"
        current_user.profile_picture = avatar_url
        db.session.commit()

        app_logger.info(f"Profile picture updated for user {current_user.id}: {avatar_url}")

        user_data = current_user.to_dict()

        # Response shape expected by the mobile app's uploadAvatarApi():
        # inner.avatar (or inner.profile_picture) + inner.user
        return jsonify({
            'success': True,
            'message': 'Profile picture updated successfully',
            'data': {
                'avatar': avatar_url,
                'profile_picture': avatar_url,
                'user': user_data
            },
            'avatar': avatar_url,
            'profile_picture': avatar_url,
            'user': user_data
        }), 200

    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Avatar upload error for user {getattr(current_user, 'id', '?')}: {str(e)}")
        return APIResponse.internal_error(message='Failed to upload profile picture')