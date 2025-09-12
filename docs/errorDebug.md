# Error Handling & Debugging Guide - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [Error Handling System Architecture](#error-handling-system-architecture)
3. [Common Error Types & Solutions](#common-error-types--solutions)
4. [Debugging Tools & Techniques](#debugging-tools--techniques)
5. [Log Analysis & Monitoring](#log-analysis--monitoring)
6. [Database Debugging](#database-debugging)
7. [Frontend Debugging](#frontend-debugging)
8. [API Debugging](#api-debugging)
9. [Production Error Handling](#production-error-handling)
10. [Testing & Prevention](#testing--prevention)

---

## Overview

The Sahatak platform implements a comprehensive error handling and debugging system designed to catch, log, and gracefully handle errors across all system components. This guide helps fresh developers understand how to debug issues, interpret error messages, and fix common problems.

### Key Error Handling Components
- **Global Error Handlers**: `backend/utils/error_handlers.py`
- **Logging System**: `backend/utils/logging_config.py`
- **Standardized Responses**: `backend/utils/responses.py`
- **Custom Exceptions**: Application-specific error classes
- **Frontend Error Handling**: JavaScript error catching and user feedback

---

## Error Handling System Architecture

### 1. Backend Error Flow
```
Error Occurs → Global Error Handler → Log Error → Return Standardized Response → Frontend Display
```

### 2. Error Handler Registration
**Location**: `backend/app.py:98-104`

```python
# Import and register error handlers
from utils.error_handlers import register_error_handlers, register_custom_error_handlers
register_error_handlers(app)
register_custom_error_handlers(app)
```

### 3. Comprehensive Error Coverage
**Location**: `backend/utils/error_handlers.py`

The system handles **21 different error types**:

| Error Type | Status Code | Handler Function |
|------------|-------------|------------------|
| Bad Request | 400 | `bad_request()` |
| Unauthorized | 401 | `unauthorized()` |
| Forbidden | 403 | `forbidden()` |
| Not Found | 404 | `not_found()` |
| Method Not Allowed | 405 | `method_not_allowed()` |
| Conflict | 409 | `conflict()` |
| Payload Too Large | 413 | `payload_too_large()` |
| Unsupported Media Type | 415 | `unsupported_media_type()` |
| Unprocessable Entity | 422 | `unprocessable_entity()` |
| Rate Limit Exceeded | 429 | `rate_limit_exceeded()` |
| Internal Server Error | 500 | `internal_server_error()` |
| Database Errors | 500 | `database_error()` |
| Value Errors | 400 | `value_error()` |
| Key Errors | 400 | `key_error()` |
| HTTP Exceptions | Various | `http_exception()` |
| Generic Exceptions | 500 | `generic_exception()` |

---

## Common Error Types & Solutions

### 1. Authentication Errors

#### **Problem**: User Cannot Login
```json
{
    "success": false,
    "message": "Invalid email/phone or password",
    "status_code": 401,
    "error_code": "UNAUTHORIZED"
}
```

**Debugging Steps:**
1. **Check Input Validation**:
   ```bash
   # Search for login validation in backend
   grep -r "login_identifier" backend/routes/auth.py
   ```

2. **Verify Database Connection**:
   ```python
   # Check if user exists in database
   python
   >>> from app import app, db
   >>> from models import User
   >>> with app.app_context():
   ...     user = User.query.filter_by(email='user@example.com').first()
   ...     print(f"User found: {user is not None}")
   ```

3. **Check Password Hashing**:
   ```python
   # Test password verification
   >>> if user:
   ...     print(f"Password valid: {user.check_password('password')}")
   ```

**Common Solutions:**
- Verify email/phone format validation
- Check password hashing implementation
- Ensure user account is active and verified

#### **Problem**: JWT Token Errors
```json
{
    "success": false,
    "message": "Admin authentication requires PyJWT",
    "status_code": 500,
    "error_code": "JWT_REQUIRED"
}
```

**Solution**: Install PyJWT dependency
```bash
pip install PyJWT
```

### 2. Database Errors

#### **Problem**: Database Connection Issues
```json
{
    "success": false,
    "message": "A database error occurred",
    "status_code": 500,
    "error_code": "DATABASE_ERROR"
}
```

**Debugging Steps:**
1. **Check Database Configuration**: `backend/config.py`
   ```python
   # Verify database URL format
   SQLALCHEMY_DATABASE_URI = 'sqlite:///sahatak_dev.db'  # Development
   SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')   # Production
   ```

2. **Test Database Connection**:
   ```python
   from sqlalchemy import create_engine
   from sqlalchemy.exc import SQLAlchemyError
   
   try:
       engine = create_engine('sqlite:///sahatak_dev.db')
       connection = engine.connect()
       print("Database connection successful")
       connection.close()
   except SQLAlchemyError as e:
       print(f"Database error: {e}")
   ```

3. **Check Database Tables**:
   ```bash
   # For SQLite
   sqlite3 sahatak_dev.db ".tables"
   
   # For MySQL
   mysql -u username -p database_name -e "SHOW TABLES;"
   ```

**Error Handler Location**: `backend/utils/error_handlers.py:177-204`
```python
@app.errorhandler(SQLAlchemyError)
def database_error(error):
    """Handle SQLAlchemy database errors"""
    error_id = str(uuid.uuid4())
    
    db_logger.error("Database error", extra={
        'error_id': error_id,
        'error_type': type(error).__name__,
        'error_message': str(error),
        'endpoint': request.endpoint,
        'method': request.method,
        'ip_address': request.remote_addr,
        'traceback': traceback.format_exc()
    })
    
    # Rollback any pending transaction
    try:
        from models import db
        db.session.rollback()
    except Exception as rollback_error:
        app_logger.error(f"Failed to rollback transaction: {rollback_error}")
    
    return APIResponse.error(
        message="A database error occurred. Please try again later.",
        status_code=500,
        error_code="DATABASE_ERROR",
        details={"error_id": error_id}
    )
```

### 3. Validation Errors

#### **Problem**: Invalid Input Data
```json
{
    "success": false,
    "message": "Invalid email format",
    "status_code": 400,
    "error_code": "VALIDATION_ERROR",
    "field": "email"
}
```

**Debugging Steps:**
1. **Check Validation Functions**: `backend/utils/validators.py`
2. **Test Validation Logic**:
   ```python
   from utils.validators import validate_email, validate_phone
   
   # Test email validation
   print(validate_email("invalid-email"))      # False
   print(validate_email("user@example.com"))  # True
   
   # Test phone validation
   print(validate_phone("+249123456789"))     # {'valid': True, 'formatted': '+249123456789'}
   ```

**Validation Error Pattern**: `backend/routes/appointments.py:149-174`
```python
# Validate required fields
required_fields = ['doctor_id', 'appointment_date', 'appointment_type']
optional_fields = ['notes']
validation = validate_json_payload(data, required_fields, optional_fields)

if not validation['valid']:
    return APIResponse.validation_error(
        field=validation.get('missing_fields', validation.get('unexpected_fields', 'data')),
        message=validation['message']
    )
```

### 4. API Endpoint Errors

#### **Problem**: Endpoint Not Found
```json
{
    "success": false,
    "message": "Endpoint not found",
    "status_code": 404,
    "error_code": "NOT_FOUND"
}
```

**Debugging Steps:**
1. **Check Route Registration**: `backend/app.py:122-137`
   ```python
   # Verify blueprint registration
   app.register_blueprint(auth_bp, url_prefix='/api/auth')
   app.register_blueprint(users_bp, url_prefix='/api/users')
   app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
   ```

2. **Verify Route Definition**:
   ```python
   # Example route in backend/routes/auth.py
   @auth_bp.route('/login', methods=['GET', 'POST'])
   def login():
       # Route implementation
   ```

3. **Test API Endpoints**:
   ```bash
   # Test with curl
   curl -X POST http://localhost:5000/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"login_identifier": "test@example.com", "password": "password"}'
   ```

### 5. File Upload Errors

#### **Problem**: File Too Large
```json
{
    "success": false,
    "message": "File or payload too large",
    "status_code": 413,
    "error_code": "PAYLOAD_TOO_LARGE"
}
```

**Solution**: Adjust file size limits in configuration
```python
# backend/config.py
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB limit
```

---

## Debugging Tools & Techniques

### 1. Python Debugging Tools

#### **Using pdb Debugger**
```python
# Add breakpoint in your code
import pdb; pdb.set_trace()

# Or use the newer breakpoint() function (Python 3.7+)
breakpoint()
```

**Example Usage in Route**:
```python
@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    try:
        data = request.get_json()
        breakpoint()  # Debugger will stop here
        # ... rest of function
    except Exception as e:
        app_logger.error(f"Appointment creation error: {str(e)}")
        return APIResponse.internal_error()
```

#### **Using IPython for Interactive Debugging**
```bash
# Install IPython
pip install ipython

# Start interactive session
python
>>> from app import app, db
>>> from models import User, Appointment
>>> with app.app_context():
...     # Interactive debugging
...     users = User.query.all()
...     print(f"Total users: {len(users)}")
```

### 2. Flask Development Server Debugging

**Enable Debug Mode**: `backend/app.py:391`
```python
debug = os.getenv('FLASK_ENV') == 'development'
socketio.run(app, debug=debug, host='0.0.0.0', port=port)
```

**Debug Configuration**: `backend/.env`
```bash
FLASK_ENV=development
DEBUG=True
LOG_LEVEL=DEBUG
```

### 3. VS Code Debugging Setup

**Create `.vscode/launch.json`**:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Python: Flask",
            "type": "python",
            "request": "launch",
            "program": "${workspaceFolder}/backend/app.py",
            "env": {
                "FLASK_ENV": "development"
            },
            "console": "integratedTerminal",
            "cwd": "${workspaceFolder}/backend"
        }
    ]
}
```

---

## Log Analysis & Monitoring

### 1. Structured Logging System
**Location**: `backend/utils/logging_config.py`

The system generates **4 types of log files**:
```
logs/
├── sahatak_app.log      # General application logs
├── sahatak_errors.log   # Error-specific logs  
├── sahatak_auth.log     # Authentication events
└── sahatak_debug.log    # Debug information
```

### 2. JSON Log Format
**Example Log Entry**:
```json
{
    "timestamp": "2024-01-15T10:30:45.123456",
    "level": "ERROR",
    "logger": "sahatak.auth",
    "message": "Login failed for user",
    "module": "auth",
    "function": "login",
    "line": 245,
    "user_id": null,
    "ip_address": "192.168.1.100",
    "exception": "ValueError: Invalid credentials"
}
```

### 3. Log Analysis Commands

#### **Find Authentication Errors**:
```bash
# Search for failed login attempts
grep "Invalid email/phone" logs/sahatak_auth.log

# Count failed logins by IP
grep "Login failed" logs/sahatak_auth.log | jq '.ip_address' | sort | uniq -c
```

#### **Database Error Analysis**:
```bash
# Find database errors
grep "DATABASE_ERROR" logs/sahatak_errors.log

# Get error details
grep "SQLAlchemyError" logs/sahatak_errors.log | jq '.error_message'
```

#### **API Endpoint Monitoring**:
```bash
# Most accessed endpoints
grep "API request" logs/sahatak_app.log | jq '.path' | sort | uniq -c | sort -nr

# Response time analysis
grep "response_time" logs/sahatak_app.log | jq '.response_time' | sort -n
```

### 4. Real-time Log Monitoring
```bash
# Watch application logs in real-time
tail -f logs/sahatak_app.log | jq '.'

# Monitor errors only
tail -f logs/sahatak_errors.log | jq 'select(.level=="ERROR")'

# Filter by specific user
tail -f logs/sahatak_auth.log | jq 'select(.user_id=="123")'
```

---

## Database Debugging

### 1. Query Performance Debugging

#### **Enable SQL Query Logging**:
```python
# backend/config.py - Development only
class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True  # Log all SQL queries
```

#### **Manual Query Testing**:
```python
from app import app, db
from models import User, Appointment, Doctor
from sqlalchemy import text

with app.app_context():
    # Test raw SQL
    result = db.session.execute(text("SELECT COUNT(*) FROM users")).scalar()
    print(f"Total users: {result}")
    
    # Test ORM queries
    doctors = Doctor.query.filter_by(is_verified=True).all()
    print(f"Verified doctors: {len(doctors)}")
```

### 2. Database Integrity Checks

#### **Check for Orphaned Records**:
```python
with app.app_context():
    # Find appointments without valid doctor/patient
    orphaned_appointments = db.session.query(Appointment).filter(
        ~Appointment.doctor_id.in_(db.session.query(Doctor.id)) |
        ~Appointment.patient_id.in_(db.session.query(Patient.id))
    ).all()
    
    print(f"Orphaned appointments: {len(orphaned_appointments)}")
```

#### **Database Health Check**:
```python
def check_database_health():
    """Comprehensive database health check"""
    with app.app_context():
        checks = {
            'users': User.query.count(),
            'doctors': Doctor.query.count(),
            'patients': Patient.query.count(),
            'appointments': Appointment.query.count(),
            'verified_doctors': Doctor.query.filter_by(is_verified=True).count(),
            'active_users': User.query.filter_by(is_active=True).count()
        }
        
        for check, count in checks.items():
            print(f"{check}: {count}")
        
        return checks
```

### 3. Common Database Issues

#### **Problem**: Duplicate Records
```python
# Find duplicate users by email
duplicates = db.session.query(User.email, db.func.count(User.id)).group_by(User.email).having(db.func.count(User.id) > 1).all()
```

#### **Problem**: Missing Foreign Key Relationships
```python
# Find appointments without proper relationships
bad_appointments = db.session.query(Appointment).filter(
    (Appointment.doctor_id == None) | (Appointment.patient_id == None)
).all()
```

---

## Frontend Debugging

### 1. Browser Developer Tools

#### **Console Debugging**:
```javascript
// Enable detailed logging in frontend
localStorage.setItem('debug_mode', 'true');

// Check authentication state
console.log('Auth data:', AuthStorage.getAuthData());
console.log('Is authenticated:', AuthGuard.isAuthenticated());

// Test API connectivity
fetch('/api/health')
    .then(response => response.json())
    .then(data => console.log('API health:', data))
    .catch(error => console.error('API error:', error));
```

#### **Network Tab Analysis**:
- **Failed Requests**: Look for 4xx/5xx status codes
- **CORS Errors**: Check for preflight request failures
- **Payload Inspection**: Verify request/response formats
- **Timing Analysis**: Identify slow API calls

### 2. JavaScript Error Handling

#### **Global Error Handler**: `frontend/assets/js/main.js`
```javascript
// Global error handler
window.onerror = function(message, source, lineno, colno, error) {
    console.error('Global error:', {
        message: message,
        source: source,
        line: lineno,
        column: colno,
        error: error
    });
    
    // Optional: Send error to backend logging
    if (typeof ApiHelper !== 'undefined') {
        ApiHelper.logError(error, message);
    }
};

// Promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});
```

#### **API Error Handling Pattern**:
```javascript
async function handleLogin(event) {
    try {
        const response = await ApiHelper.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        // Success handling
        if (response.success) {
            AuthStorage.setAuthData(response.data.user);
            redirectToDashboard(response.data.user.user_type);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Specific error handling
        if (error.error_code === 'USER_NOT_VERIFIED') {
            showAlert('warning', 'Please verify your email address');
        } else if (error.status_code === 401) {
            showAlert('error', 'Invalid credentials');
        } else {
            showAlert('error', error.message || 'Login failed');
        }
    }
}
```

### 3. Common Frontend Issues

#### **Problem**: CORS Errors
**Solution**: Verify CORS configuration in `backend/app.py:75-92`
```python
CORS(app, 
     origins=[
         'http://localhost:3000', 
         'http://127.0.0.1:3000', 
         'http://localhost:5500',
         'http://127.0.0.1:5500',
         'https://hello-50.github.io'
     ],
     allow_headers=['Content-Type', 'Authorization', 'Accept-Language'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     supports_credentials=True)
```

#### **Problem**: Authentication Issues
```javascript
// Check authentication state
if (!AuthGuard.isAuthenticated()) {
    console.log('User not authenticated, redirecting...');
    AuthGuard.redirectToLogin();
}

// Verify token validity
const token = localStorage.getItem('sahatak_access_token');
if (!token) {
    console.error('No access token found');
}
```

#### **Problem**: API Communication Issues
```javascript
// Test API connectivity
const testAPI = async () => {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        console.log('API Status:', data);
    } catch (error) {
        console.error('API unreachable:', error);
    }
};
```

---

## API Debugging

### 1. API Testing Tools

#### **Using curl**:
```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "login_identifier": "test@example.com",
       "password": "password123"
     }'

# Test authenticated endpoint
curl -X GET http://localhost:5000/api/users/profile \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test with verbose output
curl -v -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"login_identifier": "test@example.com", "password": "password123"}'
```

#### **Using Postman/Insomnia**:
1. **Create Collection**: Organize API requests by feature
2. **Environment Variables**: Store base URL, tokens
3. **Pre-request Scripts**: Auto-generate tokens
4. **Tests**: Validate responses automatically

### 2. API Response Patterns

#### **Standardized Response Format**: `backend/utils/responses.py`
```python
# Success Response
{
    "success": true,
    "message": "Operation successful",
    "data": { ... },
    "timestamp": "2024-01-15T10:30:45.123456",
    "status_code": 200,
    "meta": { "pagination": { ... } }  # Optional
}

# Error Response
{
    "success": false,
    "message": "Error description",
    "timestamp": "2024-01-15T10:30:45.123456",
    "status_code": 400,
    "error_code": "VALIDATION_ERROR",
    "field": "email",                   # Optional
    "details": { ... }                  # Optional
}
```

## Production Error Handling

### 1. Error Monitoring Setup

#### **Error ID Tracking**: `backend/utils/error_handlers.py:158-175`
```python
@app.errorhandler(500)
def internal_server_error(error):
    error_id = str(uuid.uuid4())  # Unique error identifier
    
    app_logger.error("Internal server error", extra={
        'error_id': error_id,
        'endpoint': request.endpoint,
        'method': request.method,
        'ip_address': request.remote_addr,
        'traceback': traceback.format_exc()
    })
    
    return APIResponse.internal_error(
        message="An internal error occurred. Please try again later.",
        error_id=error_id  # Return to user for support requests
    )
```

### 2. Health Monitoring

#### **System Health Check**: `backend/utils/health_check.py`
```python
@app.route('/health')
def health_check():
    """Basic health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.3.0'
    })

@app.route('/health/detailed')
def detailed_health_check():
    """Detailed system health with database connectivity"""
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'components': {}
    }
    
    # Database connectivity check
    try:
        db.session.execute('SELECT 1')
        health_status['components']['database'] = 'healthy'
    except Exception as e:
        health_status['components']['database'] = 'unhealthy'
        health_status['status'] = 'degraded'
    
    return jsonify(health_status)
```

### 3. Error Alerting Strategy

#### **Critical Error Notifications**:
```python
def send_error_alert(error_type, error_message, error_id):
    """Send alert for critical errors"""
    if error_type in ['DATABASE_ERROR', 'AUTHENTICATION_FAILURE', 'SYSTEM_FAILURE']:
        # Send email to administrators
        # Log to external monitoring service
        # Trigger alert systems
        pass
```

---

## Testing & Prevention

### 1. Error Simulation Testing

#### **Test Database Failures**:
```python
# Simulate database connection failure
def test_database_error():
    with app.test_client() as client:
        # Mock database error
        with mock.patch('models.db.session.commit', side_effect=SQLAlchemyError("Connection lost")):
            response = client.post('/api/appointments', 
                                 json={'doctor_id': 1, 'appointment_date': '2024-01-15T10:00:00'})
            
            assert response.status_code == 500
            assert 'DATABASE_ERROR' in response.json['error_code']
```

#### **Test Authentication Failures**:
```python
def test_invalid_token():
    with app.test_client() as client:
        response = client.get('/api/users/profile',
                            headers={'Authorization': 'Bearer invalid_token'})
        
        assert response.status_code == 401
        assert not response.json['success']
```

### 2. Input Validation Testing

#### **Test Malformed Requests**:
```python
def test_malformed_json():
    with app.test_client() as client:
        response = client.post('/api/auth/login',
                             data='invalid json',
                             content_type='application/json')
        
        assert response.status_code == 400
```

### 3. Error Prevention Best Practices

#### **Always Use Try-Catch Blocks**:
```python
@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    try:
        # Main logic here
        data = request.get_json()
        
        # Validate inputs
        if not data:
            return APIResponse.validation_error('data', 'Request body required')
        
        # Process appointment creation
        appointment = Appointment(...)
        db.session.add(appointment)
        db.session.commit()
        
        return APIResponse.success(data=appointment.to_dict())
        
    except SQLAlchemyError as e:
        db.session.rollback()
        app_logger.error(f"Database error in appointment creation: {str(e)}")
        return APIResponse.error(
            message="Failed to create appointment",
            status_code=500,
            error_code="DATABASE_ERROR"
        )
    except ValueError as e:
        app_logger.warning(f"Validation error: {str(e)}")
        return APIResponse.validation_error('data', str(e))
    except Exception as e:
        app_logger.error(f"Unexpected error in appointment creation: {str(e)}")
        return APIResponse.internal_error()
```

#### **Input Validation Pattern**:
```python
def validate_appointment_data(data):
    """Validate appointment creation data"""
    errors = []
    
    if not data.get('doctor_id'):
        errors.append({'field': 'doctor_id', 'message': 'Doctor ID required'})
    
    if not data.get('appointment_date'):
        errors.append({'field': 'appointment_date', 'message': 'Appointment date required'})
    
    if data.get('appointment_type') not in ['video', 'audio', 'chat']:
        errors.append({'field': 'appointment_type', 'message': 'Invalid appointment type'})
    
    return errors
```

---

## Quick Debugging Reference

### 1. Common Error Codes & Meanings

| Error Code | Meaning | Typical Cause |
|------------|---------|---------------|
| `VALIDATION_ERROR` | Input validation failed | Invalid email, missing field |
| `UNAUTHORIZED` | Authentication required | Missing/invalid token |
| `FORBIDDEN` | Access denied | Insufficient permissions |
| `NOT_FOUND` | Resource not found | Invalid ID, deleted resource |
| `CONFLICT` | Resource conflict | Duplicate registration |
| `DATABASE_ERROR` | Database operation failed | Connection lost, constraint violation |
| `USER_NOT_VERIFIED` | Email not verified | User needs to verify email |
| `JWT_REQUIRED` | JWT library missing | Admin needs PyJWT installed |

### 2. Quick Debug Commands

```bash
# Check application logs
tail -f logs/sahatak_app.log | jq '.'

# Find specific errors
grep "ERROR" logs/sahatak_errors.log | tail -10

# Monitor authentication
grep "auth" logs/sahatak_auth.log | tail -5

# Database health check
curl http://localhost:5000/health/detailed

# Test API connectivity  
curl http://localhost:5000/api/health
```

### 3. Emergency Debugging Steps

**When System is Down**:
1. **Check Health Endpoint**: `curl http://localhost:5000/health`
2. **Review Recent Logs**: `tail -50 logs/sahatak_errors.log`
3. **Test Database**: Python REPL → `db.session.execute('SELECT 1')`
4. **Verify Environment**: Check `.env` file values
5. **Restart Services**: Restart Flask app, database
6. **Check Dependencies**: `pip freeze` → verify all packages installed

**When Feature Broken**:
1. **Reproduce Issue**: Document exact steps to reproduce
2. **Check Recent Changes**: `git log --oneline -10`
3. **Review Feature Logs**: Filter logs by endpoint/user
4. **Test API Directly**: Use curl/Postman to isolate frontend/backend
5. **Verify Database State**: Check data integrity for feature
6. **Test Dependencies**: Verify external services (email, etc.)

---

## Summary

The Sahatak error handling and debugging system provides comprehensive coverage for identifying, logging, and resolving issues across the entire platform:

### **Key Features**:
1. **Global Error Handling**: 21 different error types handled gracefully
2. **Structured Logging**: JSON-formatted logs with contextual information
3. **Error ID Tracking**: Unique identifiers for production error tracking
4. **Standardized Responses**: Consistent API error format
5. **Comprehensive Debugging Tools**: Multiple levels of debugging support
6. **Real-time Monitoring**: Log analysis and health check endpoints

### **File References**:
- **Error Handlers**: `backend/utils/error_handlers.py`
- **Logging System**: `backend/utils/logging_config.py`
- **Response Formatting**: `backend/utils/responses.py`
- **Health Checks**: `backend/utils/health_check.py`
- **Main Application**: `backend/app.py`

### **Best Practices**:
- Always use try-catch blocks in route handlers
- Log errors with contextual information
- Validate inputs before processing
- Use standardized API responses
- Monitor logs regularly for patterns
- Test error scenarios during development

This system ensures that fresh developers can quickly identify, understand, and resolve issues while maintaining system stability and user experience.