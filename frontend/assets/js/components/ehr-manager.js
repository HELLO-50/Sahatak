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
            this.showAlert('error', 'فشل في تحميل السجل الطبي');
            // Redirect back to doctor dashboard
            setTimeout(() => {
                window.location.href = 'doctor.html';
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
            const userName = patient.user ? patient.user.full_name : 'غير محدد';
            patientInfoEl.textContent = `المريض: ${userName} - العمر: ${patient.age} سنة`;
        }
        
        // Render overview
        if (overviewEl) {
            const bmi = this.calculateBMI(patient.height, patient.weight);
            
            overviewEl.innerHTML = `
                <div class="patient-basic-info">
                    <div class="info-group">
                        <h6><i class="bi bi-person-badge me-2"></i>المعلومات الأساسية</h6>
                        <div class="info-item">
                            <span class="info-label">الاسم الكامل:</span>
                            <span class="info-value">${patient.user ? patient.user.full_name : 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">العمر:</span>
                            <span class="info-value">${patient.age} سنة</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الجنس:</span>
                            <span class="info-value">${patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">رقم الهاتف:</span>
                            <span class="info-value">${patient.phone || 'غير محدد'}</span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <h6><i class="bi bi-droplet me-2"></i>المعلومات الطبية</h6>
                        <div class="info-item">
                            <span class="info-label">فصيلة الدم:</span>
                            <span class="info-value">${patient.blood_type || 'غير محددة'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الطول:</span>
                            <span class="info-value">${patient.height ? patient.height + ' سم' : 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">الوزن:</span>
                            <span class="info-value">${patient.weight ? patient.weight + ' كغ' : 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">مؤشر كتلة الجسم:</span>
                            <span class="info-value">${bmi || 'غير محسوب'}</span>
                        </div>
                    </div>
                    
                    <div class="info-group">
                        <h6><i class="bi bi-shield-check me-2"></i>جهة الاتصال للطوارئ</h6>
                        <div class="info-item">
                            <span class="info-label">رقم الطوارئ:</span>
                            <span class="info-value">${patient.emergency_contact || 'غير محدد'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">حالة التاريخ الطبي:</span>
                            <span class="info-value">
                                ${patient.medical_history_completed ? 
                                    '<span class="badge bg-success">مكتمل</span>' : 
                                    '<span class="badge bg-warning">غير مكتمل</span>'
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
                    <h6>لا توجد تشخيصات</h6>
                    <p>لم يتم تسجيل أي تشخيصات لهذا المريض بعد</p>
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
                                ${diagnosis.severity ? `<span class="diagnosis-badge severity-${diagnosis.severity}">شدة: ${this.getSeverityArabic(diagnosis.severity)}</span>` : ''}
                                <span class="diagnosis-badge status-${diagnosis.status}">الحالة: ${this.getStatusArabic(diagnosis.status)}</span>
                                ${diagnosis.icd_10_code ? `<span class="diagnosis-badge" style="background: #e3f2fd; color: #1565c0;">ICD-10: ${diagnosis.icd_10_code}</span>` : ''}
                                ${isActive ? '<span class="diagnosis-badge" style="background: #d4edda; color: #155724;">نشط</span>' : '<span class="diagnosis-badge" style="background: #f8f9fa; color: #6c757d;">محلول</span>'}
                            </div>
                        </div>
                        <div class="text-muted small">
                            ${new Date(diagnosis.diagnosis_date).toLocaleDateString('ar-SA')}
                        </div>
                    </div>
                    
                    <div class="diagnosis-content">
                        ${diagnosis.clinical_findings ? `
                            <div class="diagnosis-section">
                                <h6>الفحوصات السريرية</h6>
                                <p>${diagnosis.clinical_findings}</p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.treatment_plan ? `
                            <div class="diagnosis-section">
                                <h6>خطة العلاج</h6>
                                <p>${diagnosis.treatment_plan}</p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.follow_up_required ? `
                            <div class="diagnosis-section">
                                <h6>المتابعة المطلوبة</h6>
                                <p>
                                    ${diagnosis.follow_up_date ? `تاريخ المتابعة: ${new Date(diagnosis.follow_up_date).toLocaleDateString('ar-SA')}` : 'مطلوبة متابعة'}
                                    ${diagnosis.follow_up_notes ? `<br>ملاحظات: ${diagnosis.follow_up_notes}` : ''}
                                </p>
                            </div>
                        ` : ''}
                        
                        ${diagnosis.resolution_date ? `
                            <div class="diagnosis-section">
                                <h6>تاريخ الشفاء</h6>
                                <p>
                                    ${new Date(diagnosis.resolution_date).toLocaleDateString('ar-SA')}
                                    ${diagnosis.resolution_notes ? `<br>${diagnosis.resolution_notes}` : ''}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div class="text-muted small mt-2">
                            <i class="bi bi-person-badge me-1"></i>
                            الطبيب: ${diagnosis.doctor_name}
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
                    <h6>لا توجد علامات حيوية</h6>
                    <p>لم يتم تسجيل أي علامات حيوية لهذا المريض بعد</p>
                </div>
            `;
            return;
        }
        
        // Render vital signs list
        let html = '';
        this.ehrData.vital_signs.forEach(vital => {
            html += `
                <div class="vital-signs-card fade-in-up">
                    <div class="vitals-header">
                        <div class="vitals-date">
                            <i class="bi bi-calendar3 me-2"></i>
                            ${new Date(vital.measured_at).toLocaleDateString('ar-SA')} - 
                            ${new Date(vital.measured_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        ${vital.recorded_by ? `<small class="text-muted">سجله: ${vital.recorded_by}</small>` : ''}
                    </div>
                    
                    <div class="vitals-grid">
                        ${vital.blood_pressure ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.blood_pressure}</div>
                                <div class="vital-label">ضغط الدم</div>
                            </div>
                        ` : ''}
                        
                        ${vital.heart_rate ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.heart_rate}</div>
                                <div class="vital-label">نبضات القلب</div>
                            </div>
                        ` : ''}
                        
                        ${vital.temperature ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.temperature}°</div>
                                <div class="vital-label">درجة الحرارة</div>
                            </div>
                        ` : ''}
                        
                        ${vital.respiratory_rate ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.respiratory_rate}</div>
                                <div class="vital-label">معدل التنفس</div>
                            </div>
                        ` : ''}
                        
                        ${vital.oxygen_saturation ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.oxygen_saturation}%</div>
                                <div class="vital-label">الأكسجين</div>
                            </div>
                        ` : ''}
                        
                        ${vital.bmi ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.bmi}</div>
                                <div class="vital-label">مؤشر كتلة الجسم</div>
                            </div>
                        ` : ''}
                        
                        ${vital.pain_scale !== null && vital.pain_scale !== undefined ? `
                            <div class="vital-item">
                                <div class="vital-value">${vital.pain_scale}/10</div>
                                <div class="vital-label">مقياس الألم</div>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${vital.notes ? `<div class="mt-2 text-muted small"><strong>ملاحظات:</strong> ${vital.notes}</div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Create charts
        this.createVitalSignsCharts();
    },
    
    // Create vital signs charts
    createVitalSignsCharts() {
        if (!this.ehrData.vital_signs || this.ehrData.vital_signs.length === 0) return;
        
        const vitals = this.ehrData.vital_signs.reverse(); // Oldest first for charts
        
        // Blood Pressure Chart
        this.createBloodPressureChart(vitals);
        
        // Heart Rate Chart
        this.createHeartRateChart(vitals);
    },
    
    // Create blood pressure chart
    createBloodPressureChart(vitals) {
        const ctx = document.getElementById('bloodPressureChart');
        if (!ctx) return;
        
        const data = vitals.filter(v => v.systolic_bp && v.diastolic_bp);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">لا توجد بيانات كافية</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString('ar-SA')),
                datasets: [
                    {
                        label: 'الانقباضي',
                        data: data.map(v => v.systolic_bp),
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'الانبساطي',
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
        
        const data = vitals.filter(v => v.heart_rate);
        
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<p class="text-center text-muted">لا توجد بيانات كافية</p>';
            return;
        }
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(v => new Date(v.measured_at).toLocaleDateString('ar-SA')),
                datasets: [{
                    label: 'نبضات القلب',
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
    
    // Render medical history
    renderMedicalHistory() {
        const container = document.getElementById('medical-history-content');
        if (!container || !this.ehrData.patient_info) return;
        
        const patient = this.ehrData.patient_info;
        
        const sections = [
            {
                title: 'التاريخ الطبي العام',
                icon: 'journal-medical',
                items: [
                    { label: 'التاريخ الطبي', value: patient.medical_history },
                    { label: 'الحساسية', value: patient.allergies },
                    { label: 'الأدوية الحالية', value: patient.current_medications }
                ]
            },
            {
                title: 'الحالات المزمنة والتاريخ العائلي',
                icon: 'people',
                items: [
                    { label: 'الحالات المزمنة', value: patient.chronic_conditions },
                    { label: 'التاريخ العائلي', value: patient.family_history },
                    { label: 'التاريخ الجراحي', value: patient.surgical_history }
                ]
            },
            {
                title: 'نمط الحياة',
                icon: 'activity',
                items: [
                    { label: 'التدخين', value: this.getSmokingStatusArabic(patient.smoking_status) },
                    { label: 'استهلاك الكحول', value: this.getAlcoholConsumptionArabic(patient.alcohol_consumption) },
                    { label: 'تكرار التمارين', value: this.getExerciseFrequencyArabic(patient.exercise_frequency) }
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
                            <p class="text-muted mb-0">لا توجد معلومات متاحة في هذا القسم</p>
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
                            <i class="bi bi-clock-history me-2"></i>آخر التحديثات
                        </h6>
                    </div>
                    <div class="history-section-content">
                        <ul class="history-list">
                            ${this.ehrData.medical_history_updates.map(update => `
                                <li class="history-item">
                                    <div class="history-content">
                                        <div class="history-label">نوع التحديث: ${this.getUpdateTypeArabic(update.update_type)}</div>
                                        <div class="history-value">
                                            الحقول المحدثة: ${update.updated_fields.join(', ')}
                                            ${update.notes ? `<br>ملاحظات: ${update.notes}` : ''}
                                        </div>
                                    </div>
                                    <div class="history-date">
                                        ${new Date(update.created_at).toLocaleDateString('ar-SA')}
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
                            ${new Date(appointment.appointment_date).toLocaleDateString('ar-SA')} - 
                            ${new Date(appointment.appointment_date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span class="appointment-status status-${appointment.status}">
                            ${this.getAppointmentStatusArabic(appointment.status)}
                        </span>
                    </div>
                    
                    <div class="appointment-details">
                        <div><strong>النوع:</strong> ${this.getAppointmentTypeArabic(appointment.appointment_type)}</div>
                        ${appointment.reason_for_visit ? `<div><strong>سبب الزيارة:</strong> ${appointment.reason_for_visit}</div>` : ''}
                        ${appointment.diagnosis ? `<div><strong>التشخيص:</strong> ${appointment.diagnosis}</div>` : ''}
                        ${appointment.notes ? `<div><strong>ملاحظات:</strong> ${appointment.notes}</div>` : ''}
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
    
    // Save diagnosis
    async saveDiagnosis() {
        try {
            const formData = {
                patient_id: this.patientId,
                primary_diagnosis: document.getElementById('primary_diagnosis').value,
                severity: document.getElementById('severity').value,
                icd_10_code: document.getElementById('icd_10_code').value,
                status: document.getElementById('status').value,
                clinical_findings: document.getElementById('clinical_findings').value,
                treatment_plan: document.getElementById('treatment_plan').value,
                follow_up_required: document.getElementById('follow_up_required').checked,
                follow_up_date: document.getElementById('follow_up_date').value,
                follow_up_notes: document.getElementById('follow_up_notes').value
            };
            
            // Show loading state
            const saveBtn = document.getElementById('save-diagnosis-btn');
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الحفظ...';
            saveBtn.disabled = true;
            
            const response = await ApiHelper.makeRequest('/ehr/diagnoses', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            if (response.success) {
                this.showAlert('success', 'تم حفظ التشخيص بنجاح');
                
                // Close modal and refresh data
                const modal = bootstrap.Modal.getInstance(document.getElementById('diagnosisModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('diagnosis-form').reset();
                
                // Reload EHR data
                await this.loadEHRData();
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error('Error saving diagnosis:', error);
            this.showAlert('error', error.message || 'فشل في حفظ التشخيص');
        } finally {
            // Reset button
            const saveBtn = document.getElementById('save-diagnosis-btn');
            if (saveBtn) {
                saveBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>حفظ التشخيص';
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
                
                // Close modal and refresh data
                const modal = bootstrap.Modal.getInstance(document.getElementById('vitalsModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('vitals-form').reset();
                
                // Reload EHR data
                await this.loadEHRData();
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
    
    // Helper functions
    calculateBMI(height, weight) {
        if (!height || !weight) return null;
        const heightM = height / 100;
        const bmi = (weight / (heightM * heightM)).toFixed(1);
        return bmi;
    },
    
    getSeverityArabic(severity) {
        const severityMap = {
            'mild': 'خفيفة',
            'moderate': 'متوسطة',
            'severe': 'شديدة',
            'critical': 'حرجة'
        };
        return severityMap[severity] || severity;
    },
    
    getStatusArabic(status) {
        const statusMap = {
            'provisional': 'مبدئي',
            'confirmed': 'مؤكد',
            'differential': 'تشخيص تفريقي',
            'rule_out': 'استبعاد'
        };
        return statusMap[status] || status;
    },
    
    getSmokingStatusArabic(status) {
        const statusMap = {
            'never': 'لا يدخن',
            'former': 'مدخن سابق',
            'current': 'مدخن حالياً'
        };
        return statusMap[status] || 'غير محدد';
    },
    
    getAlcoholConsumptionArabic(consumption) {
        const consumptionMap = {
            'none': 'لا يستهلك',
            'occasional': 'أحياناً',
            'moderate': 'معتدل',
            'heavy': 'كثير'
        };
        return consumptionMap[consumption] || 'غير محدد';
    },
    
    getExerciseFrequencyArabic(frequency) {
        const frequencyMap = {
            'none': 'لا يمارس',
            'rare': 'نادراً',
            'weekly': 'أسبوعياً',
            'daily': 'يومياً'
        };
        return frequencyMap[frequency] || 'غير محدد';
    },
    
    getUpdateTypeArabic(type) {
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
    
    getAppointmentTypeArabic(type) {
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
        if (show && contentContainer) {
            contentContainer.classList.remove('d-none');
        }
    },
    
    showAlert(type, message) {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
        const alertClass = type === 'error' ? 'alert-danger' : 'alert-success';
        const icon = type === 'error' ? 'exclamation-triangle' : 'check-circle';
        
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

function logout() {
    AuthGuard.logout();
}