// Sahatak main JavaScript - Language Management & Core Functions

// Language Management Object
const LanguageManager = {
    translations: {},
    
    // Load translations from JSON files
    async loadTranslations() {
        try {
            // Determine correct path based on current location
            const isInSubdirectory = window.location.pathname.includes('/pages/');
            const basePath = isInSubdirectory ? '../../locales/' : 'frontend/locales/';
            
            const [arResponse, enResponse] = await Promise.all([
                fetch(`${basePath}ar.json`),
                fetch(`${basePath}en.json`)
            ]);
            
            this.translations.ar = await arResponse.json();
            this.translations.en = await enResponse.json();
            
            console.log('Translations loaded successfully');
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to hardcoded translations if JSON fails
            this.loadFallbackTranslations();
        }
    },
    
    // Fallback translations in case JSON loading fails
    loadFallbackTranslations() {
        this.translations = {
            ar: {
                welcome: { title: 'مرحباً بك في منصة صحتك للطب عن بُعد' },
                auth: { login: 'تسجيل الدخول' }
            },
            en: {
                welcome: { title: 'Welcome to Sahatak Telemedicine Platform' },
                auth: { login: 'Login' }
            }
        };
    },
    
    // Get translation by key path (e.g., 'welcome.title')
    getTranslation(lang, keyPath) {
        const keys = keyPath.split('.');
        let value = this.translations[lang];
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        return value || keyPath; // Return key if translation not found
    },
    
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

// Update page content based on selected language using JSON translations
function updateContentByLanguage(lang) {
    // Use the new LanguageManager to get translations
    const t = LanguageManager.translations[lang];
    if (!t) {
        console.error(`Translations not found for language: ${lang}`);
        return;
    }
    
    // Update welcome section
    updateElementText('welcome-text', t.welcome?.title);
    updateElementText('welcome-description', t.welcome?.description);
    
    // Update auth selection
    updateElementText('auth-prompt', t.auth?.prompt);
    updateElementText('login-text', t.auth?.login);
    updateElementText('register-text', t.auth?.register);
    updateElementText('language-switch-text', t.auth?.language_switch);
    updateElementText('current-language', t.auth?.current_language);
    
    // Update login form
    updateElementText('login-title', t.login?.title);
    updateElementText('login-subtitle', t.login?.subtitle);
    updateElementText('email-label', t.login?.email);
    updateElementText('password-label', t.login?.password);
    updateElementText('login-submit', t.login?.submit);
    updateElementText('back-to-auth', t.auth?.back);
    
    // Update register form
    updateElementText('register-title', t.register?.title);
    updateElementText('register-subtitle', t.register?.subtitle);
    updateElementText('firstName-label', t.register?.first_name);
    updateElementText('lastName-label', t.register?.last_name);
    updateElementText('regEmail-label', t.register?.email);
    updateElementText('regPassword-label', t.register?.password);
    updateElementText('userType-label', t.register?.user_type);
    updateElementText('register-submit', t.register?.submit);
    updateElementText('back-to-auth-reg', t.auth?.back);
    
    // Update select options
    updateSelectOptions(lang);
    
    // Update footer
    updateElementText('footer-brand', t.footer?.brand);
    updateElementText('footer-description', t.footer?.description);
    updateElementText('footer-links-title', t.footer?.quick_links);
    updateElementText('footer-about', t.footer?.about);
    updateElementText('footer-services', t.footer?.services);
    updateElementText('footer-support-title', t.footer?.support);
    updateElementText('footer-help', t.footer?.help);
    updateElementText('footer-contact', t.footer?.contact);
    updateElementText('footer-emergency-title', t.footer?.emergency?.title);
    updateElementText('footer-emergency-text', t.footer?.emergency?.text);
    updateElementText('footer-emergency-action', t.footer?.emergency?.action);
    updateElementText('footer-emergency-note', t.footer?.emergency?.note);
    updateElementText('footer-copyright', t.footer?.copyright);
    updateElementText('footer-medical-disclaimer', t.footer?.disclaimer);
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
    if (userTypeSelect && LanguageManager.translations[lang]) {
        const t = LanguageManager.translations[lang];
        userTypeSelect.innerHTML = `
            <option value="">${t.register?.choose_type || 'Choose Account Type'}</option>
            <option value="patient">${t.register?.patient || 'Patient'}</option>
            <option value="doctor">${t.register?.doctor || 'Doctor'}</option>
        `;
    }
}

// Initialize application on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Sahatak application initializing...');
    
    // Load translations first
    await LanguageManager.loadTranslations();
    
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