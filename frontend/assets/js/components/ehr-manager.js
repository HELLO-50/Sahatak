// Electronic Health Record (EHR) Management - Following main.js patterns
const EHRManager = {
    patientId: null,
    ehrData: null,
    charts: {},
    currentTab: 'diagnoses',
    
    // Initialize EHR manager
    async init(patientId) {
        console.log('🟢 EHRManager initializing for patient:', patientId);
        
        this.patientId = patientId;
        
        // Ensure translations are loaded
        if (!LanguageManager.translations || !LanguageManager.translations.ar) {
            await LanguageManager.loadTranslations();
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load EHR data
        await this.loadEHRData();
        
        console.log('✅ EHRManager initialized successfully');
    },
    
    // Load mock EHR data for development mode
    loadMockEHRData() {
        console.log('🔧 Loading mock EHR data for development...');
        
        this.ehrData = this.getDefaultMockData();
        
        this.renderPatientOverview();
        this.renderAllTabs();
        this.showContent(true);
        
        console.log('✅ Mock EHR data loaded successfully');
    },
    
    // Get default mock data structure
    getDefaultMockData() {
        return {
            patient_info: {
                user: { full_name: 'Ahmed Mohamed - Development Patient' },
                age: 35,
                gender: 'male',
                phone: '+249123456789',
                blood_type: 'A+',
                height: 175,
                weight: 78,
                emergency_contact: '+249987654321',
                medical_history_completed: true,
                medical_history: 'No significant medical history',
                allergies: 'Allergic to Penicillin',
                current_medications: 'Vitamin D daily',
                chronic_conditions: null,
                family_history: 'Family history of diabetes',
                surgical_history: null,
                smoking_status: 'never',
                alcohol_consumption: 'none',
                exercise_frequency: 'weekly'
            },
            diagnoses: [
                {
                    id: 1,
                    primary_diagnosis: 'Acute Pharyngitis',
                    severity: 'mild',
                    icd_10_code: 'J02.9',
                    status: 'confirmed',
                    clinical_findings: 'Throat redness, pain when swallowing',
                    treatment_plan: 'Antibiotic for 7 days, rest',
                    diagnosis_date: '2025-01-20T10:00:00Z',
                    doctor_name: 'Dr. Sarah Ahmed',
                    resolved: false,
                    follow_up_required: true,
                    follow_up_date: '2025-01-27',
                    follow_up_notes: 'Follow-up to ensure recovery'
                }
            ],
            vital_signs: [
                {
                    id: 1,
                    measured_at: '2025-01-20T10:00:00Z',
                    systolic_bp: 120,
                    diastolic_bp: 80,
                    heart_rate: 72,
                    temperature: 36.8,
                    respiratory_rate: 16,
                    oxygen_saturation: 98,
                    bmi: 25.1,
                    pain_scale: 3,
                    blood_pressure: '120/80',
                    notes: 'Normal vital signs',
                    recorded_by: 'Nurse Fatima'
                }
            ],
            appointments: [
                {
                    id: 1,
                    appointment_date: '2025-01-20T10:00:00Z',
                    appointment_type: 'video',
                    status: 'completed',
                    reason_for_visit: 'Throat inflammation',
                    diagnosis: 'Acute Pharyngitis',
                    notes: 'Patient improving, continuing treatment',
                    consultation_fee: 150
                }
            ],
            medical_history_updates: [
                {
                    update_type: 'doctor_update',
                    updated_fields: ['current_medications', 'allergies'],
                    notes: 'Updated medications and allergies',
                    created_at: '2025-01-20T10:00:00Z'
                }
            ]
        };
    },
    
    // Get default patient info
    getDefaultPatientInfo() {
        return {
            user: { full_name: 'Ahmed Mohamed - Development Patient' },
            age: 35,
            gender: 'male',
            phone: '+249123456789',
            blood_type: 'A+',
            height: 175,
            weight: 78,
            emergency_contact: '+249987654321',
            medical_history_completed: true,
            medical_history: 'No significant medical history',
            allergies: 'Allergic to Penicillin',
            current_medications: 'Vitamin D daily',
            chronic_conditions: null,
            family_history: 'Family history of diabetes',
            surgical_history: null,
            smoking_status: 'never',
            alcohol_consumption: 'none',
            exercise_frequency: 'weekly'
        };
    },
    
    // Search for patients (for doctors/admin)
    async searchPatients(searchTerm, filters = {}) {
        try {
            const params = new URLSearchParams();
            params.append('search', searchTerm);
            if (filters.age_min) params.append('age_min', filters.age_min);
            if (filters.age_max) params.append('age_max', filters.age_max);
            if (filters.gender) params.append('gender', filters.gender);
            if (filters.condition) params.append('condition', filters.condition);
            
            const response = await ApiHelper.makeRequest(`/ehr/patients/search?${params}`);
            return response;
        } catch (error) {
            console.error('Error searching patients:', error);
            this.showError('Failed to search patients');
            return { success: false, error: error.message };
        }
    },

    // Load comprehensive EHR data
    async loadEHRData() {
        try {
            this.showLoading(true);
            
            const response = await ApiHelper.makeRequest(`/ehr/patient/${this.patientId}`);
            
            if (response.success) {
                this.ehrData = response.data.ehr;
                this.renderPatientOverview();
                this.renderAllTabs();
                this.showContent(true);
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Error loading EHR data:', error);
            this.showAlert('error', 'Failed to load medical record');
            // Redirect back to doctor dashboard
            setTimeout(() => {
                // Check if we're in development mode and provide mock data instead
                if (typeof AuthGuard !== 'undefined' && AuthGuard.isDevelopmentMode()) {
                    console.log('🔧 Development mode: Using mock EHR data instead of redirecting');
                    this.loadMockEHRData();
                    return;
                }
                window.location.href = '../../dashboard/doctor.html';
            }, 2000);
        } finally {
            this.showLoading(false);
        }
    },
    
    // Render patient overview section
    renderPatientOverview() {
        if (!this.ehrData || !this.ehrData.patient_info) return;
        
        const patient = this.ehrData.patient_info;
        const patientInfoEl = document.getElementById('patient-info');
        const overviewEl = document.getElementById('patient-overview');
        
        // Update header
        if (patientInfoEl) {
            const userName = patient.user ? patient.user.full_name : 'Not specified';
            patientInfoEl.textContent = `Patient: ${userName} - Age: ${patient.age} years`;
        }
        
        // Render overview
        if (overviewEl) {
            // Get latest vital signs for most current height/weight
            const latestVitals = this.ehrData.vital_signs && this.ehrData.vital_signs.length > 0 
                ? this.ehrData.vital_signs[0] 
                : null;
            
            // Use latest vital signs data if available, otherwise fall back to patient data
            const currentHeight = latestVitals?.height || patient.height;
            const currentWeight = latestVitals?.weight || patient.weight;
            const bmi = this.calculateBMI(currentHeight, currentWeight);
            
            overviewEl.innerHTML = `
                <div class="patient-basic-info">
                    <div class="info-group">
                        <h6><i class="bi bi-person-badge me-2"></i>Basic Information</h6>
                        <div class="info-item">
                            <span class="info-label">Full Name:</span>
                            <span class="info-value">${patient.user ? patient.user.full_name : 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Age:</span>
                            <span class="info-value">${patient.age} years</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Gender:</span>
                            <span class="info-value">${patient.gender === 'male' ? 'Male' : 'Female'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Phone Number:</span>
                            <span class="info-value">${patient.phone || 'Not specified'}</span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <h6><i class="bi bi-droplet me-2"></i>Medical Information</h6>
                        <div class="info-item">
                            <span class="info-label">Blood Type:</span>
                            <span class="info-value">${patient.blood_type || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Height:</span>
                            <span class="info-value">${currentHeight ? currentHeight + ' cm' : 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Weight:</span>
                            <span class="info-value">${currentWeight ? currentWeight + ' kg' : 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">BMI:</span>
                            <span class="info-value">${bmi || 'Not calculated'}</span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <h6><i class="bi bi-shield-check me-2"></i>Emergency Contact</h6>
                        <div class="info-item">
                            <span class="info-label">Emergency Number:</span>
                            <span class="info-value">${patient.emergency_contact || 'Not specified'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Medical History Status:</span>
                            <span class="info-value">
                                ${patient.medical_history_completed ? 
                                    '<span class="badge bg-success">Complete</span>' : 
                                    '<span class="badge bg-warning">Incomplete</span>'
                                }
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }
    },
    
    // Render all tab contents
    renderAllTabs() {
        this.renderDiagnoses();
        this.renderVitalSigns();
        this.renderMedicalHistory();
        this.renderAppointments();
    },
    
    // Render diagnoses list
    renderDiagnoses() {
        const container = document.getElementById('diagnoses-list');
        if (!container || !this.ehrData.diagnoses) return;
        
        if (this.ehrData.diagnoses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-clipboard-pulse"></i>
                    <h6>No Diagnoses</h6>
                    <p>No diagnoses have been recorded for this patient yet</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.ehrData.diagnoses.forEach(diagnosis => {
            const isActive = !diagnosis.resolved;
            const cardClass = isActive ? 'active-diagnosis' : 'resolved-diagnosis';
            
            html += `
                <div class="diagnosis-card ${cardClass} fade-in-up">
                    <div class="diagnosis-header">
                        <div>
                            <div class="diagnosis-title">${diagnosis.primary_diagnosis}</div>
                            <div class="diagnosis-meta">
                                ${diagnosis.severity ? `<span class="diagnosis-badge severity-${diagnosis.severity}">Severity: ${this.getSeverityEnglish(diagnosis.severity)}</span>` : ''}
                                <span class="diagnosis-badge status-${diagnosis.status}">Status: ${this.getStatusEnglish(diagnosis.status)}</span>
                                ${diagnosis.icd_10_code ? `<span class="diagnosis-badge" style="background: #e3f2fd; color: #1565c0;">ICD-10: ${diagnosis.icd_10_code}</span>` : ''}
                                ${isActive ? '<span class="diagnosis-badge" style="background: #d4edda; color: #155724;">Active</span>' : '<span class="diagnosis-badge" style="background: #f8f9fa; color: #6c757d;">Resolved</span>'}
                            </div>
                        </div>
                        <div class="text-muted small">
                            ${new Date(diagnosis.diagnosis_date).toLocaleDateString('en-US')}
                        </div>
                    </div>
                    
                    <div class="diagnosis-content">
                        ${diagnosis.clinical_findings ? `
                            <div class="diagnosis-section">
                                <h6>Clinical Findings</h6>
                                <p>${diagnosis.clinical_findings}</p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.treatment_plan ? `
                            <div class="diagnosis-section">
                                <h6>Treatment Plan</h6>
                                <p>${diagnosis.treatment_plan}</p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.follow_up_required ? `
                            <div class="diagnosis-section">
                                <h6>Required Follow-up</h6>
                                <p>
                                    ${diagnosis.follow_up_date ? `Follow-up Date: ${new Date(diagnosis.follow_up_date).toLocaleDateString('en-US')}` : 'Follow-up Required'}
                                    ${diagnosis.follow_up_notes ? `<br>Notes: ${diagnosis.follow_up_notes}` : ''}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.resolution_date ? `
                            <div class="diagnosis-section">
                                <h6>Recovery Date</h6>
                                <p>
                                    ${new Date(diagnosis.resolution_date).toLocaleDateString('en-US')}
                                    ${diagnosis.resolution_notes ? `<br>${diagnosis.resolution_notes}` : ''}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div class="diagnosis-actions mt-3 d-flex justify-content-between align-items-center">
                            <div class="text-muted small">
                                <i class="bi bi-person-badge me-1"></i>
                                Doctor: ${diagnosis.doctor_name}
                            </div>
                            <div class="btn-group btn-group-sm">
                                ${!diagnosis.resolved ? `
                                    <button class="btn btn-outline-primary" onclick="editDiagnosis(${diagnosis.id})" title="Edit">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-success" onclick="EHRManager.resolveDiagnosis(${diagnosis.id})" title="وضع علامة كResolved">
                                        <i class="bi bi-check-circle"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-info" onclick="viewDiagnosisDetails(${diagnosis.id})" title="View Details">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Render vital signs with charts
    renderVitalSigns() {
        const container = document.getElementById('vital-signs-list');
        if (!container || !this.ehrData.vital_signs) return;
        
        if (this.ehrData.vital_signs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-activity"></i>
                    <h6>No Vital Signs</h6>
                    <p>No vital signs have been recorded for this patient yet</p>
                </div>
            `;
            return;
        }

        // Create comprehensive vital signs dashboard
        container.innerHTML = `
            <!-- Vital Signs Overview Cards -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="vital-signs-overview">
                        <div class="row g-3">
                            ${this.renderVitalSignCard('blood_pressure', 'Blood Pressure', 'bi-heart-pulse', 'mmHg')}
                            ${this.renderVitalSignCard('heart_rate', 'Heart Rate', 'bi-heart', 'bpm')}
                            ${this.renderVitalSignCard('temperature', 'Temperature', 'bi-thermometer', '°C')}
                            ${this.renderVitalSignCard('respiratory_rate', 'Respiratory Rate', 'bi-lungs', '/min')}
                            ${this.renderVitalSignCard('oxygen_saturation', 'Oxygen Saturation', 'bi-droplet', '%')}
                            ${this.renderVitalSignCard('bmi', 'BMI', 'bi-person', '')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Vital Signs Charts -->
            <div class="row mb-4">
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="bi bi-graph-up me-2"></i>Blood Pressure Trend</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="bloodPressureChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="bi bi-heart me-2"></i>Heart Rate Trend</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="heartRateChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-warning text-dark">
                            <h6 class="mb-0"><i class="bi bi-thermometer me-2"></i>Temperature Trend</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="temperatureChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="bi bi-lungs me-2"></i>Respiratory Rate</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="respiratoryChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-cyan text-white" style="background-color: #0dcaf0 !important;">
                            <h6 class="mb-0"><i class="bi bi-droplet me-2"></i>Oxygen Saturation</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="oxygenChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6 mb-3">
                    <div class="card h-100">
                        <div class="card-header bg-secondary text-white">
                            <h6 class="mb-0"><i class="bi bi-person me-2"></i>BMI Trend</h6>
                        </div>
                        <div class="card-body">
                            <canvas id="bmiChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Vital Signs History -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-clock-history me-2"></i>Vital Signs History</h6>
                        </div>
                        <div class="card-body">
                            <div class="vital-signs-history">
                                ${this.renderVitalSignsHistory()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Render the charts after DOM is updated
        setTimeout(() => {
            this.renderVitalSignsCharts();
        }, 100);
    },

    // Render individual vital sign card
    renderVitalSignCard(field, label, icon, unit) {
        const latestValue = this.getLatestVitalSign(field);
        const trend = this.getVitalSignTrend(field);
        
        return `
            <div class="col-lg-2 col-md-4 col-sm-6">
                <div class="vital-sign-card">
                    <div class="vital-sign-icon">
                        <i class="bi ${icon}"></i>
                    </div>
                    <div class="vital-sign-content">
                        <div class="vital-sign-label">${label}</div>
                        <div class="vital-sign-value">
                            ${latestValue ? `${latestValue}${unit}` : '<span class="text-muted">No data</span>'}
                        </div>
                        <div class="vital-sign-trend ${trend.class}">
                            <i class="bi ${trend.icon}"></i>
                            ${trend.text}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Get latest vital sign value
    getLatestVitalSign(field) {
        if (!this.ehrData.vital_signs || this.ehrData.vital_signs.length === 0) return null;
        
        const latest = this.ehrData.vital_signs[0];
        if (field === 'blood_pressure') {
            return latest.systolic_bp && latest.diastolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp}` : null;
        }
        return latest[field] || null;
    },

    // Get vital sign trend (simplified)
    getVitalSignTrend(field) {
        if (!this.ehrData.vital_signs || this.ehrData.vital_signs.length < 2) {
            return { class: 'text-muted', icon: 'bi-dash', text: 'No trend' };
        }

        const current = this.ehrData.vital_signs[0];
        const previous = this.ehrData.vital_signs[1];
        
        let currentVal, previousVal;
        
        if (field === 'blood_pressure') {
            currentVal = current.systolic_bp;
            previousVal = previous.systolic_bp;
        } else {
            currentVal = current[field];
            previousVal = previous[field];
        }

        if (!currentVal || !previousVal) {
            return { class: 'text-muted', icon: 'bi-dash', text: 'No trend' };
        }

        if (currentVal > previousVal) {
            return { class: 'text-warning', icon: 'bi-arrow-up', text: 'Increasing' };
        } else if (currentVal < previousVal) {
            return { class: 'text-info', icon: 'bi-arrow-down', text: 'Decreasing' };
        } else {
            return { class: 'text-success', icon: 'bi-arrow-right', text: 'Stable' };
        }
    },

    // Render vital signs history table
    renderVitalSignsHistory() {
        let html = '';
        this.ehrData.vital_signs.forEach(vital => {
            html += `
                <div class="vital-signs-card fade-in-up">
                    <div class="vitals-header">
                        <div class="vitals-date">
                            <i class="bi bi-calendar3 me-2"></i>
                            ${new Date(vital.measured_at).toLocaleDateString('en-US')} - 
                            ${new Date(vital.measured_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        ${vital.recorded_by ? `<small class="text-muted">Recorded by: ${vital.recorded_by}</small>` : ''}
                    </div>
                    
                    <div class="vitals-grid">
                        ${vital.blood_pressure ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.blood_pressure}</div>
                                <div class="vital-label">Blood Pressure</div>
                            </div>
                        ` : ''}
                        
                        ${vital.heart_rate ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.heart_rate}</div>
                                <div class="vital-label">Heart Rate</div>
                            </div>
                        ` : ''}
                        
                        ${vital.temperature ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.temperature}°</div>
                                <div class="vital-label">Temperature</div>
                            </div>
                        ` : ''}
                        
                        ${vital.respiratory_rate ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.respiratory_rate}</div>
                                <div class="vital-label">Respiratory Rate</div>
                            </div>
                        ` : ''}
                        
                        ${vital.oxygen_saturation ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.oxygen_saturation}%</div>
                                <div class="vital-label">Oxygen Saturation</div>
                            </div>
                        ` : ''}
                        
                        ${vital.bmi ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.bmi}</div>
                                <div class="vital-label">BMI</div>
                            </div>
                        ` : ''}
                        
                        ${vital.pain_scale !== null && vital.pain_scale !== undefined ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.pain_scale}/10</div>
                                <div class="vital-label">Pain Scale</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${vital.notes ? `<div class="mt-2 text-muted small"><strong>Notes:</strong> ${vital.notes}</div>` : ''}
                </div>
            `;
        });
        
        return html;
    },
    
    // Create vital signs charts
    createVitalSignsCharts() {
        if (!this.ehrData.vital_signs || this.ehrData.vital_signs.length === 0) return;
        
        const vitals = this.ehrData.vital_signs.reverse(); // Oldest first for charts
        
        // Blood Pressure Chart
        this.createBloodPressureChart(vitals);
        
        // Heart Rate Chart
        this.createHeartRateChart(vitals);
        
        // Temperature Chart
        this.createTemperatureChart(vitals);
        
        // Respiratory Rate Chart
        this.createRespiratoryRateChart(vitals);
        
        // Oxygen Saturation Chart
        this.createOxygenSaturationChart(vitals);
        
        // BMI Chart
        this.createBMIChart(vitals);
    },
    
    // Create blood pressure chart
    createBloodPressureChart(vitals) {
        const ctx = document.getElementById('bloodPressureChart');
        if (!ctx) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded');
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Error: Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.systolic_bp && v.diastolic_bp);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Insufficient data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString('en-US')),
                datasets: [
                    {
                        label: 'Systolic',
                        data: data.map(v => v.systolic_bp),
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Diastolic',
                        data: data.map(v => v.diastolic_bp),
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 40,
                        max: 200
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },
    
    // Create heart rate chart
    createHeartRateChart(vitals) {
        const ctx = document.getElementById('heartRateChart');
        if (!ctx) return;
        
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded');
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Error: Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.heart_rate);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Insufficient data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString('en-US')),
                datasets: [{
                    label: 'Heart Rate',
                    data: data.map(v => v.heart_rate),
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 40,
                        max: 150
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },

    // Create temperature chart
    createTemperatureChart(vitals) {
        const ctx = document.getElementById('temperatureChart');
        if (!ctx) return;
        
        if (typeof Chart === 'undefined') {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.temperature);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">No temperature data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString()),
                datasets: [{
                    label: 'Temperature (°C)',
                    data: data.map(v => v.temperature),
                    borderColor: '#ffc107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 35,
                        max: 42
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },

    // Create respiratory rate chart
    createRespiratoryRateChart(vitals) {
        const ctx = document.getElementById('respiratoryChart');
        if (!ctx) return;
        
        if (typeof Chart === 'undefined') {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.respiratory_rate);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">No respiratory rate data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString()),
                datasets: [{
                    label: 'Respiratory Rate (/min)',
                    data: data.map(v => v.respiratory_rate),
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 10,
                        max: 40
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },

    // Create oxygen saturation chart
    createOxygenSaturationChart(vitals) {
        const ctx = document.getElementById('oxygenChart');
        if (!ctx) return;
        
        if (typeof Chart === 'undefined') {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.oxygen_saturation);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">No oxygen saturation data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString()),
                datasets: [{
                    label: 'Oxygen Saturation (%)',
                    data: data.map(v => v.oxygen_saturation),
                    borderColor: '#0dcaf0',
                    backgroundColor: 'rgba(13, 202, 240, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 85,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },

    // Create BMI chart
    createBMIChart(vitals) {
        const ctx = document.getElementById('bmiChart');
        if (!ctx) return;
        
        if (typeof Chart === 'undefined') {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">Charts library not available</p>';
            return;
        }
        
        const data = vitals.filter(v => v.bmi);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">No BMI data available</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString()),
                datasets: [{
                    label: 'BMI',
                    data: data.map(v => v.bmi),
                    borderColor: '#6c757d',
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 15,
                        max: 35
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    },
    
    // Render medical history
    renderMedicalHistory() {
        const container = document.getElementById('medical-history-content');
        if (!container || !this.ehrData.patient_info) return;
        
        const patient = this.ehrData.patient_info;
        
        const sections = [
            {
                title: 'General Medical History',
                icon: 'journal-medical',
                items: [
                    { label: 'Medical History', value: patient.medical_history },
                    { label: 'Allergies', value: patient.allergies },
                    { label: 'Current Medications', value: patient.current_medications }
                ]
            },
            {
                title: 'Chronic Conditions and Family History',
                icon: 'people',
                items: [
                    { label: 'Chronic Conditions', value: patient.chronic_conditions },
                    { label: 'Family History', value: patient.family_history },
                    { label: 'Surgical History', value: patient.surgical_history }
                ]
            },
            {
                title: 'Lifestyle',
                icon: 'activity',
                items: [
                    { label: 'Smoking', value: this.getSmokingStatusEnglish(patient.smoking_status) },
                    { label: 'Alcohol Consumption', value: this.getAlcoholConsumptionEnglish(patient.alcohol_consumption) },
                    { label: 'Exercise Frequency', value: this.getExerciseFrequencyEnglish(patient.exercise_frequency) }
                ]
            }
        ];
        
        let html = '';
        sections.forEach(section => {
            const hasContent = section.items.some(item => item.value);
            
            html += `
                <div class="history-section">
                    <div class="history-section-header">
                        <h6 class="history-section-title">
                            <i class="bi bi-${section.icon} me-2"></i>${section.title}
                        </h6>
                    </div>
                    <div class="history-section-content">
                        ${hasContent ? `
                            <ul class="history-list">
                                ${section.items.map(item => item.value ? `
                                    <li class="history-item">
                                        <div class="history-content">
                                            <div class="history-label">${item.label}:</div>
                                            <div class="history-value">${item.value}</div>
                                        </div>
                                    </li>
                                ` : '').join('')}
                            </ul>
                        ` : `
                            <p class="text-muted mb-0">No information available in this section</p>
                        `}
                    </div>
                </div>
            `;
        });
        
        // Add history updates
        if (this.ehrData.medical_history_updates && this.ehrData.medical_history_updates.length > 0) {
            html += `
                <div class="history-section">
                    <div class="history-section-header">
                        <h6 class="history-section-title">
                            <i class="bi bi-clock-history me-2"></i>Recent Updates
                        </h6>
                    </div>
                    <div class="history-section-content">
                        <ul class="history-list">
                            ${this.ehrData.medical_history_updates.map(update => `
                                <li class="history-item">
                                    <div class="history-content">
                                        <div class="history-label">Update Type: ${this.getUpdateTypeEnglish(update.update_type)}</div>
                                        <div class="history-value">
                                            Updated Fields: ${update.updated_fields.join(', ')}
                                            ${update.notes ? `<br>Notes: ${update.notes}` : ''}
                                        </div>
                                    </div>
                                    <div class="history-date">
                                        ${new Date(update.created_at).toLocaleDateString('en-US')}
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    // Render appointments
    renderAppointments() {
        const container = document.getElementById('appointments-list');
        if (!container || !this.ehrData.appointments) return;
        
        if (this.ehrData.appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-calendar-event"></i>
                    <h6>لا توجد مواعيد</h6>
                    <p>لا توجد مواعيد مسجلة لهذا المريض</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.ehrData.appointments.forEach(appointment => {
            html += `
                <div class="appointment-card fade-in-up">
                    <div class="appointment-header">
                        <div class="appointment-date">
                            <i class="bi bi-calendar3 me-2"></i>
                            ${new Date(appointment.appointment_date).toLocaleDateString('en-US')} - 
                            ${new Date(appointment.appointment_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span class="appointment-status status-${appointment.status}">
                            ${this.getAppointmentStatusArabic(appointment.status)}
                        </span>
                    </div>
                    
                    <div class="appointment-details">
                        <div><strong>النوع:</strong> ${this.getAppointmentTypeEnglish(appointment.appointment_type)}</div>
                        ${appointment.reason_for_visit ? `<div><strong>سبب الزيارة:</strong> ${appointment.reason_for_visit}</div>` : ''}
                        ${appointment.diagnosis ? `<div><strong>التشخيص:</strong> ${appointment.diagnosis}</div>` : ''}
                        ${appointment.notes ? `<div><strong>Notes:</strong> ${appointment.notes}</div>` : ''}
                        ${appointment.consultation_fee ? `<div><strong>الأجر:</strong> ${appointment.consultation_fee} ج.س</div>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Diagnosis form
        const diagnosisForm = document.getElementById('diagnosis-form');
        if (diagnosisForm) {
            diagnosisForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveDiagnosis();
            });
        }
        
        // Vital signs form
        const vitalsForm = document.getElementById('vitals-form');
        if (vitalsForm) {
            vitalsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveVitalSigns();
            });
        }
        
        // Follow-up checkbox
        const followUpCheckbox = document.getElementById('follow_up_required');
        const followUpDate = document.getElementById('follow_up_date');
        if (followUpCheckbox && followUpDate) {
            followUpCheckbox.addEventListener('change', (e) => {
                followUpDate.disabled = !e.target.checked;
                if (!e.target.checked) {
                    followUpDate.value = '';
                }
            });
        }
    },
    
    // Save diagnosis (create new or update existing)
    async saveDiagnosis() {
        try {
            const form = document.getElementById('diagnosis-form');
            const editingId = form.dataset.editingId;
            const isEditing = !!editingId;
            
            const formData = {
                patient_id: this.patientId,
                primary_diagnosis: document.getElementById('primary_diagnosis').value.trim(),
                severity: document.getElementById('severity').value,
                icd_10_code: document.getElementById('icd_10_code').value.trim(),
                status: document.getElementById('status').value,
                clinical_findings: document.getElementById('clinical_findings').value.trim(),
                treatment_plan: document.getElementById('treatment_plan').value.trim(),
                follow_up_required: document.getElementById('follow_up_required').checked,
                follow_up_date: document.getElementById('follow_up_date').value,
                follow_up_notes: document.getElementById('follow_up_notes').value.trim()
            };
            
            // Validate primary diagnosis length (minimum 10 characters required by backend)
            if (!formData.primary_diagnosis || formData.primary_diagnosis.length < 10) {
                throw new Error('Primary diagnosis must be at least 10 characters long');
            }
            
            // Debug: Log the data being sent
            console.log('📋 Diagnosis data being sent:', formData);
            console.log('🔍 Patient ID:', formData.patient_id);
            console.log('🔍 Primary diagnosis:', formData.primary_diagnosis);
            console.log('🔍 Is editing:', isEditing);
            
            // Show loading state
            const saveBtn = document.getElementById('save-diagnosis-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الحفظ...';
            saveBtn.disabled = true;
            
            let response;
            if (isEditing) {
                response = await ApiHelper.makeRequest(`/ehr/diagnoses/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
            } else {
                response = await ApiHelper.makeRequest('/ehr/diagnoses', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            }
            
            if (response.success) {
                this.showAlert('success', isEditing ? 'تم تحديث التشخيص بنجاح' : 'تم حفظ التشخيص بنجاح');
                
                // Close modal and refresh data
                const modal = bootstrap.Modal.getInstance(document.getElementById('diagnosisModal'));
                if (modal) modal.hide();
                
                // Reset form and editing state
                document.getElementById('diagnosis-form').reset();
                delete form.dataset.editingId;
                
                // Reset modal title and button text
                document.querySelector('#diagnosisModal .modal-title').textContent = 'إضافة تشخيص جديد';
                document.getElementById('save-diagnosis-btn').innerHTML = '<i class="bi bi-check-circle me-1"></i>حفظ التشخيص';
                
                // Reload EHR data
                await this.loadEHRData();
            } else {
                // Better error handling for validation errors
                const errorMsg = response.message || 'فشل في حفظ التشخيص';
                const fieldError = response.error_code === 'VALIDATION_ERROR' && response.field 
                    ? `خطأ في ${response.field}: ${errorMsg}` 
                    : errorMsg;
                throw new Error(fieldError);
            }
            
        } catch (error) {
            console.error('Error saving diagnosis:', error);
            console.error('🚨 Full error details:', {
                message: error.message,
                statusCode: error.statusCode,
                errorCode: error.errorCode,
                field: error.field
            });
            this.showAlert('error', error.message || 'فشل في حفظ التشخيص');
        } finally {
            // Reset button
            const saveBtn = document.getElementById('save-diagnosis-btn');
            if (saveBtn) {
                saveBtn.innerHTML = saveBtn.innerHTML.includes('تحديث') ? 
                    '<i class="bi bi-check-circle me-1"></i>تحديث التشخيص' : 
                    '<i class="bi bi-check-circle me-1"></i>حفظ التشخيص';
                saveBtn.disabled = false;
            }
        }
    },
    
    // Save vital signs
    async saveVitalSigns() {
        try {
            const formData = {
                patient_id: this.patientId,
                systolic_bp: document.getElementById('systolic_bp').value || null,
                diastolic_bp: document.getElementById('diastolic_bp').value || null,
                heart_rate: document.getElementById('heart_rate').value || null,
                temperature: document.getElementById('temperature').value || null,
                respiratory_rate: document.getElementById('respiratory_rate').value || null,
                oxygen_saturation: document.getElementById('oxygen_saturation').value || null,
                height: document.getElementById('height').value || null,
                weight: document.getElementById('weight').value || null,
                pain_scale: document.getElementById('pain_scale').value || null,
                pain_location: document.getElementById('pain_location').value || null,
                notes: document.getElementById('vitals_notes').value || null
            };
            
            // Show loading state
            const saveBtn = document.getElementById('save-vitals-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الحفظ...';
            saveBtn.disabled = true;
            
            const response = await ApiHelper.makeRequest('/ehr/vital-signs', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            if (response.success) {
                this.showAlert('success', 'تم حفظ العلامات الحيوية بنجاح');
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('vitalsModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('vitals-form').reset();
                
                // Add the new vital signs to the existing data instead of reloading
                if (response.data && response.data.vital_signs) {
                    // Add to beginning of array (most recent first)
                    this.ehrData.vital_signs = this.ehrData.vital_signs || [];
                    this.ehrData.vital_signs.unshift(response.data.vital_signs);
                    
                    // Re-render the displays
                    this.renderPatientOverview();
                    this.renderVitalSigns();
                } else {
                    // Fallback: try to reload data, but don't fail if it doesn't work
                    try {
                        await this.loadEHRData();
                    } catch (error) {
                        console.warn('Could not reload EHR data, but vital signs were saved successfully');
                        // Just refresh the displays with existing data
                        this.renderPatientOverview();
                        this.renderVitalSigns();
                    }
                }
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Error saving vital signs:', error);
            this.showAlert('error', error.message || 'فشل في حفظ العلامات الحيوية');
        } finally {
            // Reset button
            const saveBtn = document.getElementById('save-vitals-btn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>حفظ القراءات';
                saveBtn.disabled = false;
            }
        }
    },
    
    // Update diagnosis (edit existing diagnosis)
    async updateDiagnosis(diagnosisId, formData) {
        try {
            const response = await ApiHelper.makeRequest(`/ehr/diagnoses/${diagnosisId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            if (response.success) {
                this.showAlert('success', 'تم تحديث التشخيص بنجاح');
                await this.loadEHRData();
                return true;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error updating diagnosis:', error);
            this.showAlert('error', error.message || 'فشل في تحديث التشخيص');
            return false;
        }
    },

    // Mark diagnosis as resolved
    async resolveDiagnosis(diagnosisId, resolutionNotes = '') {
        if (!confirm('هل أنت متأكد من أن هذا التشخيص قد تم حله؟')) {
            return;
        }

        try {
            const response = await ApiHelper.makeRequest(`/ehr/diagnoses/${diagnosisId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    resolved: true,
                    resolution_notes: resolutionNotes
                })
            });

            if (response.success) {
                this.showAlert('success', 'تم وضع علامة على التشخيص كResolved');
                await this.loadEHRData();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error resolving diagnosis:', error);
            this.showAlert('error', error.message || 'فشل في تحديث حالة التشخيص');
        }
    },

    // Generate EHR summary report
    generateEHRSummary() {
        if (!this.ehrData) return null;

        const summary = {
            patient_info: this.ehrData.patient_info,
            active_diagnoses: this.ehrData.diagnoses?.filter(d => !d.resolved) || [],
            resolved_diagnoses: this.ehrData.diagnoses?.filter(d => d.resolved) || [],
            latest_vitals: this.ehrData.vital_signs?.[0] || null,
            recent_appointments: this.ehrData.appointments?.slice(0, 3) || [],
            health_metrics: this.calculateHealthMetrics(),
            risk_factors: this.identifyRiskFactors()
        };

        return summary;
    },

    // Calculate health metrics from vital signs
    calculateHealthMetrics() {
        if (!this.ehrData.vital_signs || this.ehrData.vital_signs.length === 0) {
            return null;
        }

        const vitals = this.ehrData.vital_signs;
        const latest = vitals[0];
        
        // Calculate averages for recent vitals (last 5 readings)
        const recentVitals = vitals.slice(0, 5);
        
        const metrics = {
            bmi: latest?.bmi || this.calculateBMI(latest?.height, latest?.weight),
            bmi_category: this.getBMICategory(latest?.bmi),
            blood_pressure_status: this.getBloodPressureStatus(latest?.systolic_bp, latest?.diastolic_bp),
            heart_rate_status: this.getHeartRateStatus(latest?.heart_rate),
            temperature_status: this.getTemperatureStatus(latest?.temperature)
        };

        // Calculate trends if we have enough data
        if (recentVitals.length >= 3) {
            metrics.bp_trend = this.calculateBPTrend(recentVitals);
            metrics.weight_trend = this.calculateWeightTrend(recentVitals);
        }

        return metrics;
    },

    // Identify health risk factors
    identifyRiskFactors() {
        const patient = this.ehrData.patient_info;
        const risks = [];

        // Age-related risks
        if (patient.age > 65) {
            risks.push({ type: 'age', level: 'medium', description: 'كبار السن - مراقبة صحية إضافية مطلوبة' });
        }

        // Lifestyle risks
        if (patient.smoking_status === 'current') {
            risks.push({ type: 'lifestyle', level: 'high', description: 'Smoking - خطر عالي على القلب والرئتين' });
        }

        if (patient.alcohol_consumption === 'heavy') {
            risks.push({ type: 'lifestyle', level: 'high', description: 'الإفراط في شرب الكحول' });
        }

        if (patient.exercise_frequency === 'none') {
            risks.push({ type: 'lifestyle', level: 'medium', description: 'قلة النشاط البدني' });
        }

        // Medical history risks
        if (patient.chronic_conditions) {
            risks.push({ type: 'medical', level: 'high', description: 'وجود حالات مزمنة تتطلب متابعة' });
        }

        if (patient.family_history && (patient.family_history.includes('diabetes') || patient.family_history.includes('سكري'))) {
            risks.push({ type: 'genetic', level: 'medium', description: 'تاريخ عائلي لمرض السكري' });
        }

        // Vital signs risks
        const latestVitals = this.ehrData.vital_signs?.[0];
        if (latestVitals) {
            if (latestVitals.systolic_bp > 140 || latestVitals.diastolic_bp > 90) {
                risks.push({ type: 'vitals', level: 'high', description: 'ارتفاع Blood Pressure' });
            }
            
            if (latestVitals.bmi > 30) {
                risks.push({ type: 'vitals', level: 'medium', description: 'السمنة - BMI مرتفع' });
            }
        }

        return risks;
    },

    // Export EHR data as PDF (placeholder for future implementation)
    async exportEHRToPDF() {
        const summary = this.generateEHRSummary();
        
        // For now, we'll create a simple text export
        // In a full implementation, you would use a PDF library like jsPDF
        let exportText = `سجل طبي إلكتروني - ${summary.patient_info.user?.full_name}\n`;
        exportText += `التاريخ: ${new Date().toLocaleDateString('en-US')}\n\n`;
        
        exportText += `المعلومات الأساسية:\n`;
        exportText += `العمر: ${summary.patient_info.age}\n`;
        exportText += `الجنس: ${summary.patient_info.gender === 'male' ? 'ذكر' : 'أنثى'}\n`;
        exportText += `فصيلة الدم: ${summary.patient_info.blood_type || 'غير محددة'}\n\n`;
        
        if (summary.active_diagnoses.length > 0) {
            exportText += `التشخيصات الActiveة:\n`;
            summary.active_diagnoses.forEach(diagnosis => {
                exportText += `- ${diagnosis.primary_diagnosis}\n`;
            });
            exportText += '\n';
        }
        
        if (summary.latest_vitals) {
            exportText += `آخر العلامات الحيوية:\n`;
            if (summary.latest_vitals.blood_pressure) {
                exportText += `Blood Pressure: ${summary.latest_vitals.blood_pressure}\n`;
            }
            if (summary.latest_vitals.heart_rate) {
                exportText += `Heart Rate: ${summary.latest_vitals.heart_rate}\n`;
            }
            exportText += '\n';
        }

        // Create and download the file
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ehr_${this.patientId}_${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);

        this.showAlert('success', 'تم تصدير السجل الطبي بنجاح');
    },

    // Search within EHR data
    searchEHR(query) {
        if (!query || !this.ehrData) return null;
        
        const results = {
            diagnoses: [],
            appointments: [],
            medical_history: []
        };
        
        const searchTerm = query.toLowerCase();
        
        // Search diagnoses
        this.ehrData.diagnoses?.forEach(diagnosis => {
            if (diagnosis.primary_diagnosis.toLowerCase().includes(searchTerm) ||
                (diagnosis.clinical_findings && diagnosis.clinical_findings.toLowerCase().includes(searchTerm)) ||
                (diagnosis.treatment_plan && diagnosis.treatment_plan.toLowerCase().includes(searchTerm))) {
                results.diagnoses.push(diagnosis);
            }
        });
        
        // Search appointments
        this.ehrData.appointments?.forEach(appointment => {
            if ((appointment.reason_for_visit && appointment.reason_for_visit.toLowerCase().includes(searchTerm)) ||
                (appointment.diagnosis && appointment.diagnosis.toLowerCase().includes(searchTerm)) ||
                (appointment.notes && appointment.notes.toLowerCase().includes(searchTerm))) {
                results.appointments.push(appointment);
            }
        });
        
        // Search medical history
        const patient = this.ehrData.patient_info;
        if (patient.medical_history && patient.medical_history.toLowerCase().includes(searchTerm)) {
            results.medical_history.push({ field: 'medical_history', value: patient.medical_history });
        }
        if (patient.allergies && patient.allergies.toLowerCase().includes(searchTerm)) {
            results.medical_history.push({ field: 'allergies', value: patient.allergies });
        }
        if (patient.current_medications && patient.current_medications.toLowerCase().includes(searchTerm)) {
            results.medical_history.push({ field: 'current_medications', value: patient.current_medications });
        }
        
        return results;
    },

    // Helper functions
    calculateBMI(height, weight) {
        if (!height || !weight) return null;
        const heightM = height / 100;
        const bmi = (weight / (heightM * heightM)).toFixed(1);
        return bmi;
    },

    getBMICategory(bmi) {
        if (!bmi) return null;
        if (bmi < 18.5) return 'نقص الوزن';
        if (bmi < 25) return 'وزن طبيعي';
        if (bmi < 30) return 'زيادة وزن';
        return 'سمنة';
    },

    getBloodPressureStatus(systolic, diastolic) {
        if (!systolic || !diastolic) return null;
        if (systolic < 120 && diastolic < 80) return 'طبيعي';
        if (systolic < 130 && diastolic < 80) return 'مرتفع قليلاً';
        if (systolic < 140 || diastolic < 90) return 'ارتفاع المرحلة الأولى';
        return 'ارتفاع المرحلة الثانية';
    },

    getHeartRateStatus(heartRate) {
        if (!heartRate) return null;
        if (heartRate < 60) return 'بطء القلب';
        if (heartRate <= 100) return 'طبيعي';
        return 'سرعة القلب';
    },

    getTemperatureStatus(temperature) {
        if (!temperature) return null;
        if (temperature < 36) return 'منخفضة';
        if (temperature <= 37.5) return 'طبيعية';
        if (temperature <= 38.5) return 'حمى خفيفة';
        return 'حمى شديدة';
    },

    calculateBPTrend(vitals) {
        const systolicValues = vitals.map(v => v.systolic_bp).filter(v => v);
        if (systolicValues.length < 2) return null;
        
        const recent = systolicValues.slice(0, Math.floor(systolicValues.length / 2));
        const older = systolicValues.slice(Math.floor(systolicValues.length / 2));
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg + 5) return 'ارتفاع';
        if (recentAvg < olderAvg - 5) return 'انخفاض';
        return 'مستقر';
    },

    calculateWeightTrend(vitals) {
        const weightValues = vitals.map(v => v.weight).filter(v => v);
        if (weightValues.length < 2) return null;
        
        const recent = weightValues.slice(0, Math.floor(weightValues.length / 2));
        const older = weightValues.slice(Math.floor(weightValues.length / 2));
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg + 2) return 'زيادة';
        if (recentAvg < olderAvg - 2) return 'نقصان';
        return 'مستقر';
    },
    
    getSeverityEnglish(severity) {
        const severityMap = {
            'mild': 'خفيفة',
            'moderate': 'متوسطة',
            'severe': 'شديدة',
            'critical': 'حرجة'
        };
        return severityMap[severity] || severity;
    },
    
    getStatusEnglish(status) {
        const statusMap = {
            'provisional': 'مبدئي',
            'confirmed': 'مؤكد',
            'differential': 'تشخيص تفريقي',
            'rule_out': 'استبعاد'
        };
        return statusMap[status] || status;
    },
    
    getSmokingStatusEnglish(status) {
        const statusMap = {
            'never': 'لا يدخن',
            'former': 'مدخن سابق',
            'current': 'مدخن حالياً'
        };
        return statusMap[status] || 'غير محدد';
    },
    
    getAlcoholConsumptionEnglish(consumption) {
        const consumptionMap = {
            'none': 'لا يستهلك',
            'occasional': 'أحياناً',
            'moderate': 'معتدل',
            'heavy': 'كثير'
        };
        return consumptionMap[consumption] || 'غير محدد';
    },
    
    getExerciseFrequencyEnglish(frequency) {
        const frequencyMap = {
            'none': 'لا يمارس',
            'rare': 'نادراً',
            'weekly': 'أسبوعياً',
            'daily': 'يومياً'
        };
        return frequencyMap[frequency] || 'غير محدد';
    },
    
    getUpdateTypeEnglish(type) {
        const typeMap = {
            'initial_registration': 'التسجيل الأولي',
            'appointment_update': 'تحديث خلال الموعد',
            'patient_self_update': 'تحديث من المريض',
            'doctor_update': 'تحديث من الطبيب'
        };
        return typeMap[type] || type;
    },
    
    getAppointmentStatusArabic(status) {
        const statusMap = {
            'scheduled': 'مجدول',
            'confirmed': 'مؤكد',
            'in_progress': 'جاري',
            'completed': 'مكتمل',
            'cancelled': 'ملغي',
            'no_show': 'لم يحضر'
        };
        return statusMap[status] || status;
    },
    
    getAppointmentTypeEnglish(type) {
        const typeMap = {
            'video': 'مكالمة فيديو',
            'audio': 'مكالمة صوتية',
            'chat': 'محادثة نصية'
        };
        return typeMap[type] || type;
    },
    
    showLoading(show) {
        const loadingContainer = document.getElementById('loading-container');
        const contentContainer = document.getElementById('ehr-content');
        
        if (show) {
            loadingContainer?.classList.remove('d-none');
            contentContainer?.classList.add('d-none');
        } else {
            loadingContainer?.classList.add('d-none');
        }
    },
    
    showContent(show) {
        const contentContainer = document.getElementById('ehr-content');
        const searchContainer = document.getElementById('search-container');
        if (show && contentContainer) {
            contentContainer.classList.remove('d-none');
            if (searchContainer) {
                searchContainer.classList.remove('d-none');
            }
        }
    },
    
    // Generate medical timeline from all EHR data
    generateMedicalTimeline() {
        if (!this.ehrData) return [];
        
        const timeline = [];
        
        // Add diagnoses to timeline
        this.ehrData.diagnoses?.forEach(diagnosis => {
            timeline.push({
                date: diagnosis.diagnosis_date,
                type: 'diagnosis',
                title: 'تشخيص جديد',
                description: diagnosis.primary_diagnosis,
                data: diagnosis
            });
            
            if (diagnosis.resolution_date) {
                timeline.push({
                    date: diagnosis.resolution_date,
                    type: 'diagnosis',
                    title: 'حل التشخيص',
                    description: `تم حل: ${diagnosis.primary_diagnosis}`,
                    data: diagnosis
                });
            }
        });
        
        // Add vital signs to timeline
        this.ehrData.vital_signs?.forEach(vital => {
            const measurements = [];
            if (vital.blood_pressure) measurements.push(`Blood Pressure: ${vital.blood_pressure}`);
            if (vital.heart_rate) measurements.push(`Heart Rate: ${vital.heart_rate}`);
            if (vital.temperature) measurements.push(`الحرارة: ${vital.temperature}°`);
            
            timeline.push({
                date: vital.measured_at,
                type: 'vital',
                title: 'قياس العلامات الحيوية',
                description: measurements.join(', '),
                data: vital
            });
        });
        
        // Add appointments to timeline
        this.ehrData.appointments?.forEach(appointment => {
            timeline.push({
                date: appointment.appointment_date,
                type: 'appointment',
                title: `موعد طبي - ${this.getAppointmentTypeEnglish(appointment.appointment_type)}`,
                description: appointment.reason_for_visit || 'زيارة طبية',
                data: appointment
            });
        });
        
        // Sort timeline by date (newest first)
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        return timeline;
    },
    
    // Enhanced prescription integration
    async getPrescriptionsForPatient() {
        try {
            const response = await ApiHelper.makeRequest(`/prescriptions/patient/${this.patientId}`);
            if (response.success) {
                return response.data.prescriptions || [];
            }
        } catch (error) {
            console.error('Error loading prescriptions:', error);
        }
        return [];
    },
    
    // Enhanced appointment integration
    async getAppointmentsForPatient() {
        try {
            const response = await ApiHelper.makeRequest(`/appointments/patient/${this.patientId}`);
            if (response.success) {
                return response.data.appointments || [];
            }
        } catch (error) {
            console.error('Error loading appointments:', error);
        }
        return [];
    },
    
    // Calculate comprehensive health score
    calculateHealthScore() {
        let score = 100; // Start with perfect score
        const patient = this.ehrData.patient_info;
        const latestVitals = this.ehrData.vital_signs?.[0];
        const activeDiagnoses = this.ehrData.diagnoses?.filter(d => !d.resolved) || [];
        
        // Deduct points for active diagnoses
        score -= activeDiagnoses.length * 10;
        
        // Deduct points for vital signs outside normal range
        if (latestVitals) {
            if (latestVitals.systolic_bp > 140 || latestVitals.diastolic_bp > 90) score -= 15;
            if (latestVitals.bmi > 30) score -= 10;
            if (latestVitals.heart_rate > 100 || latestVitals.heart_rate < 60) score -= 5;
        }
        
        // Deduct points for lifestyle factors
        if (patient.smoking_status === 'current') score -= 20;
        if (patient.exercise_frequency === 'none') score -= 10;
        if (patient.chronic_conditions) score -= 15;
        
        return Math.max(0, Math.min(100, score));
    },
    
    // Enhanced search with filters
    searchEHRWithFilters(query, filters = {}) {
        if (!query || !this.ehrData) return null;
        
        const results = this.searchEHR(query);
        
        // Apply date filters
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            results.diagnoses = results.diagnoses.filter(d => new Date(d.diagnosis_date) >= fromDate);
            results.appointments = results.appointments.filter(a => new Date(a.appointment_date) >= fromDate);
        }
        
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            results.diagnoses = results.diagnoses.filter(d => new Date(d.diagnosis_date) <= toDate);
            results.appointments = results.appointments.filter(a => new Date(a.appointment_date) <= toDate);
        }
        
        // Apply status filters
        if (filters.diagnosisStatus) {
            results.diagnoses = results.diagnoses.filter(d => 
                filters.diagnosisStatus === 'active' ? !d.resolved : d.resolved
            );
        }
        
        return results;
    },
    
    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' :
                          type === 'info' ? 'alert-info' : 'alert-success';
        const icon = type === 'error' ? 'exclamation-triangle' : 
                     type === 'warning' ? 'exclamation-triangle-fill' :
                     type === 'info' ? 'info-circle' : 'check-circle';
        
        const alert = document.createElement('div');
        alert.className = `alert ${alertClass} alert-dismissible fade show`;
        alert.innerHTML = `
            <i class="bi bi-${icon} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(alert);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
};

// Global functions for HTML onclick events
function addNewDiagnosis() {
    const modal = new bootstrap.Modal(document.getElementById('diagnosisModal'));
    modal.show();
}

function recordVitalSigns() {
    const modal = new bootstrap.Modal(document.getElementById('vitalsModal'));
    modal.show();
}

function printEHR() {
    window.print();
}

function editDiagnosis(diagnosisId) {
    // Find the diagnosis data
    const diagnosis = EHRManager.ehrData.diagnoses.find(d => d.id === diagnosisId);
    if (!diagnosis) return;
    
    // Populate the form with existing data
    document.getElementById('primary_diagnosis').value = diagnosis.primary_diagnosis || '';
    document.getElementById('severity').value = diagnosis.severity || '';
    document.getElementById('icd_10_code').value = diagnosis.icd_10_code || '';
    document.getElementById('status').value = diagnosis.status || '';
    document.getElementById('clinical_findings').value = diagnosis.clinical_findings || '';
    document.getElementById('treatment_plan').value = diagnosis.treatment_plan || '';
    document.getElementById('follow_up_required').checked = diagnosis.follow_up_required || false;
    document.getElementById('follow_up_date').value = diagnosis.follow_up_date ? diagnosis.follow_up_date.split('T')[0] : '';
    document.getElementById('follow_up_notes').value = diagnosis.follow_up_notes || '';
    
    // Store diagnosis ID for update
    document.getElementById('diagnosis-form').dataset.editingId = diagnosisId;
    
    // Update modal title and button text
    document.querySelector('#diagnosisModal .modal-title').textContent = 'تعديل التشخيص';
    document.getElementById('save-diagnosis-btn').innerHTML = '<i class="bi bi-check-circle me-1"></i>تحديث التشخيص';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('diagnosisModal'));
    modal.show();
}

function viewDiagnosisDetails(diagnosisId) {
    const diagnosis = EHRManager.ehrData.diagnoses.find(d => d.id === diagnosisId);
    if (!diagnosis) return;
    
    // Create detailed view modal content
    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">تفاصيل التشخيص</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="row">
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label"><strong>التشخيص الأساسي:</strong></label>
                        <p class="form-control-plaintext">${diagnosis.primary_diagnosis}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>الSeverity:</strong></label>
                        <p class="form-control-plaintext">${diagnosis.severity ? EHRManager.getSeverityEnglish(diagnosis.severity) : 'غير محددة'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Status:</strong></label>
                        <p class="form-control-plaintext">${EHRManager.getStatusEnglish(diagnosis.status)}</p>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="mb-3">
                        <label class="form-label"><strong>تاريخ التشخيص:</strong></label>
                        <p class="form-control-plaintext">${new Date(diagnosis.diagnosis_date).toLocaleDateString('en-US')}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>رمز ICD-10:</strong></label>
                        <p class="form-control-plaintext">${diagnosis.icd_10_code || 'غير محدد'}</p>
                    </div>
                    <div class="mb-3">
                        <label class="form-label"><strong>Doctor:</strong></label>
                        <p class="form-control-plaintext">${diagnosis.doctor_name}</p>
                    </div>
                </div>
            </div>
            
            ${diagnosis.clinical_findings ? `
                <div class="mb-3">
                    <label class="form-label"><strong>Clinical Findings:</strong></label>
                    <p class="form-control-plaintext">${diagnosis.clinical_findings}</p>
                </div>
            ` : ''}
            
            ${diagnosis.treatment_plan ? `
                <div class="mb-3">
                    <label class="form-label"><strong>Treatment Plan:</strong></label>
                    <p class="form-control-plaintext">${diagnosis.treatment_plan}</p>
                </div>
            ` : ''}
            
            ${diagnosis.follow_up_required ? `
                <div class="mb-3">
                    <label class="form-label"><strong>Required Follow-up:</strong></label>
                    <p class="form-control-plaintext">نعم ${diagnosis.follow_up_date ? `- ${new Date(diagnosis.follow_up_date).toLocaleDateString('en-US')}` : ''}</p>
                    ${diagnosis.follow_up_notes ? `<p class="form-control-plaintext"><strong>ملاحظات المتابعة:</strong> ${diagnosis.follow_up_notes}</p>` : ''}
                </div>
            ` : ''}
            
            ${diagnosis.resolved ? `
                <div class="mb-3">
                    <label class="form-label"><strong>تاريخ الحل:</strong></label>
                    <p class="form-control-plaintext">${new Date(diagnosis.resolution_date).toLocaleDateString('en-US')}</p>
                    ${diagnosis.resolution_notes ? `<p class="form-control-plaintext"><strong>ملاحظات الحل:</strong> ${diagnosis.resolution_notes}</p>` : ''}
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
        </div>
    `;
    
    // Create or update details modal
    let detailsModal = document.getElementById('diagnosisDetailsModal');
    if (!detailsModal) {
        detailsModal = document.createElement('div');
        detailsModal.id = 'diagnosisDetailsModal';
        detailsModal.className = 'modal fade';
        detailsModal.innerHTML = '<div class="modal-dialog modal-lg"><div class="modal-content"></div></div>';
        document.body.appendChild(detailsModal);
    }
    
    detailsModal.querySelector('.modal-content').innerHTML = modalContent;
    const modal = new bootstrap.Modal(detailsModal);
    modal.show();
}

function searchEHRData() {
    const searchQuery = document.getElementById('ehr-search').value.trim();
    if (!searchQuery) {
        // Reset to show all data
        EHRManager.renderAllTabs();
        return;
    }
    
    const results = EHRManager.searchEHR(searchQuery);
    if (!results) return;
    
    // Update diagnoses tab with search results
    const diagnosesContainer = document.getElementById('diagnoses-list');
    if (results.diagnoses.length > 0) {
        let html = `<div class="alert alert-info"><i class="bi bi-search me-2"></i>نتائج البحث: تم العثور على ${results.diagnoses.length} تشخيص</div>`;
        
        results.diagnoses.forEach(diagnosis => {
            const isActive = !diagnosis.resolved;
            const cardClass = isActive ? 'active-diagnosis' : 'resolved-diagnosis';
            
            html += `
                <div class="diagnosis-card ${cardClass} fade-in-up">
                    <div class="diagnosis-header">
                        <div>
                            <div class="diagnosis-title">${diagnosis.primary_diagnosis}</div>
                            <div class="diagnosis-meta">
                                ${diagnosis.severity ? `<span class="diagnosis-badge severity-${diagnosis.severity}">Severity: ${EHRManager.getSeverityEnglish(diagnosis.severity)}</span>` : ''}
                                <span class="diagnosis-badge status-${diagnosis.status}">Status: ${EHRManager.getStatusEnglish(diagnosis.status)}</span>
                            </div>
                        </div>
                        <div class="text-muted small">
                            ${new Date(diagnosis.diagnosis_date).toLocaleDateString('en-US')}
                        </div>
                    </div>
                    <div class="diagnosis-content">
                        ${diagnosis.clinical_findings ? `<div class="diagnosis-section"><h6>Clinical Findings</h6><p>${diagnosis.clinical_findings}</p></div>` : ''}
                        ${diagnosis.treatment_plan ? `<div class="diagnosis-section"><h6>Treatment Plan</h6><p>${diagnosis.treatment_plan}</p></div>` : ''}
                    </div>
                </div>
            `;
        });
        
        diagnosesContainer.innerHTML = html;
    }
    
    // Show search results summary
    const totalResults = results.diagnoses.length + results.appointments.length + results.medical_history.length;
    EHRManager.showAlert('info', `تم العثور على ${totalResults} نتيجة للبحث: "${searchQuery}"`);
}

function exportEHR() {
    EHRManager.exportEHRToPDF();
}

function scheduleFollowUp() {
    // Redirect to appointment scheduling with patient info
    window.location.href = `appointments.html?patient_id=${EHRManager.patientId}&action=schedule`;
}

function managePrescriptions() {
    // Redirect to prescription management for this patient
    window.location.href = `../medical/records/prescriptions.html?patient_id=${EHRManager.patientId}`;
}

function generateMedicalTimeline() {
    const timeline = EHRManager.generateMedicalTimeline();
    if (!timeline || timeline.length === 0) {
        EHRManager.showAlert('info', 'Insufficient data available لإنشاء الجدول الزمني');
        return;
    }
    
    // Create timeline modal
    const modalContent = `
        <div class="modal-header">
            <h5 class="modal-title">الجدول الزمني الطبي</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
            <div class="timeline">
                ${timeline.map(event => `
                    <div class="timeline-item">
                        <div class="timeline-marker bg-${event.type === 'diagnosis' ? 'primary' : event.type === 'vital' ? 'success' : 'info'}"></div>
                        <div class="timeline-content">
                            <h6 class="mb-1">${event.title}</h6>
                            <p class="mb-1">${event.description}</p>
                            <small class="text-muted">${new Date(event.date).toLocaleDateString('en-US')}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
            <button type="button" class="btn btn-primary" onclick="printTimeline()">طباعة</button>
        </div>
    `;
    
    // Create or update timeline modal
    let timelineModal = document.getElementById('timelineModal');
    if (!timelineModal) {
        timelineModal = document.createElement('div');
        timelineModal.id = 'timelineModal';
        timelineModal.className = 'modal fade';
        timelineModal.innerHTML = '<div class="modal-dialog modal-lg"><div class="modal-content"></div></div>';
        document.body.appendChild(timelineModal);
    }
    
    timelineModal.querySelector('.modal-content').innerHTML = modalContent;
    const modal = new bootstrap.Modal(timelineModal);
    modal.show();
}

function printTimeline() {
    const timelineContent = document.querySelector('#timelineModal .timeline').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>الجدول الزمني الطبي</title>
                <style>
                    body { font-family: Arial, sans-serif; direction: rtl; }
                    .timeline-item { margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; }
                    h6 { color: #0066cc; }
                </style>
            </head>
            <body>
                <h2>الجدول الزمني الطبي - ${EHRManager.ehrData.patient_info.user?.full_name}</h2>
                <div class="timeline">${timelineContent}</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

function logout() {
    AuthGuard.logout();
}