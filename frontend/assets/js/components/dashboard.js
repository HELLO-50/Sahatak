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
        try {
            await Promise.all([
                this.loadAppointments(),
                this.loadPatients(),
                this.loadDoctorStats(),
                this.loadWaitingPatients(),
                this.loadRecentActivity()
            ]);
            
            // Update doctor statistics after loading data
            this.updateDoctorStatistics();
        } catch (error) {
            console.error('Error initializing doctor dashboard:', error);
            this.showError('Failed to load some dashboard data');
        }
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
                // Ensure data is always an array
                const patients = Array.isArray(response.data) ? response.data : 
                               (response.data.patients && Array.isArray(response.data.patients)) ? response.data.patients : [];
                
                this.cache.patients = patients;
                this.displayPatients(patients);
            } else {
                this.cache.patients = [];
                this.displayNoPatients();
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            this.cache.patients = [];
            this.displayNoPatients();
        }
    },

    /**
     * Display patients list (doctor dashboard)
     */
    displayPatients(patients) {
        const container = document.getElementById('patients-container');
        if (!container) return;
        
        // Ensure patients is an array
        const patientsArray = Array.isArray(patients) ? patients : [];
        
        if (!patientsArray || patientsArray.length === 0) {
            this.displayNoPatients();
            return;
        }
        
        container.innerHTML = '';
        
        // Add title
        const title = document.createElement('h5');
        title.className = 'mb-3';
        title.innerHTML = '<i class="bi bi-people me-2"></i>Recent Patients';
        container.appendChild(title);
        
        // Create patients list
        const list = document.createElement('div');
        list.className = 'patients-list';
        
        // Display recent patients
        patientsArray.slice(0, 3).forEach(patient => {
            if (patient && patient.id) {
                const patientCard = this.createPatientCard(patient);
                list.appendChild(patientCard);
            }
        });
        
        container.appendChild(list);
        
        // Add view all button if more than 3
        if (patientsArray.length > 3) {
            const viewAllBtn = document.createElement('button');
            viewAllBtn.className = 'btn btn-outline-primary btn-sm w-100 mt-3';
            viewAllBtn.textContent = `View All ${patientsArray.length} Patients`;
            viewAllBtn.onclick = () => window.location.href = '../medical/doctor/patient-list.html';
            container.appendChild(viewAllBtn);
        }
    },

    /**
     * Create patient card element
     */
    createPatientCard(patient) {
        const card = document.createElement('div');
        card.className = 'patient-item mb-3 p-3 border rounded';
        
        const lastAppointment = patient.last_appointment_date ? 
            new Date(patient.last_appointment_date).toLocaleDateString() : 'No recent appointment';
        
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${patient.full_name || 'Patient'}</h6>
                    <p class="text-muted small mb-1">ID: ${patient.patient_id || patient.id}</p>
                    <p class="mb-0 small">
                        <i class="bi bi-calendar me-1"></i>Last visit: ${lastAppointment}
                    </p>
                    ${patient.age ? `<p class="text-muted small mt-1 mb-0">Age: ${patient.age}</p>` : ''}
                </div>
                <div class="text-end">
                    <button class="btn btn-outline-primary btn-sm" onclick="viewPatientRecord('${patient.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    },

    /**
     * Display no patients message
     */
    displayNoPatients() {
        const container = document.getElementById('patients-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-people fs-1 text-muted"></i>
                <p class="mt-2">No patients yet</p>
                <button class="btn btn-primary btn-sm" onclick="openCommunicationHub()">
                    <i class="bi bi-plus me-1"></i>Get Started
                </button>
            </div>
        `;
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
            } else {
                this.cache.stats = {};
                this.displayDoctorStats({});
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.cache.stats = {};
            this.displayDoctorStats({});
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
    },

    /**
     * Update doctor dashboard statistics
     */
    updateDoctorStatistics() {
        if (this.userType !== 'doctor') return;
        
        // Update appointment count - ensure appointments is an array
        const appointments = Array.isArray(this.cache.appointments) ? this.cache.appointments : [];
        const todayAppointments = appointments.filter(apt => {
            if (!apt || !apt.appointment_date) return false;
            const aptDate = new Date(apt.appointment_date);
            const today = new Date();
            return aptDate.toDateString() === today.toDateString() && apt.status === 'scheduled';
        }).length;
        
        // Update patients count - ensure patients is an array
        const patients = Array.isArray(this.cache.patients) ? this.cache.patients : [];
        const totalPatients = patients.length;
        
        // Update stats from backend if available
        const stats = this.cache.stats || {};
        
        // Update DOM elements for doctor dashboard
        const todayAppointmentsEl = document.getElementById('appointments-today');
        const totalPatientsEl = document.getElementById('total-patients');
        const completedConsultationsEl = document.getElementById('consultations-completed');
        
        if (todayAppointmentsEl) todayAppointmentsEl.textContent = stats.appointments_today || todayAppointments;
        if (totalPatientsEl) totalPatientsEl.textContent = stats.total_patients || totalPatients;
        if (completedConsultationsEl) completedConsultationsEl.textContent = stats.consultations_completed || 0;
    },

    /**
     * Load waiting patients (doctor only)
     */
    async loadWaitingPatients() {
        try {
            const response = await ApiHelper.makeRequest('/appointments/waiting');
            
            if (response.data) {
                // Ensure data is always an array
                const waitingPatients = Array.isArray(response.data) ? response.data : 
                                      (response.data.patients && Array.isArray(response.data.patients)) ? response.data.patients : [];
                
                this.displayWaitingPatients(waitingPatients);
            } else {
                this.displayWaitingPatients([]);
            }
        } catch (error) {
            console.error('Error loading waiting patients:', error);
            this.displayWaitingPatients([]);
        }
    },

    /**
     * Display waiting patients
     */
    displayWaitingPatients(patients) {
        const container = document.getElementById('waiting-patients-container');
        if (!container) return;
        
        // Ensure patients is an array
        const patientsArray = Array.isArray(patients) ? patients : [];
        
        if (!patientsArray || patientsArray.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-check-circle fs-1 text-success"></i>
                    <p class="mt-2">No patients waiting</p>
                    <p class="text-muted small">All caught up!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Create waiting patients list
        const list = document.createElement('div');
        list.className = 'waiting-patients-list';
        
        patientsArray.slice(0, 3).forEach(patient => {
            if (patient && patient.id) {
                const patientCard = this.createWaitingPatientCard(patient);
                list.appendChild(patientCard);
            }
        });
        
        container.appendChild(list);
    },

    /**
     * Create waiting patient card
     */
    createWaitingPatientCard(patient) {
        const card = document.createElement('div');
        card.className = 'waiting-patient-item mb-3 p-3 border rounded border-warning';
        
        const waitTime = patient.waiting_since ? 
            this.calculateWaitTime(patient.waiting_since) : 'Unknown';
        
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <h6 class="mb-1">${patient.full_name || 'Patient'}</h6>
                    <p class="text-muted small mb-1">${patient.message_type || 'General inquiry'}</p>
                    <p class="mb-0 small text-warning">
                        <i class="bi bi-clock me-1"></i>Waiting: ${waitTime}
                    </p>
                </div>
                <div class="text-end">
                    <button class="btn btn-warning btn-sm" onclick="respondToPatient('${patient.id}')">
                        <i class="bi bi-reply"></i> Respond
                    </button>
                </div>
            </div>
        `;
        
        return card;
    },

    /**
     * Calculate wait time from timestamp
     */
    calculateWaitTime(timestamp) {
        const now = new Date();
        const waitingSince = new Date(timestamp);
        const diffMs = now - waitingSince;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 60) {
            return `${diffMinutes}m`;
        } else if (diffMinutes < 1440) {
            return `${Math.floor(diffMinutes / 60)}h`;
        } else {
            return `${Math.floor(diffMinutes / 1440)}d`;
        }
    },

    /**
     * Load recent activity (doctor only)
     */
    async loadRecentActivity() {
        try {
            const response = await ApiHelper.makeRequest('/appointments/activity');
            
            if (response.data) {
                // Ensure data is always an array
                const activities = Array.isArray(response.data) ? response.data : 
                                 (response.data.activities && Array.isArray(response.data.activities)) ? response.data.activities : [];
                
                this.displayRecentActivity(activities);
            } else {
                this.displayRecentActivity([]);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            this.displayRecentActivity([]);
        }
    },

    /**
     * Display recent activity
     */
    displayRecentActivity(activities) {
        const container = document.getElementById('recent-activity-container');
        if (!container) return;
        
        // Ensure activities is an array
        const activitiesArray = Array.isArray(activities) ? activities : [];
        
        if (!activitiesArray || activitiesArray.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-activity fs-1 text-muted"></i>
                    <p class="mt-2">No recent activity</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Create activity list
        const list = document.createElement('div');
        list.className = 'activity-list';
        
        activitiesArray.slice(0, 5).forEach(activity => {
            if (activity && activity.id) {
                const activityItem = this.createActivityItem(activity);
                list.appendChild(activityItem);
            }
        });
        
        container.appendChild(list);
    },

    /**
     * Create activity item
     */
    createActivityItem(activity) {
        const item = document.createElement('div');
        item.className = 'activity-item mb-2 p-2 border-start border-3 border-primary';
        
        const timeAgo = activity.created_at ? 
            this.calculateTimeAgo(activity.created_at) : 'Recently';
        
        const activityIcon = this.getActivityIcon(activity.type);
        
        item.innerHTML = `
            <div class="d-flex align-items-start">
                <i class="${activityIcon} me-2 mt-1"></i>
                <div class="flex-grow-1">
                    <p class="mb-1 small">${activity.description || 'Activity occurred'}</p>
                    <p class="mb-0 text-muted smaller">${timeAgo}</p>
                </div>
            </div>
        `;
        
        return item;
    },

    /**
     * Get icon for activity type
     */
    getActivityIcon(type) {
        const iconMap = {
            'appointment': 'bi bi-calendar-check text-primary',
            'prescription': 'bi bi-prescription2 text-success',
            'message': 'bi bi-chat-dots text-info',
            'consultation': 'bi bi-camera-video text-warning',
            'default': 'bi bi-circle-fill text-secondary'
        };
        return iconMap[type] || iconMap.default;
    },

    /**
     * Calculate time ago from timestamp
     */
    calculateTimeAgo(timestamp) {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
        return `${Math.floor(diffMinutes / 1440)}d ago`;
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

// Doctor dashboard specific global functions
window.viewPatientRecord = (patientId) => {
    console.log('Viewing patient record:', patientId);
    window.location.href = `../medical/doctor/patient-record.html?id=${patientId}`;
};

window.respondToPatient = (patientId) => {
    console.log('Responding to patient:', patientId);
    window.location.href = `../medical/doctor/comm-hub.html?patient=${patientId}`;
};

window.bookAppointment = () => {
    console.log('Book appointment clicked');
    window.location.href = '../appointments/book-appointment.html';
};

window.updateMedicalHistory = () => {
    console.log('Update medical history clicked');
    window.location.href = '../medical/medical-history.html';
};

window.viewRecords = () => {
    console.log('View records clicked');
    window.location.href = '../medical/medical-records.html';
};