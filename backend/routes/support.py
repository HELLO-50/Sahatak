"""
Support and Help Routes
Handles user support requests, bug reports, and technical issues
"""
from flask import Blueprint, request, current_app
from models import db
from utils.responses import APIResponse
from utils.validators import sanitize_input, validate_email
from utils.logging_config import app_logger
from services.email_service import email_service
from flask_mail import Message

support_bp = Blueprint('support', __name__, url_prefix='/support')


def send_html_email(recipient_email: str, subject: str, html_body: str) -> bool:
    """
    Send HTML email using Flask-Mail
    
    Args:
        recipient_email: Email address to send to
        subject: Email subject
        html_body: HTML formatted email body
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        if not email_service.is_configured():
            app_logger.warning('Email service not configured')
            return False
        
        # Create message with HTML body
        msg = Message(
            subject=subject,
            recipients=[recipient_email],
            html=html_body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'Sahatak.Sudan@gmail.com')
        )
        
        # Send using the mail object
        email_service.mail.send(msg)
        app_logger.info(f'✅ HTML email sent to {recipient_email}: {subject}')
        return True
        
    except Exception as e:
        app_logger.error(f'❌ Failed to send HTML email to {recipient_email}: {str(e)}')
        return False



@support_bp.route('/report-problem', methods=['POST'])
def report_problem():
    """
    Handle bug report and problem reporting from users
    Sends email to official Sahatak email
    """
    try:
        data = request.get_json() or {}
        
        # Get form data
        subject = sanitize_input(data.get('subject', ''), 200).strip()
        description = sanitize_input(data.get('description', ''), 5000).strip()
        name = sanitize_input(data.get('name', ''), 200).strip()
        email = (data.get('email') or '').strip()
        
        # Validation
        if not subject:
            return APIResponse.validation_error(field='subject', message='Subject is required')
        if not description:
            return APIResponse.validation_error(field='description', message='Description is required')
        if not name:
            return APIResponse.validation_error(field='name', message='Name is required')
        if not email or not validate_email(email):
            return APIResponse.validation_error(field='email', message='A valid email is required')
        
        # Get official support email
        support_email = current_app.config.get('SUPPORT_EMAIL', 'Sahatak.Sudan@gmail.com')
        
        # Build email body with user details
        email_subject = f'🐛 Bug Report: {subject}'
        email_body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }}
        .header {{ background: linear-gradient(135deg, #0d47a1 0%, #1565c0 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .section {{ margin-bottom: 20px; }}
        .label {{ font-weight: bold; color: #0d47a1; font-size: 14px; }}
        .value {{ color: #333; margin: 5px 0 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #0d47a1; }}
        .footer {{ text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🐛 New Bug Report Received</h2>
        </div>
        
        <div class="section">
            <p class="label">Subject:</p>
            <p class="value">{subject}</p>
        </div>
        
        <div class="section">
            <p class="label">Reported by:</p>
            <p class="value">
                Name: {name}<br>
                Email: {email}
            </p>
        </div>
        
        <div class="section">
            <p class="label">Description:</p>
            <p class="value" style="white-space: pre-wrap; line-height: 1.6;">{description}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Sahatak Support System</p>
            <p>© 2025 Sahatak - Telemedicine Platform</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Send email to official support email
        try:
            if not send_html_email(support_email, email_subject, email_body):
                app_logger.warning('Email service not configured - unable to send bug report email')
                return APIResponse.error(
                    message='Email service is currently unavailable. Please try again later.',
                    status_code=503
                )
            app_logger.info(f'✅ Bug report email sent to {support_email} from {email}')
        except Exception as email_error:
            app_logger.error(f'❌ Failed to send bug report email: {str(email_error)}')
            # Don't fail the request, log the issue but inform user
            return APIResponse.error(
                message='Report received but email notification failed. Support team will review it.',
                status_code=500
            )
        
        return APIResponse.success(
            data={'message': 'Thank you for reporting this issue'},
            message='Your bug report has been sent successfully to our support team'
        )
        
    except Exception as e:
        app_logger.error(f'❌ Error processing bug report: {str(e)}')
        return APIResponse.internal_error(message='Failed to process your report')


@support_bp.route('/feedback', methods=['POST'])
def send_feedback():
    """
    Handle general feedback from users
    """
    try:
        data = request.get_json() or {}
        
        # Get form data
        title = sanitize_input(data.get('title', ''), 200).strip()
        feedback = sanitize_input(data.get('feedback', ''), 5000).strip()
        category = sanitize_input(data.get('category', ''), 100).strip()
        name = sanitize_input(data.get('name', ''), 200).strip()
        email = (data.get('email') or '').strip()
        
        # Validation
        if not title:
            return APIResponse.validation_error(field='title', message='Title is required')
        if not feedback:
            return APIResponse.validation_error(field='feedback', message='Feedback is required')
        if not name:
            return APIResponse.validation_error(field='name', message='Name is required')
        if not email or not validate_email(email):
            return APIResponse.validation_error(field='email', message='A valid email is required')
        
        # Get official support email
        support_email = current_app.config.get('SUPPORT_EMAIL', 'Sahatak.Sudan@gmail.com')
        
        # Build email body
        email_subject = f'💬 User Feedback: {title}'
        email_body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }}
        .header {{ background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .section {{ margin-bottom: 20px; }}
        .label {{ font-weight: bold; color: #17a2b8; font-size: 14px; }}
        .value {{ color: #333; margin: 5px 0 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #17a2b8; }}
        .footer {{ text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>💬 New User Feedback Received</h2>
        </div>
        
        <div class="section">
            <p class="label">Title:</p>
            <p class="value">{title}</p>
        </div>
        
        <div class="section">
            <p class="label">Category:</p>
            <p class="value">{category or 'General'}</p>
        </div>
        
        <div class="section">
            <p class="label">From:</p>
            <p class="value">
                Name: {name}<br>
                Email: {email}
            </p>
        </div>
        
        <div class="section">
            <p class="label">Feedback:</p>
            <p class="value" style="white-space: pre-wrap; line-height: 1.6;">{feedback}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Sahatak Support System</p>
            <p>© 2025 Sahatak - Telemedicine Platform</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Send email to official support email
        try:
            if not send_html_email(support_email, email_subject, email_body):
                app_logger.warning('Email service not configured - unable to send feedback email')
                return APIResponse.error(
                    message='Email service is currently unavailable. Please try again later.',
                    status_code=503
                )
            app_logger.info(f'✅ Feedback email sent to {support_email} from {email}')
        except Exception as email_error:
            app_logger.error(f'❌ Failed to send feedback email: {str(email_error)}')
            return APIResponse.error(
                message='Feedback received but email notification failed.',
                status_code=500
            )
        
        return APIResponse.success(
            data={'message': 'Thank you for your feedback'},
            message='Your feedback has been sent successfully'
        )
        
    except Exception as e:
        app_logger.error(f'❌ Error processing feedback: {str(e)}')
        return APIResponse.internal_error(message='Failed to process your feedback')


@support_bp.route('/contact-supervisor', methods=['POST'])
def contact_supervisor():
    """
    Handle supervisor contact messages from users
    Sends email to supervisor with message details
    """
    try:
        data = request.get_json() or {}
        
        # Get form data
        to = sanitize_input(data.get('to', ''), 100).strip()  # Supervisor identifier
        subject = sanitize_input(data.get('subject', ''), 200).strip()
        message = sanitize_input(data.get('message', ''), 5000).strip()
        contact = sanitize_input(data.get('contact', ''), 20).strip()  # Phone number
        name = sanitize_input(data.get('name', ''), 200).strip()
        email = (data.get('email') or '').strip()
        
        # Validation
        if not to:
            return APIResponse.validation_error(field='to', message='Please select a supervisor')
        if not subject:
            return APIResponse.validation_error(field='subject', message='Subject is required')
        if not message:
            return APIResponse.validation_error(field='message', message='Message is required')
        if not name:
            return APIResponse.validation_error(field='name', message='Name is required')
        if not email or not validate_email(email):
            return APIResponse.validation_error(field='email', message='A valid email is required')
        
        # Get support email for now (in production, you would map 'to' to supervisor emails)
        support_email = current_app.config.get('SUPPORT_EMAIL', 'Sahatak.Sudan@gmail.com')
        
        # Build email body with supervisor message details
        email_subject = f'👤 Message to Supervisor: {subject}'
        email_body = f"""
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; background-color: #f5f5f5; }}
        .container {{ max-width: 600px; margin: 20px auto; background: white; padding: 20px; border-radius: 8px; }}
        .header {{ background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
        .header h2 {{ margin: 0; font-size: 24px; }}
        .section {{ margin-bottom: 20px; }}
        .label {{ font-weight: bold; color: #6f42c1; font-size: 14px; }}
        .value {{ color: #333; margin: 5px 0 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #6f42c1; }}
        .footer {{ text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>👤 New Supervisor Message</h2>
        </div>
        
        <div class="section">
            <p class="label">Target Supervisor:</p>
            <p class="value">{to}</p>
        </div>
        
        <div class="section">
            <p class="label">Subject:</p>
            <p class="value">{subject}</p>
        </div>
        
        <div class="section">
            <p class="label">From:</p>
            <p class="value">
                Name: {name}<br>
                Email: {email}<br>
                Phone: {contact or 'Not provided'}
            </p>
        </div>
        
        <div class="section">
            <p class="label">Message:</p>
            <p class="value" style="white-space: pre-wrap; line-height: 1.6;">{message}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Sahatak Support System</p>
            <p>© 2025 Sahatak - Telemedicine Platform</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Send email to support (supervisor routing can be implemented later)
        try:
            if not send_html_email(support_email, email_subject, email_body):
                app_logger.warning('Email service not configured - unable to send supervisor message email')
                return APIResponse.error(
                    message='Email service is currently unavailable. Please try again later.',
                    status_code=503
                )
            app_logger.info(f'✅ Supervisor message email sent to {support_email} from {email}')
        except Exception as email_error:
            app_logger.error(f'❌ Failed to send supervisor message email: {str(email_error)}')
            # Don't fail the request, log the issue but inform user
            return APIResponse.error(
                message='Message received but email notification failed. Support team will review it.',
                status_code=500
            )
        
        return APIResponse.success(
            data={'message': 'Thank you for your message to supervisor'},
            message='Your message has been sent successfully to the supervisor'
        )
        
    except Exception as e:
        app_logger.error(f'❌ Error processing supervisor message: {str(e)}')
        return APIResponse.internal_error(message='Failed to process your message')

