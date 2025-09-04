"""
WebSocket Service for Real-time Messaging
Handles Socket.IO events for patient-doctor communication
"""

from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request
from datetime import datetime
import json
from utils.logging_config import app_logger
from models import User

# Global SocketIO instance
socketio = None
# Active connections tracking
active_connections = {}
# Typing indicators tracking
typing_users = {}

def authenticate_websocket_user(token):
    """Authenticate WebSocket user using JWT token"""
    if not token:
        return None
    
    try:
        # Try JWT authentication first
        from utils.jwt_helper import JWTHelper
        payload = JWTHelper.decode_token(token)
        
        if payload:
            user_id = payload.get('user_id')
            if user_id:
                user = User.query.get(user_id)
                if user and user.is_active:
                    app_logger.info(f"WebSocket JWT auth successful for user {user.id}")
                    return user
                    
    except ImportError:
        # Fallback to base64 token
        try:
            import base64
            import json
            
            token_json = base64.b64decode(token.encode()).decode()
            payload = json.loads(token_json)
            
            exp_time = payload.get('exp', 0)
            current_time = int(datetime.utcnow().timestamp())
            
            if exp_time >= current_time:
                user_id = payload.get('user_id')
                if user_id:
                    user = User.query.get(user_id)
                    if user and user.is_active:
                        app_logger.info(f"WebSocket fallback auth successful for user {user.id}")
                        return user
                        
        except Exception as e:
            app_logger.error(f"WebSocket fallback auth error: {str(e)}")
            
    except Exception as e:
        app_logger.error(f"WebSocket JWT auth error: {str(e)}")
    
    return None

def get_websocket_user():
    """Get the authenticated user for current WebSocket session"""
    connection = active_connections.get(request.sid)
    if connection:
        return connection.get('user')
    return None

def init_socketio(app):
    """Initialize SocketIO with Flask app"""
    global socketio
    socketio = SocketIO(
        app, 
        cors_allowed_origins="*",
        logger=False,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25
    )
    
    # Register event handlers
    register_message_handlers()
    register_connection_handlers()
    register_typing_handlers()
    
    app_logger.info("WebSocket service initialized")
    return socketio

def register_connection_handlers():
    """Register connection-related Socket.IO event handlers"""
    
    @socketio.on('connect')
    def handle_connect(auth):
        # Get token from auth data
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get('token')
        
        # Authenticate user using token
        user = authenticate_websocket_user(token)
        if not user:
            app_logger.warning(f"Unauthorized WebSocket connection attempt from {request.sid}")
            disconnect()
            return False
        
        # Track connection
        active_connections[request.sid] = {
            'user_id': user.id,
            'user_type': user.user_type,
            'connected_at': datetime.utcnow().isoformat(),
            'user': user  # Store user object for other handlers
        }
        
        # Join user to their personal room
        personal_room = f"user_{user.id}"
        join_room(personal_room)
        
        app_logger.info(f"User {user.id} connected via WebSocket (sid: {request.sid})")
        
        # Emit connection success
        emit('connection_status', {
            'status': 'connected',
            'user_id': user.id,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        return True
    
    @socketio.on('disconnect')
    def handle_disconnect():
        if request.sid in active_connections:
            user_data = active_connections[request.sid]
            user_id = user_data['user_id']
            
            # Remove from typing indicators
            cleanup_typing_indicator(user_id)
            
            # Remove connection
            del active_connections[request.sid]
            
            app_logger.info(f"User {user_id} disconnected from WebSocket (sid: {request.sid})")
            
            # Notify other users in conversations that this user went offline
            emit_user_status_change(user_id, 'offline')

def register_message_handlers():
    """Register message-related Socket.IO event handlers"""
    
    @socketio.on('join_conversation')
    def handle_join_conversation(data):
        current_user = get_websocket_user()
        if not current_user:
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        # Join conversation room
        room_name = f"conversation_{conversation_id}"
        join_room(room_name)
        
        app_logger.info(f"User {current_user.id} joined conversation {conversation_id}")
        
        # Notify others in the room
        emit('user_joined_conversation', {
            'user_id': current_user.id,
            'user_name': current_user.full_name,
            'user_type': current_user.user_type,
            'conversation_id': conversation_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=room_name, include_self=False)
    
    @socketio.on('leave_conversation')
    def handle_leave_conversation(data):
        current_user = get_websocket_user()
        if not current_user:
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        # Leave conversation room
        room_name = f"conversation_{conversation_id}"
        leave_room(room_name)
        
        # Stop typing indicator for this conversation
        stop_typing_indicator(conversation_id, current_user.id)
        
        app_logger.info(f"User {current_user.id} left conversation {conversation_id}")
        
        # Notify others in the room
        emit('user_left_conversation', {
            'user_id': current_user.id,
            'conversation_id': conversation_id,
            'timestamp': datetime.utcnow().isoformat()
        }, room=room_name, include_self=False)

def register_typing_handlers():
    """Register typing indicator Socket.IO event handlers"""
    
    @socketio.on('typing_start')
    def handle_typing_start(data):
        current_user = get_websocket_user()
        if not current_user:
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        # Track typing
        if conversation_id not in typing_users:
            typing_users[conversation_id] = {}
        
        typing_users[conversation_id][current_user.id] = {
            'user_name': current_user.full_name,
            'user_type': current_user.user_type,
            'started_at': datetime.utcnow().isoformat()
        }
        
        # Emit to others in conversation
        room_name = f"conversation_{conversation_id}"
        emit('user_typing_start', {
            'user_id': current_user.id,
            'user_name': current_user.full_name,
            'conversation_id': conversation_id
        }, room=room_name, include_self=False)
    
    @socketio.on('typing_stop')
    def handle_typing_stop(data):
        current_user = get_websocket_user()
        if not current_user:
            return
        
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            return
        
        stop_typing_indicator(conversation_id, current_user.id)

def stop_typing_indicator(conversation_id, user_id):
    """Stop typing indicator for a user in a conversation"""
    if conversation_id in typing_users and user_id in typing_users[conversation_id]:
        del typing_users[conversation_id][user_id]
        
        # Clean up empty conversation
        if not typing_users[conversation_id]:
            del typing_users[conversation_id]
        
        # Emit to others in conversation
        room_name = f"conversation_{conversation_id}"
        socketio.emit('user_typing_stop', {
            'user_id': user_id,
            'conversation_id': conversation_id
        }, room=room_name)

def cleanup_typing_indicator(user_id):
    """Clean up all typing indicators for a user when they disconnect"""
    conversations_to_clean = []
    
    for conversation_id, users in typing_users.items():
        if user_id in users:
            conversations_to_clean.append(conversation_id)
    
    for conversation_id in conversations_to_clean:
        stop_typing_indicator(conversation_id, user_id)

def emit_user_status_change(user_id, status):
    """Emit user online/offline status change to relevant conversations"""
    # This would query the database to find conversations the user is part of
    # and emit status changes to those rooms
    socketio.emit('user_status_change', {
        'user_id': user_id,
        'status': status,
        'timestamp': datetime.utcnow().isoformat()
    }, room=f"user_{user_id}")

# API functions for other parts of the application

def emit_new_message(conversation_id, message_data, sender_id):
    """Emit new message to conversation room"""
    if not socketio:
        return
    
    room_name = f"conversation_{conversation_id}"
    
    # Emit to conversation room
    socketio.emit('new_message', {
        'conversation_id': conversation_id,
        'message': message_data,
        'sender_id': sender_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)
    
    # Stop typing indicator for sender
    stop_typing_indicator(conversation_id, sender_id)
    
    app_logger.info(f"Emitted new message to conversation {conversation_id}")

def emit_message_status_update(conversation_id, message_id, status, user_id):
    """Emit message status update (sent, delivered, read)"""
    if not socketio:
        return
    
    room_name = f"conversation_{conversation_id}"
    
    socketio.emit('message_status_update', {
        'conversation_id': conversation_id,
        'message_id': message_id,
        'status': status,
        'user_id': user_id,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

def emit_conversation_update(conversation_id, update_data):
    """Emit conversation metadata updates"""
    if not socketio:
        return
    
    room_name = f"conversation_{conversation_id}"
    
    socketio.emit('conversation_update', {
        'conversation_id': conversation_id,
        'updates': update_data,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

def emit_notification(user_id, notification_data):
    """Emit real-time notification to a specific user"""
    if not socketio:
        return
    
    socketio.emit('notification', notification_data, room=f"user_{user_id}")
    app_logger.info(f"Emitted notification to user {user_id}")

def get_active_connections():
    """Get list of active WebSocket connections"""
    return active_connections.copy()

def get_typing_users(conversation_id):
    """Get users currently typing in a conversation"""
    return typing_users.get(conversation_id, {}).copy()

def is_user_online(user_id):
    """Check if a user is currently connected via WebSocket"""
    for connection in active_connections.values():
        if connection['user_id'] == user_id:
            return True
    return False

def get_online_users():
    """Get list of all online user IDs"""
    return list(set(conn['user_id'] for conn in active_connections.values()))