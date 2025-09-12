class MedicalTriageChat {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.micBtn = document.getElementById('micBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        // Update API URL to match backend structure
        this.apiBaseUrl = 'http://localhost:5000/api/chatbot';
        
        this.initializeEventListeners();
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
        if (!message) return;
        
        this.addUserMessage(message);
        this.messageInput.value = '';
        this.showLoading(true);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message: message,
                    language: 'auto'  // Auto-detect language
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                this.addBotMessage(result.data.response, result.data.triage_result);
            } else {
                throw new Error('Invalid response format');
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.addBotMessage(
                'Sorry, I encountered an error. Please try again later.\n\n' +
                'عذراً، واجهت خطأ. من فضلك حاول مرة أخرى لاحقاً.'
            );
        } finally {
            this.showLoading(false);
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
                    badge.textContent = '💻 TELEMEDICINE / استشارة عن بُعد';
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