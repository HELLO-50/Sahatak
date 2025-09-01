# Authentication Guard Documentation - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [What is an Auth Guard?](#what-is-an-auth-guard)
3. [How Auth Guard Works](#how-auth-guard-works)
4. [Frontend Auth Guard](#frontend-auth-guard)
5. [Backend Authentication](#backend-authentication)
6. [Page Protection Mechanisms](#page-protection-mechanisms)
7. [Session Management](#session-management)
8. [Security Features](#security-features)
9. [Common Patterns and Examples](#common-patterns-and-examples)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Sahatak Telemedicine Platform uses a two-layer authentication guard system to protect sensitive medical information and ensure only authorized users can access specific features. The system combines frontend route protection (for user experience) with backend authentication (for actual security).

### Key Components
- **Frontend AuthGuard Class**: JavaScript-based route protection in `/frontend/assets/js/components/auth-guard.js`
- **Backend Authentication**: Flask-Login based authentication using `@login_required` decorator
- **Session Storage**: LocalStorage for frontend state, server sessions for backend security

---

## What is an Auth Guard?

An authentication guard is like a security checkpoint that:
1. **Checks Identity**: Verifies if a user is logged in
2. **Validates Permissions**: Ensures the user has the right type (patient, doctor, admin)
3. **Controls Access**: Redirects unauthorized users to appropriate pages
4. **Maintains Security**: Protects sensitive medical data from unauthorized access

Think of it as a bouncer at different doors of your application - checking if you have the right "ticket" (authentication) to enter.

---

## How Auth Guard Works

### The Two-Layer Protection Model

```
User Requests Page
        ↓
Frontend Auth Guard (Layer 1)
   - Quick client-side check
   - Better user experience
   - Instant feedback
        ↓ (if authenticated)
Page Loads & Makes API Calls
        ↓
Backend Authentication (Layer 2)
   - Secure server-side validation
   - Real security enforcement
   - Database permission checks
        ↓ (if authorized)
Protected Data Returned
```

### Why Two Layers?

1. **Frontend Guard**: Provides immediate feedback and better UX
2. **Backend Guard**: Provides actual security (frontend can be bypassed)

**Important**: Frontend guards are for convenience, backend guards are for security!

---

## Frontend Auth Guard

### Location and Structure
**File**: `/frontend/assets/js/components/auth-guard.js`

### Core Methods

#### 1. Authentication Check
**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static isAuthenticated() {
    // Development mode bypass (for testing)
    if (this.isDevelopmentMode()) {
        console.log('Development mode: bypassing authentication');
        return true;
    }
    
    // Check for required session data
    const userId = localStorage.getItem('sahatak_user_id');
    const userType = localStorage.getItem('sahatak_user_type');
    const userEmail = localStorage.getItem('sahatak_user_email');
    
    // User must have ID and type (email optional for phone users)
    return userId && userType && (userEmail || userType);
}
```

**What it checks**:
- User ID exists in localStorage
- User type is set (patient/doctor/admin)
- Email exists OR user type exists (for phone-only users)

#### 2. User Type Validation
**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static hasUserType(requiredType) {
    // Development bypass
    if (this.isDevelopmentMode()) {
        return true;
    }
    
    const userType = localStorage.getItem('sahatak_user_type');
    return userType === requiredType;
}
```

**Use cases**:
- Ensuring only doctors access doctor dashboard
- Preventing patients from accessing doctor-only features
- Role-based access control

#### 3. Page Protection
**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static protectPage(requiredUserType = null) {
    // Check authentication first
    if (!this.isAuthenticated()) {
        console.warn('User not authenticated, redirecting to login');
        this.redirectToLogin();
        return false;
    }
    
    // Check user type if specified
    if (requiredUserType && !this.hasUserType(requiredUserType)) {
        console.warn(`User type mismatch. Required: ${requiredUserType}`);
        // Redirect to correct dashboard
        this.redirectToCorrectDashboard();
        return false;
    }
    
    return true;
}
```

### Auto-Protection with HTML Attributes

Pages can be automatically protected using the `data-protect` attribute:

```html
<!-- Any authenticated user can access -->
<body data-protect="">

<!-- Only patients can access -->
<body data-protect="patient">

<!-- Only doctors can access -->
<body data-protect="doctor">

<!-- Only admins can access -->
<body data-protect="admin">
```

The protection is automatically applied when the page loads:

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const protectType = body.getAttribute('data-protect');
    
    if (protectType !== null) {
        // Page requires protection
        const requiredUserType = protectType === '' ? null : protectType;
        AuthGuard.protectPage(requiredUserType);
    }
});
```

### Development Mode

During development, authentication can be bypassed for easier testing:

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static isDevelopmentMode() {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname.startsWith('192.168.') || 
           hostname === '';
}
```

**Note**: This ONLY affects frontend checks. Backend still requires proper authentication!

---

## Backend Authentication

### Flask-Login Integration

The backend uses Flask-Login for session management:

**File**: `/backend/app.py`
```python
from flask_login import LoginManager

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
```

### Protected Routes

Backend routes are protected using the `@login_required` decorator:

**File**: `/backend/routes/appointments.py`
```python
from flask_login import login_required, current_user

@appointments_bp.route('/create', methods=['POST'])
@login_required
def create_appointment():
    """Create a new appointment - requires authentication"""
    # current_user is automatically available
    user_id = current_user.id
    user_type = current_user.user_type
    
    # Rest of the implementation...
```

### User Type Checking

For routes that require specific user types:

**File**: `/backend/routes/doctor_verification.py`
```python
@doctor_bp.route('/profile', methods=['GET'])
@login_required
def get_doctor_profile():
    # Check if user is a doctor
    if current_user.user_type != 'doctor':
        return APIResponse.forbidden(
            message='Access denied. Doctor account required.'
        )
    
    # Process doctor-specific request...
```

### Session Management

Sessions are managed server-side with cookies:

**File**: `/backend/config.py`
```python
class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    SESSION_COOKIE_SECURE = True  # HTTPS only
    SESSION_COOKIE_HTTPONLY = True  # No JavaScript access
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
```

---

## Page Protection Mechanisms

### 1. HTML Page Protection

**File**: `/frontend/pages/dashboard/patient.html`
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <title>Patient Dashboard - Sahatak</title>
</head>
<body data-protect="patient">
    <!-- Page content only loads if user is a patient -->
</body>
</html>
```

### 2. JavaScript Manual Protection

For dynamic protection in JavaScript:

**File**: `/frontend/assets/js/main.js`
```javascript
async function loadDoctorAppointments() {
    // Manually check authentication
    if (!AuthGuard.isAuthenticated()) {
        AuthGuard.redirectToLogin();
        return;
    }
    
    // Check user type
    if (!AuthGuard.hasUserType('doctor')) {
        alert('Access denied. Doctor account required.');
        window.location.href = 'patient.html';
        return;
    }
    
    // Load doctor-specific data...
}
```

### 3. API Request Protection

API requests include credentials for backend validation:

**File**: `/frontend/assets/js/api-helper.js`
```javascript
class ApiHelper {
    static async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            credentials: 'include',  // Send cookies
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const response = await fetch(endpoint, {
            ...defaultOptions,
            ...options
        });
        
        // Handle authentication errors
        if (response.status === 401) {
            // Session expired or invalid
            AuthGuard.clearAuth();
            AuthGuard.redirectToLogin();
            throw new Error('Authentication required');
        }
        
        return response;
    }
}
```

---

## Session Management

### Frontend Session Storage

Session data stored in localStorage after successful login:

**File**: `/frontend/assets/js/main.js`
```javascript
// After successful login
localStorage.setItem('sahatak_user_id', '123');
localStorage.setItem('sahatak_user_type', 'patient');
localStorage.setItem('sahatak_user_email', 'user@example.com');
localStorage.setItem('sahatak_user_name', 'Ahmed Ali');
localStorage.setItem('sahatak_language', 'ar');
```

### Getting Current User

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static getCurrentUser() {
    if (!this.isAuthenticated()) {
        return null;
    }
    
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
```

### Logout Process

Complete logout clears both frontend and backend sessions:

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static async logout() {
    try {
        // 1. Call backend to invalidate server session
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Backend logout error:', error);
    }
    
    // 2. Clear frontend session data
    this.clearAuth();
    
    // 3. Redirect to login page
    this.redirectToLogin();
}
```

Backend logout handler:

**File**: `/backend/routes/auth.py`
```python
@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """Logout current user and clear session"""
    try:
        user_id = current_user.id if current_user.is_authenticated else None
        
        # Log the logout action
        if user_id:
            log_user_action(user_id, 'user_logout', {
                'email': current_user.email
            }, request)
        
        # Clear the user session
        logout_user()
        
        return APIResponse.success(message='Logout successful')
        
    except Exception as e:
        auth_logger.error(f"Logout error: {str(e)}")
        return APIResponse.internal_error(
            message='Logout failed. Please try again.'
        )
```

---

## Security Features

### 1. Defense in Depth

Multiple layers of security:
- Frontend validation (UX)
- Backend authentication (Security)
- Database permissions (Data integrity)
- HTTPS encryption (Transport security)

### 2. Session Security

**File**: `/backend/config.py`
```python
# Backend session configuration
SESSION_COOKIE_SECURE = True     # HTTPS only
SESSION_COOKIE_HTTPONLY = True   # No JS access
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection
```

### 3. Token Validation

Backend validates every request:

**File**: `/backend/routes/medical.py`
```python
@login_required  # Decorator checks session validity
def protected_route():
    # Flask-Login automatically:
    # 1. Checks session cookie
    # 2. Loads user from database
    # 3. Validates session hasn't expired
    # 4. Makes current_user available
```

### 4. Password Security

**File**: `/backend/models.py`
```python
class User(UserMixin, db.Model):
    def set_password(self, password):
        """Hash and set password securely"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
```

---

## Common Patterns and Examples

### Pattern 1: Protecting a New Page

**File**: `/frontend/pages/medical/new-feature.html`
```html
<!DOCTYPE html>
<html>
<body data-protect="doctor">
    <!-- Include auth-guard.js -->
    <script src="/frontend/assets/js/components/auth-guard.js"></script>
    
    <!-- Page automatically protected for doctors only -->
    <h1>Doctor-Only Feature</h1>
</body>
</html>
```

### Pattern 2: Conditional UI Elements

**File**: `/frontend/assets/js/main.js`
```javascript
// Show/hide elements based on user type
document.addEventListener('DOMContentLoaded', function() {
    const user = AuthGuard.getCurrentUser();
    
    if (user && user.userType === 'doctor') {
        document.getElementById('doctor-menu').style.display = 'block';
    } else {
        document.getElementById('patient-menu').style.display = 'block';
    }
});
```

### Pattern 3: Protected API Call

**File**: `/frontend/assets/js/medical-records.js`
```javascript
async function updateMedicalRecord(recordId, data) {
    // Frontend check (optional, for better UX)
    if (!AuthGuard.isAuthenticated()) {
        AuthGuard.redirectToLogin();
        return;
    }
    
    try {
        // Backend will verify authentication
        const response = await fetch(`/api/medical/records/${recordId}`, {
            method: 'PUT',
            credentials: 'include',  // Important!
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (response.status === 401) {
            // Session expired
            AuthGuard.logout();
        }
        
        return await response.json();
    } catch (error) {
        console.error('Update failed:', error);
    }
}
```

### Pattern 4: Role-Based Feature Access

**File**: `/frontend/assets/js/feature-access.js`
```javascript
class FeatureAccess {
    static canPrescribeMedication() {
        return AuthGuard.hasUserType('doctor');
    }
    
    static canViewAllPatients() {
        return AuthGuard.hasUserType('doctor') || 
               AuthGuard.hasUserType('admin');
    }
    
    static canModifyAppointment(appointmentOwnerId) {
        const user = AuthGuard.getCurrentUser();
        return user && (
            user.id === appointmentOwnerId ||
            user.userType === 'admin'
        );
    }
}

// Usage
if (FeatureAccess.canPrescribeMedication()) {
    showPrescriptionForm();
} else {
    showReadOnlyView();
}
```

### Pattern 5: Backend Route Protection

**File**: `/backend/routes/medical_history.py`
```python
@medical_bp.route('/history/<int:patient_id>', methods=['GET'])
@login_required
def get_medical_history(patient_id):
    # Only allow patients to view their own history or doctors to view any
    if current_user.user_type == 'patient':
        if current_user.patient_profile.id != patient_id:
            return APIResponse.forbidden(
                message='You can only view your own medical history'
            )
    elif current_user.user_type != 'doctor':
        return APIResponse.forbidden(
            message='Access denied'
        )
    
    # Fetch and return medical history...
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. "User keeps getting redirected to login"

**Possible Causes**:
- Session data not properly stored
- Cookies disabled in browser
- Backend session expired

**Debug Solution**:
**File**: `/frontend/assets/js/debug.js`
```javascript
// Debug session storage
console.log('Session check:', {
    userId: localStorage.getItem('sahatak_user_id'),
    userType: localStorage.getItem('sahatak_user_type'),
    isAuthenticated: AuthGuard.isAuthenticated()
});

// Check cookie settings
console.log('Cookies enabled:', navigator.cookieEnabled);
```

#### 2. "User can access wrong dashboard"

**Possible Causes**:
- Missing `data-protect` attribute
- Incorrect user type in localStorage
- Development mode active

**Solutions**:
```html
<!-- Ensure correct protection -->
<body data-protect="patient">  <!-- Not data-protect="" -->
```

**File**: `/frontend/assets/js/debug.js`
```javascript
// Verify user type
const userType = localStorage.getItem('sahatak_user_type');
console.log('Current user type:', userType);
```

#### 3. "API calls return 401 Unauthorized"

**Possible Causes**:
- Missing `credentials: 'include'` in fetch
- Backend session expired
- User not properly logged in

**Solutions**:
**File**: `/frontend/assets/js/api-helper.js`
```javascript
// Always include credentials
fetch('/api/protected-route', {
    credentials: 'include',  // Critical!
    // ... other options
});

// Re-authenticate if needed
if (response.status === 401) {
    await AuthGuard.logout();
    // User will be redirected to login
}
```

#### 4. "Development mode not working"

**Check development mode status**:
**File**: `/frontend/assets/js/debug.js`
```javascript
console.log('Dev mode:', AuthGuard.isDevelopmentMode());
console.log('Hostname:', window.location.hostname);

// Ensure using localhost
// http://localhost:5000 ✓
// http://127.0.0.1:5000 ✓
// https://sahatak.com ✗
```

#### 5. "Session expires too quickly"

**Backend Configuration**:
**File**: `/backend/config.py`
```python
# Increase session lifetime
PERMANENT_SESSION_LIFETIME = timedelta(hours=24)  # or days=7
```

**File**: `/backend/routes/auth.py`
```python
# Enable "remember me" on login
login_user(user, remember=True, duration=timedelta(days=30))
```

---

## Best Practices for Developers

### 1. Always Use Both Layers
**Frontend** (`/frontend/assets/js/components/auth-guard.js`):
```javascript
if (!AuthGuard.isAuthenticated()) {
    AuthGuard.redirectToLogin();
    return;
}
```

**Backend** (`/backend/routes/*.py`):
```python
@login_required
def protected_route():
    pass
```

### 2. Check User Type When Needed
**Frontend** (`/frontend/assets/js/components/auth-guard.js`):
```javascript
if (!AuthGuard.hasUserType('doctor')) {
    alert('Doctor access required');
    return;
}
```

**Backend** (`/backend/routes/*.py`):
```python
if current_user.user_type != 'doctor':
    return APIResponse.forbidden()
```

### 3. Handle Session Expiry Gracefully
**File**: `/frontend/assets/js/api-helper.js`
```javascript
try {
    const response = await fetch('/api/data');
    if (response.status === 401) {
        // Session expired - logout and redirect
        await AuthGuard.logout();
    }
} catch (error) {
    console.error('Request failed:', error);
}
```

### 4. Use Descriptive Protection
```html
<!-- Clear about requirements -->
<body data-protect="doctor">  <!-- Good -->
<body data-protect="">        <!-- Unclear -->
```

### 5. Test Both Authenticated and Unauthenticated States
**File**: `/frontend/assets/js/test-auth.js`
```javascript
// Test authentication flows
async function testAuth() {
    // Test logged out state
    AuthGuard.clearAuth();
    console.assert(!AuthGuard.isAuthenticated(), 'Should not be authenticated');
    
    // Test logged in state
    localStorage.setItem('sahatak_user_id', '1');
    localStorage.setItem('sahatak_user_type', 'patient');
    console.assert(AuthGuard.isAuthenticated(), 'Should be authenticated');
    
    // Test user type
    console.assert(AuthGuard.hasUserType('patient'), 'Should be patient');
    console.assert(!AuthGuard.hasUserType('doctor'), 'Should not be doctor');
}
```

---

## Summary

The Sahatak Auth Guard system provides:

1. **Two-Layer Security**: Frontend for UX, backend for actual security
2. **Role-Based Access**: Different features for patients, doctors, and admins
3. **Automatic Protection**: Simple HTML attributes protect entire pages
4. **Session Management**: Secure cookie-based sessions with localStorage state
5. **Development Mode**: Easy testing without constant login/logout
6. **Graceful Degradation**: Handles expired sessions and network errors
7. **Cross-Browser Support**: Works on all modern browsers
8. **Mobile Compatibility**: Same security on mobile devices
9. **CSRF Protection**: Secure against cross-site attacks
10. **Audit Trail**: All authentication events are logged

Remember: **Frontend guards improve user experience, backend guards provide security**. Always implement both for complete protection of medical data.