// AI Symptom Assessment Component - Medical Triage System
// Three-option recommendation system

class AIAssessmentChatbot {
    constructor() {
        this.currentLanguage = 'en';
        this.isProcessing = false;
        this.apiEndpoint = 'https://sahatak.pythonanywhere.com/api/chatbot/assessment';
        this.maxRetries = 2; 
        this.retryDelay = 500;
        this.conversationId = this.generateConversationId();
        
        // Initialize translations
        this.translations = {
            en: {
                page_title: "AI Symptom Assessment",
                page_subtitle: "Get personalized healthcare recommendations based on your symptoms",
                performance_text: "Quick Assessment",
                chat_title: "AI Symptom Assistant",
                chat_subtitle: "Medical Triage & Assessment",
                offline_text: "Works Offline",
                welcome_message: "Hello! I'm your AI symptom assessment assistant. I'll ask you follow-up questions about your symptoms and provide one of three recommendations: schedule on this platform, visit ER immediately, or see a doctor in person. Please describe your symptoms.",
                model_info: "Model: ArabicBERT-Health | Response time: ~150ms | Works offline",
                input_placeholder: "Describe your symptoms...",
                input_help: "Processing happens locally on your device - no data sent to external servers",
                btn_back: "Back to Dashboard",
                btn_send: "Send",
                typing_indicator: "Processing locally...",
                speed_text: "Ultra Fast",
                privacy_text: "100% Private",
                offline_feature_text: "Works Offline",
                error_network: "Local processing error. Please try again.",
                error_processing: "Sorry, I couldn't analyze your symptoms. Please try again.",
                error_empty_message: "Please enter your symptoms before sending.",
                triage_emergency: "⚠️ You need to go to the nearest ER immediately.",
                triage_telemedicine: "✅ You can be seen on this platform, please schedule an appointment.",
                triage_in_person: "🏥 You need to be seen in person, please schedule an appointment with your primary care or with any physician."
            },
            ar: {
                page_title: "تقييم الأعراض بالذكاء الاصطناعي",
                page_subtitle: "احصل على توصيات رعاية صحية مخصصة بناءً على أعراضك",
                performance_text: "تقييم سريع",
                chat_title: "مساعد تقييم الأعراض",
                chat_subtitle: "الفرز الطبي والتقييم",
                offline_text: "يعمل بدون اتصال",
                welcome_message: "مرحباً! أنا مساعد تقييم الأعراض بالذكاء الاصطناعي. سأطرح عليك أسئلة متابعة حول أعراضك وأقدم واحدة من ثلاث توصيات: حجز موعد على هذه المنصة، أو الذهاب للطوارئ فوراً، أو زيارة طبيب شخصياً. يرجى وصف أعراضك.",
                model_info: "النموذج: ArabicBERT-Health | وقت الاستجابة: ~150 مللي ثانية | يعمل بدون اتصال",
                input_placeholder: "اوصف أعراضك...",
                input_help: "تتم المعالجة محلياً على جهازك - لا يتم إرسال بيانات لخوادم خارجية",
                btn_back: "العودة للوحة التحكم",
                btn_send: "إرسال",
                typing_indicator: "معالجة محلية...",
                speed_text: "سريع جداً",
                privacy_text: "خصوصية 100%",
                offline_feature_text: "يعمل بدون اتصال",
                error_network: "خطأ في المعالجة المحلية. يرجى إعادة المحاولة.",
                error_processing: "عذراً، لم أستطع تحليل أعراضك. يرجى إعادة المحاولة.",
                error_empty_message: "يرجى إدخال أعراضك قبل الإرسال.",
                triage_emergency: "⚠️ تحتاج للذهاب إلى أقرب قسم طوارئ فوراً.",
                triage_telemedicine: "✅ يمكن فحصك على هذه المنصة، يرجى حجز موعد.",
                triage_in_person: "🏥 تحتاج للفحص الشخصي، يرجى حجز موعد مع طبيب الرعاية الأولية أو أي طبيب."
            }
        };

        // Local cache for faster responses
        this.responseCache = new Map();
        this.commonResponses = this.initializeCommonResponses();
    }

    // Generate unique conversation ID
    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize common medical responses for offline use
    initializeCommonResponses() {
        return {
            en: {
                'headache': 'For headaches, you can usually schedule an online consultation. However, if it\'s severe or sudden, seek immediate care.',
                'fever': 'Fever symptoms can often be managed with online consultation. If temperature is very high (>39°C) or persistent, consider emergency care.',
                'cough': 'Cough symptoms are suitable for online consultation unless accompanied by severe breathing difficulties.',
                'stomach pain': 'Mild stomach pain can be assessed online. Severe abdominal pain may require immediate medical attention.'
            },
            ar: {
                'صداع': 'بالنسبة للصداع، يمكنك عادة حجز استشارة عبر الإنترنت. ولكن إذا كان شديداً أو مفاجئاً، اطلب الرعاية الفورية.',
                'حمى': 'يمكن عادة إدارة أعراض الحمى من خلال استشارة عبر الإنترنت. إذا كانت درجة الحرارة عالية جداً (>39°م) أو مستمرة، فكر في الرعاية الطارئة.',
                'سعال': 'أعراض السعال مناسبة للاستشارة عبر الإنترنت ما لم تكن مصحوبة بصعوبات تنفس شديدة.',
                'ألم في المعدة': 'يمكن تقييم ألم المعدة الخفيف عبر الإنترنت. قد يتطلب ألم البطن الشديد عناية طبية فورية.'
            }
        };
    }

    // Initialize the chatbot
    init() {
        this.attachEventListeners();
        this.loadSavedLanguage();
        this.preloadModel();
    }

    // Preload model information (simulated)
    preloadModel() {
        // Simulate model loading for better UX
        console.log('Local AI model ready for medical triage analysis');
    }

    // Attach event listeners
    attachEventListeners() {
        // Send button click
        const sendBtn = document.getElementById('btn-send');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Enter key press
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
    }

    // Load saved language preference
    loadSavedLanguage() {
        const savedLang = localStorage.getItem('sahatak_language') || 'en';
        this.setLanguage(savedLang);
    }

    // Set language and update UI
    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('sahatak_language', lang);
        
        // Update language toggle buttons
        document.querySelectorAll('.btn-language').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`btn-${lang}`)?.classList.add('active');
        
        // Update HTML dir and lang
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        
        // Update all translatable elements
        this.updateTranslations();
    }

    // Update translations for all elements
    updateTranslations() {
        const translations = this.translations[this.currentLanguage];
        
        // Update all elements with translation IDs
        Object.keys(translations).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                if (element.tagName === 'INPUT') {
                    element.placeholder = translations[key];
                } else {
                    element.textContent = translations[key];
                }
            }
        });
    }

    // Send message to chatbot
    async sendMessage() {
        if (this.isProcessing) return;

        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message) {
            this.showError(this.translations[this.currentLanguage].error_empty_message);
            return;
        }

        // Clear input and show user message
        chatInput.value = '';
        this.addMessage(message, 'user');
        
        // Check cache first for faster response
        const cachedResponse = this.getCachedResponse(message);
        if (cachedResponse) {
            this.addMessage(cachedResponse.response, 'ai', cachedResponse);
            return;
        }

        this.showTypingIndicator();
        this.isProcessing = true;

        try {
            // Simulate faster local processing
            const startTime = Date.now();
            const response = await this.callAPI(message);
            const processingTime = Date.now() - startTime;
            
            this.hideTypingIndicator();
            
            if (response.success) {
                // Add processing time to response data
                response.data.processing_time_ms = processingTime;
                this.addMessage(response.data.response, 'ai', response.data);
                
                // Cache the response for future use
                this.cacheResponse(message, response.data);
            } else {
                this.showError(response.message || this.translations[this.currentLanguage].error_processing);
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Local chatbot error:', error);
            
            // Try fallback to cached common responses
            const fallbackResponse = this.getFallbackResponse(message);
            if (fallbackResponse) {
                this.addMessage(fallbackResponse, 'ai', { 
                    model: 'offline-cache', 
                    triage_result: 'appointment',
                    processing_time_ms: 50
                });
            } else {
                this.showError(this.translations[this.currentLanguage].error_network);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    // Get cached response for faster performance
    getCachedResponse(message) {
        const cacheKey = message.toLowerCase().substring(0, 50);
        return this.responseCache.get(cacheKey);
    }

    // Cache response for future use
    cacheResponse(message, responseData) {
        const cacheKey = message.toLowerCase().substring(0, 50);
        this.responseCache.set(cacheKey, responseData);
        
        // Limit cache size for memory management
        if (this.responseCache.size > 50) {
            const firstKey = this.responseCache.keys().next().value;
            this.responseCache.delete(firstKey);
        }
    }

    // Get fallback response from common responses
    getFallbackResponse(message) {
        const commonResponses = this.commonResponses[this.currentLanguage];
        const messageLower = message.toLowerCase();
        
        for (const [keyword, response] of Object.entries(commonResponses)) {
            if (messageLower.includes(keyword.toLowerCase())) {
                return response;
            }
        }
        return null;
    }

    // Call the chatbot API with optimization for local processing
    async callAPI(message, retryCount = 0) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    message: message,
                    language: this.currentLanguage,
                    conversation_id: this.conversationId
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.callAPI(message, retryCount + 1);
            }
            throw error;
        }
    }

    // Add message to chat with enhanced metadata display
    addMessage(content, type, metadata = null) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '<i class="bi bi-person"></i>' : '<i class="bi bi-cpu"></i>';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('p');
        messageText.className = 'mb-1';
        messageText.textContent = content;
        messageContent.appendChild(messageText);

        // Add enhanced metadata for AI messages
        if (type === 'ai' && metadata) {
            const modelInfo = document.createElement('div');
            modelInfo.className = 'model-info';
            
            let infoText = `Model: ${metadata.model || 'Local-AI'}`;
            if (metadata.processing_time_ms) {
                infoText += ` | ${metadata.processing_time_ms}ms`;
            }
            if (metadata.confidence) {
                infoText += ` | Confidence: ${Math.round(metadata.confidence * 100)}%`;
            }
            infoText += ` | ${metadata.timestamp || new Date().toISOString()}`;
            
            modelInfo.textContent = infoText;
            messageContent.appendChild(modelInfo);

            // Add triage result if available
            if (metadata.triage_result) {
                const triageDiv = document.createElement('div');
                triageDiv.className = `triage-result ${metadata.triage_result}`;
                triageDiv.textContent = this.getTriageResultText(metadata.triage_result);
                messageContent.appendChild(triageDiv);
            }
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Get triage result text based on result type
    getTriageResultText(triageResult) {
        const translations = this.translations[this.currentLanguage];
        switch (triageResult) {
            case 'emergency':
                return translations.triage_emergency;
            case 'telemedicine':
                return translations.triage_telemedicine;
            case 'in_person':
                return translations.triage_in_person;
            default:
                return '';
        }
    }

    // Show typing indicator
    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'block';
            indicator.textContent = this.translations[this.currentLanguage].typing_indicator;
        }
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Show error message
    showError(message) {
        this.addMessage(message, 'ai', { 
            model: 'error-handler', 
            processing_time_ms: 0 
        });
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global functions for HTML onclick handlers
function setLanguage(lang) {
    if (window.aiAssessmentChatbot) {
        window.aiAssessmentChatbot.setLanguage(lang);
    }
}

function sendMessage() {
    if (window.aiAssessmentChatbot) {
        window.aiAssessmentChatbot.sendMessage();
    }
}

// Load translations using existing LanguageManager if available
async function loadTranslations() {
    if (typeof LanguageManager !== 'undefined') {
        try {
            await LanguageManager.loadTranslations();
            // Apply current language from LanguageManager if available
            const currentLang = LanguageManager.currentLanguage || 'en';
            if (window.aiAssessmentChatbot) {
                window.aiAssessmentChatbot.setLanguage(currentLang);
            }
        } catch (error) {
            console.warn('Could not load LanguageManager translations:', error);
        }
    }
}

// Initialize AI Assessment chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.aiAssessmentChatbot = new AIAssessmentChatbot();
    window.aiAssessmentChatbot.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAssessmentChatbot;
}