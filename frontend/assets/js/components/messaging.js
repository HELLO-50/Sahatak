/**
 * Messaging System - Real-time patient-doctor communication
 * Integrates with backend messaging API
 */
class MessagingSystem {
    constructor() {
        this.apiBase = '/api/messages';
        this.currentConversationId = null;
        this.messages = [];
        this.pollInterval = null;
        this.lastMessageTimestamp = null;
        this.isInitialized = false;
    }

    /**
     * Initialize messaging system
     */
    async initialize(recipientId = null, recipientType = 'doctor') {
        try {
            if (recipientId) {
                await this.startConversation(recipientId, recipientType);
            }
            
            await this.loadConversations();
            this.setupEventHandlers();
            this.startPolling();
            this.isInitialized = true;
            
            Logger.info('Messaging system initialized');
        } catch (error) {
            Logger.error('Failed to initialize messaging system', error);
            throw error;
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

        // Enter key in message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSendMessage();
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
            messageDiv.innerHTML = `
                <div class="message-content">
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
                    <small class="message-time">${this.formatTimestamp(message.sent_at)}</small>
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
     * Cleanup resources
     */
    cleanup() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.isInitialized = false;
    }
}

// Export for global usage
window.MessagingSystem = MessagingSystem;