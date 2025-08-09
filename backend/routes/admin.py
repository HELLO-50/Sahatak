"""
Admin Routes for Sahatak Telemedicine Platform
============================================

Ahmed, these are the admin backend endpoints you need to implement.
This file contains placeholder routes and detailed instructions for 
admin functionality.

IMPORTANT SECURITY NOTES:
- Admin routes should require admin authentication
- Never expose patient medical records through admin endpoints
- Implement proper permission checks for all admin actions
- Log all admin actions for audit trails
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from functools import wraps
from datetime import datetime, timedelta
from sqlalchemy import func, text, and_, or_
from sqlalchemy.orm import joinedload
import logging
import re

from utils.responses import APIResponse
from utils.error_handlers import RequestValidationError
from utils.logging_config import app_logger, log_user_action
from models import db, User, Patient, Doctor, Appointment

# Create admin blueprint
admin_bp = Blueprint('admin', __name__)

# Admin Authentication Decorator
def admin_required(f):
    """
    Decorator to check if user is admin with proper permissions
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
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
# USER MANAGEMENT ENDPOINTS
# =============================================================================

@admin_bp.route('/users', methods=['GET'])
@login_required
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
        
        # Build base query
        query = User.query.options(
            joinedload(User.patient),
            joinedload(User.doctor)
        )
        
        # Apply filters
        if user_type and user_type in ['patient', 'doctor', 'admin']:
            query = query.filter(User.user_type == user_type)
        
        if status is not None:
            is_active = status.lower() == 'true'
            query = query.filter(User.is_active == is_active)
        
        if search:
            search_filter = or_(
                User.first_name.ilike(f'%{search}%'),
                User.last_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
                User.phone.ilike(f'%{search}%')
            )
            query = query.filter(search_filter)
        
        # Apply pagination
        users_pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Format user data (exclude sensitive information)
        users_data = []
        for user in users_pagination.items:
            user_info = {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone': user.phone,
                'user_type': user.user_type,
                'is_active': user.is_active,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'profile_completed': user.profile_completed
            }
            
            # Add type-specific information
            if user.user_type == 'doctor' and user.doctor:
                user_info['doctor_info'] = {
                    'specialty': user.doctor.specialty,
                    'license_number': user.doctor.license_number,
                    'is_verified': user.doctor.is_verified,
                    'years_of_experience': user.doctor.years_of_experience
                }
            elif user.user_type == 'patient' and user.patient:
                user_info['patient_info'] = {
                    'date_of_birth': user.patient.date_of_birth.isoformat() if user.patient.date_of_birth else None,
                    'gender': user.patient.gender,
                    'emergency_contact': user.patient.emergency_contact
                }
            
            users_data.append(user_info)
        
        # Log admin action
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
@login_required
@admin_required
def get_user_details(user_id):
    """Get user details for admin view"""
    try:
        user = User.query.options(
            joinedload(User.patient),
            joinedload(User.doctor)
        ).get(user_id)
        
        if not user:
            return APIResponse.error(
                message="User not found",
                status_code=404,
                error_code="USER_NOT_FOUND"
            )
        
        # Format comprehensive user data (exclude medical records) 
        user_data = {
            'id': user.id,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'phone': user.phone,
            'user_type': user.user_type,
            'is_active': user.is_active,
            'is_verified': user.is_verified,
            'created_at': user.created_at.isoformat(),
            'updated_at': user.updated_at.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'locked_until': user.locked_until.isoformat() if user.locked_until else None
        }
          # Add type-specific detailed information
        if user.user_type == 'doctor' and user.doctor:
            user_data['doctor_details'] = {
                'specialty': user.doctor.specialty,
                'license_number': user.doctor.license_number,
                'years_of_experience': user.doctor.years_of_experience,
                'bio': user.doctor.bio,
                'consultation_fee': float(user.doctor.consultation_fee) if user.doctor.consultation_fee else None,
                'is_verified': user.doctor.is_verified,
                'verification_date': user.doctor.verification_date.isoformat() if user.doctor.verification_date else None,
                'verification_notes': user.doctor.verification_notes,
                'rating': float(user.doctor.rating) if user.doctor.rating else None,
                'total_consultations': user.doctor.total_consultations,
                'available_days': user.doctor.available_days,
                'available_time_start': user.doctor.available_time_start.isoformat() if user.doctor.available_time_start else None,
                'available_time_end': user.doctor.available_time_end.isoformat() if user.doctor.available_time_end else None
            }
        elif user.user_type == 'patient' and user.patient:
            user_data['patient_details'] = {
                'date_of_birth': user.patient.date_of_birth.isoformat() if user.patient.date_of_birth else None,
                'gender': user.patient.gender,
                'blood_type': user.patient.blood_type,
                'height_cm': user.patient.height_cm,
                'weight_kg': user.patient.weight_kg,
                'emergency_contact': user.patient.emergency_contact,
                'emergency_phone': user.patient.emergency_phone,
                'address': user.patient.address,
                'city': user.patient.city,
                'total_appointments': user.patient.total_appointments
            }
        
        # Get recent activity (last 10 appointments)
        recent_appointments = Appointment.query.filter_by(
            patient_id=user_id if user.user_type == 'patient' else None,
            doctor_id=user_id if user.user_type == 'doctor' else None
        ).order_by(Appointment.created_at.desc()).limit(10).all()
        
        user_data['recent_activity'] = [{
            'id': apt.id,
            'date': apt.appointment_date.isoformat(),
            'status': apt.status,
            'type': 'appointment',
            'with_user': apt.doctor.user.first_name + ' ' + apt.doctor.user.last_name if user.user_type == 'patient' else apt.patient.user.first_name + ' ' + apt.patient.user.last_name
        } for apt in recent_appointments]
        
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

@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@login_required
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
            send_email=True,
            send_sms=False
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

# =============================================================================
# DOCTOR VERIFICATION ENDPOINTS
# =============================================================================

@admin_bp.route('/doctors/pending-verification', methods=['GET'])
@login_required
@admin_required
def get_pending_verifications():
    """
    Ahmed: Get list of doctors pending verification
    
    TODO Ahmed - Implement:
    1. Query doctors with is_verified=False
    2. Include submitted documents info
    3. Order by application date
    4. Return paginated results
    """
    try:
        # TODO: Ahmed - Implement pending verifications query
        pending_doctors = Doctor.query.filter_by(is_verified=False).all()
        
        doctors_data = []
        for doctor in pending_doctors:
            # TODO: Ahmed - Format doctor data for verification
            doctors_data.append({
                'id': doctor.id,
                'user_id': doctor.user_id,
                'name': f"{doctor.user.first_name} {doctor.user.last_name}",
                'email': doctor.user.email,
                'specialty': doctor.specialty,
                'license_number': doctor.license_number,
                'years_of_experience': doctor.years_of_experience,
                'submitted_at': doctor.created_at.isoformat(),
                # TODO: Add document verification fields
            })
        
        return APIResponse.success(
            data={'pending_doctors': doctors_data},
            message="Pending verifications retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get pending verifications error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve pending verifications",
            status_code=500
        )

@admin_bp.route('/doctors/<int:doctor_id>/verify', methods=['POST'])
@login_required
@admin_required
def verify_doctor(doctor_id):
    """
    Ahmed: Verify a doctor
    
    Request Body:
    {
        "verification_notes": "Optional notes",
        "approved": true/false
    }
    
    TODO Ahmed - Implement:
    1. Find doctor by ID
    2. Update verification status
    3. Send notification email to doctor
    4. Log verification action
    5. Handle rejection with notes
    """
    try:
        data = request.get_json()
        doctor = Doctor.query.get_or_404(doctor_id)
        
        approved = data.get('approved', True)
        notes = data.get('verification_notes', '')
        
        if approved:
            doctor.is_verified = True
            doctor.verification_date = datetime.utcnow()
            # TODO: Ahmed - Set verification notes field
        else:
            # TODO: Ahmed - Handle rejection
            pass
        
        db.session.commit()
        
        # Log admin action
        log_user_action(
            current_user.id,
            'admin_verify_doctor',
            {
                'doctor_id': doctor_id,
                'approved': approved,
                'notes': notes
            }
        )
        
        # TODO: Ahmed - Send notification email to doctor
        
        return APIResponse.success(
            data={'doctor_id': doctor_id, 'verified': approved},
            message=f"Doctor {'verified' if approved else 'rejected'} successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Admin verify doctor error: {str(e)}")
        return APIResponse.error(
            message="Failed to verify doctor",
            status_code=500
        )

@admin_bp.route('/doctors', methods=['POST'])
@login_required
@admin_required
def add_doctor_manually():
    """
    Ahmed: Manually add a verified doctor
    
    Request Body:
    {
        "email": "doctor@example.com",
        "first_name": "Dr. John",
        "last_name": "Smith",
        "password": "temporary_password",
        "specialty": "cardiology",
        "license_number": "MD12345",
        "years_of_experience": 10
    }
    
    TODO Ahmed - Implement:
    1. Validate required fields
    2. Create User account
    3. Create Doctor profile
    4. Set as verified by default
    5. Send welcome email with login info
    """
    try:
        data = request.get_json()
        
        # TODO: Ahmed - Implement manual doctor creation
        # 1. Validate input data
        # 2. Check if email already exists
        # 3. Create User account
        # 4. Create Doctor profile
        # 5. Set verification status
        
        return APIResponse.success(
            data={'message': 'Doctor added successfully'},
            message="Doctor created and verified"
        )
        
    except Exception as e:
        app_logger.error(f"Admin add doctor error: {str(e)}")
        return APIResponse.error(
            message="Failed to add doctor",
            status_code=500
        )

# =============================================================================
# SYSTEM SETTINGS ENDPOINTS
# =============================================================================

@admin_bp.route('/settings', methods=['GET'])
@login_required
@admin_required
def get_system_settings():
    """
    Ahmed: Get current system settings
    
    TODO Ahmed - Implement:
    1. Create SystemSettings model
    2. Return current configuration
    3. Include maintenance mode, registration status, etc.
    """
    try:
        # TODO: Ahmed - Implement settings retrieval
        settings = {
            'maintenance_mode': False,
            'registration_enabled': True,
            'default_language': 'ar',
            'max_appointment_days_ahead': 30,
            'session_timeout_minutes': 60,
            'password_min_length': 8,
            'max_login_attempts': 5,
            # TODO: Add more settings
        }
        
        return APIResponse.success(
            data={'settings': settings},
            message="System settings retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get settings error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve settings",
            status_code=500
        )

@admin_bp.route('/settings', methods=['PUT'])
@login_required
@admin_required
def update_system_settings():
    """
    Ahmed: Update system settings
    
    TODO Ahmed - Implement:
    1. Validate settings data
    2. Update SystemSettings model
    3. Apply changes immediately where possible
    4. Log settings changes
    5. Notify other admins of changes
    """
    try:
        data = request.get_json()
        
        # TODO: Ahmed - Implement settings update
        # 1. Validate each setting
        # 2. Update database
        # 3. Apply runtime changes
        
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
@login_required
@admin_required
def get_detailed_health():
    """
    Ahmed: Get detailed platform health information
    
    TODO Ahmed - Implement:
    1. Database connection status
    2. API response times
    3. Error rates
    4. System resource usage
    5. External service status
    """
    try:
        # TODO: Ahmed - Implement detailed health check
        health_data = {
            'database': {
                'status': 'healthy',
                'connection_time_ms': 45,
                'active_connections': 12
            },
            'api': {
                'avg_response_time_ms': 120,
                'error_rate_24h': 0.02,
                'total_requests_24h': 1540
            },
            'system': {
                'cpu_usage_percent': 35,
                'memory_usage_percent': 68,
                'disk_usage_percent': 45,
                'uptime_hours': 72
            }
        }
        
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
@login_required
@admin_required
def get_dashboard_analytics():
    """
    Ahmed: Get analytics data for admin dashboard
    
    Query Parameters:
    - period: day/week/month/year
    - start_date: Start date for custom range
    - end_date: End date for custom range
    
    TODO Ahmed - Implement:
    1. User registration trends
    2. Appointment statistics
    3. Doctor activity metrics
    4. Geographic distribution
    5. Usage patterns by time
    """
    try:
        period = request.args.get('period', 'week')
        
        # TODO: Ahmed - Implement analytics queries
        analytics_data = {
            'user_stats': {
                'total_users': 1250,
                'new_registrations_period': 45,
                'active_users_period': 890,
                'user_growth_rate': 12.5
            },
            'appointment_stats': {
                'total_appointments': 3420,
                'appointments_period': 180,
                'completed_appointments': 2980,
                'cancelled_appointments': 120
            },
            'doctor_stats': {
                'total_doctors': 85,
                'verified_doctors': 78,
                'active_doctors_period': 65,
                'avg_appointments_per_doctor': 40
            },
            'platform_usage': {
                'peak_usage_hour': 14,
                'avg_session_duration_minutes': 25,
                'bounce_rate': 0.15,
                'most_used_features': ['appointments', 'consultations', 'records']
            }
        }
        
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
@login_required
@admin_required
def send_broadcast_notification():
    """
    Ahmed: Send notification to all users or specific groups
    
    Request Body:
    {
        "title": "System Maintenance",
        "message": "Scheduled maintenance tonight",
        "target": "all" | "patients" | "doctors",
        "type": "info" | "warning" | "urgent",
        "send_email": true,
        "send_sms": false
    }
    
    TODO Ahmed - Implement:
    1. Validate notification data
    2. Queue notifications for delivery
    3. Support different notification types
    4. Track delivery status
    5. Log broadcast action
    """
    try:
        data = request.get_json()
        
        # TODO: Ahmed - Implement broadcast notification
        title = data.get('title')
        message = data.get('message')
        target = data.get('target', 'all')
        notification_type = data.get('type', 'info')
        
        # TODO: Ahmed - Queue notifications for delivery
        
        log_user_action(
            current_user.id,
            'admin_broadcast_notification',
            {
                'title': title,
                'target': target,
                'type': notification_type
            }
        )
        
        return APIResponse.success(
            message="Broadcast notification queued successfully"
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
@login_required
@admin_required
def get_audit_logs():
    """
    Ahmed: Get system audit logs
    
    Query Parameters:
    - page: Page number
    - per_page: Items per page
    - action_type: Filter by action type
    - user_id: Filter by specific user
    - start_date: Start date filter
    - end_date: End date filter
    
    TODO Ahmed - Implement:
    1. Create AuditLog model
    2. Query logs with filters
    3. Return paginated results
    4. Include user information
    """
    try:
        # TODO: Ahmed - Implement audit log retrieval
        
        return APIResponse.success(
            data={'audit_logs': [], 'pagination': {}},
            message="Audit logs retrieved"
        )
        
    except Exception as e:
        app_logger.error(f"Admin get audit logs error: {str(e)}")
        return APIResponse.error(
            message="Failed to retrieve audit logs",
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

3. EMAIL/SMS INTEGRATION:
   - Set up email templates for doctor verification
   - Implement SMS notifications for urgent broadcasts
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