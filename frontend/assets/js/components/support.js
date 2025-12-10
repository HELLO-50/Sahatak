// Support Page JavaScript - Handles support forms and API communication
class SupportPage {
    constructor() {
        this.init();
    }

    init() {
        console.log('Support page initialized');
        
        // Wait for API Helper to be available
        this.waitForAPIHelper().then(() => {
            this.initializeEventListeners();
            this.loadUserData();
            this.loadTranslations();
        }).catch(error => {
            console.error('Failed to initialize support page:', error);
        });
    }

    waitForAPIHelper() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            const checkAPI = () => {
                attempts++;
                
                if (window.api && typeof window.api.post === 'function') {
                    console.log('API Helper found after', attempts, 'attempts');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('API Helper not found after maximum attempts'));
                } else {
                    setTimeout(checkAPI, 100); // Check every 100ms
                }
            };
            
            checkAPI();
        });
    }

    initializeEventListeners() {
        // Report form submission
        const reportForm = document.getElementById('report-form');
        if (reportForm) {
            reportForm.addEventListener('submit', (e) => this.handleReportSubmit(e));
            console.log('Report form event listener attached');
        }

        // Supervisor form submission
        const supervisorForm = document.getElementById('supervisor-form');
        if (supervisorForm) {
            supervisorForm.addEventListener('submit', (e) => this.handleSupervisorSubmit(e));
            console.log('Supervisor form event listener attached');
        }

        // Back to dashboard button
        const backButton = document.querySelector('[onclick="goBackToDashboard()"]');
        if (backButton) {
            backButton.addEventListener('click', (e) => this.goBackToDashboard(e));
            console.log('Back button event listener attached');
        }
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        
        const reportAlert = document.getElementById('report-alert');
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        console.log('🐛 Report form submission started');
        
        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> Sending...';
        }
        
        // Get form data
        const formData = {
            subject: document.getElementById('problem-subject').value.trim(),
            description: document.getElementById('problem-description').value.trim(),
            name: this.getUserName(),
            email: this.getUserEmail()
        };

        console.log('📤 Sending report data:', formData);

        // Validate form data
        if (!this.validateReportForm(formData)) {
            console.warn('⚠️ Form validation failed');
            this.showAlert(reportAlert, 'warning', 'Please fill all required fields');
            this.enableSubmitButton(submitBtn, '<i class="bi bi-send-fill me-1"></i>Send Report');
            return;
        }

        try {
            console.log('🌐 Making API request to /api/support/report-problem');
            
            // Use ApiHelper if available, otherwise use fetch
            let response;
            if (window.ApiHelper && window.ApiHelper.makeRequest) {
                response = await window.ApiHelper.makeRequest('/support/report-problem', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            } else if (window.api && window.api.post) {
                response = await window.api.post('/support/report-problem', formData);
            } else {
                // Fallback to fetch
                const fetchResponse = await fetch('/api/support/report-problem', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData),
                    credentials: 'include'
                });
                response = await fetchResponse.json();
            }
            
            console.log('📥 Report response:', response);
            
            if (response.success) {
                console.log('✅ Report sent successfully');
                this.showAlert(reportAlert, 'success', '✅ Your bug report has been sent to Sahatak.Sudan@gmail.com. Thank you!');
                form.reset();
                
                // Clear alert after 5 seconds
                setTimeout(() => {
                    reportAlert.classList.add('d-none');
                }, 5000);
            } else {
                console.warn('⚠️ API returned unsuccessful response:', response);
                this.showAlert(reportAlert, 'danger', response.message || 'Failed to send report');
            }
            
        } catch (error) {
            console.error('❌ Error reporting problem:', error);
            let errorMessage = 'Connection error. Please try again.';
            
            if (error.message) {
                errorMessage = error.message;
            }
            
            this.showAlert(reportAlert, 'danger', `❌ ${errorMessage}`);
        } finally {
            console.log('✨ Report form submission completed');
            this.enableSubmitButton(submitBtn, '<i class="bi bi-send-fill me-1"></i>Send Report');
        }
    }

    async handleSupervisorSubmit(e) {
        e.preventDefault();
        
        const supervisorAlert = document.getElementById('supervisor-alert');
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Disable submit button
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i> جاري الإرسال...';
        }
        
        // الحصول على البيانات من النموذج
        const formData = {
            to: document.getElementById('supervisor-to').value,
            subject: document.getElementById('supervisor-subject').value.trim(),
            message: document.getElementById('supervisor-message').value.trim(),
            contact: document.getElementById('supervisor-phone').value.trim(),
            name: this.getUserName(),
            email: this.getUserEmail()
        };

        console.log('📤 Sending supervisor message:', formData);

        // التحقق من البيانات
        if (!this.validateSupervisorForm(formData)) {
            this.showAlert(supervisorAlert, 'warning', 'الرجاء ملء جميع الحقول المطلوبة');
            this.enableSubmitButton(submitBtn, '<i class="bi bi-chat-dots me-1"></i> إرسال الرسالة');
            return;
        }

        try {
            // إرسال البيانات للباك إند باستخدام API Helper
            const response = await window.api.post('/support/contact-supervisor', formData);
            console.log('Supervisor message response:', response);
            
            if (response.success) {
                this.showAlert(supervisorAlert, 'success', response.message);
                form.reset();
            } else {
                this.showAlert(supervisorAlert, 'danger', response.message || 'حدث خطأ أثناء الإرسال');
            }
            
        } catch (error) {
            console.error('Error contacting supervisor:', error);
            let errorMessage = 'حدث خطأ في الاتصال بالخادم';
            
            if (error instanceof ApiError) {
                errorMessage = error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            this.showAlert(supervisorAlert, 'danger', errorMessage);
        } finally {
            this.enableSubmitButton(submitBtn, '<i class="bi bi-chat-dots me-1"></i> إرسال الرسالة');
        }
    }

    getUserName() {
        // Try multiple ways to get user name
        if (window.authStorage && authStorage.getUser) {
            const user = authStorage.getUser();
            if (user && user.name) return user.name;
        }
        
        if (window.AuthStorage && AuthStorage.get) {
            return AuthStorage.get('name');
        }
        
        return localStorage.getItem('sahatak_user_name') || 'Unknown';
    }

    getUserEmail() {
        // Try multiple ways to get user email
        if (window.authStorage && authStorage.getUser) {
            const user = authStorage.getUser();
            if (user && user.email) return user.email;
        }
        
        if (window.AuthStorage && AuthStorage.get) {
            return AuthStorage.get('email');
        }
        
        return localStorage.getItem('sahatak_user_email') || 'Unknown';
    }

    validateReportForm(data) {
        const isValid = data.subject && data.description && 
                       data.subject.length > 0 && data.description.length > 0;
        
        if (!isValid) {
            console.warn('Report form validation failed:', data);
        }
        
        return isValid;
    }

    validateSupervisorForm(data) {
        const isValid = data.to && data.subject && data.message && 
                       data.to.length > 0 && data.subject.length > 0 && data.message.length > 0;
        
        if (!isValid) {
            console.warn('Supervisor form validation failed:', data);
        }
        
        return isValid;
    }

    showAlert(container, type, text) {
        if (!container) {
            console.error('Alert container not found');
            return;
        }
        
        container.className = `alert alert-${type} fade show`;
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span>${text}</span>
                <button type="button" class="btn-close" onclick="this.parentElement.parentElement.classList.add('d-none')"></button>
            </div>
        `;
        container.classList.remove('d-none');
        
        console.log(`${type.toUpperCase()} Alert: ${text}`);
        
        // إخفاء تلقائي بعد 5 ثواني
        setTimeout(() => {
            container.classList.add('d-none');
        }, 5000);
    }

    enableSubmitButton(button, originalHTML) {
        if (button) {
            button.disabled = false;
            button.innerHTML = originalHTML;
        }
    }

    loadUserData() {
        // تحميل بيانات المستخدم إذا كان مسجل دخول
        const userName = this.getUserName();
        const userNameElement = document.getElementById('user-name');
        
        if (userNameElement && userName && userName !== 'Unknown') {
            userNameElement.textContent = userName;
            console.log('User name loaded:', userName);
        }
    }

    async loadTranslations() {
        // تحميل الترجمة إذا كانت متاحة
        if (window.LanguageManager) {
            const userLang = window.authStorage?.getUserLanguage() || 
                           localStorage.getItem('sahatak_language') || 
                           'ar';
            try {
                await LanguageManager.loadTranslations();
                this.applyTranslations(userLang);
                console.log('Translations loaded for language:', userLang);
            } catch (error) {
                console.error('Error loading translations:', error);
            }
        }
    }

    applyTranslations(lang) {
        if (!window.LanguageManager || !LanguageManager.translations[lang]) {
            console.warn('Translations not available for language:', lang);
            return;
        }
        
        const t = LanguageManager.translations[lang];
        
        // تطبيق النصوص المترجمة
        const elements = {
            'page-title-head': t.support?.pageTitle,
            'page-title': t.support?.title,
            'page-subtitle': t.support?.subtitle,
            'btn-back': t.common?.backToDashboard,
            'btn-logout': t.common?.logout,
            'user-name': this.getUserName() // Don't override with translation
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element && elements[id] && id !== 'user-name') {
                element.textContent = elements[id];
            }
        });

        console.log('Translations applied for language:', lang);
    }

    goBackToDashboard(e) {
        if (e) e.preventDefault();
        
        const userType = window.authStorage?.getUser()?.type || 
                        localStorage.getItem('sahatak_user_type') || 
                        'patient';
        
        console.log('🔙 Going back to dashboard for user type:', userType);
        
        if (userType === 'doctor') {
            window.location.href = '../doctor/dashboard.html';
        } else {
            window.location.href = '../patient/dashboard.html';
        }
    }
}

// Custom API Error class (in case it's not available from main.js)
class ApiError extends Error {
    constructor(message, statusCode, errorCode, field) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.field = field;
    }
}

// Initialize Support Page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - Initializing support page...');
    
    // Check authentication first
    if (window.AuthGuard && !AuthGuard.isAuthenticated()) {
        console.warn('User not authenticated - redirecting to login');
        AuthGuard.redirectToLogin();
        return;
    }
    
    console.log('User authenticated - initializing support page');
    
    // Initialize support page
    window.supportPage = new SupportPage();
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (window.AuthGuard && !AuthGuard.isAuthenticated()) {
            AuthGuard.redirectToLogin();
            return;
        }
        window.supportPage = new SupportPage();
    });
} else {
    // DOM already loaded
    if (window.AuthGuard && !AuthGuard.isAuthenticated()) {
        AuthGuard.redirectToLogin();
    } else {
        window.supportPage = new SupportPage();
    }
}