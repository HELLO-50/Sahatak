// Calendar Widget - Following main.js patterns
const CalendarWidget = {
    currentDate: new Date(),
    selectedDate: null,
    minDate: new Date(),
    maxDate: null, // Set to 90 days from now by default
    availableDates: new Set(),
    onDateSelect: null, // Callback function
    
    // Initialize calendar widget
    init(containerId, options = {}) {
        this.containerId = containerId;
        this.onDateSelect = options.onDateSelect;
        this.minDate = options.minDate || new Date();
        this.maxDate = options.maxDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
        this.availableDates = new Set(options.availableDates || []);
        
        this.render();
        this.setupEventListeners();
    },
    
    // Render the calendar
    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const lang = LanguageManager.getLanguage() || 'ar';
        const isRTL = lang === 'ar';
        
        const calendarHtml = `
            <div class="calendar-widget ${isRTL ? 'rtl' : 'ltr'}">
                <div class="calendar-header">
                    <button type="button" class="btn btn-sm btn-outline-secondary calendar-nav" data-action="prev">
                        <i class="bi bi-chevron-${isRTL ? 'right' : 'left'}"></i>
                    </button>
                    <h6 class="calendar-month-year mb-0">${this.getMonthYearText(lang)}</h6>
                    <button type="button" class="btn btn-sm btn-outline-secondary calendar-nav" data-action="next">
                        <i class="bi bi-chevron-${isRTL ? 'left' : 'right'}"></i>
                    </button>
                </div>
                <div class="calendar-grid">
                    ${this.renderDaysOfWeek(lang)}
                    ${this.renderCalendarDays()}
                </div>
            </div>
        `;
        
        container.innerHTML = calendarHtml;
    },
    
    // Render days of week header
    renderDaysOfWeek(lang) {
        const daysArabic = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        const daysEnglish = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const days = lang === 'ar' ? daysArabic : daysEnglish;
        
        return `
            <div class="calendar-days-header">
                ${days.map(day => `<div class="calendar-day-header">${day}</div>`).join('')}
            </div>
        `;
    },
    
    // Render calendar days
    renderCalendarDays() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Get first day of month (0 = Sunday, 6 = Saturday)
        const firstDay = new Date(year, month, 1).getDay();
        // Adjust for Saturday start (Saturday = 0 in our calendar)
        const startDay = firstDay === 6 ? 0 : firstDay + 1;
        
        // Get number of days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Get days from previous month
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        
        let html = '<div class="calendar-days">';
        
        // Previous month's trailing days
        for (let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day prev-month">${day}</div>`;
        }
        
        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toISOString().split('T')[0];
            const isToday = this.isToday(date);
            const isSelected = this.isSelected(date);
            const isDisabled = this.isDisabled(date);
            const isAvailable = this.availableDates.has(dateString);
            
            const classes = [
                'calendar-day',
                isToday ? 'today' : '',
                isSelected ? 'selected' : '',
                isDisabled ? 'disabled' : '',
                isAvailable ? 'available' : ''
            ].filter(Boolean).join(' ');
            
            html += `
                <div class="${classes}" data-date="${dateString}" ${isDisabled ? '' : 'role="button" tabindex="0"'}>
                    <span class="day-number">${day}</span>
                    ${isAvailable ? '<div class="availability-indicator"></div>' : ''}
                </div>
            `;
        }
        
        // Next month's leading days to fill grid
        const totalCells = Math.ceil((startDay + daysInMonth) / 7) * 7;
        const nextMonthDays = totalCells - (startDay + daysInMonth);
        
        for (let day = 1; day <= nextMonthDays; day++) {
            html += `<div class="calendar-day next-month">${day}</div>`;
        }
        
        html += '</div>';
        return html;
    },
    
    // Setup event listeners
    setupEventListeners() {
        const container = document.getElementById(this.containerId);
        
        // Navigation buttons
        container.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-nav')) {
                const action = e.target.closest('.calendar-nav').dataset.action;
                if (action === 'prev') {
                    this.previousMonth();
                } else if (action === 'next') {
                    this.nextMonth();
                }
            }
            
            // Date selection
            if (e.target.closest('.calendar-day') && !e.target.closest('.calendar-day').classList.contains('disabled')) {
                const dayElement = e.target.closest('.calendar-day');
                const dateString = dayElement.dataset.date;
                if (dateString) {
                    this.selectDate(new Date(dateString));
                }
            }
        });
        
        // Keyboard navigation
        container.addEventListener('keydown', (e) => {
            if (e.target.closest('.calendar-day')) {
                const dayElement = e.target.closest('.calendar-day');
                const currentDate = new Date(dayElement.dataset.date);
                
                switch (e.key) {
                    case 'Enter':
                    case ' ':
                        e.preventDefault();
                        if (!dayElement.classList.contains('disabled')) {
                            this.selectDate(currentDate);
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.navigateDate(currentDate, -1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.navigateDate(currentDate, 1);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        this.navigateDate(currentDate, -7);
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.navigateDate(currentDate, 7);
                        break;
                }
            }
        });
    },
    
    // Navigate to previous month
    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    },
    
    // Navigate to next month
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    },
    
    // Navigate by days using keyboard
    navigateDate(currentDate, dayOffset) {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + dayOffset);
        
        // Change month if necessary
        if (newDate.getMonth() !== this.currentDate.getMonth()) {
            this.currentDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
            this.render();
        }
        
        // Focus the new date
        setTimeout(() => {
            const dateString = newDate.toISOString().split('T')[0];
            const dayElement = document.querySelector(`[data-date="${dateString}"]`);
            if (dayElement && !dayElement.classList.contains('disabled')) {
                dayElement.focus();
            }
        }, 100);
    },
    
    // Select a date
    selectDate(date) {
        if (this.isDisabled(date)) return;
        
        this.selectedDate = new Date(date);
        this.render();
        
        if (this.onDateSelect) {
            this.onDateSelect(new Date(date));
        }
    },
    
    // Set available dates
    setAvailableDates(dates) {
        this.availableDates = new Set(dates);
        this.render();
    },
    
    // Get month/year text
    getMonthYearText(lang) {
        const monthsArabic = [
            'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
            'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        const monthsEnglish = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const months = lang === 'ar' ? monthsArabic : monthsEnglish;
        const month = months[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        
        return lang === 'ar' ? `${month} ${year}` : `${month} ${year}`;
    },
    
    // Check if date is today
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    },
    
    // Check if date is selected
    isSelected(date) {
        return this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
    },
    
    // Check if date is disabled
    isDisabled(date) {
        return date < this.minDate || (this.maxDate && date > this.maxDate);
    },
    
    // Get selected date
    getSelectedDate() {
        return this.selectedDate;
    },
    
    // Set minimum date
    setMinDate(date) {
        this.minDate = new Date(date);
        this.render();
    },
    
    // Set maximum date
    setMaxDate(date) {
        this.maxDate = new Date(date);
        this.render();
    }
};

// CSS for calendar widget (will be added to appointments.css)
const calendarCSS = `
.calendar-widget {
    border: 1px solid #dee2e6;
    border-radius: 8px;
    padding: 1rem;
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eee;
}

.calendar-month-year {
    font-weight: 600;
    color: #495057;
}

.calendar-nav {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.calendar-grid {
    width: 100%;
}

.calendar-days-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    margin-bottom: 0.5rem;
}

.calendar-day-header {
    text-align: center;
    padding: 0.5rem 0.25rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: #6c757d;
    background: #f8f9fa;
    border-radius: 4px;
}

.calendar-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
}

.calendar-day {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 40px;
}

.calendar-day:hover:not(.disabled) {
    background-color: #e3f2fd;
    transform: scale(1.05);
}

.calendar-day:focus {
    outline: 2px solid #007bff;
    outline-offset: 1px;
}

.calendar-day.today {
    background-color: #007bff;
    color: white;
    font-weight: bold;
}

.calendar-day.selected {
    background-color: #28a745;
    color: white;
    font-weight: bold;
}

.calendar-day.disabled {
    color: #ced4da;
    cursor: not-allowed;
    background-color: transparent;
}

.calendar-day.available {
    border: 2px solid #28a745;
}

.calendar-day.available .availability-indicator {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 6px;
    height: 6px;
    background-color: #28a745;
    border-radius: 50%;
}

.calendar-day.prev-month,
.calendar-day.next-month {
    color: #adb5bd;
    cursor: default;
}

.calendar-day.prev-month:hover,
.calendar-day.next-month:hover {
    background-color: transparent;
    transform: none;
}

.calendar-widget.rtl {
    direction: rtl;
}

.calendar-widget.rtl .calendar-day-header {
    text-align: center;
}

@media (max-width: 576px) {
    .calendar-widget {
        padding: 0.75rem;
    }
    
    .calendar-day {
        min-height: 35px;
        font-size: 0.8rem;
    }
    
    .calendar-day-header {
        padding: 0.4rem 0.2rem;
        font-size: 0.75rem;
    }
}
`;