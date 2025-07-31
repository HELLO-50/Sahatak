from flask import request, current_app
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from utils.responses import APIResponse
from utils.logging_config import app_logger, db_logger
import uuid
import traceback

def register_error_handlers(app):
    """Register global error handlers for the Flask application"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors"""
        app_logger.warning(f"Bad request: {error.description}", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message=error.description or "Bad request",
            status_code=400,
            error_code="BAD_REQUEST"
        )
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors"""
        app_logger.warning("Unauthorized access attempt", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        })
        
        return APIResponse.unauthorized(
            message=error.description or "Authentication required"
        )
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors"""
        app_logger.warning("Forbidden access attempt", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.forbidden(
            message=error.description or "Access denied"
        )
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors"""
        # Don't log 404s for static files or common paths
        if not request.path.startswith('/api/'):
            return APIResponse.not_found("Endpoint")
            
        app_logger.info(f"API endpoint not found: {request.path}", extra={
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.not_found("Endpoint")
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors"""
        app_logger.warning(f"Method not allowed: {request.method} {request.path}", extra={
            'allowed_methods': error.valid_methods,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message=f"Method {request.method} not allowed for this endpoint",
            status_code=405,
            error_code="METHOD_NOT_ALLOWED",
            details={"allowed_methods": list(error.valid_methods) if error.valid_methods else []}
        )
    
    @app.errorhandler(409)
    def conflict(error):
        """Handle 409 Conflict errors"""
        app_logger.warning(f"Conflict error: {error.description}", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.conflict(
            message=error.description or "Resource conflict"
        )
    
    @app.errorhandler(413)
    def payload_too_large(error):
        """Handle 413 Payload Too Large errors"""
        app_logger.warning("Payload too large", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr,
            'content_length': request.headers.get('Content-Length')
        })
        
        return APIResponse.error(
            message="File or payload too large",
            status_code=413,
            error_code="PAYLOAD_TOO_LARGE"
        )
    
    @app.errorhandler(415)
    def unsupported_media_type(error):
        """Handle 415 Unsupported Media Type errors"""
        app_logger.warning("Unsupported media type", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'content_type': request.headers.get('Content-Type'),
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message="Unsupported media type",
            status_code=415,
            error_code="UNSUPPORTED_MEDIA_TYPE"
        )
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """Handle 422 Unprocessable Entity errors"""
        app_logger.warning(f"Unprocessable entity: {error.description}", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message=error.description or "Unprocessable entity",
            status_code=422,
            error_code="UNPROCESSABLE_ENTITY"
        )
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle 429 Too Many Requests errors"""
        app_logger.warning("Rate limit exceeded", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message="Rate limit exceeded. Please try again later.",
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED"
        )
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error"""
        error_id = str(uuid.uuid4())
        
        app_logger.error("Internal server error", extra={
            'error_id': error_id,
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr,
            'error_message': str(error),
            'traceback': traceback.format_exc()
        })
        
        return APIResponse.internal_error(
            message="An internal error occurred. Please try again later.",
            error_id=error_id
        )
    
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
    
    @app.errorhandler(ValueError)
    def value_error(error):
        """Handle ValueError exceptions (usually validation related)"""
        app_logger.warning(f"Value error: {str(error)}", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.validation_error(
            field="unknown",
            message=str(error)
        )
    
    @app.errorhandler(KeyError)
    def key_error(error):
        """Handle KeyError exceptions (missing required data)"""
        missing_key = str(error).strip("'\"")
        
        app_logger.warning(f"Missing required field: {missing_key}", extra={
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.validation_error(
            field=missing_key,
            message=f"Required field '{missing_key}' is missing"
        )
    
    @app.errorhandler(HTTPException)
    def http_exception(error):
        """Handle other HTTP exceptions"""
        app_logger.warning(f"HTTP exception: {error.code} - {error.description}", extra={
            'status_code': error.code,
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr
        })
        
        return APIResponse.error(
            message=error.description or f"HTTP Error {error.code}",
            status_code=error.code,
            error_code=f"HTTP_{error.code}"
        )
    
    @app.errorhandler(Exception)
    def generic_exception(error):
        """Handle all other unhandled exceptions"""
        error_id = str(uuid.uuid4())
        
        app_logger.error("Unhandled exception", extra={
            'error_id': error_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'endpoint': request.endpoint,
            'method': request.method,
            'ip_address': request.remote_addr,
            'traceback': traceback.format_exc()
        })
        
        # In development, show the actual error
        if current_app.config.get('DEBUG'):
            return APIResponse.internal_error(
                message=f"Unhandled error: {str(error)}",
                error_id=error_id
            )
        
        return APIResponse.internal_error(
            message="An unexpected error occurred. Please try again later.",
            error_id=error_id
        )

class RequestValidationError(Exception):
    """Custom exception for request validation errors"""
    
    def __init__(self, message, field=None, details=None):
        self.message = message
        self.field = field
        self.details = details
        super().__init__(self.message)

class BusinessLogicError(Exception):
    """Custom exception for business logic errors"""
    
    def __init__(self, message, error_code=None, status_code=400):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

def register_custom_error_handlers(app):
    """Register custom error handlers"""
    
    @app.errorhandler(RequestValidationError)
    def request_validation_error(error):
        """Handle custom request validation errors"""
        return APIResponse.validation_error(
            field=error.field or "unknown",
            message=error.message,
            details=error.details
        )
    
    @app.errorhandler(BusinessLogicError)
    def business_logic_error(error):
        """Handle custom business logic errors"""
        return APIResponse.error(
            message=error.message,
            status_code=error.status_code,
            error_code=error.error_code
        )