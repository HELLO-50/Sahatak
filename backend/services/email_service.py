from flask import current_app, render_template
from flask_mail import Mail, Message
from datetime import datetime
from typing import Optional, Dict, Any
import os
from utils.logging_config import app_logger

class EmailService:
    """
    Email service for sending appointment reminders and notifications
    Following established patterns from the Sahatak codebase
    """
    
    def __init__(self, app=None):
        self.mail = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize email service with Flask app"""
        try:
            # Configure Flask-Mail using existing .env variables
            app.config.setdefault('MAIL_SERVER', os.getenv('MAIL_SERVER', 'smtp.gmail.com'))
            app.config.setdefault('MAIL_PORT', int(os.getenv('MAIL_PORT', 587)))
            app.config.setdefault('MAIL_USE_TLS', True)
            app.config.setdefault('MAIL_USE_SSL', False)
            app.config.setdefault('MAIL_USERNAME', os.getenv('MAIL_USERNAME'))  # sahatak.sudan@gmail.com
            app.config.setdefault('MAIL_PASSWORD', os.getenv('MAIL_PASSWORD'))
            app.config.setdefault('MAIL_DEFAULT_SENDER', os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME')))
            
            self.mail = Mail(app)
            app_logger.info("Email service initialized successfully")
            
        except Exception as e:
            app_logger.error(f"Failed to initialize email service: {str(e)}")
            self.mail = None
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured"""
        return (self.mail is not None and 
                current_app.config.get('MAIL_USERNAME') and 
                current_app.config.get('MAIL_PASSWORD'))
    
    def send_appointment_reminder(
        self, 
        recipient_email: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar',
        reminder_type: str = '24h'
    ) -> bool:
        """
        Send appointment reminder email
        
        Args:
            recipient_email: Email address to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            reminder_type: Type of reminder ('24h', '1h', 'now')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("Email service not configured, skipping email")
                return False
            
            # Prepare email data
            subject = self._get_reminder_subject(reminder_type, language)
            template_name = f'email/{language}/appointment_reminder.html'
            
            # Enhanced appointment data for template
            template_data = {
                **appointment_data,
                'reminder_type': reminder_type,
                'language': language,
                'app_name': '5-*C' if language == 'ar' else 'Sahatak',
                'current_year': datetime.now().year
            }
            
            # Create and send message
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=render_template(template_name, **template_data),
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
            
            self.mail.send(msg)
            app_logger.info(f"Appointment reminder email sent to {recipient_email}")
            return True
            
        except Exception as e:
            app_logger.error(f"Failed to send appointment reminder email to {recipient_email}: {str(e)}")
            return False
    
    def send_appointment_confirmation(
        self, 
        recipient_email: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send appointment confirmation email
        
        Args:
            recipient_email: Email address to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("Email service not configured, skipping email")
                return False
            
            subject = '*#CJ/ EH9/C 'D7(J' if language == 'ar' else 'Appointment Confirmation'
            template_name = f'email/{language}/appointment_confirmation.html'
            
            template_data = {
                **appointment_data,
                'language': language,
                'app_name': '5-*C' if language == 'ar' else 'Sahatak',
                'current_year': datetime.now().year
            }
            
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=render_template(template_name, **template_data),
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
            
            self.mail.send(msg)
            app_logger.info(f"Appointment confirmation email sent to {recipient_email}")
            return True
            
        except Exception as e:
            app_logger.error(f"Failed to send appointment confirmation email to {recipient_email}: {str(e)}")
            return False
    
    def send_appointment_cancellation(
        self, 
        recipient_email: str, 
        appointment_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send appointment cancellation email
        
        Args:
            recipient_email: Email address to send to
            appointment_data: Appointment details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("Email service not configured, skipping email")
                return False
            
            subject = '%D:'! EH9/C 'D7(J' if language == 'ar' else 'Appointment Cancellation'
            template_name = f'email/{language}/appointment_cancellation.html'
            
            template_data = {
                **appointment_data,
                'language': language,
                'app_name': '5-*C' if language == 'ar' else 'Sahatak',
                'current_year': datetime.now().year
            }
            
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=render_template(template_name, **template_data),
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
            
            self.mail.send(msg)
            app_logger.info(f"Appointment cancellation email sent to {recipient_email}")
            return True
            
        except Exception as e:
            app_logger.error(f"Failed to send appointment cancellation email to {recipient_email}: {str(e)}")
            return False
    
    def send_registration_confirmation(
        self, 
        recipient_email: str, 
        user_data: Dict[str, Any], 
        language: str = 'ar'
    ) -> bool:
        """
        Send registration confirmation email
        
        Args:
            recipient_email: Email address to send to
            user_data: User registration details
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            if not self.is_configured():
                app_logger.warning("Email service not configured, skipping email")
                return False
            
            subject = 'أهلاً بك في صحتك' if language == 'ar' else 'Welcome to Sahatak'
            template_name = f'email/{language}/registration_confirmation.html'
            
            template_data = {
                **user_data,
                'language': language,
                'app_name': 'صحتك' if language == 'ar' else 'Sahatak',
                'current_year': datetime.now().year
            }
            
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=render_template(template_name, **template_data),
                sender=current_app.config['MAIL_DEFAULT_SENDER']
            )
            
            self.mail.send(msg)
            app_logger.info(f"Registration confirmation email sent to {recipient_email}")
            return True
            
        except Exception as e:
            app_logger.error(f"Failed to send registration confirmation email to {recipient_email}: {str(e)}")
            return False
    
    def _get_reminder_subject(self, reminder_type: str, language: str) -> str:
        """Get email subject based on reminder type and language"""
        subjects = {
            'ar': {
                '24h': '*0CJ1: EH9/C 'D7(J :/'K',
                '1h': '*0CJ1: EH9/C 'D7(J .D'D 3'9)',
                'now': '*0CJ1: EH9/C 'D7(J 'D"F'
            },
            'en': {
                '24h': 'Reminder: Your medical appointment tomorrow',
                '1h': 'Reminder: Your medical appointment in 1 hour',
                'now': 'Reminder: Your medical appointment is now'
            }
        }
        
        return subjects.get(language, subjects['ar']).get(reminder_type, 'Appointment Reminder')

# Create singleton instance
email_service = EmailService()

def send_appointment_reminder(recipient_email: str, appointment_data: Dict[str, Any], language: str = 'ar', reminder_type: str = '24h') -> bool:
    """Convenience function for sending appointment reminders"""
    return email_service.send_appointment_reminder(recipient_email, appointment_data, language, reminder_type)

def send_appointment_confirmation(recipient_email: str, appointment_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending appointment confirmations"""
    return email_service.send_appointment_confirmation(recipient_email, appointment_data, language)

def send_appointment_cancellation(recipient_email: str, appointment_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending appointment cancellations"""
    return email_service.send_appointment_cancellation(recipient_email, appointment_data, language)

def send_registration_confirmation_email(recipient_email: str, user_data: Dict[str, Any], language: str = 'ar') -> bool:
    """Convenience function for sending registration confirmation emails"""
    return email_service.send_registration_confirmation(recipient_email, user_data, language)