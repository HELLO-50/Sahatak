# Chat System in Sahatak Telemedicine Platform

## Table of Contents
1. [What is the Chat System?](#what-is-the-chat-system)
2. [Why Real-time Communication?](#why-real-time-communication)
3. [Chat Architecture Overview](#chat-architecture-overview)
4. [Database Structure](#database-structure)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Real-time Communication](#real-time-communication)
8. [Message Types & Features](#message-types--features)
9. [Security & Privacy](#security--privacy)
10. [Common Chat Patterns](#common-chat-patterns)
11. [Error Handling](#error-handling)
12. [Real Examples](#real-examples)

## What is the Chat System?

The chat system in Sahatak enables real-time communication between patients and doctors. Think of it like WhatsApp, but specifically designed for medical consultations with enhanced privacy and security features.

### Key Features
- **Real-time messaging**: Messages appear instantly without page refresh
- **Patient-Doctor conversations**: Direct communication channels
- **Message history**: All conversations are saved and searchable
- **File sharing**: Share medical documents and images
- **Online status**: See when participants are online
- **Message delivery status**: Know when messages are sent and read
- **Secure communication**: End-to-end encryption for medical data

### Why is Chat Important in Telemedicine?

```
Traditional Medical Communication:
┌─────────────┐    Phone Call    ┌─────────────┐
│   Patient   │◄────────────────►│   Doctor    │
└─────────────┘                  └─────────────┘
    • No record of conversation
    • Can't share files easily
    • Must be available at same time

Sahatak Chat System:
┌─────────────┐   Real-time     ┌─────────────┐
│   Patient   │◄──── Chat ─────►│   Doctor    │
└─────────────┘                 └─────────────┘
         │                            │
         └──────── Database ──────────┘
    • Complete conversation history
    • File sharing capabilities
    • Asynchronous communication
    • Searchable message history
```

## Why Real-time Communication?

### Without Real-time (Traditional Web)
```
Patient sends message → Page refresh needed → Doctor sees message
Doctor replies → Page refresh needed → Patient sees reply
```
**Problems:**
- Poor user experience
- Constant page refreshes
- Delays in communication
- No instant notifications

### With Real-time (Sahatak System)
```
Patient types message → Instantly appears on doctor's screen
Doctor types reply → Instantly appears on patient's screen
```
**Benefits:**
- Instant communication
- Better user experience
- Real-time notifications
- Feels like natural conversation

## Chat Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                       │
│  ┌─────────────────┐              ┌─────────────────┐       │
│  │  Patient Chat   │              │  Doctor Chat    │       │
│  │     Interface   │              │    Interface    │       │
│  └─────────────────┘              └─────────────────┘       │
│           │                                │                │
│           │        WebSocket Connection    │                │
│           └───────────────┬───────────────┘                │
└───────────────────────────┼───────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Flask + SocketIO)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Message API   │  │   WebSocket     │  │ Conversation│ │
│  │   /messages/*   │  │   Events        │  │ Management  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                │                           │
└────────────────────────────────┼───────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database                               │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Conversations  │  │    Messages     │                  │
│  │     Table       │  │     Table       │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Frontend Chat Interface**: JavaScript-based chat UI
2. **WebSocket Connection**: Real-time bidirectional communication
3. **Backend API**: REST endpoints for chat operations
4. **SocketIO Events**: Real-time event handling
5. **Database Tables**: Store conversations and messages

## Database Structure

### Conversations Table
```sql
-- backend/models.py - Conversation model
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (patient_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES users(id)
);
```

```python
# backend/models.py
class Conversation(db.Model):
    """Represents a chat conversation between patient and doctor"""
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_message_at = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    patient = db.relationship('User', foreign_keys=[patient_id])
    doctor = db.relationship('User', foreign_keys=[doctor_id])
    messages = db.relationship('Message', backref='conversation', lazy='dynamic')
    
    def has_participant(self, user_id):
        """Check if user is part of this conversation"""
        return user_id in [self.patient_id, self.doctor_id]
    
    def get_other_participant(self, user_id):
        """Get the other participant in the conversation"""
        if user_id == self.patient_id:
            return self.doctor
        elif user_id == self.doctor_id:
            return self.patient
        return None
```

### Messages Table
```sql
-- backend/models.py - Message model
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    file_path VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

```python
# backend/models.py
class Message(db.Model):
    """Represents a single message in a conversation"""
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    message_type = db.Column(db.String(20), default='text')  # 'text', 'file', 'image'
    file_path = db.Column(db.String(255))  # For file attachments
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('User', backref='sent_messages')
    
    def to_dict(self):
        """Convert message to dictionary for API responses"""
        return {
            'id': self.id,
            'conversation_id': self.conversation_id,
            'sender_id': self.sender_id,
            'sender_name': self.sender.full_name,
            'message': self.message,
            'message_type': self.message_type,
            'file_path': self.file_path,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
```

## Backend Implementation

### Message API Routes

#### 1. Get Conversations (`backend/routes/messages.py`)
```python
@messages_bp.route('/conversations', methods=['GET'])
@api_login_required
def get_conversations():
    """Get all conversations for the current user"""
    try:
        # Get conversations where user is participant
        if current_user.user_type == 'patient':
            conversations = Conversation.query.filter_by(
                patient_id=current_user.id,
                is_active=True
            ).all()
        else:  # doctor
            conversations = Conversation.query.filter_by(
                doctor_id=current_user.id,
                is_active=True
            ).all()
        
        # Format conversations with last message and participant info
        conversations_data = []
        for conv in conversations:
            other_participant = conv.get_other_participant(current_user.id)
            last_message = conv.messages.order_by(Message.created_at.desc()).first()
            
            conversations_data.append({
                'id': conv.id,
                'participant': {
                    'id': other_participant.id,
                    'name': other_participant.full_name,
                    'user_type': other_participant.user_type
                },
                'last_message': last_message.to_dict() if last_message else None,
                'last_message_at': conv.last_message_at.isoformat() if conv.last_message_at else None,
                'unread_count': conv.messages.filter_by(
                    is_read=False
                ).filter(Message.sender_id != current_user.id).count()
            })
        
        return APIResponse.success(
            data={'conversations': conversations_data}
        )
        
    except Exception as e:
        logger.error(f"Get conversations error: {str(e)}")
        return APIResponse.internal_error('Failed to load conversations')
```

#### 2. Get Messages (`backend/routes/messages.py`)
```python
@messages_bp.route('/conversations/<int:conversation_id>', methods=['GET'])
@api_login_required
def get_messages(conversation_id):
    """Get messages in a conversation"""
    try:
        # Verify user has access to this conversation
        conversation = Conversation.query.get_or_404(conversation_id)
        
        if not conversation.has_participant(current_user.id):
            return APIResponse.forbidden('Access denied to this conversation')
        
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        # Get messages (newest first for pagination, but reverse for display)
        messages = Message.query.filter_by(conversation_id=conversation_id)\
                              .order_by(Message.created_at.desc())\
                              .paginate(page=page, per_page=per_page)
        
        # Mark messages as read for the current user
        unread_messages = Message.query.filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).all()
        
        for msg in unread_messages:
            msg.is_read = True
        db.session.commit()
        
        return APIResponse.success(
            data={
                'messages': [msg.to_dict() for msg in reversed(messages.items)],
                'pagination': {
                    'total': messages.total,
                    'page': page,
                    'per_page': per_page,
                    'has_next': messages.has_next,
                    'has_prev': messages.has_prev
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Get messages error: {str(e)}")
        return APIResponse.internal_error('Failed to load messages')
```

#### 3. Send Message (`backend/routes/messages.py`)
```python
@messages_bp.route('/', methods=['POST'])
@api_login_required
def send_message():
    """Send a new message"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('conversation_id') or not data.get('message'):
            return APIResponse.validation_error(
                field='message',
                message='Conversation ID and message are required'
            )
        
        conversation_id = data['conversation_id']
        
        # Verify conversation exists and user has access
        conversation = Conversation.query.get_or_404(conversation_id)
        
        if not conversation.has_participant(current_user.id):
            return APIResponse.forbidden('Access denied to this conversation')
        
        # Create new message
        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            message=data['message'].strip(),
            message_type=data.get('message_type', 'text')
        )
        
        db.session.add(message)
        
        # Update conversation's last message timestamp
        conversation.last_message_at = datetime.utcnow()
        
        db.session.commit()
        
        # Emit real-time event to other participants
        from app import socketio
        socketio.emit('new_message', {
            'message': message.to_dict(),
            'conversation_id': conversation_id
        }, room=f'conversation_{conversation_id}')
        
        return APIResponse.success(
            data={'message': message.to_dict()},
            message='Message sent successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Send message error: {str(e)}")
        return APIResponse.internal_error('Failed to send message')
```

#### 4. Create Conversation (`backend/routes/messages.py`)
```python
@messages_bp.route('/conversations', methods=['POST'])
@api_login_required
def create_conversation():
    """Create a new conversation between patient and doctor"""
    try:
        data = request.get_json()
        
        # Validate participant
        participant_id = data.get('participant_id')
        if not participant_id:
            return APIResponse.validation_error(
                field='participant_id',
                message='Participant ID is required'
            )
        
        participant = User.query.get_or_404(participant_id)
        
        # Ensure conversation is between patient and doctor
        if current_user.user_type == 'patient':
            if participant.user_type != 'doctor':
                return APIResponse.validation_error(
                    field='participant_id',
                    message='Patients can only start conversations with doctors'
                )
            patient_id = current_user.id
            doctor_id = participant_id
        else:  # current user is doctor
            if participant.user_type != 'patient':
                return APIResponse.validation_error(
                    field='participant_id',
                    message='Doctors can only start conversations with patients'
                )
            patient_id = participant_id
            doctor_id = current_user.id
        
        # Check if conversation already exists
        existing_conversation = Conversation.query.filter_by(
            patient_id=patient_id,
            doctor_id=doctor_id,
            is_active=True
        ).first()
        
        if existing_conversation:
            return APIResponse.success(
                data={'conversation': {
                    'id': existing_conversation.id,
                    'participant': {
                        'id': participant.id,
                        'name': participant.full_name,
                        'user_type': participant.user_type
                    }
                }},
                message='Conversation already exists'
            )
        
        # Create new conversation
        conversation = Conversation(
            patient_id=patient_id,
            doctor_id=doctor_id
        )
        
        db.session.add(conversation)
        db.session.commit()
        
        return APIResponse.success(
            data={'conversation': {
                'id': conversation.id,
                'participant': {
                    'id': participant.id,
                    'name': participant.full_name,
                    'user_type': participant.user_type
                }
            }},
            message='Conversation created successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create conversation error: {str(e)}")
        return APIResponse.internal_error('Failed to create conversation')
```

## Real-time Communication

### WebSocket Setup (`backend/routes/socketio_events.py`)

```python
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import verify_jwt_in_request, get_jwt

# Initialize SocketIO
socketio = SocketIO(
    cors_allowed_origins=[
        "http://localhost:*",
        "https://hello-50.github.io"
    ],
    async_mode='threading'
)

@socketio.on('connect')
def handle_connect():
    """Handle user connection to WebSocket"""
    try:
        # Verify JWT token for WebSocket connection
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = claims.get('sub')
        
        print(f"User {user_id} connected to WebSocket")
        
        # Join user to their personal room for notifications
        join_room(f'user_{user_id}')
        
        emit('connection_status', {
            'status': 'connected',
            'user_id': user_id
        })
        
    except Exception as e:
        print(f"WebSocket connection error: {str(e)}")
        emit('connection_status', {
            'status': 'error',
            'message': 'Authentication failed'
        })

@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join a conversation room for real-time messages"""
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = claims.get('sub')
        
        conversation_id = data.get('conversation_id')
        
        # Verify user has access to this conversation
        conversation = Conversation.query.get(conversation_id)
        if not conversation or not conversation.has_participant(user_id):
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join conversation room
        room_name = f'conversation_{conversation_id}'
        join_room(room_name)
        
        print(f"User {user_id} joined conversation {conversation_id}")
        
        emit('conversation_joined', {
            'conversation_id': conversation_id,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"Join conversation error: {str(e)}")
        emit('error', {'message': 'Failed to join conversation'})

@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """Leave a conversation room"""
    try:
        conversation_id = data.get('conversation_id')
        room_name = f'conversation_{conversation_id}'
        leave_room(room_name)
        
        emit('conversation_left', {
            'conversation_id': conversation_id,
            'status': 'success'
        })
        
    except Exception as e:
        print(f"Leave conversation error: {str(e)}")

@socketio.on('typing')
def handle_typing(data):
    """Handle typing indicator"""
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = claims.get('sub')
        user_name = claims.get('full_name', 'User')
        
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', False)
        
        # Broadcast typing status to conversation room (except sender)
        emit('user_typing', {
            'user_id': user_id,
            'user_name': user_name,
            'is_typing': is_typing,
            'conversation_id': conversation_id
        }, room=f'conversation_{conversation_id}', include_self=False)
        
    except Exception as e:
        print(f"Typing indicator error: {str(e)}")

@socketio.on('disconnect')
def handle_disconnect():
    """Handle user disconnection"""
    try:
        verify_jwt_in_request()
        claims = get_jwt()
        user_id = claims.get('sub')
        
        print(f"User {user_id} disconnected from WebSocket")
        
        # Leave all rooms (automatic cleanup)
        leave_room(f'user_{user_id}')
        
    except Exception as e:
        print(f"WebSocket disconnect error: {str(e)}")
```

## Frontend Implementation

### Chat Interface (`frontend/assets/js/components/messaging.js`)

```javascript
class MessagingManager {
    constructor() {
        this.socket = null;
        this.currentConversationId = null;
        this.conversations = [];
        this.messages = [];
        this.typingTimer = null;
        this.isInitialized = false;
    }
    
    // Initialize the messaging system
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Connect to WebSocket
            await this.connectWebSocket();
            
            // Load conversations
            await this.loadConversations();
            
            // Set up UI event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('Messaging system initialized');
            
        } catch (error) {
            console.error('Failed to initialize messaging:', error);
            this.showError('Failed to initialize chat system');
        }
    }
    
    // Connect to WebSocket server
    connectWebSocket() {
        return new Promise((resolve, reject) => {
            const token = localStorage.getItem('sahatak_access_token');
            if (!token) {
                reject(new Error('No authentication token'));
                return;
            }
            
            // Initialize Socket.IO connection with authentication
            this.socket = io('https://sahatak.pythonanywhere.com', {
                auth: {
                    token: token
                },
                transports: ['websocket', 'polling']
            });
            
            // Connection event handlers
            this.socket.on('connect', () => {
                console.log('WebSocket connected');
                resolve();
            });
            
            this.socket.on('connection_status', (data) => {
                if (data.status === 'error') {
                    reject(new Error(data.message));
                }
            });
            
            this.socket.on('disconnect', () => {
                console.log('WebSocket disconnected');
                this.showError('Connection lost. Trying to reconnect...');
            });
            
            this.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                reject(error);
            });
            
            // Message event handlers
            this.socket.on('new_message', (data) => {
                this.handleNewMessage(data);
            });
            
            this.socket.on('user_typing', (data) => {
                this.handleTypingIndicator(data);
            });
            
            this.socket.on('error', (data) => {
                console.error('WebSocket error:', data);
                this.showError(data.message);
            });
        });
    }
    
    // Load user's conversations
    async loadConversations() {
        try {
            const response = await ApiHelper.makeRequest('/messages/conversations');
            
            if (response.success) {
                this.conversations = response.data.conversations;
                this.displayConversations();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            this.showError('Failed to load conversations');
        }
    }
    
    // Load messages for a conversation
    async loadMessages(conversationId, page = 1) {
        try {
            const response = await ApiHelper.makeRequest(
                `/messages/conversations/${conversationId}?page=${page}&per_page=50`
            );
            
            if (response.success) {
                if (page === 1) {
                    this.messages = response.data.messages;
                } else {
                    // Prepend older messages for pagination
                    this.messages = [...response.data.messages, ...this.messages];
                }
                
                this.displayMessages();
                
                // Join conversation room for real-time updates
                if (page === 1) {
                    this.joinConversation(conversationId);
                }
                
                return response.data.pagination;
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            this.showError('Failed to load messages');
        }
    }
    
    // Send a message
    async sendMessage(message, messageType = 'text') {
        if (!this.currentConversationId || !message.trim()) {
            return;
        }
        
        try {
            const messageData = {
                conversation_id: this.currentConversationId,
                message: message.trim(),
                message_type: messageType
            };
            
            const response = await ApiHelper.makeRequest('/messages', {
                method: 'POST',
                body: JSON.stringify(messageData)
            });
            
            if (response.success) {
                // Message will be added via WebSocket event
                // Clear the input
                this.clearMessageInput();
                
                // Update conversation list
                this.updateConversationLastMessage(response.data.message);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.showError('Failed to send message');
        }
    }
    
    // Join a conversation room
    joinConversation(conversationId) {
        if (this.socket && this.socket.connected) {
            // Leave current conversation
            if (this.currentConversationId) {
                this.socket.emit('leave_conversation', {
                    conversation_id: this.currentConversationId
                });
            }
            
            // Join new conversation
            this.currentConversationId = conversationId;
            this.socket.emit('join_conversation', {
                conversation_id: conversationId
            });
        }
    }
    
    // Handle incoming real-time message
    handleNewMessage(data) {
        const message = data.message;
        
        // Add message to current conversation if it matches
        if (message.conversation_id === this.currentConversationId) {
            this.messages.push(message);
            this.displayNewMessage(message);
            this.scrollToBottom();
        }
        
        // Update conversation list
        this.updateConversationLastMessage(message);
        
        // Show notification if conversation is not active
        if (message.conversation_id !== this.currentConversationId) {
            this.showNotification(message);
        }
    }
    
    // Handle typing indicators
    handleTypingIndicator(data) {
        if (data.conversation_id === this.currentConversationId) {
            if (data.is_typing) {
                this.showTypingIndicator(data.user_name);
            } else {
                this.hideTypingIndicator(data.user_id);
            }
        }
    }
    
    // Send typing indicator
    sendTypingIndicator(isTyping) {
        if (this.socket && this.socket.connected && this.currentConversationId) {
            this.socket.emit('typing', {
                conversation_id: this.currentConversationId,
                is_typing: isTyping
            });
        }
    }
    
    // Set up UI event listeners
    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('message_input');
        const sendButton = document.getElementById('send_button');
        
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(messageInput.value);
                }
            });
            
            // Typing indicator
            messageInput.addEventListener('input', () => {
                this.sendTypingIndicator(true);
                
                // Clear previous timer
                if (this.typingTimer) {
                    clearTimeout(this.typingTimer);
                }
                
                // Stop typing after 3 seconds of no input
                this.typingTimer = setTimeout(() => {
                    this.sendTypingIndicator(false);
                }, 3000);
            });
        }
        
        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage(messageInput.value);
            });
        }
    }
    
    // Display conversations in sidebar
    displayConversations() {
        const conversationsList = document.getElementById('conversations_list');
        if (!conversationsList) return;
        
        conversationsList.innerHTML = '';
        
        this.conversations.forEach(conversation => {
            const conversationElement = this.createConversationElement(conversation);
            conversationsList.appendChild(conversationElement);
        });
    }
    
    // Create conversation element
    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.dataset.conversationId = conversation.id;
        
        const lastMessage = conversation.last_message;
        const lastMessageText = lastMessage 
            ? (lastMessage.message_type === 'text' 
                ? lastMessage.message 
                : `📎 ${lastMessage.message_type}`)
            : 'No messages yet';
        
        const unreadBadge = conversation.unread_count > 0 
            ? `<span class="unread-badge">${conversation.unread_count}</span>`
            : '';
        
        div.innerHTML = `
            <div class="conversation-avatar">
                <i class="bi bi-person-circle"></i>
            </div>
            <div class="conversation-info">
                <div class="conversation-name">
                    ${conversation.participant.name}
                    <span class="user-type-badge ${conversation.participant.user_type}">
                        ${conversation.participant.user_type}
                    </span>
                </div>
                <div class="last-message">${lastMessageText}</div>
                <div class="last-message-time">
                    ${lastMessage ? this.formatMessageTime(lastMessage.created_at) : ''}
                </div>
            </div>
            ${unreadBadge}
        `;
        
        // Click handler
        div.addEventListener('click', () => {
            this.openConversation(conversation);
        });
        
        return div;
    }
    
    // Open a conversation
    async openConversation(conversation) {
        // Update UI to show active conversation
        this.setActiveConversation(conversation.id);
        
        // Load messages
        await this.loadMessages(conversation.id);
        
        // Update conversation title
        document.getElementById('conversation_title').textContent = 
            conversation.participant.name;
        
        // Show chat area
        document.getElementById('chat_area').classList.remove('d-none');
    }
    
    // Display messages in chat area
    displayMessages() {
        const messagesContainer = document.getElementById('messages_container');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
        
        this.scrollToBottom();
    }
    
    // Create message element
    createMessageElement(message) {
        const currentUserId = parseInt(localStorage.getItem('sahatak_user_id'));
        const isOwnMessage = message.sender_id === currentUserId;
        
        const div = document.createElement('div');
        div.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        
        div.innerHTML = `
            <div class="message-content">
                ${message.message_type === 'text' 
                    ? `<p>${this.escapeHtml(message.message)}</p>`
                    : this.renderFileMessage(message)
                }
                <div class="message-time">
                    ${this.formatMessageTime(message.created_at)}
                    ${isOwnMessage ? (message.is_read ? '✓✓' : '✓') : ''}
                </div>
            </div>
        `;
        
        return div;
    }
    
    // Utility functions
    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (date.toDateString() === now.toDateString()) { // Today
            return date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit', 
                hour12: true 
            });
        } else { // Other days
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages_container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    showError(message) {
        // Show error notification
        console.error('Chat error:', message);
        // Implement your error display logic here
    }
    
    showNotification(message) {
        // Show desktop notification for new messages
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`New message from ${message.sender_name}`, {
                body: message.message_type === 'text' 
                    ? message.message 
                    : 'Sent a file',
                icon: '/assets/img/notification-icon.png'
            });
        }
    }
}

// Initialize messaging when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on pages that need messaging
    if (document.getElementById('messaging_container')) {
        window.messagingManager = new MessagingManager();
        window.messagingManager.init();
    }
});
```

## Message Types & Features

### 1. Text Messages
```javascript
// Send text message
await messagingManager.sendMessage("Hello doctor, I have a question about my prescription");
```

### 2. File Attachments
```javascript
// frontend/assets/js/components/messaging.js
async sendFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversation_id', this.currentConversationId);
    formData.append('message_type', file.type.startsWith('image/') ? 'image' : 'file');
    
    try {
        const response = await ApiHelper.makeRequest('/messages/upload', {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData
            },
            body: formData
        });
        
        if (response.success) {
            // File message will be added via WebSocket
            console.log('File sent successfully');
        }
    } catch (error) {
        this.showError('Failed to send file');
    }
}
```

### 3. Typing Indicators
```javascript
// Show when user is typing
this.socket.on('user_typing', (data) => {
    if (data.is_typing) {
        this.showTypingIndicator(`${data.user_name} is typing...`);
    } else {
        this.hideTypingIndicator(data.user_id);
    }
});
```

### 4. Read Receipts
```python
# backend/routes/messages.py - Mark messages as read
def mark_messages_as_read(conversation_id, user_id):
    """Mark all unread messages as read for a user"""
    unread_messages = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,  # Not sent by current user
        Message.is_read == False
    ).all()
    
    for message in unread_messages:
        message.is_read = True
    
    db.session.commit()
    
    # Emit read receipt via WebSocket
    socketio.emit('messages_read', {
        'conversation_id': conversation_id,
        'reader_id': user_id,
        'message_ids': [msg.id for msg in unread_messages]
    }, room=f'conversation_{conversation_id}')
```

## Security & Privacy

### 1. Authentication
```python
# All message endpoints require authentication
@messages_bp.route('/conversations', methods=['GET'])
@api_login_required  # JWT token required
def get_conversations():
    # Only return user's own conversations
    pass
```

### 2. Authorization
```python
# Verify user has access to conversation
def verify_conversation_access(conversation_id, user_id):
    conversation = Conversation.query.get(conversation_id)
    if not conversation or not conversation.has_participant(user_id):
        raise PermissionError('Access denied to this conversation')
```

### 3. Input Validation
```python
# Validate message content
def validate_message_content(message):
    if not message or not message.strip():
        raise ValueError('Message cannot be empty')
    
    if len(message) > 2000:
        raise ValueError('Message too long (max 2000 characters)')
    
    # Sanitize HTML/script content
    return bleach.clean(message, strip=True)
```

### 4. File Upload Security
```python
# backend/routes/messages.py
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@messages_bp.route('/upload', methods=['POST'])
@api_login_required
def upload_message_file():
    if 'file' not in request.files:
        return APIResponse.validation_error('file', 'No file uploaded')
    
    file = request.files['file']
    
    # Validate file
    if not allowed_file(file.filename):
        return APIResponse.validation_error('file', 'File type not allowed')
    
    if file.content_length > MAX_FILE_SIZE:
        return APIResponse.validation_error('file', 'File too large (max 10MB)')
    
    # Save file securely
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{filename}"
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(file_path)
    
    # Create message record
    message = Message(
        conversation_id=data['conversation_id'],
        sender_id=current_user.id,
        message=filename,  # Original filename for display
        message_type=data['message_type'],
        file_path=unique_filename
    )
    
    db.session.add(message)
    db.session.commit()
    
    return APIResponse.success(data={'message': message.to_dict()})
```

## Common Chat Patterns

### 1. Pagination for Message History
```javascript
// Load older messages
async loadOlderMessages() {
    if (this.currentPage && this.hasMoreMessages) {
        const pagination = await this.loadMessages(
            this.currentConversationId, 
            this.currentPage + 1
        );
        
        this.currentPage = pagination.page;
        this.hasMoreMessages = pagination.has_next;
    }
}

// Infinite scroll implementation
const messagesContainer = document.getElementById('messages_container');
messagesContainer.addEventListener('scroll', () => {
    if (messagesContainer.scrollTop === 0) {
        this.loadOlderMessages();
    }
});
```

### 2. Online Status Tracking
```python
# backend/models.py
class User(db.Model):
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    is_online = db.Column(db.Boolean, default=False)
    
    def is_recently_active(self, minutes=5):
        """Check if user was active in the last N minutes"""
        if self.is_online:
            return True
        
        if not self.last_seen:
            return False
        
        return (datetime.utcnow() - self.last_seen).seconds < (minutes * 60)
```

```javascript
// Update online status
socket.on('user_status', (data) => {
    const userElement = document.querySelector(`[data-user-id="${data.user_id}"]`);
    if (userElement) {
        userElement.classList.toggle('online', data.is_online);
    }
});
```

### 3. Message Search
```python
# backend/routes/messages.py
@messages_bp.route('/search', methods=['GET'])
@api_login_required
def search_messages():
    query = request.args.get('q', '').strip()
    conversation_id = request.args.get('conversation_id')
    
    if not query:
        return APIResponse.validation_error('q', 'Search query is required')
    
    # Build search filter
    search_filter = Message.message.contains(query)
    
    # Filter by conversation if specified
    if conversation_id:
        conversation = Conversation.query.get(conversation_id)
        if not conversation.has_participant(current_user.id):
            return APIResponse.forbidden('Access denied')
        
        search_filter = db.and_(
            search_filter,
            Message.conversation_id == conversation_id
        )
    else:
        # Search only in user's conversations
        user_conversations = get_user_conversation_ids(current_user.id)
        search_filter = db.and_(
            search_filter,
            Message.conversation_id.in_(user_conversations)
        )
    
    messages = Message.query.filter(search_filter)\
                          .order_by(Message.created_at.desc())\
                          .limit(50).all()
    
    return APIResponse.success(
        data={'messages': [msg.to_dict() for msg in messages]}
    )
```

## Error Handling

### Backend Error Handling
```python
# Comprehensive error handling in message operations
try:
    # Message operation
    pass
except ValidationError as e:
    return APIResponse.validation_error('message', str(e))
except PermissionError as e:
    return APIResponse.forbidden(str(e))
except NotFoundError as e:
    return APIResponse.not_found(str(e))
except Exception as e:
    logger.error(f"Message operation failed: {str(e)}")
    return APIResponse.internal_error('Chat system temporarily unavailable')
```

### Frontend Error Handling
```javascript
class MessagingManager {
    handleError(error, context = 'chat') {
        console.error(`${context} error:`, error);
        
        if (error.statusCode === 401) {
            // Authentication expired
            this.showError('Your session has expired. Please login again.');
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else if (error.statusCode === 403) {
            // Permission denied
            this.showError('You do not have permission to access this conversation.');
        } else if (error.statusCode === 404) {
            // Resource not found
            this.showError('Conversation not found.');
        } else {
            // Generic error
            this.showError(error.message || 'An unexpected error occurred.');
        }
    }
    
    // Retry mechanism for failed operations
    async retryOperation(operation, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }
}
```

## Real Examples

### Example 1: Patient Starting Conversation with Doctor

#### Frontend (`frontend/pages/medical/patient/index.html`)
```javascript
// Patient clicks "Message Doctor" button
async function startConversationWithDoctor(doctorId) {
    try {
        // Create conversation
        const response = await ApiHelper.makeRequest('/messages/conversations', {
            method: 'POST',
            body: JSON.stringify({
                participant_id: doctorId
            })
        });
        
        if (response.success) {
            // Navigate to messaging page
            window.location.href = `messaging.html?conversation=${response.data.conversation.id}`;
        }
    } catch (error) {
        showErrorMessage('Failed to start conversation with doctor');
    }
}
```

#### Backend Processing
```python
# backend/routes/messages.py - Create conversation endpoint
# Creates new conversation between patient and doctor
# Returns conversation ID for frontend navigation
```

### Example 2: Real-time Message Exchange

#### Doctor sends message:
```javascript
// Doctor types and sends message
await messagingManager.sendMessage("Please take your medication with food");

// Message flows:
// 1. POST /api/messages (REST API)
// 2. Message saved to database
// 3. WebSocket event emitted to conversation room
// 4. Patient receives real-time update
```

#### Patient receives message:
```javascript
// WebSocket event handler
socket.on('new_message', (data) => {
    // Message appears instantly in patient's chat
    this.displayNewMessage(data.message);
    
    // Show notification if conversation not active
    if (data.conversation_id !== this.currentConversationId) {
        this.showNotification(data.message);
    }
});
```

### Example 3: File Sharing in Conversation

```javascript
// Patient shares medical document
const fileInput = document.getElementById('file_input');
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    
    if (file) {
        try {
            await messagingManager.sendFile(file);
            showSuccessMessage('File sent successfully');
        } catch (error) {
            showErrorMessage('Failed to send file');
        }
    }
});
```

## Best Practices

### 1. Always Handle Connection States
```javascript
// Check WebSocket connection before operations
if (!this.socket || !this.socket.connected) {
    await this.connectWebSocket();
}
```

### 2. Implement Proper Error Boundaries
```javascript
// Wrap all chat operations in try-catch
try {
    await this.sendMessage(message);
} catch (error) {
    this.handleError(error, 'send_message');
}
```

### 3. Optimize for Performance
```javascript
// Use pagination for message history
// Implement virtual scrolling for large conversations
// Cache frequently accessed data
```

### 4. Ensure Accessibility
```html
<!-- Proper ARIA labels for screen readers -->
<div role="log" aria-live="polite" aria-label="Chat messages">
    <!-- Messages here -->
</div>
```

### 5. Mobile-Responsive Design
```css
/* Responsive chat interface */
@media (max-width: 768px) {
    .chat-container {
        flex-direction: column;
    }
    
    .conversations-sidebar {
        height: 200px;
        overflow-y: auto;
    }
}
```

## Summary

The Sahatak chat system provides:

1. **Real-time Communication**: Instant messaging via WebSockets
2. **Secure Messaging**: Authentication and authorization for medical data
3. **Rich Features**: File sharing, typing indicators, read receipts
4. **Scalable Architecture**: Organized codebase with clear separation
5. **User-Friendly Interface**: Intuitive chat experience
6. **Medical Focus**: Designed specifically for patient-doctor communication
7. **Cross-Platform Support**: Works on desktop and mobile devices
8. **Offline Resilience**: Messages queue when connection is lost
9. **Search Capabilities**: Find previous conversations and messages
10. **Notification System**: Desktop and in-app notifications

This chat system is essential for the telemedicine platform, enabling secure, real-time communication between patients and healthcare providers while maintaining the highest standards of medical data privacy and security.