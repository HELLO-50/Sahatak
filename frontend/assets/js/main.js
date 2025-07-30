// Sahatak Main JavaScript - Language Management & Core Functions

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
        
        // Show main application
        document.getElementById('main-app').classList.remove('d-none');
        
        // Apply language settings
        LanguageManager.applyLanguage(lang);
        
        // Update content based on language
        updateContentByLanguage(lang);
        
        console.log('Language selection completed');
    }, 500);
}

// Update page content based on selected language
function updateContentByLanguage(lang) {
    const translations = {
        ar: {
            home: 'الرئيسية',
            bookAppointment: 'حجز موعد',
            login: 'تسجيل الدخول',
            welcome: 'مرحباً بك في منصة صحتك للطب عن بُعد',
            description: 'منصة آمنة وسهلة الاستخدام للتواصل مع الأطباء'
        },
        en: {
            home: 'Home',
            bookAppointment: 'Book Appointment',
            login: 'Login',
            welcome: 'Welcome to Sahatak Telemedicine Platform',
            description: 'A secure and user-friendly platform to connect with doctors'
        }
    };
    
    const t = translations[lang];
    
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks.length >= 3) {
        navLinks[0].textContent = t.home;
        navLinks[1].textContent = t.bookAppointment;
        navLinks[2].textContent = t.login;
    }
    
    // Update main content
    const mainTitle = document.querySelector('main h2');
    const mainDescription = document.querySelector('main .lead');
    
    if (mainTitle) mainTitle.textContent = t.welcome;
    if (mainDescription) mainDescription.textContent = t.description;
}

// Initialize application on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Sahatak application initializing...');
    
    // Check if user has already selected a language
    if (!LanguageManager.isFirstVisit()) {
        const savedLanguage = LanguageManager.getLanguage();
        console.log(`Saved language found: ${savedLanguage}`);
        
        // Skip language selection and go directly to app
        document.getElementById('language-selection').classList.add('d-none');
        document.getElementById('main-app').classList.remove('d-none');
        
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
console.log('%cSahatak Telemedicine Platform', 'color: #2563eb; font-size: 16px; font-weight: bold;');
console.log('%cBootstrap 5 loaded successfully ✓', 'color: #059669;');
console.log('%cArabic font support enabled ✓', 'color: #059669;');
console.log('%cLanguage management ready ✓', 'color: #059669;');