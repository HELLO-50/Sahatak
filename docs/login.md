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
// frontend/assets/js/components/forms.js
async function handleLogin(event) {
    const formData = {
        login_identifier: document.getElementById('login_identifier').value.trim(),
        password: document.getElementById('password').value
    };
    
    const response = await ApiHelper.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData)
    });
}
```

### Step 3: Backend Authentication
The backend (`backend/routes/auth.py`) processes the login:

```python
@auth_bp.route('/login', methods=['POST'])
def login():
    # Find user by email or phone
    user = User.query.filter_by(email=login_identifier.lower()).first()
    
    # Verify password
    if not user or not user.check_password(password):
        return APIResponse.unauthorized('Invalid credentials')
    
    # Generate JWT token
    access_token = create_access_token(
        identity=user.id,
        additional_claims={
            'user_type': user.user_type,
            'email': user.email
        }
    )
    
    # Create session
    login_user(user)
    
    return APIResponse.success(
        data={
            'user': user.to_dict(),
            'access_token': access_token
        }
    )
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
```python
# backend/routes/auth.py
from flask_jwt_extended import create_access_token

access_token = create_access_token(
    identity=user.id,
    additional_claims={
        'user_type': user.user_type,
        'email': user.email,
        'full_name': user.full_name
    },
    expires_delta=timedelta(days=7)
)
```

### API Protection
Protected endpoints use the `@api_login_required` decorator:

```python
# backend/utils/auth_utils.py
@api_login_required
def protected_endpoint():
    # Decorator verifies JWT token
    # Sets current_user from token claims
    return APIResponse.success(data={'user': current_user.to_dict()})
```

### Session Management
The system maintains both JWT tokens and Flask sessions:

```python
# JWT for API authentication
@jwt_required()
def api_endpoint():
    user_id = get_jwt_identity()
    
# Flask-Login for session management  
@login_required
def web_endpoint():
    user = current_user
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
- JWT tokens expire after 7 days
- Tokens include user claims for authorization
- Bearer token authentication for API calls

### Session Security
- Server-side session storage
- Secure cookie flags
- CSRF protection enabled
- Session timeout after inactivity

## AuthGuard System

Frontend pages are protected using AuthGuard:

```javascript
// frontend/assets/js/components/auth-guard.js
class AuthGuard {
    static isAuthenticated() {
        const token = localStorage.getItem('sahatak_access_token');
        const userId = localStorage.getItem('sahatak_user_id');
        return token && userId;
    }
    
    static protectPage(requiredUserType = null) {
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
}
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
    "message": "Account is deactivated",
    "status_code": 401
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

## Summary

The Sahatak authentication system provides:

1. **JWT Token Authentication**: Secure API authentication with Bearer tokens
2. **Dual Login Methods**: Email or phone number support
3. **Session Management**: Server-side sessions with Flask-Login
4. **Frontend Protection**: AuthGuard for page-level security
5. **Secure Password Handling**: Bcrypt hashing with salts
6. **Token Expiration**: Automatic token refresh handling
7. **Multi-Language Support**: Arabic and English interfaces
8. **Error Handling**: Clear validation and error messages
9. **Role-Based Access**: User type verification for protected routes
10. **Logout Management**: Clean session and token removal