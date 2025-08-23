// Sahatak Email Verification JavaScript - Email Verification Component
class EmailVerificationManager {
    constructor() {
        this.currentLang = LanguageManager.getLanguage() || 'en';
    }

    // Initialize email verification page
    async initialize() {
        // Load translations first
        await LanguageManager.loadTranslations();
        
        // Wait for translations to be fully loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Initialize page with current language
        console.log('Current language:', this.currentLang);
        console.log('Available translations:', Object.keys(LanguageManager.translations));
        this.updatePageContent();
        
        // Get token from URL and verify
        const token = this.getTokenFromUrl();
        if (!token) {
            this.showError(LanguageManager.getTranslation(this.currentLang, 'email_verification.invalid_link'));
            return;
        }
        
        // Start verification process
        this.verifyEmail(token);
    }

    // Get verification token from URL parameters
    getTokenFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token');
    }

    // Update page content with proper translations
    updatePageContent() {
        // Update page direction and language
        document.documentElement.setAttribute('dir', this.currentLang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', this.currentLang);
        
        // Update page title
        document.title = this.currentLang === 'ar' ? 'تأكيد البريد الإلكتروني - صحتك' : 'Email Verification - Sahatak';
        
        console.log('Updating page content for language:', this.currentLang);
        
        // Check if translations are loaded
        if (!LanguageManager.translations[this.currentLang] || !LanguageManager.translations[this.currentLang].email_verification) {
            console.error('Translations not loaded for language:', this.currentLang);
            this.useHardcodedTranslations();
            return;
        }
        
        // Update all translation elements
        this.updateTranslationElements();
    }

    // Update elements using LanguageManager pattern
    updateTranslationElements() {
        const elements = {
            'loading-text': 'email_verification.loading',
            'wait-text': 'email_verification.wait',
            'success-title': 'email_verification.success_title',
            'success-message': 'email_verification.success_message',
            'error-title': 'email_verification.error_title',
            'resend-title': 'email_verification.resend_title',
            'login-btn-text': 'email_verification.login_button',
            'home-btn-text': 'email_verification.home_button',
            'resend-btn-text': 'email_verification.resend_button',
            'send-btn-text': 'email_verification.send_button',
            'cancel-btn-text': 'email_verification.cancel_button'
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            const translation = LanguageManager.getTranslation(this.currentLang, elements[id]);
            
            if (element && translation && translation !== elements[id]) {
                element.textContent = translation;
                console.log(`Updated ${id} with: ${translation}`);
            } else if (element) {
                console.warn(`No translation found for ${id}, key: ${elements[id]}`);
            }
        });
    }

    // Fallback hardcoded translations
    useHardcodedTranslations() {
        const fallbackElements = {
            'loading-text': 'Verifying your email address...',
            'wait-text': 'Please wait a moment',
            'success-title': 'Email verified successfully!',
            'success-message': 'You can now login and use all platform features',
            'error-title': 'Email verification failed',
            'resend-title': 'Resend verification link',
            'login-btn-text': 'Go to Dashboard',
            'home-btn-text': 'Back to Home',
            'resend-btn-text': 'Resend verification link',
            'send-btn-text': 'Send',
            'cancel-btn-text': 'Cancel'
        };
        
        Object.keys(fallbackElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = fallbackElements[id];
                console.log(`Updated ${id} with fallback: ${fallbackElements[id]}`);
            }
        });
    }

    // Verify email using ApiHelper pattern
    async verifyEmail(token) {
        try {
            console.log('Starting email verification with token:', token);
            
            const response = await ApiHelper.makeRequest(`/auth/verify-email?token=${token}`, {
                method: 'GET'
            });

            console.log('Verification response:', response);

            if (response.success) {
                this.handleSuccessResponse(response);
            } else {
                const errorMessage = response.message || LanguageManager.getTranslation(this.currentLang, 'email_verification.error_title');
                this.showError(errorMessage);
            }
        } catch (error) {
            console.error('Verification error:', error);
            const errorMessage = error.message || LanguageManager.getTranslation(this.currentLang, 'email_verification.error_title');
            this.showError(errorMessage);
        }
    }

    // Handle successful verification response
    handleSuccessResponse(response) {
        // Check if this is an "already verified" case
        if (response.data && response.data.already_verified) {
            console.log('User already verified, redirecting to login');
            setTimeout(() => {
                window.location.href = '/Sahatak/';
            }, 2000);
            this.showAlreadyVerified();
        } else {
            // Store user data for dashboard redirect
            if (response.data && response.data.user) {
                window.verificationUserData = response.data.user;
            }
            this.showSuccess();
        }
    }

    // Show success state
    showSuccess() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('success-state').style.display = 'block';
        
        // Auto-redirect to dashboard after 3 seconds
        setTimeout(() => {
            this.redirectToDashboard();
        }, 3000);
    }
    
    // Show already verified state
    showAlreadyVerified() {
        document.getElementById('loading-state').style.display = 'none';
        
        // Update success state for already verified user
        document.getElementById('success-title').textContent = 'Email Already Verified';
        document.getElementById('success-message').textContent = 'Your email is already verified. You can now login to your account.';
        document.getElementById('login-btn-text').textContent = 'Go to Login';
        
        // Show modified success state
        document.getElementById('success-state').style.display = 'block';
    }

    // Show error state
    showError(message) {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-state').style.display = 'block';
    }
    
    // Redirect to appropriate dashboard
    redirectToDashboard() {
        const userData = window.verificationUserData;
        if (userData) {
            // Store user session data
            localStorage.setItem('sahatak_user_id', userData.id);
            localStorage.setItem('sahatak_user_type', userData.user_type);
            localStorage.setItem('sahatak_user_email', userData.email);
            localStorage.setItem('sahatak_user_name', userData.full_name);
            
            // Redirect to appropriate dashboard
            const dashboardUrl = userData.user_type === 'doctor' ? 
                'dashboard/doctor.html' : 
                'dashboard/patient.html';
            window.location.href = dashboardUrl;
        } else {
            // Fallback - redirect to login
            window.location.href = '/Sahatak/';
        }
    }

    // Handle resend verification email
    async handleResendVerification(email) {
        if (!email) {
            alert(LanguageManager.getTranslation(this.currentLang, 'email_verification.email_required'));
            return;
        }

        try {
            const response = await ApiHelper.makeRequest('/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email: email })
            });

            if (response.success) {
                alert(LanguageManager.getTranslation(this.currentLang, 'email_verification.resend_sent'));
                window.location.href = '/Sahatak/';
            } else {
                const errorMessage = response.message || LanguageManager.getTranslation(this.currentLang, 'email_verification.error_title');
                alert(errorMessage);
            }
        } catch (error) {
            console.error('Resend error:', error);
            const errorMessage = LanguageManager.getTranslation(this.currentLang, 'email_verification.error_title');
            alert(errorMessage);
        }
    }

    // Initialize event listeners
    initializeEventListeners() {
        // Resend button
        document.getElementById('resend-btn').addEventListener('click', () => {
            document.getElementById('error-state').style.display = 'none';
            document.getElementById('resend-form').style.display = 'block';
        });

        // Cancel resend button
        document.getElementById('cancel-resend').addEventListener('click', () => {
            document.getElementById('resend-form').style.display = 'none';
            document.getElementById('error-state').style.display = 'block';
        });

        // Send verification button
        document.getElementById('send-verification').addEventListener('click', () => {
            const email = document.getElementById('resend-email').value;
            this.handleResendVerification(email);
        });

        // Dashboard redirect button
        const dashboardBtn = document.querySelector('[onclick="redirectToDashboard()"]');
        if (dashboardBtn) {
            dashboardBtn.onclick = () => this.redirectToDashboard();
        }
    }
}

// Initialize email verification when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Email verification system initializing...');
    
    const emailVerification = new EmailVerificationManager();
    await emailVerification.initialize();
    emailVerification.initializeEventListeners();
});

// Export for use in other scripts
window.EmailVerificationManager = EmailVerificationManager;