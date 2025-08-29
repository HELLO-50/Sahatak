/**
 * Messaging System - Real-time patient-doctor communication
 * Integrates with backend messaging API and WebSocket
 */
class MessagingSystem {
    constructor() {
        this.apiBase = '/api/messages';
        this.currentConversationId = null;
        this.messages = [];
        this.pollInterval = null;
        this.lastMessageTimestamp = null;
        this.isInitialized = false;
        
        // WebSocket properties
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
    }

    /**
     * Initialize messaging system
     */
    async initialize(recipientId = null, recipientType = 'doctor') {
        try {
            // Initialize WebSocket connection
            await this.initializeWebSocket();
            
            if (recipientId) {
                await this.startConversation(recipientId, recipientType);
            }
            
            await this.loadConversations();
            this.setupEventHandlers();
            
            // Only use polling as fallback if WebSocket fails
            if (!this.isConnected) {
                this.startPolling();
                Logger.warn('WebSocket unavailable, using polling fallback');
            }
            
            this.isInitialized = true;
            
            Logger.info('Messaging system initialized');
        } catch (error) {
            Logger.error('Failed to initialize messaging system', error);
            throw error;
        }
    }

    /**
     * Initialize WebSocket connection
     */
    async initializeWebSocket() {
        return new Promise((resolve) => {
            try {
                // Check if Socket.IO is available
                if (typeof io === 'undefined') {
                    Logger.warn('Socket.IO not available, using polling fallback');
                    resolve();
                    return;
                }
                
                // Create socket connection
                this.socket = io({
                    autoConnect: true,
                    reconnection: true,
                    reconnectionAttempts: this.maxReconnectAttempts,
                    reconnectionDelay: this.reconnectDelay
                });
                
                this.setupWebSocketHandlers();
                
                // Wait for connection
                this.socket.on('connect', () => {
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.updateConnectionStatus('connected');
                    Logger.info('WebSocket connected');
                    resolve();
                });
                
                this.socket.on('connect_error', (error) => {
                    Logger.error('WebSocket connection error', error);
                    resolve(); // Don't fail, use polling fallback
                });
                
                // Set timeout for connection
                setTimeout(() => {
                    if (!this.isConnected) {
                        Logger.warn('WebSocket connection timeout');
                        resolve();
                    }
                }, 5000);
                
            } catch (error) {
                Logger.error('WebSocket initialization failed', error);
                resolve(); // Don't fail, use polling fallback
            }
        });
    }

    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        if (!this.socket) return;
        
        // Connection events
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            this.updateConnectionStatus('disconnected');
            Logger.warn('WebSocket disconnected');
        });
        
        this.socket.on('reconnect', () => {
            this.isConnected = true;
            this.updateConnectionStatus('connected');
            Logger.info('WebSocket reconnected');
            
            // Rejoin current conversation
            if (this.currentConversationId) {
                this.joinConversation(this.currentConversationId);
            }
        });
        
        // Message events
        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });
        
        this.socket.on('message_status_update', (data) => {
            this.handleMessageStatusUpdate(data);
        });
        
        this.socket.on('user_typing_start', (data) => {
            this.handleTypingStart(data);
        });
        
        this.socket.on('user_typing_stop', (data) => {
            this.handleTypingStop(data);
        });
        
        // Notification events
        this.socket.on('notification', (data) => {
            this.handleNotification(data);
        });
        
        // User status events
        this.socket.on('user_status_change', (data) => {
            this.handleUserStatusChange(data);
        });
    }

    /**
     * Join a conversation room
     */
    joinConversation(conversationId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('join_conversation', { conversation_id: conversationId });
        }
    }

    /**
     * Leave a conversation room
     */
    leaveConversation(conversationId) {
        if (this.socket && this.isConnected) {
            this.socket.emit('leave_conversation', { conversation_id: conversationId });
        }
    }

    /**
     * Start or get existing conversation
     */
    async startConversation(recipientId, recipientType = 'doctor') {
        try {
            const response = await fetch(`${this.apiBase}/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    recipient_type: recipientType
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.currentConversationId = data.data.id;
            
            await this.loadMessages();
            Logger.info('Conversation started', { conversationId: this.currentConversationId });
            
            return data.data;
        } catch (error) {
            Logger.error('Failed to start conversation', error);
            throw error;
        }
    }

    /**
     * Load user's conversations
     */
    async loadConversations() {
        try {
            const response = await fetch(`${this.apiBase}/conversations`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.renderConversationsList(data.data);
            
            return data.data;
        } catch (error) {
            Logger.error('Failed to load conversations', error);
            throw error;
        }
    }

    /**
     * Load messages for current conversation
     */
    async loadMessages() {
        if (!this.currentConversationId) return;

        try {
            const response = await fetch(`${this.apiBase}/conversations/${this.currentConversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.messages = data.data;
            this.renderMessages();
            this.updateLastMessageTimestamp();
            
            // Join WebSocket room for this conversation
            this.joinConversation(this.currentConversationId);
            
            return data.data;
        } catch (error) {
            Logger.error('Failed to load messages', error);
            throw error;
        }
    }

    /**
     * Send a message
     */
    async sendMessage(content, attachments = []) {
        if (!this.currentConversationId || !content.trim()) return;

        try {
            const formData = new FormData();
            formData.append('conversation_id', this.currentConversationId);
            formData.append('content', content.trim());
            
            // Add attachments if any
            attachments.forEach((file, index) => {
                formData.append(`attachments[${index}]`, file);
            });

            const response = await fetch(`${this.apiBase}/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Add message to local array and re-render
            this.messages.push(data.data);
            this.renderMessages();
            this.updateLastMessageTimestamp();
            
            // Clear input
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = '';
            }
            
            Logger.info('Message sent successfully');
            return data.data;
        } catch (error) {
            Logger.error('Failed to send message', error);
            this.showError('Failed to send message. Please try again.');
            throw error;
        }
    }

    /**
     * Search messages
     */
    async searchMessages(query, conversationId = null) {
        try {
            const params = new URLSearchParams({ q: query });
            if (conversationId) {
                params.append('conversation_id', conversationId);
            }

            const response = await fetch(`${this.apiBase}/search?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            return data.data;
        } catch (error) {
            Logger.error('Failed to search messages', error);
            throw error;
        }
    }

    /**
     * Create conversation for appointment
     */
    async createAppointmentConversation(appointmentId) {
        try {
            const response = await fetch(`${this.apiBase}/conversations/appointment/${appointmentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Set current conversation
            this.currentConversationId = data.data.conversation.id;
            this.messages = data.data.conversation.messages || [];
            
            // Update UI
            this.renderMessages();
            this.updateAppointmentHeader(data.data.appointment);
            
            Logger.info('Appointment conversation created', { 
                conversationId: this.currentConversationId,
                appointmentId 
            });
            
            return data.data;
        } catch (error) {
            Logger.error('Failed to create appointment conversation', error);
            throw error;
        }
    }

    /**
     * Update appointment header in chat interface
     */
    updateAppointmentHeader(appointment) {
        const headerElement = document.querySelector('.chat-header, .appointment-header');
        if (headerElement && appointment) {
            const appointmentInfo = document.createElement('div');
            appointmentInfo.className = 'appointment-info';
            appointmentInfo.innerHTML = `
                <div class="appointment-badge">
                    <i class="bi bi-calendar-event"></i>
                    <div class="appointment-details">
                        <strong>Appointment Discussion</strong>
                        <div class="appointment-meta">
                            <span class="appointment-date">${this.formatTimestamp(appointment.appointment_date)}</span>
                            ${appointment.appointment_type ? `<span class="appointment-type">${appointment.appointment_type}</span>` : ''}
                        </div>
                        ${appointment.reason_for_visit ? 
                            `<div class="appointment-reason">${appointment.reason_for_visit}</div>` : ''
                        }
                    </div>
                </div>
            `;
            
            // Insert at the beginning of header or replace existing
            const existingInfo = headerElement.querySelector('.appointment-info');
            if (existingInfo) {
                existingInfo.replaceWith(appointmentInfo);
            } else {
                headerElement.insertBefore(appointmentInfo, headerElement.firstChild);
            }
        }
    }

    /**
     * Get unread message count
     */
    async getUnreadCount() {
        try {
            const response = await fetch(`${this.apiBase}/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.updateUnreadIndicator(data.data.unread_count);
            
            return data.data.unread_count;
        } catch (error) {
            Logger.error('Failed to get unread count', error);
            return 0;
        }
    }

    /**
     * Mark conversation as read
     */
    async markAsRead(conversationId = null) {
        const id = conversationId || this.currentConversationId;
        if (!id) return;

        try {
            await fetch(`${this.apiBase}/conversations/${id}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            // Update UI
            this.getUnreadCount();
        } catch (error) {
            Logger.error('Failed to mark as read', error);
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Send button click
        const sendBtn = document.querySelector('button[onclick*="sendMessage"]') || 
                       document.querySelector('.btn-primary[onclick*="send"]');
        if (sendBtn) {
            sendBtn.onclick = () => this.handleSendMessage();
        }

        // Enter key in message input and typing indicators
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            let typingTimer = null;
            let isTyping = false;
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
                } else {
                    // Start typing indicator
                    if (!isTyping) {
                        this.startTyping();
                        isTyping = true;
                    }
                    
                    // Reset typing timer
                    clearTimeout(typingTimer);
                    typingTimer = setTimeout(() => {
                        this.stopTyping();
                        isTyping = false;
                    }, 2000);
                }
            });
            
            messageInput.addEventListener('input', (e) => {
                if (e.target.value.trim() === '') {
                    // Stop typing if input is empty
                    this.stopTyping();
                    isTyping = false;
                    clearTimeout(typingTimer);
                }
            });
        }

        // File attachment
        const attachBtn = document.querySelector('button[onclick*="attach"]');
        if (attachBtn) {
            attachBtn.onclick = () => this.handleFileAttachment();
        }
    }

    /**
     * Handle send message event
     */
    async handleSendMessage() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;

        const content = messageInput.value.trim();
        if (!content) return;

        try {
            await this.sendMessage(content);
            this.scrollToBottom();
        } catch (error) {
            this.showError('Failed to send message');
        }
    }

    /**
     * Handle file attachment
     */
    handleFileAttachment() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf,.doc,.docx';
        input.multiple = false;
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.attachFile(file);
            }
        };
        
        input.click();
    }

    /**
     * Attach file to message
     */
    async attachFile(file) {
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('File size must be less than 5MB');
            return;
        }

        try {
            const messageInput = document.getElementById('messageInput');
            const content = messageInput ? messageInput.value.trim() : '';
            
            if (!content) {
                messageInput.value = `📎 ${file.name}`;
            }
            
            await this.sendMessage(content || `📎 ${file.name}`, [file]);
        } catch (error) {
            this.showError('Failed to send attachment');
        }
    }

    /**
     * Start polling for new messages
     */
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        this.pollInterval = setInterval(async () => {
            if (this.currentConversationId) {
                await this.checkForNewMessages();
            }
            await this.getUnreadCount();
        }, 5000); // Poll every 5 seconds
    }

    /**
     * Check for new messages
     */
    async checkForNewMessages() {
        if (!this.currentConversationId || !this.lastMessageTimestamp) return;

        try {
            const params = new URLSearchParams({
                since: this.lastMessageTimestamp
            });

            const response = await fetch(
                `${this.apiBase}/conversations/${this.currentConversationId}/messages?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    }
                }
            );

            if (!response.ok) return;

            const data = await response.json();
            if (data.data && data.data.length > 0) {
                this.messages.push(...data.data);
                this.renderMessages();
                this.updateLastMessageTimestamp();
                this.scrollToBottom();
                
                // Mark as read if page is visible
                if (!document.hidden) {
                    await this.markAsRead();
                }
            }
        } catch (error) {
            Logger.error('Failed to check for new messages', error);
        }
    }

    /**
     * Render messages in chat container
     */
    renderMessages() {
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;

        chatContainer.innerHTML = '';

        this.messages.forEach(message => {
            const messageDiv = document.createElement('div');
            const isOwn = message.sender_id === parseInt(localStorage.getItem('userId'));
            
            messageDiv.className = `message ${isOwn ? 'patient-message' : 'doctor-message'}`;
            messageDiv.setAttribute('data-message-id', message.id);
            
            // Build appointment context if available
            const appointmentContext = message.appointment_info ? `
                <div class="appointment-context">
                    <i class="bi bi-calendar-check"></i>
                    <span>Appointment: ${this.formatTimestamp(message.appointment_info.appointment_date)}</span>
                    ${message.appointment_info.reason_for_visit ? 
                        `<div class="appointment-reason">${message.appointment_info.reason_for_visit}</div>` : ''
                    }
                </div>
            ` : '';
            
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${appointmentContext}
                    <p>${this.escapeHtml(message.content)}</p>
                    ${message.attachments && message.attachments.length > 0 ? 
                        `<div class="message-attachments">
                            ${message.attachments.map(att => 
                                `<a href="${att.file_url}" target="_blank" class="attachment-link">
                                    <i class="bi bi-paperclip"></i> ${att.filename}
                                </a>`
                            ).join('')}
                        </div>` : ''
                    }
                    <div class="message-footer">
                        <small class="message-time">${this.formatTimestamp(message.sent_at || message.created_at)}</small>
                        ${message.is_urgent ? '<span class="urgent-indicator"><i class="bi bi-exclamation-triangle"></i></span>' : ''}
                        <span class="message-status status-sent"></span>
                    </div>
                </div>
            `;
            
            chatContainer.appendChild(messageDiv);
        });

        this.scrollToBottom();
    }

    /**
     * Render conversations list
     */
    renderConversationsList(conversations) {
        // This would be implemented if there's a conversations sidebar
        Logger.info('Conversations loaded', { count: conversations.length });
    }

    /**
     * Update unread message indicator
     */
    updateUnreadIndicator(count) {
        const indicators = document.querySelectorAll('.unread-count, [data-unread-count]');
        indicators.forEach(indicator => {
            if (count > 0) {
                indicator.textContent = count > 99 ? '99+' : count;
                indicator.style.display = 'inline-block';
            } else {
                indicator.style.display = 'none';
            }
        });
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        const chatContainer = document.getElementById('chatMessages');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    /**
     * Update last message timestamp
     */
    updateLastMessageTimestamp() {
        if (this.messages.length > 0) {
            this.lastMessageTimestamp = this.messages[this.messages.length - 1].sent_at;
        }
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }
        
        // Same day
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        // Different day
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show error message
     */
    showError(message) {
        // Create or update error toast/alert
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    /**
     * Handle new message from WebSocket
     */
    handleNewMessage(data) {
        if (data.conversation_id === this.currentConversationId) {
            // Add message to current conversation
            this.messages.push(data.message);
            this.renderMessages();
            this.scrollToBottom();
            
            // Mark as read if page is visible
            if (!document.hidden && data.message.sender_id !== parseInt(localStorage.getItem('userId'))) {
                this.markAsRead();
            }
            
            Logger.info('Received new message via WebSocket');
        }
        
        // Update unread count for all conversations
        this.getUnreadCount();
    }

    /**
     * Handle message status update from WebSocket
     */
    handleMessageStatusUpdate(data) {
        if (data.conversation_id === this.currentConversationId) {
            // Update message status in UI
            const messageElement = document.querySelector(`[data-message-id="${data.message_id}"]`);
            if (messageElement) {
                const statusElement = messageElement.querySelector('.message-status');
                if (statusElement) {
                    statusElement.textContent = data.status;
                    statusElement.className = `message-status status-${data.status}`;
                }
            }
            
            Logger.info('Message status updated via WebSocket', data);
        }
    }

    /**
     * Handle user typing start
     */
    handleTypingStart(data) {
        if (data.conversation_id === this.currentConversationId) {
            this.showTypingIndicator(data.user_name);
            Logger.info(`${data.user_name} started typing`);
        }
    }

    /**
     * Handle user typing stop
     */
    handleTypingStop(data) {
        if (data.conversation_id === this.currentConversationId) {
            this.hideTypingIndicator();
            Logger.info('Typing indicator hidden');
        }
    }

    /**
     * Handle notification from WebSocket
     */
    handleNotification(data) {
        if (data.type === 'new_message') {
            // Show in-app notification
            this.showInAppNotification(data);
            
            // Update badge counts
            this.getUnreadCount();
        }
        
        Logger.info('Received notification via WebSocket', data);
    }

    /**
     * Handle user status change
     */
    handleUserStatusChange(data) {
        // Update user online status in UI
        const userElements = document.querySelectorAll(`[data-user-id="${data.user_id}"]`);
        userElements.forEach(element => {
            const statusElement = element.querySelector('.user-status');
            if (statusElement) {
                statusElement.className = `user-status status-${data.status}`;
                statusElement.title = `${data.status} - ${data.timestamp}`;
            }
        });
        
        Logger.info('User status updated', data);
    }

    /**
     * Send typing indicator
     */
    startTyping() {
        if (this.socket && this.isConnected && this.currentConversationId) {
            this.socket.emit('typing_start', { conversation_id: this.currentConversationId });
        }
    }

    /**
     * Stop typing indicator
     */
    stopTyping() {
        if (this.socket && this.isConnected && this.currentConversationId) {
            this.socket.emit('typing_stop', { conversation_id: this.currentConversationId });
        }
    }

    /**
     * Show typing indicator in UI
     */
    showTypingIndicator(userName) {
        let indicator = document.querySelector('.typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'typing-indicator';
            indicator.innerHTML = `
                <div class="typing-dots">
                    <span class="typing-user">${userName} is typing</span>
                    <div class="dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
            
            const chatContainer = document.getElementById('chatMessages');
            if (chatContainer) {
                chatContainer.appendChild(indicator);
                this.scrollToBottom();
            }
        } else {
            indicator.querySelector('.typing-user').textContent = `${userName} is typing`;
        }
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Show in-app notification
     */
    showInAppNotification(data) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'message-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${data.title}</div>
                <div class="notification-message">${data.message}</div>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Close on click
        notification.querySelector('.notification-close').onclick = () => {
            notification.parentNode.removeChild(notification);
        };
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const indicators = document.querySelectorAll('.connection-status');
        indicators.forEach(indicator => {
            indicator.className = `connection-status status-${status}`;
            indicator.textContent = status === 'connected' ? 'Connected' : 'Connecting...';
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        
        // Leave current conversation room
        if (this.currentConversationId) {
            this.leaveConversation(this.currentConversationId);
        }
        
        // Disconnect WebSocket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.isInitialized = false;
        this.isConnected = false;
    }
}

// Export for global usage
window.MessagingSystem = MessagingSystem;