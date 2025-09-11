// Sahatak main JavaScript - Language Management & Core Functions

// Main.js loaded

// Language Management Object
const LanguageManager = {
    translations: {},
    
    // Load translations from JSON files
    async loadTranslations() {
        try {
            // Determine correct path based on current location
            const pathname = window.location.pathname;
            const isInSubdirectory = pathname.includes('/pages/');
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            let basePath;
            if (isInSubdirectory) {
                // Count how many levels deep we are from the root
                const pathParts = pathname.split('/');
                const pagesIndex = pathParts.findIndex(part => part === 'pages');
                if (pagesIndex >= 0) {
                    // Count directories after 'pages' (excluding filename)
                    const dirsAfterPages = pathParts.length - pagesIndex - 2; // -2 for 'pages' and filename
                    // Go up from current dir to pages, then from pages to root
                    const totalLevelsUp = dirsAfterPages + 1; // +1 to go from pages to root
                    basePath = '../'.repeat(totalLevelsUp) + 'locales/';
                } else {
                    basePath = '../../locales/';  // Fallback
                }
            } else if (isGitHubPages) {
                basePath = 'frontend/locales/';
            } else {
                basePath = 'frontend/locales/';
            }
            
            
            const [arResponse, enResponse] = await Promise.all([
                fetch(`${basePath}ar.json`),
                fetch(`${basePath}en.json`)
            ]);
            
            if (!arResponse.ok || !enResponse.ok) {
                throw new Error(`Failed to fetch translations. AR: ${arResponse.status}, EN: ${enResponse.status}`);
            }
            
            this.translations.ar = await arResponse.json();
            this.translations.en = await enResponse.json();
            
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
                welcome: { 
                    title: 'مرحباً بك في منصة صحتك للطب عن بُعد',
                    description: 'منصة آمنة وسهلة الاستخدام للتواصل مع الأطباء'
                },
                auth: { 
                    prompt: 'ابدأ رحلتك الصحية',
                    login: 'تسجيل الدخول',
                    register: 'إنشاء حساب جديد',
                    language_switch: 'تغيير اللغة',
                    current_language: 'العربية',
                    back: 'العودة'
                },
                user_type_selection: {
                    title: 'اختر نوع حسابك',
                    subtitle: 'اختر النوع المناسب لحسابك لنقدم لك التجربة الأمثل',
                    patient_title: 'مريض',
                    patient_desc: 'أبحث عن استشارة طبية أو متابعة حالتي الصحية',
                    doctor_title: 'طبيب',
                    doctor_desc: 'أريد تقديم الاستشارات الطبية للمرضى',
                    back: 'العودة'
                },
                footer: {
                    brand: 'صحتك | Sahatak',
                    copyright: '© 2025 صحتك Sahatak. جميع الحقوق محفوظة.'
                }
            },
            en: {
                welcome: { 
                    title: 'Welcome to Sahatak Telemedicine Platform',
                    description: 'A secure and user-friendly platform to connect with doctors'
                },
                auth: { 
                    prompt: 'Start Your Health Journey',
                    login: 'Login',
                    register: 'Create New Account',
                    language_switch: 'Change Language',
                    current_language: 'English',
                    back: 'Back'
                },
                user_type_selection: {
                    title: 'Choose Your Account Type',
                    subtitle: 'Select the appropriate type for your account to provide you with the optimal experience',
                    patient_title: 'Patient',
                    patient_desc: 'I\'m looking for medical consultation or follow-up on my health condition',
                    doctor_title: 'Doctor',
                    doctor_desc: 'I want to provide medical consultations to patients',
                    back: 'Back'
                },
                footer: {
                    brand: 'صحتك | Sahatak',
                    copyright: '© 2025 Sahatak | صحتك. All rights reserved.'
                }
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
    },
    
    // Get current language preference
    getLanguage: () => {
        return localStorage.getItem('sahatak_language') || null;
    },
    
    // Check if this is user's first visit
    isFirstVisit: () => {
        return !localStorage.getItem('sahatak_language');
    },
    
    // Translate a key with dot notation (e.g., 'email_verification.invalid_link')
    translate: function(key, lang = null) {
        const language = lang || this.getLanguage() || 'ar';
        const translations = this.translations[language];
        
        if (!translations) {
            return key; // Return the key itself as fallback
        }
        
        // Handle dot notation (e.g., 'email_verification.invalid_link')
        const keys = key.split('.');
        let value = translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return the key itself as fallback
            }
        }
        
        return value;
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
    
    // Show loading state
    const buttons = document.querySelectorAll('#language-selection .btn');
    buttons.forEach(btn => btn.classList.add('loading'));
    
    // Simulate a brief loading period for better UX
    setTimeout(() => {
        // Set the language preference
        LanguageManager.setLanguage(lang);
        
        // Hide language selection screen
        const languageSelection = document.getElementById('language-selection');
        if (languageSelection) {
            languageSelection.classList.add('d-none');
            languageSelection.style.display = 'none';
        }
        
        // Make sure all other screens are hidden
        const screensToHide = ['user-type-selection', 'login-form', 'patient-register-form', 'doctor-register-form'];
        screensToHide.forEach(screenId => {
            const element = document.getElementById(screenId);
            if (element) {
                element.classList.add('d-none');
                element.style.display = 'none';
            }
        });
        
        // Show auth selection screen
        const authSelection = document.getElementById('auth-selection');
        if (authSelection) {
            authSelection.classList.remove('d-none');
            authSelection.style.display = ''; // Clear inline style
        }
        
        // Apply language settings
        LanguageManager.applyLanguage(lang);
        
        // Update content based on language
        updateContentByLanguage(lang);
        
    }, 500);
}

// Show language selection (for language switcher)
function showLanguageSelection() {
    // Hide all other screens
    const screensToHide = ['auth-selection', 'login-form', 'user-type-selection', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Remove any loading states from language buttons
    const buttons = document.querySelectorAll('#language-selection .btn');
    buttons.forEach(btn => btn.classList.remove('loading'));
    
    // Show language selection
    const languageSelection = document.getElementById('language-selection');
    if (languageSelection) {
        languageSelection.classList.remove('d-none');
        languageSelection.style.display = ''; // Clear inline style
    }
}

// Show auth selection screen
function showAuthSelection() {
    
    // Hide all other screens
    const screensToHide = ['language-selection', 'login-form', 'user-type-selection', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Show auth selection
    const authSelection = document.getElementById('auth-selection');
    if (authSelection) {
        authSelection.classList.remove('d-none');
        authSelection.style.display = '';
    }
}

// Show login form
function showLogin() {
    
    // Hide all other screens
    const screensToHide = ['auth-selection', 'user-type-selection', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Show login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.classList.remove('d-none');
        loginForm.style.display = ''; // Clear inline style
    }
}

// Show user type selection
function showUserTypeSelection() {
    
    // Hide all other screens
    const screensToHide = ['auth-selection', 'login-form', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Show user type selection
    const userTypeSelection = document.getElementById('user-type-selection');
    if (userTypeSelection) {
        userTypeSelection.classList.remove('d-none');
        userTypeSelection.style.display = ''; // Clear inline style
    }
}

// Select user type and show appropriate registration form
function selectUserType(userType) {
    
    // Hide all other screens
    const screensToHide = ['user-type-selection', 'auth-selection', 'login-form', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Show appropriate registration form based on user type
    if (userType === 'patient') {
        const patientForm = document.getElementById('patient-register-form');
        if (patientForm) {
            patientForm.classList.remove('d-none');
            patientForm.style.display = ''; // Clear inline style
        }
    } else if (userType === 'doctor') {
        const doctorForm = document.getElementById('doctor-register-form');
        if (doctorForm) {
            doctorForm.classList.remove('d-none');
            doctorForm.style.display = ''; // Clear inline style
        }
    }
}

// Update page content based on selected language using JSON translations
function updateContentByLanguage(lang) {
    // Use the new LanguageManager to get translations
    const t = LanguageManager.translations[lang];
    if (!t) {
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
    // Show the opposite language (the one you can switch TO)
    const oppositeLanguage = lang === 'ar' ? 'English' : 'العربية';
    updateElementText('current-language', oppositeLanguage);
    
    // Update login form
    updateElementText('login-title', t.login?.title);
    updateElementText('login-subtitle', t.login?.subtitle);
    updateElementText('login-identifier-label', t.login?.login_identifier);
    updateElementText('password-label', t.login?.password);
    updateElementText('login-submit', t.login?.submit);
    updateElementText('back-to-auth', t.auth?.back);
    
    // Update user type selection
    updateElementText('user-type-title', t.user_type_selection?.title);
    updateElementText('user-type-subtitle', t.user_type_selection?.subtitle);
    updateElementText('patient-title', t.user_type_selection?.patient_title);
    updateElementText('patient-desc', t.user_type_selection?.patient_desc);
    updateElementText('doctor-title', t.user_type_selection?.doctor_title);
    updateElementText('doctor-desc', t.user_type_selection?.doctor_desc);
    updateElementText('back-to-auth-type', t.user_type_selection?.back);
    
    // Update patient registration form
    updateElementText('patient-register-title', t.patient_register?.title);
    updateElementText('patient-register-subtitle', t.patient_register?.subtitle);
    updateElementText('patient-fullName-label', t.patient_register?.full_name);
    updateElementText('patient-email-label', t.patient_register?.email);
    updateElementText('patient-phone-label', t.patient_register?.phone);
    updateElementText('patient-age-label', t.patient_register?.age);
    updateElementText('patient-gender-label', t.patient_register?.gender);
    updateElementText('patient-password-label', t.patient_register?.password);
    updateElementText('patient-password-help', t.patient_register?.password_help);
    updateElementText('patient-register-text-btn', t.patient_register?.submit);
    updateElementText('back-to-user-type-patient', t.patient_register?.back);
    
    // Update doctor registration form
    updateElementText('doctor-register-title', t.doctor_register?.title);
    updateElementText('doctor-register-subtitle', t.doctor_register?.subtitle);
    updateElementText('doctor-fullName-label', t.doctor_register?.full_name);
    updateElementText('doctor-email-label', t.doctor_register?.email);
    updateElementText('doctor-phone-label', t.doctor_register?.phone);
    updateElementText('doctor-license-label', t.doctor_register?.license);
    updateElementText('doctor-specialty-label', t.doctor_register?.specialty);
    updateElementText('doctor-experience-label', t.doctor_register?.experience);
    updateElementText('doctor-password-label', t.doctor_register?.password);
    updateElementText('doctor-password-help', t.doctor_register?.password_help);
    updateElementText('doctor-register-text-btn', t.doctor_register?.submit);
    updateElementText('back-to-user-type-doctor', t.doctor_register?.back);
    
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
    if (element && text) {
        element.textContent = text;
    }
}

// Update select options based on language
function updateSelectOptions(lang) {
    const t = LanguageManager.translations[lang];
    if (!t) return;
    
    // Update patient gender select
    const patientGenderSelect = document.getElementById('patientGender');
    if (patientGenderSelect) {
        patientGenderSelect.innerHTML = `
            <option value="">${t.patient_register?.choose_gender || 'Choose Gender'}</option>
            <option value="male">${t.patient_register?.male || 'Male'}</option>
            <option value="female">${t.patient_register?.female || 'Female'}</option>
        `;
    }
    
    // Update doctor specialty select
    const doctorSpecialtySelect = document.getElementById('doctorSpecialty');
    if (doctorSpecialtySelect) {
        doctorSpecialtySelect.innerHTML = `
            <option value="">${t.doctor_register?.choose_specialty || 'Choose Specialty'}</option>
            <option value="cardiology">${lang === 'ar' ? 'أمراض القلب' : 'Cardiology'}</option>
            <option value="pediatrics">${lang === 'ar' ? 'طب الأطفال' : 'Pediatrics'}</option>
            <option value="dermatology">${lang === 'ar' ? 'الأمراض الجلدية' : 'Dermatology'}</option>
            <option value="internal">${lang === 'ar' ? 'الطب الباطني' : 'Internal Medicine'}</option>
            <option value="psychiatry">${lang === 'ar' ? 'الطب النفسي' : 'Psychiatry'}</option>
            <option value="orthopedics">${lang === 'ar' ? 'العظام' : 'Orthopedics'}</option>
            <option value="general">${lang === 'ar' ? 'طب عام' : 'General Medicine'}</option>
        `;
    }
}

// Keyboard navigation for language selection
function initializeKeyboardNavigation() {
    document.addEventListener('keydown', function(event) {
        // Only handle keyboard navigation on language selection screen
        const languageSelection = document.getElementById('language-selection');
        if (languageSelection && !languageSelection.classList.contains('d-none')) {
            const langButtons = document.querySelectorAll('#language-selection button[data-lang]');
            const activeElement = document.activeElement;
            
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                
                const currentIndex = Array.from(langButtons).indexOf(activeElement);
                let nextIndex;
                
                if (event.key === 'ArrowDown') {
                    nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % langButtons.length;
                } else {
                    nextIndex = currentIndex === -1 ? langButtons.length - 1 : (currentIndex - 1 + langButtons.length) % langButtons.length;
                }
                
                langButtons[nextIndex].focus();
            }
            
            // Handle Enter key
            if (event.key === 'Enter' && activeElement.hasAttribute('data-lang')) {
                event.preventDefault();
                activeElement.click();
            }
        }
    });
}

// Initialize application on page load
document.addEventListener('DOMContentLoaded', async function() {
    
    // FIRST: Hide all screens except language selection to ensure clean state
    const screensToHide = ['auth-selection', 'user-type-selection', 'login-form', 'patient-register-form', 'doctor-register-form'];
    screensToHide.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            element.classList.add('d-none');
            element.style.display = 'none';
        }
    });
    
    // Load translations first - with fallback
    try {
        await LanguageManager.loadTranslations();
    } catch (error) {
        console.error('Error loading translations, using fallbacks:', error);
        LanguageManager.loadFallbackTranslations();
    }
    
    
    // Initialize keyboard navigation
    initializeKeyboardNavigation();
    
    // Check if user has already selected a language
    if (!LanguageManager.isFirstVisit()) {
        const savedLanguage = LanguageManager.getLanguage();
        
        // Skip language selection and go directly to auth selection (only if elements exist)
        const languageSelection = document.getElementById('language-selection');
        const authSelection = document.getElementById('auth-selection');
        if (languageSelection) languageSelection.classList.add('d-none');
        if (authSelection) authSelection.classList.remove('d-none');
        
        // Apply the saved language
        LanguageManager.applyLanguage(savedLanguage);
        updateContentByLanguage(savedLanguage);
    } else {
        // Ensure language selection is visible (only if element exists)
        const languageSelection = document.getElementById('language-selection');
        if (languageSelection) {
            languageSelection.classList.remove('d-none');
            // Focus first language button for keyboard accessibility
            setTimeout(() => {
                const firstLangButton = document.querySelector('#language-selection button[data-lang]');
                if (firstLangButton) {
                    firstLangButton.focus();
                }
            }, 100);
        }
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
    
}

// API Helper for backend communication
const ApiHelper = {
    // Update this to your deployed backend URL
    baseUrl: 'https://sahatak.pythonanywhere.com/api', // Your PythonAnywhere backend URL
    sessionCheckInterval: null,
    lastSessionCheck: null,
    
    // Cacheable endpoints (GET requests that can be cached)
    cacheableEndpoints: [
        '/users/doctors',
        '/users/specialties',
        '/user-settings/profile',
        '/notifications/settings/defaults',
        '/admin/settings'
    ],

    // Determine if endpoint should be cached
    _shouldCache(endpoint, method) {
        // Never cache appointments for real-time medical data
        if (endpoint.includes('/appointments/') || endpoint.includes('/appointments')) {
            return false;
        }
        return method === 'GET' && this.cacheableEndpoints.some(cacheable => 
            endpoint.startsWith(cacheable) || endpoint.includes('/availability/') || endpoint.includes('/ehr/')
        );
    },

    // Generate cache key for request
    _getCacheKey(endpoint, options) {
        const method = options.method || 'GET';
        const language = LanguageManager.getLanguage() || 'ar';
        const body = options.body || '';
        return `api_${method}_${endpoint}_${language}_${btoa(body).slice(0, 10)}`;
    },

    // Determine cache data type
    _getCacheDataType(endpoint) {
        if (endpoint.includes('/doctors')) return 'doctors_list';
        if (endpoint.includes('/availability')) return 'doctor_availability';
        if (endpoint.includes('/appointments')) return 'appointments_list';
        if (endpoint.includes('/ehr/')) return 'patient_ehr';
        if (endpoint.includes('/prescriptions')) return 'prescriptions';
        if (endpoint.includes('/medical-history')) return 'medical_history';
        if (endpoint.includes('/user-settings') || endpoint.includes('/profile')) return 'user_settings';
        if (endpoint.includes('/specialties') || endpoint.includes('/defaults')) return 'specialties';
        return 'api_response';
    },
    
    // Check session with improved error handling to prevent logout loops
    async checkSession() {
        try {
            const now = Date.now();
            // Only check session every 10 minutes to avoid excessive requests
            if (this.lastSessionCheck && (now - this.lastSessionCheck) < 600000) {
                return true;
            }
            
            // Don't check session if user is not authenticated locally
            if (!AuthGuard || !AuthGuard.isAuthenticated()) {
                console.log('🔍 checkSession: User not authenticated locally, skipping');
                return false;
            }
            
            const token = localStorage.getItem('sahatak_access_token');
            console.log('🎫 checkSession - Token available:', !!token);
            
            const headers = {
                'Content-Type': 'application/json'
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${this.baseUrl}/auth/me`, {
                method: 'GET',
                credentials: 'include',
                headers: headers
            });
            
            this.lastSessionCheck = now;
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Update local user data if needed
                    if (data.data && data.data.user) {
                        localStorage.setItem('sahatak_user_data', JSON.stringify(data.data.user));
                    }
                    console.log('✅ Session check passed');
                    return true;
                }
            }
            
            // Only consider it a real failure if we get a definitive 401
            if (response.status === 401) {
                console.log('❌ Session check failed: 401 Unauthorized');
                return false;
            }
            
            // For other errors (network, 500, etc.), assume session is still valid
            console.log('⚠️ Session check inconclusive, assuming valid');
            return true;
            
        } catch (error) {
            // Network errors should not trigger logout
            console.log('⚠️ Session check error (network/other):', error.message);
            // Return true to avoid logout on network issues
            return true;
        }
    },

    // Start automatic session checking with improved safeguards
    startSessionMonitoring() {
        // Only start if not already running and user is authenticated
        if (!this.sessionCheckInterval && window.AuthGuard && AuthGuard.isAuthenticated() && !AuthGuard.isDevelopmentMode()) {
            this.sessionCheckInterval = setInterval(async () => {
                try {
                    const isValid = await this.checkSession();
                    if (!isValid) {
                        console.log('⚠️ Session validation failed - initiating logout');
                        await this.handleSessionExpired();
                    }
                } catch (error) {
                    console.log('⚠️ Session monitoring error:', error.message);
                    // Don't logout on monitoring errors - could be network issues
                }
            }, 1200000); // Check every 20 minutes (longer interval to reduce load)
            
            console.log('✅ Session monitoring started (20-minute intervals)');
            return true;
        }
        console.log('🔍 Session monitoring not started - conditions not met');
        return false; // Already running or conditions not met
    },

    // Stop session monitoring
    stopSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
            window.SahatakLogger?.info('Session monitoring stopped');
            return true;
        }
        return false; // Was not running
    },

    // Check if session monitoring is active
    isSessionMonitoringActive() {
        return this.sessionCheckInterval !== null;
    },

    // Make API call with caching, logging, and proper credentials
    async makeRequest(endpoint, options = {}) {
        const startTime = Date.now();
        const language = LanguageManager.getLanguage() || 'ar';
        const method = options.method || 'GET';
        
        // Check cache first for GET requests
        if (this._shouldCache(endpoint, method) && window.SahatakCache) {
            const cacheKey = this._getCacheKey(endpoint, options);
            const cached = window.SahatakCache.get(cacheKey);
            if (cached) {
                window.SahatakLogger?.debug(`Cache hit for ${method} ${endpoint}`);
                return cached;
            }
        }
        
        // Add JWT token to headers if available (fallback for session issues)
        const token = localStorage.getItem('sahatak_access_token');
        // Token debug info (reduced verbosity)
        if (!token) {
            console.warn('⚠️ No token available for API call');
        }
        
        const authHeaders = {};
        if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
        } else {
            console.log('🚨 NO TOKEN - This will likely result in 401 error');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept-Language': language,
            'X-Timestamp': Date.now().toString(),
            ...authHeaders,
            ...options.headers
        };
        
        // Cache-busting for appointments is handled by _shouldCache() exclusion
        
        const defaultOptions = {
            headers: headers,
            credentials: 'include' // Important for session-based authentication
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            // TEMPORARILY DISABLE aggressive session checking to debug logout issue
            // TODO: Re-enable once logout issue is resolved
            // Only log API calls for auth endpoints or errors
            const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register') || endpoint.includes('/auth/me');
            
            // Debug: Log request details
            const cookieString = document.cookie;
            window.SahatakLogger?.debug(`API Request: ${method} ${endpoint}`, {
                headers: requestOptions.headers,
                body: options.body ? JSON.parse(options.body) : null,
                cookies: cookieString,
                hasCookies: cookieString.length > 0,
                sessionCookie: cookieString.includes('session')
            });
            
            // Additional debug for session-related requests
            if (endpoint.includes('/auth/') || endpoint.includes('/users/profile')) {
                const hasToken = requestOptions.headers.Authorization ? 'YES' : 'NO';
                console.log(`🔐 Auth Request: ${method} ${endpoint}`);
                console.log(`📄 Cookies being sent: ${cookieString || 'NO COOKIES'}`);
                console.log(`🎫 JWT Token in headers: ${hasToken}`);
                console.log(`🔗 Credentials mode: ${requestOptions.credentials}`);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            const duration = Date.now() - startTime;
            
            // Log API call performance
            window.SahatakLogger?.apiCall(method, endpoint, response.status, duration);
            
            // Performance warning for slow requests
            if (duration > 5000) {
                window.SahatakLogger?.warn(`Slow API request: ${method} ${endpoint} took ${duration}ms`);
            }
            
            // Check for session invalidation (but not during login attempts, messaging calls, or video consultation pages)
            const isMessagingEndpoint = endpoint.includes('/messages') || endpoint.includes('/conversations');
            const isVideoConsultationPage = window.location.pathname.includes('video-consultation.html');
            const shouldTriggerLogout = !isLoginEndpoint && !isMessagingEndpoint && !isVideoConsultationPage && (response.status === 401 || (response.status === 302 && response.url.includes('/auth/login')));
            
            if (shouldTriggerLogout) {
                console.log('🚨 Got 401/302 response for', endpoint, 'Status:', response.status);
                window.SahatakLogger?.warn('Session expired or invalid - auto logging out');
                await this.handleSessionExpired();
                throw new ApiError(
                    'Your session has expired. Please log in again.',
                    401,
                    'SESSION_EXPIRED'
                );
            }
            
            const data = await response.json();
            
            // Handle standardized API response format
            if (data.success === false) {
                // Handle authentication errors (but not for messaging endpoints or video consultation pages)
                if (data.status_code === 401 && !isMessagingEndpoint && !isVideoConsultationPage) {
                    console.log('🚨 API response 401 for non-messaging endpoint:', endpoint);
                    window.SahatakLogger?.warn('Authentication failed - auto logging out');
                    await this.handleSessionExpired();
                } else if (data.status_code === 401 && (isMessagingEndpoint || isVideoConsultationPage)) {
                    console.log('🔸 401 ignored for messaging or video consultation to prevent logout loop');
                }
                
                const error = new ApiError(data.message, data.status_code, data.error_code, data.field);
                window.SahatakLogger?.error(`API Error: ${method} ${endpoint}`, {
                    statusCode: data.status_code,
                    errorCode: data.error_code,
                    message: data.message,
                    field: data.field
                });
                throw error;
            }
            
            // Cache successful GET requests
            if (this._shouldCache(endpoint, method) && window.SahatakCache && response.ok) {
                const cacheKey = this._getCacheKey(endpoint, options);
                const dataType = this._getCacheDataType(endpoint);
                window.SahatakCache.set(cacheKey, data, dataType);
            }
            
            // Clear related cache on data modifications
            if (['POST', 'PUT', 'DELETE'].includes(method) && window.SahatakCache) {
                this._invalidateRelatedCache(endpoint);
            }
            
            return data;
        } catch (error) {
            const duration = Date.now() - startTime;
            window.SahatakLogger?.error(`API request failed: ${method} ${endpoint} (${duration}ms)`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    },

    // Invalidate cache entries related to modified data
    _invalidateRelatedCache(endpoint) {
        if (endpoint.includes('/appointments')) {
            window.SahatakCache.clearByType('appointments_list');
            window.SahatakCache.clearByType('doctor_availability');
        }
        if (endpoint.includes('/ehr/') || endpoint.includes('/medical-history')) {
            window.SahatakCache.clearByType('patient_ehr');
            window.SahatakCache.clearByType('medical_history');
        }
        if (endpoint.includes('/prescriptions')) {
            window.SahatakCache.clearByType('prescriptions');
        }
        if (endpoint.includes('/user-settings')) {
            window.SahatakCache.clearByType('user_settings');
        }
        if (endpoint.includes('/doctors')) {
            window.SahatakCache.clearByType('doctors_list');
        }
    },

    // Force refresh cache for specific endpoint
    async forceRefresh(endpoint, options = {}) {
        const cacheKey = this._getCacheKey(endpoint, options);
        if (window.SahatakCache) {
            window.SahatakCache.delete(cacheKey);
        }
        return this.makeRequest(endpoint, options);
    },

    // Get API performance stats
    getPerformanceStats() {
        return {
            cache: window.SahatakCache?.getStats(),
            logs: window.SahatakLogger?.getRecentLogs(20)
        };
    },

    /**
     * Handle session expiration - clear local data and redirect to login
     */
    async handleSessionExpired() {
        try {
            console.log('🚨 handleSessionExpired called - logging out user');
            console.trace('Session expiry call stack:');
            
            // Stop session monitoring
            this.stopSessionMonitoring();
            
            // Use centralized auth clearing method
            if (window.AuthGuard && typeof AuthGuard.clearAuth === 'function') {
                AuthGuard.clearAuth();
            } else {
                // Fallback manual cleanup
                const keysToRemove = [
                    'sahatak_user', 'sahatak_user_data', 'sahatak_user_id',
                    'sahatak_user_type', 'sahatak_user_email', 'sahatak_user_name',
                    'sahatak_doctor_data', 'sahatak_preferences', 'sahatak_return_url'
                ];
                keysToRemove.forEach(key => localStorage.removeItem(key));
                sessionStorage.clear();
            }
            
            // Show user-friendly message
            window.SahatakLogger?.warn('Session expired - clearing data and redirecting to login');
            
            if (typeof showNotification === 'function') {
                showNotification('Your session has expired. Redirecting to login...', 'warning');
            } else {
                alert('Your session has expired. Please log in again.');
            }
            
            // Small delay to show the message
            setTimeout(() => {
                // Redirect to index.html using dynamic path resolution
                if (window.AuthGuard && typeof AuthGuard.redirectToLogin === 'function') {
                    AuthGuard.redirectToLogin();
                } else {
                    // Fallback - dynamic redirect to index.html
                    const rootPath = window.location.origin + window.location.pathname.substring(0, window.location.pathname.indexOf('/pages/') + 1);
                    window.location.href = rootPath + 'index.html';
                }
            }, 1500);
            
        } catch (error) {
            window.SahatakLogger?.error('Error handling session expiration', error);
            // Fallback - dynamic redirect to index page
            const rootPath = window.location.origin + '/';
            window.location.href = rootPath + 'index.html';
        }
    }
};

// Custom API Error class
class ApiError extends Error {
    constructor(message, statusCode, errorCode, field) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.field = field;
    }
}

// Form Handling Functions

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('login-submit');
    const spinner = document.getElementById('login-spinner');
    const icon = document.getElementById('login-icon');
    const errorAlert = document.getElementById('login-error-alert');
    
    // Clear previous errors
    clearFormErrors('loginForm');
    if (errorAlert) errorAlert.classList.add('d-none');
    
    // Show loading state with null checks
    
    if (spinner) spinner.classList.remove('d-none');
    if (icon) icon.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = true;
    
    // Get form data outside try block so it's accessible in catch
    const formData = {
        login_identifier: document.getElementById('login_identifier').value.trim(),
        password: document.getElementById('password').value
    };
    
    try {
        
        // Validate form data
        if (!formData.login_identifier || !formData.password) {
            throw new Error('Email/phone and password are required');
        }
        
        // Make API call to login endpoint
        const response = await ApiHelper.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        
        // Store user session data using centralized AuthStorage
        if (response.data && response.data.user) {
            // Use new centralized storage if available
            if (window.AuthStorage) {
                const authData = {
                    id: response.data.user.id,
                    user_type: response.data.user.user_type,
                    email: response.data.user.email,
                    full_name: response.data.user.full_name,
                    access_token: response.data.access_token,
                    profile: response.data.user.profile
                };
                AuthStorage.setAuthData(authData);
                console.log('✅ Auth data stored using AuthStorage');
            } else {
                // Fallback to legacy storage
                localStorage.setItem('sahatak_user_type', response.data.user.user_type);
                localStorage.setItem('sahatak_user_email', response.data.user.email);
                localStorage.setItem('sahatak_user_id', response.data.user.id);
                localStorage.setItem('sahatak_user_name', response.data.user.full_name);
                
                if (response.data.access_token) {
                    localStorage.setItem('sahatak_access_token', response.data.access_token);
                }
                console.log('⚠️ Auth data stored using legacy method');
            }
            
            // Debug: Check if session cookie was set
            const cookiesAfterLogin = document.cookie;
            console.log('🍪 Login successful, checking cookies:', cookiesAfterLogin);
            console.log('📝 User data stored:', response.data.user);
            console.log('🔄 Has session cookie:', cookiesAfterLogin.includes('session') || cookiesAfterLogin.includes('Session'));
            
            // Wait a moment for cookies to be fully set
            setTimeout(() => {
                const finalCookies = document.cookie;
                console.log('🍪 Final cookies check after delay:', finalCookies);
            }, 500);
        } else {
            console.error('Invalid response structure:', response);
        }
        
        // Session monitoring will be started by SessionManager after redirect
        
        // Small delay to ensure session is established before redirect
        setTimeout(() => {
            const userType = response.data.user.user_type;
            redirectToDashboard(userType);
        }, 500);
        
    } catch (error) {
        console.error('Login error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        
        let errorMessage = t.validation?.login_failed || 'Login failed. Please try again.';
        
        // Handle specific API errors
        if (error instanceof ApiError) {
            errorMessage = error.message;
            
            // Handle email verification requirement
            if (error.errorCode === 'USER_NOT_VERIFIED') {
                const emailVerificationMessage = lang === 'ar' 
                    ? 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول. تحقق من بريدك الإلكتروني للحصول على رابط التأكيد.'
                    : 'Please verify your email address before logging in. Check your email for verification link.';
                
                // Show verification required message with resend option
                showEmailVerificationRequired(errorAlert, emailVerificationMessage, formData.login_identifier);
                return;
            }
            
            // Show field-specific error if available
            if (error.field) {
                showFieldError(error.field, error.message);
                return;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showFormError(errorAlert, errorMessage);
    } finally {
        // Hide loading state with null checks
        if (spinner) spinner.classList.add('d-none');
        if (icon) icon.classList.remove('d-none');
        if (submitBtn) submitBtn.disabled = false;
    }
}


// Handle doctor registration form submission
// DISABLED - Using forms.js version instead  

// Validate registration form using ValidationManager
function validateRegistrationForm(data) {
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    const validation = ValidationManager.validateRegistrationForm(data);
    
    if (!validation.isValid) {
        // Map field names and show errors with translations
        Object.keys(validation.errors).forEach(field => {
            let fieldId = field;
            // Map email field name for this form
            if (field === 'email') fieldId = 'regEmail';
            if (field === 'password') fieldId = 'regPassword';
            
            const translatedMessage = t.validation?.[field + '_error'] || validation.errors[field];
            ValidationManager.showFieldError(fieldId, translatedMessage);
        });
    }
    
    return validation.isValid;
}

// Validate patient registration form using ValidationManager
function validatePatientRegistrationForm(data) {
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    // Map form data to ValidationManager expected format
    const validationData = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phone,
        password: data.password
    };
    
    const validation = ValidationManager.validatePatientRegistrationForm(validationData);
    
    // Additional custom validations not in ValidationManager
    let isValid = validation.isValid;
    const customErrors = {};
    
    // Validate age (legacy field)
    if (data.age && (data.age < 1 || data.age > 120)) {
        customErrors.age = 'Please enter a valid age between 1 and 120';
        isValid = false;
    }
    
    // Validate gender
    if (!data.gender) {
        customErrors.gender = 'Please select gender';
        isValid = false;
    }
    
    if (!validation.isValid) {
        // Show ValidationManager errors with translations
        Object.keys(validation.errors).forEach(field => {
            let fieldId = 'patient' + field.charAt(0).toUpperCase() + field.slice(1);
            if (field === 'phoneNumber') fieldId = 'patientPhone';
            if (field === 'dateOfBirth') fieldId = 'patientDateOfBirth';
            
            const translatedMessage = t.validation?.[field + '_error'] || validation.errors[field];
            ValidationManager.showFieldError(fieldId, translatedMessage);
        });
    }
    
    // Show custom validation errors
    Object.keys(customErrors).forEach(field => {
        const fieldId = 'patient' + field.charAt(0).toUpperCase() + field.slice(1);
        ValidationManager.showFieldError(fieldId, customErrors[field]);
    });
    
    return isValid;
}

// Validate doctor registration form using ValidationManager
function validateDoctorRegistrationForm(data) {
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    // Map form data to ValidationManager expected format
    const validationData = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phone,
        specialization: data.specialty,
        licenseNumber: data.license,
        password: data.password
    };
    
    const validation = ValidationManager.validateDoctorRegistrationForm(validationData);
    
    // Additional custom validations not in ValidationManager
    let isValid = validation.isValid;
    const customErrors = {};
    
    // Validate experience (custom field)
    if (data.experience < 0 || data.experience > 50) {
        customErrors.experience = 'Please enter valid years of experience (0-50)';
        isValid = false;
    }
    
    if (!validation.isValid) {
        // Show ValidationManager errors with translations
        Object.keys(validation.errors).forEach(field => {
            let fieldId = 'doctor' + field.charAt(0).toUpperCase() + field.slice(1);
            if (field === 'phoneNumber') fieldId = 'doctorPhone';
            if (field === 'specialization') fieldId = 'doctorSpecialty';
            if (field === 'licenseNumber') fieldId = 'doctorLicense';
            
            const translatedMessage = t.validation?.[field + '_error'] || validation.errors[field];
            ValidationManager.showFieldError(fieldId, translatedMessage);
        });
    }
    
    // Show custom validation errors
    Object.keys(customErrors).forEach(field => {
        const fieldId = 'doctor' + field.charAt(0).toUpperCase() + field.slice(1);
        ValidationManager.showFieldError(fieldId, customErrors[field]);
    });
    
    return isValid;
}

// Redirect to appropriate dashboard
function redirectToDashboard(userType) {
    
    // Check for return URL first
    const returnUrl = localStorage.getItem('sahatak_return_url');
    if (returnUrl) {
        localStorage.removeItem('sahatak_return_url');
        window.location.href = returnUrl;
        return;
    }
    
    // Default dashboard redirect
    const dashboardUrl = userType === 'doctor' 
        ? 'frontend/pages/dashboard/doctor.html' 
        : 'frontend/pages/dashboard/patient.html';
    
    window.location.href = dashboardUrl;
}

// Show field error
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(fieldId + '-error');
    
    field.classList.add('is-invalid');
    if (errorDiv) {
        errorDiv.textContent = message;
    }
}

// Show form error
function showFormError(alertElement, message) {
    alertElement.textContent = message;
    alertElement.classList.remove('d-none');
}

// Show form success
function showFormSuccess(alertElement, message) {
    alertElement.textContent = message;
    alertElement.classList.remove('d-none');
}

// Show email verification required message with resend option
function showEmailVerificationRequired(alertElement, message, email) {
    const lang = LanguageManager.getLanguage() || 'ar';
    
    // Create verification message with resend button
    const resendText = lang === 'ar' ? 'إعادة إرسال' : 'Resend';
    
    alertElement.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn btn-outline-primary btn-sm ms-2" onclick="resendEmailVerification('${email}')">
                ${resendText}
            </button>
        </div>
    `;
    alertElement.classList.remove('d-none');
}

// Resend email verification
async function resendEmailVerification(email) {
    const lang = LanguageManager.getLanguage() || 'ar';
    
    try {
        const response = await ApiHelper.makeRequest('/auth/resend-verification', {
            method: 'POST',
            body: JSON.stringify({ email: email })
        });

        if (response.success) {
            const successMessage = lang === 'ar' 
                ? 'تم إرسال رابط التأكيد بنجاح. يرجى فحص بريدك الإلكتروني'
                : 'Verification link sent successfully. Please check your email';
        } else {
            const errorMessage = lang === 'ar' 
                ? 'فشل في إرسال رابط التأكيد'
                : 'Failed to send verification link';
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        const errorMessage = lang === 'ar' 
            ? 'حدث خطأ أثناء إرسال رابط التأكيد'
            : 'Error occurred while sending verification link';
    }
}

// Clear form errors
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    const invalidFields = form.querySelectorAll('.is-invalid');
    const errorDivs = form.querySelectorAll('.invalid-feedback');
    
    invalidFields.forEach(field => field.classList.remove('is-invalid'));
    errorDivs.forEach(div => div.textContent = '');
}

// Logout functionality
async function logout() {
    
    // Get current language for messages
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    const logoutMessage = t?.validation?.logout_progress || (lang === 'ar' ? 'جاري تسجيل الخروج...' : 'Logging out...');
    const successMessage = t?.validation?.logout_success || (lang === 'ar' ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
    
    // Find and update logout button text to show loading
    const logoutButton = document.querySelector('[onclick="logout()"]');
    const logoutSpan = logoutButton?.querySelector('span');
    const originalText = logoutSpan?.textContent;
    
    if (logoutSpan) {
        logoutSpan.textContent = logoutMessage;
        logoutButton.disabled = true;
    }
    
    try {
        // Call backend logout endpoint to invalidate session
        const response = await ApiHelper.makeRequest('/auth/logout', {
            method: 'POST'
        });
        
    } catch (error) {
        console.error('Backend logout error:', error);
        // Continue with frontend cleanup even if backend fails
    }
    
    // Clear all session data from localStorage
    const keysToRemove = [
        'sahatak_user_type',
        'sahatak_user_email', 
        'sahatak_user_id',
        'sahatak_user_name'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Keep language preference (don't clear sahatak_language)
    
    // Update button to show success
    if (logoutSpan) {
        logoutSpan.textContent = successMessage;
    }
    
    
    // Redirect to login page - determine correct path based on current location
    setTimeout(() => {
        const currentPath = window.location.pathname;
        let redirectPath;
        
        if (currentPath.includes('/pages/dashboard/')) {
            // From dashboard pages: /frontend/pages/dashboard/ -> need to go up 3 levels
            redirectPath = '../../../index.html';
        } else if (currentPath.includes('/pages/')) {
            // From other pages: /frontend/pages/ -> need to go up 2 levels  
            redirectPath = '../../index.html';
        } else if (currentPath.includes('/frontend/')) {
            // From frontend root: /frontend/ -> need to go up 1 level
            redirectPath = '../index.html';
        } else {
            // From root or other locations
            redirectPath = 'index.html';
        }
        
        window.location.href = redirectPath;
    }, 800);
}


// Get current user info
async function getCurrentUser() {
    try {
        const response = await ApiHelper.makeRequest('/auth/me', {
            method: 'GET'
        });
        
        if (response.success) {
            // Store user info in localStorage
            localStorage.setItem('sahatak_user_id', response.data.id);
            localStorage.setItem('sahatak_user_name', response.data.full_name);
            localStorage.setItem('sahatak_user_email', response.data.email);
            localStorage.setItem('sahatak_user_type', response.data.user_type);
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching current user:', error);
        return null;
    }
}

// Change password
async function changePassword(currentPassword, newPassword) {
    try {
        const response = await ApiHelper.makeRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        if (response.success) {
            showNotification('success', 'Password changed successfully');
        } else {
            showNotification('error', response.message || 'Failed to change password');
        }
        return response;
    } catch (error) {
        console.error('Error changing password:', error);
        showNotification('error', 'Failed to change password');
        return null;
    }
}

// Update language preference
async function updateLanguagePreference(language) {
    try {
        const response = await ApiHelper.makeRequest('/auth/update-language', {
            method: 'POST',
            body: JSON.stringify({ language })
        });
        
        if (response.success) {
            localStorage.setItem('sahatak_language', language);
            // Reload page to apply language changes
            window.location.reload();
        }
        return response;
    } catch (error) {
        console.error('Error updating language:', error);
        return null;
    }
}

// User Settings API Functions
const UserSettingsAPI = {
    // Doctor Settings
    async getDoctorParticipation() {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/doctor/participation');
            return response;
        } catch (error) {
            console.error('Error fetching doctor participation:', error);
            return { success: false, error: error.message };
        }
    },

    async updateDoctorParticipation(participationData) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/doctor/participation', {
                method: 'PUT',
                body: JSON.stringify(participationData)
            });
            return response;
        } catch (error) {
            console.error('Error updating doctor participation:', error);
            return { success: false, error: error.message };
        }
    },

    async switchToVolunteer() {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/doctor/switch-to-volunteer', {
                method: 'POST'
            });
            return response;
        } catch (error) {
            console.error('Error switching to volunteer:', error);
            return { success: false, error: error.message };
        }
    },

    async switchToPaid(fee) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/doctor/switch-to-paid', {
                method: 'POST',
                body: JSON.stringify({ consultation_fee: fee })
            });
            return response;
        } catch (error) {
            console.error('Error switching to paid:', error);
            return { success: false, error: error.message };
        }
    },

    async updateDoctorNotificationSettings(settings) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/doctor/notification-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
            return response;
        } catch (error) {
            console.error('Error updating doctor notification settings:', error);
            return { success: false, error: error.message };
        }
    },

    // Patient Settings
    async getPatientPreferences() {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/patient/preferences');
            return response;
        } catch (error) {
            console.error('Error fetching patient preferences:', error);
            return { success: false, error: error.message };
        }
    },

    async updatePatientPreferences(preferences) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/patient/preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });
            return response;
        } catch (error) {
            console.error('Error updating patient preferences:', error);
            return { success: false, error: error.message };
        }
    },

    // General Settings
    async getUserProfileSettings() {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/profile');
            return response;
        } catch (error) {
            console.error('Error fetching profile settings:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserLanguage(language) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/language', {
                method: 'PUT',
                body: JSON.stringify({ language })
            });
            return response;
        } catch (error) {
            console.error('Error updating language:', error);
            return { success: false, error: error.message };
        }
    },

    async changeUserPassword(currentPassword, newPassword) {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/password', {
                method: 'PUT',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            return response;
        } catch (error) {
            console.error('Error changing password:', error);
            return { success: false, error: error.message };
        }
    },

    async getSettingsSummary() {
        try {
            const response = await ApiHelper.makeRequest('/user-settings/summary');
            return response;
        } catch (error) {
            console.error('Error fetching settings summary:', error);
            return { success: false, error: error.message };
        }
    }
};

// Notifications API Functions
const NotificationsAPI = {
    async getNotificationPreferences() {
        try {
            const response = await ApiHelper.makeRequest('/notifications/preferences');
            return response;
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
            return { success: false, error: error.message };
        }
    },

    async updateNotificationPreferences(preferences) {
        try {
            const response = await ApiHelper.makeRequest('/notifications/preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });
            return response;
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return { success: false, error: error.message };
        }
    },

    async testRegistrationNotification() {
        try {
            const response = await ApiHelper.makeRequest('/notifications/test/registration', {
                method: 'POST'
            });
            return response;
        } catch (error) {
            console.error('Error testing registration notification:', error);
            return { success: false, error: error.message };
        }
    },

    async testAppointmentNotification() {
        try {
            const response = await ApiHelper.makeRequest('/notifications/test/appointment', {
                method: 'POST'
            });
            return response;
        } catch (error) {
            console.error('Error testing appointment notification:', error);
            return { success: false, error: error.message };
        }
    },

    async getDefaultNotificationSettings() {
        try {
            const response = await ApiHelper.makeRequest('/notifications/settings/defaults');
            return response;
        } catch (error) {
            console.error('Error fetching default notification settings:', error);
            return { success: false, error: error.message };
        }
    }
};

// Set up form event listeners when DOM is ready
// Export functions to window for global access
window.handleLogin = handleLogin;

document.addEventListener('DOMContentLoaded', function() {
    // Skip form attachment - handled by index.html to avoid conflicts
    console.log('Main.js DOMContentLoaded - form attachment handled by index.html');
    
    // Auto-update doctor verification status on all pages
    setTimeout(() => {
        const userType = localStorage.getItem('sahatak_user_type');
        if (userType === 'doctor' && document.getElementById('verification-status')) {
            console.log('🔸 Auto-updating doctor verification status on page load');
            const doctorData = JSON.parse(localStorage.getItem('sahatak_doctor_data') || '{}');
            if (typeof window.updateVerificationStatus === 'function') {
                window.updateVerificationStatus(doctorData);
            } else {
                // Fallback if global function not loaded
                console.log('🔸 Using fallback verification updater');
                updateDoctorVerificationDisplay(doctorData);
            }
        }
    }, 500); // Small delay to ensure page elements are loaded
    
    // Event listeners disabled - using forms.js versions instead
    // const patientForm = document.getElementById('patientRegisterForm');
    // if (patientForm) {
    //     patientForm.addEventListener('submit', handlePatientRegister);
    //     console.log('Patient registration form event listener attached');
    // }
    
    // const doctorForm = document.getElementById('doctorRegisterForm');
    // if (doctorForm) {
    //     doctorForm.addEventListener('submit', handleDoctorRegister);
    //     console.log('Doctor registration form event listener attached');
    // }
});

// Fallback verification display updater for doctor pages
function updateDoctorVerificationDisplay(user) {
    const statusElement = document.getElementById('verification-status');
    if (!statusElement) return;
    
    const isVerified = user && (user.is_verified === true || user.verification_status === 'verified');
    
    if (isVerified) {
        statusElement.textContent = 'Verified';
        statusElement.className = 'badge bg-success';
    } else {
        statusElement.textContent = 'Unverified';
        statusElement.className = 'badge bg-warning text-dark';
    }
    
    console.log('🔸 Verification status updated:', isVerified ? 'Verified' : 'Unverified');
}