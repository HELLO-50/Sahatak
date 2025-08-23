// Dashboard Translation Management
const DashboardTranslations = {
    
    // Update patient dashboard translations
    updatePatientDashboard(lang) {
        const t = LanguageManager.translations[lang];
        if (!t || !t.dashboard || !t.dashboard.patient) {
            console.error('Patient dashboard translations not found');
            return;
        }
        
        const patient = t.dashboard.patient;
        
        // Header section
        this.updateElementText('dashboard-title', patient.title);
        this.updateElementText('dashboard-subtitle', patient.subtitle);
        this.updateElementText('logout-text', patient.logout);
        
        // Show the opposite language (the one you can switch TO)
        const oppositeLanguage = lang === 'ar' ? 'English' : 'العربية';
        this.updateElementText('current-lang', oppositeLanguage);
        
        // Navigation
        this.updateElementText('nav-title', patient.nav.title);
        this.updateElementText('nav-home', patient.nav.home);
        this.updateElementText('nav-appointments', patient.nav.appointments);
        this.updateElementText('nav-records', patient.nav.records);
        this.updateElementText('nav-prescriptions', patient.nav.prescriptions);
        this.updateElementText('nav-profile', patient.nav.profile);
        this.updateElementText('nav-settings', patient.nav.settings);
        
        // Quick Actions
        this.updateElementText('action-book', patient.quick_actions.book);
        this.updateElementText('action-book-desc', patient.quick_actions.book_desc);
        this.updateElementText('action-records', patient.quick_actions.records);
        this.updateElementText('action-records-desc', patient.quick_actions.records_desc);
        this.updateElementText('action-chat', patient.quick_actions.chat);
        this.updateElementText('action-chat-desc', patient.quick_actions.chat_desc);
        
        // Statistics
        this.updateElementText('stat-appointments', patient.stats.appointments);
        this.updateElementText('stat-prescriptions', patient.stats.prescriptions);
        this.updateElementText('stat-reports', patient.stats.reports);
        
        // Profile Action Buttons (new layout)
        this.updateElementText('btn-profile', patient.buttons?.profile || patient.dropdown?.profile);
        this.updateElementText('btn-settings', patient.buttons?.settings || patient.dropdown?.settings);
        this.updateElementText('btn-logout', patient.buttons?.logout || patient.dropdown?.logout);
        
        // Dropdown menu (legacy)
        this.updateElementText('dropdown-profile', patient.dropdown?.profile);
        this.updateElementText('dropdown-settings', patient.dropdown?.settings);
        this.updateElementText('dropdown-logout', patient.dropdown?.logout);
        
        // Upcoming Appointments
        this.updateElementText('upcoming-title', patient.upcoming.title);
        this.updateElementText('join-call', patient.upcoming.join_call);
        this.updateElementText('reschedule', patient.upcoming.reschedule);
        this.updateElementText('status-pending', patient.upcoming.status_pending);
        this.updateElementText('view-all-appointments', patient.upcoming.view_all);
        
        // Health Summary
        this.updateElementText('health-summary-title', patient.health_summary.title);
        this.updateElementText('blood-pressure', patient.health_summary.blood_pressure);
        this.updateElementText('temperature', patient.health_summary.temperature);
        this.updateElementText('blood-sugar', patient.health_summary.blood_sugar);
        this.updateElementText('weight', patient.health_summary.weight);
        
        // Update footer
        this.updateFooter(t);
    },
    
    // Update doctor dashboard translations
    updateDoctorDashboard(lang) {
        const t = LanguageManager.translations[lang];
        if (!t || !t.dashboard || !t.dashboard.doctor) {
            console.error('Doctor dashboard translations not found');
            return;
        }
        
        const doctor = t.dashboard.doctor;
        
        // Header section
        this.updateElementText('dashboard-title', doctor.title);
        this.updateElementText('dashboard-subtitle', doctor.subtitle);
        this.updateElementText('user-status', doctor.user_status);
        this.updateElementText('availability-status', doctor.available);
        this.updateElementText('logout-text', doctor.logout);
        
        // Show the opposite language (the one you can switch TO)
        const oppositeLanguage = lang === 'ar' ? 'English' : 'العربية';
        this.updateElementText('current-lang', oppositeLanguage);
        
        // Navigation
        this.updateElementText('nav-title', doctor.nav.title);
        this.updateElementText('nav-home', doctor.nav.home);
        this.updateElementText('nav-patients', doctor.nav.patients);
        this.updateElementText('nav-appointments', doctor.nav.appointments);
        this.updateElementText('nav-consultations', doctor.nav.consultations);
        this.updateElementText('nav-prescriptions', doctor.nav.prescriptions);
        this.updateElementText('nav-schedule', doctor.nav.schedule);
        this.updateElementText('nav-profile', doctor.nav.profile);
        this.updateElementText('nav-settings', doctor.nav.settings);
        
        // Quick Actions
        this.updateElementText('action-prescription', doctor.quick_actions.prescription);
        this.updateElementText('action-prescription-desc', doctor.quick_actions.prescription_desc);
        this.updateElementText('action-records', doctor.quick_actions.records);
        this.updateElementText('action-records-desc', doctor.quick_actions.records_desc);
        this.updateElementText('action-schedule', doctor.quick_actions.schedule);
        this.updateElementText('action-schedule-desc', doctor.quick_actions.schedule_desc);
        
        // Profile Action Buttons (new layout)
        this.updateElementText('btn-profile', doctor.buttons?.profile || doctor.dropdown?.profile);
        this.updateElementText('btn-settings', doctor.buttons?.settings || doctor.dropdown?.settings);
        this.updateElementText('btn-logout', doctor.buttons?.logout || doctor.dropdown?.logout);
        
        // Dropdown menu (legacy)
        this.updateElementText('dropdown-profile', doctor.dropdown?.profile);
        this.updateElementText('dropdown-settings', doctor.dropdown?.settings);
        this.updateElementText('dropdown-logout', doctor.dropdown?.logout);
        
        // Schedule
        this.updateElementText('schedule-title', doctor.schedule.title);
        this.updateElementText('start-consultation', doctor.schedule.start_consultation);
        this.updateElementText('view-file', doctor.schedule.view_file);
        this.updateElementText('view-full-schedule', doctor.schedule.view_full);
        
        // Quick Stats
        this.updateElementText('quick-stats-title', doctor.quick_stats.title);
        this.updateElementText('stat-appointments-today', doctor.quick_stats.appointments_today);
        this.updateElementText('stat-consultations', doctor.quick_stats.consultations);
        this.updateElementText('stat-rating', doctor.quick_stats.rating);
        this.updateElementText('new-patients-week', doctor.quick_stats.new_patients);
        
        // Activity
        this.updateElementText('activity-title', doctor.activity.title);
        this.updateElementText('view-all-activity', doctor.activity.view_all);
        
        // Waiting Patients
        this.updateElementText('waiting-title', doctor.waiting.title);
        this.updateElementText('reply', doctor.waiting.reply);
        this.updateElementText('reply-2', doctor.waiting.reply);
        this.updateElementText('view-all-messages', doctor.waiting.view_all);
        
        // Update footer
        this.updateFooter(t);
    },
    
    // Update footer translations (shared between dashboards)
    updateFooter(t) {
        if (!t.footer) return;
        
        this.updateElementText('footer-brand', t.footer.brand);
        this.updateElementText('footer-links-title', t.footer.quick_links);
        this.updateElementText('footer-about', t.footer.about);
        this.updateElementText('footer-services', t.footer.services);
        this.updateElementText('footer-support-title', t.footer.support);
        this.updateElementText('footer-help', t.footer.help);
        this.updateElementText('footer-contact', t.footer.contact);
        this.updateElementText('footer-emergency-text', t.footer.emergency.text);
        this.updateElementText('footer-emergency-action', t.footer.emergency.action);
        this.updateElementText('footer-emergency-note', t.footer.emergency.note);
        this.updateElementText('footer-copyright', t.footer.copyright);
        this.updateElementText('footer-medical-disclaimer', t.footer.disclaimer);
    },
    
    // Helper function to update element text safely
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element && text) {
            element.textContent = text;
        }
    },
    
    // Language switching for dashboards
    switchDashboardLanguage(lang, dashboardType) {
        // Apply language settings
        LanguageManager.applyLanguage(lang);
        LanguageManager.setLanguage(lang);
        
        // Update dashboard content based on type
        if (dashboardType === 'patient') {
            this.updatePatientDashboard(lang);
        } else if (dashboardType === 'doctor') {
            this.updateDoctorDashboard(lang);
        }
        
        // Update user name with correct language prefix
        this.updateUserName();
        
        console.log(`Dashboard language switched to: ${lang}`);
    },
    
    // Update user name in dashboard header
    updateUserName() {
        const userName = localStorage.getItem('sahatak_user_name');
        const userType = localStorage.getItem('sahatak_user_type');
        
        if (userName) {
            let displayName = userName;
            
            // Add Dr. prefix for doctors if not already present
            if (userType === 'doctor' && !userName.toLowerCase().startsWith('dr.') && !userName.toLowerCase().startsWith('د.')) {
                const currentLang = LanguageManager.getLanguage() || 'ar';
                const prefix = currentLang === 'ar' ? 'د. ' : 'Dr. ';
                displayName = prefix + userName;
            }
            
            this.updateElementText('user-name', displayName);
            console.log('User name updated to:', displayName);
        } else {
            console.warn('User name not found in localStorage');
        }
    },

    // Initialize dashboard translations on page load
    async initializeDashboard(dashboardType) {
        console.log(`Initializing ${dashboardType} dashboard translations...`);
        
        // Load translations first
        await LanguageManager.loadTranslations();
        
        // Get saved language or default to Arabic
        const savedLanguage = LanguageManager.getLanguage() || 'ar';
        
        // Apply language settings
        LanguageManager.applyLanguage(savedLanguage);
        
        // Update dashboard content
        if (dashboardType === 'patient') {
            this.updatePatientDashboard(savedLanguage);
        } else if (dashboardType === 'doctor') {
            this.updateDoctorDashboard(savedLanguage);
        }
        
        // Update user name from localStorage
        this.updateUserName();
        
        console.log(`${dashboardType} dashboard initialized with language: ${savedLanguage}`);
    }
};

// Global function for language switching in dashboards
function showLanguageSelector() {
    const currentLang = LanguageManager.getLanguage() || 'ar';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    // Determine dashboard type from page URL or body class
    const isDoctorDashboard = window.location.href.includes('doctor.html');
    const dashboardType = isDoctorDashboard ? 'doctor' : 'patient';
    
    // Switch language
    DashboardTranslations.switchDashboardLanguage(newLang, dashboardType);
}