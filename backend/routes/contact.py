from flask import Blueprint, request, current_app
from models import db, ContactMessage
from utils.responses import APIResponse
from utils.validators import sanitize_input, validate_email
from utils.logging_config import app_logger
from services.email_service import email_service

contact_bp = Blueprint('contact', __name__, url_prefix='/')


def send_html_contact_email(recipient_email: str, name: str, sender_email: str, message_text: str) -> bool:
    """
    Send HTML formatted contact message email
    
    Args:
        recipient_email: Email address to send to
        name: Name of the person submitting the contact form
        sender_email: Email of the person submitting the contact form
        message_text: The contact message text
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        if not email_service.is_configured():
            app_logger.warning('Email service not configured')
            return False
        
        # Build HTML email body
        email_subject = f'📬 New Contact Message from {name}'
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
            <h2>📬 New Contact Message Received</h2>
        </div>
        
        <div class="section">
            <p class="label">From:</p>
            <p class="value">
                Name: {name}<br>
                Email: {sender_email}
            </p>
        </div>
        
        <div class="section">
            <p class="label">Message:</p>
            <p class="value" style="white-space: pre-wrap; line-height: 1.6;">{message_text}</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message from Sahatak Contact Form</p>
            <p>© 2025 Sahatak - Telemedicine Platform</p>
        </div>
    </div>
</body>
</html>
        """
        
        # Send email using the email service
        from flask_mail import Message
        msg = Message(
            subject=email_subject,
            recipients=[recipient_email],
            html=email_body,
            sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@sahatak.com')
        )
        
        email_service.mail.send(msg)
        app_logger.info(f'✅ Contact email sent to {recipient_email} from {sender_email}')
        return True
        
    except Exception as e:
        app_logger.error(f'❌ Failed to send contact email to {recipient_email}: {str(e)}')
        return False


@contact_bp.route('/api/contact', methods=['POST'])
def submit_contact_message():
    """
    Handle contact form submissions and send emails to support
    """
    try:
        data = request.get_json() or {}
        name = sanitize_input(data.get('name', ''), 200).strip()
        email = (data.get('email') or '').strip()
        message = sanitize_input(data.get('message', ''), 5000).strip()

        # Basic validation
        if not name:
            return APIResponse.validation_error(field='name', message='Name is required')
        if not email or not validate_email(email):
            return APIResponse.validation_error(field='email', message='A valid email is required')
        if not message:
            return APIResponse.validation_error(field='message', message='Message is required')

        # Save to DB
        contact = ContactMessage(name=name, email=email, message=message)
        db.session.add(contact)
        db.session.commit()

        # Send notification email to support
        support_email = current_app.config.get('SUPPORT_EMAIL', 'Sahatak.Sudan@gmail.com')
        
        try:
            if not send_html_contact_email(support_email, name, email, message):
                app_logger.warning('Email service not configured - contact message saved but email notification failed')
                # Still return success since message was saved to DB
        except Exception as email_error:
            app_logger.error(f'❌ Failed to send contact email notification: {str(email_error)}')
            # Don't fail the request, log the issue but inform user
            app_logger.info(f'Contact message {contact.id} saved to database even though email sending failed')

        return APIResponse.success(
            data={'id': contact.id},
            message='✅ Thank you for your message. We will get back to you soon!'
        )

    except Exception as e:
        app_logger.error(f'❌ Contact submission error: {str(e)}')
        db.session.rollback()
        return APIResponse.internal_error(message='Failed to submit your message')
