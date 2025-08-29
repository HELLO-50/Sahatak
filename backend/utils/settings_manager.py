"""
Settings Manager - Hybrid Environment/Database Configuration System
Provides a unified interface for accessing settings with priority order:
1. Database settings (admin configurable) - highest priority
2. Environment variables (.env) - medium priority  
3. Default values (hardcoded) - lowest priority
"""

import os
from typing import Union, Optional, Dict, Any
from flask import current_app
from models import SystemSettings

class SettingsManager:
    """
    Unified settings manager that combines environment variables and database settings
    Priority order: Database > Environment > Default
    """
    
    # Cache for database settings to avoid repeated queries
    _cache = {}
    _cache_timeout = 300  # 5 minutes
    _last_cache_update = 0
    
    @classmethod
    def _refresh_cache(cls):
        """Refresh the database settings cache"""
        import time
        current_time = time.time()
        
        if current_time - cls._last_cache_update > cls._cache_timeout:
            try:
                # Query all platform settings from database
                settings = SystemSettings.query.all()
                cls._cache = {setting.setting_key: setting.get_typed_value() for setting in settings}
                cls._last_cache_update = current_time
            except Exception:
                # If database is not available, use empty cache
                pass
    
    @classmethod
    def get_setting(cls, key: str, default: Any = None, data_type: str = 'string') -> Any:
        """
        Get setting value with priority: Database > Environment > Default
        
        Args:
            key: Setting key name
            default: Default value if not found
            data_type: Expected data type (string, integer, boolean, float)
            
        Returns:
            Setting value with appropriate type conversion
        """
        cls._refresh_cache()
        
        # Priority 1: Database setting (admin configurable)
        if key in cls._cache:
            return cls._cache[key]
        
        # Priority 2: Environment variable
        env_value = os.getenv(key.upper())
        if env_value is not None:
            return cls._convert_type(env_value, data_type)
        
        # Priority 3: Default value
        return default
    
    @classmethod
    def _convert_type(cls, value: str, data_type: str) -> Any:
        """Convert string value to appropriate type"""
        try:
            if data_type == 'boolean':
                return str(value).lower() in ('true', '1', 'yes', 'on')
            elif data_type == 'integer':
                return int(value)
            elif data_type == 'float':
                return float(value)
            elif data_type == 'list':
                return value.split(',') if value else []
            else:  # string
                return str(value)
        except (ValueError, TypeError):
            return value
    
    @classmethod
    def get_validation_settings(cls) -> Dict[str, Any]:
        """Get all validation-related settings"""
        return {
            'password_min_length': cls.get_setting('password_min_length', 6, 'integer'),
            'password_max_length': cls.get_setting('password_max_length', 128, 'integer'),
            'phone_min_length': cls.get_setting('phone_min_length', 10, 'integer'),
            'phone_max_length': cls.get_setting('phone_max_length', 15, 'integer'),
            'name_min_length': cls.get_setting('name_min_length', 2, 'integer'),
            'name_max_length': cls.get_setting('name_max_length', 100, 'integer'),
            'max_login_attempts': cls.get_setting('max_login_attempts', 5, 'integer'),
            'lockout_duration_minutes': cls.get_setting('lockout_duration_minutes', 30, 'integer'),
            'session_timeout_minutes': cls.get_setting('session_timeout_minutes', 15, 'integer'),
        }
    
    @classmethod
    def get_business_settings(cls) -> Dict[str, Any]:
        """Get all business logic settings"""
        return {
            'consultation_duration_minutes': cls.get_setting('consultation_duration_minutes', 30, 'integer'),
            'max_appointment_days_ahead': cls.get_setting('max_appointment_days_ahead', 30, 'integer'),
            'platform_commission_percent': cls.get_setting('platform_commission_percent', 10.0, 'float'),
            'posts_per_page': cls.get_setting('posts_per_page', 20, 'integer'),
            'max_page_size': cls.get_setting('max_page_size', 100, 'integer'),
        }
    
    @classmethod
    def get_feature_settings(cls) -> Dict[str, Any]:
        """Get all feature flag settings"""
        return {
            'enable_video_calls': cls.get_setting('enable_video_calls', True, 'boolean'),
            'enable_prescription_module': cls.get_setting('enable_prescription_module', True, 'boolean'),
            'enable_ai_assessment': cls.get_setting('enable_ai_assessment', True, 'boolean'),
            'email_notifications_enabled': cls.get_setting('email_notifications_enabled', True, 'boolean'),
            'maintenance_mode': cls.get_setting('maintenance_mode', False, 'boolean'),
            'registration_enabled': cls.get_setting('registration_enabled', True, 'boolean'),
        }
    
    @classmethod
    def get_jitsi_settings(cls) -> Dict[str, Any]:
        """Get all Jitsi video conferencing settings"""
        return {
            'jitsi_domain': cls.get_setting('jitsi_domain', 'meet.jit.si', 'string'),
            'jitsi_app_id': cls.get_setting('jitsi_app_id', 'sahatak_telemedicine', 'string'),
            'jitsi_room_prefix': cls.get_setting('jitsi_room_prefix', 'sahatak_consultation_', 'string'),
            'video_call_max_duration_minutes': cls.get_setting('video_call_max_duration_minutes', 60, 'integer'),
            'video_call_recording_enabled': cls.get_setting('video_call_recording_enabled', False, 'boolean'),
            'video_call_lobby_enabled': cls.get_setting('video_call_lobby_enabled', True, 'boolean'),
            'video_call_password_protected': cls.get_setting('video_call_password_protected', True, 'boolean'),
            'jitsi_require_display_name': cls.get_setting('jitsi_require_display_name', True, 'boolean'),
            'jitsi_enable_chat': cls.get_setting('jitsi_enable_chat', True, 'boolean'),
            'jitsi_enable_screen_sharing': cls.get_setting('jitsi_enable_screen_sharing', True, 'boolean'),
            'jitsi_enable_file_sharing': cls.get_setting('jitsi_enable_file_sharing', False, 'boolean'),
            'jitsi_default_video_quality': cls.get_setting('jitsi_default_video_quality', 360, 'integer'),
            'jitsi_max_video_quality': cls.get_setting('jitsi_max_video_quality', 720, 'integer'),
            'jitsi_enable_audio_only_mode': cls.get_setting('jitsi_enable_audio_only_mode', True, 'boolean'),
            'jitsi_enable_e2ee': cls.get_setting('jitsi_enable_e2ee', True, 'boolean'),
            'jitsi_moderator_rights_required': cls.get_setting('jitsi_moderator_rights_required', True, 'boolean'),
            'jitsi_guest_access_enabled': cls.get_setting('jitsi_guest_access_enabled', False, 'boolean'),
        }
    
    @classmethod
    def invalidate_cache(cls):
        """Force cache refresh on next access"""
        cls._last_cache_update = 0
        cls._cache = {}


# Convenience functions for specific setting categories
def get_validation_setting(key: str, default: Any = None, data_type: str = 'string') -> Any:
    """Get validation setting"""
    return SettingsManager.get_setting(key, default, data_type)

def get_business_setting(key: str, default: Any = None, data_type: str = 'string') -> Any:
    """Get business logic setting"""
    return SettingsManager.get_setting(key, default, data_type)

def get_feature_setting(key: str, default: Any = None, data_type: str = 'string') -> Any:
    """Get feature flag setting"""
    return SettingsManager.get_setting(key, default, data_type)

def get_jitsi_setting(key: str, default: Any = None, data_type: str = 'string') -> Any:
    """Get Jitsi video conferencing setting"""
    return SettingsManager.get_setting(key, default, data_type)


# Flask integration helper
def init_settings_manager(app):
    """Initialize settings manager with Flask app"""
    app.settings_manager = SettingsManager
    
    # Add to Jinja2 globals for templates
    app.jinja_env.globals['get_setting'] = SettingsManager.get_setting
    
    # Add context processor for common settings
    @app.context_processor
    def inject_settings():
        return {
            'validation_settings': SettingsManager.get_validation_settings(),
            'feature_settings': SettingsManager.get_feature_settings(),
            'business_settings': SettingsManager.get_business_settings(),
        }