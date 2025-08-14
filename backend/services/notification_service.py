from typing import Dict, Any, Optional, List
from utils.logging_config import app_logger
from .email_service import send_registration_confirmation_email, send_appointment_reminder, send_appointment_confirmation, send_appointment_cancellation
from .sms_service import send_registration_confirmation_sms, send_appointment_reminder_sms, send_appointment_confirmation_sms, send_appointment_cancellation_sms


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
        Send registration confirmation via user's preferred method
        
        Args:
            user_data: User registration details (must include email and/or phone)
            preferred_method: 'email', 'sms', or 'both'
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if at least one notification sent successfully
        """
        try:
            success = False
            
            if preferred_method in ['email', 'both']:
                email = user_data.get('email')
                if email:
                    email_success = send_registration_confirmation_email(email, user_data, language)
                    success = success or email_success
                    if email_success:
                        app_logger.info(f"Registration confirmation email sent to {email}")
                else:
                    app_logger.warning("Email registration confirmation requested but no email provided")
            
            if preferred_method in ['sms', 'both']:
                phone = user_data.get('phone')
                if phone:
                    sms_success = send_registration_confirmation_sms(phone, user_data, language)
                    success = success or sms_success
                    if sms_success:
                        app_logger.info(f"Registration confirmation SMS sent to {phone}")
                else:
                    app_logger.warning("SMS registration confirmation requested but no phone provided")
            
            return success
            
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
        Send appointment notifications via preferred method
        
        Args:
            appointment_data: Appointment details (must include patient email/phone)
            notification_type: 'confirmation', 'reminder', 'cancellation'
            preferred_method: 'email', 'sms', or 'both'
            language: Language preference ('ar' or 'en')
            reminder_type: Type of reminder ('24h', '1h', 'now') - only for reminders
            
        Returns:
            bool: True if at least one notification sent successfully
        """
        try:
            success = False
            
            # Get recipient contact info
            recipient_email = appointment_data.get('patient_email') or appointment_data.get('email')
            recipient_phone = appointment_data.get('patient_phone') or appointment_data.get('phone')
            
            if preferred_method in ['email', 'both'] and recipient_email:
                email_success = self._send_appointment_email(
                    recipient_email, appointment_data, notification_type, language, reminder_type
                )
                success = success or email_success
            
            if preferred_method in ['sms', 'both'] and recipient_phone:
                sms_success = self._send_appointment_sms(
                    recipient_phone, appointment_data, notification_type, language, reminder_type
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
    
    def _send_appointment_sms(
        self, 
        recipient_phone: str, 
        appointment_data: Dict[str, Any], 
        notification_type: str, 
        language: str,
        reminder_type: str
    ) -> bool:
        """Send appointment SMS based on type"""
        try:
            if notification_type == 'confirmation':
                return send_appointment_confirmation_sms(recipient_phone, appointment_data, language)
            elif notification_type == 'reminder':
                return send_appointment_reminder_sms(recipient_phone, appointment_data, language, reminder_type)
            elif notification_type == 'cancellation':
                return send_appointment_cancellation_sms(recipient_phone, appointment_data, language)
            else:
                app_logger.error(f"Unknown SMS notification type: {notification_type}")
                return False
                
        except Exception as e:
            app_logger.error(f"Appointment SMS error: {str(e)}")
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
        Send notifications from doctors to patients
        
        Args:
            doctor_data: Doctor information
            patient_data: Patient information (must include email/phone)
            message_content: Message details and content
            preferred_method: 'email', 'sms', or 'both'
            language: Language preference ('ar' or 'en')
            
        Returns:
            bool: True if at least one notification sent successfully
        """
        try:
            # This is a placeholder for doctor-to-patient communications
            # Can be expanded based on specific requirements
            success = False
            
            message_data = {
                **message_content,
                'doctor_name': doctor_data.get('full_name', 'الطبيب'),
                'patient_name': patient_data.get('full_name', 'المريض'),
                'language': language
            }
            
            if preferred_method in ['email', 'both']:
                email = patient_data.get('email')
                if email:
                    # For now, log the message - can be extended with custom templates
                    app_logger.info(f"Doctor message email to {email}: {message_content.get('subject', 'No subject')}")
                    success = True
            
            if preferred_method in ['sms', 'both']:
                phone = patient_data.get('phone')
                if phone:
                    # For now, log the message - can be extended with custom templates
                    app_logger.info(f"Doctor message SMS to {phone}: {message_content.get('message', 'No message')}")
                    success = True
            
            return success
            
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