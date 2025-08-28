from flask import current_app, render_template_string
from datetime import datetime
from typing import Optional, Dict, Any
import os
import requests
from utils.logging_config import app_logger

class SMSService:
    """
    SMS service for sending appointment reminders and notifications
    Following established patterns from the Sahatak codebase
    
    This is a placeholder implementation that can be connected to various SMS providers:
    - Sudan SMS providers
    - Twilio
    - AWS SNS
    - Africa's Talking
    """
    
    def __init__(self, app=None):
        self.provider = None
        self.api_key = None
        self.sender_id = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize SMS service with Flask app"""
        try:
            # SMS Configuration from environment
            self.provider = os.getenv('SMS_PROVIDER', 'placeholder')  # 'twilio', 'aws', 'africastalking', etc.
            self.api_key = os.getenv('SMS_API_KEY')
            self.sender_id = os.getenv('SMS_SENDER_ID', 'SAHATAK')
            self.api_url = os.getenv('SMS_API_URL')
            self.username = os.getenv('SMS_USERNAME')
            
            app_logger.info(f"SMS service initialized with provider: {self.provider}")
            
        except Exception as e:
            app_logger.error(f"Failed to initialize SMS service: {str(e)}")
    
    def is_configured(self) -> bool:
        """Check if SMS service is properly configured"""
        return (self.api_key is not None and 
                self.sender_id is not None and
                self.provider != 'placeholder')
    
    def send_appointment_reminder(
        self, 
        recipient_phone: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar',
        reminder_type: str = '24h'
    ) -> bool:
        """
        Send appointment reminder SMS
        
        Args:
            recipient_phone: Phone number to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            reminder_type: Type of reminder ('24h', '1h', 'now')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("SMS service not configured, logging message instead")
                return self._log_sms_placeholder(recipient_phone, appointment_data, reminder_type)
            
            # Load SMS template
            template_path = f'sms/{language}/appointment_reminder.txt'
            message = self._render_sms_template(template_path, {
                **appointment_data,
                'reminder_type': reminder_type,
                'language': language
            })
            
            # Send SMS based on provider
            success = self._send_sms(recipient_phone, message)
            
            if success:
                app_logger.info(f"Appointment reminder SMS sent to {recipient_phone}")
            else:
                app_logger.error(f"Failed to send appointment reminder SMS to {recipient_phone}")
            
            return success
            
        except Exception as e:
            app_logger.error(f"SMS service error for {recipient_phone}: {str(e)}")
            return False
    
    def send_appointment_confirmation(
        self, 
        recipient_phone: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send appointment confirmation SMS
        
        Args:
            recipient_phone: Phone number to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("SMS service not configured, logging message instead")
                return self._log_sms_placeholder(recipient_phone, appointment_data, 'confirmation')
            
            template_path = f'sms/{language}/appointment_confirmation.txt'
            message = self._render_sms_template(template_path, {
                **appointment_data,
                'language': language
            })
            
            success = self._send_sms(recipient_phone, message)
            
            if success:
                app_logger.info(f"Appointment confirmation SMS sent to {recipient_phone}")
            else:
                app_logger.error(f"Failed to send appointment confirmation SMS to {recipient_phone}")
            
            return success
            
        except Exception as e:
            app_logger.error(f"SMS service error for {recipient_phone}: {str(e)}")
            return False
    
    def send_appointment_cancellation(
        self, 
        recipient_phone: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send appointment cancellation SMS
        
        Args:
            recipient_phone: Phone number to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("SMS service not configured, logging message instead")
                return self._log_sms_placeholder(recipient_phone, appointment_data, 'cancellation')
            
            template_path = f'sms/{language}/appointment_cancellation.txt'
            message = self._render_sms_template(template_path, {
                **appointment_data,
                'language': language
            })
            
            success = self._send_sms(recipient_phone, message)
            
            if success:
                app_logger.info(f"Appointment cancellation SMS sent to {recipient_phone}")
            else:
                app_logger.error(f"Failed to send appointment cancellation SMS to {recipient_phone}")
            
            return success
            
        except Exception as e:
            app_logger.error(f"SMS service error for {recipient_phone}: {str(e)}")
            return False
    
    def send_registration_confirmation(
        self, 
        recipient_phone: str, 
        user_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send registration confirmation SMS
        
        Args:
            recipient_phone: Phone number to send to
            user_data: User registration details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("SMS service not configured, logging message instead")
                return self._log_sms_placeholder(recipient_phone, user_data, 'registration')
            
            template_path = f'sms/{language}/registration_confirmation.txt'
            message = self._render_sms_template(template_path, {
                **user_data,
                'language': language
            })
            
            success = self._send_sms(recipient_phone, message)
            
            if success:
                app_logger.info(f"Registration confirmation SMS sent to {recipient_phone}")
            else:
                app_logger.error(f"Failed to send registration confirmation SMS to {recipient_phone}")
            
            return success
            
        except Exception as e:
            app_logger.error(f"SMS service error for {recipient_phone}: {str(e)}")
            return False
    
    def _send_sms(self, phone: str, message: str) -> bool:
        """
        Send SMS using configured provider
        
        This is a placeholder implementation that logs the SMS.
        In production, this would connect to:
        - Twilio API
        - AWS SNS
        - Africa's Talking API
        - Local Sudan SMS providers
        """
        try:
            if self.provider == 'placeholder':
                # Placeholder implementation - just log the SMS
                app_logger.info(f"SMS PLACEHOLDER - To: {phone}, Message: {message}")
                return True
            
            elif self.provider == 'twilio':
                return self._send_twilio_sms(phone, message)
            
            elif self.provider == 'aws':
                return self._send_aws_sms(phone, message)
            
            elif self.provider == 'africastalking':
                return self._send_africastalking_sms(phone, message)
            
            else:
                app_logger.error(f"Unknown SMS provider: {self.provider}")
                return False
                
        except Exception as e:
            app_logger.error(f"SMS sending error: {str(e)}")
            return False
    
    def _send_twilio_sms(self, phone: str, message: str) -> bool:
        """Send SMS via Twilio (placeholder implementation)"""
        # TODO: Implement Twilio SMS sending
        # from twilio.rest import Client
        # client = Client(account_sid, auth_token)
        # message = client.messages.create(body=message, from_=self.sender_id, to=phone)
        app_logger.info(f"TWILIO SMS PLACEHOLDER - To: {phone}, Message: {message}")
        return True
    
    def _send_aws_sms(self, phone: str, message: str) -> bool:
        """Send SMS via AWS SNS (placeholder implementation)"""
        # TODO: Implement AWS SNS SMS sending
        # import boto3
        # sns = boto3.client('sns')
        # response = sns.publish(PhoneNumber=phone, Message=message)
        app_logger.info(f"AWS SMS PLACEHOLDER - To: {phone}, Message: {message}")
        return True
    
    def _send_africastalking_sms(self, phone: str, message: str) -> bool:
        """Send SMS via Africa's Talking (placeholder implementation)"""
        # TODO: Implement Africa's Talking SMS sending
        # import africastalking
        # africastalking.initialize(username, api_key)
        # sms = africastalking.SMS
        # response = sms.send(message, [phone])
        app_logger.info(f"AFRICASTALKING SMS PLACEHOLDER - To: {phone}, Message: {message}")
        return True
    
    def _render_sms_template(self, template_path: str, data: Dict[str, Any]) -> str:
        """Render SMS template with appointment data"""
        try:
            # Try to load template file
            full_path = os.path.join(current_app.root_path, 'templates', template_path)
            if os.path.exists(full_path):
                with open(full_path, 'r', encoding='utf-8') as f:
                    template = f.read()
                return render_template_string(template, **data)
            else:
                # Fallback to default template
                return self._get_default_sms_template(data)
                
        except Exception as e:
            app_logger.error(f"SMS template rendering error: {str(e)}")
            return self._get_default_sms_template(data)
    
    def _get_default_sms_template(self, data: Dict[str, Any]) -> str:
        """Get default SMS template when file is missing"""
        language = data.get('language', 'ar')
        doctor_name = data.get('doctor_name', 'الطبيب')
        appointment_date = data.get('appointment_date', 'تاريخ غير محدد')
        
        if language == 'ar':
            return f"تذكير: موعدك الطبي مع د.{doctor_name} في {appointment_date}. منصة صحتك"
        else:
            return f"Reminder: Your appointment with Dr.{doctor_name} on {appointment_date}. Sahatak Platform"
    
    def _log_sms_placeholder(self, phone: str, appointment_data: Dict[str, Any], msg_type: str) -> bool:
        """Log SMS as placeholder when service not configured"""
        app_logger.info(
            f"SMS PLACEHOLDER ({msg_type}) - "
            f"To: {phone}, "
            f"Appointment: {appointment_data.get('id', 'N/A')}, "
            f"Doctor: {appointment_data.get('doctor_name', 'N/A')}, "
            f"Date: {appointment_data.get('appointment_date', 'N/A')}"
        )
        return True

# Create singleton instance
sms_service = SMSService()

def send_appointment_reminder_sms(recipient_phone: str, appointment_data: Dict[str, Any], language: str = 'ar', reminder_type: str = '24h') -> bool:
    """Convenience function for sending appointment reminder SMS"""
    return sms_service.send_appointment_reminder(recipient_phone, appointment_data, language, reminder_type)

def send_appointment_confirmation_sms(recipient_phone: str, appointment_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending appointment confirmation SMS"""
    return sms_service.send_appointment_confirmation(recipient_phone, appointment_data, language)

def send_appointment_cancellation_sms(recipient_phone: str, appointment_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending appointment cancellation SMS"""
    return sms_service.send_appointment_cancellation(recipient_phone, appointment_data, language)

def send_registration_confirmation_sms(recipient_phone: str, user_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending registration confirmation SMS"""
    return sms_service.send_registration_confirmation(recipient_phone, user_data, language)