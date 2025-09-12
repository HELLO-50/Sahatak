class MedicalTriageChat {
    constructor() {
        // Check if required DOM elements exist
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.micBtn = document.getElementById('micBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        if (!this.chatMessages || !this.messageInput || !this.sendBtn || !this.micBtn || !this.loadingIndicator) {
            console.error('Required DOM elements not found. Check HTML structure.');
            return;
        }
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        // Get API base URL from environment or use default
        this.apiBaseUrl = this.getApiBaseUrl();
        
        // Initialize request timeout
        this.requestTimeout = 30000; // 30 seconds
        
        this.initializeEventListeners();
        
        console.log('Medical Triage Chat initialized successfully');
    }
    
    getApiBaseUrl() {
        // Check if running in production or development
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:5000/api/chatbot';
        } else {
            // For production deployment, adjust this URL accordingly
            return `${window.location.origin}/api/chatbot`;
        }
    }
    
    initializeEventListeners() {
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        this.micBtn.addEventListener('click', () => this.toggleRecording());
    }
    
    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        // Validate message
        if (!message) {
            this.showNotification('Please enter a message.', 'warning');
            return;
        }
        
        if (message.length > 1000) {
            this.showNotification('Message is too long. Please keep it under 1000 characters.', 'warning');
            return;
        }
        
        // Disable send button to prevent multiple submissions
        this.sendBtn.disabled = true;
        this.messageInput.disabled = true;
        
        this.addUserMessage(message);
        this.messageInput.value = '';
        this.showLoading(true);
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    language: 'auto'
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 503) {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                } else if (response.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                } else if (response.status === 429) {
                    throw new Error('Too many requests. Please wait a moment before trying again.');
                } else {
                    throw new Error(`Request failed with status ${response.status}`);
                }
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.addBotMessage(result.data.response, result.data.triage_result);
            } else {
                throw new Error(result.message || 'Invalid response format');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            
            let errorMessage;
            if (error.name === 'AbortError') {
                errorMessage = 'Request timed out. Please try again.\n\nانتهت مهلة الطلب. من فضلك حاول مرة أخرى.';
            } else if (error.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.\n\nخطأ في الشبكة. من فضلك تحقق من اتصالك وحاول مرة أخرى.';
            } else {
                errorMessage = `Error: ${error.message}\n\nعذراً، واجهت خطأ. من فضلك حاول مرة أخرى لاحقاً.`;
            }
            
            this.addBotMessage(errorMessage);
        } finally {
            clearTimeout(timeoutId);
            this.showLoading(false);
            this.sendBtn.disabled = false;
            this.messageInput.disabled = false;
            this.messageInput.focus();
        }
    }
    
    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = message;
        
        const isArabic = this.isArabicText(message);
        if (isArabic) {
            messageDiv.classList.add('rtl');
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    addBotMessage(message, triageResult) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        // Create message text element
        const textElement = document.createElement('div');
        textElement.textContent = message;
        messageDiv.appendChild(textElement);
        
        // Add triage badge if result is available
        if (triageResult) {
            const badge = document.createElement('span');
            badge.className = 'triage-badge';
            
            switch(triageResult) {
                case 'emergency':
                    badge.className += ' triage-emergency';
                    badge.textContent = '⚠️ EMERGENCY / طوارئ';
                    break;
                case 'in_person':
                    badge.className += ' triage-in-person';
                    badge.textContent = '🏥 IN-PERSON VISIT / زيارة شخصية';
                    break;
                case 'telemedicine':
                    badge.className += ' triage-telemedicine';
                    badge.textContent = '💻 SAHATAK PLATFORM / منصة صحتك';
                    break;
            }
            
            if (badge.textContent) {
                messageDiv.appendChild(badge);
            }
        }
        
        const isArabic = this.isArabicText(message);
        if (isArabic) {
            messageDiv.classList.add('rtl');
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.add('show');
            this.chatMessages.appendChild(this.loadingIndicator);
        } else {
            this.loadingIndicator.classList.remove('show');
            if (this.loadingIndicator.parentNode) {
                this.loadingIndicator.parentNode.removeChild(this.loadingIndicator);
            }
        }
        this.scrollToBottom();
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(notification);
        }
        
        // Set notification style based on type
        const colors = {
            info: '#007bff',
            warning: '#ffc107',
            error: '#dc3545',
            success: '#28a745'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 5000);
    }
    
    isArabicText(text) {
        const arabicPattern = /[\u0600-\u06FF\u0750-\u077F]/;
        return arabicPattern.test(text);
    }
    
    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    volume: 1.0
                } 
            });
            
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.sendAudioToServer(audioBlob);
                
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.micBtn.classList.add('recording');
            this.micBtn.innerHTML = '⏹️';
            this.micBtn.title = 'Stop recording / توقف عن التسجيل';
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your permissions.\n\nغير قادر على الوصول للميكروفون. من فضلك تحقق من الصلاحيات.');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.micBtn.classList.remove('recording');
            this.micBtn.innerHTML = '🎤';
            this.micBtn.title = 'Voice input / إدخال صوتي';
        }
    }
    
    async sendAudioToServer(audioBlob) {
        this.showLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            
            const response = await fetch(`${this.apiBaseUrl}/stt`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.transcription) {
                const transcription = result.data.transcription.trim();
                
                if (transcription) {
                    this.addUserMessage(`🎤 ${transcription}`);
                    
                    // Send transcribed text to chat API
                    const chatResponse = await fetch(`${this.apiBaseUrl}/assessment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ 
                            message: transcription,
                            language: result.data.detected_language || 'auto'
                        })
                    });
                    
                    if (!chatResponse.ok) {
                        throw new Error(`HTTP error! status: ${chatResponse.status}`);
                    }
                    
                    const chatResult = await chatResponse.json();
                    
                    if (chatResult.success && chatResult.data) {
                        this.addBotMessage(chatResult.data.response, chatResult.data.triage_result);
                    }
                } else {
                    this.addBotMessage(
                        'Sorry, I couldn\'t understand the audio. Please try speaking again or type your message.\n\n' +
                        'عذراً، لم أتمكن من فهم الصوت. من فضلك حاول التحدث مرة أخرى أو اكتب رسالتك.'
                    );
                }
            } else {
                throw new Error('No transcription received');
            }
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.addBotMessage(
                'Sorry, there was an error processing your voice input. Please try again or type your message.\n\n' +
                'عذراً، حدث خطأ في معالجة الإدخال الصوتي. من فضلك حاول مرة أخرى أو اكتب رسالتك.'
            );
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize the chat when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MedicalTriageChat();
});