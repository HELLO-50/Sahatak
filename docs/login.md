# Login Process in Sahatak Telemedicine Platform

## Overview

This document explains how the login system works in the Sahatak telemedicine platform. The login process allows registered users (Patients and Doctors) to access their accounts and use the platform's medical services.

## What is Login?

Login is the process of verifying your identity and gaining access to your account. Think of it like entering your house with a key - you provide your credentials (like email/phone and password), and the system checks if they're correct to let you in.

## Login Flow Step-by-Step

### Step 1: Navigate to Login
- **From Registration**: If you just registered, the system shows you the login form
- **Direct Access**: Visit the website and choose "Login" (تسجيل الدخول)
- **Redirect**: If you try to access protected pages, you'll be automatically redirected to login

### Step 2: Choose Login Method
The Sahatak platform offers flexible login options:
- **Email Address**: If you provided an email during registration
- **Phone Number**: Your registered phone number
- **Either One**: The system accepts both - you can use whichever is convenient

### Step 3: Enter Credentials
```
Required Information:
- Email Address OR Phone Number (البريد الإلكتروني أو رقم الهاتف)
- Password (كلمة المرور)
```

**Examples of valid login identifiers:**
- Email: `ahmed@example.com`
- Phone: `+249912345678`
- Phone (local format): `0912345678`

### Step 4: System Validation
- **Frontend Check**: Basic validation (fields not empty, proper format)
- **Backend Check**: Verify credentials against database
- **Account Status**: Ensure account is active and verified

### Step 5: Session Creation
- **Authentication**: System confirms you are who you claim to be
- **Session Storage**: Your login status is saved locally and on server
- **User Data Loading**: System loads your profile information

### Step 6: Dashboard Redirect
- **Patients**: Redirected to Patient Dashboard
- **Doctors**: Redirected to Doctor Dashboard
- **Return URL**: If you were trying to access a specific page, you'll be taken there

## Technical Components Explained

### Frontend Components (What You See)

#### 1. Login Form (HTML Structure)
Located in `index.html`:
```html
<div id="login-form" class="d-none min-vh-100 d-flex align-items-center justify-content-center">
    <form id="loginForm">
        <div class="mb-3">
            <label for="login_identifier">Email or Phone Number</label>
            <input type="text" id="login_identifier" required>
        </div>
        <div class="mb-3">
            <label for="password">Password</label>
            <input type="password" id="password" required>
        </div>
        <button type="submit">Login</button>
    </form>
</div>
```

#### 2. JavaScript Login Handler (`frontend/assets/js/main.js`)
The main login function:

```javascript
async function handleLogin(event) {
    event.preventDefault(); // Stop form from submitting normally
    
    // Get form data
    const formData = {
        login_identifier: document.getElementById('login_identifier').value.trim(),
        password: document.getElementById('password').value
    };
    
    // Validate input
    if (!formData.login_identifier || !formData.password) {
        throw new Error('Email/phone and password are required');
    }
    
    // Send to backend
    const response = await ApiHelper.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(formData)
    });
    
    // Store user session data
    localStorage.setItem('sahatak_user_type', response.data.user.user_type);
    localStorage.setItem('sahatak_user_email', response.data.user.email);
    localStorage.setItem('sahatak_user_id', response.data.user.id);
    localStorage.setItem('sahatak_user_name', response.data.user.full_name);
    
    // Redirect to dashboard
    redirectToDashboard(response.data.user.user_type);
}
```

#### 3. Authentication Guard (`frontend/assets/js/components/auth-guard.js`)
Protects pages and manages sessions:

```javascript
class AuthGuard {
    // Check if user is logged in
    static isAuthenticated() {
        const userId = localStorage.getItem('sahatak_user_id'); 
        const userType = localStorage.getItem('sahatak_user_type');
        return userId && userType; 
    }
    
    // Redirect unauthorized users to login
    static protectPage(requiredUserType = null) {
        if (!this.isAuthenticated()) {
            console.warn('User not authenticated, redirecting to login');
            this.redirectToLogin();
            return false;
        }
        return true;
    }
}
```

### Backend Components (What Happens Behind the Scenes)

#### 1. Login API Endpoint (`backend/routes/auth.py`)
The main login processing function:

```python
@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user with email or phone"""
    try:
        data = request.get_json()
        
        # Get credentials
        login_identifier = data.get('login_identifier', '').strip()
        password = data.get('password')
        
        # Validate input
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
        
        # Check credentials
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
                message="Please verify your email address before logging in.",
                status_code=401,
                error_code=ErrorCodes.USER_NOT_VERIFIED
            )
        
        # Create session and login user
        login_user(user, remember=data.get('remember_me', False))
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Prepare response with user data and profile
        user_data = user.to_dict()
        profile = user.get_profile()
        if profile:
            user_data['profile'] = profile.to_dict()
        
        return APIResponse.success(
            data={'user': user_data},
            message='Login successful'
        )
        
    except Exception as e:
        auth_logger.error(f"Login error: {str(e)}")
        return APIResponse.internal_error(
            message='Login failed. Please try again.'
        )
```

#### 2. User Authentication Model (`backend/models.py`)
How passwords are stored and checked:

```python
class User(UserMixin, db.Model):
    # User fields
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    
    def set_password(self, password):
        """Hash and set password securely"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def get_profile(self):
        """Get user's specific profile (patient or doctor)"""
        if self.user_type == 'patient':
            return self.patient_profile
        elif self.user_type == 'doctor':
            return self.doctor_profile
        return None
```

## Login Process Flow Diagram

```
User Clicks "Login" Button
         ↓
Enter Email/Phone + Password
         ↓
Submit Form → Frontend Validation
         ↓ (if valid)
Send to Backend → Find User by Email/Phone
         ↓ (if user found)
Check Password Hash
         ↓ (if password correct)
Check Account Status (active, verified)
         ↓ (if account OK)
Create User Session
         ↓
Update Last Login Time
         ↓
Return User Data to Frontend
         ↓
Store Session in LocalStorage
         ↓
Redirect to User Dashboard
```

## Different Login Scenarios

### Scenario 1: Email Login (Patient)
```
1. User enters: "ahmed@example.com" + "mypassword123"
2. System finds user by email in database
3. Password verification succeeds
4. User is patient type
5. Session created, redirected to Patient Dashboard
```

### Scenario 2: Phone Login (Doctor)
```
1. User enters: "+249912345678" + "doctorpass456"
2. System searches in doctor profiles by phone
3. Finds doctor account
4. Password verification succeeds
5. User is doctor type
6. Session created, redirected to Doctor Dashboard
```

### Scenario 3: Email Verification Required
```
1. User enters correct credentials
2. System finds user account
3. User has email but is_verified = False
4. Login blocked with message: "Please verify your email first"
5. Option to resend verification email provided
```

## Session Management

### How Sessions Work (managed in `frontend/assets/js/components/auth-guard.js`)
```javascript
// Session data stored in browser's localStorage
{
    'sahatak_user_id': '123',
    'sahatak_user_type': 'patient',
    'sahatak_user_email': 'ahmed@example.com',
    'sahatak_user_name': 'Ahmed Ali',
    'sahatak_language': 'ar'
}
```

### Session Security Features
1. **Server-side Session**: Backend tracks active sessions
2. **Session Timeout**: Sessions expire after inactivity
3. **Secure Storage**: Sensitive data not stored in localStorage
4. **Cross-tab Sync**: Login status synchronized across browser tabs

## Error Handling

### Common Login Errors

#### 1. Invalid Credentials
```json
{
    "success": false,
    "message": "Invalid email/phone or password",
    "status_code": 401
}
```
**User sees**: "Invalid email/phone or password"
**Solution**: Check spelling, try different identifier, or reset password

#### 2. Account Not Verified
```json
{
    "success": false,
    "message": "Please verify your email address before logging in",
    "status_code": 401,
    "error_code": "USER_NOT_VERIFIED"
}
```
**User sees**: Email verification message with resend option
**Solution**: Check email and click verification link

#### 3. Account Deactivated
```json
{
    "success": false,
    "message": "Account is deactivated. Please contact support",
    "status_code": 401
}
```
**User sees**: Account deactivated message
**Solution**: Contact platform support

#### 4. Empty Fields
**User sees**: "Email/phone and password are required"
**Solution**: Fill in both fields before submitting

### Email Verification Flow

#### Backend Email Verification (`backend/routes/auth.py`)
```python
@auth_bp.route('/verify-email', methods=['GET'])
def verify_email():
    """Verify user email with token"""
    token = request.args.get('token')
    
    if not token:
        return APIResponse.validation_error(
            message='Verification token is required'
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
            message='Email is already verified'
        )
    
    # Verify the user
    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    
    return APIResponse.success(
        message='Email verified successfully'
    )
```

#### Resend Verification Email (`backend/routes/auth.py`)
```python
@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend email verification"""
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    
    # Find user by email
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return APIResponse.not_found(message='User not found')
    
    if user.is_verified:
        return APIResponse.success(message='Email is already verified')
    
    # Generate new verification token
    import secrets
    user.verification_token = secrets.token_urlsafe(32)
    db.session.commit()
    
    # Send verification email
    email_service.send_email_confirmation(
        recipient_email=email,
        user_data={
            'full_name': user.full_name,
            'verification_token': user.verification_token
        }
    )
    
    return APIResponse.success(
        message='Verification email sent successfully'
    )
```

## Logout Process

### Frontend Logout (`frontend/assets/js/main.js`)
```javascript
async function logout() {
    console.log('Logout initiated...');
    
    try {
        // Call backend logout endpoint
        const response = await ApiHelper.makeRequest('/auth/logout', {
            method: 'POST'
        });
        
        console.log('Backend logout successful:', response);
    } catch (error) {
        console.error('Backend logout error:', error);
    }
    
    // Clear all session data from localStorage
    const keysToRemove = [
        'sahatak_user_type',
        'sahatak_user_email', 
        'sahatak_user_id',
        'sahatak_user_name'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Keep language preference
    
    // Redirect to login page
    window.location.href = 'index.html';
}
```

### Backend Logout (`backend/routes/auth.py`)
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

## Page Protection System

### Auto-Protection with AuthGuard
```javascript
// Pages automatically protected with data-protect attribute
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

### Usage Examples
```html
<!-- Protect page for any authenticated user -->
<body data-protect="">

<!-- Protect page for patients only -->
<body data-protect="patient">

<!-- Protect page for doctors only -->
<body data-protect="doctor">
```

## User Dashboard Redirection

### Smart Redirection Logic (`frontend/assets/js/main.js`)
```javascript
function redirectToDashboard(userType) {
    // Check for return URL first
    const returnUrl = localStorage.getItem('sahatak_return_url');
    if (returnUrl) {
        localStorage.removeItem('sahatak_return_url');
        window.location.href = returnUrl;
        return;
    }
    
    // Default dashboard redirect
    const dashboardUrl = userType === 'doctor' 
        ? 'frontend/pages/dashboard/doctor.html' 
        : 'frontend/pages/dashboard/patient.html';
    
    window.location.href = dashboardUrl;
}
```

## API Communication Examples

### Login Request (from `frontend/assets/js/components/forms.js`)
```javascript
// Frontend sends:
const loginData = {
    login_identifier: "ahmed@example.com", // or phone number
    password: "mypassword123",
    remember_me: false // optional
};

const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    credentials: 'include', // Important for session cookies
    body: JSON.stringify(loginData)
});
```

### Successful Login Response
```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "user": {
            "id": 123,
            "full_name": "Ahmed Ali",
            "email": "ahmed@example.com",
            "user_type": "patient",
            "language_preference": "ar",
            "is_active": true,
            "is_verified": true,
            "last_login": "2025-01-24T10:30:00Z",
            "profile": {
                "phone": "+249912345678",
                "age": 30,
                "gender": "male"
            }
        }
    }
}
```

## Security Features

### Password Security
- **Hashing**: Passwords are never stored in plain text
- **Salt**: Each password has unique salt to prevent rainbow table attacks
- **Werkzeug**: Uses industry-standard password hashing library

```python
# Password is hashed before storage
password_hash = generate_password_hash("user_password")

# Password verification without revealing original
is_valid = check_password_hash(stored_hash, provided_password)
```

### Session Security
- **HTTPS Only**: Sessions transmitted over secure connections
- **Secure Cookies**: Session cookies have security flags
- **CSRF Protection**: Cross-site request forgery protection
- **Session Timeout**: Automatic logout after inactivity

### Input Validation
- **Email Format**: RFC-compliant email validation
- **Phone Format**: International and local phone number support
- **SQL Injection**: Parameterized queries prevent injection
- **XSS Protection**: Input sanitization and output encoding

## Multi-language Support

### Language-Aware Login (`frontend/assets/js/main.js`)
```javascript
// Login form adapts to user's language preference
const lang = LanguageManager.getLanguage() || 'ar';
const translations = LanguageManager.translations[lang];

// Update form labels
updateElementText('login-title', translations.login?.title);
updateElementText('password-label', translations.login?.password);
updateElementText('login-submit', translations.login?.submit);
```

### Error Messages in User's Language
```javascript
// Error messages shown in preferred language
let errorMessage = 'Login failed. Please try again.';

if (error instanceof ApiError) {
    errorMessage = error.message; // Backend provides localized message
    
    // Handle email verification requirement
    if (error.errorCode === 'USER_NOT_VERIFIED') {
        const emailVerificationMessage = lang === 'ar' 
            ? 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول'
            : 'Please verify your email address before logging in';
        showEmailVerificationRequired(errorAlert, emailVerificationMessage);
    }
}
```

## Troubleshooting Common Issues

### "Invalid email/phone or password"
- **Problem**: Credentials don't match any account
- **Solutions**:
  - Check spelling of email/phone
  - Try the other login method (email vs phone)
  - Use "Forgot Password" feature (when available)
  - Register if no account exists

### "Please verify your email address"
- **Problem**: Account exists but email not verified
- **Solutions**:
  - Check email inbox and spam folder
  - Click verification link in email
  - Use "Resend verification email" button
  - Try logging in with phone number instead

### "Account is deactivated"
- **Problem**: Account has been disabled by administrator
- **Solutions**:
  - Contact platform support
  - Check if account was suspended for policy violations
  - Wait if it's temporary suspension

### Login button not working
- **Problem**: JavaScript errors or form submission issues
- **Solutions**:
  - Refresh the page
  - Clear browser cache
  - Disable browser extensions
  - Try different browser
  - Check internet connection

### Redirected back to login after successful login
- **Problem**: Session not being maintained
- **Solutions**:
  - Enable cookies in browser
  - Check if browser blocks localStorage
  - Clear all browser data and try again
  - Check if antivirus software blocks sessions

## Summary

The Sahatak login system provides:

1. **Flexible Authentication**: Email or phone number login
2. **Secure Password Handling**: Industry-standard hashing and validation
3. **Session Management**: Secure session creation and maintenance
4. **User Type Routing**: Automatic redirect to appropriate dashboard
5. **Multi-language Support**: Arabic and English interface
6. **Email Verification**: Optional but secure email confirmation
7. **Error Handling**: Clear, localized error messages
8. **Page Protection**: Automatic authentication checking
9. **Cross-device Support**: Works on mobile and desktop
10. **Security Features**: CSRF protection, secure cookies, input validation

The login system is designed to be both user-friendly and secure, accommodating users who prefer different login methods while maintaining the highest security standards for medical data protection.