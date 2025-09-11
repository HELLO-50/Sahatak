# Session Management - Sahatak Platform

This document provides a comprehensive guide to the authentication and session management implementation in the Sahatak healthcare platform, explaining all technical components, workflows, and security mechanisms with proper code references for junior developers.

## Overview

The Sahatak platform implements a hybrid authentication system that supports both session-based and JWT token-based authentication. This dual approach ensures compatibility across different deployment scenarios while maintaining security for medical data access.

**Main Implementation Files**:
- **Backend**: `backend/routes/auth.py` - Authentication logic
- **Frontend**: `frontend/assets/js/components/auth-storage.js` - Client-side session management
- **Security**: `frontend/assets/js/components/auth-guard.js` - Route protection
- **JWT Utils**: `backend/utils/jwt_helper.py` - Token management

## Architecture Overview

### Authentication Technology Stack
```
Session Management Stack
├── Backend Authentication
│   ├── Flask-Login for session management
│   ├── JWT tokens for API authentication
│   ├── Werkzeug password hashing
│   └── Custom authentication decorators
├── Frontend Session Management
│   ├── localStorage for persistent auth data
│   ├── AuthStorage class for centralized auth state
│   ├── AuthGuard for route protection
│   └── Automatic session validation
├── Security Layers
│   ├── Password validation and hashing
│   ├── Email verification requirements
│   ├── Session timeout management
│   └── Role-based access control
```

---

## Core Components and Code Structure

### 1. Custom Authentication Decorator
**Location**: `backend/routes/auth.py:16-102`

The platform uses a custom authentication decorator that supports both session and JWT authentication:

```python
def api_login_required(f):
    """
    Custom login_required decorator that supports both session and JWT authentication
    This handles cross-origin authentication issues
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Debug logging for video endpoints
        from flask import session
        if 'video' in request.endpoint or request.endpoint.endswith(('start', 'end', 'complete', 'disconnect')):
            auth_logger.info(f"🎥 Video API auth check for {request.endpoint}")
            auth_logger.info(f"🎥 User authenticated: {current_user.is_authenticated}, Session: {list(session.keys()) if session else 'No session'}")
        
        # First try session-based authentication
        if current_user.is_authenticated:
            return f(*args, **kwargs)
        
        # Fallback to token authentication
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
        if token:
            try:
                # Try proper JWT decoding first
                from utils.jwt_helper import JWTHelper
                payload = JWTHelper.decode_token(token)
                
                if payload:
                    # Load user from token
                    user_id = payload.get('user_id')
                    user = User.query.get(user_id)
                    
                    if user and user.is_active:
                        from flask_login import login_user
                        login_user(user, remember=False)
                        return f(*args, **kwargs)
                        
            except ImportError:
                # Fallback to simple base64 token if PyJWT not available
                try:
                    import base64
                    import json
                    
                    token_json = base64.b64decode(token.encode()).decode()
                    payload = json.loads(token_json)
                    
                    exp_time = payload.get('exp', 0)
                    current_time = int(datetime.datetime.utcnow().timestamp())
                    
                    if exp_time >= current_time:
                        user_id = payload.get('user_id')
                        user = User.query.get(user_id)
                        
                        if user and user.is_active:
                            from flask_login import login_user
                            login_user(user, remember=False)
                            return f(*args, **kwargs)
                            
                except Exception as e:
                    auth_logger.error(f"Fallback token auth error: {str(e)}")
                    
            except Exception as e:
                auth_logger.error(f"Token auth error: {str(e)}")
        
        auth_logger.warning(f"Unauthorized access attempt to {request.endpoint}")
        return APIResponse.unauthorized(message='Authentication required')
    
    return decorated_function
```

**Key Features Explained**:
1. **Dual Authentication**: Tries session first, then JWT token
2. **Video Endpoint Logging**: Special logging for video consultation endpoints
3. **Fallback Mechanism**: Base64 token support if PyJWT unavailable
4. **Security Logging**: Tracks unauthorized access attempts

### 2. User Registration Flow
**Location**: `backend/routes/auth.py:136-199`

```python
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
        existing_user_phone = User.query.join(Patient, User.id == Patient.user_id).filter(Patient.phone == data['phone']).first()
        if not existing_user_phone:
            existing_user_phone = User.query.join(Doctor, User.id == Doctor.user_id).filter(Doctor.phone == data['phone']).first()
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
```

**Validation Checks Performed**:
1. **Required Fields**: All fields must be provided
2. **Phone Uniqueness**: Checks both Patient and Doctor tables
3. **Email Uniqueness**: Prevents duplicate email addresses
4. **Password Strength**: Uses custom validation function
5. **User Type**: Only 'patient' or 'doctor' allowed

### 3. Login Authentication Flow
**Location**: `backend/routes/auth.py:392-491`

```python
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login user with email or phone"""
    try:
        # Handle GET requests (redirected by Flask-Login)
        if request.method == 'GET':
            return APIResponse.unauthorized(message='Authentication required')
        
        data = request.get_json()
        
        # Validate required fields
        login_identifier = data.get('login_identifier', '').strip()  # Can be email or phone
        password = data.get('password')
        
        if not login_identifier or not password:
            return APIResponse.validation_error(
                field='login_identifier',
                message='Email/phone and password are required'
            )
        
        # Find user by email or phone
        user = None
        
        # Try to find by email first (including 'admin' as special case)
        if validate_email(login_identifier):
            # For 'admin' username, search by exact match
            if login_identifier.lower() == 'admin':
                user = User.query.filter_by(email='admin').first()
            else:
                user = User.query.filter_by(email=login_identifier.lower()).first()
        
        # If not found by email, try to find by phone
        if not user and validate_phone(login_identifier)['valid']:
            # Search in patient profiles
            patient_user = User.query.join(Patient, User.id == Patient.user_id).filter(Patient.phone == login_identifier).first()
            if patient_user:
                user = patient_user
            else:
                # Search in doctor profiles
                doctor_user = User.query.join(Doctor, User.id == Doctor.user_id).filter(Doctor.phone == login_identifier).first()
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
        
        # Check if email verification is required (skip for master admin)
        if user.email and not user.is_verified and user.email != 'admin':
            return APIResponse.error(
                message="Please verify your email address before logging in. Check your email for verification link.",
                status_code=401,
                error_code=ErrorCodes.USER_NOT_VERIFIED
            )
        
        # Login user and update last login
        remember_me = data.get('remember_me', False)
        auth_logger.info(f"Attempting to login user {user.id} with remember_me={remember_me}")
        
        login_user(user, remember=remember_me)
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Debug: Check if session was created
        from flask import session
        auth_logger.info(f"Login successful - Session keys after login: {list(session.keys())}, User authenticated: {current_user.is_authenticated}")
        auth_logger.info(f"Session ID: {session.get('_id', 'No session ID')}")
        auth_logger.info(f"User in session: {session.get('_user_id', 'No user in session')}")
        
        # Generate secure JWT token for authentication
        token = None
        try:
            from utils.jwt_helper import JWTHelper
            
            # Create token data
            token_data = {
                'user_id': user.id,
                'user_type': user.user_type,
                'email': user.email
            }
            
            # Generate secure JWT token
            token = JWTHelper.generate_token(token_data, expires_in=24)
            
            if token:
                auth_logger.info(f"Secure JWT token generated for user {user.id}")
            else:
                auth_logger.warning(f"JWT generation returned None for user {user.id}")
```

**Login Process Steps**:
1. **Flexible Login**: Accepts email or phone number
2. **Special Admin Case**: Handles 'admin' username specially
3. **User Lookup**: Searches Patient and Doctor tables for phone
4. **Security Checks**: Active status and email verification
5. **Session Creation**: Uses Flask-Login for session management
6. **JWT Generation**: Creates token for API authentication

### 4. Session Validation Endpoint
**Location**: `backend/routes/auth.py:106-134`

```python
@auth_bp.route('/me', methods=['GET'])
@api_login_required
def get_current_user():
    """Get current authenticated user data - used for session validation"""
    try:
        # Debug logging
        auth_logger.info(f"Session check for user ID: {current_user.id}, authenticated: {current_user.is_authenticated}")
        
        # Update last activity to extend session
        current_user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Prepare response with user data and profile
        user_data = current_user.to_dict()
        profile = current_user.get_profile()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        return APIResponse.success(
            data={'user': user_data},
            message='User data retrieved successfully'
        )
        
    except Exception as e:
        auth_logger.error(f"Error getting current user: {str(e)}")
        return APIResponse.error(
            message='Failed to get user data',
            status_code=500
        )
```

**Purpose**: This endpoint serves multiple functions:
1. **Session Validation**: Verifies if user is still authenticated
2. **Activity Tracking**: Updates last_login timestamp
3. **Profile Data**: Returns user and profile information
4. **Session Extension**: Keeps session active

### 5. Logout Implementation
**Location**: `backend/routes/auth.py:578-605`

```python
@auth_bp.route('/logout', methods=['POST'])
@api_login_required
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
```

**Logout Process**:
1. **User Tracking**: Records who is logging out
2. **Action Logging**: Logs logout event for audit
3. **Session Clearing**: Uses Flask-Login logout_user()
4. **Error Handling**: Graceful error handling

---

## Frontend Session Management

### 1. AuthStorage Class
**Location**: `frontend/assets/js/components/auth-storage.js:7-100`

The AuthStorage class provides centralized authentication state management:

```javascript
class AuthStorage {
    // Define the auth data structure
    static AUTH_KEY = 'sahatak_auth';
    static LANGUAGE_KEY = 'sahatak_language';
    static RETURN_URL_KEY = 'sahatak_return_url';
    
    /**
     * Save authentication data as a single object
     * @param {Object} authData - User authentication data
     */
    static setAuthData(authData) {
        if (!authData) return false;
        
        const authObject = {
            id: authData.id || authData.user_id,
            type: authData.user_type || authData.userType,
            email: authData.email,
            name: authData.full_name || authData.fullName,
            token: authData.access_token || authData.token,
            profile: authData.profile || null,
            timestamp: Date.now()
        };
        
        // Store as single object
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authObject));
        
        // Also maintain individual keys for backward compatibility (will phase out later)
        this._setLegacyKeys(authObject);
        
        return true;
    }
    
    /**
     * Get authentication data
     * @returns {Object|null} Authentication data or null if not authenticated
     */
    static getAuthData() {
        try {
            const authStr = localStorage.getItem(this.AUTH_KEY);
            if (authStr) {
                return JSON.parse(authStr);
            }
            
            // Fallback: try to construct from legacy keys
            return this._getLegacyAuthData();
        } catch (error) {
            console.error('Error reading auth data:', error);
            return null;
        }
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    static isAuthenticated() {
        const authData = this.getAuthData();
        return !!(authData && authData.id && authData.type);
    }
    
    /**
     * Clear all authentication data
     */
    static clearAuth() {
        // Remove main auth object
        localStorage.removeItem(this.AUTH_KEY);
        
        // ONLY clear auth-related keys, preserve others
        const authOnlyKeys = [
            'sahatak_user_id',
            'sahatak_user_type',
            'sahatak_user_email',
            'sahatak_user_name',
            'sahatak_user_data',
            'sahatak_doctor_data',
            'sahatak_patient_data',
            'sahatak_user',
            'sahatak_token',
            'sahatak_access_token'
        ];
        
        authOnlyKeys.forEach(key => localStorage.removeItem(key));
```

**Key Features**:
1. **Centralized Storage**: Single source of truth for auth state
2. **Backward Compatibility**: Supports legacy key structure
3. **Selective Clearing**: Only removes auth-related data
4. **Error Handling**: Graceful error handling for localStorage issues

### 2. AuthGuard Route Protection
**Location**: `frontend/assets/js/components/auth-guard.js:1-44`

```javascript
// Authentication Guard - Protects dashboard and protected routes
class AuthGuard {
    
    /**
     * Check if we're in development mode
     * @returns {boolean} True if in development mode AND explicitly enabled
     */
    static isDevelopmentMode() {
        // Only enable dev mode if BOTH conditions are met:
        // 1. Running on localhost/local IP
        // 2. Dev mode explicitly enabled via URL param or localStorage
        const hostname = window.location.hostname;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname === '';
        
        // Check for explicit dev mode flag (prevents accidental bypass in production)
        const urlParams = new URLSearchParams(window.location.search);
        const devModeEnabled = urlParams.get('dev') === 'true' || localStorage.getItem('dev_mode') === 'true';
        
        return isLocalHost && devModeEnabled;
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    static isAuthenticated() {
        // Development mode bypass only if explicitly enabled
        if (this.isDevelopmentMode()) {
            console.log('🔓 Development mode: authentication bypassed (dev flag enabled)');
            return true;
        }
        
        // Use centralized AuthStorage if available
        if (window.AuthStorage) {
            return AuthStorage.isAuthenticated();
        }
        
        // Fallback to legacy method for backward compatibility
        const userId = localStorage.getItem('sahatak_user_id');
        const userType = localStorage.getItem('sahatak_user_type');
        const userEmail = localStorage.getItem('sahatak_user_email');
        
        return userId && userType && (userEmail || userType); // Email optional for phone-only users
    }
```

**Security Features**:
1. **Development Mode**: Secure bypass only for localhost with explicit flag
2. **Centralized Check**: Uses AuthStorage when available
3. **Fallback Support**: Legacy compatibility for older implementations
4. **Production Safety**: Prevents accidental auth bypass in production

---

## JWT Token Management

### 1. JWT Helper Class
**Location**: `backend/utils/jwt_helper.py:11-47`

```python
class JWTHelper:
    """Helper class for JWT token operations"""
    
    @staticmethod
    def generate_token(user_data, expires_in=24):
        """
        Generate a secure JWT token
        
        Args:
            user_data: Dictionary containing user information
            expires_in: Token expiration time in hours (default 24)
        
        Returns:
            str: Encoded JWT token
        """
        try:
            # Get secret key from app config or environment
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key-change-in-production')
            
            # Create token payload
            payload = {
                'user_id': user_data.get('user_id'),
                'user_type': user_data.get('user_type'),
                'email': user_data.get('email'),
                'exp': datetime.datetime.utcnow() + timedelta(hours=expires_in),
                'iat': datetime.datetime.utcnow(),
                'iss': 'sahatak-api'  # Issuer
            }
            
            # Generate token with HS256 algorithm
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            return token
            
        except Exception as e:
            current_app.logger.error(f"JWT generation error: {str(e)}")
            return None
```

**Token Structure**:
- **user_id**: Unique user identifier
- **user_type**: Role (patient, doctor, admin)
- **email**: User email address
- **exp**: Expiration timestamp
- **iat**: Issued at timestamp
- **iss**: Issuer identifier

---

## Session Security Configuration

### Environment Variables
**File**: `backend/.env:54-76`

```bash
# Authentication Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Session Management
SESSION_TIMEOUT_MINUTES=15
AUTO_LOGOUT_WARNING_MINUTES=2

# Password Requirements
PASSWORD_MIN_LENGTH=6
PASSWORD_MAX_LENGTH=128
```

### Security Features Implemented

#### 1. Email Verification Requirement
**Location**: Referenced in login flow (line 447-452)
- All users must verify email before login (except admin)
- Blocks login for unverified accounts
- Returns specific error code for frontend handling

#### 2. Account Status Checking
**Location**: Login flow (lines 441-444)
- Checks `is_active` flag before allowing login
- Prevents deactivated accounts from accessing system
- Returns appropriate error message

#### 3. Session Activity Tracking
**Location**: Session validation endpoint (lines 115-116)
- Updates `last_login` timestamp on each session check
- Helps track user activity for security monitoring
- Extends session automatically

#### 4. Comprehensive Logging
**Location**: Throughout auth.py file
- Logs all authentication attempts
- Tracks unauthorized access attempts
- Special logging for video endpoints
- User action logging for audit trails

---

## Authentication Flow Diagrams

### Complete Login Process
```
User Login Attempt
├── Frontend Form Submission
│   ├── Validate input fields
│   ├── Send POST to /auth/login
│   └── Handle response
├── Backend Authentication
│   ├── Find user by email/phone
│   ├── Verify password hash
│   ├── Check account status
│   ├── Verify email if required
│   ├── Create session with Flask-Login
│   ├── Generate JWT token
│   └── Return success response
├── Frontend Session Setup
│   ├── Store auth data in AuthStorage
│   ├── Set user context globally
│   ├── Redirect to dashboard
│   └── Start periodic session validation
```

### Session Validation Process
```
Session Validation (every 30 seconds)
├── Frontend Check
│   ├── AuthGuard.isAuthenticated()
│   ├── Check localStorage data
│   └── If valid, continue
├── Backend Validation (optional)
│   ├── GET /auth/me endpoint
│   ├── Verify session/token
│   ├── Update last activity
│   └── Return user data
├── Session Renewal
│   ├── Update timestamp
│   ├── Extend session validity
│   └── Continue user session
```

---

## Error Handling

### Common Authentication Errors

#### 1. Invalid Credentials
```python
# backend/routes/auth.py:435-438
if not user or not user.check_password(password):
    return APIResponse.unauthorized(
        message='Invalid email/phone or password'
    )
```

#### 2. Unverified Email
```python
# backend/routes/auth.py:447-452
if user.email and not user.is_verified and user.email != 'admin':
    return APIResponse.error(
        message="Please verify your email address before logging in.",
        status_code=401,
        error_code=ErrorCodes.USER_NOT_VERIFIED
    )
```

#### 3. Deactivated Account
```python
# backend/routes/auth.py:441-444
if not user.is_active:
    return APIResponse.unauthorized(
        message='Account is deactivated. Please contact support.'
    )
```

#### 4. Session Expired
```javascript
// Handled in frontend AuthGuard
if (!AuthStorage.isAuthenticated()) {
    // Redirect to login page
    window.location.href = '/login.html';
}
```

---

## Testing Checklist

### Authentication Testing
- [ ] Login with valid email/password
- [ ] Login with valid phone/password
- [ ] Login with invalid credentials
- [ ] Login with unverified email
- [ ] Login with deactivated account
- [ ] Session validation after login
- [ ] Session expiration handling
- [ ] Logout functionality
- [ ] JWT token generation
- [ ] JWT token validation
- [ ] Development mode bypass (localhost only)

### Security Testing
- [ ] Password requirements validation
- [ ] Email format validation
- [ ] Phone format validation
- [ ] Duplicate registration prevention
- [ ] Cross-origin authentication
- [ ] Authorization header parsing
- [ ] Token expiration handling
- [ ] Session activity tracking

---

## Summary

The Sahatak session management system implements a robust, hybrid authentication approach suitable for a medical platform:

### Key Features:
1. **Dual Authentication**: Session-based + JWT tokens
2. **Flexible Login**: Email or phone number support
3. **Security First**: Email verification, account status checks
4. **Comprehensive Logging**: Full audit trail of authentication events
5. **Development Support**: Safe development mode for localhost
6. **Role-Based Access**: Different permissions for patients/doctors/admin
7. **Session Management**: Automatic validation and renewal

### File References:
- **Backend Auth**: `backend/routes/auth.py`
- **Frontend Storage**: `frontend/assets/js/components/auth-storage.js`
- **Route Protection**: `frontend/assets/js/components/auth-guard.js`
- **JWT Utils**: `backend/utils/jwt_helper.py`
- **Environment Config**: `backend/.env:54-76`

For additional information, refer to:
- [Flask-Login Documentation](https://flask-login.readthedocs.io/)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- Platform documentation in `/docs` folder