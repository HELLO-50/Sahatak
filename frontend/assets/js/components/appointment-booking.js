// Appointment Booking System - following main.js patterns
const AppointmentBooking = {
    currentStep: 1,
    maxSteps: 3,
    selectedDoctor: null,
    selectedDateTime: null,
    selectedType: 'video',
    doctors: [],
    calendar: null,
    
    // Initialize the booking system
    async init() {
        // Ensure translations are loaded first
        if (!LanguageManager.translations || !LanguageManager.translations.ar) {
            await LanguageManager.loadTranslations();
        }
        
        // Update UI with translations
        this.updateUITranslations();
        this.initCalendarWidget();
        this.loadDoctors();
        this.setupEventListeners();
        this.setMinDate();
    },

    // Update UI with current language translations
    updateUITranslations() {
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        if (!t || !t.appointments) return;

        // Update page title and main headings
        this.updateElementText('page-title', t.appointments.book_title);
        this.updateElementText('page-subtitle', t.appointments.book_subtitle);
        
        // Update step indicators
        this.updateElementText('step1-text', t.appointments.step_select_doctor);
        this.updateElementText('step2-text', t.appointments.step_select_time);
        this.updateElementText('step3-text', t.appointments.step_confirm);
        
        // Update form labels
        this.updateElementText('choose-doctor-label', t.appointments.choose_doctor);
        this.updateElementText('specialty-label', t.appointments.specialty);
        this.updateElementText('date-time-label', t.appointments.date_time);
        this.updateElementText('date-label', t.appointments.date);
        this.updateElementText('consultation-type-label', t.appointments.consultation_type);
        this.updateElementText('available-times-label', t.appointments.available_times);
        this.updateElementText('reason-visit-label', t.appointments.reason_visit);
        this.updateElementText('confirm-appointment-label', t.appointments.confirm_appointment);
        
        // Update buttons
        this.updateElementText('prev-btn-text', t.appointments.previous);
        this.updateElementText('next-btn-text', t.appointments.next);
        this.updateElementText('confirm-btn-text', t.appointments.confirm_booking);
        
        // Update specialty options
        this.updateSpecialtyOptions(lang);
        
        // Update consultation type options
        this.updateConsultationTypeOptions(lang);
    },

    // Helper function to update element text
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element && text) {
            element.textContent = text;
        }
    },

    // Update specialty select options
    updateSpecialtyOptions(lang) {
        const specialtySelect = document.getElementById('specialty-filter');
        const t = LanguageManager.translations[lang];
        if (!specialtySelect || !t) return;

        specialtySelect.innerHTML = `
            <option value="">${t.appointments.all_specialties}</option>
            <option value="cardiology">${lang === 'ar' ? 'أمراض القلب' : 'Cardiology'}</option>
            <option value="pediatrics">${lang === 'ar' ? 'طب الأطفال' : 'Pediatrics'}</option>
            <option value="dermatology">${lang === 'ar' ? 'الأمراض الجلدية' : 'Dermatology'}</option>
            <option value="internal">${lang === 'ar' ? 'الطب الباطني' : 'Internal Medicine'}</option>
            <option value="general">${lang === 'ar' ? 'طب عام' : 'General Medicine'}</option>
        `;
    },

    // Update consultation type options
    updateConsultationTypeOptions(lang) {
        const typeSelect = document.getElementById('appointment-type');
        const t = LanguageManager.translations[lang];
        if (!typeSelect || !t) return;

        typeSelect.innerHTML = `
            <option value="video">${t.appointments.video_call}</option>
            <option value="audio">${t.appointments.audio_call}</option>
            <option value="chat">${t.appointments.text_chat}</option>
        `;
    },

    // Setup event listeners
    setupEventListeners() {
        // Navigation buttons
        document.getElementById('next-btn').addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn').addEventListener('click', () => this.prevStep());
        document.getElementById('confirm-btn').addEventListener('click', () => this.confirmBooking());
        
        // Specialty filter
        document.getElementById('specialty-filter').addEventListener('change', () => this.loadDoctors());
        
        // Date change
        document.getElementById('appointment-date').addEventListener('change', (e) => {
            this.loadTimeSlots();
            // Update calendar widget if available
            if (this.calendar && e.target.value) {
                this.calendar.selectDate(new Date(e.target.value));
            }
        });
        
        // Appointment type change
        document.getElementById('appointment-type').addEventListener('change', (e) => {
            this.selectedType = e.target.value;
        });
    },

    // Initialize calendar widget
    initCalendarWidget() {
        if (typeof CalendarWidget !== 'undefined') {
            this.calendar = Object.create(CalendarWidget);
            this.calendar.init('calendar-widget-container', {
                minDate: new Date(),
                maxDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
                onDateSelect: (date) => {
                    const dateString = date.toISOString().split('T')[0];
                    document.getElementById('appointment-date').value = dateString;
                    this.loadTimeSlots();
                }
            });
        }
    },

    // Set minimum date to today
    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('appointment-date');
        dateInput.min = today;
        dateInput.value = today;
    },

    // Load doctors list
    async loadDoctors() {
        try {
            const specialty = document.getElementById('specialty-filter').value;
            const params = specialty ? `?specialty=${specialty}` : '';
            
            const response = await ApiHelper.makeRequest(`/appointments/doctors${params}`);
            
            if (response.success) {
                this.doctors = response.data.doctors || response.doctors || [];
                this.renderDoctors(this.doctors);
                // Load doctor availability for calendar if doctor is selected
                if (this.selectedDoctor) {
                    this.updateDoctorAvailability();
                }
            } else {
                this.showError('فشل في تحميل قائمة الأطباء');
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
            this.showError('خطأ في الاتصال بالخادم');
        }
    },

    // Render doctors list
    renderDoctors(doctors) {
        const container = document.getElementById('doctors-list');
        
        if (doctors.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-person-x display-4 text-muted mb-3"></i>
                    <p class="text-muted">لا يوجد أطباء متاحون في هذا التخصص</p>
                </div>
            `;
            return;
        }

        const doctorsHtml = doctors.map(doctor => `
            <div class="col-md-6 mb-4">
                <div class="card doctor-card h-100 ${this.selectedDoctor?.id === doctor.id ? 'selected' : ''}" 
                     onclick="AppointmentBooking.selectDoctor(${doctor.id})">
                    <div class="card-body">
                        <div class="d-flex align-items-center mb-3">
                            <div class="doctor-avatar me-3">
                                <i class="bi bi-person-circle display-6 text-primary"></i>
                            </div>
                            <div>
                                <h5 class="card-title mb-1">د. ${doctor.user ? doctor.user.full_name : doctor.full_name}</h5>
                                <p class="text-muted small mb-0">${this.getSpecialtyArabic(doctor.specialty)}</p>
                                <div class="rating mt-1">
                                    ${this.renderStars(doctor.rating || 4.5)}
                                    <small class="text-muted">(${doctor.total_reviews || 0} تقييم)</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row text-center">
                            <div class="col-4">
                                <small class="text-muted d-block">الخبرة</small>
                                <strong>${doctor.years_of_experience} سنة</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">الأجر</small>
                                <strong>${doctor.consultation_fee ? doctor.consultation_fee + ' ج.س' : 'مجاني'}</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">الحالة</small>
                                <span class="badge bg-success">متاح</span>
                            </div>
                        </div>
                        
                        ${doctor.bio ? `<p class="text-muted small mt-3">${doctor.bio}</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = doctorsHtml;
    },

    // Select a doctor
    selectDoctor(doctorId) {
        // Remove previous selection
        document.querySelectorAll('.doctor-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Add selection to clicked card
        event.currentTarget.classList.add('selected');
        
        // Store selected doctor
        this.selectedDoctor = this.doctors.find(d => d.id === doctorId) || { id: doctorId };
        
        // Update doctor availability in calendar
        this.updateDoctorAvailability();
        
        // Enable next button
        document.getElementById('next-btn').disabled = false;
    },

    // Load available time slots
    async loadTimeSlots() {
        if (!this.selectedDoctor) return;
        
        const date = document.getElementById('appointment-date').value;
        if (!date) return;

        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/doctors/${this.selectedDoctor.id}/availability?date=${date}`
            );
            
            if (response.success) {
                this.renderTimeSlots(response.data.available_slots || []);
            } else {
                this.showError('فشل في تحميل الأوقات المتاحة');
            }
        } catch (error) {
            console.error('Error loading time slots:', error);
            this.showError('خطأ في تحميل الأوقات المتاحة');
        }
    },

    // Render time slots
    renderTimeSlots(slots) {
        const container = document.getElementById('time-slots');
        
        if (slots.length === 0) {
            container.innerHTML = '<p class="text-muted">لا توجد أوقات متاحة في هذا اليوم</p>';
            return;
        }

        const slotsHtml = slots.map(slot => `
            <button type="button" 
                    class="btn btn-outline-primary time-slot ${!slot.available ? 'disabled' : ''}"
                    data-time="${slot.datetime}"
                    onclick="AppointmentBooking.selectTimeSlot('${slot.datetime}', '${slot.start}')"
                    ${!slot.available ? 'disabled' : ''}>
                ${slot.start}
            </button>
        `).join('');

        container.innerHTML = slotsHtml;
    },

    // Select time slot
    selectTimeSlot(datetime, displayTime) {
        // Remove previous selection
        document.querySelectorAll('.time-slot').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add selection to clicked button
        event.target.classList.add('active');
        
        // Store selected time
        this.selectedDateTime = {
            datetime: datetime,
            displayTime: displayTime
        };
    },

    // Move to next step
    nextStep() {
        if (this.currentStep === 1 && !this.selectedDoctor) {
            this.showError('يرجى اختيار طبيب');
            return;
        }
        
        if (this.currentStep === 2 && !this.selectedDateTime) {
            this.showError('يرجى اختيار وقت للموعد');
            return;
        }

        if (this.currentStep < this.maxSteps) {
            this.currentStep++;
            this.updateStepDisplay();
            
            if (this.currentStep === 2) {
                this.loadTimeSlots();
            } else if (this.currentStep === 3) {
                this.showSummary();
            }
        }
    },

    // Move to previous step
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    },

    // Update step display
    updateStepDisplay() {
        // Update progress bar
        const progress = (this.currentStep / this.maxSteps) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
        
        // Update step indicators
        for (let i = 1; i <= this.maxSteps; i++) {
            const stepText = document.getElementById(`step${i}-text`);
            if (i === this.currentStep) {
                stepText.classList.remove('text-muted');
                stepText.classList.add('text-primary', 'fw-bold');
            } else if (i < this.currentStep) {
                stepText.classList.remove('text-muted');
                stepText.classList.add('text-success');
            } else {
                stepText.classList.add('text-muted');
                stepText.classList.remove('text-primary', 'fw-bold', 'text-success');
            }
        }
        
        // Show/hide steps
        for (let i = 1; i <= this.maxSteps; i++) {
            const stepDiv = document.getElementById(`step${i}`);
            if (i === this.currentStep) {
                stepDiv.classList.remove('d-none');
            } else {
                stepDiv.classList.add('d-none');
            }
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const confirmBtn = document.getElementById('confirm-btn');
        
        if (this.currentStep === 1) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'block';
        }
        
        if (this.currentStep === this.maxSteps) {
            nextBtn.classList.add('d-none');
            confirmBtn.classList.remove('d-none');
        } else {
            nextBtn.classList.remove('d-none');
            confirmBtn.classList.add('d-none');
        }
    },

    // Show appointment summary
    showSummary() {
        try {
            // Use the already loaded doctor data
            const doctor = this.selectedDoctor;
            const date = new Date(this.selectedDateTime.datetime);
            
            const summaryHtml = `
                    <div class="row">
                        <div class="col-sm-6 mb-3">
                            <strong>الطبيب:</strong><br>
                            د. ${doctor.user ? doctor.user.full_name : doctor.full_name}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>التخصص:</strong><br>
                            ${this.getSpecialtyArabic(doctor.specialty)}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>التاريخ:</strong><br>
                            ${date.toLocaleDateString('ar-SA')}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>الوقت:</strong><br>
                            ${this.selectedDateTime.displayTime}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>نوع الاستشارة:</strong><br>
                            ${this.getAppointmentTypeArabic(this.selectedType)}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>الأجر:</strong><br>
                            ${doctor.consultation_fee ? doctor.consultation_fee + ' ج.س' : 'مجاني'}
                        </div>
                    </div>
                `;
                
            document.getElementById('appointment-summary').innerHTML = summaryHtml;
        } catch (error) {
            console.error('Error showing summary:', error);
        }
    },

    // Confirm booking
    async confirmBooking() {
        const termsAgreed = document.getElementById('terms-agreement').checked;
        if (!termsAgreed) {
            this.showError('يرجى الموافقة على الشروط والأحكام');
            return;
        }

        try {
            const bookingData = {
                doctor_id: this.selectedDoctor.id,
                appointment_date: this.selectedDateTime.datetime,
                appointment_type: this.selectedType,
                reason_for_visit: document.getElementById('reason-visit').value
            };

            const response = await ApiHelper.makeRequest('/appointments/', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });

            if (response.success) {
                // Show success message and modal
                this.showSuccess('تم حجز الموعد بنجاح!');
                const modal = new bootstrap.Modal(document.getElementById('success-modal'));
                modal.show();
            } else {
                this.showError(response.message || 'فشل في حجز الموعد');
            }
        } catch (error) {
            console.error('Error confirming booking:', error);
            this.showError('خطأ في تأكيد الحجز');
        }
    },

    // Confirm and submit appointment booking
    async confirmBooking() {
        try {
            // Validate all required data
            if (!this.selectedDoctor || !this.selectedDateTime) {
                this.showError('يرجى اختيار الطبيب والوقت المناسب');
                return;
            }

            // Check terms agreement
            const termsCheckbox = document.getElementById('terms-agreement');
            if (!termsCheckbox || !termsCheckbox.checked) {
                this.showError('يرجى الموافقة على شروط الاستخدام');
                return;
            }

            // Prepare booking data
            const bookingData = {
                doctor_id: this.selectedDoctor.id,
                appointment_date: this.selectedDateTime.datetime,
                appointment_type: this.selectedType,
                reason_for_visit: document.getElementById('reason-visit')?.value || '',
                symptoms: '' // Can be expanded
            };

            // Validate future date
            const appointmentDate = new Date(bookingData.appointment_date);
            if (appointmentDate <= new Date()) {
                this.showError('يجب أن يكون الموعد في المستقبل');
                return;
            }

            // Show loading state
            const confirmBtn = document.getElementById('confirm-btn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>جاري الحجز...';
            confirmBtn.disabled = true;

            // Submit booking
            const response = await ApiHelper.makeRequest('/appointments/', {
                method: 'POST',
                body: JSON.stringify(bookingData)
            });

            if (response.success) {
                this.showSuccess('تم حجز الموعد بنجاح!');
                
                // Show success modal
                const modal = new bootstrap.Modal(document.getElementById('success-modal'));
                modal.show();
                
                // Reset form state
                this.currentStep = 1;
                this.selectedDoctor = null;
                this.selectedDateTime = null;
                this.renderStep();
            } else {
                throw new Error(response.message || 'فشل في حجز الموعد');
            }

        } catch (error) {
            console.error('Error confirming booking:', error);
            
            // Handle specific API errors
            if (error.message.includes('blocked')) {
                this.showError('هذا الوقت محجوب من قبل الطبيب');
            } else if (error.message.includes('booked')) {
                this.showError('هذا الوقت محجوز مسبقاً');
            } else {
                this.showError(error.message || 'خطأ في تأكيد الحجز');
            }
            
            // Go back to time selection to choose different slot
            this.currentStep = 2;
            this.renderStep();
        } finally {
            // Reset button state
            const confirmBtn = document.getElementById('confirm-btn');
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="bi bi-calendar-check me-1"></i>تأكيد الحجز';
                confirmBtn.disabled = false;
            }
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const confirmBtn = document.getElementById('confirm-btn');

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentStep < this.maxSteps) {
                    if (this.validateCurrentStep()) {
                        this.nextStep();
                    }
                }
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentStep > 1) {
                    this.previousStep();
                }
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmBooking();
            });
        }

        // Specialty filter
        const specialtyFilter = document.getElementById('specialty-filter');
        if (specialtyFilter) {
            specialtyFilter.addEventListener('change', (e) => {
                this.filterDoctorsBySpecialty(e.target.value);
            });
        }

        // Appointment type change
        const appointmentType = document.getElementById('appointment-type');
        if (appointmentType) {
            appointmentType.addEventListener('change', (e) => {
                this.selectedType = e.target.value;
            });
        }

        // Date input change
        const appointmentDate = document.getElementById('appointment-date');
        if (appointmentDate) {
            appointmentDate.addEventListener('change', (e) => {
                this.loadTimeSlots(e.target.value);
            });
        }
    },

    // Validate current step
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                if (!this.selectedDoctor) {
                    this.showError('يرجى اختيار الطبيب');
                    return false;
                }
                return true;
            case 2:
                if (!this.selectedDateTime) {
                    this.showError('يرجى اختيار التاريخ والوقت');
                    return false;
                }
                return true;
            case 3:
                const termsCheckbox = document.getElementById('terms-agreement');
                if (!termsCheckbox || !termsCheckbox.checked) {
                    this.showError('يرجى الموافقة على شروط الاستخدام');
                    return false;
                }
                return true;
            default:
                return true;
        }
    },

    // Filter doctors by specialty
    filterDoctorsBySpecialty(specialty) {
        // Re-render doctors with filter
        this.renderDoctorsList(this.doctors.filter(doctor => 
            !specialty || doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
        ));
    },

    // Helper functions
    getSpecialtyArabic(specialty) {
        const specialties = {
            cardiology: 'أمراض القلب',
            pediatrics: 'طب الأطفال',
            dermatology: 'الأمراض الجلدية',
            internal: 'الطب الباطني',
            psychiatry: 'الطب النفسي',
            orthopedics: 'العظام',
            general: 'طب عام'
        };
        return specialties[specialty] || specialty;
    },

    getAppointmentTypeArabic(type) {
        const types = {
            video: 'مكالمة فيديو',
            audio: 'مكالمة صوتية',
            chat: 'محادثة نصية'
        };
        return types[type] || type;
    },

    renderStars(rating) {
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push('<i class="bi bi-star-fill text-warning"></i>');
        }
        
        if (hasHalfStar) {
            stars.push('<i class="bi bi-star-half text-warning"></i>');
        }
        
        const remainingStars = 5 - Math.ceil(rating);
        for (let i = 0; i < remainingStars; i++) {
            stars.push('<i class="bi bi-star text-warning"></i>');
        }
        
        return stars.join('');
    },

    // Update doctor availability in calendar
    async updateDoctorAvailability() {
        if (!this.selectedDoctor || !this.calendar) return;

        try {
            // Get next 30 days of availability
            const availableDates = [];
            const today = new Date();
            
            for (let i = 0; i < 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                const dateString = date.toISOString().split('T')[0];
                
                const response = await ApiHelper.makeRequest(
                    `/appointments/doctors/${this.selectedDoctor.id}/availability?date=${dateString}`
                );
                
                if (response.success && response.data.available_slots.some(slot => slot.available)) {
                    availableDates.push(dateString);
                }
            }
            
            this.calendar.setAvailableDates(availableDates);
        } catch (error) {
            console.error('Error loading doctor availability:', error);
        }
    },

    showError(message) {
        // Enhanced error display with toast-like notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        errorDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        errorDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    },

    showSuccess(message) {
        // Enhanced success display with toast-like notification
        const successDiv = document.createElement('div');
        successDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        successDiv.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        successDiv.innerHTML = `
            <i class="bi bi-check-circle-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(successDiv);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 3000);
    }
};

// Make sure ApiHelper is available
if (typeof ApiHelper === 'undefined') {
    console.error('ApiHelper is required for appointment booking');
}