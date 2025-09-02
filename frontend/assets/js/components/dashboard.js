/**
 * Dashboard Data Handler
 * Handles both patient and doctor dashboards with real data from backend
 */

const Dashboard = {
    // Current user type
    userType: null,
    
    // Cache for loaded data
    cache: {
        user: null,
        appointments: [],
        prescriptions: [],
        vitals: null,
        medicalRecords: null,
        patients: [],  // For doctors
        stats: null      // For dashboard statistics
    },

    /**
     * Initialize dashboard based on user type
     */
    async initialize() {
        try {
            console.log('Initializing dashboard with real data...');
            
            // Get user type from auth guard or local storage
            const userData = JSON.parse(localStorage.getItem('sahatak_user') || '{}');
            this.userType = userData.user_type || 'patient';
            
            // Load user profile first
            await this.loadUserProfile();
            
            // Load dashboard based on user type
            if (this.userType === 'patient') {
                await this.initializePatientDashboard();
            } else if (this.userType === 'doctor') {
                await this.initializeDoctorDashboard();
            }
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    },

    /**
     * Initialize patient-specific dashboard
     */
    async initializePatientDashboard() {
        try {
            await Promise.all([
                this.loadAppointments(),
                this.loadPrescriptions(),
                this.loadHealthSummary(),
                this.loadMedicalRecords()
            ]);
            
            // Update statistics after loading data
            this.updateStatistics();
        } catch (error) {
            console.error('Error initializing patient dashboard:', error);
            this.showError('Failed to load some dashboard data');
        }
    },

    /**
     * Initialize doctor-specific dashboard
     */
    async initializeDoctorDashboard() {
        await Promise.all([
            this.loadAppointments(),
            this.loadPatients(),
            this.loadDoctorStats()
        ]);
    },

    /**
     * Load user profile from backend
     */
    async loadUserProfile() {
        try {
            const response = await ApiHelper.makeRequest('/users/profile');
            
            if (response.data) {
                this.cache.user = response.data;
                
                // Update profile display
                const userName = document.getElementById('user-name');
                if (userName) {
                    userName.textContent = response.data.full_name || 'User';
                }
                
                // Store for quick access
                localStorage.setItem('sahatak_user_data', JSON.stringify(response.data));
                
                console.log('User profile loaded:', response.data);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    },

    /**
     * Load appointments from backend
     */
    async loadAppointments() {
        try {
            const response = await ApiHelper.makeRequest('/appointments/');
            
            if (response.data) {
                // Ensure data is always an array
                const appointments = Array.isArray(response.data) ? response.data : 
                                   (response.data.appointments && Array.isArray(response.data.appointments)) ? response.data.appointments : [];
                
                this.cache.appointments = appointments;
                this.displayAppointments(appointments);
            } else {
                this.cache.appointments = [];
                this.displayNoAppointments();
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
            this.cache.appointments = [];
            this.displayNoAppointments();
        }
    },

    /**
     * Display appointments in the dashboard
     */
    displayAppointments(appointments) {
        const container = document.getElementById('appointments-container');
        if (!container) return;
        
        // Ensure appointments is an array
        const appointmentsArray = Array.isArray(appointments) ? appointments : [];
        
        if (!appointmentsArray || appointmentsArray.length === 0) {
            this.displayNoAppointments();
            return;
        }
        
        // Filter upcoming appointments
        const upcoming = appointmentsArray.filter(apt => {
            if (!apt || !apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= new Date() && apt.status === 'scheduled';
        }).sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
        
        if (upcoming.length === 0) {
            this.displayNoAppointments();
            return;
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Add title
        const title = document.createElement('h5');
        title.className = 'mb-3';
        title.innerHTML = '<i class="bi bi-calendar-check me-2"></i>Upcoming Appointments';
        container.appendChild(title);
        
        // Create appointments list
        const list = document.createElement('div');
        list.className = 'appointments-list';
        
        // Display up to 3 appointments
        upcoming.slice(0, 3).forEach(apt => {
            const appointmentCard = this.createAppointmentCard(apt);
            list.appendChild(appointmentCard);
        });
        
        container.appendChild(list);
        
        // Add view all button if more than 3
        if (upcoming.length > 3) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn btn-outline-primary btn-sm w-100 mt-3';
            viewAllBtn.textContent = `View All ${upcoming.length} Appointments`;
            viewAllBtn.onclick = () => window.location.href = '../appointments/appointment-list.html';
            container.appendChild(viewAllBtn);
        }
    },

    /**
     * Create appointment card element
     */
    createAppointmentCard(appointment) {
        const card = document.createElement('div');
        card.className = 'appointment-item mb-3 p-3 border rounded';
        
        const date = new Date(appointment.appointment_date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        const formattedTime = date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Determine display name based on user type
        const displayName = this.userType === 'patient' 
            ? (appointment.doctor_name || 'Doctor')
            : (appointment.patient_name || 'Patient');
        
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${displayName}</h6>
                    <p class="text-muted small mb-1">${appointment.appointment_type || 'Consultation'}</p>
                    <p class="mb-0">
                        <i class="bi bi-calendar me-1"></i>${formattedDate}
                        <i class="bi bi-clock ms-2 me-1"></i>${formattedTime}
                    </p>
                    ${appointment.reason_for_visit ? 
                        `<p class="text-muted small mt-1 mb-0">${appointment.reason_for_visit}</p>` : ''}
                </div>
                <span class="badge bg-primary">${appointment.status}</span>
            </div>
        `;
        
        return card;
    },

    /**
     * Display no appointments message
     */
    displayNoAppointments() {
        const container = document.getElementById('appointments-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-calendar-x fs-1 text-muted"></i>
                <p class="mt-2">No upcoming appointments</p>
                <button class="btn btn-primary btn-sm" onclick="bookAppointment()">
                    Book Appointment
                </button>
            </div>
        `;
    },

    /**
     * Load prescriptions (patient only)
     */
    async loadPrescriptions() {
        try {
            const response = await ApiHelper.makeRequest('/prescriptions/');
            
            if (response.data) {
                // Ensure data is always an array
                const prescriptions = Array.isArray(response.data) ? response.data : 
                                    (response.data.prescriptions && Array.isArray(response.data.prescriptions)) ? response.data.prescriptions : [];
                
                this.cache.prescriptions = prescriptions;
                this.displayPrescriptions(prescriptions);
            } else {
                this.cache.prescriptions = [];
                this.displayNoPrescriptions();
            }
        } catch (error) {
            console.error('Error loading prescriptions:', error);
            this.cache.prescriptions = [];
            this.displayNoPrescriptions();
        }
    },

    /**
     * Display active prescriptions
     */
    displayPrescriptions(prescriptions) {
        const container = document.getElementById('prescriptions-container');
        if (!container) return;
        
        // Ensure prescriptions is an array
        const prescriptionsArray = Array.isArray(prescriptions) ? prescriptions : [];
        
        if (!prescriptionsArray || prescriptionsArray.length === 0) {
            this.displayNoPrescriptions();
            return;
        }
        
        // Filter active prescriptions
        const active = prescriptionsArray.filter(p => p && p.status === 'active');
        
        if (active.length === 0) {
            this.displayNoPrescriptions();
            return;
        }
        
        container.innerHTML = '';
        
        // Add title
        const title = document.createElement('h5');
        title.className = 'mb-3';
        title.innerHTML = '<i class="bi bi-prescription2 me-2"></i>Active Prescriptions';
        container.appendChild(title);
        
        // Create prescriptions list
        const list = document.createElement('div');
        list.className = 'prescriptions-list';
        
        active.slice(0, 3).forEach(prescription => {
            const prescriptionCard = this.createPrescriptionCard(prescription);
            list.appendChild(prescriptionCard);
        });
        
        container.appendChild(list);
        
        // Add view all button if more than 3
        if (active.length > 3) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn btn-outline-primary btn-sm w-100 mt-3';
            viewAllBtn.textContent = `View All ${active.length} Prescriptions`;
            viewAllBtn.onclick = () => window.location.href = '../medical/prescriptions.html';
            container.appendChild(viewAllBtn);
        }
    },

    /**
     * Create prescription card element
     */
    createPrescriptionCard(prescription) {
        const card = document.createElement('div');
        card.className = 'prescription-item mb-3 p-3 border rounded';
        
        card.innerHTML = `
            <h6 class="mb-1">${prescription.medication_name}</h6>
            <p class="text-muted small mb-1">${prescription.dosage} - ${prescription.frequency}</p>
            <p class="mb-0 small">
                <span class="text-muted">Duration:</span> ${prescription.duration}
                ${prescription.refills_allowed > 0 ? 
                    `<span class="ms-2 badge bg-info">Refills: ${prescription.refills_allowed - prescription.refills_used}</span>` 
                    : ''}
            </p>
            ${prescription.instructions ? 
                `<p class="text-muted small mt-1 mb-0"><i class="bi bi-info-circle me-1"></i>${prescription.instructions}</p>` 
                : ''}
        `;
        
        return card;
    },

    /**
     * Display no prescriptions message
     */
    displayNoPrescriptions() {
        const container = document.getElementById('prescriptions-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-prescription fs-1 text-muted"></i>
                <p class="mt-2">No active prescriptions</p>
            </div>
        `;
    },

    /**
     * Load health summary (patient only)
     */
    async loadHealthSummary() {
        try {
            const response = await ApiHelper.makeRequest('/medical/records');
            
            if (response.data) {
                this.cache.vitals = response.data;
                this.displayHealthSummary(response.data);
            }
        } catch (error) {
            console.error('Error loading health summary:', error);
            this.displayEmptyHealthSummary();
        }
    },

    /**
     * Display health summary
     */
    displayHealthSummary(data) {
        const container = document.getElementById('health-summary-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Add title
        const title = document.createElement('h5');
        title.className = 'mb-3';
        title.innerHTML = '<i class="bi bi-heart-pulse me-2"></i>Health Summary';
        container.appendChild(title);
        
        // Create metrics grid
        const metricsGrid = document.createElement('div');
        metricsGrid.className = 'row g-3';
        
        // Display basic health info from profile
        if (this.cache.user && this.cache.user.profile) {
            const profile = this.cache.user.profile;
            
            // Blood type
            if (profile.blood_type) {
                metricsGrid.appendChild(this.createMetricItem('Blood Type', profile.blood_type));
            }
            
            // Age
            if (profile.age) {
                metricsGrid.appendChild(this.createMetricItem('Age', `${profile.age} years`));
            }
            
            // BMI if height and weight available
            if (profile.height && profile.weight) {
                const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
                metricsGrid.appendChild(this.createMetricItem('BMI', bmi));
            }
        }
        
        // Display latest vitals if available
        if (data.vital_signs && data.vital_signs.length > 0) {
            const latest = data.vital_signs[0];
            
            if (latest.blood_pressure) {
                metricsGrid.appendChild(this.createMetricItem('Blood Pressure', latest.blood_pressure));
            }
            
            if (latest.heart_rate) {
                metricsGrid.appendChild(this.createMetricItem('Heart Rate', `${latest.heart_rate} bpm`));
            }
            
            if (latest.temperature) {
                metricsGrid.appendChild(this.createMetricItem('Temperature', `${latest.temperature}°C`));
            }
            
            if (latest.oxygen_saturation) {
                metricsGrid.appendChild(this.createMetricItem('O₂ Saturation', `${latest.oxygen_saturation}%`));
            }
        }
        
        container.appendChild(metricsGrid);
        
        // Display allergies if present
        if (this.cache.user && this.cache.user.profile && this.cache.user.profile.allergies) {
            const allergyAlert = document.createElement('div');
            allergyAlert.className = 'alert alert-warning mt-3 mb-0';
            allergyAlert.innerHTML = `
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Allergies:</strong> ${this.cache.user.profile.allergies}
            `;
            container.appendChild(allergyAlert);
        }
    },

    /**
     * Create metric item element
     */
    createMetricItem(label, value) {
        const col = document.createElement('div');
        col.className = 'col-6';
        
        col.innerHTML = `
            <div class="metric-item">
                <span class="text-muted small">${label}</span>
                <p class="mb-0 fw-bold">${value}</p>
            </div>
        `;
        
        return col;
    },

    /**
     * Display empty health summary
     */
    displayEmptyHealthSummary() {
        const container = document.getElementById('health-summary-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-clipboard-heart fs-1 text-muted"></i>
                <p class="mt-2">No health data available</p>
                <button class="btn btn-primary btn-sm" onclick="updateMedicalHistory()">
                    Update Medical History
                </button>
            </div>
        `;
    },

    /**
     * Load medical records (patient only)
     */
    async loadMedicalRecords() {
        try {
            const response = await ApiHelper.makeRequest('/medical/records');
            
            if (response.data) {
                this.cache.medicalRecords = response.data;
                this.displayMedicalRecords(response.data);
            }
        } catch (error) {
            console.error('Error loading medical records:', error);
            this.displayNoMedicalRecords();
        }
    },

    /**
     * Display medical records
     */
    displayMedicalRecords(data) {
        const container = document.getElementById('medical-records-container');
        if (!container) return;
        
        if (!data.diagnoses || data.diagnoses.length === 0) {
            this.displayNoMedicalRecords();
            return;
        }
        
        container.innerHTML = '';
        
        // Add title
        const title = document.createElement('h5');
        title.className = 'mb-3';
        title.innerHTML = '<i class="bi bi-file-medical me-2"></i>Recent Medical Reports';
        container.appendChild(title);
        
        // Create records list
        const list = document.createElement('div');
        list.className = 'records-list';
        
        // Display recent diagnoses
        data.diagnoses.slice(0, 3).forEach(diagnosis => {
            const recordCard = this.createRecordCard(diagnosis);
            list.appendChild(recordCard);
        });
        
        container.appendChild(list);
        
        // Add view all button
        const viewAllBtn = document.createElement('button');
        viewAllBtn.className = 'btn btn-outline-primary btn-sm w-100 mt-3';
        viewAllBtn.textContent = 'View All Records';
        viewAllBtn.onclick = () => viewRecords();
        container.appendChild(viewAllBtn);
    },

    /**
     * Create medical record card
     */
    createRecordCard(diagnosis) {
        const card = document.createElement('div');
        card.className = 'record-item mb-3 p-3 border rounded';
        
        const date = new Date(diagnosis.diagnosis_date);
        
        card.innerHTML = `
            <h6 class="mb-1">${diagnosis.primary_diagnosis}</h6>
            <p class="text-muted small mb-1">
                Dr. ${diagnosis.doctor_name || 'Doctor'} - ${date.toLocaleDateString()}
            </p>
            ${diagnosis.treatment_plan ? 
                `<p class="text-muted small mb-1">${diagnosis.treatment_plan}</p>` : ''}
            <span class="badge bg-${diagnosis.resolved ? 'success' : 'warning'}">
                ${diagnosis.resolved ? 'Resolved' : 'Active'}
            </span>
        `;
        
        return card;
    },

    /**
     * Display no medical records message
     */
    displayNoMedicalRecords() {
        const container = document.getElementById('medical-records-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-file-medical fs-1 text-muted"></i>
                <p class="mt-2">No medical records available</p>
            </div>
        `;
    },

    /**
     * Load patients list (doctor only)
     */
    async loadPatients() {
        try {
            const response = await ApiHelper.makeRequest('/appointments/patients');
            
            if (response.data) {
                this.cache.patients = response.data;
                this.displayPatients(response.data);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    },

    /**
     * Display patients list (doctor dashboard)
     */
    displayPatients(patients) {
        const container = document.getElementById('patients-container');
        if (!container) return;
        
        // Implementation for doctor's patient list
        // This would show recent patients, upcoming consultations, etc.
    },

    /**
     * Load doctor statistics
     */
    async loadDoctorStats() {
        try {
            const response = await ApiHelper.makeRequest('/appointments/stats');
            
            if (response.data) {
                this.cache.stats = response.data;
                this.displayDoctorStats(response.data);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    /**
     * Display doctor statistics
     */
    displayDoctorStats(stats) {
        // Update statistics cards for doctor dashboard
        if (document.getElementById('total-patients')) {
            document.getElementById('total-patients').textContent = stats.total_patients || 0;
        }
        if (document.getElementById('appointments-today')) {
            document.getElementById('appointments-today').textContent = stats.appointments_today || 0;
        }
        if (document.getElementById('consultations-completed')) {
            document.getElementById('consultations-completed').textContent = stats.consultations_completed || 0;
        }
    },

    /**
     * Load user settings from backend
     */
    async loadUserSettings() {
        try {
            const response = await ApiHelper.makeRequest('/users/profile');
            
            if (response.data) {
                this.populateSettingsForm(response.data);
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showError('Failed to load settings');
        }
    },

    /**
     * Populate settings form with user data
     */
    populateSettingsForm(userData) {
        // User info
        if (document.getElementById('fullName')) {
            document.getElementById('fullName').value = userData.full_name || '';
        }
        if (document.getElementById('email')) {
            document.getElementById('email').value = userData.email || '';
        }
        
        // Profile specific info
        if (userData.profile) {
            if (document.getElementById('phone')) {
                document.getElementById('phone').value = userData.profile.phone || '';
            }
            if (document.getElementById('gender')) {
                document.getElementById('gender').value = userData.profile.gender || '';
            }
            
            // For patient: age to approximate date of birth
            if (userData.profile.age && document.getElementById('dateOfBirth')) {
                const birthYear = new Date().getFullYear() - userData.profile.age;
                document.getElementById('dateOfBirth').value = `${birthYear}-01-01`;
            }
            
            // For doctor: specialty and other fields
            if (document.getElementById('specialty')) {
                document.getElementById('specialty').value = userData.profile.specialty || '';
            }
            if (document.getElementById('license_number')) {
                document.getElementById('license_number').value = userData.profile.license_number || '';
            }
        }
        
        // Language preference
        if (document.getElementById('language')) {
            document.getElementById('language').value = userData.language_preference || 'en';
        }
        
        // Notification preferences
        if (userData.profile && userData.profile.notification_preferences) {
            const prefs = userData.profile.notification_preferences;
            if (document.getElementById('emailNotifications')) {
                document.getElementById('emailNotifications').checked = prefs.email_notifications !== false;
            }
            if (document.getElementById('smsNotifications')) {
                document.getElementById('smsNotifications').checked = prefs.sms_notifications !== false;
            }
            if (document.getElementById('appointmentReminders')) {
                document.getElementById('appointmentReminders').checked = prefs.appointment_reminders !== false;
            }
        }
    },

    /**
     * Save user settings to backend
     */
    async saveSettings() {
        try {
            const updateData = {
                full_name: document.getElementById('fullName').value,
                language_preference: document.getElementById('language').value
            };
            
            // Add profile specific fields
            if (document.getElementById('phone')) {
                updateData.phone = document.getElementById('phone').value;
            }
            if (document.getElementById('gender')) {
                updateData.gender = document.getElementById('gender').value;
            }
            
            // Notification preferences
            updateData.notification_preferences = {
                email_notifications: document.getElementById('emailNotifications').checked,
                sms_notifications: document.getElementById('smsNotifications').checked,
                appointment_reminders: document.getElementById('appointmentReminders').checked
            };
            
            const response = await ApiHelper.makeRequest('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(updateData)
            });
            
            if (response.success) {
                this.showSuccess('Settings saved successfully');
                // Reload profile to update display
                await this.loadUserProfile();
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showError('Failed to save settings');
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // TODO: Implement toast notification
        alert(message);
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        console.log(message);
        // TODO: Implement toast notification
        alert(message);
    },

    /**
     * Update dashboard statistics
     */
    updateStatistics() {
        // Update appointment count - ensure appointments is an array
        const appointments = Array.isArray(this.cache.appointments) ? this.cache.appointments : [];
        const appointmentsCount = appointments.filter(apt => 
            apt && apt.appointment_date && new Date(apt.appointment_date) >= new Date() && apt.status === 'scheduled'
        ).length;
        
        // Update prescriptions count - ensure prescriptions is an array
        const prescriptions = Array.isArray(this.cache.prescriptions) ? this.cache.prescriptions : [];
        const prescriptionsCount = prescriptions.filter(p => p && p.status === 'active').length;
        
        // Update medical records count
        const recordsCount = this.cache.medicalRecords 
            ? (this.cache.medicalRecords.diagnoses ? this.cache.medicalRecords.diagnoses.length : 0)
            : 0;
        
        // Update DOM elements
        const appointmentsEl = document.getElementById('stat-appointments-count');
        const prescriptionsEl = document.getElementById('stat-prescriptions-count');
        const recordsEl = document.getElementById('stat-reports-count');
        
        if (appointmentsEl) appointmentsEl.textContent = appointmentsCount;
        if (prescriptionsEl) prescriptionsEl.textContent = prescriptionsCount;
        if (recordsEl) recordsEl.textContent = recordsCount;
    }
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on a dashboard page
    if (document.querySelector('.dashboard-container')) {
        // Wait for API helper to be ready
        if (typeof ApiHelper !== 'undefined') {
            await Dashboard.initialize();
        } else {
            console.error('ApiHelper not loaded');
        }
    }
});

// Export functions for global use
window.Dashboard = Dashboard;
window.loadUserSettings = () => Dashboard.loadUserSettings();
window.saveSettings = () => Dashboard.saveSettings();
window.resetSettings = () => {
    if (confirm('Are you sure you want to reload settings?')) {
        Dashboard.loadUserSettings();
    }
};