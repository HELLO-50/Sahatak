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
        this.initCalendarWidget();
        await this.loadSpecialties();
        this.loadDoctors();
        this.setupEventListeners();
        this.setMinDate();
    },

    // Load specialties from API and populate dropdown
    async loadSpecialties() {
        try {
            const response = await ApiHelper.makeRequest('/users/specialties');
            
            if (response.success && response.data) {
                const specialties = response.data.specialties || response.data || [];
                this.populateSpecialtiesDropdown(specialties);
            }
        } catch (error) {
            console.error('Error loading specialties:', error);
            // Fallback to basic specialties if API fails
            this.populateSpecialtiesDropdown([
                'Internal Medicine',
                'Pediatrics', 
                'Cardiology',
                'Dermatology',
                'Orthopedics',
                'Psychiatry',
                'Gynecology',
                'Neurology'
            ]);
        }
    },

    // Populate specialties dropdown
    populateSpecialtiesDropdown(specialties) {
        const dropdown = document.getElementById('specialty-filter');
        if (!dropdown) return;

        // Keep the "All Specialties" option and add the loaded specialties
        dropdown.innerHTML = '<option value="">All Specialties</option>';
        
        specialties.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty;
            option.textContent = specialty;
            dropdown.appendChild(option);
        });
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
            const currentLang = LanguageManager.getLanguage() || 'en';
            const errorMsg = currentLang === 'ar' ? 
                'عذراً، لا يمكن تحميل قائمة الأطباء حالياً. يرجى المحاولة لاحقاً.' :
                'Sorry, cannot load doctors list currently. Please try again later.';
            this.showError(errorMsg);
        }
    },

    // Render doctors list
    renderDoctors(doctors) {
        const container = document.getElementById('doctors-list');
        
        if (doctors.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-person-x display-4 text-muted mb-3"></i>
                    <p class="text-muted">No doctors available in this specialty</p>
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
                                <h5 class="card-title mb-1">${this.formatDoctorName(doctor.user ? doctor.user.full_name : doctor.full_name)}</h5>
                                <p class="text-muted small mb-0">${this.getSpecialtyDisplayName(doctor.specialty)}</p>
                                <div class="rating mt-1">
                                    ${this.renderStars(doctor.rating || 4.5)}
                                    <small class="text-muted">(${doctor.total_reviews || 0} reviews)</small>
                                </div>
                            </div>
                        </div>
                        
                        <div class="row text-center">
                            <div class="col-4">
                                <small class="text-muted d-block">Experience</small>
                                <strong>${doctor.years_of_experience || 0} years</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Fee</small>
                                <strong>${doctor.consultation_fee ? doctor.consultation_fee + ' SDG' : 'Free'}</strong>
                            </div>
                            <div class="col-4">
                                <small class="text-muted d-block">Status</small>
                                <span class="badge bg-success">Available</span>
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
                            <strong>Doctor:</strong><br>
                            ${this.formatDoctorName(doctor.user ? doctor.user.full_name : doctor.full_name)}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>Specialty:</strong><br>
                            ${this.getSpecialtyDisplayName(doctor.specialty)}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>Date:</strong><br>
                            ${date.toLocaleDateString()}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>Time:</strong><br>
                            ${this.selectedDateTime.displayTime}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>Consultation Type:</strong><br>
                            ${this.getAppointmentTypeDisplayName(this.selectedType)}
                        </div>
                        <div class="col-sm-6 mb-3">
                            <strong>Fee:</strong><br>
                            ${doctor.consultation_fee ? doctor.consultation_fee + ' SDG' : 'Free'}
                        </div>
                    </div>
                `;
                
            document.getElementById('appointment-summary').innerHTML = summaryHtml;
        } catch (error) {
            console.error('Error showing summary:', error);
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
            
            // Check if this is an API connection error (e.g., on GitHub Pages)
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                const currentLang = LanguageManager.getLanguage() || 'en';
                const errorMsg = currentLang === 'ar' ? 
                    'عذراً، لا يمكن حجز المواعيد حالياً. الخدمة تتطلب اتصال بالخادم.' :
                    'Sorry, appointment booking is not available currently. This service requires server connection.';
                this.showError(errorMsg);
                return;
            }
            
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
        // Just reload doctors with the specialty filter - let backend handle filtering
        this.loadDoctors();
    },

    // Helper functions
    formatDoctorName(fullName) {
        if (!fullName) return 'Unknown Doctor';
        
        // If the name already starts with "Dr.", "Doctor", or Arabic "د." prefix, don't add another prefix
        if (fullName.toLowerCase().startsWith('dr.') || 
            fullName.toLowerCase().startsWith('doctor ') ||
            fullName.startsWith('د.') ||
            fullName.startsWith('دكتور ')) {
            return fullName;
        }
        
        // Otherwise, add "Dr." prefix
        return `Dr. ${fullName}`;
    },

    getSpecialtyDisplayName(specialty) {
        const specialties = {
            cardiology: 'Cardiology',
            pediatrics: 'Pediatrics',
            dermatology: 'Dermatology',
            internal: 'Internal Medicine',
            psychiatry: 'Psychiatry',
            orthopedics: 'Orthopedics',
            general: 'General Medicine'
        };
        return specialties[specialty] || specialty;
    },

    getAppointmentTypeDisplayName(type) {
        const types = {
            video: 'Video Call',
            audio: 'Audio Call',
            chat: 'Text Chat'
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

    // Get user appointments
    async getUserAppointments(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.from_date) params.append('from_date', filters.from_date);
            if (filters.to_date) params.append('to_date', filters.to_date);
            
            const response = await ApiHelper.makeRequest(`/appointments/${params ? '?' + params : ''}`);
            return response;
        } catch (error) {
            console.error('Error fetching appointments:', error);
            this.showError('Failed to load appointments');
            return null;
        }
    },

    // Get appointment details
    async getAppointmentDetails(appointmentId) {
        try {
            const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}`);
            return response;
        } catch (error) {
            console.error('Error fetching appointment details:', error);
            this.showError('Failed to load appointment details');
            return null;
        }
    },

    // Cancel appointment
    async cancelAppointment(appointmentId, reason = '') {
        try {
            const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}/cancel`, {
                method: 'PUT',
                body: JSON.stringify({ cancellation_reason: reason })
            });
            if (response.success) {
                this.showSuccess('Appointment cancelled successfully');
            }
            return response;
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            this.showError('Failed to cancel appointment');
            return null;
        }
    },

    // Reschedule appointment
    async rescheduleAppointment(appointmentId, newDateTime, reason = '') {
        try {
            const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}/reschedule`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    new_date_time: newDateTime,
                    reschedule_reason: reason 
                })
            });
            if (response.success) {
                this.showSuccess('Appointment rescheduled successfully');
            }
            return response;
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            this.showError('Failed to reschedule appointment');
            return null;
        }
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