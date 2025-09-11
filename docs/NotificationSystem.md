## Overview

The Sahatak platform implements an email-based notification system that supports multi-language notifications (Arabic/English) and handles various types of healthcare-related communications including registration confirmations, appointment reminders, and medical updates.

**Main Implementation Files**:
- **Unified Service**: `backend/services/notification_service.py` - Main notification orchestrator
- **Email Service**: `backend/services/email_service.py` - Email implementation using Flask-Mail
- **Email Templates**: `backend/templates/email/` - Multi-language email templates
- **Configuration**: `backend/.env:32-40` - Email settings

## Architecture Overview

### Notification Technology Stack
```
Notification System Stack
├── Email Service (Implemented)
│   ├── Flask-Mail for email sending
│   ├── SMTP configuration (Gmail)
│   ├── HTML email templates (Arabic/English)
│   └── Email verification workflows
├── Template System
│   ├── Jinja2 template engine
│   ├── Multi-language support (ar/en)
│   ├── RTL layout for Arabic
│   └── Responsive email designs
├── Unified Orchestrator
│   ├── NotificationService class
│   ├── Method routing
│   ├── Error handling and logging
│   └── Template management
```

---

## Core Components and Code Structure

### 1. Unified Notification Service
**Location**: `backend/services/notification_service.py:6-159`

The NotificationService class acts as the main orchestrator for all notification types:

```python
class NotificationService:
    """
    Unified notification service for handling both email and SMS notifications
    Following established patterns from the Sahatak codebase
    
    Designed for low bandwidth areas with minimal templates
    """
    
    def __init__(self):
        pass
    
    def send_registration_confirmation(
        self, 
        user_data: Dict[str, Any], 
        preferred_method: str = 'email',
        language: str = 'ar'
    ) -> bool:
        """
        Send registration confirmation via email
        
        Args:
            user_data: User registration details (must include email)
            preferred_method: 'email' (kept for compatibility)
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            email = user_data.get('email')
            if email:
                email_success = send_registration_confirmation_email(email, user_data, language)
                if email_success:
                    app_logger.info(f"Registration confirmation email sent to {email}")
                return email_success
            else:
                app_logger.warning("Email registration confirmation requested but no email provided")
                return False
            
        except Exception as e:
            app_logger.error(f"Registration confirmation notification error: {str(e)}")
            return False
```

**Key Features**:
1. **Unified Interface**: Single point for all notification types
2. **Multi-language Support**: Arabic and English templates
3. **Error Handling**: Comprehensive logging and error recovery

### 2. Appointment Notification Handler
**Location**: `backend/services/notification_service.py:49-109`

```python
def send_appointment_notification(
    self, 
    appointment_data: Dict[str, Any],
    notification_type: str,  # 'confirmation', 'reminder', 'cancellation'
    preferred_method: str = 'email',
    language: str = 'ar',
    reminder_type: str = '24h'  # Only used for reminders
) -> bool:
    """
    Send appointment notifications via email
    
    Args:
        appointment_data: Appointment details (must include patient email)
        notification_type: 'confirmation', 'reminder', 'cancellation'
        preferred_method: 'email' (kept for compatibility)
        language: Language preference ('ar' or 'en')
        reminder_type: Type of reminder ('24h', '1h', 'now') - only for reminders
        
    Returns:
        bool: True if notification sent successfully
    """
    try:
        # Get recipient contact info
        recipient_email = appointment_data.get('patient_email') or appointment_data.get('email')
        
        if recipient_email:
            email_success = self._send_appointment_email(
                recipient_email, appointment_data, notification_type, language, reminder_type
            )
            return email_success
        else:
            app_logger.warning(f"No email provided for appointment {notification_type}")
            return False
        
    except Exception as e:
        app_logger.error(f"Appointment notification error: {str(e)}")
        return False

def _send_appointment_email(
    self, 
    recipient_email: str, 
    appointment_data: Dict[str, Any], 
    notification_type: str, 
    language: str,
    reminder_type: str
) -> bool:
    """Send appointment email based on type"""
    try:
        if notification_type == 'confirmation':
            return send_appointment_confirmation(recipient_email, appointment_data, language)
        elif notification_type == 'reminder':
            return send_appointment_reminder(recipient_email, appointment_data, language, reminder_type)
        elif notification_type == 'cancellation':
            return send_appointment_cancellation(recipient_email, appointment_data, language)
        else:
            app_logger.error(f"Unknown email notification type: {notification_type}")
            return False
            
    except Exception as e:
        app_logger.error(f"Appointment email error: {str(e)}")
        return False
```

**Notification Types Supported**:
1. **Confirmation**: Sent when appointment is booked
2. **Reminder**: Multiple types (24h, 1h, now)
3. **Cancellation**: Sent when appointment is cancelled

---

## Email Service Implementation

### 1. EmailService Class Configuration
**Location**: `backend/services/email_service.py:8-54`

```python
class EmailService:
    """
    Email service for sending appointment reminders and notifications
    Following established patterns from the Sahatak codebase
    """
    
    def __init__(self, app=None):
        self.mail = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize email service with Flask app"""
        try:
            # Configure Flask-Mail using existing .env variables
            app.config.setdefault('MAIL_SERVER', os.getenv('MAIL_SERVER', 'smtp.gmail.com'))
            app.config.setdefault('MAIL_PORT', int(os.getenv('MAIL_PORT', 587)))
            app.config.setdefault('MAIL_USE_TLS', True)
            app.config.setdefault('MAIL_USE_SSL', False)
            app.config.setdefault('MAIL_USERNAME', os.getenv('MAIL_USERNAME'))  # sahatak.sudan@gmail.com
            app.config.setdefault('MAIL_PASSWORD', os.getenv('MAIL_PASSWORD'))
            app.config.setdefault('MAIL_DEFAULT_SENDER', os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME')))
            
            self.mail = Mail(app)
            app_logger.info("Email service initialized successfully")
            
        except Exception as e:
            app_logger.error(f"Failed to initialize email service: {str(e)}")
            self.mail = None
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        if self.mail is None:
            app_logger.error("Email service not initialized - Mail object is None")
            return False
        
        if not current_app.config.get('MAIL_USERNAME'):
            app_logger.error("Email service not configured - MAIL_USERNAME is missing")
            return False
        
        if not current_app.config.get('MAIL_PASSWORD'):
            app_logger.error("Email service not configured - MAIL_PASSWORD is missing")
            return False
        
        # Log successful configuration (but don't expose sensitive data)
        app_logger.info(f"Email service configured with username: {current_app.config.get('MAIL_USERNAME')}")
        return True
```

**Configuration Features**:
1. **Environment-Based Setup**: All settings from .env file
2. **Configuration Validation**: Checks for required credentials
3. **Error Recovery**: Graceful handling of missing configuration
4. **Security Logging**: Logs success without exposing passwords

### 2. Appointment Reminder Implementation
**Location**: `backend/services/email_service.py:56-100`

```python
def send_appointment_reminder(
    self, 
    recipient_email: str, 
    appointment_data: Dict[str, Any], 
    language: str = 'ar',
    reminder_type: str = '24h'
) -> bool:
    """
    Send appointment reminder email
    
    Args:
        recipient_email: Email address to send to
        appointment_data: Appointment details
        language: Language preference ('ar' or 'en')
        reminder_type: Type of reminder ('24h', '1h', 'now')
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        if not self.is_configured():
            app_logger.warning("Email service not configured, skipping email")
            return False
        
        # Prepare email data
        subject = self._get_reminder_subject(reminder_type, language)
        template_name = f'email/{language}/appointment_reminder.html'
        
        # Enhanced appointment data for template
        template_data = {
            **appointment_data,
            'reminder_type': reminder_type,
            'language': language,
            'app_name': 'صحتك' if language == 'ar' else 'Sahatak',
            'current_year': datetime.now().year
        }
        
        # Create and send message
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=render_template(template_name, **template_data),
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
```

### 3. Email Verification Implementation
**Location**: `backend/services/email_service.py:250-299`

```python
def send_email_confirmation(
    self, 
    recipient_email: str, 
    user_data: Dict[str, Any], 
    language: str = 'ar'
) -> bool:
    """
    Send email confirmation email with verification link
    
    Args:
        recipient_email: Email address to send to
        user_data: User registration details including verification_token
        language: Language preference ('ar' or 'en')
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        if not self.is_configured():
            app_logger.warning("Email service not configured, skipping email")
            return False
        
        subject = 'تأكيد البريد الإلكتروني - صحتك' if language == 'ar' else 'Email Confirmation - Sahatak'
        template_name = f'email/{language}/email_confirmation.html'
        
        # Create verification URL
        verification_url = f"{current_app.config.get('FRONTEND_URL', 'https://hello-50.github.io/Sahatak')}/frontend/pages/verify-email.html?token={user_data['verification_token']}"
        
        template_data = {
            **user_data,
            'verification_url': verification_url,
            'language': language,
            'app_name': 'صحتك' if language == 'ar' else 'Sahatak',
            'current_year': datetime.now().year
        }
        
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=render_template(template_name, **template_data),
            sender=current_app.config['MAIL_DEFAULT_SENDER']
        )
        
        self.mail.send(msg)
        app_logger.info(f"Email confirmation sent to {recipient_email}")
        return True
        
    except Exception as e:
        # Log detailed error information for debugging
        error_type = type(e).__name__
```

**Email Verification Features**:
1. **Verification URL Generation**: Creates secure verification links
2. **Token-Based Security**: Uses verification tokens for security
3. **Frontend URL Integration**: Links to proper frontend pages
4. **Template-Based Design**: Uses HTML templates for styling

---

## Email Templates System

### 1. Arabic Email Template Structure
**Location**: `backend/templates/email/ar/email_confirmation.html:1-39`

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تأكيد البريد الإلكتروني - {{ app_name }}</title>
</head>
<body style="font-family:Arial;direction:rtl;margin:0;padding:20px;background:#f9f9f9">
    <div style="max-width:500px;margin:0 auto;background:white;padding:20px;border:1px solid #ddd">
        
        <h1 style="color:#2c5aa0;text-align:center;margin-bottom:20px">{{ app_name }}</h1>
        
        <h2>مرحباً {{ full_name }}!</h2>
        
        <p>شكراً لانضمامك إلى منصة {{ app_name }}.</p>
        
        <p><strong>نوع الحساب:</strong> {% if user_type == 'patient' %}مريض{% else %}طبيب{% endif %}</p>

        <p>لتفعيل حسابك، انقر على الرابط التالي:</p>

        <div style="text-align:center;margin:20px 0">
            <a href="{{ verification_url }}" style="background:#2c5aa0;color:white;padding:12px 25px;text-decoration:none;border-radius:5px;display:inline-block">
                تأكيد البريد الإلكتروني
            </a>
        </div>

        <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.</p>

        <p>إذا لم تستطع النقر على الزر، انسخ هذا الرابط:</p>
        <p style="word-break:break-all;font-size:12px;background:#f5f5f5;padding:10px">{{ verification_url }}</p>

        <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
        
        <p style="font-size:12px;color:#666;text-align:center">
            فريق {{ app_name }}<br>
            &copy; {{ current_year }} جميع الحقوق محفوظة
        </p>
    </div>
</body>
</html>
```

**Template Features**:
1. **RTL Support**: Right-to-left layout for Arabic
2. **Responsive Design**: Works on mobile and desktop
3. **Variable Substitution**: Jinja2 template variables
4. **Branded Styling**: Consistent with platform colors
5. **Accessibility**: Fallback URL for button click issues

### 2. Template Variable System

**Common Template Variables Available**:
```python
# User-related variables
{
    'full_name': 'اسم المستخدم',
    'user_type': 'patient|doctor', 
    'email': 'user@example.com',
    'verification_token': 'secure_token_string',
    'verification_url': 'https://domain.com/verify?token=...'
}

# Application variables
{
    'app_name': 'صحتك' if language == 'ar' else 'Sahatak',
    'language': 'ar|en',
    'current_year': 2024
}

# Appointment-specific variables
{
    'appointment_date': '2024-01-15',
    'appointment_time': '10:00 AM',
    'doctor_name': 'د. أحمد محمد',
    'patient_name': 'محمد علي',
    'reminder_type': '24h|1h|now'
}
```

---

## Notification Triggering in Authentication Flow

### 1. Registration Email Trigger
**Location**: `backend/routes/auth.py:347-363`

```python
# In the registration endpoint
try:
    email_success = email_service.send_email_confirmation(
        email,
        {
            'full_name': data['full_name'],
            'user_type': data['user_type'],
            'verification_token': user.verification_token
        },
        language='ar'  # Default to Arabic
    )
    
    if not email_success:
        auth_logger.warning(f"Failed to send email confirmation to {email}")
    
except Exception as e:
    auth_logger.error(f"Error sending email confirmation: {str(e)}")
```

### 2. Email Verification Resend
**Location**: `backend/routes/auth.py:759-809`

```python
@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    """Resend email verification"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email or not validate_email(email):
            return APIResponse.validation_error(
                field='email',
                message='Valid email address is required'
            )
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        if not user:
            return APIResponse.not_found(message='User not found')
        
        if user.is_verified:
            return APIResponse.error(
                message='Email is already verified',
                status_code=400
            )
        
        # Generate new verification token
        user.verification_token = user.generate_verification_token()
        db.session.commit()
        
        # Send verification email
        try:
            email_success = email_service.send_email_confirmation(
                email,
                {
                    'full_name': user.full_name,
                    'user_type': user.user_type,
                    'verification_token': user.verification_token
                },
                language='ar'
            )
            
            if email_success:
                return APIResponse.success(
                    message='Verification email sent successfully'
                )
            else:
                auth_logger.warning(f"Failed to resend verification email to {email}")
                
        except Exception as e:
            auth_logger.error(f"Error resending verification email: {str(e)}")
```

**Email Resend Features**:
1. **Token Regeneration**: Creates new verification token
2. **Duplicate Prevention**: Checks if already verified
3. **Error Recovery**: Handles email sending failures
4. **User Feedback**: Returns appropriate API responses

---

## Error Handling and Logging

### 1. Email Service Error Handling
```python
# Comprehensive error handling pattern used throughout
try:
    self.mail.send(msg)
    app_logger.info(f"Email confirmation sent to {recipient_email}")
    return True
    
except Exception as e:
    # Log detailed error information for debugging
    error_type = type(e).__name__
    app_logger.error(f"Failed to send email confirmation to {recipient_email}: {error_type} - {str(e)}")
    return False
```

### 2. Configuration Validation
```python
def is_configured(self) -> bool:
    """Check if email service is properly configured"""
    if self.mail is None:
        app_logger.error("Email service not initialized - Mail object is None")
        return False
    
    if not current_app.config.get('MAIL_USERNAME'):
        app_logger.error("Email service not configured - MAIL_USERNAME is missing")
        return False
    
    if not current_app.config.get('MAIL_PASSWORD'):
        app_logger.error("Email service not configured - MAIL_PASSWORD is missing")
        return False
    
    return True
```

### 3. Graceful Degradation
When email service is not configured, the system continues to function:

```python
if not self.is_configured():
    app_logger.warning("Email service not configured, skipping email")
    return False
```

This ensures the platform doesn't crash if email credentials are missing.

---

## Environment Configuration

### Required Email Configuration
**File**: `backend/.env:28-40`

```bash
# EMAIL CONFIGURATION
# SMTP Settings for Email Notifications
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=sahatak.sudan@gmail.com
MAIL_PASSWORD=xrqr xoic qjbx yuxd
MAIL_DEFAULT_SENDER=noreply@sahatak.com

# Email Features
EMAIL_NOTIFICATIONS_ENABLED=true
```

### Frontend URL Configuration
**File**: `backend/.env:127-128`

```bash
# Frontend URL for email verification links
FRONTEND_URL=https://HELLO-50.github.io/Sahatak
```

**Important**: The FRONTEND_URL is used to generate verification links in emails.

---

## Notification Flow Diagrams

### Email Verification Flow
```
User Registration
├── User submits registration form
├── Backend creates user account
├── Generate verification token
├── Trigger email confirmation
│   ├── Load Arabic/English template
│   ├── Insert user data and verification URL
│   ├── Send via SMTP (Gmail)
│   └── Log success/failure
├── User receives email
├── User clicks verification link
├── Frontend handles verification
└── Account activated
```

### Appointment Notification Flow
```
Appointment Event (Book/Remind/Cancel)
├── Appointment service triggers notification
├── NotificationService.send_appointment_notification()
├── Determine notification type
│   ├── Confirmation: Welcome + appointment details
│   ├── Reminder: Upcoming appointment (24h/1h/now)
│   └── Cancellation: Appointment cancelled notice
├── Select template based on language
├── Render template with appointment data
├── Send via EmailService
├── Log notification result
└── Return success/failure to caller
```

## Summary

The Sahatak notification system provides a robust, multi-language email notification platform:

### Key Features:
1. **Unified Service**: Single NotificationService for all notification types
2. **Multi-language Support**: Arabic and English templates with RTL support
3. **Email Implementation**: Complete Flask-Mail integration with Gmail SMTP
4. **Template System**: Jinja2-based HTML templates with variable substitution
5. **Error Handling**: Comprehensive logging and graceful degradation
6. **Medical Context**: Healthcare-specific notification types

### File References:
- **Main Service**: `backend/services/notification_service.py`
- **Email Implementation**: `backend/services/email_service.py`
- **Arabic Template**: `backend/templates/email/ar/email_confirmation.html`
- **English Template**: `backend/templates/email/en/email_confirmation.html`
- **Environment Config**: `backend/.env:28-40`
- **Auth Integration**: `backend/routes/auth.py:347-363`

For additional information, refer to:
- [Flask-Mail Documentation](https://flask-mail.readthedocs.io/)
- [Jinja2 Template Documentation](https://jinja.palletsprojects.com/)