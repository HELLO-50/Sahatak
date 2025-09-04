"""
JWT Token Helper - Secure token generation and validation
"""
import jwt
import datetime
from datetime import timedelta
from flask import current_app
from functools import wraps
from flask import request, jsonify

class JWTHelper:
    """Helper class for JWT token operations"""
    
    @staticmethod
    def generate_token(user_data, expires_in=24):
        """
        Generate a secure JWT token
        
        Args:
            user_data: Dictionary containing user information
            expires_in: Token expiration time in hours (default 24)
        
        Returns:
            str: Encoded JWT token
        """
        try:
            # Get secret key from app config or environment
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key-change-in-production')
            
            # Create token payload
            payload = {
                'user_id': user_data.get('user_id'),
                'user_type': user_data.get('user_type'),
                'email': user_data.get('email'),
                'exp': datetime.datetime.utcnow() + timedelta(hours=expires_in),
                'iat': datetime.datetime.utcnow(),
                'iss': 'sahatak-api'  # Issuer
            }
            
            # Generate token with HS256 algorithm
            token = jwt.encode(payload, secret_key, algorithm='HS256')
            
            return token
            
        except Exception as e:
            current_app.logger.error(f"JWT generation error: {str(e)}")
            return None
    
    @staticmethod
    def decode_token(token):
        """
        Decode and validate a JWT token
        
        Args:
            token: JWT token string
        
        Returns:
            dict: Decoded token payload or None if invalid
        """
        try:
            secret_key = current_app.config.get('SECRET_KEY', 'default-secret-key-change-in-production')
            
            # Decode token with verification
            payload = jwt.decode(
                token, 
                secret_key, 
                algorithms=['HS256'],
                options={"verify_exp": True}
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            current_app.logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            current_app.logger.warning(f"Invalid JWT token: {str(e)}")
            return None
        except Exception as e:
            current_app.logger.error(f"JWT decode error: {str(e)}")
            return None
    
    @staticmethod
    def verify_token_request():
        """
        Verify JWT token from request headers
        
        Returns:
            tuple: (is_valid, payload)
        """
        try:
            # Get token from Authorization header
            auth_header = request.headers.get('Authorization')
            
            if not auth_header or not auth_header.startswith('Bearer '):
                return False, None
            
            # Extract token
            token = auth_header.split(' ')[1]
            
            # Decode and validate
            payload = JWTHelper.decode_token(token)
            
            if payload:
                return True, payload
            
            return False, None
            
        except Exception as e:
            current_app.logger.error(f"Token verification error: {str(e)}")
            return False, None


def jwt_required(f):
    """
    Decorator to require valid JWT token for routes
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        is_valid, payload = JWTHelper.verify_token_request()
        
        if not is_valid:
            return jsonify({
                'success': False,
                'message': 'Authentication required',
                'status_code': 401
            }), 401
        
        # Add user info to request context
        request.jwt_payload = payload
        return f(*args, **kwargs)
    
    return decorated_function