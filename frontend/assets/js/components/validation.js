// Sahatak Validation JavaScript - Centralized Validation Functions

const ValidationManager = {
    // Common validation patterns - matching backend
    patterns: {
        email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        phone: /^\+?[1-9]\d{7,14}$/,
        phoneJordan: /^(\+962|00962|0)?(7[789]\d{7})$/,
        name: /^[a-zA-Z\u0600-\u06FF\s\-'\.]+$/,
        licenseNumber: /^[a-zA-Z0-9\-\/]+$/
    },

    // Valid medical specialties - matching backend
    validSpecialties: [
        'cardiology', 'pediatrics', 'dermatology', 'internal', 
        'psychiatry', 'orthopedics', 'general', 'neurology',
        'gynecology', 'ophthalmology', 'ent', 'surgery',
        'radiology', 'pathology', 'anesthesiology', 'emergency'
    ],

    // Country data with phone patterns and license formats
    countries: {
        US: {
            name: 'United States',
            flag: '[US]',
            code: '+1',
            phonePattern: /^\d{10}$/,
            licensePattern: /^[A-Z]{2}\d{6,8}$/,
            licensePlaceholder: 'e.g., CA123456'
        },
        SD: {
            name: 'Sudan',
            flag: '[SD]',
            code: '+249',
            phonePattern: /^\d{9}$/,
            licensePattern: /^[A-Z0-9]{6,12}$/,
            licensePlaceholder: 'e.g., MED123456'
        },
        EG: {
            name: 'Egypt',
            flag: '[EG]',
            code: '+20',
            phonePattern: /^1\d{9}$/,
            licensePattern: /^\d{7,10}$/,
            licensePlaceholder: 'e.g., 1234567'
        },
        SA: {
            name: 'Saudi Arabia',
            flag: '[SA]',
            code: '+966',
            phonePattern: /^5\d{8}$/,
            licensePattern: /^\d{10}$/,
            licensePlaceholder: 'e.g., 1234567890'
        },
        AE: {
            name: 'UAE',
            flag: '[AE]',
            code: '+971',
            phonePattern: /^5\d{8}$/,
            licensePattern: /^[A-Z0-9]{6,10}$/,
            licensePlaceholder: 'e.g., DOH123456'
        },
        IE: {
            name: 'Ireland',
            flag: '[IE]',
            code: '+353',
            phonePattern: /^[8-9]\d{8}$/,
            licensePattern: /^[A-Z0-9]{6,10}$/,
            licensePlaceholder: 'e.g., IMC123456'
        },
        GB: {
            name: 'United Kingdom',
            flag: '[GB]',
            code: '+44',
            phonePattern: /^7\d{9}$/,
            licensePattern: /^[A-Z0-9]{7,10}$/,
            licensePlaceholder: 'e.g., GMC1234567'
        }
    },

    // Core validation methods - matching backend logic
    validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        return this.patterns.email.test(email.trim());
    },

    validatePassword(password) {
        if (!password || typeof password !== 'string') return false;
        
        // Check length constraints (matching backend)
        if (password.length < 6 || password.length > 128) return false;
        
        // Check for at least one letter and one number (matching backend)
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        return hasLetter && hasNumber;
    },

    validateName(name, minLength = 2, maxLength = 50) {
        if (!name || typeof name !== 'string') return false;
        
        const trimmedName = name.trim();
        
        // Check length constraints (matching backend)
        if (trimmedName.length < minLength || trimmedName.length > maxLength) return false;
        
        // Check character pattern - allow Arabic characters (matching backend)
        return this.patterns.name.test(trimmedName);
    },

    validateFullName(fullName, minLength = 3, maxLength = 200) {
        if (!fullName || typeof fullName !== 'string') return false;
        
        const trimmedName = fullName.trim();
        
        // Check length constraints (matching backend)
        if (trimmedName.length < minLength || trimmedName.length > maxLength) return false;
        
        // Check character pattern - allow Arabic characters (matching backend)
        if (!this.patterns.name.test(trimmedName)) return false;
        
        // Ensure it contains at least one space (indicating first + last name)
        if (!trimmedName.includes(' ')) return false;
        
        return true;
    },

    validatePhoneNumber(phone, preferJordan = true) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Clean phone number
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').trim();
        
        // Use Jordan-specific validation by default, fallback to international
        if (preferJordan && this.patterns.phoneJordan.test(cleanPhone)) {
            return true;
        }
        
        // International format validation (matching backend)
        return this.patterns.phone.test(cleanPhone);
    },


    validateAge(age) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum)) return false;
        return ageNum >= 1 && ageNum <= 120;
    },

    // Country-specific phone validation
    validatePhoneWithCountry(phone, countryCode) {
        if (!phone || !countryCode || !this.countries[countryCode]) return false;
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        return this.countries[countryCode].phonePattern.test(cleanPhone);
    },

    // Country-specific license validation
    validateLicenseWithCountry(license, countryCode) {
        if (!license || !countryCode || !this.countries[countryCode]) return false;
        const cleanLicense = license.trim().replace(/[\s\-]/g, '');
        return this.countries[countryCode].licensePattern.test(cleanLicense);
    },

    // Password confirmation validation
    validatePasswordConfirmation(password, confirmPassword) {
        return password === confirmPassword;
    },

    validateDateOfBirth(dateString) {
        if (!dateString) return false;
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return false;
        
        const today = new Date();
        const age = today.getFullYear() - date.getFullYear();
        const monthDiff = today.getMonth() - date.getMonth();
        
        let actualAge = age;
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
            actualAge--;
        }
        
        return actualAge >= 1 && actualAge <= 120;
    },

    validateSpecialization(specialization) {
        if (!specialization || typeof specialization !== 'string') return false;
        
        const normalized = specialization.toLowerCase().trim();
        return this.validSpecialties.includes(normalized);
    },

    validateLicenseNumber(license) {
        if (!license || typeof license !== 'string') return false;
        
        const trimmedLicense = license.trim();
        
        // Check length constraints (matching backend)
        if (trimmedLicense.length < 3 || trimmedLicense.length > 50) return false;
        
        // Check character pattern (matching backend)
        return this.patterns.licenseNumber.test(trimmedLicense);
    },

    // Input sanitization
    sanitizeInput(text, maxLength = null) {
        if (!text || typeof text !== 'string') return '';
        
        let sanitized = text.trim();
        
        if (maxLength && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength).trim();
        }
        
        return sanitized;
    },

    // Form validation functions with detailed error messages
    validateRegistrationForm(data) {
        const errors = {};
        let isValid = true;

        if (!this.validateFullName(data.fullName)) {
            if (!data.fullName || data.fullName.trim().length < 3) {
                errors.fullName = 'Full name must be at least 3 characters long';
            } else if (data.fullName.trim().length > 200) {
                errors.fullName = 'Full name must be less than 200 characters long';
            } else if (!data.fullName.trim().includes(' ')) {
                errors.fullName = 'Please enter your full name (first and last name)';
            } else {
                errors.fullName = 'Full name contains invalid characters';
            }
            isValid = false;
        }

        if (!this.validateEmail(data.email)) {
            errors.email = 'Please enter a valid email address';
            isValid = false;
        }

        if (!this.validatePassword(data.password)) {
            if (!data.password) {
                errors.password = 'Password is required';
            } else if (data.password.length < 6) {
                errors.password = 'Password must be at least 6 characters long';
            } else if (data.password.length > 128) {
                errors.password = 'Password must be less than 128 characters long';
            } else {
                errors.password = 'Password must contain at least one letter and one number';
            }
            isValid = false;
        }

        if (!data.userType) {
            errors.userType = 'Please select an account type';
            isValid = false;
        }

        return { isValid, errors };
    },

    validatePatientRegistrationForm(data) {
        const errors = {};
        let isValid = true;

        // Validate full name
        if (!this.validateFullName(data.fullName)) {
            if (!data.fullName || data.fullName.trim().length < 3) {
                errors.fullName = 'Full name must be at least 3 characters long';
            } else if (data.fullName.trim().length > 200) {
                errors.fullName = 'Full name must be less than 200 characters long';
            } else if (!data.fullName.trim().includes(' ')) {
                errors.fullName = 'Please enter your full name (first and last name)';
            } else {
                errors.fullName = 'Full name contains invalid characters';
            }
            isValid = false;
        }

        // Validate email (required for all users)
        if (!this.validateEmail(data.email)) {
            if (!data.email || data.email.trim() === '') {
                errors.email = 'Email address is required';
            } else {
                errors.email = 'Please enter a valid email address';
            }
            isValid = false;
        }

        // Validate phone number (always required)
        if (!this.validatePhoneNumber(data.phoneNumber)) {
            errors.phoneNumber = 'Please enter a valid phone number';
            isValid = false;
        }


        // Validate date of birth (optional)
        if (data.dateOfBirth && !this.validateDateOfBirth(data.dateOfBirth)) {
            errors.dateOfBirth = 'Please enter a valid date of birth';
            isValid = false;
        }

        // Validate password
        if (!this.validatePassword(data.password)) {
            if (!data.password) {
                errors.password = 'Password is required';
            } else if (data.password.length < 6) {
                errors.password = 'Password must be at least 6 characters long';
            } else if (data.password.length > 128) {
                errors.password = 'Password must be less than 128 characters long';
            } else {
                errors.password = 'Password must contain at least one letter and one number';
            }
            isValid = false;
        }

        return { isValid, errors };
    },

    validateDoctorRegistrationForm(data) {
        const errors = {};
        let isValid = true;

        // Validate full name
        if (!this.validateFullName(data.fullName)) {
            if (!data.fullName || data.fullName.trim().length < 3) {
                errors.fullName = 'Full name must be at least 3 characters long';
            } else if (data.fullName.trim().length > 200) {
                errors.fullName = 'Full name must be less than 200 characters long';
            } else if (!data.fullName.trim().includes(' ')) {
                errors.fullName = 'Please enter your full name (first and last name)';
            } else {
                errors.fullName = 'Full name contains invalid characters';
            }
            isValid = false;
        }

        // Validate email (required for doctors)
        if (!this.validateEmail(data.email)) {
            errors.email = 'Please enter a valid email address';
            isValid = false;
        }

        // Validate phone number (always required)
        if (!this.validatePhoneNumber(data.phoneNumber)) {
            errors.phoneNumber = 'Please enter a valid phone number';
            isValid = false;
        }


        // Validate medical specialization
        if (!this.validateSpecialization(data.specialization)) {
            const validList = this.validSpecialties.join(', ');
            errors.specialization = `Invalid specialty. Must be one of: ${validList}`;
            isValid = false;
        }

        // Validate license number
        if (!this.validateLicenseNumber(data.licenseNumber)) {
            if (!data.licenseNumber || data.licenseNumber.trim().length < 3) {
                errors.licenseNumber = 'License number must be at least 3 characters long';
            } else if (data.licenseNumber.trim().length > 50) {
                errors.licenseNumber = 'License number must be less than 50 characters long';
            } else {
                errors.licenseNumber = 'License number contains invalid characters';
            }
            isValid = false;
        }

        // Validate password
        if (!this.validatePassword(data.password)) {
            if (!data.password) {
                errors.password = 'Password is required';
            } else if (data.password.length < 6) {
                errors.password = 'Password must be at least 6 characters long';
            } else if (data.password.length > 128) {
                errors.password = 'Password must be less than 128 characters long';
            } else {
                errors.password = 'Password must contain at least one letter and one number';
            }
            isValid = false;
        }

        return { isValid, errors };
    },

    // Form error display utilities
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.add('is-invalid');
        }
        if (errorDiv) {
            errorDiv.textContent = message;
        }
    },

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorDiv = document.getElementById(`${fieldId}-error`);
        
        if (field) {
            field.classList.remove('is-invalid');
        }
        if (errorDiv) {
            errorDiv.textContent = '';
        }
    },

    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const invalidInputs = form.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => input.classList.remove('is-invalid'));

        const errorDivs = form.querySelectorAll('[id$="-error"]');
        errorDivs.forEach(div => div.textContent = '');
    },

    // Display validation errors with translations
    displayValidationErrors(errors, translations = {}) {
        Object.keys(errors).forEach(fieldId => {
            const translatedMessage = translations[fieldId] || errors[fieldId];
            this.showFieldError(fieldId, translatedMessage);
        });
    }
};

// Make ValidationManager globally available
if (typeof window !== 'undefined') {
    window.ValidationManager = ValidationManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationManager;
}