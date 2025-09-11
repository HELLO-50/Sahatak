// Doctor Availability Management - Following main.js patterns
const AvailabilityManager = {
    currentMonth: new Date(),
    currentSchedule: null,
    blockedTimes: [],
    calendarData: null,
    
    // Initialize the availability manager
    async init() {
        console.log('🟢 AvailabilityManager initializing...');
        
        // Ensure translations are loaded
        if (!LanguageManager.translations || !LanguageManager.translations.ar) {
            await LanguageManager.loadTranslations();
        }
        
        // Update UI with translations
        this.updateUITranslations();
        
        // Load initial data
        await this.loadWeeklySchedule();
        await this.loadCalendarData();
        await this.loadBlockedTimes();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ AvailabilityManager initialized successfully');
    },
    
    // Update UI with translations
    updateUITranslations() {
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        if (!t || !t.availability) return;
        
        // Update page elements with translations
        // This would be expanded with actual translation keys
        console.log('UI translations updated for availability management');
    },
    
    // Load doctor's weekly schedule
    async loadWeeklySchedule() {
        try {
            const response = await ApiHelper.makeRequest('/availability/schedule');
            
            if (response.success) {
                // Ensure schedule data has proper structure
                this.currentSchedule = this.normalizeScheduleData(response.data.schedule);
                this.renderWeeklySchedule();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error loading weekly schedule:', error);
            const lang = LanguageManager.getLanguage() || 'ar';
            const errorMsg = LanguageManager.translations[lang]?.availability?.messages?.load_schedule_error || 'Failed to load weekly schedule';
            this.showAlert('error', errorMsg);
            this.renderDefaultSchedule();
        }
    },
    
    // Normalize schedule data to ensure proper format
    normalizeScheduleData(schedule) {
        const defaultDay = { enabled: false, start: '09:00', end: '17:00' };
        const daysOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        const normalized = {};
        
        daysOrder.forEach(day => {
            const dayData = schedule && schedule[day] ? schedule[day] : defaultDay;
            normalized[day] = {
                enabled: dayData.enabled || false,
                start: dayData.start || '09:00',
                end: dayData.end || '17:00'
            };
        });
        
        return normalized;
    },
    
    // Render weekly schedule form
    renderWeeklySchedule() {
        const container = document.getElementById('weekly-schedule-container');
        if (!container) return;
        
        // Get current language translations
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        
        // Get day names from translations
        const dayNames = t?.availability?.days || {
            'saturday': 'Saturday',
            'sunday': 'Sunday',
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday'
        };
        
        // Get time labels from translations
        const fromLabel = t?.availability?.weekly?.from_time || 'From';
        const toLabel = t?.availability?.weekly?.to_time || 'To';
        
        const daysOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        
        let html = '';
        
        daysOrder.forEach(dayKey => {
            const daySchedule = this.currentSchedule[dayKey] || { enabled: false, start: '09:00', end: '17:00' };
            const isEnabled = daySchedule.enabled;
            
            // Ensure start and end times are properly formatted
            const startTime = daySchedule.start || '09:00';
            const endTime = daySchedule.end || '17:00';
            
            html += `
                <div class="schedule-day ${isEnabled ? 'enabled' : 'disabled'}" data-day="${dayKey}">
                    <div class="day-header">
                        <div class="day-name">${dayNames[dayKey]}</div>
                        <label class="day-toggle">
                            <input type="checkbox" class="day-enabled-toggle" data-day="${dayKey}" ${isEnabled ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="time-inputs">
                        <div class="time-input-group">
                            <label>${fromLabel}</label>
                            <input type="time" class="form-control start-time-input" 
                                   data-day="${dayKey}" value="${startTime}" 
                                   ${!isEnabled ? 'disabled' : ''}>
                        </div>
                        <div class="time-input-group">
                            <label>${toLabel}</label>
                            <input type="time" class="form-control end-time-input" 
                                   data-day="${dayKey}" value="${endTime}"
                                   ${!isEnabled ? 'disabled' : ''}>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add event listeners for toggles
        container.querySelectorAll('.day-enabled-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.toggleDay(e.target.dataset.day, e.target.checked);
            });
        });
        
        // Add event listeners for time inputs
        container.querySelectorAll('.start-time-input, .end-time-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateTimeSlot(e.target.dataset.day, e.target);
            });
        });
    },
    
    // Render default schedule if loading fails
    renderDefaultSchedule() {
        this.currentSchedule = {
            'saturday': { enabled: false, start: '09:00', end: '17:00' },
            'sunday': { enabled: true, start: '09:00', end: '17:00' },
            'monday': { enabled: true, start: '09:00', end: '17:00' },
            'tuesday': { enabled: true, start: '09:00', end: '17:00' },
            'wednesday': { enabled: true, start: '09:00', end: '17:00' },
            'thursday': { enabled: true, start: '09:00', end: '17:00' },
            'friday': { enabled: false, start: '09:00', end: '17:00' }
        };
        this.renderWeeklySchedule();
    },
    
    // Toggle day availability
    toggleDay(dayKey, enabled) {
        const dayElement = document.querySelector(`.schedule-day[data-day="${dayKey}"]`);
        const timeInputs = dayElement.querySelectorAll('.start-time-input, .end-time-input');
        
        if (enabled) {
            dayElement.classList.add('enabled');
            dayElement.classList.remove('disabled');
            timeInputs.forEach(input => input.disabled = false);
        } else {
            dayElement.classList.add('disabled');
            dayElement.classList.remove('enabled');
            timeInputs.forEach(input => input.disabled = true);
        }
        
        // Update schedule object
        if (!this.currentSchedule[dayKey]) {
            this.currentSchedule[dayKey] = { start: '09:00', end: '17:00' };
        }
        this.currentSchedule[dayKey].enabled = enabled;
    },
    
    // Update time slot
    updateTimeSlot(dayKey, input) {
        if (!this.currentSchedule[dayKey]) {
            this.currentSchedule[dayKey] = { enabled: true };
        }
        
        if (input.classList.contains('start-time-input')) {
            this.currentSchedule[dayKey].start = input.value;
        } else {
            this.currentSchedule[dayKey].end = input.value;
        }
        
        // Validate time range
        this.validateTimeRange(dayKey);
    },
    
    // Validate time range
    validateTimeRange(dayKey) {
        const schedule = this.currentSchedule[dayKey];
        if (!schedule || !schedule.start || !schedule.end) return;
        
        const startTime = new Date(`1970-01-01T${schedule.start}:00`);
        const endTime = new Date(`1970-01-01T${schedule.end}:00`);
        
        if (endTime <= startTime) {
            const endInput = document.querySelector(`.end-time-input[data-day="${dayKey}"]`);
            endInput.classList.add('is-invalid');
            
            // Show error message
            let errorDiv = endInput.nextElementSibling;
            if (!errorDiv || !errorDiv.classList.contains('invalid-feedback')) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'invalid-feedback';
                endInput.insertAdjacentElement('afterend', errorDiv);
            }
            const lang = LanguageManager.getLanguage() || 'ar';
            const errorMsg = lang === 'ar' ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End time must be after start time';
            errorDiv.textContent = errorMsg;
        } else {
            const endInput = document.querySelector(`.end-time-input[data-day="${dayKey}"]`);
            endInput.classList.remove('is-invalid');
            const errorDiv = endInput.nextElementSibling;
            if (errorDiv && errorDiv.classList.contains('invalid-feedback')) {
                errorDiv.remove();
            }
        }
    },
    
    // Save weekly schedule
    async saveWeeklySchedule() {
        try {
            // Validate all time ranges
            let hasErrors = false;
            Object.keys(this.currentSchedule).forEach(dayKey => {
                const schedule = this.currentSchedule[dayKey];
                if (schedule.enabled) {
                    const startTime = new Date(`1970-01-01T${schedule.start}:00`);
                    const endTime = new Date(`1970-01-01T${schedule.end}:00`);
                    
                    if (endTime <= startTime) {
                        hasErrors = true;
                        this.validateTimeRange(dayKey);
                    }
                }
            });
            
            if (hasErrors) {
                const lang = LanguageManager.getLanguage() || 'ar';
                const errorMsg = lang === 'ar' ? 'يرجى تصحيح الأخطاء في الأوقات المحددة' : 'Please correct the errors in the specified times';
                this.showAlert('error', errorMsg);
                return;
            }
            
            // Show loading state
            const saveBtn = document.getElementById('save-schedule-btn');
            const originalText = saveBtn.innerHTML;
            const lang = LanguageManager.getLanguage() || 'ar';
            const savingText = lang === 'ar' ? 'جاري الحفظ...' : 'Saving...';
            saveBtn.innerHTML = `<i class="bi bi-hourglass-split me-1"></i>${savingText}`;
            saveBtn.disabled = true;
            
            const response = await ApiHelper.makeRequest('/availability/schedule', {
                method: 'PUT',
                body: JSON.stringify({
                    schedule: this.currentSchedule
                })
            });
            
            if (response.success) {
                const lang = LanguageManager.getLanguage() || 'ar';
                const successMsg = lang === 'ar' ? 'تم حفظ الجدول الأسبوعي بنجاح' : 'Weekly schedule saved successfully';
                this.showAlert('success', successMsg);
                // Reload calendar data to reflect changes
                await this.loadCalendarData();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            const lang = LanguageManager.getLanguage() || 'ar';
            const errorMsg = lang === 'ar' ? 'فشل في حفظ الجدول الأسبوعي' : 'Failed to save weekly schedule';
            this.showAlert('error', errorMsg);
        } finally {
            // Reset button state
            const saveBtn = document.getElementById('save-schedule-btn');
            const lang = LanguageManager.getLanguage() || 'ar';
            const saveText = lang === 'ar' ? 'حفظ الجدول' : 'Save Schedule';
            saveBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i>${saveText}`;
            saveBtn.disabled = false;
        }
    },
    
    // Load calendar data
    async loadCalendarData() {
        try {
            const startDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
            const endDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
            
            const response = await ApiHelper.makeRequest(`/availability/calendar?start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`);
            
            if (response.success) {
                this.calendarData = response.data.calendar;
                this.renderCalendarView();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error loading calendar data:', error);
            this.showAlert('error', 'فشل في تحميل بيانات التقويم');
        }
    },
    
    // Render calendar view
    renderCalendarView() {
        const container = document.getElementById('availability-calendar');
        if (!container || !this.calendarData) return;
        
        // Update month display
        const monthNames = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        
        const currentMonthSpan = document.getElementById('current-month');
        if (currentMonthSpan) {
            currentMonthSpan.textContent = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
        }
        
        // Get current language translations
        const lang = LanguageManager.getLanguage() || 'ar';
        const t = LanguageManager.translations[lang];
        
        // Get day names from translations
        const dayNames = t?.availability?.days || {
            'saturday': 'Saturday',
            'sunday': 'Sunday',
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday'
        };
        
        // Build calendar HTML
        let html = '<table class="availability-calendar table table-bordered">';
        
        // Header
        html += '<thead class="calendar-header"><tr>';
        const daysOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        daysOrder.forEach(dayKey => {
            html += `<th>${dayNames[dayKey]}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        // Get first day of month and create calendar grid
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        
        // Adjust for Saturday start (Saturday = 6, Sunday = 0)
        let startDay = firstDay.getDay() === 6 ? 0 : firstDay.getDay() + 1;
        
        let date = 1;
        let calendarIndex = 0;
        
        for (let week = 0; week < 6 && date <= lastDay.getDate(); week++) {
            html += '<tr>';
            
            for (let day = 0; day < 7; day++) {
                if ((week === 0 && day < startDay) || date > lastDay.getDate()) {
                    html += '<td class="calendar-day other-month"></td>';
                } else {
                    const dayData = this.calendarData[calendarIndex] || {};
                    const today = new Date();
                    const isToday = date === today.getDate() && 
                                   this.currentMonth.getMonth() === today.getMonth() && 
                                   this.currentMonth.getFullYear() === today.getFullYear();
                    
                    let dayClass = 'calendar-day';
                    if (isToday) dayClass += ' today';
                    if (dayData.enabled) dayClass += ' available';
                    else dayClass += ' unavailable';
                    
                    html += `<td class="${dayClass}" data-date="${dayData.date}">`;
                    html += `<div class="day-number">${date}</div>`;
                    
                    if (dayData.appointments && dayData.appointments.length > 0) {
                        html += `<div class="day-appointments">`;
                        
                        // Show individual appointments with patient names and color coding
                        dayData.appointments.forEach((appointment, index) => {
                            if (index < 3) { // Show max 3 appointments, then show count
                                const statusClass = this.getAppointmentStatusClass(appointment.status);
                                const time = this.formatAppointmentTime(appointment.appointment_time || appointment.appointment_date);
                                const patientName = appointment.patient_name || 'Patient';
                                
                                html += `<div class="appointment-item ${statusClass}" data-appointment-id="${appointment.id}" onclick="AvailabilityManager.showAppointmentDetails(${appointment.id})">`;
                                html += `<div class="appointment-time">${time}</div>`;
                                html += `<div class="appointment-patient">${patientName}</div>`;
                                html += `</div>`;
                            }
                        });
                        
                        // Show "+X more" if there are more appointments
                        if (dayData.appointments.length > 3) {
                            const remaining = dayData.appointments.length - 3;
                            html += `<div class="appointment-more">+${remaining} more</div>`;
                        }
                        
                        html += `</div>`;
                    }
                    
                    // Count blocked slots
                    const blockedSlots = dayData.available_slots ? 
                        dayData.available_slots.filter(slot => !slot.available).length : 0;
                    
                    if (blockedSlots > 0) {
                        html += `<span class="blocked-count">${blockedSlots} محجوب</span>`;
                    }
                    
                    html += '</td>';
                    date++;
                    calendarIndex++;
                }
            }
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
        // Add click events for calendar days
        container.querySelectorAll('.calendar-day[data-date]').forEach(day => {
            day.addEventListener('click', (e) => {
                this.showDayDetails(e.target.dataset.date);
            });
        });
    },
    
    // Show day details
    showDayDetails(date) {
        const dayData = this.calendarData.find(day => day.date === date);
        if (!dayData) return;
        
        // This could open a modal with detailed day information
        console.log('Day details for:', date, dayData);
    },
    
    // Load blocked times
    async loadBlockedTimes() {
        try {
            // For now, extract blocked times from calendar data
            this.blockedTimes = [];
            
            if (this.calendarData) {
                this.calendarData.forEach(day => {
                    if (day.appointments) {
                        day.appointments.forEach(apt => {
                            if (apt.status === 'blocked') {
                                this.blockedTimes.push({
                                    id: apt.id,
                                    date: day.date,
                                    time: apt.time,
                                    reason: 'Doctor unavailable'
                                });
                            }
                        });
                    }
                });
            }
            
            this.renderBlockedTimes();
        } catch (error) {
            console.error('Error loading blocked times:', error);
            this.showAlert('error', 'فشل في تحميل الأوقات المحجوبة');
        }
    },
    
    // Render blocked times list
    renderBlockedTimes() {
        const container = document.getElementById('blocked-times-list');
        if (!container) return;
        
        if (this.blockedTimes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-calendar-check text-success" style="font-size: 3rem;"></i>
                    <h6 class="mt-3">لا توجد أوقات محجوبة</h6>
                    <p class="text-muted">جميع أوقاتك متاحة للحجز حسب الجدول الأسبوعي</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        this.blockedTimes.forEach(blocked => {
            const date = new Date(blocked.date);
            const formattedDate = date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            html += `
                <div class="blocked-time-item" data-block-id="${blocked.id}">
                    <div class="blocked-time-header">
                        <div>
                            <div class="blocked-date">${formattedDate}</div>
                            <div class="blocked-time-range">${blocked.time}</div>
                        </div>
                        <button class="btn btn-outline-success btn-sm unblock-btn" 
                                onclick="AvailabilityManager.unblockTime(${blocked.id})">
                            <i class="bi bi-check-circle me-1"></i>إلغاء الحجب
                        </button>
                    </div>
                    ${blocked.reason ? `<div class="blocked-reason">${blocked.reason}</div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    },
    
    // Block time slot
    async blockTimeSlot(formData) {
        try {
            const response = await ApiHelper.makeRequest('/availability/block-time', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            if (response.success) {
                this.showAlert('success', 'تم حجب الوقت بنجاح');
                
                // Refresh data
                await this.loadCalendarData();
                await this.loadBlockedTimes();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('blockTimeModal'));
                if (modal) modal.hide();
                
                // Reset form
                document.getElementById('block-time-form').reset();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error blocking time:', error);
            this.showAlert('error', error.message || 'فشل في حجب الوقت');
        }
    },
    
    // Unblock time slot
    async unblockTime(blockId) {
        if (!confirm('هل أنت متأكد من إلغاء حجب هذا الوقت؟')) {
            return;
        }
        
        try {
            const response = await ApiHelper.makeRequest(`/availability/unblock-time/${blockId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.showAlert('success', 'تم إلغاء حجب الوقت بنجاح');
                
                // Refresh data
                await this.loadCalendarData();
                await this.loadBlockedTimes();
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error unblocking time:', error);
            this.showAlert('error', error.message || 'فشل في إلغاء حجب الوقت');
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Weekly schedule form submission
        const scheduleForm = document.getElementById('weekly-schedule-form');
        if (scheduleForm) {
            scheduleForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveWeeklySchedule();
            });
        }
        
        // Block time form submission
        const blockForm = document.getElementById('block-time-form');
        if (blockForm) {
            blockForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    date: document.getElementById('block-date').value,
                    start_time: document.getElementById('block-start-time').value,
                    end_time: document.getElementById('block-end-time').value,
                    reason: document.getElementById('block-reason').value
                };
                
                // Validate form
                if (!formData.date || !formData.start_time || !formData.end_time) {
                    this.showAlert('error', 'يرجى ملء جميع الحقول المطلوبة');
                    return;
                }
                
                // Validate time range
                const startTime = new Date(`1970-01-01T${formData.start_time}:00`);
                const endTime = new Date(`1970-01-01T${formData.end_time}:00`);
                
                if (endTime <= startTime) {
                    this.showAlert('error', 'وقت النهاية يجب أن يكون بعد وقت البداية');
                    return;
                }
                
                await this.blockTimeSlot(formData);
            });
        }
        
        // Set minimum date for blocking (today)
        const blockDateInput = document.getElementById('block-date');
        if (blockDateInput) {
            const today = new Date().toISOString().split('T')[0];
            blockDateInput.setAttribute('min', today);
        }
    },
    
    // Navigation functions
    async previousMonth() {
        // Properly handle year boundary crossing
        const newDate = new Date(this.currentMonth);
        if (newDate.getMonth() === 0) {
            // January -> December of previous year
            newDate.setFullYear(newDate.getFullYear() - 1);
            newDate.setMonth(11);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        this.currentMonth = newDate;
        await this.loadCalendarData();
    },
    
    async nextMonth() {
        // Properly handle year boundary crossing
        const newDate = new Date(this.currentMonth);
        if (newDate.getMonth() === 11) {
            // December -> January of next year
            newDate.setFullYear(newDate.getFullYear() + 1);
            newDate.setMonth(0);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        this.currentMonth = newDate;
        await this.loadCalendarData();
    },
    
    // Reset schedule to default
    resetSchedule() {
        const lang = LanguageManager.getLanguage() || 'ar';
        const confirmMsg = LanguageManager.translations[lang]?.availability?.messages?.reset_confirm || 'Are you sure you want to reset the weekly schedule?';
        if (confirm(confirmMsg)) {
            this.renderDefaultSchedule();
        }
    },
    
    // Get appointment status CSS class based on status
    getAppointmentStatusClass(status) {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'appointment-completed'; // Green
            case 'cancelled':
                return 'appointment-cancelled'; // Red
            case 'in_progress':
                return 'appointment-ongoing'; // Blue
            case 'scheduled':
            case 'confirmed':
            default:
                return 'appointment-upcoming'; // Gray
        }
    },
    
    // Format appointment time for display
    formatAppointmentTime(dateTimeString) {
        if (!dateTimeString) return '';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        } catch (error) {
            console.error('Error formatting time:', error);
            return '';
        }
    },
    
    // Show appointment details modal
    async showAppointmentDetails(appointmentId) {
        try {
            const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}`);
            
            if (response.success) {
                const appointment = response.data;
                this.displayAppointmentModal(appointment);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Error loading appointment details:', error);
            this.showAlert('error', 'Failed to load appointment details');
        }
    },
    
    // Display appointment details in modal
    displayAppointmentModal(appointment) {
        const modalHtml = `
            <div class="modal fade" id="appointmentDetailsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-calendar-check me-2"></i>
                                Appointment Details
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-sm-4"><strong>Patient:</strong></div>
                                <div class="col-sm-8">${appointment.patient_name || 'N/A'}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-4"><strong>Date & Time:</strong></div>
                                <div class="col-sm-8">${this.formatAppointmentDateTime(appointment.appointment_date)}</div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-4"><strong>Status:</strong></div>
                                <div class="col-sm-8">
                                    <span class="badge ${this.getStatusBadgeClass(appointment.status)}">${appointment.status}</span>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-sm-4"><strong>Type:</strong></div>
                                <div class="col-sm-8">${appointment.appointment_type || 'Regular'}</div>
                            </div>
                            ${appointment.session_started_at ? `
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>Duration:</strong></div>
                                    <div class="col-sm-8">${this.calculateDuration(appointment)}</div>
                                </div>
                            ` : ''}
                            ${appointment.notes ? `
                                <div class="row mb-3">
                                    <div class="col-sm-4"><strong>Notes:</strong></div>
                                    <div class="col-sm-8">${appointment.notes}</div>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('appointmentDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('appointmentDetailsModal'));
        modal.show();
    },
    
    // Format full appointment date and time
    formatAppointmentDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeString;
        }
    },
    
    // Get status badge class
    getStatusBadgeClass(status) {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'bg-success';
            case 'cancelled':
                return 'bg-danger';
            case 'in_progress':
                return 'bg-primary';
            case 'scheduled':
            case 'confirmed':
            default:
                return 'bg-secondary';
        }
    },
    
    // Calculate appointment duration
    calculateDuration(appointment) {
        if (!appointment.session_started_at) {
            return 'Not started';
        }
        
        const startTime = new Date(appointment.session_started_at);
        const endTime = appointment.completed_at ? 
            new Date(appointment.completed_at) : 
            (appointment.session_ended_at ? new Date(appointment.session_ended_at) : new Date());
        
        const durationMs = endTime - startTime;
        const minutes = Math.floor(durationMs / 60000);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    },

    // Show alert message
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
    },
    
    // Quick schedule presets
    applyQuickSchedule(type) {
        switch(type) {
            case 'full-time':
                this.currentSchedule = {
                    'saturday': { enabled: true, start: '08:00', end: '18:00' },
                    'sunday': { enabled: true, start: '08:00', end: '18:00' },
                    'monday': { enabled: true, start: '08:00', end: '18:00' },
                    'tuesday': { enabled: true, start: '08:00', end: '18:00' },
                    'wednesday': { enabled: true, start: '08:00', end: '18:00' },
                    'thursday': { enabled: true, start: '08:00', end: '18:00' },
                    'friday': { enabled: true, start: '08:00', end: '18:00' }
                };
                break;
            case 'weekdays-only':
                this.currentSchedule = {
                    'saturday': { enabled: false, start: '09:00', end: '17:00' },
                    'sunday': { enabled: true, start: '09:00', end: '17:00' },
                    'monday': { enabled: true, start: '09:00', end: '17:00' },
                    'tuesday': { enabled: true, start: '09:00', end: '17:00' },
                    'wednesday': { enabled: true, start: '09:00', end: '17:00' },
                    'thursday': { enabled: true, start: '09:00', end: '17:00' },
                    'friday': { enabled: false, start: '09:00', end: '17:00' }
                };
                break;
            case 'part-time':
                this.currentSchedule = {
                    'saturday': { enabled: false, start: '10:00', end: '14:00' },
                    'sunday': { enabled: true, start: '10:00', end: '14:00' },
                    'monday': { enabled: true, start: '10:00', end: '14:00' },
                    'tuesday': { enabled: true, start: '10:00', end: '14:00' },
                    'wednesday': { enabled: true, start: '10:00', end: '14:00' },
                    'thursday': { enabled: false, start: '10:00', end: '14:00' },
                    'friday': { enabled: false, start: '10:00', end: '14:00' }
                };
                break;
            default:
                this.renderDefaultSchedule();
                return;
        }
        
        this.renderWeeklySchedule();
        const lang = LanguageManager.getLanguage() || 'ar';
        const successMsg = LanguageManager.translations[lang]?.availability?.messages?.template_applied || 'Template applied successfully';
        this.showAlert('success', successMsg);
    },
    
    // Export schedule as JSON
    exportSchedule() {
        const scheduleData = {
            doctor_schedule: this.currentSchedule,
            blocked_times: this.blockedTimes,
            exported_at: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(scheduleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `doctor_schedule_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showAlert('success', 'تم تصدير الجدول بنجاح');
    },
    
    // Get availability statistics
    getAvailabilityStats() {
        if (!this.currentSchedule) return null;
        
        let totalEnabledDays = 0;
        let totalHours = 0;
        
        Object.values(this.currentSchedule).forEach(day => {
            if (day.enabled) {
                totalEnabledDays++;
                const start = new Date(`1970-01-01T${day.start}:00`);
                const end = new Date(`1970-01-01T${day.end}:00`);
                const hours = (end - start) / (1000 * 60 * 60);
                totalHours += hours;
            }
        });
        
        const avgHoursPerDay = totalEnabledDays > 0 ? (totalHours / totalEnabledDays).toFixed(1) : 0;
        const weeklyHours = totalHours.toFixed(1);
        
        return {
            enabledDays: totalEnabledDays,
            weeklyHours,
            avgHoursPerDay,
            blockedSlotsCount: this.blockedTimes.length
        };
    }
};

// Global functions for HTML onclick events
function resetSchedule() {
    AvailabilityManager.resetSchedule();
}

function previousMonth() {
    AvailabilityManager.previousMonth();
}

function nextMonth() {
    AvailabilityManager.nextMonth();
}

function showWeeklySchedule() {
    const tab = new bootstrap.Tab(document.getElementById('weekly-tab'));
    tab.show();
}

function showCalendarView() {
    const tab = new bootstrap.Tab(document.getElementById('calendar-tab'));
    tab.show();
}