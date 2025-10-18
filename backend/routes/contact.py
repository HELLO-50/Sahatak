from flask import Blueprint, request, current_app
from models import db, ContactMessage
from utils.responses import APIResponse
from utils.validators import sanitize_input, validate_email
from utils.logging_config import app_logger
from services.email_service import email_service

contact_bp = Blueprint('contact', __name__, url_prefix='/')


@contact_bp.route('api/contact', methods=['POST'])
def submit_contact_message():
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
        support_email = current_app.config.get('SUPPORT_EMAIL', current_app.config.get('MAIL_DEFAULT_SENDER'))
        subject = f'New contact message from {name}'
        body = f'Name: {name}\nEmail: {email}\n\nMessage:\n{message}\n\nReceived at: {contact.created_at.isoformat()}'

        try:
            if email_service and email_service.is_configured():
                email_service.send_custom_email(support_email, subject, body)
            else:
                app_logger.info('Email service not configured - skipping send_custom_email')
        except Exception as e:
            app_logger.error(f'Failed to send contact email notification: {str(e)}')

        return APIResponse.success(data={'id': contact.id}, message='Message received')

    except Exception as e:
        app_logger.error(f'Contact submission error: {str(e)}')
        db.session.rollback()
        return APIResponse.internal_error(message='Failed to submit message')
