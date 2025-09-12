# Login Process in Sahatak Telemedicine Platform

## Overview

The Sahatak platform uses a JWT-based authentication system with session management. Users can login with email or phone number, and the system maintains both server-side sessions and client-side JWT tokens for secure authentication.

## Login Flow

### Step 1: User Credentials
Users can login using:
- **Email Address**: Registered email
- **Phone Number**: Registered phone number  
- **Password**: Account password

### Step 2: Frontend Submission
The login form (`index.html`) collects credentials and sends them to the backend:

```javascript
// frontend/assets/js/main.js
async function handleLogin(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('login-submit');
    const spinner = document.getElementById('login-spinner');
    const icon = document.getElementById('login-icon');
    const errorAlert = document.getElementById('login-error-alert');
    
    // Clear previous errors
    clearFormErrors('loginForm');
    if (errorAlert) errorAlert.classList.add('d-none');
    
    // Show loading state
    if (spinner) spinner.classList.remove('d-none');
    if (icon) icon.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = true;
    
    const formData = {
        login_identifier: document.getElementById('login_identifier').value.trim(),
        password: document.getElementById('password').value
    };
    
    try {
        // Validate form data
        if (!formData.login_identifier || !formData.password) {
            throw new Error('Email/phone and password are required');
        }
        
        // Make API call to login endpoint
        const response = await ApiHelper.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Store user session data using centralized AuthStorage
        if (response.data && response.data.user) {
            if (window.AuthStorage) {
                const authData = {
                    id: response.data.user.id,
                    user_type: response.data.user.user_type,
                    email: response.data.user.email,
                    full_name: response.data.user.full_name,
                    access_token: response.data.access_token,
                    profile: response.data.user.profile
                };
                AuthStorage.setAuthData(authData);
            } else {
                // Fallback to localStorage
                localStorage.setItem('sahatak_access_token', response.data.access_token);
                localStorage.setItem('sahatak_user_type', response.data.user.user_type);
                localStorage.setItem('sahatak_user_id', response.data.user.id);
                localStorage.setItem('sahatak_user_name', response.data.user.full_name);
                localStorage.setItem('sahatak_user_email', response.data.user.email);
            }
        }
        
        // Show success and redirect
        showAlert('success', 'Login successful! Redirecting...');
        setTimeout(() => {
            redirectToDashboard(response.data.user.user_type);
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle specific error cases
        if (error.error_code === 'USER_NOT_VERIFIED') {
            showAlert('warning', error.message);
        } else {
            showAlert('error', error.message || 'Login failed. Please try again.');
        }
        
    } finally {
        // Reset loading state
        if (spinner) spinner.classList.add('d-none');
        if (icon) icon.classList.remove('d-none');
        if (submitBtn) submitBtn.disabled = false;
    }
}
```

### Step 3: Backend Authentication
The backend (`backend/routes/auth.py`) processes the login with comprehensive validation:

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
        login_identifier = data.get('login_identifier', '').strip()
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
        login_user(user, remember=remember_me)
        user.last_login = datetime.datetime.utcnow()
        db.session.commit()
        
        # Generate secure JWT token for authentication
        token = None
        try:
            from utils.jwt_helper import JWTHelper
            
            token_data = {
                'user_id': user.id,
                'user_type': user.user_type,
                'email': user.email
            }
            
            token = JWTHelper.generate_token(token_data, expires_in=24)
            
        except ImportError:
            if user.user_type == 'admin':
                return APIResponse.error(
                    message="Admin authentication requires PyJWT. Please contact system administrator.",
                    status_code=500,
                    error_code="JWT_REQUIRED"
                )
            token = create_fallback_token(user)
        
        # Prepare user profile data
        user_profile = user.get_profile()
        user_data = user.to_dict()
        
        if user_profile:
            if user.user_type == 'doctor':
                user_data['doctor_profile'] = user_profile.to_dict()
            elif user.user_type == 'patient':
                user_data['patient_profile'] = user_profile.to_dict()
        
        # Log successful login
        log_user_action(user.id, 'login_success', {'login_method': 'email_phone'}, request)
        
        return APIResponse.success(
            data={
                'user': user_data,
                'access_token': token,
                'session_timeout': current_app.config.get('SESSION_TIMEOUT_MINUTES', 60)
            },
            message='Login successful'
        )
        
    except Exception as e:
        auth_logger.error(f"Login error: {str(e)}")
        return APIResponse.internal_error(message='Login failed. Please try again.')
```

### Step 4: Token Storage
The frontend stores the JWT token and user data:

```javascript
// Store JWT token
localStorage.setItem('sahatak_access_token', response.data.access_token);

// Store user info
localStorage.setItem('sahatak_user_type', response.data.user.user_type);
localStorage.setItem('sahatak_user_id', response.data.user.id);
localStorage.setItem('sahatak_user_name', response.data.user.full_name);
```

### Step 5: API Authentication
All subsequent API calls include the JWT token:

```javascript
// frontend/assets/js/main.js - ApiHelper
const token = localStorage.getItem('sahatak_access_token');
if (token) {
    headers['Authorization'] = `Bearer ${token}`;
}
```

## Authentication Components

### JWT Token Generation
The system uses a custom JWT helper for secure token generation:

```python
# backend/utils/jwt_helper.py
class JWTHelper:
    @staticmethod
    def generate_token(user_data, expires_in=24):
        """Generate a secure JWT token"""
        try:
            secret_key = current_app.config.get('SECRET_KEY')
            
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
    
    @staticmethod
    def decode_token(token):
        """Decode and validate JWT token"""
        try:
            secret_key = current_app.config.get('SECRET_KEY')
            payload = jwt.decode(
                token, 
                secret_key, 
                algorithms=['HS256'],
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None  # Token expired
        except jwt.InvalidTokenError:
            return None  # Invalid token
```

### API Protection
Protected endpoints use the `@api_login_required` decorator that supports both session and JWT authentication:

```python
# backend/routes/auth.py
def api_login_required(f):
    """Custom decorator supporting both session and JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # First try session-based authentication
        if current_user.is_authenticated:
            return f(*args, **kwargs)
        
        # Fallback to JWT token authentication
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if token:
            try:
                from utils.jwt_helper import JWTHelper
                payload = JWTHelper.decode_token(token)
                
                if payload:
                    user_id = payload.get('user_id')
                    user = User.query.get(user_id)
                    
                    if user and user.is_active:
                        from flask_login import login_user
                        login_user(user, remember=False)
                        return f(*args, **kwargs)
                        
            except ImportError:
                # Fallback to simple base64 token if PyJWT not available
                try:
                    import base64, json
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

# Usage example:
@app.route('/protected')
@api_login_required
def protected_endpoint():
    return APIResponse.success(data={'user': current_user.to_dict()})
```

### Session Management
The system maintains both JWT tokens and Flask sessions for hybrid authentication:

```python
# Hybrid authentication approach
# 1. Flask-Login for web sessions
login_user(user, remember=remember_me)
user.last_login = datetime.datetime.utcnow()
db.session.commit()

# 2. JWT tokens for API authentication
from utils.jwt_helper import JWTHelper
token_data = {
    'user_id': user.id,
    'user_type': user.user_type,
    'email': user.email
}
token = JWTHelper.generate_token(token_data, expires_in=24)

# 3. The @api_login_required decorator handles both:
# - Checks Flask-Login session first
# - Falls back to JWT token validation
# - Automatically creates session from valid JWT
```

## Security Features

### Password Security
- Passwords hashed using bcrypt
- Never stored in plain text
- Salt included in hash

```python
# backend/models.py
def set_password(self, password):
    self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

def check_password(self, password):
    return bcrypt.check_password_hash(self.password_hash, password)
```

### Token Security
- JWT tokens expire after 24 hours
- Tokens include user claims for authorization
- Bearer token authentication for API calls

### Session Security
- Server-side session storage
- Secure cookie flags
- CSRF protection enabled
- Session timeout after inactivity

## AuthGuard System

Frontend pages are protected using an enhanced AuthGuard:

```javascript
// frontend/assets/js/components/auth-guard.js
class AuthGuard {
    /**
     * Check if we're in development mode
     */
    static isDevelopmentMode() {
        const hostname = window.location.hostname;
        const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || 
                           hostname.startsWith('192.168.') || hostname === '';
        
        // Check for explicit dev mode flag (prevents accidental bypass in production)
        const urlParams = new URLSearchParams(window.location.search);
        const devModeEnabled = urlParams.get('dev') === 'true' || 
                              localStorage.getItem('dev_mode') === 'true';
        
        return isLocalHost && devModeEnabled;
    }
    
    /**
     * Check if user is authenticated
     */
    static isAuthenticated() {
        // Development mode bypass only if explicitly enabled
        if (this.isDevelopmentMode()) {
            console.log('🔓 Development mode: authentication bypassed');
            return true;
        }
        
        // Use centralized AuthStorage if available
        if (window.AuthStorage) {
            return AuthStorage.isAuthenticated();
        }
        
        // Fallback to legacy method
        const userId = localStorage.getItem('sahatak_user_id');
        const userType = localStorage.getItem('sahatak_user_type');
        const userEmail = localStorage.getItem('sahatak_user_email');
        
        return userId && userType && (userEmail || userType);
    }
    
    /**
     * Get current user data
     */
    static getCurrentUser() {
        if (!this.isAuthenticated()) return null;
        
        // Provide mock user data in development mode
        if (this.isDevelopmentMode()) {
            return {
                id: '1',
                userType: 'doctor',
                email: 'dev@localhost.com',
                fullName: 'Developer User'
            };
        }
        
        return {
            id: localStorage.getItem('sahatak_user_id'),
            userType: localStorage.getItem('sahatak_user_type'),
            email: localStorage.getItem('sahatak_user_email'),
            fullName: localStorage.getItem('sahatak_user_name')
        };
    }
    
    /**
     * Protect page with optional user type requirement
     */
    static protectPage(requiredUserType = null) {
        // Development mode bypass
        if (this.isDevelopmentMode()) {
            console.log(`🔓 Development mode: Page protection bypassed (required: ${requiredUserType || 'any'})`);
            return true;
        }
        
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        
        if (requiredUserType) {
            const userType = localStorage.getItem('sahatak_user_type');
            if (userType !== requiredUserType) {
                this.redirectToUnauthorized();
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Complete logout - clear local data and call backend
     */
    static async logout() {
        try {
            const baseUrl = 'https://sahatak.pythonanywhere.com/api';
            await fetch(`${baseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.error('Backend logout error:', error);
        }
        
        this.clearAuth();
        this.redirectToLogin();
        return true;
    }
    
    /**
     * Clear authentication data
     */
    static clearAuth() {
        if (window.AuthStorage) {
            AuthStorage.clearAuth();
        } else {
            const authKeys = [
                'sahatak_user_id', 'sahatak_user_type', 'sahatak_user_email',
                'sahatak_user_name', 'sahatak_access_token', 'sahatak_return_url'
            ];
            authKeys.forEach(key => localStorage.removeItem(key));
        }
        sessionStorage.clear();
    }
}

// Auto-protect pages with data-protect attribute
document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const protectType = body.getAttribute('data-protect');
    
    if (protectType !== null) {
        const requiredUserType = protectType === '' ? null : protectType;
        AuthGuard.protectPage(requiredUserType);
    }
});
```

### Page Protection
```html
<!-- Any authenticated user -->
<body data-protect="">

<!-- Patients only -->
<body data-protect="patient">  

<!-- Doctors only -->
<body data-protect="doctor">
```

## Login Validation

### Frontend Validation
- Required fields check
- Email/phone format validation
- Password minimum length

### Backend Validation
- User exists check
- Password verification
- Account status (active/verified)
- Email verification requirement

## Error Handling

### Common Login Errors

#### Invalid Credentials
```json
{
    "success": false,
    "message": "Invalid email/phone or password",
    "status_code": 401
}
```

#### Account Not Verified
```json
{
    "success": false,
    "message": "Please verify your email address",
    "status_code": 401,
    "error_code": "USER_NOT_VERIFIED"
}
```

#### Account Deactivated
```json
{
    "success": false,
    "message": "Account is deactivated. Please contact support.",
    "status_code": 401
}
```

#### JWT Required (Admin Users)
```json
{
    "success": false,
    "message": "Admin authentication requires PyJWT. Please contact system administrator.",
    "status_code": 500,
    "error_code": "JWT_REQUIRED"
}
```

## Logout Process

### Frontend Logout
```javascript
// frontend/assets/js/main.js
async function logout() {
    // Call backend logout
    await ApiHelper.makeRequest('/auth/logout', {
        method: 'POST'
    });
    
    // Clear stored data
    localStorage.removeItem('sahatak_access_token');
    localStorage.removeItem('sahatak_user_type');
    localStorage.removeItem('sahatak_user_id');
    localStorage.removeItem('sahatak_user_name');
    
    // Redirect to login
    window.location.href = '/';
}
```

### Backend Logout
```python
@auth_bp.route('/logout', methods=['POST'])
@api_login_required
def logout():
    logout_user()  # Clear Flask-Login session
    return APIResponse.success(message='Logout successful')
```

## Multi-Language Support

The login interface supports Arabic and English:

```javascript
// Language-aware error messages
const errorMessage = lang === 'ar' 
    ? 'بيانات الدخول غير صحيحة'
    : 'Invalid login credentials';
```

## API Communication Flow

### Login Request
```javascript
POST /api/auth/login
{
    "login_identifier": "user@example.com",
    "password": "password123"
}
```

### Login Response
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 123,
            "email": "user@example.com",
            "user_type": "patient",
            "full_name": "John Doe"
        },
        "access_token": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

### Authenticated API Call
```javascript
GET /api/users/profile
Headers: {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs..."
}
```

## Dashboard Redirection

After successful login, users are redirected based on type:

```javascript
function redirectToDashboard(userType) {
    const dashboardUrl = userType === 'doctor' 
        ? 'pages/dashboard/doctor.html' 
        : 'pages/dashboard/patient.html';
    
    window.location.href = dashboardUrl;
}
```

## Development Mode Features

The system includes development mode bypasses for testing:

```javascript
// Enable development mode (localhost only)
localStorage.setItem('dev_mode', 'true');
// OR use URL parameter: ?dev=true

// Development mode provides:
// - Authentication bypass on localhost
// - Mock user data for testing  
// - Enhanced debugging logs
// - Simplified user type checking
// - Page protection bypass
```

**Security Note**: Development mode only works on localhost and requires explicit enablement to prevent accidental bypass in production.

## Summary

The Sahatak authentication system provides:

1. **Custom JWT Authentication**: Secure JWT tokens using custom JWTHelper class
2. **Dual Login Methods**: Email or phone number support with comprehensive user lookup
3. **Hybrid Session Management**: Both server-side Flask-Login sessions and client-side JWT tokens
4. **Enhanced Frontend Protection**: AuthGuard with development mode support and centralized storage
5. **Secure Password Handling**: Werkzeug password hashing with salts
6. **Token Expiration**: 24-hour token expiration with fallback authentication
7. **Multi-Language Support**: Arabic and English interface support
8. **Comprehensive Error Handling**: Detailed validation and error messages
9. **Role-Based Access**: User type verification for protected routes
10. **Centralized Logout Management**: Clean session and token removal with backend notification
11. **Development Features**: Safe development mode with explicit enablement
12. **Comprehensive Logging**: Authentication events logging for security monitoring

**Key File Locations:**
- **Backend Authentication**: `backend/routes/auth.py`
- **JWT Helper**: `backend/utils/jwt_helper.py`
- **User Model**: `backend/models.py`
- **Frontend Login**: `frontend/assets/js/main.js`
- **AuthGuard**: `frontend/assets/js/components/auth-guard.js`
- **API Helper**: `frontend/assets/js/main.js`