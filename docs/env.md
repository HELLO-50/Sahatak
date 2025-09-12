# Environment Configuration (.env) - Sahatak Platform

## Overview

Environment variables are a fundamental concept in application development that allow you to configure your application without hardcoding sensitive information like passwords, database URLs, or API keys directly into your source code. The Sahatak platform uses a `.env` file to manage all configuration settings in one centralized location.

## What is a .env file?

A `.env` file (short for "environment") is a plain text file that contains key-value pairs defining environment variables for your application. Think of it as a configuration file that:

- **Keeps secrets safe**: Stores sensitive data like passwords and API keys outside of your code
- **Enables different environments**: Allows different settings for development, testing, and production
- **Simplifies deployment**: Makes it easy to change settings without modifying code
- **Prevents accidental commits**: Sensitive data stays out of version control (git)

## How .env Works in Sahatak

### File Location
**Location**: `backend/.env`

The environment file is located in the backend directory and contains all configuration settings for the Sahatak telemedicine platform.

### Loading Process
**Location**: `backend/app.py:9-12`

The `.env` file is loaded when the application starts:

```python
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
```

**What happens**:
1. The `python-dotenv` library reads the `.env` file
2. All key-value pairs are loaded into the system's environment variables
3. These variables become accessible throughout the application using `os.getenv()`

---

## Environment Configuration Structure

The Sahatak `.env` file is organized into logical sections for easier management:

### 1. Core Application Settings
**Lines**: 6-19

```bash
# Flask Environment (development, testing, production)
FLASK_ENV=development

# Application Configuration
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key

# Server Configuration
PORT=5000
```

**Usage in Code**:
- **`backend/app.py:18`**: `env = os.getenv('FLASK_ENV', 'development')`
- **`backend/config.py:12`**: `SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')`
- **`backend/app.py:135`**: `port = int(os.getenv('PORT', 5000))`

**Purpose**:
- **FLASK_ENV**: Determines whether app runs in development, testing, or production mode
- **SECRET_KEY**: Used for session management and security features
- **JWT_SECRET_KEY**: Signs JWT tokens for API authentication
- **PORT**: Specifies which port the server runs on

### 2. Database Configuration
**Lines**: 21-26

```bash
# Database URL
DATABASE_URL=mysql+pymysql://sahatak:HELLO-50%4030@sahatak.mysql.pythonanywhere-services.com/sahatak$sahatak_db
```

**Usage in Code**:
- **`backend/config.py:70`**: `SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///sahatak_dev.db')`
- **`backend/config.py:80`**: `SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')`
- **`backend/app.py:31`**: `app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', app.config['SQLALCHEMY_DATABASE_URI'])`

**Purpose**:
- Defines the database connection string
- Different databases can be used for development (SQLite) vs production (MySQL)
- Keeps database credentials secure and separate from code

### 3. Email Configuration
**Lines**: 28-40

```bash
# SMTP Settings for Email Notifications
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=sahatak.sudan@gmail.com
MAIL_PASSWORD=xrqr xoic qjbx yuxd
MAIL_DEFAULT_SENDER=noreply@sahatak.com

# Email Features
EMAIL_NOTIFICATIONS_ENABLED=true
```

**Usage in Code**:
- **`backend/config.py:16-21`**: Mail configuration loaded from environment
- **`backend/services/email_service.py:34-40`**: Email service initialization

```python
# Example from config.py
MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
MAIL_USERNAME = os.getenv('MAIL_USERNAME')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@sahatak.com')
```

**Purpose**:
- Configures email sending for account verification, notifications, and password resets
- Uses Gmail SMTP server for reliable email delivery
- Sensitive email credentials kept secure

### 4. SMS Configuration
**Lines**: 42-52

```bash
# SMS Provider Settings (AfricasTalking)
SMS_PROVIDER=africastalking
SMS_USERNAME=sandbox
SMS_API_KEY=atsk_577962867af6cb3f52585283da7f114372b7524fda898c5c7445189fdc90ad2d2b8b3962
SMS_SENDER_ID=SAHATAK
SMS_API_URL=https://api.sandbox.africastalking.com/version1/messaging
SMS_NOTIFICATIONS_ENABLED=true
```

**Usage in Code**:
- Referenced in SMS service implementations for appointment reminders
- API credentials for AfricasTalking SMS provider

**Purpose**:
- Enables SMS notifications for appointment reminders
- Configures AfricasTalking API for SMS delivery in Sudan
- Sandbox mode for development, production API for live system

### 5. Security & Validation Settings
**Lines**: 54-76

```bash
# Password Requirements
PASSWORD_MIN_LENGTH=6
PASSWORD_MAX_LENGTH=128

# Phone Number Validation
PHONE_MIN_LENGTH=10
PHONE_MAX_LENGTH=15

# Authentication Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# Session Management
SESSION_TIMEOUT_MINUTES=15
AUTO_LOGOUT_WARNING_MINUTES=2
```

**Usage in Code**:
- **`backend/config.py:41-57`**: Validation settings configuration

```python
# Example from config.py
PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 6))
PASSWORD_MAX_LENGTH = int(os.getenv('PASSWORD_MAX_LENGTH', 128))
PHONE_MIN_LENGTH = int(os.getenv('PHONE_MIN_LENGTH', 10))
PHONE_MAX_LENGTH = int(os.getenv('PHONE_MAX_LENGTH', 15))
MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))
LOCKOUT_DURATION_MINUTES = int(os.getenv('LOCKOUT_DURATION_MINUTES', 30))
```

**Purpose**:
- Defines security policies for user registration and authentication
- Configurable validation rules for different deployment scenarios
- Session timeout settings for user security

### 6. File Upload Settings
**Lines**: 78-85

```bash
# File Upload Configuration
UPLOAD_FOLDER=static/uploads
MAX_CONTENT_LENGTH=16777216
ALLOWED_EXTENSIONS=png,jpg,jpeg,gif,pdf,doc,docx
```

**Usage in Code**:
- **`backend/config.py:27-30`**: File upload configuration

```python
MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB default
UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads'))
ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif,pdf,doc,docx').split(','))
```

**Purpose**:
- Controls file upload behavior for medical documents and images
- Security limits on file size and types
- Configurable upload directory

### 7. Video Conferencing Configuration
**Lines**: 141-204

```bash
# Jitsi Meet Configuration for Video Consultations
JITSI_DOMAIN=meet.jit.si
JITSI_BACKUP_DOMAINS=meet.ffmuc.net,jitsi.riot.im
JITSI_APP_ID=sahatak_telemedicine

# Video Call Settings
VIDEO_CALL_MAX_DURATION_MINUTES=60
VIDEO_CALL_RECORDING_ENABLED=false
JITSI_ENABLE_CHAT=true
JITSI_ENABLE_SCREEN_SHARING=true
```

**Usage in Code**:
- **`backend/routes/appointments.py:886-889`**: Video call configuration

```python
# Get domain and other settings from environment
jitsi_domain = os.getenv('JITSI_DOMAIN', 'meet.jit.si')
app_id = os.getenv('JITSI_APP_ID', '')
room_prefix = os.getenv('JITSI_ROOM_PREFIX', 'sahatak_consultation_')
max_duration_minutes = int(os.getenv('VIDEO_CALL_MAX_DURATION_MINUTES', '60'))
```

**Purpose**:
- Configures Jitsi Meet integration for video consultations
- Extensive customization options for video call features
- Security and privacy settings for medical consultations

### 8. AI Chatbot Settings
**Lines**: 206-215

```bash
# AI Chatbot Settings (Free Hugging Face Models)
HUGGINGFACE_MODEL_NAME=microsoft/DialoGPT-medium
MEDICAL_MODEL_NAME=emilyalsentzer/Bio_ClinicalBERT
LOCAL_MODEL_PATH=models/
AI_MAX_LENGTH=100
AI_TEMPERATURE=0.7
```

**Usage in Code**:
- **`backend/config.py:72-77`**: AI model configuration

```python
HUGGINGFACE_MODEL_NAME = os.getenv('HUGGINGFACE_MODEL_NAME', 'microsoft/DialoGPT-medium')
MEDICAL_MODEL_NAME = os.getenv('MEDICAL_MODEL_NAME', 'emilyalsentzer/Bio_ClinicalBERT')
LOCAL_MODEL_PATH = os.getenv('LOCAL_MODEL_PATH', 'models/')
AI_MAX_LENGTH = int(os.getenv('AI_MAX_LENGTH', 100))
AI_TEMPERATURE = float(os.getenv('AI_TEMPERATURE', 0.7))
```

**Purpose**:
- Configures AI models for medical chatbot functionality
- Uses free Hugging Face models to avoid API costs
- Adjustable AI behavior parameters

### 9. Feature Flags & Maintenance
**Lines**: 217-233

```bash
# Maintenance Mode
MAINTENANCE_MODE=false

# User Registration
REGISTRATION_ENABLED=true

# Advanced Features
ENABLE_VIDEO_CALLS=true
ENABLE_PRESCRIPTION_MODULE=true
ENABLE_AI_ASSESSMENT=true
ENABLE_SMS_REMINDERS=true
```

**Purpose**:
- Controls which features are active in the platform
- Allows enabling/disabling functionality without code changes
- Maintenance mode for system updates

---

## How Environment Variables are Used in the Application

### 1. Configuration Loading Pattern
**Location**: `backend/config.py`

The application uses a consistent pattern for loading environment variables:

```python
# Pattern: os.getenv('VARIABLE_NAME', 'default_value')
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com') 
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
```

**Benefits**:
- **Fallback Values**: Default values ensure app works even if .env is missing
- **Type Conversion**: `int()` and `float()` convert string values to appropriate types
- **Flexibility**: Same code works across different environments

### 2. Configuration Classes
**Location**: `backend/config.py:67-96`

Different configuration classes for different environments:

```python
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    # For development, use SQLite as fallback (no sensitive credentials)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///sahatak_dev.db')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    # MySQL Database configuration for PythonAnywhere
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'https://hello-50.github.io,https://hello-50.github.io/Sahatak').split(',')
```

### 3. Environment-Based Loading
**Location**: `backend/app.py:17-27`

The application automatically selects configuration based on `FLASK_ENV`:

```python
env = os.getenv('FLASK_ENV', 'development')
if env == 'production':
    from config import ProductionConfig
    app.config.from_object(ProductionConfig)
elif env == 'testing':
    from config import TestingConfig
    app.config.from_object(TestingConfig)
else:
    from config import DevelopmentConfig
    app.config.from_object(DevelopmentConfig)
```

### 4. Runtime Environment Override
**Location**: `backend/app.py:29-32`

Critical settings can be overridden at runtime:

```python
# Override with environment variables if they exist
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', app.config['SECRET_KEY'])
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', app.config['SQLALCHEMY_DATABASE_URI'])
app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'https://hello-50.github.io/Sahatak')
```

---

## Environment Variables in Different Parts of the Application

### 1. Email Service Configuration
**Location**: `backend/services/email_service.py:34-40`

```python
# Configure Flask-Mail using existing .env variables
app.config.setdefault('MAIL_SERVER', os.getenv('MAIL_SERVER', 'smtp.gmail.com'))
app.config.setdefault('MAIL_PORT', int(os.getenv('MAIL_PORT', 587)))
app.config.setdefault('MAIL_USERNAME', os.getenv('MAIL_USERNAME'))  # sahatak.sudan@gmail.com
app.config.setdefault('MAIL_PASSWORD', os.getenv('MAIL_PASSWORD'))
app.config.setdefault('MAIL_DEFAULT_SENDER', os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME')))
```

### 2. Admin Initialization
**Location**: `backend/routes/admin.py:55`

```python
# Validate secret key (you should set this in environment variables)
expected_secret = os.getenv('ADMIN_INIT_SECRET', 'CHANGE_THIS_SECRET_KEY')
if data.get('secret_key') != expected_secret:
    return APIResponse.error(message="Invalid initialization secret key")
```

### 3. Video Call Configuration
**Location**: `backend/routes/appointments.py:886-902`

```python
# Get domain and other settings from environment
jitsi_domain = os.getenv('JITSI_DOMAIN', 'meet.jit.si')
app_id = os.getenv('JITSI_APP_ID', '')

response_data = {
    'jitsi_domain': jitsi_domain,
    'room_prefix': os.getenv('JITSI_ROOM_PREFIX', 'sahatak_consultation_'),
    'max_duration_minutes': int(os.getenv('VIDEO_CALL_MAX_DURATION_MINUTES', '60')),
    'features': {
        'recording_enabled': os.getenv('VIDEO_CALL_RECORDING_ENABLED', 'false').lower() == 'true',
        'lobby_enabled': os.getenv('VIDEO_CALL_LOBBY_ENABLED', 'false').lower() == 'true',
        'chat_enabled': os.getenv('JITSI_ENABLE_CHAT', 'true').lower() == 'true',
        'screen_sharing_enabled': os.getenv('JITSI_ENABLE_SCREEN_SHARING', 'true').lower() == 'true'
    }
}
```

### 4. Logging Configuration
**Location**: `backend/app.py:46`

```python
# Setup logging first (before other imports)
from utils.logging_config import SahatakLogger
SahatakLogger.setup_logging(app, log_level=os.getenv('LOG_LEVEL', 'INFO'))
```

---

## Production Deployment with .env

### PythonAnywhere Deployment
**Location**: `backend/sahatak_pythonanywhere_com_wsgi.py:15-27`

For production deployment, the environment variables are loaded from the `.env` file:

```python
# Load environment variables from .env file if it exists
env_path = os.path.join(project_home, '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ.setdefault(key, value)
```

### Environment-Specific Settings

#### Development Environment (`FLASK_ENV=development`)
- Uses SQLite database as fallback
- Debug mode enabled
- Detailed error messages
- Local SMTP server allowed

#### Production Environment (`FLASK_ENV=production`)
- Requires MySQL database URL
- Debug mode disabled
- Secure session cookies
- Restricted CORS origins

#### Testing Environment (`FLASK_ENV=testing`)
- In-memory SQLite database
- Testing-specific configurations
- Simplified authentication

---

## Best Practices for .env Management

### 1. Security Guidelines

**✅ Do:**
- Keep `.env` file out of version control (add to `.gitignore`)
- Use strong, unique values for `SECRET_KEY` and `JWT_SECRET_KEY`
- Rotate credentials regularly
- Use different values for development and production

**❌ Don't:**
- Commit `.env` file to git
- Share production credentials
- Use default values in production
- Store API keys directly in code

### 2. Environment Variable Naming Conventions

The Sahatak platform follows consistent naming patterns:
- **ALL_CAPS**: Standard environment variable naming
- **Underscores**: Separate words with underscores
- **Grouped Prefixes**: Related settings share prefixes (e.g., `JITSI_`, `MAIL_`, `SMS_`)
- **Boolean Values**: Use `true`/`false` strings (converted with `.lower() == 'true'`)

### 3. Default Values Strategy

Every environment variable should have a sensible default:
```python
# Good: Provides fallback
PORT = int(os.getenv('PORT', 5000))

# Bad: Crashes if variable missing
PORT = int(os.getenv('PORT'))
```

### 4. Type Conversion

Environment variables are always strings, so convert types explicitly:
```python
# Integer conversion
MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))

# Float conversion  
AI_TEMPERATURE = float(os.getenv('AI_TEMPERATURE', 0.7))

# Boolean conversion
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'

# List conversion
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '').split(',')
```

---

## Setting Up Your .env File

### 1. Copy from Template
```bash
# In the backend directory
cp .env.example .env  # If template exists
# OR create new .env file
```

### 2. Essential Variables for Development
```bash
# Minimum required variables for local development
FLASK_ENV=development
SECRET_KEY=your-development-secret-key-here
DATABASE_URL=sqlite:///sahatak_dev.db
MAIL_SERVER=smtp.gmail.com
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### 3. Production Variables
```bash
# Production environment requires these
FLASK_ENV=production
SECRET_KEY=strong-production-secret-key
DATABASE_URL=mysql+pymysql://username:password@host/database
FRONTEND_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### 4. Testing Variables
```bash
# Testing environment
FLASK_ENV=testing
SECRET_KEY=test-secret-key
DATABASE_URL=sqlite:///:memory:
```

---

## Troubleshooting Common .env Issues

### 1. File Not Found
```bash
# Error: .env file not loading
# Solution: Ensure file is in backend/ directory
ls -la backend/.env
```

### 2. Permission Issues
```bash
# Error: Permission denied
# Solution: Check file permissions
chmod 644 backend/.env
```

### 3. Variable Not Loading
```python
# Debug: Check if variable is loaded
import os
print("DATABASE_URL:", os.getenv('DATABASE_URL'))
print("All env vars:", dict(os.environ))
```

### 4. Type Conversion Errors
```python
# Error: ValueError when converting to int
# Solution: Check for empty values
def safe_int(value, default):
    try:
        return int(value) if value else default
    except (ValueError, TypeError):
        return default

PORT = safe_int(os.getenv('PORT'), 5000)
```

### 5. Boolean Values Not Working
```python
# Error: Boolean always True
# Solution: Proper boolean conversion
# Wrong:
ENABLE_FEATURE = bool(os.getenv('ENABLE_FEATURE', 'false'))  # Always True!

# Correct:
ENABLE_FEATURE = os.getenv('ENABLE_FEATURE', 'false').lower() == 'true'
```

---

## Environment Variables Reference Table

| Variable | Default | Purpose | Used In |
|----------|---------|---------|---------|
| `FLASK_ENV` | development | Application environment | `app.py:18` |
| `SECRET_KEY` | dev-secret-key | Flask session security | `config.py:12` |
| `DATABASE_URL` | sqlite:///sahatak_dev.db | Database connection | `config.py:70,80` |
| `MAIL_SERVER` | smtp.gmail.com | Email server | `config.py:16` |
| `MAIL_USERNAME` | None | Email username | `config.py:19` |
| `MAIL_PASSWORD` | None | Email password | `config.py:20` |
| `JITSI_DOMAIN` | meet.jit.si | Video call server | `appointments.py:886` |
| `LOG_LEVEL` | INFO | Logging verbosity | `app.py:46` |
| `PORT` | 5000 | Server port | `app.py:135` |
| `MAX_LOGIN_ATTEMPTS` | 5 | Login security | `config.py:59` |
| `PASSWORD_MIN_LENGTH` | 6 | Password validation | `config.py:41` |
| `CORS_ORIGINS` | localhost | Allowed origins | `config.py:86` |

---

## Summary

The `.env` file is the central configuration hub for the Sahatak telemedicine platform. It provides:

### Core Benefits:
1. **Security**: Keeps sensitive data out of source code
2. **Flexibility**: Easy configuration changes without code modifications  
3. **Environment Management**: Different settings for development/production
4. **Team Collaboration**: Standardized configuration approach

### Key Features:
- **233 configuration variables** covering all aspects of the platform
- **Organized sections** for database, email, SMS, video calls, AI, etc.
- **Fallback defaults** ensure application works without complete configuration
- **Type conversion** handles strings, integers, floats, and booleans
- **Production-ready** deployment configuration

### File Structure:
- **Location**: `backend/.env`
- **Loading**: `backend/app.py` with `python-dotenv`
- **Usage**: Throughout backend via `os.getenv()` calls
- **Configuration**: `backend/config.py` centralizes settings

### Integration Points:
- **Flask Configuration**: Main app configuration
- **Database Connection**: SQLAlchemy database URI
- **Email Service**: SMTP settings for notifications
- **Video Calls**: Jitsi Meet configuration
- **Security**: Authentication and validation rules
- **AI Services**: Hugging Face model settings
- **Feature Flags**: Enable/disable functionality

For fresh developers, understanding the `.env` file is crucial as it controls how the entire Sahatak platform behaves across different environments and deployments. Always ensure your `.env` file is properly configured and never commit it to version control!