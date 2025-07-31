from flask import jsonify
from datetime import datetime
from typing import Any, Dict, Optional, Union

class APIResponse:
    """Standardized API response formatter for consistent responses across the application"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = "Operation successful",
        status_code: int = 200,
        meta: Optional[Dict] = None
    ) -> tuple:
        """
        Create a successful API response
        
        Args:
            data: Response data (can be dict, list, or any serializable object)
            message: Success message
            status_code: HTTP status code
            meta: Additional metadata (pagination, etc.)
            
        Returns:
            tuple: (response_dict, status_code)
        """
        response = {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code
        }
        
        if data is not None:
            response["data"] = data
            
        if meta:
            response["meta"] = meta
            
        return jsonify(response), status_code
    
    @staticmethod
    def error(
        message: str = "An error occurred",
        status_code: int = 400,
        error_code: Optional[str] = None,
        details: Optional[Dict] = None,
        field: Optional[str] = None
    ) -> tuple:
        """
        Create an error API response
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_code: Application-specific error code
            details: Additional error details
            field: Field name that caused the error (for validation errors)
            
        Returns:
            tuple: (response_dict, status_code)
        """
        response = {
            "success": False,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
            "status_code": status_code
        }
        
        if error_code:
            response["error_code"] = error_code
            
        if details:
            response["details"] = details
            
        if field:
            response["field"] = field
            
        return jsonify(response), status_code
    
    @staticmethod
    def validation_error(
        field: str,
        message: str,
        details: Optional[Dict] = None
    ) -> tuple:
        """
        Create a validation error response
        
        Args:
            field: Field name that failed validation
            message: Validation error message
            details: Additional validation details
            
        Returns:
            tuple: (response_dict, status_code)
        """
        return APIResponse.error(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            field=field,
            details=details
        )
    
    @staticmethod
    def not_found(
        resource: str = "Resource",
        resource_id: Optional[Union[int, str]] = None
    ) -> tuple:
        """
        Create a not found error response
        
        Args:
            resource: Name of the resource that wasn't found
            resource_id: ID of the resource that wasn't found
            
        Returns:
            tuple: (response_dict, status_code)
        """
        message = f"{resource} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
            
        return APIResponse.error(
            message=message,
            status_code=404,
            error_code="NOT_FOUND"
        )
    
    @staticmethod
    def unauthorized(
        message: str = "Authentication required"
    ) -> tuple:
        """
        Create an unauthorized error response
        
        Args:
            message: Unauthorized error message
            
        Returns:
            tuple: (response_dict, status_code)
        """
        return APIResponse.error(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED"
        )
    
    @staticmethod
    def forbidden(
        message: str = "Access denied"
    ) -> tuple:
        """
        Create a forbidden error response
        
        Args:
            message: Forbidden error message
            
        Returns:
            tuple: (response_dict, status_code)
        """
        return APIResponse.error(
            message=message,
            status_code=403,
            error_code="FORBIDDEN"
        )
    
    @staticmethod
    def conflict(
        message: str = "Resource already exists",
        field: Optional[str] = None
    ) -> tuple:
        """
        Create a conflict error response
        
        Args:
            message: Conflict error message
            field: Field that caused the conflict
            
        Returns:
            tuple: (response_dict, status_code)
        """
        return APIResponse.error(
            message=message,
            status_code=409,
            error_code="CONFLICT",
            field=field
        )
    
    @staticmethod
    def internal_error(
        message: str = "Internal server error",
        error_id: Optional[str] = None
    ) -> tuple:
        """
        Create an internal server error response
        
        Args:
            message: Error message
            error_id: Unique error ID for tracking
            
        Returns:
            tuple: (response_dict, status_code)
        """
        details = {}
        if error_id:
            details["error_id"] = error_id
            
        return APIResponse.error(
            message=message,
            status_code=500,
            error_code="INTERNAL_ERROR",
            details=details if details else None
        )
    
    @staticmethod
    def paginated_success(
        items: list,
        page: int,
        per_page: int,
        total: int,
        message: str = "Data retrieved successfully"
    ) -> tuple:
        """
        Create a paginated success response
        
        Args:
            items: List of items for current page
            page: Current page number
            per_page: Items per page
            total: Total number of items
            message: Success message
            
        Returns:
            tuple: (response_dict, status_code)
        """
        total_pages = (total + per_page - 1) // per_page  # Ceiling division
        
        meta = {
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
        return APIResponse.success(
            data=items,
            message=message,
            meta=meta
        )

class ErrorCodes:
    """Application-specific error codes"""
    
    # Authentication & Authorization
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_EMAIL = "INVALID_EMAIL"
    INVALID_PASSWORD = "INVALID_PASSWORD"
    INVALID_PHONE = "INVALID_PHONE"
    
    # User Management
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    USER_INACTIVE = "USER_INACTIVE"
    USER_NOT_VERIFIED = "USER_NOT_VERIFIED"
    
    # Medical
    DOCTOR_NOT_FOUND = "DOCTOR_NOT_FOUND"
    DOCTOR_NOT_VERIFIED = "DOCTOR_NOT_VERIFIED"
    APPOINTMENT_NOT_FOUND = "APPOINTMENT_NOT_FOUND"
    APPOINTMENT_CONFLICT = "APPOINTMENT_CONFLICT"
    
    # System
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR"