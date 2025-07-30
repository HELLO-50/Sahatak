// Sahatak main JavaScript - Language Management & Core Functions

// Language Management Object
const LanguageManager = {
    // Set user's language preference
    setLanguage: (lang) => {
        localStorage.setItem('sahatak_language', lang);
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        console.log(`Language set to: ${lang}`);
    },
    
    // Get current language preference
    getLanguage: () => {
        return localStorage.getItem('sahatak_language') || null;
    },
    
    // Check if this is user's first visit
    isFirstVisit: () => {
        return !localStorage.getItem('sahatak_language');
    },
    
    // Apply language settings to the page
    applyLanguage: (lang) => {
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        
        // Update Bootstrap classes for RTL/LTR
        if (lang === 'ar') {
            document.body.classList.add('rtl');
            document.body.classList.remove('ltr');
        } else {
            document.body.classList.add('ltr');
            document.body.classList.remove('rtl');
        }
    }
};

// Language Selection Function
function selectLanguage(lang) {
    console.log(`User selected language: ${lang}`);
    
    // Show loading state
    const buttons = document.querySelectorAll('#language-selection .btn');
    buttons.forEach(btn => btn.classList.add('loading'));
    
    // Simulate a brief loading period for better UX
    setTimeout(() => {
        // Set the language preference
        LanguageManager.setLanguage(lang);
        
        // Hide language selection screen
        document.getElementById('language-selection').classList.add('d-none');
        
        // Show auth selection screen
        document.getElementById('auth-selection').classList.remove('d-none');
        
        // Apply language settings
        LanguageManager.applyLanguage(lang);
        
        // Update content based on language
        updateContentByLanguage(lang);
        
        console.log('Language selection completed');
    }, 500);
}

// Show language selection (for language switcher)
function showLanguageSelection() {
    // Hide all other screens
    document.getElementById('auth-selection').classList.add('d-none');
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.add('d-none');
    
    // Remove any loading states from language buttons
    const buttons = document.querySelectorAll('#language-selection .btn');
    buttons.forEach(btn => btn.classList.remove('loading'));
    
    // Show language selection
    document.getElementById('language-selection').classList.remove('d-none');
}

// Show auth selection screen
function showAuthSelection() {
    // Hide all other screens
    document.getElementById('language-selection').classList.add('d-none');
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.add('d-none');
    
    // Show auth selection
    document.getElementById('auth-selection').classList.remove('d-none');
}

// Show login form
function showLogin() {
    // Hide all other screens
    document.getElementById('auth-selection').classList.add('d-none');
    document.getElementById('register-form').classList.add('d-none');
    
    // Show login form
    document.getElementById('login-form').classList.remove('d-none');
}

// Show register form
function showRegister() {
    // Hide all other screens
    document.getElementById('auth-selection').classList.add('d-none');
    document.getElementById('login-form').classList.add('d-none');
    
    // Show register form
    document.getElementById('register-form').classList.remove('d-none');
}

// Update page content based on selected language
function updateContentByLanguage(lang) {
    const translations = {
        ar: {
            // Welcome section
            welcomeTitle: 'مرحباً بك في منصة صحتك للطب عن بُعد',
            welcomeDescription: 'منصة آمنة وسهلة الاستخدام للتواصل مع الأطباء',
            
            // Auth selection
            authPrompt: 'ابدأ رحلتك الصحية',
            loginText: 'تسجيل الدخول',
            registerText: 'إنشاء حساب جديد',
            languageSwitchText: 'تغيير اللغة',
            currentLanguage: 'العربية',
            
            // Login form
            loginTitle: 'تسجيل الدخول',
            loginSubtitle: 'أدخل بياناتك للوصول إلى حسابك',
            emailLabel: 'البريد الإلكتروني',
            passwordLabel: 'كلمة المرور',
            loginSubmit: 'دخول',
            backToAuth: 'العودة',
            
            // Register form
            registerTitle: 'إنشاء حساب جديد',
            registerSubtitle: 'انضم إلى منصة صحتك اليوم',
            firstNameLabel: 'الاسم الأول',
            lastNameLabel: 'الاسم الأخير',
            regEmailLabel: 'البريد الإلكتروني',
            regPasswordLabel: 'كلمة المرور',
            userTypeLabel: 'نوع الحساب',
            registerSubmit: 'إنشاء الحساب',
            backToAuthReg: 'العودة',
            
            // Footer
            footerBrand: 'صحتك | Sahatak',
            footerDescription: 'منصة طبية آمنة وموثوقة للتواصل مع الأطباء عن بُعد',
            footerLinksTitle: 'روابط سريعة',
            footerAbout: 'عن المنصة',
            footerServices: 'الخدمات',
            footerSupportTitle: 'الدعم والمساعدة',
            footerHelp: 'مركز المساعدة',
            footerContact: 'اتصل بنا',
            footerEmergencyTitle: 'الطوارئ',
            footerEmergencyText: 'في حالات الطوارئ الطبية',
            footerEmergencyAction: 'اذهب إلى أقرب مستشفى طوارئ',
            footerEmergencyNote: 'للاستشارات غير العاجلة استخدم المنصة',
            footerCopyright: '© 2024 صحتك Sahatak. جميع الحقوق محفوظة.',
            footerMedicalDisclaimer: 'هذه المنصة لا تغني عن زيارة الطبيب في الحالات الطارئة'
        },
        en: {
            // Welcome section
            welcomeTitle: 'Welcome to Sahatak Telemedicine Platform',
            welcomeDescription: 'A secure and user-friendly platform to connect with doctors',
            
            // Auth selection
            authPrompt: 'Start Your Health Journey',
            loginText: 'Login',
            registerText: 'Create New Account',
            languageSwitchText: 'Change Language',
            currentLanguage: 'English',
            
            // Login form
            loginTitle: 'Login',
            loginSubtitle: 'Enter your credentials to access your account',
            emailLabel: 'Email Address',
            passwordLabel: 'Password',
            loginSubmit: 'Login',
            backToAuth: 'Back',
            
            // Register form
            registerTitle: 'Create New Account',
            registerSubtitle: 'Join Sahatak platform today',
            firstNameLabel: 'First Name',
            lastNameLabel: 'Last Name',
            regEmailLabel: 'Email Address',
            regPasswordLabel: 'Password',
            userTypeLabel: 'Account Type',
            registerSubmit: 'Create Account',
            backToAuthReg: 'Back',
            
            // Footer
            footerBrand: 'صحتك | Sahatak',
            footerDescription: 'A secure and trusted medical platform to connect with doctors remotely',
            footerLinksTitle: 'Quick Links',
            footerAbout: 'About Platform',
            footerServices: 'Services',
            footerSupportTitle: 'Support & Help',
            footerHelp: 'Help Center',
            footerContact: 'Contact Us',
            footerEmergencyTitle: 'Emergency',
            footerEmergencyText: 'For medical emergencies',
            footerEmergencyAction: 'Go to nearest ER hospital',
            footerEmergencyNote: 'For non-urgent consultations use the platform',
            footerCopyright: '© 2024 Sahatak | صحتك. All rights reserved.',
            footerMedicalDisclaimer: 'This platform does not replace visiting a doctor in emergency cases'
        }
    };
    
    const t = translations[lang];
    
    // Update welcome section
    updateElementText('welcome-text', t.welcomeTitle);
    updateElementText('welcome-description', t.welcomeDescription);
    
    // Update auth selection
    updateElementText('auth-prompt', t.authPrompt);
    updateElementText('login-text', t.loginText);
    updateElementText('register-text', t.registerText);
    updateElementText('language-switch-text', t.languageSwitchText);
    updateElementText('current-language', t.currentLanguage);
    
    // Update login form
    updateElementText('login-title', t.loginTitle);
    updateElementText('login-subtitle', t.loginSubtitle);
    updateElementText('email-label', t.emailLabel);
    updateElementText('password-label', t.passwordLabel);
    updateElementText('login-submit', t.loginSubmit);
    updateElementText('back-to-auth', t.backToAuth);
    
    // Update register form
    updateElementText('register-title', t.registerTitle);
    updateElementText('register-subtitle', t.registerSubtitle);
    updateElementText('firstName-label', t.firstNameLabel);
    updateElementText('lastName-label', t.lastNameLabel);
    updateElementText('regEmail-label', t.regEmailLabel);
    updateElementText('regPassword-label', t.regPasswordLabel);
    updateElementText('userType-label', t.userTypeLabel);
    updateElementText('register-submit', t.registerSubmit);
    updateElementText('back-to-auth-reg', t.backToAuthReg);
    
    // Update select options
    updateSelectOptions(lang);
    
    // Update footer
    updateElementText('footer-brand', t.footerBrand);
    updateElementText('footer-description', t.footerDescription);
    updateElementText('footer-links-title', t.footerLinksTitle);
    updateElementText('footer-about', t.footerAbout);
    updateElementText('footer-services', t.footerServices);
    updateElementText('footer-support-title', t.footerSupportTitle);
    updateElementText('footer-help', t.footerHelp);
    updateElementText('footer-contact', t.footerContact);
    updateElementText('footer-emergency-title', t.footerEmergencyTitle);
    updateElementText('footer-emergency-text', t.footerEmergencyText);
    updateElementText('footer-emergency-action', t.footerEmergencyAction);
    updateElementText('footer-emergency-note', t.footerEmergencyNote);
    updateElementText('footer-copyright', t.footerCopyright);
    updateElementText('footer-medical-disclaimer', t.footerMedicalDisclaimer);
}

// Helper function to update element text
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// Update select options based on language
function updateSelectOptions(lang) {
    const userTypeSelect = document.getElementById('userType');
    if (userTypeSelect) {
        if (lang === 'ar') {
            userTypeSelect.innerHTML = `
                <option value="">اختر نوع الحساب</option>
                <option value="patient">مريض</option>
                <option value="doctor">طبيب</option>
            `;
        } else {
            userTypeSelect.innerHTML = `
                <option value="">Choose Account Type</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
            `;
        }
    }
}

// Initialize application on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sahatak application initializing...');
    
    // Check if user has already selected a language
    if (!LanguageManager.isFirstVisit()) {
        const savedLanguage = LanguageManager.getLanguage();
        console.log(`Saved language found: ${savedLanguage}`);
        
        // Skip language selection and go directly to auth selection
        document.getElementById('language-selection').classList.add('d-none');
        document.getElementById('auth-selection').classList.remove('d-none');
        
        // Apply the saved language
        LanguageManager.applyLanguage(savedLanguage);
        updateContentByLanguage(savedLanguage);
    } else {
        console.log('First visit detected - showing language selection');
        // Language selection screen is already visible by default
    }
    
    // Bootstrap components initialization
    initializeBootstrapComponents();
});

// Initialize Bootstrap components
function initializeBootstrapComponents() {
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    console.log('Bootstrap components initialized');
}

// Utility function for API calls (to be used later)
const ApiHelper = {
    baseUrl: 'https://your-backend-url.com/api', // Update this when backend is deployed
    
    // Make API call with language preference
    async makeRequest(endpoint, options = {}) {
        const language = LanguageManager.getLanguage() || 'ar';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
                ...options.headers
            }
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// Console welcome message
console.log('%c🏥 Sahatak Telemedicine Platform', 'color: #2563eb; font-size: 16px; font-weight: bold;');
console.log('%cBootstrap 5 loaded successfully ✓', 'color: #059669;');
console.log('%cArabic font support enabled ✓', 'color: #059669;');
console.log('%cLanguage management ready ✓', 'color: #059669;');