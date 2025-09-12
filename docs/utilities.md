# Backend Utilities - Sahatak Platform

## Overview

The Sahatak backend utilities provide a comprehensive suite of helper classes and functions that handle core application functionality including API responses, validation, logging, authentication, health monitoring, and database optimization. These utilities form the foundation that powers the entire telemedicine platform.

**Main Utility Files**:
- **API Responses**: `backend/utils/responses.py` - Standardized API response formatting
- **Validation**: `backend/utils/validators.py` - Input validation and sanitization
- **Logging**: `backend/utils/logging_config.py` - Centralized logging system
- **JWT Authentication**: `backend/utils/jwt_helper.py` - Token generation and validation
- **Settings Management**: `backend/utils/settings_manager.py` - Configuration management
- **Health Monitoring**: `backend/utils/health_check.py` - System health monitoring
- **Error Handling**: `backend/utils/error_handlers.py` - Global error management
- **Database Optimization**: `backend/utils/db_optimize.py` - Query caching and optimization

## Architecture Overview

### Backend Utilities Stack
```
Backend Utilities Architecture
├── API Layer
│   ├── APIResponse - Standardized JSON responses
│   ├── Error Handlers - Global exception management
│   └── Request Validation - Input sanitization
├── Security Layer
│   ├── JWT Helper - Token operations
│   ├── Validators - Data validation rules
│   └── Settings Manager - Secure configuration
├── Monitoring Layer
│   ├── Logging System - Structured logging
│   ├── Health Checker - System monitoring
│   └── Database Optimization - Performance tracking
├── Data Layer
│   ├── Query Cache - In-memory caching
│   ├── Database Monitoring - Query performance
│   └── Connection Management - DB optimization
```

---

## Core Utility Components

### 1. API Response System
**Location**: `backend/utils/responses.py`

The APIResponse class provides standardized response formatting across the entire application:

#### Key Features
- **Consistent Format**: All API responses follow the same structure
- **Automatic Timestamps**: Every response includes UTC timestamp
- **Error Code Support**: Standardized error codes for frontend handling
- **Metadata Support**: Pagination and additional response data
- **Type Safety**: Full type hints for better development experience

#### Usage Examples

```python
# Success response with data
from utils.responses import APIResponse

@app.route('/users')
def get_users():
    users = User.query.all()
    return APIResponse.success(
        data=[user.to_dict() for user in users],
        message="Users retrieved successfully",
        meta={'count': len(users)}
    )

# Error response with details
@app.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    
    if not data.get('email'):
        return APIResponse.validation_error(
            field='email',
            message='Email is required'
        )
    
    return APIResponse.success(data=user.to_dict())
```

#### Response Methods

```python
class APIResponse:
    # Success responses
    @staticmethod
    def success(data=None, message="Operation successful", status_code=200, meta=None)
    
    # Error responses  
    @staticmethod
    def error(message="An error occurred", status_code=400, error_code=None, details=None, field=None)
    
    # Specific error types
    @staticmethod
    def validation_error(field, message, details=None)
    @staticmethod
    def not_found(resource="Resource", message=None)
    @staticmethod
    def unauthorized(message="Authentication required")
    @staticmethod
    def forbidden(message="Access denied")
    @staticmethod
    def conflict(message="Resource conflict occurred", details=None)
    @staticmethod
    def internal_error(message="Internal server error occurred")
    
    # Pagination helper
    @staticmethod
    def paginated(items, page, per_page, total, message="Data retrieved successfully")
```

#### Standard Response Format

```json
{
    "success": true,
    "message": "Operation successful",
    "timestamp": "2025-01-15T10:30:45.123456",
    "status_code": 200,
    "data": {
        "id": 1,
        "name": "Ahmed Mohamed"
    },
    "meta": {
        "count": 1,
        "page": 1,
        "per_page": 20,
        "total": 50
    }
}
```

#### Error Response Format

```json
{
    "success": false,
    "message": "Validation error occurred",
    "timestamp": "2025-01-15T10:30:45.123456",
    "status_code": 422,
    "error_code": "VALIDATION_ERROR",
    "field": "email",
    "details": {
        "required_format": "user@example.com"
    }
}
```

### 2. Validation System
**Location**: `backend/utils/validators.py`

Comprehensive validation utilities for user input sanitization and data integrity:

#### Email Validation

```python
def validate_email(email: str) -> bool:
    """
    Validate email format using regex
    
    Features:
    - Supports standard email formats
    - Special case for 'admin' username
    - Handles None and non-string inputs
    """
    
# Usage
if not validate_email(user_email):
    return APIResponse.validation_error(
        field='email',
        message='Invalid email format'
    )
```

#### Password Validation

```python
def validate_password(password: str) -> Dict[str, Union[bool, str]]:
    """
    Comprehensive password validation
    
    Features:
    - Configurable length limits (via settings)
    - Character set requirements
    - Common password detection
    - Strength scoring
    """

# Usage
validation = validate_password(password)
if not validation['valid']:
    return APIResponse.validation_error(
        field='password',
        message=validation['message']
    )
```

#### Phone Number Validation

```python
def validate_phone(phone: str) -> Dict[str, Union[bool, str]]:
    """
    International phone number validation
    
    Features:
    - Multiple international formats
    - Sudanese number format priority
    - Country code detection
    - Format normalization
    """

# Usage  
phone_validation = validate_phone(phone_number)
if not phone_validation['valid']:
    return APIResponse.validation_error(
        field='phone',
        message=phone_validation['message']
    )
```

#### Medical Data Validation

```python
def validate_vital_signs_ranges(data: Dict) -> Dict[str, Union[bool, str]]:
    """
    Validate medical vital signs within normal ranges
    
    Validated Fields:
    - Systolic/Diastolic Blood Pressure
    - Heart Rate
    - Temperature  
    - Respiratory Rate
    - Oxygen Saturation
    - Pain Scale (0-10)
    """

def validate_text_field_length(value: str, field_name: str, max_len: int, min_len: int = 0):
    """
    Validate text field length with configurable limits
    
    Features:
    - Minimum/maximum length validation
    - Whitespace handling
    - Medical terminology checking
    """
```

#### Age and Date Validation

```python
def validate_age(age: Union[int, str]) -> Dict[str, Union[bool, str, int]]:
    """
    Validate age within reasonable medical ranges
    """

def validate_date_format(date_string: str, format_string: str = '%Y-%m-%d') -> Dict[str, Union[bool, str]]:
    """
    Validate date format and reasonableness
    """
```

### 3. Logging System
**Location**: `backend/utils/logging_config.py`

Advanced structured logging system for comprehensive application monitoring:

#### Features
- **Structured JSON Logging**: Machine-readable log entries
- **Multiple Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Contextual Information**: User ID, request ID, IP address
- **File Rotation**: Automatic log file management
- **Real-time Monitoring**: Immediate error alerting

#### Setup and Configuration

```python
class SahatakLogger:
    @staticmethod
    def setup_logging(app=None, log_level='INFO'):
        """
        Comprehensive logging configuration
        
        Features:
        - Creates rotating log files
        - Sets up multiple loggers (app, auth, db, api)
        - Configures JSON formatting
        - Sets appropriate log levels
        """

# Usage in app.py
from utils.logging_config import SahatakLogger
SahatakLogger.setup_logging(app, log_level=os.getenv('LOG_LEVEL', 'INFO'))
```

#### Available Loggers

```python
# Import specific loggers
from utils.logging_config import (
    app_logger,      # General application events
    auth_logger,     # Authentication events
    db_logger,       # Database operations
    api_logger,      # API request/response
    security_logger  # Security events
)

# Usage examples
app_logger.info("Application started successfully")
auth_logger.warning("Failed login attempt", extra={
    'user_id': user.id,
    'ip_address': request.remote_addr
})
db_logger.error("Database connection failed", exc_info=True)
```

#### User Action Logging

```python
def log_user_action(user_id: int, action: str, details: Dict = None, request_obj = None):
    """
    Log user actions for audit trail
    
    Features:
    - Automatic IP address capture
    - Request metadata inclusion
    - Action categorization
    - Security event detection
    """

# Usage
log_user_action(
    user_id=current_user.id,
    action='ehr_access',
    details={'patient_id': patient_id, 'access_type': 'view'},
    request_obj=request
)
```

#### Custom JSON Formatter

```python
class CustomJSONFormatter(logging.Formatter):
    """
    Structured JSON log formatter
    
    Output Format:
    {
        "timestamp": "2025-01-15T10:30:45.123456",
        "level": "INFO",
        "logger": "sahatak.auth",
        "message": "User login successful",
        "module": "auth",
        "function": "login",
        "line": 145,
        "user_id": 123,
        "ip_address": "192.168.1.100"
    }
    """
```

### 4. JWT Authentication Helper
**Location**: `backend/utils/jwt_helper.py`

Secure JWT token generation and validation for API authentication:

#### Token Generation

```python
class JWTHelper:
    @staticmethod
    def generate_token(user_data, expires_in=24):
        """
        Generate secure JWT token
        
        Features:
        - HS256 algorithm
        - Configurable expiration
        - User claims embedding
        - Error handling and logging
        """
        
        payload = {
            'user_id': user_data.get('user_id'),
            'user_type': user_data.get('user_type'),
            'email': user_data.get('email'),
            'exp': datetime.datetime.utcnow() + timedelta(hours=expires_in),
            'iat': datetime.datetime.utcnow(),
            'iss': 'sahatak-api'
        }
        
        return jwt.encode(payload, secret_key, algorithm='HS256')
```

#### Token Validation

```python
@staticmethod
def decode_token(token):
    """
    Decode and validate JWT token
    
    Features:
    - Signature verification
    - Expiration checking
    - Claims validation
    - Error handling for expired/invalid tokens
    """
    
    try:
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

#### Usage in Authentication

```python
# Generate token during login
from utils.jwt_helper import JWTHelper

token_data = {
    'user_id': user.id,
    'user_type': user.user_type,
    'email': user.email
}
access_token = JWTHelper.generate_token(token_data, expires_in=24)

# Validate token in API decorator
payload = JWTHelper.decode_token(token)
if payload:
    user_id = payload.get('user_id')
    user = User.query.get(user_id)
    if user and user.is_active:
        # Token is valid, proceed with request
        pass
```

### 5. Settings Management System
**Location**: `backend/utils/settings_manager.py`

Unified configuration management with priority-based setting resolution:

#### Priority System
1. **Database Settings** (highest) - Admin configurable via web interface
2. **Environment Variables** (medium) - `.env` file settings  
3. **Default Values** (lowest) - Hardcoded fallbacks

#### Core Functionality

```python
class SettingsManager:
    @classmethod
    def get_setting(cls, key: str, default: Any = None, data_type: str = 'string') -> Any:
        """
        Get setting with priority: Database > Environment > Default
        
        Supported Types:
        - string: Text values
        - integer: Numeric values
        - boolean: True/False values
        - float: Decimal values
        """
        
        # 1. Check database settings (admin configurable)
        cls._refresh_cache()
        if key in cls._cache:
            return cls._convert_type(cls._cache[key], data_type)
        
        # 2. Check environment variables
        env_value = os.getenv(key.upper())
        if env_value is not None:
            return cls._convert_type(env_value, data_type)
        
        # 3. Return default value
        return default
```

#### Validation Settings Helper

```python
def get_validation_setting(key: str, default: Any, data_type: str = 'string') -> Any:
    """
    Get validation-specific settings with fallbacks
    
    Usage:
    - Password length limits
    - Phone number formats
    - File upload restrictions
    - Rate limiting values
    """

# Usage examples
min_password_length = get_validation_setting('password_min_length', 6, 'integer')
max_file_size = get_validation_setting('max_upload_size', 16777216, 'integer')
allowed_extensions = get_validation_setting('allowed_file_types', 'jpg,png,pdf', 'string').split(',')
```

#### Settings Categories

```python
# User Authentication Settings
MAX_LOGIN_ATTEMPTS = get_validation_setting('max_login_attempts', 5, 'integer')
LOCKOUT_DURATION = get_validation_setting('lockout_duration_minutes', 30, 'integer')

# Medical Data Settings  
MAX_VITAL_SIGNS_PER_REQUEST = get_validation_setting('max_vital_signs_per_request', 10, 'integer')
PRESCRIPTION_EXPIRY_DAYS = get_validation_setting('prescription_expiry_days', 90, 'integer')

# Communication Settings
EMAIL_NOTIFICATIONS_ENABLED = get_validation_setting('email_notifications_enabled', True, 'boolean')
SMS_NOTIFICATIONS_ENABLED = get_validation_setting('sms_notifications_enabled', True, 'boolean')

# Platform Settings
MAINTENANCE_MODE = get_validation_setting('maintenance_mode', False, 'boolean')
REGISTRATION_ENABLED = get_validation_setting('registration_enabled', True, 'boolean')
```

### 6. Health Monitoring System
**Location**: `backend/utils/health_check.py`

Comprehensive application health monitoring for system reliability:

#### Health Check Components

```python
class HealthChecker:
    @staticmethod
    def check_database():
        """
        Database connectivity and performance monitoring
        
        Tests:
        - Connection establishment
        - Query execution
        - Response time measurement
        - Table accessibility
        """
        
        return {
            "status": "healthy",
            "response_time_ms": 25.4,
            "user_count": 1250,
            "last_check": "2025-01-15T10:30:45Z"
        }
    
    @staticmethod
    def check_external_services():
        """
        External service availability monitoring
        
        Services:
        - Email service (SMTP)
        - SMS service (Africa's Talking)
        - File storage
        - Third-party APIs
        """
    
    @staticmethod
    def check_system_resources():
        """
        System resource utilization monitoring
        
        Metrics:
        - CPU usage
        - Memory consumption
        - Disk space
        - Network connectivity
        """
        
        return {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
            "load_average": os.getloadavg()[0] if hasattr(os, 'getloadavg') else None
        }
```

#### Complete Health Check

```python
@staticmethod
def comprehensive_health_check():
    """
    Complete system health assessment
    
    Returns:
    - Overall system status
    - Individual component statuses  
    - Performance metrics
    - Issue recommendations
    """
    
    health_data = {
        "overall_status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "components": {
            "database": HealthChecker.check_database(),
            "external_services": HealthChecker.check_external_services(),
            "system_resources": HealthChecker.check_system_resources()
        },
        "uptime": HealthChecker.get_uptime(),
        "version": current_app.config.get('VERSION', 'unknown')
    }
    
    return health_data
```

#### Usage in API Endpoints

```python
# Health check endpoint
@app.route('/health')
def health_check():
    """Public health check endpoint"""
    health_data = HealthChecker.comprehensive_health_check()
    
    if health_data['overall_status'] == 'healthy':
        return APIResponse.success(data=health_data)
    else:
        return APIResponse.error(
            message="System health issues detected",
            status_code=503,
            details=health_data
        )
```

### 7. Error Handling System  
**Location**: `backend/utils/error_handlers.py`

Global error handling and standardized error responses:

#### Error Handler Registration

```python
def register_error_handlers(app):
    """Register global error handlers for Flask application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        return APIResponse.error(
            message=error.description or "Bad request",
            status_code=400,
            error_code="BAD_REQUEST"
        )
    
    @app.errorhandler(401) 
    def unauthorized(error):
        """Handle 401 Unauthorized errors"""
        return APIResponse.unauthorized(
            message=error.description or "Authentication required"
        )
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        return APIResponse.not_found(
            resource=request.endpoint or "Resource",
            message="The requested resource was not found"
        )
```

#### Database Error Handling

```python
@app.errorhandler(SQLAlchemyError)
def database_error(error):
    """Handle SQLAlchemy database errors"""
    
    error_id = str(uuid.uuid4())
    
    db_logger.error(f"Database error {error_id}: {str(error)}", extra={
        'error_id': error_id,
        'endpoint': request.endpoint,
        'method': request.method
    })
    
    # Rollback any pending transaction
    db.session.rollback()
    
    return APIResponse.internal_error(
        message="Database operation failed. Please try again."
    )
```

#### Exception Handling

```python
@app.errorhandler(Exception)
def handle_unexpected_error(error):
    """Handle unexpected application errors"""
    
    error_id = str(uuid.uuid4())
    
    app_logger.critical(f"Unexpected error {error_id}: {str(error)}", extra={
        'error_id': error_id,
        'traceback': traceback.format_exc(),
        'endpoint': request.endpoint,
        'method': request.method,
        'user_id': getattr(current_user, 'id', None) if current_user.is_authenticated else None
    })
    
    # In development, return full error details
    if current_app.debug:
        return APIResponse.internal_error(
            message=f"Unexpected error occurred: {str(error)}",
            details={'error_id': error_id, 'type': type(error).__name__}
        )
    
    # In production, return generic error message
    return APIResponse.internal_error(
        message="An unexpected error occurred. Please try again later."
    )
```

### 8. Database Optimization Utilities
**Location**: `backend/utils/db_optimize.py`

Advanced database performance optimization and monitoring:

#### Query Caching System

```python
class QueryCache:
    """In-memory cache for database queries"""
    
    def __init__(self, default_ttl=300):
        self.cache = {}
        self.default_ttl = default_ttl  # 5 minutes default
    
    def get(self, key):
        """Retrieve cached query result"""
        if key in self.cache:
            entry = self.cache[key]
            if time.time() < entry['expires']:
                return entry['data']
            else:
                del self.cache[key]
        return None
    
    def set(self, key, data, ttl=None):
        """Cache query result with TTL"""
        expires = time.time() + (ttl or self.default_ttl)
        self.cache[key] = {
            'data': data,
            'expires': expires,
            'created': time.time()
        }
```

#### Query Performance Monitoring

```python
@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Monitor query execution start time"""
    context._query_start_time = time.time()

@event.listens_for(Engine, "after_cursor_execute") 
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Monitor query execution completion and performance"""
    total = time.time() - context._query_start_time
    
    # Log slow queries (> 1 second)
    if total > 1.0:
        app_logger.warning(f"Slow query detected: {total:.3f}s", extra={
            'query': statement[:200],
            'execution_time': total,
            'parameters': str(parameters)[:100] if parameters else None
        })
```

#### Database Connection Optimization

```python
class DatabaseOptimizer:
    @staticmethod
    def optimize_connection_pool():
        """Optimize database connection pool settings"""
        return {
            'pool_size': 10,
            'max_overflow': 20,
            'pool_timeout': 30,
            'pool_recycle': 3600,
            'pool_pre_ping': True
        }
    
    @staticmethod
    def get_query_statistics():
        """Get database query performance statistics"""
        return {
            'total_queries': db.engine.pool.checkedin(),
            'active_connections': db.engine.pool.checkedout(),
            'pool_size': db.engine.pool.size(),
            'checked_in': db.engine.pool.checkedin(),
            'checked_out': db.engine.pool.checkedout(),
            'overflow': db.engine.pool.overflow(),
            'invalid': db.engine.pool.invalid()
        }
```

---

## Utility Integration and Usage Patterns

### 1. Standard API Endpoint Pattern

```python
from utils.responses import APIResponse
from utils.validators import validate_email, validate_password
from utils.logging_config import api_logger
from utils.settings_manager import get_validation_setting

@app.route('/api/users', methods=['POST'])
@api_login_required
def create_user():
    """Standard API endpoint using multiple utilities"""
    
    try:
        data = request.get_json()
        
        # Input validation using validators
        if not validate_email(data.get('email')):
            return APIResponse.validation_error(
                field='email',
                message='Invalid email format'
            )
        
        password_validation = validate_password(data.get('password'))
        if not password_validation['valid']:
            return APIResponse.validation_error(
                field='password',
                message=password_validation['message']
            )
        
        # Use settings for business rules
        max_users = get_validation_setting('max_users_per_clinic', 100, 'integer')
        current_count = User.query.count()
        
        if current_count >= max_users:
            return APIResponse.conflict(
                message='Maximum user limit reached',
                details={'limit': max_users, 'current': current_count}
            )
        
        # Create user
        user = User(
            email=data['email'],
            full_name=data['full_name'],
            user_type=data.get('user_type', 'patient')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Log successful creation
        api_logger.info(f"User created successfully: {user.id}")
        
        return APIResponse.success(
            data=user.to_dict(),
            message="User created successfully",
            status_code=201
        )
        
    except Exception as e:
        api_logger.error(f"User creation failed: {str(e)}")
        return APIResponse.internal_error(
            message="Failed to create user"
        )
```

### 2. Authentication Flow Integration

```python
from utils.jwt_helper import JWTHelper
from utils.validators import validate_email, validate_phone
from utils.responses import APIResponse
from utils.logging_config import auth_logger, log_user_action

@app.route('/auth/login', methods=['POST'])
def login():
    """Login using multiple utility integrations"""
    
    try:
        data = request.get_json()
        login_identifier = data.get('login_identifier', '').strip()
        password = data.get('password')
        
        # Validate input using validators
        user = None
        if validate_email(login_identifier):
            user = User.query.filter_by(email=login_identifier.lower()).first()
        elif validate_phone(login_identifier)['valid']:
            # Search in patient and doctor profiles
            user = find_user_by_phone(login_identifier)
        
        if not user or not user.check_password(password):
            # Log failed attempt
            auth_logger.warning("Failed login attempt", extra={
                'login_identifier': login_identifier,
                'ip_address': request.remote_addr
            })
            
            return APIResponse.unauthorized(
                message='Invalid email/phone or password'
            )
        
        # Generate JWT token
        token_data = {
            'user_id': user.id,
            'user_type': user.user_type,
            'email': user.email
        }
        
        # Use configurable token expiration
        token_hours = get_validation_setting('jwt_expiration_hours', 24, 'integer')
        access_token = JWTHelper.generate_token(token_data, expires_in=token_hours)
        
        # Log successful login
        log_user_action(
            user_id=user.id,
            action='login_success',
            details={'method': 'email_phone'},
            request_obj=request
        )
        
        return APIResponse.success(
            data={
                'user': user.to_dict(),
                'access_token': access_token
            },
            message='Login successful'
        )
        
    except Exception as e:
        auth_logger.error(f"Login error: {str(e)}")
        return APIResponse.internal_error(message='Login failed')
```

### 3. Health Monitoring Integration

```python
from utils.health_check import HealthChecker
from utils.responses import APIResponse
from utils.logging_config import app_logger

@app.route('/health/detailed')
@admin_required
def detailed_health_check():
    """Detailed health check using health monitoring utilities"""
    
    try:
        # Get comprehensive health data
        health_data = HealthChecker.comprehensive_health_check()
        
        # Add custom application metrics
        health_data['application_metrics'] = {
            'active_users': User.query.filter_by(is_online=True).count(),
            'total_appointments_today': get_today_appointments_count(),
            'system_load': get_system_load_metrics()
        }
        
        # Determine overall status
        overall_healthy = all(
            component.get('status') == 'healthy' 
            for component in health_data['components'].values()
        )
        
        if overall_healthy:
            return APIResponse.success(
                data=health_data,
                message="System is healthy"
            )
        else:
            app_logger.warning("System health issues detected", extra={
                'health_data': health_data
            })
            
            return APIResponse.error(
                message="System health issues detected",
                status_code=503,
                details=health_data
            )
            
    except Exception as e:
        app_logger.error(f"Health check failed: {str(e)}")
        return APIResponse.internal_error(
            message="Health check failed"
        )
```

---

## Configuration and Environment Setup

### 1. Utility Configuration in app.py

```python
# app.py - Utility integration setup
from utils.logging_config import SahatakLogger
from utils.error_handlers import register_error_handlers
from utils.settings_manager import SettingsManager

def create_app():
    app = Flask(__name__)
    
    # Setup logging first
    SahatakLogger.setup_logging(app, log_level=os.getenv('LOG_LEVEL', 'INFO'))
    
    # Register global error handlers
    register_error_handlers(app)
    
    # Initialize settings manager
    SettingsManager.initialize(app)
    
    return app
```

### 2. Environment Variables for Utilities

```bash
# .env configuration for utilities

# Logging Configuration
LOG_LEVEL=INFO
LOG_ROTATION_SIZE=10MB
LOG_RETENTION_DAYS=30

# JWT Configuration  
JWT_EXPIRATION_HOURS=24
JWT_ALGORITHM=HS256

# Validation Settings
PASSWORD_MIN_LENGTH=6
PASSWORD_MAX_LENGTH=128
PHONE_MIN_LENGTH=10
PHONE_MAX_LENGTH=15

# Health Check Settings
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=300

# Database Optimization
QUERY_CACHE_TTL=300
SLOW_QUERY_THRESHOLD=1.0
DB_POOL_SIZE=10
DB_POOL_MAX_OVERFLOW=20

# Performance Monitoring
ENABLE_QUERY_LOGGING=true
ENABLE_PERFORMANCE_MONITORING=true
```

### 3. Database Settings Integration

The utilities support database-configurable settings that override environment variables:

```sql
-- Example database settings that override .env values
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('password_min_length', '8', 'integer', 'Minimum password length requirement'),
('jwt_expiration_hours', '48', 'integer', 'JWT token expiration in hours'),
('max_login_attempts', '3', 'integer', 'Maximum failed login attempts'),
('health_check_interval', '600', 'integer', 'Health check interval in seconds');
```

---

## Best Practices and Guidelines

### 1. Error Handling Best Practices

```python
# Always use try-except blocks with specific error types
try:
    result = some_database_operation()
    return APIResponse.success(data=result)
except ValidationError as e:
    return APIResponse.validation_error(field=e.field, message=e.message)
except SQLAlchemyError as e:
    db_logger.error(f"Database error: {str(e)}")
    return APIResponse.internal_error(message="Database operation failed")
except Exception as e:
    app_logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    return APIResponse.internal_error()
```

### 2. Logging Best Practices

```python
# Use appropriate log levels
auth_logger.debug("User authentication check started")    # Development info
auth_logger.info("User logged in successfully")          # Normal operations  
auth_logger.warning("Failed login attempt detected")     # Potential issues
auth_logger.error("Authentication service unavailable")  # Error conditions
auth_logger.critical("Security breach detected")         # Critical issues

# Include contextual information
auth_logger.info("User login", extra={
    'user_id': user.id,
    'ip_address': request.remote_addr,
    'user_agent': request.headers.get('User-Agent'),
    'timestamp': datetime.utcnow().isoformat()
})
```

### 3. Validation Best Practices

```python
# Always validate input data
def validate_medical_data(data):
    """Comprehensive medical data validation"""
    errors = []
    
    # Use utility validators
    if not validate_age(data.get('age')):
        errors.append({'field': 'age', 'message': 'Invalid age range'})
    
    # Use medical-specific validation
    vital_validation = validate_vital_signs_ranges(data.get('vitals', {}))
    if not vital_validation['valid']:
        errors.append({'field': 'vitals', 'message': vital_validation['message']})
    
    return {'valid': len(errors) == 0, 'errors': errors}
```

### 4. Settings Management Best Practices

```python
# Use settings manager for all configurable values
from utils.settings_manager import get_validation_setting

# Don't hardcode limits
MAX_FILE_SIZE = 16777216  # Bad

# Use configurable settings
MAX_FILE_SIZE = get_validation_setting('max_file_size', 16777216, 'integer')  # Good

# Group related settings
class AppConfig:
    # Authentication settings
    MAX_LOGIN_ATTEMPTS = get_validation_setting('max_login_attempts', 5, 'integer')
    LOCKOUT_DURATION = get_validation_setting('lockout_duration_minutes', 30, 'integer')
    
    # File upload settings
    MAX_FILE_SIZE = get_validation_setting('max_file_size', 16777216, 'integer')
    ALLOWED_EXTENSIONS = get_validation_setting('allowed_extensions', 'jpg,png,pdf', 'string').split(',')
```

---

## Summary

The Sahatak backend utilities provide a robust foundation for the telemedicine platform with:

### Core Capabilities:
1. **Standardized API Responses**: Consistent JSON responses with proper error handling
2. **Comprehensive Validation**: Input validation for medical and user data
3. **Advanced Logging**: Structured logging with contextual information and monitoring
4. **JWT Authentication**: Secure token generation and validation
5. **Configuration Management**: Priority-based settings with database override capability
6. **Health Monitoring**: System resource and service health monitoring
7. **Error Management**: Global error handling with proper logging and user feedback
8. **Database Optimization**: Query caching and performance monitoring

### Key Benefits:
- **Developer Productivity**: Reusable utilities reduce code duplication
- **System Reliability**: Comprehensive error handling and monitoring
- **Security**: Input validation and secure authentication mechanisms  
- **Maintainability**: Centralized configuration and logging systems
- **Performance**: Caching and query optimization utilities
- **Monitoring**: Health checks and performance tracking
- **Scalability**: Optimized database connections and resource management

### File Locations:
- **API Responses**: `backend/utils/responses.py`
- **Input Validation**: `backend/utils/validators.py`
- **Logging System**: `backend/utils/logging_config.py`
- **JWT Authentication**: `backend/utils/jwt_helper.py`
- **Settings Management**: `backend/utils/settings_manager.py`
- **Health Monitoring**: `backend/utils/health_check.py`
- **Error Handling**: `backend/utils/error_handlers.py`
- **Database Optimization**: `backend/utils/db_optimize.py`

These utilities form the backbone of the Sahatak platform, ensuring reliable, secure, and maintainable medical software that can handle the critical requirements of healthcare applications.