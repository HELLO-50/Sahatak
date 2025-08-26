from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_cors import CORS
from flask_mail import Mail
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Load configuration
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

# Override with environment variables if they exist
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', app.config['SECRET_KEY'])
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', app.config['SQLALCHEMY_DATABASE_URI'])
app.config['FRONTEND_URL'] = os.getenv('FRONTEND_URL', 'https://hello-50.github.io/Sahatak')

# Setup logging first (before other imports)
from utils.logging_config import SahatakLogger
SahatakLogger.setup_logging(app, log_level=os.getenv('LOG_LEVEL', 'INFO'))

from utils.logging_config import app_logger
app_logger.info("Starting Sahatak Telemedicine Platform API")

# Initialize extensions
from models import db
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# Initialize notification services
from services.email_service import email_service
from services.sms_service import sms_service
email_service.init_app(app)
sms_service.init_app(app)
app_logger.info("Notification services initialized")

# Configure CORS
CORS(app, 
     origins=[
         'http://localhost:3000', 
         'http://127.0.0.1:3000', 
         'http://localhost:8000', 
         'http://127.0.0.1:8000',
         'https://hmb104.github.io',
         'https://hmb104.github.io/Sahatak',
         'https://hello-50.github.io',
         'https://hello-50.github.io/Sahatak'
     ],
     allow_headers=['Content-Type', 'Authorization', 'Accept-Language'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     supports_credentials=True)

# Import models after db initialization
from models import User, Doctor, Patient, Appointment, Prescription, MedicalHistoryUpdate

# Import and register error handlers
from utils.error_handlers import register_error_handlers, register_custom_error_handlers
register_error_handlers(app)
register_custom_error_handlers(app)

# Import and register health check routes
from utils.health_check import create_health_routes
create_health_routes(app)

# Import and register API routes
from routes.auth import auth_bp
from routes.users import users_bp
from routes.appointments import appointments_bp
from routes.medical import medical_bp
from routes.ai_assessment import ai_bp
from routes.notifications import notifications_bp
from routes.prescriptions import prescriptions_bp
from routes.medical_history import medical_history_bp
from routes.user_settings import user_settings_bp
from routes.admin import admin_bp

# Register blueprints with logging
app_logger.info("Registering API blueprints")
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
app.register_blueprint(medical_bp, url_prefix='/api/medical')
app.register_blueprint(ai_bp, url_prefix='/api/ai')
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(prescriptions_bp, url_prefix='/api/prescriptions')
app.register_blueprint(medical_history_bp, url_prefix='/api/medical-history')
app.register_blueprint(user_settings_bp, url_prefix='/api/user-settings')
app.register_blueprint(admin_bp, url_prefix='/api/admin')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Add request logging middleware
from utils.logging_config import log_api_request

@app.before_request
def log_request_info():
    """Log API requests for monitoring"""
    if request.path.startswith('/api/'):
        user_id = None
        if hasattr(current_user, 'id') and current_user.is_authenticated:
            user_id = current_user.id
        log_api_request(request, user_id=user_id)

@app.after_request
def log_response_info(response):
    """Log API responses"""
    if request.path.startswith('/api/'):
        user_id = None
        if hasattr(current_user, 'id') and current_user.is_authenticated:
            user_id = current_user.id
        log_api_request(request, response_status=response.status_code, user_id=user_id)
    return response

# Import standardized response utility
from utils.responses import APIResponse

@app.route('/')
def index():
    """Root endpoint with API information"""
    return APIResponse.success(
        data={
            'service': 'Sahatak Telemedicine Platform API',
            'version': '1.0.0',
            'environment': app.config.get('FLASK_ENV', 'production'),
            'documentation': '/api/docs',
            'health_check': '/health',
            'supported_languages': ['ar', 'en']
        },
        message='Welcome to Sahatak Telemedicine Platform'
    )

@app.route('/api')
def api_info():
    """API information endpoint"""
    return APIResponse.success(
        data={
            'version': '1.0.0',
            'endpoints': {
                'authentication': '/api/auth',
                'users': '/api/users',
                'appointments': '/api/appointments',
                'medical': '/api/medical',
                'ai_assessment': '/api/ai'
            },
            'health_checks': {
                'basic': '/health',
                'detailed': '/health/detailed',
                'database': '/health/database'
            }
        },
        message='Sahatak API v1.0.0'
    )

if __name__ == '__main__':
    try:
        with app.app_context():
            app_logger.info("Creating database tables if they don't exist")
            db.create_all()
            app_logger.info("Database initialization complete")
        
        # Set start time for health checks
        app._start_time = datetime.utcnow().timestamp()
        
        # Start the application
        port = int(os.getenv('PORT', 5000))
        debug = os.getenv('FLASK_ENV') == 'development'
        
        app_logger.info(f"Starting Sahatak API server on port {port} (debug={debug})")
        app.run(debug=debug, host='0.0.0.0', port=port)
        
    except Exception as e:
        app_logger.error(f"Failed to start application: {str(e)}")
        raise