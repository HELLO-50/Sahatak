// Sahatak Forms JavaScript - Registration and Form Handling Functions

// Form Management using ValidationManager
const FormManager = {
    // Delegate to ValidationManager for validation
    validateEmail(email) {
        return ValidationManager.validateEmail(email);
    },

    // Delegate to ValidationManager for validation
    validatePassword(password) {
        return ValidationManager.validatePassword(password);
    },

    // Delegate to ValidationManager for error handling
    showFieldError(fieldId, message) {
        return ValidationManager.showFieldError(fieldId, message);
    },

    // Delegate to ValidationManager for error handling
    clearFieldError(fieldId) {
        return ValidationManager.clearFieldError(fieldId);
    },

    // Delegate to ValidationManager for error handling
    clearFormErrors(formId) {
        return ValidationManager.clearFormErrors(formId);
    },

    // Show form alert
    showAlert(alertId, message, type = 'danger') {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.textContent = message;
            alert.className = `alert alert-${type} mt-3`;
            alert.classList.remove('d-none');
        }
    },

    // Hide form alert
    hideAlert(alertId) {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.add('d-none');
        }
    },

    // Set form loading state
    setFormLoading(formId, isLoading) {
        const form = document.getElementById(formId);
        if (!form) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const spinner = form.querySelector('.spinner-border');
        const icon = form.querySelector('[id$="-icon"]');

        if (submitBtn) submitBtn.disabled = isLoading;
        if (spinner) {
            if (isLoading) {
                spinner.classList.remove('d-none');
            } else {
                spinner.classList.add('d-none');
            }
        }
        if (icon) {
            if (isLoading) {
                icon.classList.add('d-none');
            } else {
                icon.classList.remove('d-none');
            }
        }
    },

    // Show centered success screen
    showSuccessScreen(message, userType, redirectDelay = 3000) {
        // Hide all other screens
        const screensToHide = ['language-selection', 'auth-selection', 'login-form', 'user-type-selection', 'patient-register-form', 'doctor-register-form'];
        screensToHide.forEach(screenId => {
            const element = document.getElementById(screenId);
            if (element) {
                element.classList.add('d-none');
                element.style.display = 'none';
            }
        });

        // Create success screen HTML
        const successHTML = `
            <div id="registration-success" class="min-vh-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(135deg, var(--medical-blue) 0%, var(--medical-teal) 100%); position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;">
                <div class="container">
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card shadow-lg border-0 text-center" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
                                <div class="card-body p-5">
                                    <div class="mb-4">
                                        <i class="bi bi-check-circle-fill text-success" style="font-size: 4rem;"></i>
                                    </div>
                                    <h2 class="text-success mb-3">Registration Successful!</h2>
                                    <p class="lead mb-4">${message}</p>
                                    <div class="spinner-border text-primary mb-3" role="status">
                                        <span class="visually-hidden">Loading...</span>
                                    </div>
                                    <p class="text-muted">Redirecting to your dashboard...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add success screen to body
        document.body.insertAdjacentHTML('beforeend', successHTML);

        // Redirect after delay
        setTimeout(() => {
            const dashboardUrl = userType === 'doctor' ? 
                'frontend/pages/dashboard/doctor.html' : 
                'frontend/pages/dashboard/patient.html';
            window.location.href = dashboardUrl;
        }, redirectDelay);
    },

    // Generic form submission handler
    async submitForm(formData, endpoint, successCallback, errorCallback) {
        try {
            // Use the same base URL as ApiHelper
            const baseUrl = 'https://sahatak.pythonanywhere.com/api';
            const fullUrl = baseUrl + endpoint;
            console.log(`Submitting to ${fullUrl}:`, formData);
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                successCallback(result);
            } else {
                errorCallback(result.message || 'Registration failed');
            }
            
        } catch (error) {
            console.error('Form submission error:', error);
            errorCallback('Network error. Please try again.');
        }
    }
};

// General registration form handler (currently not used in flow, but keeping for compatibility)
function handleRegister(event) {
    event.preventDefault();
    
    const formId = 'registerForm';
    FormManager.clearFormErrors(formId);
    FormManager.hideAlert('register-error-alert');
    FormManager.hideAlert('register-success-alert');
    
    // Get form data
    const formData = {
        full_name: document.getElementById('fullName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        user_type: document.getElementById('userType').value
    };
    
    // Validate form using ValidationManager
    const validation = ValidationManager.validateRegistrationForm(formData);
    
    if (!validation.isValid) {
        // Map field names and show errors
        Object.keys(validation.errors).forEach(field => {
            let fieldId = field;
            // Map email field name for this form
            if (field === 'email') fieldId = 'regEmail';
            if (field === 'password') fieldId = 'regPassword';
            
            ValidationManager.showFieldError(fieldId, validation.errors[field]);
        });
        return false;
    }
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/auth/register',
        (result) => {
            FormManager.setFormLoading(formId, false);
            // Use patient as default since this is the general form
            FormManager.showSuccessScreen(result.message, 'patient');
        },
        (error) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('register-error-alert', error);
        }
    );
    
    return false;
}

// Patient registration form handler
function handlePatientRegister(event) {
    event.preventDefault();
    
    const formId = 'patientRegisterForm';
    FormManager.clearFormErrors(formId);
    FormManager.hideAlert('patient-register-error-alert');
    FormManager.hideAlert('patient-register-success-alert');
    
    // Get form data
    const formData = {
        full_name: document.getElementById('patientFullName').value.trim(),
        email: document.getElementById('patientEmail').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        age: parseInt(document.getElementById('patientAge').value),
        gender: document.getElementById('patientGender').value,
        password: document.getElementById('patientPassword').value,
        user_type: 'patient'
    };
    
    // Validate form using ValidationManager
    const validationData = {
        fullName: formData.full_name,
        email: formData.email,
        phoneNumber: formData.phone,
        nationalId: '',
        dateOfBirth: '',
        password: formData.password
    };
    
    const validation = ValidationManager.validatePatientRegistrationForm(validationData);
    let isValid = validation.isValid;
    
    // Show ValidationManager errors
    if (!validation.isValid) {
        Object.keys(validation.errors).forEach(field => {
            let fieldId = 'patient' + field.charAt(0).toUpperCase() + field.slice(1);
            if (field === 'phoneNumber') fieldId = 'patientPhone';
            ValidationManager.showFieldError(fieldId, validation.errors[field]);
        });
    }
    
    // Additional custom validations not in ValidationManager
    if (!formData.age || formData.age < 1 || formData.age > 120) {
        ValidationManager.showFieldError('patientAge', 'Please enter a valid age (1-120)');
        isValid = false;
    }
    
    if (!formData.gender) {
        ValidationManager.showFieldError('patientGender', 'Please select gender');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/auth/register',
        (result) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showSuccessScreen(result.message, 'patient');
        },
        (error) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('patient-register-error-alert', error);
        }
    );
    
    return false;
}

// Doctor registration form handler
function handleDoctorRegister(event) {
    event.preventDefault();
    
    const formId = 'doctorRegisterForm';
    FormManager.clearFormErrors(formId);
    FormManager.hideAlert('doctor-register-error-alert');
    FormManager.hideAlert('doctor-register-success-alert');
    
    // Get form data
    const formData = {
        full_name: document.getElementById('doctorFullName').value.trim(),
        email: document.getElementById('doctorEmail').value.trim(),
        phone: document.getElementById('doctorPhone').value.trim(),
        license_number: document.getElementById('doctorLicense').value.trim(),
        specialty: document.getElementById('doctorSpecialty').value,
        years_of_experience: parseInt(document.getElementById('doctorExperience').value),
        password: document.getElementById('doctorPassword').value,
        user_type: 'doctor'
    };
    
    // Validate form using ValidationManager
    const validationData = {
        fullName: formData.full_name,
        email: formData.email,
        phoneNumber: formData.phone,
        nationalId: '',
        specialization: formData.specialty,
        licenseNumber: formData.license_number,
        password: formData.password
    };
    
    const validation = ValidationManager.validateDoctorRegistrationForm(validationData);
    let isValid = validation.isValid;
    
    // Show ValidationManager errors
    if (!validation.isValid) {
        Object.keys(validation.errors).forEach(field => {
            let fieldId = 'doctor' + field.charAt(0).toUpperCase() + field.slice(1);
            if (field === 'phoneNumber') fieldId = 'doctorPhone';
            if (field === 'specialization') fieldId = 'doctorSpecialty';
            if (field === 'licenseNumber') fieldId = 'doctorLicense';
            ValidationManager.showFieldError(fieldId, validation.errors[field]);
        });
    }
    
    // Additional custom validation for years of experience
    if (isNaN(formData.yearsOfExperience) || formData.yearsOfExperience < 0 || formData.yearsOfExperience > 50) {
        ValidationManager.showFieldError('doctorExperience', 'Please enter valid years of experience (0-50)');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/auth/register',
        (result) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showSuccessScreen(result.message, 'doctor');
        },
        (error) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('doctor-register-error-alert', error);
        }
    );
    
    return false;
}

// Initialize form system when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Form system initialized');
    
    // Add real-time validation for email fields
    const emailFields = document.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        field.addEventListener('blur', function() {
            if (this.value && !FormManager.validateEmail(this.value)) {
                FormManager.showFieldError(this.id, 'Please enter a valid email address');
            } else {
                FormManager.clearFieldError(this.id);
            }
        });
    });
    
    // Add real-time validation for password fields
    const passwordFields = document.querySelectorAll('input[type="password"]');
    passwordFields.forEach(field => {
        field.addEventListener('input', function() {
            if (this.value && !FormManager.validatePassword(this.value)) {
                FormManager.showFieldError(this.id, 'Password must be at least 6 characters');
            } else {
                FormManager.clearFieldError(this.id);
            }
        });
    });
});