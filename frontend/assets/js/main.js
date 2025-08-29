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
    
    // Make API call with language preference and proper credentials
    async makeRequest(endpoint, options = {}) {
        const language = LanguageManager.getLanguage() || 'ar';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
                ...options.headers
            },
            credentials: 'include' // Important for session-based authentication
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            const data = await response.json();
            
            // Handle standardized API response format
            if (data.success === false) {
                throw new ApiError(data.message, data.status_code, data.error_code, data.field);
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
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
        
        
        // Store user session data
        if (response.data && response.data.user) {
            localStorage.setItem('sahatak_user_type', response.data.user.user_type);
            localStorage.setItem('sahatak_user_email', response.data.user.email);
            localStorage.setItem('sahatak_user_id', response.data.user.id);
            localStorage.setItem('sahatak_user_name', response.data.user.full_name);
        } else {
            console.error('Invalid response structure:', response);
        }
        
        // Redirect to dashboard
        const userType = response.data.user.user_type;
        redirectToDashboard(userType);
        
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

// Handle patient registration form submission
// DISABLED - Using forms.js version instead
async function handlePatientRegister_OLD(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('patient-register-submit');
    const spinner = document.getElementById('patient-register-spinner');
    const icon = document.getElementById('patient-register-icon');
    const errorAlert = document.getElementById('patient-register-error-alert');
    const successAlert = document.getElementById('patient-register-success-alert');
    
    // Clear previous errors
    clearFormErrors('patientRegisterForm');
    errorAlert.classList.add('d-none');
    successAlert.classList.add('d-none');
    
    // Show loading state
    spinner.classList.remove('d-none');
    icon.classList.add('d-none');
    submitBtn.disabled = true;
    
    try {
        const email = document.getElementById('patientEmail').value.trim();
        // Get language with multiple fallback methods - ensure never null/undefined
        const storedLanguage = localStorage.getItem('sahatak_language');
        const documentLanguage = document.documentElement.lang;
        const directionLanguage = document.documentElement.dir === 'rtl' ? 'ar' : 'en';
        
        // Ensure we always have a valid language (never null/undefined)
        let userLanguage = 'ar'; // Start with safe default
        
        if (storedLanguage === 'ar' || storedLanguage === 'en') {
            userLanguage = storedLanguage;
        } else if (documentLanguage === 'ar' || documentLanguage === 'en') {
            userLanguage = documentLanguage;
        } else if (directionLanguage === 'ar' || directionLanguage === 'en') {
            userLanguage = directionLanguage;
        }
        
        // Double-check we have a valid value before sending
        if (userLanguage !== 'ar' && userLanguage !== 'en') {
            userLanguage = 'ar';
        }
        
        
        const formData = {
            full_name: document.getElementById('patientFullName').value.trim(),
            phone: document.getElementById('patientPhone').value.trim(),
            age: parseInt(document.getElementById('patientAge').value),
            gender: document.getElementById('patientGender').value,
            password: document.getElementById('patientPassword').value,
            user_type: 'patient',
            language_preference: userLanguage || 'en'  // Ensure never undefined
        };
        
        // Ensure language_preference is always present and valid
        if (!formData.language_preference || (formData.language_preference !== 'ar' && formData.language_preference !== 'en')) {
            formData.language_preference = 'en'; // Default to English for testing
        }
        
        // Add email only if provided
        if (email) {
            formData.email = email;
        }
        
        // Basic client-side validation
        if (!formData.full_name || !formData.phone || !formData.age || !formData.gender || !formData.password) {
            throw new Error('All required fields must be filled');
        }
        
        
        // Make API call to registration endpoint
        const response = await ApiHelper.makeRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        
        // Clear form
        document.getElementById('patientRegisterForm').reset();
        
        // Check if email verification is required based on backend response
        const lang = LanguageManager.getLanguage() || 'ar';
        const requiresVerification = response.data.requires_email_verification;
        
        
        if (requiresVerification) {
            // Email verification required - show verification message
            const emailVerificationMessage = lang === 'ar' 
                ? 'تم إنشاء حسابك بنجاح! يرجى فحص بريدك الإلكتروني لتأكيد حسابك قبل تسجيل الدخول.'
                : 'Account created successfully! Please check your email to verify your account before logging in.';
            showFormSuccess(successAlert, emailVerificationMessage);
            
            // Don't redirect - user needs to verify email first
        } else {
            // No email verification needed - auto-login
            const successMessage = lang === 'ar' 
                ? 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.'
                : 'Account created successfully! You can now login.';
            showFormSuccess(successAlert, successMessage);
            
            // Redirect to login after success
            setTimeout(() => {
                showLogin();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Patient registration error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        
        let errorMessage = t.validation?.registration_failed || 'Registration failed. Please try again.';
        
        // Handle specific API errors
        if (error instanceof ApiError) {
            errorMessage = error.message;
            
            // Show field-specific error if available
            if (error.field) {
                // Map backend field names to frontend field names
                const fieldMap = {
                    'full_name': 'patientFullName',
                    'email': 'patientEmail',
                    'phone': 'patientPhone',
                    'age': 'patientAge',
                    'gender': 'patientGender',
                    'password': 'patientPassword'
                };
                
                const frontendField = fieldMap[error.field] || error.field;
                showFieldError(frontendField, error.message);
                return;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showFormError(errorAlert, errorMessage);
    } finally {
        // Hide loading state
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        submitBtn.disabled = false;
    }
}

// Handle doctor registration form submission
// DISABLED - Using forms.js version instead  
async function handleDoctorRegister_OLD(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('doctor-register-submit');
    const spinner = document.getElementById('doctor-register-spinner');
    const icon = document.getElementById('doctor-register-icon');
    const errorAlert = document.getElementById('doctor-register-error-alert');
    const successAlert = document.getElementById('doctor-register-success-alert');
    
    // Clear previous errors
    clearFormErrors('doctorRegisterForm');
    errorAlert.classList.add('d-none');
    successAlert.classList.add('d-none');
    
    // Show loading state
    spinner.classList.remove('d-none');
    icon.classList.add('d-none');
    submitBtn.disabled = true;
    
    try {
        const email = document.getElementById('doctorEmail').value.trim();
        // Get language with multiple fallback methods - ensure never null/undefined
        const storedLanguage = localStorage.getItem('sahatak_language');
        const documentLanguage = document.documentElement.lang;
        const directionLanguage = document.documentElement.dir === 'rtl' ? 'ar' : 'en';
        
        // Ensure we always have a valid language (never null/undefined)
        let userLanguage = 'ar'; // Start with safe default
        
        if (storedLanguage === 'ar' || storedLanguage === 'en') {
            userLanguage = storedLanguage;
        } else if (documentLanguage === 'ar' || documentLanguage === 'en') {
            userLanguage = documentLanguage;
        } else if (directionLanguage === 'ar' || directionLanguage === 'en') {
            userLanguage = directionLanguage;
        }
        
        // Double-check we have a valid value before sending
        if (userLanguage !== 'ar' && userLanguage !== 'en') {
            userLanguage = 'ar';
        }
        
        
        const formData = {
            full_name: document.getElementById('doctorFullName').value.trim(),
            phone: document.getElementById('doctorPhone').value.trim(),
            license_number: document.getElementById('doctorLicense').value.trim(),
            specialty: document.getElementById('doctorSpecialty').value,
            years_of_experience: parseInt(document.getElementById('doctorExperience').value),
            password: document.getElementById('doctorPassword').value,
            user_type: 'doctor',
            language_preference: userLanguage || 'en'  // Ensure never undefined
        };
        
        // Ensure language_preference is always present and valid
        if (!formData.language_preference || (formData.language_preference !== 'ar' && formData.language_preference !== 'en')) {
            formData.language_preference = 'en'; // Default to English for testing
        }
        
        // Add email only if provided
        if (email) {
            formData.email = email;
        }
        
        // Basic client-side validation
        if (!formData.full_name || !formData.phone || !formData.license_number || !formData.specialty || 
            !formData.years_of_experience || !formData.password) {
            throw new Error('All required fields must be filled');
        }
        
        
        // Make API call to registration endpoint
        const response = await ApiHelper.makeRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });
        
        
        // Clear form
        document.getElementById('doctorRegisterForm').reset();
        
        // Check if email verification is required based on backend response
        const lang = LanguageManager.getLanguage() || 'ar';
        const requiresVerification = response.data.requires_email_verification;
        
        
        if (requiresVerification) {
            // Email verification required - show verification message
            const emailVerificationMessage = lang === 'ar' 
                ? 'تم إنشاء حسابك بنجاح! يرجى فحص بريدك الإلكتروني لتأكيد حسابك قبل تسجيل الدخول.'
                : 'Account created successfully! Please check your email to verify your account before logging in.';
            showFormSuccess(successAlert, emailVerificationMessage);
            
            // Don't redirect - user needs to verify email first
        } else {
            // No email verification needed - auto-login
            const successMessage = lang === 'ar' 
                ? 'تم إنشاء حسابك بنجاح! يمكنك الآن تسجيل الدخول.'
                : 'Account created successfully! You can now login.';
            showFormSuccess(successAlert, successMessage);
            
            // Redirect to login after success
            setTimeout(() => {
                showLogin();
            }, 2000);
        }
        
    } catch (error) {
        console.error('Doctor registration error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        
        let errorMessage = t.validation?.registration_failed || 'Registration failed. Please try again.';
        
        // Handle specific API errors
        if (error instanceof ApiError) {
            errorMessage = error.message;
            
            // Show field-specific error if available
            if (error.field) {
                // Map backend field names to frontend field names
                const fieldMap = {
                    'full_name': 'doctorFullName',
                    'email': 'doctorEmail',
                    'phone': 'doctorPhone',
                    'license_number': 'doctorLicense',
                    'specialty': 'doctorSpecialty',
                    'years_of_experience': 'doctorExperience',
                    'password': 'doctorPassword'
                };
                
                const frontendField = fieldMap[error.field] || error.field;
                showFieldError(frontendField, error.message);
                return;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showFormError(errorAlert, errorMessage);
    } finally {
        // Hide loading state
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        submitBtn.disabled = false;
    }
}

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

// Set up form event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Only attach form event listeners if the forms exist (not on dashboard pages)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
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