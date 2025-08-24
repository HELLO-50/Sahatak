# Translation System in Sahatak Telemedicine Platform

## Overview

This document explains the comprehensive translation system in the Sahatak telemedicine platform. The system supports full bilingual functionality with Arabic (العربية) and English languages, providing seamless language switching and localized user experiences.

## What is the Translation System?

The translation system is a comprehensive internationalization (i18n) solution that allows users to interact with the platform in their preferred language. Think of it as a universal translator that converts all interface text, messages, and content into the user's chosen language while maintaining the same functionality.

## Translation System Architecture

### System Components

#### 1. **Frontend Translation Files**
- **Arabic translations**: `frontend/locales/ar.json`
- **English translations**: `frontend/locales/en.json`
- **JavaScript manager**: `LanguageManager` object (in `frontend/assets/js/main.js`)
- **UI update functions**: Dynamic content translation

#### 2. **Backend Language Support**
- **Database storage**: User language preferences
- **API responses**: Localized error messages
- **Email templates**: Language-specific emails

#### 3. **User Interface Components**
- **Language selector**: Choose preferred language
- **Dynamic text updates**: Real-time translation switching
- **RTL/LTR support**: Right-to-left for Arabic, left-to-right for English

## Translation File Structure

### Arabic Translation File (`frontend/locales/ar.json`)
```json
{
  "app_name": "صحتك",
  "language_selection": "اختر لغتك ",
  "welcome": {
    "title": "مرحب بيك في منصة صحتك للطب عن بُعد",
    "description": "منصة آمنة وسهلة الاستخدام للتواصل مع الأطباء"
  },
  "auth": {
    "prompt": "ابدأ رحلتك العلاجيه",
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب جديد",
    "language_switch": "تغيير اللغة",
    "current_language": "العربية",
    "back": "العودة"
  },
  "login": {
    "title": "تسجيل الدخول",
    "subtitle": "أدخل كل بياناتك للوصول إلى حسابك",
    "login_identifier": "البريد الإلكتروني أو رقم الهاتف",
    "password": "كلمة المرور",
    "submit": "دخول"
  }
}
```

### English Translation File (`frontend/locales/en.json`)
```json
{
  "app_name": "Sahatak",
  "language_selection": "Choose your preferred language",
  "welcome": {
    "title": "Welcome to Sahatak Telemedicine Platform",
    "description": "A secure and user-friendly platform to connect with doctors"
  },
  "auth": {
    "prompt": "Start Your Health Journey",
    "login": "Login",
    "register": "Create New Account",
    "language_switch": "Change Language",
    "current_language": "English",
    "back": "Back"
  },
  "login": {
    "title": "Login",
    "subtitle": "Enter your credentials to access your account",
    "login_identifier": "Email Address or Phone Number",
    "password": "Password",
    "submit": "Login"
  }
}
```

## Frontend Translation System

### LanguageManager Object (`frontend/assets/js/main.js`)

The core of the frontend translation system:

```javascript
const LanguageManager = {
    translations: {}, // Loaded translation data
    
    // Load translations from JSON files
    async loadTranslations() {
        try {
            // Determine correct path based on current location
            const isInSubdirectory = window.location.pathname.includes('/pages/');
            const isGitHubPages = window.location.hostname.includes('github.io');
            
            let basePath;
            if (isGitHubPages) {
                // GitHub Pages - use absolute path from repository root
                basePath = '/Sahatak/frontend/locales/';
            } else if (isInSubdirectory) {
                // In subdirectory - go up to root
                basePath = '../../frontend/locales/';
            } else {
                // At root level
                basePath = 'frontend/locales/';
            }
            
            // Load Arabic translations
            const arResponse = await fetch(`${basePath}ar.json`);
            this.translations.ar = await arResponse.json();
            
            // Load English translations
            const enResponse = await fetch(`${basePath}en.json`);
            this.translations.en = await enResponse.json();
            
            console.log('Translations loaded successfully:', this.translations);
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to hardcoded translations if loading fails
            this.translations = {
                ar: { app_name: "صحتك" },
                en: { app_name: "Sahatak" }
            };
        }
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
    
    // Get current language from localStorage or default
    getLanguage() {
        return localStorage.getItem('sahatak_language') || 'ar';
    },
    
    // Set language and persist in localStorage
    setLanguage(lang) {
        if (lang === 'ar' || lang === 'en') {
            localStorage.setItem('sahatak_language', lang);
            console.log(`Language set to: ${lang}`);
        } else {
            console.warn(`Invalid language: ${lang}`);
        }
    },
    
    // Translate a key with dot notation
    translate: function(key, lang = null) {
        const language = lang || this.getLanguage() || 'ar';
        const translations = this.translations[language];
        
        if (!translations) {
            console.warn(`No translations found for language: ${language}`);
            return key; // Return the key itself as fallback
        }
        
        // Handle dot notation (e.g., 'email_verification.invalid_link')
        const keys = key.split('.');
        let result = translations;
        
        for (const keyPart of keys) {
            result = result?.[keyPart];
            if (!result) {
                console.warn(`Translation not found for key: ${key} in language: ${language}`);
                return key; // Return the key if any part is missing
            }
        }
        
        return result;
    }
};
```

## Language Selection Process

### Step 1: Initial Language Selection (`frontend/assets/js/main.js`)
```javascript
function selectLanguage(lang) {
    console.log(`User selected language: ${lang}`);
    
    // Set language in LanguageManager
    LanguageManager.setLanguage(lang);
    
    // Update document attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update all UI text
    updateTranslations(lang);
    
    // Show next screen
    const authSelection = document.getElementById('auth-selection');
    const languageSelection = document.getElementById('language-selection');
    
    if (languageSelection) languageSelection.style.display = 'none';
    if (authSelection) authSelection.style.display = 'flex';
}
```

### Step 2: Dynamic UI Updates (`frontend/assets/js/main.js`)
```javascript
function updateTranslations(lang) {
    const t = LanguageManager.translations[lang];
    if (!t) {
        console.warn(`No translations found for language: ${lang}`);
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
    
    // Update login form
    updateElementText('login-title', t.login?.title);
    updateElementText('login-subtitle', t.login?.subtitle);
    updateElementText('login-identifier-label', t.login?.login_identifier);
    updateElementText('password-label', t.login?.password);
    updateElementText('login-submit', t.login?.submit);
    
    // Update registration forms
    updatePatientRegistrationTranslations(t);
    updateDoctorRegistrationTranslations(t);
    
    // Update footer
    updateFooterTranslations(t);
}
```

### Step 3: Element Text Update Helper (`frontend/assets/js/main.js`)
```javascript
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element && text) {
        element.textContent = text;
        console.log(`Updated ${elementId} with: ${text}`);
    } else if (!element && window.location.hostname === 'localhost') {
        // Only show missing element warnings in development
        console.warn(`Element not found: ${elementId}`);
    }
}
```

## RTL/LTR Support

### CSS Direction Handling
```css
/* Default LTR styles */
.container {
    text-align: left;
    margin-left: 0;
    margin-right: auto;
}

/* RTL styles for Arabic */
[dir="rtl"] .container {
    text-align: right;
    margin-left: auto;
    margin-right: 0;
}

[dir="rtl"] .form-group {
    direction: rtl;
}

[dir="rtl"] input, [dir="rtl"] select {
    text-align: right;
}
```

### JavaScript Direction Management
```javascript
function setDocumentDirection(lang) {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Update Bootstrap classes for RTL
    if (lang === 'ar') {
        document.body.classList.add('rtl');
    } else {
        document.body.classList.remove('rtl');
    }
}
```

## Backend Language Support

### User Language Preference Storage
```python
# User model with language preference
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    full_name = db.Column(db.String(200), nullable=False)
    user_type = db.Column(db.Enum('patient', 'doctor', 'admin'), nullable=False)
    language_preference = db.Column(db.Enum('ar', 'en'), default='ar', nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'user_type': self.user_type,
            'language_preference': self.language_preference,
            'is_active': self.is_active,
            'is_verified': self.is_verified
        }
```

### Language-Aware Registration
```python
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Get language preference from request
        language_preference = data.get('language_preference', 'ar')
        
        # Validate language preference
        if language_preference not in ['ar', 'en']:
            language_preference = 'ar'  # Default to Arabic
        
        # Create user with language preference
        user = User(
            email=data.get('email'),
            full_name=data['full_name'],
            user_type=data['user_type'],
            language_preference=language_preference
        )
        
        # Save to database
        db.session.add(user)
        db.session.commit()
        
        return APIResponse.success(
            data={'user': user.to_dict()},
            message='Registration successful'
        )
        
    except Exception as e:
        return APIResponse.internal_error(
            message='Registration failed'
        )
```

## Dashboard Translation System (`frontend/assets/js/components/dashboard-translations.js`)

### Dashboard-Specific Translations
The dashboard uses a specialized translation system:

```javascript
class DashboardTranslations {
    constructor() {
        this.translations = {};
    }
    
    async loadTranslations() {
        // Load translations for dashboard pages
        const basePath = '../../frontend/locales/';
        
        try {
            const arResponse = await fetch(`${basePath}ar.json`);
            this.translations.ar = await arResponse.json();
            
            const enResponse = await fetch(`${basePath}en.json`);
            this.translations.en = await enResponse.json();
        } catch (error) {
            console.error('Failed to load dashboard translations:', error);
        }
    }
    
    updatePatientDashboard(lang = 'ar') {
        const t = this.translations[lang];
        if (!t) return;
        
        const patient = t.dashboard.patient;
        
        // Update header section
        this.updateElementText('dashboard-title', patient.title);
        this.updateElementText('dashboard-subtitle', patient.subtitle);
        this.updateElementText('logout-text', patient.logout);
        
        // Update navigation
        this.updateElementText('nav-title', patient.nav.title);
        this.updateElementText('nav-home', patient.nav.home);
        this.updateElementText('nav-appointments', patient.nav.appointments);
        this.updateElementText('nav-records', patient.nav.records);
        this.updateElementText('nav-prescriptions', patient.nav.prescriptions);
        this.updateElementText('nav-profile', patient.nav.profile);
        this.updateElementText('nav-settings', patient.nav.settings);
        
        // Update quick actions
        this.updateElementText('action-book', patient.quick_actions.book);
        this.updateElementText('action-book-desc', patient.quick_actions.book_desc);
        this.updateElementText('action-records', patient.quick_actions.records);
        this.updateElementText('action-records-desc', patient.quick_actions.records_desc);
        this.updateElementText('action-chat', patient.quick_actions.chat);
        this.updateElementText('action-chat-desc', patient.quick_actions.chat_desc);
        
        // Update statistics
        this.updateElementText('stat-appointments', patient.stats.appointments);
        this.updateElementText('stat-prescriptions', patient.stats.prescriptions);
        this.updateElementText('stat-reports', patient.stats.reports);
    }
    
    updateDoctorDashboard(lang = 'ar') {
        const t = this.translations[lang];
        if (!t) return;
        
        const doctor = t.dashboard.doctor;
        
        // Update header section
        this.updateElementText('dashboard-title', doctor.title);
        this.updateElementText('dashboard-subtitle', doctor.subtitle);
        this.updateElementText('user-status', doctor.user_status);
        
        // Update navigation
        this.updateElementText('nav-title', doctor.nav.title);
        this.updateElementText('nav-home', doctor.nav.home);
        this.updateElementText('nav-patients', doctor.nav.patients);
        this.updateElementText('nav-appointments', doctor.nav.appointments);
        this.updateElementText('nav-consultations', doctor.nav.consultations);
        this.updateElementText('nav-prescriptions', doctor.nav.prescriptions);
        this.updateElementText('nav-schedule', doctor.nav.schedule);
        this.updateElementText('nav-profile', doctor.nav.profile);
        this.updateElementText('nav-settings', doctor.nav.settings);
        
        // Update quick actions
        this.updateElementText('action-prescription', doctor.quick_actions.prescription);
        this.updateElementText('action-prescription-desc', doctor.quick_actions.prescription_desc);
        this.updateElementText('action-records', doctor.quick_actions.records);
        this.updateElementText('action-records-desc', doctor.quick_actions.records_desc);
        this.updateElementText('action-schedule', doctor.quick_actions.schedule);
        this.updateElementText('action-schedule-desc', doctor.quick_actions.schedule_desc);
    }
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element && text) {
            element.textContent = text;
        }
    }
}
```

## Language Switching Process

### Real-Time Language Switching (`frontend/assets/js/main.js`)
```javascript
function switchLanguage() {
    const currentLang = LanguageManager.getLanguage();
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    console.log(`Switching from ${currentLang} to ${newLang}`);
    
    // Set new language
    LanguageManager.setLanguage(newLang);
    
    // Update document direction
    setDocumentDirection(newLang);
    
    // Update all translations
    updateTranslations(newLang);
    
    // Show current language toggle text
    const oppositeLanguage = newLang === 'ar' ? 'English' : 'العربية';
    updateElementText('current-language', oppositeLanguage);
    
    console.log(`Language switched to ${newLang}`);
}
```

### Language Toggle UI
```html
<button onclick="switchLanguage()" class="btn btn-outline-primary">
    <i class="bi bi-translate me-2"></i>
    <span id="current-language">English</span>
</button>
```

## Translation Categories

### 1. **Authentication & Registration**
```json
{
  "auth": {
    "prompt": "ابدأ رحلتك العلاجيه",
    "login": "تسجيل الدخول",
    "register": "إنشاء حساب جديد"
  },
  "login": {
    "title": "تسجيل الدخول",
    "login_identifier": "البريد الإلكتروني أو رقم الهاتف",
    "password": "كلمة المرور"
  },
  "patient_register": {
    "title": "تسجيل كمريض",
    "full_name": "الاسم الكامل",
    "phone": "رقم الهاتف",
    "age": "العمر",
    "gender": "الجنس"
  }
}
```

### 2. **Dashboard & Navigation**
```json
{
  "dashboard": {
    "patient": {
      "title": "لوحة تحكم المريض",
      "nav": {
        "home": "الرئيسية",
        "appointments": "المواعيد",
        "records": "السجلات الطبية"
      },
      "quick_actions": {
        "book": "حجز موعد جديد",
        "records": "سجلاتي الطبية"
      }
    }
  }
}
```

### 3. **Appointments & Medical Features**
```json
{
  "appointments": {
    "book_title": "حجز موعد جديد",
    "choose_doctor": "اختر الطبيب المناسب",
    "specialty": "التخصص",
    "consultation_type": "نوع الاستشارة",
    "video_call": "مكالمة فيديو",
    "audio_call": "مكالمة صوتية"
  },
  "prescriptions": {
    "title": "الوصفات الطبية",
    "medication_name": "اسم الدواء",
    "dosage": "الجرعة",
    "frequency": "التكرار"
  }
}
```

### 4. **Validation & Error Messages**
```json
{
  "validation": {
    "required": "هذا الحقل مطلوب",
    "email_invalid": "الرجاء إدخال بريد إلكتروني صحيح",
    "password_min": "كلمة المرور لازم تكون 6 حروف على الأقل",
    "login_failed": "فشل في تسجيل الدخول. جرب مرة أخرى.",
    "registration_success": "تم تسجل حسابك بنجاح! ممكن تدخل الان ."
  }
}
```

### 5. **Admin Panel**
```json
{
  "admin": {
    "dashboard": {
      "title": "لوحة التحكم الإدارية",
      "subtitle": "إدارة منصة صحتك الطبية"
    },
    "navigation": {
      "dashboard": "لوحة التحكم",
      "users": "إدارة المستخدمين",
      "verification": "توثيق الأطباء"
    },
    "stats": {
      "total_users": "إجمالي المستخدمين",
      "verified_doctors": "الأطباء المعتمدين",
      "appointments": "المواعيد المحجوزة"
    }
  }
}
```

## Translation Usage Patterns

### 1. **Direct Key Translation**
```javascript
// Simple key translation
const welcomeTitle = LanguageManager.translate('welcome.title');
const loginButton = LanguageManager.translate('auth.login');
```

### 2. **Dynamic Content Translation**
```javascript
// Update UI elements dynamically
function updatePageTranslations(lang) {
    const translations = LanguageManager.translations[lang];
    
    // Update multiple elements at once
    const elementsToUpdate = [
        { id: 'page-title', key: 'dashboard.patient.title' },
        { id: 'nav-appointments', key: 'dashboard.patient.nav.appointments' },
        { id: 'action-book', key: 'dashboard.patient.quick_actions.book' }
    ];
    
    elementsToUpdate.forEach(({ id, key }) => {
        const text = LanguageManager.getTranslation(lang, key);
        updateElementText(id, text);
    });
}
```

### 3. **Form Validation Translations**
```javascript
function showValidationError(fieldId, errorKey) {
    const errorMessage = LanguageManager.translate(`validation.${errorKey}`);
    LanguageManager.showFieldError(fieldId, errorMessage);
}

// Usage examples
showValidationError('email', 'email_invalid'); // "الرجاء إدخال بريد إلكتروني صحيح"
showValidationError('password', 'password_min'); // "كلمة المرور لازم تكون 6 حروف على الأقل"
```

## Language Detection & Persistence

### Language Detection Logic (`frontend/assets/js/main.js`)
```javascript
function detectUserLanguage() {
    // Priority order for language detection:
    // 1. Stored preference in localStorage
    const storedLang = localStorage.getItem('sahatak_language');
    if (storedLang && ['ar', 'en'].includes(storedLang)) {
        return storedLang;
    }
    
    // 2. Browser language preference
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang) {
        if (browserLang.startsWith('ar')) return 'ar';
        if (browserLang.startsWith('en')) return 'en';
    }
    
    // 3. Default to Arabic
    return 'ar';
}
```

### Persistence Across Sessions (`frontend/assets/js/main.js`)
```javascript
function initializeLanguage() {
    // Load saved language or detect user preference
    const userLang = detectUserLanguage();
    
    // Set document attributes
    document.documentElement.lang = userLang;
    document.documentElement.dir = userLang === 'ar' ? 'rtl' : 'ltr';
    
    // Store in LanguageManager
    LanguageManager.setLanguage(userLang);
    
    // Load translations and update UI
    LanguageManager.loadTranslations().then(() => {
        updateTranslations(userLang);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeLanguage);
```

## Email Template Localization

### Language-Specific Email Templates
```
backend/templates/email/
├── ar/
│   ├── registration_confirmation.html
│   ├── password_reset.html
│   └── appointment_reminder.html
└── en/
    ├── registration_confirmation.html
    ├── password_reset.html
    └── appointment_reminder.html
```

### Email Template Selection (`backend/services/email_service.py`)
```python
def send_email_confirmation(recipient_email, user_data):
    """Send email confirmation based on user's language preference"""
    
    # Get user's language preference
    user_lang = user_data.get('language_preference', 'ar')
    
    # Select appropriate template
    template_path = f'email/{user_lang}/registration_confirmation.html'
    
    # Load template content
    try:
        template = render_template(template_path, **user_data)
    except TemplateNotFound:
        # Fallback to Arabic template
        template = render_template('email/ar/registration_confirmation.html', **user_data)
    
    # Set email subject based on language
    subjects = {
        'ar': 'تأكيد التسجيل في منصة صحتك',
        'en': 'Registration Confirmation - Sahatak Platform'
    }
    subject = subjects.get(user_lang, subjects['ar'])
    
    # Send email
    send_email(
        recipient=recipient_email,
        subject=subject,
        html_body=template
    )
```

## Translation Management Best Practices

### 1. **Key Naming Conventions**
```javascript
// Use hierarchical dot notation
"dashboard.patient.nav.appointments"  // ✓ Good
"dashboardPatientNavAppointments"     // ✗ Poor

// Use descriptive names
"validation.email_invalid"            // ✓ Good
"validation.err1"                     // ✗ Poor

// Group related translations
"appointments.book_title"             // ✓ Good
"book_appointment_title"              // ✗ Poor
```

### 2. **Fallback Handling**
```javascript
function safeTranslate(key, fallback = null) {
    const translation = LanguageManager.translate(key);
    
    // If translation equals the key, it wasn't found
    if (translation === key) {
        console.warn(`Translation missing for key: ${key}`);
        return fallback || key;
    }
    
    return translation;
}
```

### 3. **Dynamic Content Translation**
```javascript
function translateDynamicContent(template, data, lang = null) {
    const language = lang || LanguageManager.getLanguage();
    
    // Replace placeholders with translated content
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
        return LanguageManager.translate(key, language);
    });
}

// Usage
const messageTemplate = "{{validation.registration_success}} {{auth.login}}";
const translatedMessage = translateDynamicContent(messageTemplate);
```

## Performance Optimization

### 1. **Lazy Loading**
```javascript
const TranslationCache = {
    cache: new Map(),
    
    async getTranslations(lang) {
        if (this.cache.has(lang)) {
            return this.cache.get(lang);
        }
        
        const translations = await this.loadTranslationsFromServer(lang);
        this.cache.set(lang, translations);
        return translations;
    },
    
    async loadTranslationsFromServer(lang) {
        const response = await fetch(`/frontend/locales/${lang}.json`);
        return await response.json();
    }
};
```

### 2. **Translation Preloading**
```javascript
async function preloadTranslations() {
    const languages = ['ar', 'en'];
    const promises = languages.map(lang => 
        TranslationCache.getTranslations(lang)
    );
    
    await Promise.all(promises);
    console.log('All translations preloaded');
}
```

## Accessibility & RTL Support

### 1. **ARIA Labels Translation**
```javascript
function updateAriaLabels(lang) {
    const translations = LanguageManager.translations[lang];
    
    // Update ARIA labels
    document.querySelectorAll('[data-translate-aria]').forEach(element => {
        const key = element.getAttribute('data-translate-aria');
        const translation = LanguageManager.getTranslation(lang, key);
        element.setAttribute('aria-label', translation);
    });
}
```

### 2. **RTL Layout Adjustments**
```css
/* Responsive RTL support */
[dir="rtl"] .navbar-nav {
    flex-direction: row-reverse;
}

[dir="rtl"] .dropdown-menu {
    right: 0;
    left: auto;
}

[dir="rtl"] .form-check {
    padding-right: 1.25em;
    padding-left: 0;
}

[dir="rtl"] .form-check-input {
    margin-right: -1.25em;
    margin-left: 0;
}
```

## Testing the Translation System

### 1. **Translation Completeness Test**
```javascript
function testTranslationCompleteness() {
    const languages = ['ar', 'en'];
    const arKeys = getAllKeys(LanguageManager.translations.ar);
    const enKeys = getAllKeys(LanguageManager.translations.en);
    
    // Find missing translations
    const missingInEn = arKeys.filter(key => !enKeys.includes(key));
    const missingInAr = enKeys.filter(key => !arKeys.includes(key));
    
    if (missingInEn.length > 0) {
        console.warn('Missing English translations:', missingInEn);
    }
    
    if (missingInAr.length > 0) {
        console.warn('Missing Arabic translations:', missingInAr);
    }
    
    return {
        complete: missingInEn.length === 0 && missingInAr.length === 0,
        missingInEn,
        missingInAr
    };
}

function getAllKeys(obj, prefix = '') {
    let keys = [];
    
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys.push(...getAllKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }
    
    return keys;
}
```

### 2. **Language Switching Test**
```javascript
function testLanguageSwitching() {
    console.log('Testing language switching...');
    
    // Test switching from Arabic to English
    LanguageManager.setLanguage('ar');
    console.assert(LanguageManager.getLanguage() === 'ar', 'Arabic not set correctly');
    
    // Test switching from English to Arabic
    LanguageManager.setLanguage('en');
    console.assert(LanguageManager.getLanguage() === 'en', 'English not set correctly');
    
    // Test invalid language
    LanguageManager.setLanguage('fr');
    console.assert(['ar', 'en'].includes(LanguageManager.getLanguage()), 'Invalid language accepted');
    
    console.log('Language switching tests passed');
}
```

## Troubleshooting Common Issues

### 1. **Missing Translations**
**Problem**: Some text appears as keys instead of translated text
**Solutions**:
- Check if translation key exists in JSON files
- Verify correct key path (e.g., "login.title" not "login_title")
- Ensure translation files are loaded properly
- Check browser console for loading errors

### 2. **Wrong Language Display**
**Problem**: Interface shows wrong language despite selection
**Solutions**:
- Clear localStorage and try again
- Check if language files are accessible
- Verify document direction is set correctly
- Ensure LanguageManager.setLanguage() is called

### 3. **RTL Layout Issues**
**Problem**: Arabic text appears with wrong alignment or direction
**Solutions**:
- Check if `dir="rtl"` is set on document
- Verify CSS RTL rules are applied
- Test with RTL-specific Bootstrap classes
- Check if text inputs have correct direction

### 4. **Translation File Loading Errors**
**Problem**: Translations don't load or show network errors
**Solutions**:
- Check file paths are correct relative to current page
- Verify JSON files are valid (use JSON validator)
- Check server permissions for static files
- Test with browser network tab to see HTTP errors

## Summary

The Sahatak translation system provides:

1. **Comprehensive Bilingual Support**: Full Arabic and English translations
2. **Dynamic Language Switching**: Real-time UI updates without page reload
3. **Persistent Preferences**: Language choice saved across sessions
4. **RTL/LTR Support**: Proper text direction and layout adaptation
5. **Hierarchical Organization**: Logical grouping of translation keys
6. **Backend Integration**: User language preferences stored in database
7. **Email Localization**: Language-specific email templates
8. **Performance Optimization**: Efficient loading and caching strategies
9. **Accessibility**: ARIA labels and screen reader support
10. **Developer-Friendly**: Clear naming conventions and fallback handling

The system ensures that users can seamlessly interact with the platform in their preferred language while maintaining full functionality and proper cultural adaptation for both Arabic and English speakers.