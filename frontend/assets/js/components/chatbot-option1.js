// Option 1 Chatbot Component - OpenAI GPT-3.5 Integration
// Follows Sahatak coding patterns and supports Arabic/English

class Option1Chatbot {
    constructor() {
        this.currentLanguage = 'en';
        this.isProcessing = false;
        this.apiEndpoint = '/api/chatbot/option1';
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        // Initialize translations
        this.translations = {
            en: {
                page_title: "Option 1: OpenAI GPT-3.5 Medical Chatbot",
                page_subtitle: "AI-powered medical triage assistant for appointment guidance",
                chat_title: "Medical AI Assistant",
                chat_subtitle: "Powered by OpenAI GPT-3.5-Turbo",
                welcome_message: "Hello! I'm your AI medical assistant. Please describe your symptoms and I'll help you determine the best course of action.",
                model_info: "Model: GPT-3.5-Turbo | Response time: ~2-3 seconds",
                input_placeholder: "Describe your symptoms...",
                input_help: "Press Enter to send or click the send button",
                btn_back: "Back to Dashboard",
                btn_send: "Send",
                typing_indicator: "AI is thinking...",
                error_network: "Network error. Please check your connection and try again.",
                error_processing: "Sorry, I couldn't process your request. Please try again.",
                error_empty_message: "Please enter your symptoms before sending.",
                triage_emergency: "⚠️ URGENT: Your symptoms suggest you need immediate medical attention. Please go to the nearest emergency room or call emergency services right away.",
                triage_appointment: "✅ Based on your symptoms, you can schedule an appointment with a doctor on our platform. This seems suitable for online consultation.",
                triage_local_doctor: "🏥 Your symptoms require in-person examination. Please visit a doctor in your local area for proper diagnosis and treatment."
            },
            ar: {
                page_title: "الخيار الأول: مساعد ذكي طبي GPT-3.5",
                page_subtitle: "مساعد ذكي طبي مدعوم بالذكاء الاصطناعي لتوجيه المواعيد",
                chat_title: "المساعد الطبي الذكي",
                chat_subtitle: "مدعوم بتقنية OpenAI GPT-3.5-Turbo",
                welcome_message: "مرحباً! أنا مساعدك الطبي الذكي. يرجى وصف أعراضك وسأساعدك في تحديد أفضل مسار للعمل.",
                model_info: "النموذج: GPT-3.5-Turbo | وقت الاستجابة: ~2-3 ثوانٍ",
                input_placeholder: "اوصف أعراضك...",
                input_help: "اضغط Enter للإرسال أو انقر على زر الإرسال",
                btn_back: "العودة للوحة التحكم",
                btn_send: "إرسال",
                typing_indicator: "الذكاء الاصطناعي يفكر...",
                error_network: "خطأ في الشبكة. يرجى التحقق من اتصالك وإعادة المحاولة.",
                error_processing: "عذراً، لم أستطع معالجة طلبك. يرجى إعادة المحاولة.",
                error_empty_message: "يرجى إدخال أعراضك قبل الإرسال.",
                triage_emergency: "⚠️ عاجل: أعراضك تشير إلى أنك تحتاج إلى عناية طبية فورية. يرجى الذهاب إلى أقرب قسم طوارئ أو الاتصال بخدمات الطوارئ فوراً.",
                triage_appointment: "✅ بناءً على أعراضك، يمكنك حجز موعد مع طبيب على منصتنا. هذا يبدو مناسباً للاستشارة الطبية عبر الإنترنت.",
                triage_local_doctor: "🏥 أعراضك تتطلب فحصاً شخصياً. يرجى زيارة طبيب في منطقتك للحصول على تشخيص وعلاج مناسب."
            }
        };
    }

    // Initialize the chatbot
    init() {
        this.attachEventListeners();
        this.loadSavedLanguage();
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
        this.showTypingIndicator();
        this.isProcessing = true;

        try {
            const response = await this.callAPI(message);
            this.hideTypingIndicator();
            
            if (response.success) {
                this.addMessage(response.data.response, 'ai', response.data);
            } else {
                this.showError(response.message || this.translations[this.currentLanguage].error_processing);
            }
        } catch (error) {
            this.hideTypingIndicator();
            console.error('Chatbot API error:', error);
            this.showError(this.translations[this.currentLanguage].error_network);
        } finally {
            this.isProcessing = false;
        }
    }

    // Call the chatbot API with retry logic
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
                    language: this.currentLanguage
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

    // Add message to chat
    addMessage(content, type, metadata = null) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '<i class="bi bi-person"></i>' : '<i class="bi bi-robot"></i>';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messageText = document.createElement('p');
        messageText.className = 'mb-1';
        messageText.textContent = content;
        messageContent.appendChild(messageText);

        // Add metadata for AI messages
        if (type === 'ai' && metadata) {
            const modelInfo = document.createElement('div');
            modelInfo.className = 'model-info';
            modelInfo.textContent = `Model: ${metadata.model} | ${metadata.timestamp}`;
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
            case 'appointment':
                return translations.triage_appointment;
            case 'local_doctor':
                return translations.triage_local_doctor;
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
        this.addMessage(message, 'ai');
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global functions for HTML onclick handlers
function setLanguage(lang) {
    if (window.option1Chatbot) {
        window.option1Chatbot.setLanguage(lang);
    }
}

function sendMessage() {
    if (window.option1Chatbot) {
        window.option1Chatbot.sendMessage();
    }
}

// Load translations using existing LanguageManager if available
async function loadTranslations() {
    if (typeof LanguageManager !== 'undefined') {
        try {
            await LanguageManager.loadTranslations();
            // Apply current language from LanguageManager if available
            const currentLang = LanguageManager.currentLanguage || 'en';
            if (window.option1Chatbot) {
                window.option1Chatbot.setLanguage(currentLang);
            }
        } catch (error) {
            console.warn('Could not load LanguageManager translations:', error);
        }
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.option1Chatbot = new Option1Chatbot();
    window.option1Chatbot.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Option1Chatbot;
}