import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Mail configuration
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv('MAIL_USERNAME')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@sahatak.com')
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # File upload configuration
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB default
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads'))
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS', 'png,jpg,jpeg,gif,pdf,doc,docx').split(','))
    
    # Pagination
    POSTS_PER_PAGE = int(os.getenv('POSTS_PER_PAGE', 20))
    MAX_PAGE_SIZE = int(os.getenv('MAX_PAGE_SIZE', 100))
    
    # Language settings
    LANGUAGES = os.getenv('LANGUAGES', 'ar,en').split(',')
    DEFAULT_LANGUAGE = os.getenv('DEFAULT_LANGUAGE', 'ar')
    
    # Validation settings
    PASSWORD_MIN_LENGTH = int(os.getenv('PASSWORD_MIN_LENGTH', 6))
    PASSWORD_MAX_LENGTH = int(os.getenv('PASSWORD_MAX_LENGTH', 128))
    PHONE_MIN_LENGTH = int(os.getenv('PHONE_MIN_LENGTH', 10))
    PHONE_MAX_LENGTH = int(os.getenv('PHONE_MAX_LENGTH', 15))
    NAME_MIN_LENGTH = int(os.getenv('NAME_MIN_LENGTH', 2))
    NAME_MAX_LENGTH = int(os.getenv('NAME_MAX_LENGTH', 100))
    
    # Session settings
    SESSION_TIMEOUT_MINUTES = int(os.getenv('SESSION_TIMEOUT_MINUTES', 15))
    AUTO_LOGOUT_WARNING_MINUTES = int(os.getenv('AUTO_LOGOUT_WARNING_MINUTES', 2))
    SESSION_COOKIE_SECURE = False  # Allow HTTP during development
    SESSION_COOKIE_HTTPONLY = False  # Allow JavaScript access
    SESSION_COOKIE_SAMESITE = None   # Allow cross-origin
    REMEMBER_COOKIE_SECURE = False
    REMEMBER_COOKIE_HTTPONLY = False
    REMEMBER_COOKIE_SAMESITE = None
    
    # Rate limiting settings
    MAX_LOGIN_ATTEMPTS = int(os.getenv('MAX_LOGIN_ATTEMPTS', 5))
    LOCKOUT_DURATION_MINUTES = int(os.getenv('LOCKOUT_DURATION_MINUTES', 30))
    
    # Notification settings
    MAX_NOTIFICATION_ATTEMPTS = int(os.getenv('MAX_NOTIFICATION_ATTEMPTS', 3))
    NOTIFICATION_RETRY_DELAY_SECONDS = int(os.getenv('NOTIFICATION_RETRY_DELAY_SECONDS', 60))
    
    # Medical settings
    MAX_VITAL_SIGNS_PER_REQUEST = int(os.getenv('MAX_VITAL_SIGNS_PER_REQUEST', 10))
    MAX_PRESCRIPTIONS_PER_REQUEST = int(os.getenv('MAX_PRESCRIPTIONS_PER_REQUEST', 20))

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = False
    # For development, use SQLite as fallback (no sensitive credentials)
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///sahatak_dev.db')
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # MySQL Database configuration for PythonAnywhere
    # Note: DATABASE_URL must be set in .env file for production
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    # MySQL specific settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_timeout': 20,
        'max_overflow': 0
    }
    
    # Production security settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CORS settings
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'https://hello-50.github.io,https://hello-50.github.io/Sahatak,https://hmb104.github.io,https://hmb104.github.io/Sahatak').split(',')

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}