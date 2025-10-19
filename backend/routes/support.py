from flask import Blueprint, request, jsonify
from utils.jwt_helper import jwt_required
from services.email_service import email_service
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

support_bp = Blueprint('support', __name__)

@support_bp.route('/api/support/report-problem', methods=['POST'])
@jwt_required
def report_problem():
    """
    Request problem reports from users
    """
    try:
        data = request.get_json()
        current_user = request.jwt_payload
        
        # Verify the required data
        if not data.get('subject') or not data.get('description'):
            return jsonify({
                'success': False,
                'message': 'الموضوع والوصف مطلوبان'
            }), 400

        # Prepare report data
        report_data = {
            'user_id': current_user.get('user_id'),
            'user_name': data.get('name', current_user.get('name', 'Unknown')),
            'user_email': data.get('email', current_user.get('email', 'Unknown')),
            'subject': data['subject'],
            'description': data['description'],
            'type': 'problem_report',
            'timestamp': datetime.utcnow().isoformat()
        }

        # Send email to support
        email_sent = email_service.send_custom_email(
            recipient_email="sahatak.sudan@gmail.com",
            subject=f"تقرير مشكلة: {data['subject']}",
            body=f"""
            تقرير مشكلة جديد:
            
            المستخدم: {report_data['user_name']} (ID: {report_data['user_id']})
            البريد: {report_data['user_email']}
            
            الموضوع: {data['subject']}
            الوصف:
            {data['description']}
            
            الوقت: {report_data['timestamp']}
            """
        )

        if email_sent:
            logger.info(f"Problem report sent from user {current_user.get('user_id')}")
            return jsonify({
                'success': True,
                'message': 'تم إرسال التقرير بنجاح، سنقوم بالرد عليك قريباً'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'حدث خطأ أثناء إرسال التقرير'
            }), 500

    except Exception as e:
        logger.error(f"Error in report problem: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'حدث خطأ داخلي في الخادم'
        }), 500

@support_bp.route('/api/support/contact-supervisor', methods=['POST'])
@jwt_required
def contact_supervisor():
    """
    إرسال رسائل للمشرفين
    """
    try:
        data = request.get_json()
        current_user = request.jwt_payload
        
        # التحقق من البيانات المطلوبة
        required_fields = ['to', 'subject', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'حقل {field} مطلوب'
                }), 400

        # تحديد بريد المشرف
        supervisor_emails = {
            'lead': 'lead.supervisor@sahatak.com',
            'ops': 'operations@sahatak.com', 
            'tech': 'technical.support@sahatak.com'
        }
        
        supervisor_email = supervisor_emails.get(data['to'], 'support@sahatak.com')

        # إعداد بيانات الرسالة
        message_data = {
            'user_id': current_user.get('user_id'),
            'user_name': data.get('name', current_user.get('name', 'Unknown')),
            'user_email': data.get('email', current_user.get('email', 'Unknown')),
            'to_supervisor': data['to'],
            'subject': data['subject'],
            'message': data['message'],
            'contact_info': data.get('contact', ''),
            'timestamp': datetime.utcnow().isoformat()
        }

        # إرسال إيميل للمشرف
        email_sent = email_service.send_custom_email(
            recipient_email=supervisor_email,
            subject=f"رسالة مشرف: {data['subject']}",
            body=f"""
            رسالة جديدة للمشرف:
            
            من: {message_data['user_name']} (ID: {message_data['user_id']})
            البريد: {message_data['user_email']}
            معلومات الاتصال: {message_data['contact_info']}
            
            الموضوع: {data['subject']}
            الرسالة:
            {data['message']}
            
            الوقت: {message_data['timestamp']}
            """
        )

        if email_sent:
            logger.info(f"Supervisor message sent from user {current_user.get('user_id')} to {data['to']}")
            return jsonify({
                'success': True,
                'message': 'تم إرسال رسالتك للمشرف بنجاح'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'حدث خطأ أثناء إرسال الرسالة'
            }), 500

    except Exception as e:
        logger.error(f"Error in contact supervisor: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'حدث خطأ داخلي في الخادم'
        }), 500