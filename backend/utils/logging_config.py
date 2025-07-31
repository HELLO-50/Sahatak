import logging
import logging.handlers
import os
from datetime import datetime
from pathlib import Path
import json

class CustomJSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""
    
    def format(self, record):
        """Format log record as JSON"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields if present
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address
            
        return json.dumps(log_entry)

class SahatakLogger:
    """Centralized logging configuration for Sahatak application"""
    
    @staticmethod
    def setup_logging(app=None, log_level='INFO'):
        """
        Setup comprehensive logging configuration
        
        Args:
            app: Flask application instance
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        # Create logs directory if it doesn't exist
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, log_level.upper()))
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # Console Handler (for development)
        console_handler = logging.StreamHandler()
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        console_handler.setLevel(logging.INFO)
        
        # File Handler for general application logs
        app_file_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'sahatak_app.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        app_file_handler.setFormatter(CustomJSONFormatter())
        app_file_handler.setLevel(logging.INFO)
        
        # File Handler for error logs
        error_file_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'sahatak_errors.log',
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=10
        )
        error_file_handler.setFormatter(CustomJSONFormatter())
        error_file_handler.setLevel(logging.ERROR)
        
        # File Handler for authentication events
        auth_file_handler = logging.handlers.RotatingFileHandler(
            log_dir / 'sahatak_auth.log',
            maxBytes=5 * 1024 * 1024,  # 5MB
            backupCount=5
        )
        auth_file_handler.setFormatter(CustomJSONFormatter())
        auth_file_handler.setLevel(logging.INFO)
        
        # Add handlers to root logger
        root_logger.addHandler(console_handler)
        root_logger.addHandler(app_file_handler)
        root_logger.addHandler(error_file_handler)
        
        # Setup specific loggers
        auth_logger = logging.getLogger('sahatak.auth')
        auth_logger.addHandler(auth_file_handler)
        auth_logger.setLevel(logging.INFO)
        
        # Setup Flask app logger if provided
        if app:
            app.logger.handlers.clear()
            app.logger.addHandler(app_file_handler)
            app.logger.addHandler(error_file_handler)
            app.logger.setLevel(logging.INFO)
            
            # Configure Flask's internal loggers
            logging.getLogger('werkzeug').setLevel(logging.WARNING)
            logging.getLogger('urllib3').setLevel(logging.WARNING)
        
        # Log startup message
        logger = logging.getLogger('sahatak.startup')
        logger.info("Logging system initialized", extra={
            'log_level': log_level,
            'log_directory': str(log_dir.absolute())
        })
    
    @staticmethod
    def get_logger(name):
        """Get a configured logger instance"""
        return logging.getLogger(f'sahatak.{name}')

# Pre-configured logger instances
app_logger = SahatakLogger.get_logger('app')
auth_logger = SahatakLogger.get_logger('auth')
db_logger = SahatakLogger.get_logger('database')
api_logger = SahatakLogger.get_logger('api')

def log_user_action(user_id, action, details=None, request=None):
    """
    Log user actions for audit trail
    
    Args:
        user_id: ID of the user performing the action
        action: Action being performed
        details: Additional details about the action
        request: Flask request object for IP address
    """
    extra = {
        'user_id': user_id,
        'action': action
    }
    
    if details:
        extra['details'] = details
        
    if request:
        extra['ip_address'] = request.remote_addr
        extra['user_agent'] = request.headers.get('User-Agent')
    
    auth_logger.info(f"User action: {action}", extra=extra)

def log_api_request(request, response_status=None, user_id=None):
    """
    Log API requests for monitoring
    
    Args:
        request: Flask request object
        response_status: HTTP response status code
        user_id: ID of authenticated user (if any)
    """
    extra = {
        'method': request.method,
        'endpoint': request.endpoint,
        'path': request.path,
        'ip_address': request.remote_addr,
        'user_agent': request.headers.get('User-Agent')
    }
    
    if response_status:
        extra['response_status'] = response_status
        
    if user_id:
        extra['user_id'] = user_id
    
    api_logger.info(f"{request.method} {request.path}", extra=extra)

def log_database_error(operation, error, table=None, user_id=None):
    """
    Log database errors
    
    Args:
        operation: Database operation that failed
        error: Error details
        table: Database table involved
        user_id: User ID if applicable
    """
    extra = {
        'operation': operation,
        'error_type': type(error).__name__,
        'error_message': str(error)
    }
    
    if table:
        extra['table'] = table
        
    if user_id:
        extra['user_id'] = user_id
    
    db_logger.error(f"Database error in {operation}", extra=extra)