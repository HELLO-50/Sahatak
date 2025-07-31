from flask import current_app
from datetime import datetime, timedelta
from models import db, User
from utils.responses import APIResponse
from utils.logging_config import app_logger
import psutil
import os
import time

class HealthChecker:
    """Comprehensive health checking for Sahatak application"""
    
    @staticmethod
    def check_database():
        """Check database connectivity and basic operations"""
        try:
            start_time = time.time()
            
            # Test database connection with a simple query
            result = db.session.execute(db.text("SELECT 1")).scalar()
            
            # Test table access
            user_count = User.query.count()
            
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time, 2),
                "user_count": user_count,
                "connection_test": result == 1
            }
            
        except Exception as e:
            app_logger.error(f"Database health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "error_type": type(e).__name__
            }
    
    @staticmethod
    def check_system_resources():
        """Check system resource usage"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            
            # Disk usage
            disk = psutil.disk_usage('/')
            
            # Process info
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                "status": "healthy",
                "cpu": {
                    "usage_percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "usage_percent": memory.percent,
                    "process_memory_mb": round(process_memory.rss / (1024**2), 2)
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "usage_percent": round((disk.used / disk.total) * 100, 2)
                }
            }
            
        except Exception as e:
            app_logger.error(f"System resources check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @staticmethod
    def check_application_status():
        """Check application-specific status"""
        try:
            uptime_seconds = time.time() - getattr(current_app, '_start_time', time.time())
            
            return {
                "status": "healthy",
                "version": "1.0.0",
                "environment": current_app.config.get('FLASK_ENV', 'production'),
                "debug_mode": current_app.debug,
                "uptime_seconds": round(uptime_seconds, 2),
                "uptime_human": str(timedelta(seconds=int(uptime_seconds))),
                "config": {
                    "database_url": current_app.config.get('SQLALCHEMY_DATABASE_URI', '').split('@')[-1] if '@' in current_app.config.get('SQLALCHEMY_DATABASE_URI', '') else 'sqlite',
                    "mail_configured": bool(current_app.config.get('MAIL_USERNAME')),
                    "cors_enabled": 'flask_cors' in [ext.__class__.__module__ for ext in current_app.extensions.values()],
                    "login_manager_configured": 'flask_login' in current_app.extensions
                }
            }
            
        except Exception as e:
            app_logger.error(f"Application status check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @staticmethod
    def check_external_services():
        """Check external service dependencies"""
        try:
            services = {}
            
            # Check mail service (if configured)
            if current_app.config.get('MAIL_USERNAME'):
                try:
                    # This is a basic check - in production you might want to test actual mail sending
                    services['mail'] = {
                        "status": "configured",
                        "server": current_app.config.get('MAIL_SERVER'),
                        "port": current_app.config.get('MAIL_PORT')
                    }
                except Exception as mail_error:
                    services['mail'] = {
                        "status": "error",
                        "error": str(mail_error)
                    }
            else:
                services['mail'] = {"status": "not_configured"}
            
            # Check SMS service (if configured)
            if current_app.config.get('SMS_API_KEY'):
                services['sms'] = {
                    "status": "configured",
                    "username": current_app.config.get('SMS_USERNAME')
                }
            else:
                services['sms'] = {"status": "not_configured"}
            
            return {
                "status": "healthy",
                "services": services
            }
            
        except Exception as e:
            app_logger.error(f"External services check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @staticmethod
    def check_file_system():
        """Check file system access and upload directories"""
        try:
            upload_dir = current_app.config.get('UPLOAD_FOLDER', 'static/uploads')
            log_dir = 'logs'
            
            checks = {}
            
            # Check upload directory
            try:
                if not os.path.exists(upload_dir):
                    os.makedirs(upload_dir, exist_ok=True)
                
                # Test write access
                test_file = os.path.join(upload_dir, '.health_check')
                with open(test_file, 'w') as f:
                    f.write('health_check')
                os.remove(test_file)
                
                checks['upload_directory'] = {
                    "status": "healthy",
                    "path": os.path.abspath(upload_dir),
                    "writable": True
                }
                
            except Exception as upload_error:
                checks['upload_directory'] = {
                    "status": "unhealthy",
                    "error": str(upload_error)
                }
            
            # Check log directory
            try:
                if not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)
                
                checks['log_directory'] = {
                    "status": "healthy",
                    "path": os.path.abspath(log_dir),
                    "writable": os.access(log_dir, os.W_OK)
                }
                
            except Exception as log_error:
                checks['log_directory'] = {
                    "status": "unhealthy",
                    "error": str(log_error)
                }
            
            return {
                "status": "healthy",
                "checks": checks
            }
            
        except Exception as e:
            app_logger.error(f"File system check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    @staticmethod
    def get_comprehensive_health():
        """Get comprehensive health status of all components"""
        start_time = time.time()
        
        health_checks = {
            "database": HealthChecker.check_database(),
            "system": HealthChecker.check_system_resources(),
            "application": HealthChecker.check_application_status(),
            "external_services": HealthChecker.check_external_services(),
            "file_system": HealthChecker.check_file_system()
        }
        
        # Determine overall status
        overall_status = "healthy"
        unhealthy_components = []
        
        for component, status in health_checks.items():
            if status.get("status") != "healthy":
                overall_status = "unhealthy"
                unhealthy_components.append(component)
        
        response_time = (time.time() - start_time) * 1000
        
        result = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "response_time_ms": round(response_time, 2),
            "components": health_checks
        }
        
        if unhealthy_components:
            result["unhealthy_components"] = unhealthy_components
        
        return result

def create_health_routes(app):
    """Create health check routes"""
    
    @app.route('/health', methods=['GET'])
    def basic_health():
        """Basic health check endpoint"""
        try:
            return APIResponse.success(
                data={
                    "status": "healthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "Sahatak Telemedicine API"
                },
                message="Service is healthy"
            )
        except Exception as e:
            app_logger.error(f"Basic health check failed: {str(e)}")
            return APIResponse.internal_error("Health check failed")
    
    @app.route('/health/detailed', methods=['GET'])
    def detailed_health():
        """Detailed health check with all components"""
        try:
            health_data = HealthChecker.get_comprehensive_health()
            
            if health_data["status"] == "healthy":
                return APIResponse.success(
                    data=health_data,
                    message="All components are healthy"
                )
            else:
                return APIResponse.error(
                    message="Some components are unhealthy",
                    status_code=503,
                    error_code="SERVICE_UNHEALTHY",
                    details=health_data
                )
                
        except Exception as e:
            app_logger.error(f"Detailed health check failed: {str(e)}")
            return APIResponse.internal_error("Health check failed")
    
    @app.route('/health/database', methods=['GET'])
    def database_health():
        """Database-specific health check"""
        try:
            db_health = HealthChecker.check_database()
            
            if db_health["status"] == "healthy":
                return APIResponse.success(
                    data=db_health,
                    message="Database is healthy"
                )
            else:
                return APIResponse.error(
                    message="Database is unhealthy",
                    status_code=503,
                    error_code="DATABASE_UNHEALTHY",
                    details=db_health
                )
                
        except Exception as e:
            app_logger.error(f"Database health check failed: {str(e)}")
            return APIResponse.internal_error("Database health check failed")
    
    # Set application start time for uptime calculation
    app._start_time = time.time()