from flask import Blueprint, request, jsonify, current_app, make_response
from flask_login import current_user
from functools import wraps
import hashlib
from models import db, User, Patient, Doctor, Appointment
from datetime import datetime, timedelta
from routes.notifications import queue_notification, send_email
from sqlalchemy import func, text, and_, or_
from sqlalchemy.orm import joinedload
import os

# utils import
from utils.responses import APIResponse
from utils.responses import APIResponse, ErrorCodes
from utils.error_handlers import RequestValidationError
from utils.validators import validate_name, validate_phone, validate_age
from utils.logging_config import app_logger, log_user_action
from utils.logging_config import auth_logger, log_user_action
from utils.validators import validate_email, validate_password

# Database import
from models import SystemSettings
from models import AuditLog

# Create admin blueprint
admin_bp = Blueprint('admin', __name__)

# Add CORS preflight handler for all admin routes
@admin_bp.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        response = make_response()
        origin = request.headers.get('Origin')
        # Allow specific origins that need credentials
        allowed_origins = [
            'https://hello-50.github.io',
            'https://hmb104.github.io',
            'http://localhost:3000',
            'http://localhost:8000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8000'
        ]
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
        else:
            response.headers['Access-Control-Allow-Origin'] = 'https://hello-50.github.io'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

# Admin Authentication Decorator
def admin_required(f):
    """
    Decorator to check if user is admin with proper permissions
    Supports both session-based and token-based authentication
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First try token-based auth for cross-origin admin access
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
            # JWT token validation - force proper JWT usage
            try:
                from utils.jwt_helper import JWTHelper
                payload = JWTHelper.decode_token(token)
                
                if payload and payload.get('user_type') == 'admin':
                    user_id = payload.get('user_id')
                    admin_user = User.query.filter_by(id=user_id, user_type='admin').first()
                    
                    if admin_user and admin_user.is_active:
                        from flask_login import login_user
                        login_user(admin_user, remember=False, force=True)
                        app_logger.info(f"Admin JWT auth successful for user {user_id}")
                        return f(*args, **kwargs)
                else:
                    app_logger.warning(f"Invalid JWT payload: {payload}")
                    
            except Exception as e:
                app_logger.error(f"Admin JWT validation error: {str(e)}")
                # If JWT fails, check if PyJWT is properly installed
                try:
                    import jwt
                    app_logger.info("PyJWT is available, token validation issue")
                except ImportError:
                    app_logger.error("PyJWT is not installed - please install with: pip install PyJWT==2.8.0")
            
            # If we get here, token validation failed
            return APIResponse.error(
                message="Invalid admin token",
                status_code=401,
                error_code="INVALID_TOKEN"
            )
        
        # Fall back to session-based auth
        if not current_user.is_authenticated:
            return APIResponse.error(
                message="Authentication required",
                status_code=401,
                error_code="AUTH_REQUIRED"
            )
        
        # Check if user has admin role
        if not hasattr(current_user, 'user_type') or current_user.user_type != 'admin':
            log_user_action(
                current_user.id if current_user.is_authenticated else None,
                'admin_access_denied',
                {'endpoint': request.endpoint, 'ip': request.remote_addr}
            )
            return APIResponse.error(
                message="Admin access required",
                status_code=403,
                error_code="ADMIN_REQUIRED"
            )
        
        return f(*args, **kwargs)
    return decorated_function

# Input validation helpers
def validate_pagination_params(page=1, per_page=20):
    """Validate and sanitize pagination parameters"""
    try:
        page = max(1, int(page))
        per_page = min(100, max(1, int(per_page)))  # Cap at 100 items per page
        return page, per_page
    except ValueError:
        raise RequestValidationError("Invalid pagination parameters")

def validate_date_range(start_date, end_date):
    """Validate date range parameters"""
    try:
        if start_date:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        if start_date and end_date and start_date > end_date:
            raise RequestValidationError("Start date must be before end date")
            
        return start_date, end_date
    except ValueError:
        raise RequestValidationError("Invalid date format")

# =============================================================================
# DASHBOARD ENDPOINT
# =============================================================================

@admin_bp.route('/dashboard', methods=['GET', 'OPTIONS'])
@admin_required
def dashboard():
    """Get admin dashboard data"""
    
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func
        
        # Get basic statistics
        total_users = User.query.count()
        total_patients = User.query.filter_by(user_type='patient').count()
        total_doctors = User.query.filter_by(user_type='doctor').count()
        total_admins = User.query.filter_by(user_type='admin').count()
        
        # Get verified doctors count
        verified_doctors = Doctor.query.filter_by(is_verified=True).count()
        
        # Get total appointments
        total_appointments = Appointment.query.count()
        
        # Get recent activity data (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        
        # User activity metrics
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        new_users_7d = User.query.filter(User.created_at >= seven_days_ago).count()
        active_users_7d = User.query.filter(User.last_activity_at >= seven_days_ago).count() if hasattr(User, 'last_activity_at') else 0
        
        # Appointment metrics
        appointments_30d = Appointment.query.filter(Appointment.created_at >= thirty_days_ago).count()
        appointments_7d = Appointment.query.filter(Appointment.created_at >= seven_days_ago).count()
        completed_appointments = Appointment.query.filter_by(status='completed').count()
        
        # User registration trends (last 7 days)
        registration_trends = []
        for i in range(6, -1, -1):  # Start from 6 days ago and go to today
            day_start = datetime.utcnow() - timedelta(days=i+1)
            day_end = datetime.utcnow() - timedelta(days=i)
            count = User.query.filter(User.created_at >= day_start, User.created_at < day_end).count()
            registration_trends.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'count': count
            })
        # No need to reverse since we're already building in chronological order
        
        # Appointment booking trends (last 7 days)
        appointment_trends = []
        for i in range(6, -1, -1):  # Start from 6 days ago and go to today
            day_start = datetime.utcnow() - timedelta(days=i+1)
            day_end = datetime.utcnow() - timedelta(days=i)
            count = Appointment.query.filter(Appointment.created_at >= day_start, Appointment.created_at < day_end).count()
            appointment_trends.append({
                'date': day_start.strftime('%Y-%m-%d'),
                'count': count
            })
        # No need to reverse since we're already building in chronological order
        
        # Doctor specialty distribution
        specialty_stats = db.session.query(
            Doctor.specialty,
            func.count(Doctor.id).label('count')
        ).group_by(Doctor.specialty).all()
        
        specialty_distribution = [
            {'specialty': specialty, 'count': count}
            for specialty, count in specialty_stats
        ]
        
        # Appointment status distribution
        status_stats = db.session.query(
            Appointment.status,
            func.count(Appointment.id).label('count')
        ).group_by(Appointment.status).all()
        
        appointment_status = [
            {'status': status, 'count': count}
            for status, count in status_stats
        ]
        
        # Calculate system health metrics
        error_rate = 0  # Placeholder - could be calculated from logs
        uptime_percentage = 99.9  # Placeholder - could be calculated from monitoring
        avg_response_time = 150  # Placeholder - in milliseconds
        
        system_health = min(100, max(0, 100 - (error_rate * 10)))  # Simple calculation
        
        # Get recent activities (last 10)
        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
        
        return APIResponse.success(
            data={
                'stats': {
                    'total_users': total_users,
                    'total_patients': total_patients,
                    'total_doctors': total_doctors,
                    'total_admins': total_admins,
                    'verified_doctors': verified_doctors,
                    'total_appointments': total_appointments,
                    'system_health': system_health
                },
                'analytics': {
                    'user_activity': {
                        'new_users_30d': new_users_30d,
                        'new_users_7d': new_users_7d,
                        'active_users_7d': active_users_7d,
                        'registration_trends': registration_trends
                    },
                    'appointment_metrics': {
                        'appointments_30d': appointments_30d,
                        'appointments_7d': appointments_7d,
                        'completed_appointments': completed_appointments,
                        'appointment_trends': appointment_trends,
                        'appointment_status': appointment_status
                    },
                    'doctor_analytics': {
                        'specialty_distribution': specialty_distribution
                    },
                    'system_performance': {
                        'uptime_percentage': uptime_percentage,
                        'avg_response_time': avg_response_time,
                        'error_rate': error_rate
                    }
                },
                'recent_activities': [
                    {
                        'type': 'user_registration',
                        'description': f'New {user.user_type} registered: {user.full_name}',
                        'timestamp': user.created_at.isoformat()
                    }
                    for user in recent_users
                ]
            },
            message='Dashboard data loaded successfully'
        )
    except Exception as e:
        app_logger.error(f"Dashboard error: {str(e)}")
        return APIResponse.internal_error(
            message='Failed to load dashboard data'
        )

# =============================================================================
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@admin_bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    """Get paginated list of users with filtering and search"""
    try:
        # Placeholder implementation
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('user_type')
        search = request.args.get('search')
        status = request.args.get('status')
        
        page, per_page = validate_pagination_params(page, per_page)
        
        # Debug logging
        app_logger.info(f"Getting users - page: {page}, per_page: {per_page}, user_type: {user_type}, search: {search}, status: {status}")
        
        # Build base query
        query = User.query.options(
            joinedload(User.patient_profile),
            joinedload(User.doctor_profile)
        )
        
        # Exclude admin users from User Management unless specifically requested
        if user_type != 'admin':
            query = query.filter(User.user_type != 'admin')
        
        # Log total count before filters
        total_before_filters = query.count()
        app_logger.info(f"Total users before filters: {total_before_filters}")
        
        # Apply filters
        if user_type and user_type in ['patient', 'doctor', 'admin']:
            query = query.filter(User.user_type == user_type)
            app_logger.info(f"Applied user_type filter: {user_type}")
        
        if status is not None:
            is_active = status.lower() == 'true'
            query = query.filter(User.is_active == is_active)
        
        if search:
            search_filter = or_(
                User.full_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Log total count after all filters
        total_after_filters = query.count()
        app_logger.info(f"Total users after filters: {total_after_filters}")
        
        # Apply pagination
        users_pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        app_logger.info(f"Pagination results - items count: {len(users_pagination.items)}, total: {users_pagination.total}, pages: {users_pagination.pages}")
        
        # Format user data (exclude sensitive information)
        users_data = []
        for user in users_pagination.items:
            user_info = {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'phone': None,  # Will be populated from profile if exists
                'user_type': user.user_type,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'profile_completed': user.profile_completed if hasattr(user, 'profile_completed') else False
            }
            
            # Add type-specific information
            if user.user_type == 'doctor' and user.doctor_profile:
                user_info['phone'] = user.doctor_profile.phone  # Get phone from doctor profile
                user_info['doctor_info'] = {
                    'specialty': user.doctor_profile.specialty,
                    'license_number': user.doctor_profile.license_number,
                    'is_verified': user.doctor_profile.is_verified,
                    'years_of_experience': user.doctor_profile.years_of_experience
                }
            elif user.user_type == 'patient' and user.patient_profile:
                user_info['phone'] = user.patient_profile.phone  # Get phone from patient profile
                user_info['patient_info'] = {
                    'age': user.patient_profile.age,
                    'gender': user.patient_profile.gender,
                    'emergency_contact': user.patient_profile.emergency_contact
                }
            
            users_data.append(user_info)
        
        # Log admin action (skip if current_user not available in token auth)
        try:
            if current_user.is_authenticated:
                log_user_action(
                    current_user.id,
                    'admin_view_users',
                    {
                        'page': page,
                        'per_page': per_page,
                        'filters': {
                            'user_type': user_type,
                            'search': bool(search),
                            'status': status
                        },
                        'total_results': users_pagination.total
                    }
                )
        except Exception as e:
            # Skip logging if current_user is not available
            app_logger.debug(f"Skipping user action logging: {str(e)}")
        
        return APIResponse.success(
            data={
                'users': users_data,
                'pagination': {
                    'page': users_pagination.page,
                    'pages': users_pagination.pages,
                    'per_page': users_pagination.per_page,
                    'total': users_pagination.total,
                    'has_next': users_pagination.has_next,
                    'has_prev': users_pagination.has_prev
                }
            },
            message="Users retrieved successfully"
        )
        
    except RequestValidationError as e:
        return APIResponse.error(message=str(e), status_code=400)
    except Exception as e:
        app_logger.error(f"Admin get users error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve users",
            status_code=500
        )

@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user_details(user_id):
    """Get user details for admin view"""
    try:
        user = User.query.get(user_id)
        
        if not user:
            return APIResponse.error(
                message="User not found",
                status_code=404,
                error_code="USER_NOT_FOUND"
            )
        
        # Format user account data (only User table fields)
        user_data = {
            'id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'user_type': user.user_type,
            'language_preference': user.language_preference,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'registration_date': user.created_at.isoformat(),
            'registration_date_readable': user.created_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'account_status': 'Active' if user.is_active else 'Inactive',
            'email_verified': 'Yes' if user.is_verified else 'No',
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'last_login_readable': user.last_login.strftime('%Y-%m-%d %H:%M:%S UTC') if user.last_login else 'Never',
            'session_expires_at': user.session_expires_at.isoformat() if user.session_expires_at else None,
            'is_online': user.is_online,
            'last_seen_at': user.last_seen_at.isoformat() if user.last_seen_at else None,
            'last_activity_at': user.last_activity_at.isoformat() if user.last_activity_at else None,
            'auto_logout_warnings_sent': user.auto_logout_warnings_sent
        }
        
        log_user_action(
            current_user.id,
            'admin_view_user_details',
            {'target_user_id': user_id, 'user_type': user.user_type}
        )
        return APIResponse.success(
            data={'user': user_data},
            message="User details retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get user details error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve user details",
            status_code=500
        )

@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST', 'PUT'])
@admin_required
def toggle_user_status(user_id):
    """Ahmed: Toggle user active status"""
    try:
        user = User.query.get_or_404(user_id)
        
        if not user:
            return APIResponse.error(
                message="User not found",
                status_code=404,
                error_code="USER_NOT_FOUND"
            )
        
        # Prevent admin from deactivating themselves
        if user_id == current_user.id:
            return APIResponse.error(
                message="Cannot change your own status",
                status_code=400,
                error_code="CANNOT_MODIFY_SELF"
            )
        
        # Prevent deactivation of master admin user
        if user.email == 'admin':
            return APIResponse.error(
                message="Cannot modify master admin user status",
                status_code=400,
                error_code="CANNOT_MODIFY_MASTER_ADMIN"
            )
        
        old_status = user.is_active
        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        db.session.commit()
            
        # Send notification to user
        notification_title = "Account Status Update"
        notification_message = f"Your account has been {'activated' if user.is_active else 'deactivated'} by an administrator."
              
        queue_notification(
            user_id=user_id,
            title=notification_title,
            message=notification_message,
            notification_type='warning' if not user.is_active else 'info',
            send_email=True
        )
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_toggle_user_status',
            {
                'target_user_id': user_id,
                'target_email': user.email, # i add the email
                'old_status': old_status,
                'new_status': user.is_active
            }
        )
        
        return APIResponse.success(
            data={'user_id': user_id, 'is_active': user.is_active},
            message=f"User {'activated' if user.is_active else 'deactivated'} successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Admin toggle user status error: {str(e)}")
        return APIResponse.error(
            message="Failed to update user status",
            status_code=500
        )

@admin_bp.route('/users/<int:user_id>/change-password', methods=['PUT'])
@admin_required
def change_user_password(user_id):
    """Change user password (admin only)"""
    try:
        user = User.query.get_or_404(user_id)
        
        if not user:
            return APIResponse.error(
                message="User not found",
                status_code=404,
                error_code="USER_NOT_FOUND"
            )
        
        data = request.get_json()
        if not data or 'new_password' not in data:
            return APIResponse.error(
                message="New password is required",
                status_code=400,
                error_code="MISSING_PASSWORD"
            )
        
        new_password = data['new_password'].strip()
        if len(new_password) < 6:
            return APIResponse.error(
                message="Password must be at least 6 characters long",
                status_code=400,
                error_code="PASSWORD_TOO_SHORT"
            )
        
        # Update password using the model's method
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_change_user_password',
            {
                'target_user_id': user_id,
                'target_user_email': user.email,
                'admin_email': current_user.email
            }
        )
        
        return APIResponse.success(
            data={'user_id': user_id},
            message="Password changed successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Admin change password error: {str(e)}")
        return APIResponse.error(
            message="Failed to change password",
            status_code=500
        )

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    """Delete user (admin only) - Use with extreme caution"""
    try:
        user = User.query.get_or_404(user_id)
        
        if not user:
            return APIResponse.error(
                message="User not found",
                status_code=404,
                error_code="USER_NOT_FOUND"
            )
        
        # Prevent admin from deleting themselves
        if user.id == current_user.id:
            return APIResponse.error(
                message="Cannot delete your own account",
                status_code=400,
                error_code="CANNOT_DELETE_SELF"
            )
        
        # Prevent deletion of master admin user
        if user.email == 'admin':
            return APIResponse.error(
                message="Cannot delete master admin user",
                status_code=400,
                error_code="CANNOT_DELETE_MASTER_ADMIN"
            )
        
        # Store user info for logging before deletion
        deleted_user_info = {
            'user_id': user.id,
            'email': user.email,
            'full_name': user.full_name,
            'user_type': user.user_type
        }
        
        # Delete user (this will cascade to related records)
        db.session.delete(user)
        db.session.commit()
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_delete_user',
            {
                'deleted_user': deleted_user_info,
                'admin_email': current_user.email
            }
        )
        
        return APIResponse.success(
            data={'deleted_user_id': user_id},
            message=f"User {deleted_user_info['full_name']} deleted successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Admin delete user error: {str(e)}")
        return APIResponse.error(
            message="Failed to delete user",
            status_code=500
        )

# =============================================================================
# APPOINTMENT MANAGEMENT ENDPOINTS
# =============================================================================

@admin_bp.route('/appointments', methods=['GET'])
@admin_required
def get_appointments():
    """Get paginated list of appointments with filtering for admin"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Get filter parameters
        status_filter = request.args.get('status')  # all, upcoming, today, completed, cancelled
        patient_search = request.args.get('patient_search')
        doctor_search = request.args.get('doctor_search')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        page, per_page = validate_pagination_params(page, per_page)
        
        # Build base query with all necessary joins
        query = Appointment.query.options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        )
        
        # Apply status filters
        if status_filter and status_filter != 'all':
            if status_filter == 'upcoming':
                query = query.filter(
                    and_(
                        Appointment.appointment_date > datetime.utcnow(),
                        Appointment.status == 'scheduled'
                    )
                )
            elif status_filter == 'today':
                today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
                today_end = today_start + timedelta(days=1)
                query = query.filter(
                    and_(
                        Appointment.appointment_date >= today_start,
                        Appointment.appointment_date < today_end
                    )
                )
            else:
                # completed, cancelled, etc.
                query = query.filter(Appointment.status == status_filter)
        
        # Apply search filters
        if patient_search:
            query = query.join(Patient).join(User, Patient.user_id == User.id).filter(
                or_(
                    User.full_name.ilike(f'%{patient_search}%'),
                    User.email.ilike(f'%{patient_search}%')
                )
            )
        
        if doctor_search:
            query = query.join(Doctor).join(User, Doctor.user_id == User.id).filter(
                or_(
                    User.full_name.ilike(f'%{doctor_search}%'),
                    User.email.ilike(f'%{doctor_search}%')
                )
            )
        
        # Apply date filters
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(Appointment.appointment_date >= date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                query = query.filter(Appointment.appointment_date <= date_to_obj)
            except ValueError:
                pass
        
        # Apply pagination
        appointments_pagination = query.order_by(Appointment.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Format appointment data
        appointments_data = []
        for appointment in appointments_pagination.items:
            appointment_info = {
                'id': appointment.id,
                'patient': {
                    'id': appointment.patient.id,
                    'name': appointment.patient.user.full_name,
                    'email': appointment.patient.user.email,
                    'phone': appointment.patient.phone
                },
                'doctor': {
                    'id': appointment.doctor.id,
                    'name': appointment.doctor.user.full_name,
                    'email': appointment.doctor.user.email,
                    'specialty': appointment.doctor.specialty
                },
                'appointment_date': appointment.appointment_date.isoformat(),
                'appointment_date_readable': appointment.appointment_date.strftime('%Y-%m-%d %H:%M'),
                'status': appointment.status,
                'appointment_type': appointment.appointment_type,
                'notes': appointment.notes,
                'created_at': appointment.created_at.isoformat(),
                'created_at_readable': appointment.created_at.strftime('%Y-%m-%d %H:%M'),
                'can_cancel': appointment.status in ['scheduled', 'confirmed'],
                'can_delete': appointment.status in ['cancelled', 'completed']
            }
            appointments_data.append(appointment_info)
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_view_appointments',
            {
                'page': page,
                'per_page': per_page,
                'total_results': appointments_pagination.total,
                'filters': {
                    'status': status_filter,
                    'patient_search': bool(patient_search),
                    'doctor_search': bool(doctor_search),
                    'date_range': bool(date_from or date_to)
                }
            }
        )
        
        return APIResponse.success(
            data={
                'appointments': appointments_data,
                'pagination': {
                    'page': appointments_pagination.page,
                    'pages': appointments_pagination.pages,
                    'per_page': appointments_pagination.per_page,
                    'total': appointments_pagination.total,
                    'has_next': appointments_pagination.has_next,
                    'has_prev': appointments_pagination.has_prev
                }
            },
            message="Appointments retrieved successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get appointments error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve appointments",
            status_code=500
        )

@admin_bp.route('/appointments/<int:appointment_id>/cancel', methods=['PUT'])
@admin_required
def cancel_appointment(appointment_id):
    """Cancel an appointment (admin only)"""
    try:
        appointment = Appointment.query.options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).get(appointment_id)
        
        if not appointment:
            return APIResponse.error(
                message="Appointment not found",
                status_code=404,
                error_code="APPOINTMENT_NOT_FOUND"
            )
        
        # Check if appointment can be cancelled
        if appointment.status not in ['scheduled', 'confirmed']:
            return APIResponse.error(
                message="Appointment cannot be cancelled",
                status_code=400,
                error_code="APPOINTMENT_NOT_CANCELLABLE"
            )
        
        # Get cancellation reason
        data = request.get_json() or {}
        cancel_reason = data.get('reason', 'Cancelled by admin').strip()
        
        # Update appointment status
        old_status = appointment.status
        appointment.status = 'cancelled'
        appointment.notes = f"{appointment.notes or ''}\n[ADMIN CANCELLED: {cancel_reason}]".strip()
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Send notifications to patient and doctor
        queue_notification(
            user_id=appointment.patient.user_id,
            title="Appointment Cancelled",
            message=f"Your appointment with Dr. {appointment.doctor.user.full_name} on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} has been cancelled by admin. Reason: {cancel_reason}",
            notification_type='warning',
            send_email=True
        )
        
        queue_notification(
            user_id=appointment.doctor.user_id,
            title="Appointment Cancelled", 
            message=f"Your appointment with {appointment.patient.user.full_name} on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} has been cancelled by admin. Reason: {cancel_reason}",
            notification_type='info',
            send_email=True
        )
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_cancel_appointment',
            {
                'appointment_id': appointment_id,
                'patient_name': appointment.patient.user.full_name,
                'doctor_name': appointment.doctor.user.full_name,
                'appointment_date': appointment.appointment_date.isoformat(),
                'old_status': old_status,
                'cancel_reason': cancel_reason
            }
        )
        
        return APIResponse.success(
            data={
                'appointment_id': appointment_id,
                'new_status': 'cancelled',
                'updated_at': appointment.updated_at.isoformat()
            },
            message="Appointment cancelled successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Admin cancel appointment error: {str(e)}")
        return APIResponse.error(
            message="Failed to cancel appointment",
            status_code=500
        )

@admin_bp.route('/appointments/<int:appointment_id>', methods=['DELETE'])
@admin_required
def delete_appointment(appointment_id):
    """Delete an appointment (admin only) - Use with extreme caution"""
    try:
        appointment = Appointment.query.options(
            joinedload(Appointment.patient).joinedload(Patient.user),
            joinedload(Appointment.doctor).joinedload(Doctor.user)
        ).get(appointment_id)
        
        if not appointment:
            return APIResponse.error(
                message="Appointment not found",
                status_code=404,
                error_code="APPOINTMENT_NOT_FOUND"
            )
        
        # Only allow deletion of cancelled or completed appointments
        if appointment.status not in ['cancelled', 'completed']:
            return APIResponse.error(
                message="Only cancelled or completed appointments can be deleted",
                status_code=400,
                error_code="APPOINTMENT_NOT_DELETABLE"
            )
        
        # Store appointment info for logging
        appointment_info = {
            'id': appointment.id,
            'patient_name': appointment.patient.user.full_name,
            'patient_email': appointment.patient.user.email,
            'doctor_name': appointment.doctor.user.full_name,
            'doctor_email': appointment.doctor.user.email,
            'appointment_date': appointment.appointment_date.isoformat(),
            'status': appointment.status
        }
        
        # Delete the appointment
        db.session.delete(appointment)
        db.session.commit()
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_delete_appointment',
            {
                'deleted_appointment': appointment_info,
                'admin_email': current_user.email
            }
        )
        
        return APIResponse.success(
            data={'deleted_appointment_id': appointment_id},
            message=f"Appointment deleted successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Admin delete appointment error: {str(e)}")
        return APIResponse.error(
            message="Failed to delete appointment",
            status_code=500
        )

# =============================================================================
# DOCTOR VERIFICATION ENDPOINTS
# =============================================================================
# Get list of doctors pending verification
@admin_bp.route('/doctors/pending-verification', methods=['GET'])
@admin_required
def get_pending_verifications():
    try:
        pending_doctors = Doctor.query.filter_by(is_verified=False).all()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        page, per_page = validate_pagination_params(page, per_page)
        
        # Query unverified doctors with user details
        pending_query = Doctor.query.options(
            joinedload(Doctor.user)
        ).filter(Doctor.is_verified == False).order_by(Doctor.created_at.asc())
        
        pending_pagination = pending_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Format doctor data for verification
        doctors_data = []
        for doctor in pending_pagination.items:
            doctors_info = {
                'id': doctor.id,
                'user_id': doctor.user_id,
                'name': doctor.user.full_name,
                'email': doctor.user.email,
                'phone': doctor.phone,
                'specialty': doctor.specialty,
                'license_number': doctor.license_number,
                'bio': doctor.bio,
                'years_of_experience': doctor.years_of_experience,
                'submitted_at': doctor.created_at.isoformat(),
                'days_waiting': (datetime.utcnow() - doctor.created_at).days,
                'documents_submitted': {
                    'license_document': bool(doctor.license_document_path),
                    'degree_document': bool(doctor.degree_document_path),
                    'id_document': bool(doctor.id_document_path)
                }
            }
            doctors_data.append(doctors_info)
        
        log_user_action(
            current_user.id,
            'admin_view_pending_verifications',
            {'page': page, 'total_pending': pending_pagination.total}
        )
        
        return APIResponse.success(
            data={
                'pending_doctors': doctors_data,
                'pagination': {
                    'page': pending_pagination.page,
                    'pages': pending_pagination.pages,
                    'per_page': pending_pagination.per_page,
                    'total': pending_pagination.total,
                    'has_next': pending_pagination.has_next,
                    'has_prev': pending_pagination.has_prev
                }
            },
            message="Pending verifications retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get pending verifications error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve pending verifications",
            status_code=500
        )
#Verify a doctor
@admin_bp.route('/doctors/<int:doctor_id>/verify', methods=['POST'])
@admin_required
def verify_doctor(doctor_id):    
    
    try:
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400,
                error_code="MISSING_REQUEST_BODY"
            )

        approved = data.get('approved', False)
        notes = data.get('notes', '').strip()
        
        doctor = Doctor.query.options(joinedload(Doctor.user)).get(doctor_id)
        if not doctor:
            return APIResponse.error(
                message="Doctor not found",
                status_code=404,
                error_code="DOCTOR_NOT_FOUND"
            )
      
       # Verification notes field 
        if approved:
            doctor.is_verified = True
            doctor.verification_date = datetime.utcnow()
            doctor.verification_notes = notes
            doctor.verified_by = current_user.id
            
             # Send approval email
            email_subject = "Doctor Verification Approved - Sahatak Platform"
            email_body = f"""
            Dear Dr. {doctor.user.full_name},

            Congratulations! Your doctor profile has been verified and approved on the Sahatak Telemedicine Platform.

            You can now:
            - Set your availability schedule
            - Accept patient appointments
            - Conduct online consultations
            - Access patient appointment history

            Thank you for joining our healthcare community.

            Best regards,
            The Sahatak Team
            """
            send_email(
                to_email=doctor.user.email,
                subject=email_subject,
                body=email_body
            )
            
        else:
            # rejection
            if not notes:
                return APIResponse.error(
                    message="Rejection notes are required",
                    status_code=400,
                    error_code="REJECTION_NOTES_REQUIRED"
                )
            
            doctor.verification_notes = notes
            doctor.rejection_date = datetime.utcnow()
            doctor.rejected_by = current_user.id
            
            # Send rejection email
            email_subject = "Doctor Verification - Additional Information Required"
            email_body = f"""
            Dear Dr. {doctor.user.full_name},

            Thank you for your application to join the Sahatak Telemedicine Platform.

            We need additional information or documentation before we can approve your account:

            {notes}

            Please update your profile with the requested information and we will review your application again.

            If you have any questions, please contact our support team.

            Best regards,
            The Sahatak Team
            """
            
            send_email(
                to_email=doctor.user.email,
                subject=email_subject,
                body=email_body
            )
        
    
        db.session.commit()
        
    # Log admin action
        log_user_action(
            current_user.id,
            'admin_verify_doctor',
            {
                'doctor_id': doctor_id,
                'approved': approved,
                'notes': notes,
                'verification_date': datetime.utcnow().isoformat()
            }
        )
            
        # Queue notification to doctor
        notification_title = f"Application {'Approved' if approved else 'Needs Attention'}"
        notification_message = f"Your doctor verification has been {'approved' if approved else 'reviewed'}. Check your email for details."
            
        queue_notification(
            user_id=doctor.user_id,
            title=notification_title,
            message=notification_message,
            notification_type='success' if approved else 'warning',
            send_email=False  # Already sent detailed email above
            )
            
        return APIResponse.success(
            data={
                'doctor_id': doctor_id,
                'verified': approved,
                'verification_date': doctor.verification_date.isoformat() if approved else None,
                'notes': notes
            },
            message=f"Doctor {'verified' if approved else 'rejected'} successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Admin verify doctor error: {str(e)}")
        return APIResponse.error(
            message="Failed to verify doctor",
            status_code=500
        )
        
# add a verified doctor
@admin_bp.route('/doctors', methods=['POST'])
@admin_required
def add_doctor_manually():
     
    try:
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400,
            )
        
        # Validate required fields
        required_fields = ['email', 'full_name', 'password', 'specialty', 'license_number', 'years_of_experience']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.error(
                    message=f"Field '{field}' is required",
                    status_code=400,
                    error_code="MISSING_REQUIRED_FIELD"
                )
        # Validate email format
        email = data['email'].lower().strip()
        if not validate_email(email):
            return APIResponse.error(
                message="Invalid email format",
                status_code=400,
                error_code="INVALID_EMAIL"
            )
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return APIResponse.error(
                message="Email already exists",
                status_code=400,
                error_code="EMAIL_EXISTS"
            )
        
        # Validate password
        password = data['password']
        if not validate_password(password):
            return APIResponse.error(
                message="Password does not meet requirements",
                status_code=400,
                error_code="WEAK_PASSWORD"
            )
        
        # Validate years of experience
        years_of_experience = data.get('years_of_experience', 10)
        if not isinstance(years_of_experience, int) or years_of_experience < 10:
            return APIResponse.error(
                message="Invalid years of experience",
                status_code=400
            )
            
    # Create User account
        new_user = User(
            email=email,
            full_name=data['full_name'].strip(),
            phone=data.get('phone', '').strip(),
            user_type='doctor',
            is_active=True,
            is_verified=True,
            profile_completed=True,
            created_at=datetime.utcnow()
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()  # Get user ID
            
            # Create Doctor profile
        new_doctor = Doctor(
            user_id=new_user.id,
            specialty=data['specialty'].strip(),
            license_number=data['license_number'].strip(),
            years_of_experience=years_of_experience,
            bio=data.get('bio', '').strip(),
            consultation_fee=data.get('consultation_fee', 0),
            is_verified=True,
            verification_date=datetime.utcnow(),
            verified_by=current_user.id,
            verification_notes=f"Manually added by admin {current_user.email}",
            created_at=datetime.utcnow()
        )
        db.session.add(new_doctor)
            
            # Send welcome email with login credentials
        welcome_subject = "Welcome to Sahatak Telemedicine Platform"
        welcome_body = f"""
            Dear Dr. {new_user.full_name},

            Welcome to the Sahatak Telemedicine Platform! Your doctor account has been created and verified.

            Your login credentials:
            Email: {email}
            Password: {password}

            Please login to your account and:
            1. Change your password
            2. Complete your profile information  
            3. Set your availability schedule
            4. Upload your profile photo and documents

            You can start accepting patient appointments immediately.

            Login at: {current_app.config.get('FRONTEND_URL', '')}/login

            Best regards,
            The Sahatak Team
            """ 
         
        send_email(
                to_email=email,
                subject=welcome_subject,
                body=welcome_body
        )
            
            # Log admin action
        log_user_action(
            current_user.id,
                'admin_add_doctor_manually',
                {
                    'new_doctor_id': new_doctor.id,
                    'new_user_id': new_user.id,
                    'email': email,
                    'specialty': data['specialty'],
                    'license_number': data['license_number']
                }
        )
        
        return APIResponse.success(
            data={'message': 'Doctor added successfully'},
            message="Doctor created and verified"
        )
        
    except Exception as e:
            db.session.rollback()  # Rollback on any error to maintain database integrity
            app_logger.error(f"Admin add doctor error: {str(e)}")
            return APIResponse.error(
                message="Failed to add doctor",
                status_code=500
            )

# =============================================================================
# SYSTEM SETTINGS ENDPOINTS
# =============================================================================
# current system settings
@admin_bp.route('/settings', methods=['GET'])
@admin_required
def get_system_settings():
    try:
    # Get settings from database or return defaults
        settings_data = {}
        
        settings_query = SystemSettings.query.all()
        for setting in settings_query:
            settings_data[setting.key] = {
                'value': setting.value,
                'data_type': setting.data_type,
                'description': setting.description,
                'updated_at': setting.updated_at.isoformat(),
                'updated_by': setting.updated_by
            }
            
    # Add default settings if not in database
        default_settings = {
            'maintenance_mode': {'value': False, 'type': 'boolean', 'desc': 'Enable maintenance mode'},
            'registration_enabled': {'value': True, 'type': 'boolean', 'desc': 'Allow new user registration'},
            'default_language': {'value': 'ar', 'type': 'string', 'desc': 'Default platform language'},
            'max_appointment_days_ahead': {'value': 30, 'type': 'integer', 'desc': 'Maximum days ahead for booking'},
            'session_timeout_minutes': {'value': 60, 'type': 'integer', 'desc': 'User session timeout'},
            'password_min_length': {'value': 8, 'type': 'integer', 'desc': 'Minimum password length'},
            'max_login_attempts': {'value': 5, 'type': 'integer', 'desc': 'Max failed login attempts'},
            'consultation_duration_minutes': {'value': 30, 'type': 'integer', 'desc': 'Default consultation duration'},
            'platform_commission_percent': {'value': 10.0, 'type': 'float', 'desc': 'Platform commission percentage'},
            'email_notifications_enabled': {'value': True, 'type': 'boolean', 'desc': 'Enable email notifications'}
        }
        
        for key, config in default_settings.items():
            if key not in settings_data:
                settings_data[key] = {
                    'value': config['value'],
                    'data_type': config['type'],
                    'description': config['desc'],
                    'updated_at': None,
                    'updated_by': None
                }
        
        log_user_action(
            current_user.id,
            'admin_view_settings',
            {'settings_count': len(settings_data)}
        )
        
        return APIResponse.success(
            data={'settings': settings_data},
            message="System settings retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get settings error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve settings",
            status_code=500
        )

@admin_bp.route('/settings', methods=['PUT'])
@admin_required
def update_system_settings():
# Update system settings
    try:
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400
            )
        
        updated_settings = []
        validation_errors = []
        
        # Define setting validation rules
        setting_rules = {
            'maintenance_mode': {'type': bool, 'required': False},
            'registration_enabled': {'type': bool, 'required': False},
            'default_language': {'type': str, 'required': False, 'choices': ['ar', 'en']},
            'max_appointment_days_ahead': {'type': int, 'required': False, 'min': 1, 'max': 365},
            'session_timeout_minutes': {'type': int, 'required': False, 'min': 15, 'max': 480},
            'password_min_length': {'type': int, 'required': False, 'min': 6, 'max': 50},
            'max_login_attempts': {'type': int, 'required': False, 'min': 3, 'max': 20},
            'consultation_duration_minutes': {'type': int, 'required': False, 'min': 15, 'max': 180},
            'platform_commission_percent': {'type': float, 'required': False, 'min': 0.0, 'max': 50.0},
            'email_notifications_enabled': {'type': bool, 'required': False}
        }
        
        # Validate each setting
        for key, value in data.items():
            if key not in setting_rules:
                validation_errors.append(f"Unknown setting: {key}")
                continue
            
            rule = setting_rules[key]
            
            # Type validation
            if not isinstance(value, rule['type']):
                try:
                    if rule['type'] == bool:
                        value = str(value).lower() in ['true', '1', 'yes', 'on']
                    elif rule['type'] == int:
                        value = int(value)
                    elif rule['type'] == float:
                        value = float(value)
                    else:
                        value = str(value)
                except (ValueError, TypeError):
                    validation_errors.append(f"Invalid type for {key}")
                    continue
            
            # Range validation
            if rule['type'] in [int, float]:
                if 'min' in rule and value < rule['min']:
                    validation_errors.append(f"{key} must be at least {rule['min']}")
                    continue
                if 'max' in rule and value > rule['max']:
                    validation_errors.append(f"{key} must be at most {rule['max']}")
                    continue
            
            # Choice validation
            if 'choices' in rule and value not in rule['choices']:
                validation_errors.append(f"{key} must be one of: {rule['choices']}")
                continue
            
            updated_settings.append((key, value, rule['type'].__name__))
        
        if validation_errors:
            return APIResponse.error(
                message="Settings validation failed",
                status_code=400,
                error_code="VALIDATION_ERROR",
                details=validation_errors
            )
        
    # Update settings in database
        for key, value, data_type in updated_settings:
            setting = SystemSettings.query.filter_by(key=key).first()
                
            if setting:
                setting.value = str(value)
                setting.data_type = data_type
                setting.updated_at = datetime.utcnow()
                setting.updated_by = current_user.id
            else:
                new_setting = SystemSettings(
                    key=key,
                    value=str(value),
                    data_type=data_type,
                    description=f"Updated by admin {current_user.email}",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    updated_by=current_user.id
                )
                db.session.add(new_setting)
            
        db.session.commit()
            
            # Log admin action
        log_user_action(
                current_user.id,
                'admin_update_settings',
                {
                    'updated_settings': [key for key, _, _ in updated_settings],
                    'settings_count': len(updated_settings)
                }
            )
        
        log_user_action(
            current_user.id,
            'admin_update_settings',
            {'updated_settings': list(data.keys())}
        )
        
        return APIResponse.success(
            message="System settings updated successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Admin update settings error: {str(e)}")
        return APIResponse.error(
            message="Failed to update settings",
            status_code=500
        )

# =============================================================================
# PLATFORM HEALTH & ANALYTICS ENDPOINTS
# =============================================================================

@admin_bp.route('/health/detailed', methods=['GET'])
@admin_required
def get_detailed_health():
    try:
        
        start_time = datetime.utcnow()
        
        # Database health check
        db_start = datetime.utcnow()
        try:
            db.session.execute(text('SELECT 1'))
            db_time = (datetime.utcnow() - db_start).total_seconds() * 1000
            db_status = 'healthy'
            db_error = None
        except Exception as e:
            db_time = (datetime.utcnow() - db_start).total_seconds() * 1000
            db_status = 'unhealthy'
            db_error = str(e)
        
        # Get database connection info
        try:
            active_connections = db.session.execute(
                text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
            ).scalar()
        except:
            active_connections = 'unknown'
        
        # Calculate API metrics for last 24 hours
        try:
            twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
            
            # Get error rate from audit logs
            total_requests = AuditLog.query.filter(
                AuditLog.created_at >= twenty_four_hours_ago
            ).count()
            
            error_requests = AuditLog.query.filter(
                and_(
                    AuditLog.created_at >= twenty_four_hours_ago,
                    AuditLog.action.like('%error%')
                )
            ).count()
            
            error_rate = (error_requests / total_requests) if total_requests > 0 else 0
            
        except:
            total_requests = 'unknown'
            error_rate = 'unknown'
        
        # System resource usage (basic estimates)
        import psutil
        try:
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            system_info = {
                'cpu_usage_percent': cpu_usage,
                'memory_usage_percent': memory.percent,
                'disk_usage_percent': disk.percent,
                'uptime_hours': (datetime.utcnow() - start_time).total_seconds() / 3600
            }
        except ImportError:
            # Fallback if psutil not available
            system_info = {
                'cpu_usage_percent': 'unavailable',
                'memory_usage_percent': 'unavailable', 
                'disk_usage_percent': 'unavailable',
                'uptime_hours': 'unavailable'
            }
        
        health_data = {
            'database': {
                'status': db_status,
                'connection_time_ms': round(db_time, 20),
                'active_connections': active_connections,
                'error': db_error
            },
            'api': {
                'avg_response_time_ms': round((datetime.utcnow() - start_time).total_seconds() * 1000, 2),
                'error_rate_24h': round(error_rate, 20) if isinstance(error_rate, float) else error_rate,
                'total_requests_24h': total_requests
            },
            'system': system_info,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        log_user_action(
            current_user.id,
            'admin_view_detailed_health',
            {'db_status': db_status, 'system_check': True}
        )
        
        return APIResponse.success(
            data={'health': health_data},
            message="Detailed health information retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get detailed health error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve health information",
            status_code=500
        )

@admin_bp.route('/analytics/dashboard', methods=['GET'])
@admin_required
def get_dashboard_analytics():
    try:
        period = request.args.get('period', 'week')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Define time ranges
        now = datetime.utcnow()
        if period == 'day':
            period_start = now - timedelta(days=1)
        elif period == 'week':
            period_start = now - timedelta(weeks=1)
        elif period == 'month':
            period_start = now - timedelta(days=30)
        elif period == 'year':
            period_start = now - timedelta(days=365)
        elif start_date and end_date:
            period_start, period_end = validate_date_range(start_date, end_date)
            if not period_end:
                period_end = now
        else:
            period_start = now - timedelta(weeks=1)
            period_end = now
        
        if 'period_end' not in locals():
            period_end = now
        
        # User statistics
        new_registrations = User.query.filter(
            User.created_at >= period_start
        ).count()
        
        active_users = User.query.filter(
            and_(
                User.is_active == True,
                User.last_login >= period_start
            )
        ).count()
        
        # Calculate growth rate
        previous_period_start = period_start - (period_end - period_start)
        previous_users = User.query.filter(
            User.created_at <= period_start
        ).count()
        
        user_growth_rate = ((previous_users) / previous_users * 100) if previous_users > 0 else 0
        
        # Appointment statistics
        total_appointments = Appointment.query.count()
        period_appointments = Appointment.query.filter(
            Appointment.created_at >= period_start
        ).count()
        
        completed_appointments = Appointment.query.filter(
            and_(
                Appointment.created_at >= period_start,
                Appointment.status == 'completed'
            )
        ).count()
        
        cancelled_appointments = Appointment.query.filter(
            and_(
                Appointment.created_at >= period_start,
                Appointment.status == 'cancelled'
            )
        ).count()
        
        # Doctor statistics
        total_doctors = Doctor.query.count()
        verified_doctors = Doctor.query.filter_by(is_verified=True).count()
        
        active_doctors = Doctor.query.join(User, Doctor.user_id == User.id).filter(
            and_(
                Doctor.is_verified == True,
                User.is_active == True,
                User.last_login >= period_start
            )
        ).count()
        
        # Average appointments per doctor
        if verified_doctors > 0:
            avg_appointments_per_doctor = db.session.query(
                func.avg(func.coalesce(Doctor.total_consultations, 0))
            ).filter(Doctor.is_verified == True).scalar() or 0
        else:
            avg_appointments_per_doctor = 0
        
        # Platform usage patterns
        try:
            # Peak usage hour (simplified - based on appointment creation times)
            hourly_usage = db.session.query(
                func.extract('hour', Appointment.created_at).label('hour'),
                func.count(Appointment.id).label('count')
            ).filter(
                Appointment.created_at >= period_start
            ).group_by(func.extract('hour', Appointment.created_at)).all()
            
            peak_hour = max(hourly_usage, key=lambda x: x.count).hour if hourly_usage else 14
            
            # Most used features (based on audit logs)
            feature_usage = db.session.query(
                AuditLog.action,
                func.count(AuditLog.id).label('usage_count')
            ).filter(
                AuditLog.created_at >= period_start
            ).group_by(AuditLog.action).order_by(
                func.count(AuditLog.id).desc()
            ).limit(5).all()
            
            most_used_features = [action for action, count in feature_usage]
            
        except:
            peak_hour = 14
            most_used_features = ['appointments', 'consultations', 'profile']
        
        # Geographic distribution (if available)
        try:
            city_distribution = db.session.query(
                Patient.city,
                func.count(Patient.id).label('count')
            ).filter(
                Patient.city.isnot(None)
            ).group_by(Patient.city).order_by(
                func.count(Patient.id).desc()
            ).limit(10).all()
            
            top_cities = [{'city': city, 'users': count} for city, count in city_distribution]
        except:
            top_cities = []
        
        analytics_data = {
            'user_stats': {
                'new_registrations_period': new_registrations,
                'active_users_period': active_users,
                'user_growth_rate': round(user_growth_rate, 2)
            },
            'appointment_stats': {
                'total_appointments': total_appointments,
                'appointments_period': period_appointments,
                'completed_appointments': completed_appointments,
                'cancelled_appointments': cancelled_appointments,
                'completion_rate': round((completed_appointments / period_appointments * 100) if period_appointments > 0 else 0, 2)
            },
            'doctor_stats': {
                'total_doctors': total_doctors,
                'verified_doctors': verified_doctors,
                'active_doctors_period': active_doctors,
                'avg_appointments_per_doctor': round(avg_appointments_per_doctor, 1),
                'verification_rate': round((verified_doctors / total_doctors * 100) if total_doctors > 0 else 0, 2)
            },
            'platform_usage': {
                'peak_usage_hour': int(peak_hour),
                'avg_session_duration_minutes': 25,  # This would need session tracking
                'bounce_rate': 0.15,  # This would need proper analytics
                'most_used_features': most_used_features
            },
            'geographic_data': {
                'top_cities': top_cities
            },
            'period_info': {
                'period': period,
                'start_date': period_start.isoformat(),
                'end_date': period_end.isoformat(),
                'days_included': (period_end - period_start).days
            }
        }
        
        log_user_action(
            current_user.id,
            'admin_view_analytics',
            {'period': period, 'data_points_calculated': len(analytics_data)}
        )
        
        return APIResponse.success(
            data={'analytics': analytics_data},
            message="Dashboard analytics retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get analytics error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve analytics",
            status_code=500
        )

# =============================================================================
# SYSTEM NOTIFICATIONS ENDPOINTS
# =============================================================================

@admin_bp.route('/notifications/broadcast', methods=['POST'])
@admin_required
def send_broadcast_notification():
# Send notification to all users or specific groups
   
    try:
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400
            )
        
    # Validate required fields
        title = data.get('title', '').strip()
        message = data.get('message', '').strip()
        
        if not title or not message:
            return APIResponse.error(
                message="Title and message are required",
                status_code=400,
                error_code="MISSING_REQUIRED_FIELDS"
            )
        
        if len(title) > 100:
            return APIResponse.error(
                message="Title must be less than 100 characters",
                status_code=400,
                error_code="TITLE_TOO_LONG"
            )
        
        if len(message) > 1000:
            return APIResponse.error(
                message="Message must be less than 1000 characters",
                status_code=400,
                error_code="MESSAGE_TOO_LONG"
            )
            
    # Validate target audience
        target = data.get('target', 'all')
        valid_targets = ['all', 'patients', 'doctors', 'admins']
        if target not in valid_targets:
            return APIResponse.error(
                message=f"Target must be one of: {valid_targets}",
                status_code=400,
                error_code="INVALID_TARGET"
            )
            
    # Validate notification type
        notification_type = data.get('type', 'info')
        valid_types = ['info', 'warning', 'urgent', 'success']
        if notification_type not in valid_types:
            return APIResponse.error(
                message=f"Type must be one of: {valid_types}",
                status_code=400,
                error_code="INVALID_TYPE"
            )
            
    # Validate delivery options
        send_email = data.get('send_email', True)  # Default to email
        
        if not send_email:
            return APIResponse.error(
                message="Email delivery must be enabled",
                status_code=400,
                error_code="NO_DELIVERY_METHOD"
            )
            
    # Validate schedule time if provided
        schedule_time = data.get('schedule_time')
        if schedule_time:
            try:
                schedule_datetime = datetime.fromisoformat(schedule_time.replace('Z', '+00:00'))
                if schedule_datetime <= datetime.utcnow():
                    return APIResponse.error(
                        message="Schedule time must be in the future",
                        status_code=400,
                        error_code="INVALID_SCHEDULE_TIME"
                    )
            except ValueError:
                return APIResponse.error(
                    message="Invalid schedule time format",
                    status_code=400,
                    error_code="INVALID_DATETIME_FORMAT"
                )
        else:
            schedule_datetime = None
            
    # Build target user query
        base_query = User.query.filter(User.is_active == True)
        
        if target == 'patients':
            target_users = base_query.filter(User.user_type == 'patient').all()
        elif target == 'doctors':
            target_users = base_query.filter(User.user_type == 'doctor').all()
        elif target == 'admins':
            target_users = base_query.filter(User.user_type == 'admin').all()
        else:  # target == 'all'
            target_users = base_query.all()
        
        if not target_users:
            return APIResponse.error(
                message=f"No active users found for target: {target}",
                status_code=400,
                error_code="NO_TARGET_USERS"
            )
            
     # Queue notifications for each target user
        notifications_queued = 0
        failed_notifications = 0
        
        for user in target_users:
            try:
                queue_notification(
                    user_id=user.id,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    send_email=send_email,
                    scheduled_time=schedule_datetime,
                    sender_id=current_user.id,
                    metadata={
                        'broadcast_id': f"broadcast_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                        'admin_sender': current_user.email,
                        'target_group': target
                    }
                )
                notifications_queued += 1
                
            except Exception as e:
                app_logger.error(f"Failed to queue notification for user {user.id}: {str(e)}")
                failed_notifications += 1
                
                 # Log admin action
        log_user_action(
            current_user.id,
            'admin_broadcast_notification',
            {
                'title': title,
                'message_length': len(message),
                'target': target,
                'type': notification_type,
                'send_email': send_email,
                'scheduled': bool(schedule_datetime),
                'schedule_time': schedule_datetime.isoformat() if schedule_datetime else None,
                'notifications_queued': notifications_queued,
                'failed_notifications': failed_notifications,
                'target_user_count': len(target_users)
            }
        )
        
    # Prepare response message
        if schedule_datetime:
            status_message = f"Broadcast notification scheduled for {schedule_datetime.isoformat()}"
        else:
            status_message = "Broadcast notification sent successfully"
        
        return APIResponse.success(
            data={
                'broadcast_id': f"broadcast_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
                'notifications_queued': notifications_queued,
                'failed_notifications': failed_notifications,
                'target_users': len(target_users),
                'scheduled': bool(schedule_datetime),
                'schedule_time': schedule_datetime.isoformat() if schedule_datetime else None
            },
            message=status_message
        )
    except Exception as e:
        app_logger.error(f"Admin broadcast notification error: {str(e)}")
        return APIResponse.error(
            message="Failed to send broadcast notification",
            status_code=500
        )

# =============================================================================
# AUDIT LOG ENDPOINTS
# =============================================================================

@admin_bp.route('/audit-logs', methods=['GET'])
@admin_required
def get_audit_logs():
    """Get paginated list of audit logs with filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_id = request.args.get('user_id', type=int)
        action = request.args.get('action')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        page, per_page = validate_pagination_params(page, per_page)
        start_date, end_date = validate_date_range(start_date, end_date)
        
        # Build base query
        query = AuditLog.query.options(joinedload(AuditLog.user))
        
        # Apply filters
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action.ilike(f'%{action}%'))
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)
        
        # Apply pagination
        logs_pagination = query.order_by(AuditLog.created_at.desc()).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format audit log data
        logs_data = []
        for log_entry in logs_pagination.items:
            log_details = {
                'id': log_entry.id,
                'action': log_entry.action,
                'user_id': log_entry.user_id,
                'user_info': {
                    'email': log_entry.user.email if log_entry.user else 'System',
                    'full_name': log_entry.user.full_name if log_entry.user else 'System',
                    'user_type': log_entry.user.user_type if log_entry.user else 'system'
                },
                'ip_address': log_entry.ip_address,
                'user_agent': log_entry.user_agent,
                'details': log_entry.details if log_entry.details else {},
                'created_at': log_entry.created_at.isoformat(),
                'created_at_readable': log_entry.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')
            }
            
            # Determine severity level
            action_lower = log_entry.action.lower()
            if any(keyword in action_lower for keyword in ['error', 'failed', 'denied', 'blocked']):
                log_details['severity'] = 'error'
            elif any(keyword in action_lower for keyword in ['warning', 'attempt', 'locked']):
                log_details['severity'] = 'warning'
            else:
                log_details['severity'] = 'info'
            
            logs_data.append(log_details)
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_view_audit_logs',
            {
                'page': page,
                'per_page': per_page,
                'total_results': logs_pagination.total,
                'filters': {
                    'user_id': user_id,
                    'action': action,
                    'date_range': bool(start_date or end_date)
                }
            }
        )
        
        return APIResponse.success(
            data={
                'logs': logs_data,
                'pagination': {
                    'page': logs_pagination.page,
                    'pages': logs_pagination.pages,
                    'per_page': logs_pagination.per_page,
                    'total': logs_pagination.total,
                    'has_next': logs_pagination.has_next,
                    'has_prev': logs_pagination.has_prev
                }
            },
            message="Audit logs retrieved successfully"
        )

    except RequestValidationError as e:
        return APIResponse.error(message=str(e), status_code=400)
    except Exception as e:
        app_logger.error(f"Admin get audit logs error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve audit logs",
            status_code=500
        )

@admin_bp.route('/audit-logs/<int:log_id>', methods=['GET'])
@admin_required
def get_audit_log_details(log_id):
    """Get detailed information for a specific audit log entry"""
    try:
        log_entry = AuditLog.query.options(
            joinedload(AuditLog.user)
        ).get(log_id)
        
        if not log_entry:
            return APIResponse.error(
                message="Audit log entry not found",
                status_code=404,
                error_code="AUDIT_LOG_NOT_FOUND"
            )
            
        # Format detailed log information
        log_details = {
            'id': log_entry.id,
            'action': log_entry.action,
            'user_id': log_entry.user_id,
            'user_info': {
                'email': log_entry.user.email if log_entry.user else 'System',
                'full_name': log_entry.user.full_name if log_entry.user else 'System',
                'user_type': log_entry.user.user_type if log_entry.user else 'system',
                'is_active': log_entry.user.is_active if log_entry.user else None
            },
            'request_info': {
                'ip_address': log_entry.ip_address,
                'user_agent': log_entry.user_agent,
                'method': getattr(log_entry, 'method', None),
                'endpoint': getattr(log_entry, 'endpoint', None)
            },
            'details': log_entry.details if log_entry.details else {},
            'timestamps': {
                'created_at': log_entry.created_at.isoformat(),
                'created_at_readable': log_entry.created_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
                'days_ago': (datetime.utcnow() - log_entry.created_at).days
            }
        }
        
        # Determine severity and risk level
        action_lower = log_entry.action.lower()
        if any(keyword in action_lower for keyword in ['error', 'failed', 'denied', 'blocked']):
            log_details['severity'] = 'error'
        elif any(keyword in action_lower for keyword in ['warning', 'attempt', 'locked']):
            log_details['severity'] = 'warning'
        else:
            log_details['severity'] = 'info'
        
        if any(keyword in action_lower for keyword in ['login_failed', 'account_locked', 'admin_access_denied']):
            log_details['risk_level'] = 'high'
        elif any(keyword in action_lower for keyword in ['password_changed', 'profile_updated', 'admin_']):
            log_details['risk_level'] = 'medium'
        else:
            log_details['risk_level'] = 'low'
        
        # Get related logs (same user, similar timeframe)
        if log_entry.user_id:
            related_logs = AuditLog.query.filter(
                and_(
                    AuditLog.user_id == log_entry.user_id,
                    AuditLog.id != log_entry.id,
                    AuditLog.created_at >= log_entry.created_at - timedelta(hours=1),
                    AuditLog.created_at <= log_entry.created_at + timedelta(hours=1)
                )
            ).order_by(AuditLog.created_at.desc()).limit(5).all()
            
            log_details['related_logs'] = [{
                'id': related.id,
                'action': related.action,
                'created_at': related.created_at.isoformat(),
                'ip_address': related.ip_address
            } for related in related_logs]
        else:
            log_details['related_logs'] = []
            
        # Log this admin action
        log_user_action(
            current_user.id,
            'admin_view_audit_log_details',
            {
                'audit_log_id': log_id,
                'target_action': log_entry.action,
                'target_user_id': log_entry.user_id
            }
        )
        
        return APIResponse.success(
            data={'audit_log': log_details},
            message="Audit log details retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get audit log details error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve audit log details",
            status_code=500
        )

# =============================================================================
# ADMIN USER MANAGEMENT ENDPOINTS
# =============================================================================

@admin_bp.route('/create-admin', methods=['POST'])
@admin_required
def create_admin_user():
    """Create a new admin user - only existing admins can create new admins"""
    try:
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400,
                error_code="MISSING_REQUEST_BODY"
            )
        
        # Validate required fields
        required_fields = ['email', 'full_name', 'password']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.error(
                    message=f"Field '{field}' is required",
                    status_code=400,
                    error_code="MISSING_REQUIRED_FIELD"
                )
        
        # Validate email format
        email = data['email'].lower().strip()
        email_validation = validate_email(email)
        if not email_validation:
            return APIResponse.error(
                message="Invalid email format",
                status_code=400,
                error_code="INVALID_EMAIL"
            )
        
        # Check if email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return APIResponse.error(
                message="Email already exists",
                status_code=400,
                error_code="EMAIL_EXISTS"
            )
        
        # Validate password
        password_validation = validate_password(data['password'])
        if not password_validation:
            return APIResponse.error(
                message="Password does not meet requirements",
                status_code=400,
                error_code="WEAK_PASSWORD"
            )
        
        # Create admin user
        new_admin = User(
            email=email,
            full_name=data['full_name'].strip(),
            phone=data.get('phone', '').strip(),
            user_type='admin',
            is_active=True,
            is_verified=True,
            profile_completed=True,
            created_at=datetime.utcnow()
        )
        new_admin.set_password(data['password'])
        db.session.add(new_admin)
        db.session.commit()
        
        # Log admin creation action
        log_user_action(
            current_user.id,
            'admin_create_admin_user',
            {
                'new_admin_id': new_admin.id,
                'new_admin_email': email,
                'created_by': current_user.email
            }
        )
        
        # Send welcome email
        try:
            from services.email_service import send_email
            welcome_subject = "Admin Account Created - Sahatak Platform"
            welcome_body = f"""
            Dear {new_admin.full_name},

            Your administrator account has been created for the Sahatak Telemedicine Platform.

            Login Details:
            Email: {email}
            Password: {data['password']}

            Please login and change your password immediately for security.

            Admin Dashboard: {current_app.config.get('FRONTEND_URL', '')}/pages/admin/admin.html

            Best regards,
            The Sahatak Team
            """
            
            send_email(
                to_email=email,
                subject=welcome_subject,
                body=welcome_body
            )
        except Exception as e:
            app_logger.warning(f"Failed to send welcome email to new admin: {str(e)}")
        
        return APIResponse.success(
            data={
                'admin_id': new_admin.id,
                'email': email,
                'full_name': new_admin.full_name,
                'created_at': new_admin.created_at.isoformat()
            },
            message="Admin user created successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Create admin user error: {str(e)}")
        return APIResponse.error(
            message="Failed to create admin user",
            status_code=500
        )

@admin_bp.route('/init-first-admin', methods=['POST'])
def create_first_admin():
    """Create the first admin user - only works if no admins exist"""
    try:
        # Check if any admin users already exist
        existing_admin = User.query.filter_by(user_type='admin').first()
        if existing_admin:
            return APIResponse.error(
                message="Admin users already exist. Use /create-admin endpoint instead.",
                status_code=403,
                error_code="ADMIN_EXISTS"
            )
        
        data = request.get_json()
        if not data:
            return APIResponse.error(
                message="Request body required",
                status_code=400,
                error_code="MISSING_REQUEST_BODY"
            )
        
        # Validate required fields
        required_fields = ['email', 'full_name', 'password', 'secret_key']
        for field in required_fields:
            if not data.get(field):
                return APIResponse.error(
                    message=f"Field '{field}' is required",
                    status_code=400,
                    error_code="MISSING_REQUIRED_FIELD"
                )
        
        # Validate secret key (you should set this in environment variables)
        expected_secret = os.getenv('ADMIN_INIT_SECRET', 'CHANGE_THIS_SECRET_KEY')
        if data.get('secret_key') != expected_secret:
            return APIResponse.error(
                message="Invalid initialization secret key",
                status_code=403,
                error_code="INVALID_SECRET_KEY"
            )
        
        # Validate email format
        email = data['email'].lower().strip()
        email_validation = validate_email(email)
        if not email_validation:
            return APIResponse.error(
                message="Invalid email format",
                status_code=400,
                error_code="INVALID_EMAIL"
            )
        
        # Validate password
        password_validation = validate_password(data['password'])
        if not password_validation:
            return APIResponse.error(
                message="Password does not meet requirements",
                status_code=400,
                error_code="WEAK_PASSWORD"
            )
        
        # Create first admin user
        first_admin = User(
            email=email,
            full_name=data['full_name'].strip(),
            user_type='admin',
            is_active=True,
            is_verified=True,
            created_at=datetime.utcnow()
        )
        first_admin.set_password(data['password'])
        db.session.add(first_admin)
        db.session.commit()
        
        # Log the initial admin creation
        log_user_action(
            first_admin.id,
            'admin_initial_creation',
            {
                'admin_id': first_admin.id,
                'admin_email': email,
                'initialization': True
            }
        )
        
        app_logger.info(f"First admin user created: {email}")
        
        return APIResponse.success(
            data={
                'admin_id': first_admin.id,
                'email': email,
                'full_name': first_admin.full_name,
                'message': 'First admin user created successfully'
            },
            message="System initialized with first admin user"
        )
        
    except Exception as e:
        db.session.rollback()
        app_logger.error(f"Create first admin error: {str(e)}")
        return APIResponse.error(
            message="Failed to create first admin user",
            status_code=500
        )

# =============================================================================
# IMPLEMENTATION NOTES FOR AHMED
# =============================================================================

"""
AHMED - IMPLEMENTATION CHECKLIST:

1. DATABASE MODELS TO CREATE:
   - Admin model (extend User or add admin role)
   - SystemSettings model
   - AuditLog model
   - NotificationQueue model

2. SECURITY REQUIREMENTS:
   - Implement proper admin authentication
   - Add permission checks for all endpoints
   - Never expose patient medical records
   - Log all admin actions for audit trails
   - Implement rate limiting for admin endpoints

3. EMAIL INTEGRATION:
   - Set up email templates for doctor verification
   - Create notification queue system

4. ANALYTICS IMPLEMENTATION:
   - Create database views for efficient analytics
   - Implement caching for frequently accessed metrics
   - Consider using background jobs for heavy calculations

5. ERROR HANDLING:
   - Add comprehensive input validation
   - Handle database constraints properly
   - Provide meaningful error messages
   - Log all errors with context

6. PERFORMANCE CONSIDERATIONS:
   - Add database indexes for admin queries
   - Implement pagination for all list endpoints
   - Use database connection pooling
   - Cache frequently accessed settings

7. TESTING:
   - Write unit tests for all admin functions
   - Test admin authentication thoroughly
   - Verify data privacy requirements
   - Test error scenarios

8. DEPLOYMENT:
   - Add admin endpoints to main app.py
   - Update CORS settings if needed
   - Configure admin-specific environment variables
   - Document admin API endpoints

Remember: The admin system should be powerful but secure.
Never compromise on data privacy or security!
"""