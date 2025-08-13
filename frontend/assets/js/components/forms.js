// Sahatak Forms JavaScript - Registration and Form Handling Functions

// Form Management and Validation
const FormManager = {
    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // Validate password strength
    validatePassword(password) {
        return password && password.length >= 6;
    },

    // Show form error
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

    // Clear field error
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

    // Clear all form errors
    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        // Remove is-invalid class from all inputs
        const invalidInputs = form.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => input.classList.remove('is-invalid'));

        // Clear all error messages
        const errorDivs = form.querySelectorAll('[id$="-error"]');
        errorDivs.forEach(div => div.textContent = '');
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

    // Generic form submission handler
    async submitForm(formData, endpoint, successCallback, errorCallback) {
        try {
            // TODO: Replace with actual API endpoint
            console.log(`Submitting to ${endpoint}:`, formData);
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // TODO: Replace with actual fetch call
            /*
            const response = await fetch(endpoint, {
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
            */
            
            // For demo purposes, simulate success
            successCallback({ message: 'Registration successful (demo mode)' });
            
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
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        userType: document.getElementById('userType').value
    };
    
    // Validate form
    let isValid = true;
    
    if (!formData.firstName) {
        FormManager.showFieldError('firstName', 'First name is required');
        isValid = false;
    }
    
    if (!formData.lastName) {
        FormManager.showFieldError('lastName', 'Last name is required');
        isValid = false;
    }
    
    if (!FormManager.validateEmail(formData.email)) {
        FormManager.showFieldError('regEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!FormManager.validatePassword(formData.password)) {
        FormManager.showFieldError('regPassword', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (!formData.userType) {
        FormManager.showFieldError('userType', 'Please select account type');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/api/register',
        (result) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('register-success-alert', result.message, 'success');
            // TODO: Redirect to appropriate dashboard
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
        firstName: document.getElementById('patientFirstName').value.trim(),
        lastName: document.getElementById('patientLastName').value.trim(),
        email: document.getElementById('patientEmail').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        age: parseInt(document.getElementById('patientAge').value),
        gender: document.getElementById('patientGender').value,
        password: document.getElementById('patientPassword').value,
        userType: 'patient'
    };
    
    // Validate form
    let isValid = true;
    
    if (!formData.firstName) {
        FormManager.showFieldError('patientFirstName', 'First name is required');
        isValid = false;
    }
    
    if (!formData.lastName) {
        FormManager.showFieldError('patientLastName', 'Last name is required');
        isValid = false;
    }
    
    if (!FormManager.validateEmail(formData.email)) {
        FormManager.showFieldError('patientEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!formData.phone) {
        FormManager.showFieldError('patientPhone', 'Phone number is required');
        isValid = false;
    }
    
    if (!formData.age || formData.age < 1 || formData.age > 120) {
        FormManager.showFieldError('patientAge', 'Please enter a valid age (1-120)');
        isValid = false;
    }
    
    if (!formData.gender) {
        FormManager.showFieldError('patientGender', 'Please select gender');
        isValid = false;
    }
    
    if (!FormManager.validatePassword(formData.password)) {
        FormManager.showFieldError('patientPassword', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/api/register/patient',
        (result) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('patient-register-success-alert', result.message, 'success');
            // TODO: Redirect to patient dashboard after successful registration
            setTimeout(() => {
                window.location.href = 'frontend/pages/dashboard/patient.html';
            }, 2000);
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
        firstName: document.getElementById('doctorFirstName').value.trim(),
        lastName: document.getElementById('doctorLastName').value.trim(),
        email: document.getElementById('doctorEmail').value.trim(),
        phone: document.getElementById('doctorPhone').value.trim(),
        licenseNumber: document.getElementById('doctorLicense').value.trim(),
        specialty: document.getElementById('doctorSpecialty').value,
        yearsOfExperience: parseInt(document.getElementById('doctorExperience').value),
        password: document.getElementById('doctorPassword').value,
        userType: 'doctor'
    };
    
    // Validate form
    let isValid = true;
    
    if (!formData.firstName) {
        FormManager.showFieldError('doctorFirstName', 'First name is required');
        isValid = false;
    }
    
    if (!formData.lastName) {
        FormManager.showFieldError('doctorLastName', 'Last name is required');
        isValid = false;
    }
    
    if (!FormManager.validateEmail(formData.email)) {
        FormManager.showFieldError('doctorEmail', 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!formData.phone) {
        FormManager.showFieldError('doctorPhone', 'Phone number is required');
        isValid = false;
    }
    
    if (!formData.licenseNumber) {
        FormManager.showFieldError('doctorLicense', 'Medical license number is required');
        isValid = false;
    }
    
    if (!formData.specialty) {
        FormManager.showFieldError('doctorSpecialty', 'Please select specialty');
        isValid = false;
    }
    
    if (isNaN(formData.yearsOfExperience) || formData.yearsOfExperience < 0 || formData.yearsOfExperience > 50) {
        FormManager.showFieldError('doctorExperience', 'Please enter valid years of experience (0-50)');
        isValid = false;
    }
    
    if (!FormManager.validatePassword(formData.password)) {
        FormManager.showFieldError('doctorPassword', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Set loading state
    FormManager.setFormLoading(formId, true);
    
    // Submit form
    FormManager.submitForm(
        formData,
        '/api/register/doctor',
        (result) => {
            FormManager.setFormLoading(formId, false);
            FormManager.showAlert('doctor-register-success-alert', result.message, 'success');
            // TODO: Redirect to doctor dashboard after successful registration
            setTimeout(() => {
                window.location.href = 'frontend/pages/dashboard/doctor.html';
            }, 2000);
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