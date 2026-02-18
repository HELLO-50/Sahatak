"""
Support and Help Routes
Handles user support requests, bug reports, and technical issues
"""
from flask import Blueprint, request, current_app
from utils.responses import APIResponse
from utils.validators import sanitize_input, validate_email
from utils.logging_config import app_logger
from services.email_service import email_service
from flask_mail import Message

# Blueprint is registered in app.py with url_prefix='/api/support'
# so we keep this blueprint without its own url_prefix to avoid double-prefixing.
support_bp = Blueprint('support', __name__)


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
            # Use a professional sender name to reduce spam risk
            sender=current_app.config.get(
                'MAIL_DEFAULT_SENDER',
                'Sahatak Support System <sahatak.sudan@gmail.com>'
            ),
        )
        
        # Send using the mail object
        email_service.mail.send(msg)
        app_logger.info(f'✅ HTML email sent to {recipient_email}: {subject}')
        return True
        
    except Exception as e:
        app_logger.error(f'❌ Failed to send HTML email to {recipient_email}: {str(e)}')
        return False


def build_patient_auto_reply_html(name: str, subject_label: str, support_email: str) -> str:
    """
    Build a friendly HTML email to confirm receipt of the support request.
    This is kept lightweight and fully inline‑CSS so it renders well in Gmail.
    """
    safe_name = name or "Dear patient"
    safe_subject = subject_label or "Technical Support"

    return f"""
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 0; }}
        .container {{ max-width: 640px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e3f2fd; }}
        .header {{ background: linear-gradient(135deg, #0d47a1 0%, #1976d2 40%, #42a5f5 100%); color: #ffffff; padding: 20px 24px; }}
        .header-title {{ margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.01em; }}
        .header-subtitle {{ margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }}
        .content {{ padding: 22px 24px 8px 24px; background: #ffffff; font-size: 14px; color: #263238; line-height: 1.7; }}
        .pill {{ display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e3f2fd; color: #0d47a1; font-size: 11px; font-weight: 600; margin-top: 8px; }}
        .footer {{ padding: 14px 24px 18px 24px; background: #f7f9fc; border-top: 1px solid #e3f2fd; text-align: center; }}
        .footer-text {{ font-size: 11px; color: #90a4ae; margin: 4px 0; }}
        .brand {{ font-weight: 600; color: #0d47a1; }}
        a {{ color: #1565c0; text-decoration: none; }}
        @media (max-width: 480px) {{
            .container {{ margin: 8px; }}
            .header, .content, .footer {{ padding-left: 16px; padding-right: 16px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 class="header-title">✅ Support Request Received</h2>
            <p class="header-subtitle">
                Thank you for contacting the Sahatak technical support team.
            </p>
            <div class="pill">
                Request subject: {safe_subject}
            </div>
        </div>

        <div class="content">
            <p>{safe_name},</p>
            <p>
                We have received your technical support request and it has been delivered to our team.
                One of our support members will review your message and get back to you as soon as possible,
                typically within <strong>24 hours</strong>.
            </p>
            <p>
                Please keep an eye on your email inbox (and the spam/junk folder just in case) for our reply.
            </p>
            <p>
                If your issue becomes urgent or you need to share more details, you can reply directly to this email
                or contact us at: <a href="mailto:{support_email}">{support_email}</a>.
            </p>
            <p>
                Thank you for using <span class="brand">Sahatak</span>.
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">This is an automated confirmation from the <span class="brand">Sahatak Support System</span>.</p>
            <p class="footer-text">© 2025 Sahatak – Telemedicine Platform</p>
        </div>
    </div>
</body>
</html>
    """



@support_bp.route('/report-problem', methods=['POST'])
def report_problem():
    """
    Handle bug report and problem reporting from users
    Sends email to official Sahatak email
    """
    try:
        data = request.get_json() or {}
        
        # Get form data (support both old and new field names)
        raw_subject = data.get('subject', '') or ''
        subject = sanitize_input(raw_subject, 200).strip()

        description = sanitize_input(data.get('description', ''), 5000).strip()

        # New public technical support page sends full_name + phone
        full_name = sanitize_input(data.get('full_name', ''), 200).strip()
        fallback_name = sanitize_input(data.get('name', ''), 200).strip()
        name = full_name or fallback_name

        phone = sanitize_input(data.get('phone', ''), 50).strip()

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
        
        # Get official support email (admin inbox)
        support_email = current_app.config.get('SUPPORT_EMAIL', 'sahatak.sudan@gmail.com')

        # Build email subject for technical support
        email_subject = f'🩺 Technical Support Request: {subject}'

        # Determine a human-friendly label for the subject/category
        subject_label = subject or 'Technical Support'

        # Build email body with user details in a medical-themed HTML layout
        email_body = f"""
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #f4f7fb; margin: 0; padding: 0; }}
        .container {{ max-width: 640px; margin: 24px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e3f2fd; }}
        .header {{ background: linear-gradient(135deg, #0d47a1 0%, #1976d2 40%, #42a5f5 100%); color: #ffffff; padding: 20px 24px; }}
        .header-title {{ margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.01em; }}
        .header-subtitle {{ margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.12); font-size: 11px; margin-top: 10px; }}
        .content {{ padding: 22px 24px 8px 24px; background: #ffffff; }}
        .section-title {{ font-size: 14px; font-weight: 600; color: #0d47a1; margin: 0 0 8px 0; }}
        .info-table {{ width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }}
        .info-table th {{ text-align: left; padding: 6px 0; color: #607d8b; font-weight: 500; width: 32%; vertical-align: top; }}
        .info-table td {{ padding: 6px 0; color: #263238; }}
        .pill {{ display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e3f2fd; color: #0d47a1; font-size: 11px; font-weight: 600; }}
        .message-box {{ margin-top: 6px; padding: 12px 14px; background: #f5f9ff; border-radius: 10px; border: 1px solid #e3f2fd; color: #263238; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }}
        .footer {{ padding: 14px 24px 18px 24px; background: #f7f9fc; border-top: 1px solid #e3f2fd; text-align: center; }}
        .footer-text {{ font-size: 11px; color: #90a4ae; margin: 4px 0; }}
        .brand {{ font-weight: 600; color: #0d47a1; }}
        a {{ color: #1565c0; text-decoration: none; }}
        @media (max-width: 480px) {{
            .container {{ margin: 8px; }}
            .header, .content, .footer {{ padding-left: 16px; padding-right: 16px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 class="header-title">🩺 New Technical Support Request</h2>
            <p class="header-subtitle">
                A patient has submitted a new support request from the Sahatak technical support page.
            </p>
            <div class="badge">
                Subject: {subject_label}
            </div>
        </div>
        
        <div class="content">
            <p class="section-title">Patient details</p>
            <table class="info-table" role="presentation">
                <tr>
                    <th>Full name</th>
                    <td>{name}</td>
                </tr>
                <tr>
                    <th>Email</th>
                    <td><a href="mailto:{email}">{email}</a></td>
                </tr>
                <tr>
                    <th>Phone number</th>
                    <td>{phone or 'Not provided'}</td>
                </tr>
                <tr>
                    <th>Request type</th>
                    <td><span class="pill">{subject_label}</span></td>
                </tr>
            </table>

            <p class="section-title">Issue description</p>
            <div class="message-box">
{description}
            </div>
        </div>
        
        <div class="footer">
            <p class="footer-text">This is an automated message from the <span class="brand">Sahatak</span> technical support system.</p>
            <p class="footer-text">Please reply directly to the patient if you need more information.</p>
            <p class="footer-text">© 2025 Sahatak – Telemedicine Platform</p>
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

        # Optional: send automatic confirmation email back to the patient.
        # This should never block or fail the main support flow.
        try:
            auto_reply_html = build_patient_auto_reply_html(name=name, subject_label=subject_label, support_email=support_email)
            if send_html_email(email, '✅ We received your support request – Sahatak', auto_reply_html):
                app_logger.info(f'📨 Auto-reply email sent to patient {email} for support request')
            else:
                app_logger.warning(f'Auto-reply email service not configured or failed for patient {email}')
        except Exception as auto_err:
            app_logger.error(f'❌ Failed to send auto-reply email to patient {email}: {str(auto_err)}')

        return APIResponse.success(
            data={'message': 'Thank you for reporting this issue'},
            message='Your support request has been sent successfully to our team'
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

