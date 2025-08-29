"""
Debug routes for checking database state
IMPORTANT: Remove this file in production!
"""
from flask import Blueprint, jsonify
from models import User

debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/check-admin/<email>', methods=['GET'])
def check_admin(email):
    """Check if a user exists and their type"""
    user = User.query.filter_by(email=email).first()
    
    if not user:
        return jsonify({
            'found': False,
            'message': f'User with email {email} not found'
        })
    
    return jsonify({
        'found': True,
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'user_type': user.user_type,
        'is_active': user.is_active,
        'is_verified': user.is_verified,
        'has_password': bool(user.password_hash)
    })

@debug_bp.route('/list-admins', methods=['GET'])
def list_admins():
    """List all admin users"""
    admins = User.query.filter_by(user_type='admin').all()
    
    return jsonify({
        'count': len(admins),
        'admins': [
            {
                'id': admin.id,
                'email': admin.email,
                'full_name': admin.full_name,
                'is_active': admin.is_active
            }
            for admin in admins
        ]
    })