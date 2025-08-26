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
        // Update placeholders for current language
        const currentLang = LanguageManager.getLanguage() || 'ar';
        this.updateFormPlaceholders(currentLang);
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
        // Update placeholders for current language
        const currentLang = LanguageManager.getLanguage() || 'ar';
        this.updateFormPlaceholders(currentLang);
    },

    // Show doctor registration form
    showDoctorRegister() {
        this.hideAllSections();
        document.getElementById('doctor-register-form').classList.remove('d-none');
        document.getElementById('doctor-register-form').style.display = 'flex';
        // Update placeholders for current language
        const currentLang = LanguageManager.getLanguage() || 'ar';
        this.updateFormPlaceholders(currentLang);
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

        // Update form labels
        this.updateFormLabels(lang);
        
        // Update form placeholders
        this.updateFormPlaceholders(lang);
        
        // Update country dropdown options
        this.updateCountryDropdowns(lang);
    },

    // Update form labels based on current language
    updateFormLabels(lang) {
        // Patient confirm password label
        const patientConfirmPasswordLabel = document.getElementById('patient-confirm-password-label');
        if (patientConfirmPasswordLabel) {
            patientConfirmPasswordLabel.innerHTML = LanguageManager.getTranslation(lang, 'patient_register.confirm_password') + ' <span class="text-danger">*</span>';
        }

        // Doctor confirm password label
        const doctorConfirmPasswordLabel = document.getElementById('doctor-confirm-password-label');
        if (doctorConfirmPasswordLabel) {
            doctorConfirmPasswordLabel.innerHTML = LanguageManager.getTranslation(lang, 'doctor_register.confirm_password') + ' <span class="text-danger">*</span>';
        }
    },

    // Update form placeholders based on current language
    updateFormPlaceholders(lang) {
        // Login form placeholders
        const loginIdentifier = document.getElementById('login_identifier');
        const loginPassword = document.getElementById('password');
        if (loginIdentifier) loginIdentifier.placeholder = LanguageManager.getTranslation(lang, 'login.login_identifier_placeholder');
        if (loginPassword) loginPassword.placeholder = LanguageManager.getTranslation(lang, 'login.password_placeholder');

        // Patient registration form placeholders
        const patientFullName = document.getElementById('patientFullName');
        const patientPhone = document.getElementById('patientPhone');
        const patientEmail = document.getElementById('patientEmail');
        const patientAge = document.getElementById('patientAge');
        const patientPassword = document.getElementById('patientPassword');
        const patientConfirmPassword = document.getElementById('patientConfirmPassword');
        
        if (patientFullName) patientFullName.placeholder = LanguageManager.getTranslation(lang, 'patient_register.full_name_placeholder');
        if (patientPhone) patientPhone.placeholder = LanguageManager.getTranslation(lang, 'patient_register.phone_placeholder');
        if (patientEmail) patientEmail.placeholder = LanguageManager.getTranslation(lang, 'patient_register.email_placeholder');
        if (patientAge) patientAge.placeholder = LanguageManager.getTranslation(lang, 'patient_register.age_placeholder');
        if (patientPassword) patientPassword.placeholder = LanguageManager.getTranslation(lang, 'patient_register.password_placeholder');
        if (patientConfirmPassword) patientConfirmPassword.placeholder = LanguageManager.getTranslation(lang, 'patient_register.confirm_password_placeholder');

        // Doctor registration form placeholders
        const doctorFullName = document.getElementById('doctorFullName');
        const doctorPhone = document.getElementById('doctorPhone');
        const doctorEmail = document.getElementById('doctorEmail');
        const doctorLicense = document.getElementById('doctorLicense');
        const doctorExperience = document.getElementById('doctorExperience');
        const doctorPassword = document.getElementById('doctorPassword');
        const doctorConfirmPassword = document.getElementById('doctorConfirmPassword');
        
        if (doctorFullName) doctorFullName.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.full_name_placeholder');
        if (doctorPhone) doctorPhone.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.phone_placeholder');
        if (doctorEmail) doctorEmail.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.email_placeholder');
        if (doctorLicense) doctorLicense.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.license_placeholder');
        if (doctorExperience) doctorExperience.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.experience_placeholder');
        if (doctorPassword) doctorPassword.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.password_placeholder');
        if (doctorConfirmPassword) doctorConfirmPassword.placeholder = LanguageManager.getTranslation(lang, 'doctor_register.confirm_password_placeholder');
    },

    // Update country dropdown options and placeholders
    updateCountryDropdowns(lang) {
        // Update doctor phone country placeholder
        const doctorPhoneCountryPlaceholder = document.getElementById('doctor-phone-country-placeholder');
        if (doctorPhoneCountryPlaceholder) {
            doctorPhoneCountryPlaceholder.textContent = LanguageManager.getTranslation(lang, 'doctor_register.phone_country_placeholder');
        }

        // Update doctor license country placeholder
        const doctorLicenseCountryPlaceholder = document.getElementById('doctor-license-country-placeholder');
        if (doctorLicenseCountryPlaceholder) {
            doctorLicenseCountryPlaceholder.textContent = LanguageManager.getTranslation(lang, 'doctor_register.license_country_placeholder');
        }

        // Update country option text (using country codes for cross-browser compatibility)
        const countries = ['SD', 'EG', 'SA', 'AE', 'IE', 'US', 'GB'];
        const flags = {'SD': '[SD]', 'EG': '[EG]', 'SA': '[SA]', 'AE': '[AE]', 'IE': '[IE]', 'US': '[US]', 'GB': '[GB]'};
        const codes = {'SD': '+249', 'EG': '+20', 'SA': '+966', 'AE': '+971', 'IE': '+353', 'US': '+1', 'GB': '+44'};

        // Update doctor phone country options
        const doctorPhoneCountrySelect = document.getElementById('doctorPhoneCountry');
        if (doctorPhoneCountrySelect) {
            countries.forEach(countryCode => {
                const option = doctorPhoneCountrySelect.querySelector(`option[value="${countryCode}"]`);
                if (option) {
                    const countryName = LanguageManager.getTranslation(lang, `countries.${countryCode}`);
                    option.textContent = `${flags[countryCode]} ${countryName} (${codes[countryCode]})`;
                }
            });
        }

        // Update doctor license country options
        const doctorLicenseCountrySelect = document.getElementById('doctorLicenseCountry');
        if (doctorLicenseCountrySelect) {
            countries.forEach(countryCode => {
                const option = doctorLicenseCountrySelect.querySelector(`option[value="${countryCode}"]`);
                if (option) {
                    const countryName = LanguageManager.getTranslation(lang, `countries.${countryCode}`);
                    option.textContent = `${flags[countryCode]} ${countryName}`;
                }
            });
        }
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