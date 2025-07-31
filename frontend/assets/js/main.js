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
            
            console.log('Loading translations from:', basePath);
            
            const [arResponse, enResponse] = await Promise.all([
                fetch(`${basePath}ar.json`),
                fetch(`${basePath}en.json`)
            ]);
            
            if (!arResponse.ok || !enResponse.ok) {
                throw new Error(`Failed to fetch translations. AR: ${arResponse.status}, EN: ${enResponse.status}`);
            }
            
            this.translations.ar = await arResponse.json();
            this.translations.en = await enResponse.json();
            
            console.log('Translations loaded successfully:', this.translations);
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to hardcoded translations if JSON fails
            this.loadFallbackTranslations();
        }
    },
    
    // Fallback translations in case JSON loading fails
    loadFallbackTranslations() {
        console.log('Using fallback translations');
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
    console.log('Available translations:', LanguageManager.translations);
    
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
        
        console.log(`Language selection completed for: ${lang}`);
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
    console.log('Showing auth selection screen');
    
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
    console.log('Showing login form');
    
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
    console.log('Showing user type selection');
    
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
    console.log(`User selected type: ${userType}`);
    
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
    console.log(`Updating content for language: ${lang}`);
    
    // Use the new LanguageManager to get translations
    const t = LanguageManager.translations[lang];
    if (!t) {
        console.error(`Translations not found for language: ${lang}`);
        console.log('Available translations:', LanguageManager.translations);
        return;
    }
    
    console.log(`Using translations for ${lang}:`, t);
    
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
    updateElementText('patient-firstName-label', t.patient_register?.first_name);
    updateElementText('patient-lastName-label', t.patient_register?.last_name);
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
    updateElementText('doctor-firstName-label', t.doctor_register?.first_name);
    updateElementText('doctor-lastName-label', t.doctor_register?.last_name);
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
        console.log(`Updated ${elementId} with: ${text}`);
    } else if (!element) {
        console.warn(`Element not found: ${elementId}`);
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
        if (!document.getElementById('language-selection').classList.contains('d-none')) {
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
    console.log('Sahatak application initializing...');
    
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
    
    // Ensure we have translations loaded
    if (!LanguageManager.translations.ar || !LanguageManager.translations.en) {
        console.warn('Translations missing, forcing fallback load');
        LanguageManager.loadFallbackTranslations();
    }
    
    console.log('Final translations state:', LanguageManager.translations);
    
    // Initialize keyboard navigation
    initializeKeyboardNavigation();
    
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
        // Ensure language selection is visible
        document.getElementById('language-selection').classList.remove('d-none');
        // Focus first language button for keyboard accessibility
        setTimeout(() => {
            const firstLangButton = document.querySelector('#language-selection button[data-lang]');
            if (firstLangButton) {
                firstLangButton.focus();
            }
        }, 100);
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
    errorAlert.classList.add('d-none');
    
    // Show loading state
    spinner.classList.remove('d-none');
    icon.classList.add('d-none');
    submitBtn.disabled = true;
    
    try {
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };
        
        // Simulate API call (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, simulate successful login and redirect
        const userType = formData.email.includes('doctor') ? 'doctor' : 'patient';
        
        // Store user session (in production, use proper authentication)
        localStorage.setItem('sahatak_user_type', userType);
        localStorage.setItem('sahatak_user_email', formData.email);
        
        // Redirect to dashboard
        redirectToDashboard(userType);
        
    } catch (error) {
        console.error('Login error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        showFormError(errorAlert, t.validation?.login_failed || 'Login failed. Please try again.');
    } finally {
        // Hide loading state
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        submitBtn.disabled = false;
    }
}

// Handle patient registration form submission
async function handlePatientRegister(event) {
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
        const formData = {
            firstName: document.getElementById('patientFirstName').value,
            lastName: document.getElementById('patientLastName').value,
            email: document.getElementById('patientEmail').value,
            phone: document.getElementById('patientPhone').value,
            age: document.getElementById('patientAge').value,
            gender: document.getElementById('patientGender').value,
            password: document.getElementById('patientPassword').value,
            userType: 'patient'
        };
        
        // Validate form data
        if (!validatePatientRegistrationForm(formData)) {
            return;
        }
        
        // Simulate API call (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show success message
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        showFormSuccess(successAlert, t.validation?.registration_success || 'Account created successfully! You can now login.');
        
        // Clear form
        document.getElementById('patientRegisterForm').reset();
        
        // Redirect to login after success
        setTimeout(() => {
            showLogin();
        }, 2000);
        
    } catch (error) {
        console.error('Patient registration error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        showFormError(errorAlert, t.validation?.registration_failed || 'Registration failed. Please try again.');
    } finally {
        // Hide loading state
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        submitBtn.disabled = false;
    }
}

// Handle doctor registration form submission
async function handleDoctorRegister(event) {
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
        const formData = {
            firstName: document.getElementById('doctorFirstName').value,
            lastName: document.getElementById('doctorLastName').value,
            email: document.getElementById('doctorEmail').value,
            phone: document.getElementById('doctorPhone').value,
            license: document.getElementById('doctorLicense').value,
            specialty: document.getElementById('doctorSpecialty').value,
            experience: document.getElementById('doctorExperience').value,
            password: document.getElementById('doctorPassword').value,
            userType: 'doctor'
        };
        
        // Validate form data
        if (!validateDoctorRegistrationForm(formData)) {
            return;
        }
        
        // Simulate API call (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Show success message
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        showFormSuccess(successAlert, t.validation?.registration_success || 'Account created successfully! You can now login.');
        
        // Clear form
        document.getElementById('doctorRegisterForm').reset();
        
        // Redirect to login after success
        setTimeout(() => {
            showLogin();
        }, 2000);
        
    } catch (error) {
        console.error('Doctor registration error:', error);
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        showFormError(errorAlert, t.validation?.registration_failed || 'Registration failed. Please try again.');
    } finally {
        // Hide loading state
        spinner.classList.add('d-none');
        icon.classList.remove('d-none');
        submitBtn.disabled = false;
    }
}

// Validate registration form
function validateRegistrationForm(data) {
    let isValid = true;
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    // Validate first name
    if (data.firstName.length < 2) {
        showFieldError('firstName', t.validation?.first_name_min || 'First name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate last name
    if (data.lastName.length < 2) {
        showFieldError('lastName', t.validation?.last_name_min || 'Last name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showFieldError('regEmail', t.validation?.email_invalid || 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate password
    if (data.password.length < 6) {
        showFieldError('regPassword', t.validation?.password_min || 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    // Validate user type
    if (!data.userType) {
        showFieldError('userType', t.validation?.user_type_required || 'Please select an account type');
        isValid = false;
    }
    
    return isValid;
}

// Validate patient registration form
function validatePatientRegistrationForm(data) {
    let isValid = true;
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    // Validate first name
    if (data.firstName.length < 2) {
        showFieldError('patientFirstName', t.validation?.first_name_min || 'First name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate last name
    if (data.lastName.length < 2) {
        showFieldError('patientLastName', t.validation?.last_name_min || 'Last name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showFieldError('patientEmail', t.validation?.email_invalid || 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone
    if (data.phone.length < 8) {
        showFieldError('patientPhone', 'Phone number must be at least 8 digits');
        isValid = false;
    }
    
    // Validate age
    if (data.age < 1 || data.age > 120) {
        showFieldError('patientAge', 'Please enter a valid age between 1 and 120');
        isValid = false;
    }
    
    // Validate gender
    if (!data.gender) {
        showFieldError('patientGender', 'Please select gender');
        isValid = false;
    }
    
    // Validate password
    if (data.password.length < 6) {
        showFieldError('patientPassword', t.validation?.password_min || 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    return isValid;
}

// Validate doctor registration form
function validateDoctorRegistrationForm(data) {
    let isValid = true;
    const lang = LanguageManager.getLanguage() || 'ar';
    const t = LanguageManager.translations[lang];
    
    // Validate first name
    if (data.firstName.length < 2) {
        showFieldError('doctorFirstName', t.validation?.first_name_min || 'First name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate last name
    if (data.lastName.length < 2) {
        showFieldError('doctorLastName', t.validation?.last_name_min || 'Last name must be at least 2 characters long');
        isValid = false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showFieldError('doctorEmail', t.validation?.email_invalid || 'Please enter a valid email address');
        isValid = false;
    }
    
    // Validate phone
    if (data.phone.length < 8) {
        showFieldError('doctorPhone', 'Phone number must be at least 8 digits');
        isValid = false;
    }
    
    // Validate license
    if (data.license.length < 3) {
        showFieldError('doctorLicense', 'Medical license number is required');
        isValid = false;
    }
    
    // Validate specialty
    if (!data.specialty) {
        showFieldError('doctorSpecialty', 'Please select a specialty');
        isValid = false;
    }
    
    // Validate experience
    if (data.experience < 0 || data.experience > 50) {
        showFieldError('doctorExperience', 'Please enter valid years of experience (0-50)');
        isValid = false;
    }
    
    // Validate password
    if (data.password.length < 6) {
        showFieldError('doctorPassword', t.validation?.password_min || 'Password must be at least 6 characters long');
        isValid = false;
    }
    
    return isValid;
}

// Redirect to appropriate dashboard
function redirectToDashboard(userType) {
    const dashboardUrl = userType === 'doctor' 
        ? 'frontend/pages/dashboard/doctor.html' 
        : 'frontend/pages/dashboard/patient.html';
    
    console.log(`Redirecting to ${userType} dashboard...`);
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

// Clear form errors
function clearFormErrors(formId) {
    const form = document.getElementById(formId);
    const invalidFields = form.querySelectorAll('.is-invalid');
    const errorDivs = form.querySelectorAll('.invalid-feedback');
    
    invalidFields.forEach(field => field.classList.remove('is-invalid'));
    errorDivs.forEach(div => div.textContent = '');
}

// Console welcome message
console.log('%c🏥 Sahatak Telemedicine Platform', 'color: #2563eb; font-size: 16px; font-weight: bold;');
console.log('%cBootstrap 5 loaded successfully ✓', 'color: #059669;');
console.log('%cArabic font support enabled ✓', 'color: #059669;');
console.log('%cLanguage management ready ✓', 'color: #059669;');