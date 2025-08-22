// Sahatak Authentication JavaScript - Authentication and Navigation Functions

// Authentication and Navigation Management
const AuthManager = {
    // Show language selection screen
    showLanguageSelection() {
        this.hideAllSections();
        document.getElementById('language-selection').classList.remove('d-none');
        document.getElementById('language-selection').style.display = 'flex';
    },

    // Show authentication selection (login/register)
    showAuthSelection() {
        this.hideAllSections();
        document.getElementById('auth-selection').classList.remove('d-none');
        document.getElementById('auth-selection').style.display = 'flex';
    },

    // Show user type selection (patient/doctor)
    showUserTypeSelection() {
        this.hideAllSections();
        document.getElementById('user-type-selection').classList.remove('d-none');
        document.getElementById('user-type-selection').style.display = 'flex';
    },

    // Show login form
    showLogin() {
        this.hideAllSections();
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('login-form').style.display = 'flex';
    },

    // Show general register form (not used in current flow, but keeping for compatibility)
    showRegister() {
        this.hideAllSections();
        document.getElementById('register-form').classList.remove('d-none');
        document.getElementById('register-form').style.display = 'flex';
    },

    // Show patient registration form
    showPatientRegister() {
        this.hideAllSections();
        document.getElementById('patient-register-form').classList.remove('d-none');
        document.getElementById('patient-register-form').style.display = 'flex';
    },

    // Show doctor registration form
    showDoctorRegister() {
        this.hideAllSections();
        document.getElementById('doctor-register-form').classList.remove('d-none');
        document.getElementById('doctor-register-form').style.display = 'flex';
    },

    // Hide all sections
    hideAllSections() {
        const sections = [
            'language-selection',
            'auth-selection', 
            'user-type-selection',
            'login-form',
            'register-form',
            'patient-register-form',
            'doctor-register-form'
        ];

        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('d-none');
                section.style.display = 'none';
            }
        });
    },

    // Update translations for current language
    updateTranslations(lang) {
        console.log('updateTranslations called with lang:', lang);
        console.log('Available translations:', Object.keys(LanguageManager.translations));
        console.log('LanguageManager.translations[lang]:', LanguageManager.translations[lang]);
        
        if (!LanguageManager.translations[lang]) {
            console.error(`No translations found for language: ${lang}`);
            console.error('Full translations object:', LanguageManager.translations);
            return;
        }

        // Update welcome section
        const welcomeTitle = document.getElementById('welcome-text');
        const welcomeDesc = document.getElementById('welcome-description');
        if (welcomeTitle) welcomeTitle.textContent = LanguageManager.getTranslation(lang, 'welcome.title');
        if (welcomeDesc) welcomeDesc.textContent = LanguageManager.getTranslation(lang, 'welcome.description');

        // Update auth section
        const authPrompt = document.getElementById('auth-prompt');
        const loginText = document.getElementById('login-text');
        const registerText = document.getElementById('register-text');
        const languageSwitchText = document.getElementById('language-switch-text');
        const currentLanguage = document.getElementById('current-language');

        if (authPrompt) authPrompt.textContent = LanguageManager.getTranslation(lang, 'auth.prompt');
        if (loginText) loginText.textContent = LanguageManager.getTranslation(lang, 'auth.login');
        if (registerText) registerText.textContent = LanguageManager.getTranslation(lang, 'auth.register');
        if (languageSwitchText) languageSwitchText.textContent = LanguageManager.getTranslation(lang, 'auth.language_switch');
        
        // Show the opposite language (the one you can switch TO)
        if (currentLanguage) {
            const oppositeLanguage = lang === 'ar' ? 'English' : 'العربية';
            currentLanguage.textContent = oppositeLanguage;
        }

        // Update user type selection
        const userTypeTitle = document.getElementById('user-type-title');
        const userTypeSubtitle = document.getElementById('user-type-subtitle');
        const patientTitle = document.getElementById('patient-title');
        const patientDesc = document.getElementById('patient-desc');
        const doctorTitle = document.getElementById('doctor-title');
        const doctorDesc = document.getElementById('doctor-desc');

        if (userTypeTitle) userTypeTitle.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.title');
        if (userTypeSubtitle) userTypeSubtitle.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.subtitle');
        if (patientTitle) patientTitle.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.patient_title');
        if (patientDesc) patientDesc.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.patient_desc');
        if (doctorTitle) doctorTitle.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.doctor_title');
        if (doctorDesc) doctorDesc.textContent = LanguageManager.getTranslation(lang, 'user_type_selection.doctor_desc');

        // Update back buttons
        const backButtons = document.querySelectorAll('[id*="back-to"]');
        backButtons.forEach(button => {
            const backText = button.querySelector('span') || button;
            if (backText && backText.textContent.trim() !== '') {
                backText.textContent = LanguageManager.getTranslation(lang, 'auth.back');
            }
        });

        // Update footer
        const footerBrand = document.getElementById('footer-brand');
        const footerCopyright = document.getElementById('footer-copyright');
        if (footerBrand) footerBrand.textContent = LanguageManager.getTranslation(lang, 'footer.brand');
        if (footerCopyright) footerCopyright.textContent = LanguageManager.getTranslation(lang, 'footer.copyright');
    }
};

// Language selection function
function selectLanguage(lang) {
    console.log(`User selected language: ${lang}`);
    
    // Show loading state
    const buttons = document.querySelectorAll('#language-selection .btn');
    buttons.forEach(btn => btn.classList.add('loading'));

    // Set language preference
    LanguageManager.setLanguage(lang);
    LanguageManager.applyLanguage(lang);
    
    // Update all translations
    AuthManager.updateTranslations(lang);
    
    // Remove loading state and show auth selection
    setTimeout(() => {
        buttons.forEach(btn => btn.classList.remove('loading'));
        AuthManager.showAuthSelection();
    }, 300);
}

// User type selection function
function selectUserType(type) {
    console.log(`User selected type: ${type}`);
    
    if (type === 'patient') {
        AuthManager.showPatientRegister();
    } else if (type === 'doctor') {
        AuthManager.showDoctorRegister();
    }
}

// Navigation functions (exposed globally for onclick handlers)
function showLanguageSelection() {
    AuthManager.showLanguageSelection();
}

function showAuthSelection() {
    AuthManager.showAuthSelection();
}

function showUserTypeSelection() {
    AuthManager.showUserTypeSelection();
}

function showLogin() {
    AuthManager.showLogin();
}

// Login handling function
// handleLogin function removed - using the real implementation from main.js

// Logout function
function logout() {
    console.log('User logout');
    
    // Clear user session data
    localStorage.removeItem('sahatak_user');
    localStorage.removeItem('sahatak_token');
    
    // Redirect to language selection
    AuthManager.showLanguageSelection();
}

// Initialize auth system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth system initialized');
    
    // Wait for translations to be loaded before proceeding
    const waitForTranslations = () => {
        if (Object.keys(LanguageManager.translations).length > 0) {
            initializeAuth();
        } else {
            console.log('Waiting for translations to load...');
            setTimeout(waitForTranslations, 100);
        }
    };
    
    const initializeAuth = () => {
        // Check if user has language preference
        const savedLanguage = LanguageManager.getLanguage();
        
        if (savedLanguage) {
            // User has visited before, apply saved language and show auth
            LanguageManager.applyLanguage(savedLanguage);
            AuthManager.updateTranslations(savedLanguage);
            AuthManager.showAuthSelection();
        } else {
            // First visit, show language selection
            AuthManager.showLanguageSelection();
        }
    };
    
    // Start waiting for translations
    waitForTranslations();
});