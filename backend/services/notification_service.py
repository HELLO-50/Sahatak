from typing import Dict, Any, Optional, List
from utils.logging_config import app_logger
from .email_service import send_registration_confirmation_email, send_appointment_reminder, send_appointment_confirmation, send_appointment_cancellation


class NotificationService:
    """
    Unified notification service for handling both email and SMS notifications
    Following established patterns from the Sahatak codebase
    
    Designed for low bandwidth areas with minimal templates
    """
    
    def __init__(self):
        pass
    
    def send_registration_confirmation(
        self, 
        user_data: Dict[str, Any], 
        preferred_method: str = 'email',
        language: str = 'ar'
    ) -> bool:
        """
        Send registration confirmation via email
        
        Args:
            user_data: User registration details (must include email)
            preferred_method: 'email' (kept for compatibility)
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            email = user_data.get('email')
            if email:
                email_success = send_registration_confirmation_email(email, user_data, language)
                if email_success:
                    app_logger.info(f"Registration confirmation email sent to {email}")
                return email_success
            else:
                app_logger.warning("Email registration confirmation requested but no email provided")
                return False
            
        except Exception as e:
            app_logger.error(f"Registration confirmation notification error: {str(e)}")
            return False
    
    def send_appointment_notification(
        self, 
        appointment_data: Dict[str, Any],
        notification_type: str,  # 'confirmation', 'reminder', 'cancellation'
        preferred_method: str = 'email',
        language: str = 'ar',
        reminder_type: str = '24h'  # Only used for reminders
    ) -> bool:
        """
        Send appointment notifications via email
        
        Args:
            appointment_data: Appointment details (must include patient email)
            notification_type: 'confirmation', 'reminder', 'cancellation'
            preferred_method: 'email' (kept for compatibility)
            language: Language preference ('ar' or 'en')
            reminder_type: Type of reminder ('24h', '1h', 'now') - only for reminders
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # Get recipient contact info
            recipient_email = appointment_data.get('patient_email') or appointment_data.get('email')
            
            if recipient_email:
                email_success = self._send_appointment_email(
                    recipient_email, appointment_data, notification_type, language, reminder_type
                )
                return email_success
            else:
                app_logger.warning(f"No email provided for appointment {notification_type}")
                return False
                )
                success = success or sms_success
            
            return success
            
        except Exception as e:
            app_logger.error(f"Appointment notification error: {str(e)}")
            return False
    
    def _send_appointment_email(
        self, 
        recipient_email: str, 
        appointment_data: Dict[str, Any], 
        notification_type: str, 
        language: str,
        reminder_type: str
    ) -> bool:
        """Send appointment email based on type"""
        try:
            if notification_type == 'confirmation':
                return send_appointment_confirmation(recipient_email, appointment_data, language)
            elif notification_type == 'reminder':
                return send_appointment_reminder(recipient_email, appointment_data, language, reminder_type)
            elif notification_type == 'cancellation':
                return send_appointment_cancellation(recipient_email, appointment_data, language)
            else:
                app_logger.error(f"Unknown email notification type: {notification_type}")
                return False
                
        except Exception as e:
            app_logger.error(f"Appointment email error: {str(e)}")
            return False
    
    
    def send_doctor_notification(
        self,
        doctor_data: Dict[str, Any],
        patient_data: Dict[str, Any],
        message_content: Dict[str, Any],
        preferred_method: str = 'email',
        language: str = 'ar'
    ) -> bool:
        """
        Send notifications from doctors to patients via email
        
        Args:
            doctor_data: Doctor information
            patient_data: Patient information (must include email)
            message_content: Message details and content
            preferred_method: 'email' (kept for compatibility)
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if notification sent successfully
        """
        try:
            # This is a placeholder for doctor-to-patient communications
            # Can be expanded based on specific requirements
            
            message_data = {
                **message_content,
                'doctor_name': doctor_data.get('full_name', 'الطبيب'),
                'patient_name': patient_data.get('full_name', 'المريض'),
                'language': language
            }
            
            email = patient_data.get('email')
            if email:
                # For now, log the message - can be extended with custom templates
                app_logger.info(f"Doctor message email to {email}: {message_content.get('subject', 'No subject')}")
                return True
            else:
                app_logger.warning("Doctor notification requested but no patient email provided")
                return False
            
        except Exception as e:
            app_logger.error(f"Doctor notification error: {str(e)}")
            return False


# Create singleton instance
notification_service = NotificationService()

# Convenience functions
def send_registration_confirmation_notification(user_data: Dict[str, Any], preferred_method: str = 'email', language: str = 'ar') -> bool:
    """Send registration confirmation via preferred method"""
    return notification_service.send_registration_confirmation(user_data, preferred_method, language)

def send_appointment_notification(appointment_data: Dict[str, Any], notification_type: str, preferred_method: str = 'email', language: str = 'ar', reminder_type: str = '24h') -> bool:
    """Send appointment notification via preferred method"""
    return notification_service.send_appointment_notification(appointment_data, notification_type, preferred_method, language, reminder_type)

def send_doctor_notification(doctor_data: Dict[str, Any], patient_data: Dict[str, Any], message_content: Dict[str, Any], preferred_method: str = 'email', language: str = 'ar') -> bool:
    """Send doctor-to-patient notification via preferred method"""
    return notification_service.send_doctor_notification(doctor_data, patient_data, message_content, preferred_method, language)