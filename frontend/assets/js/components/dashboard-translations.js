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

    // Update admin dashboard translations
    updateAdminDashboard(lang) {
        const t = LanguageManager.translations[lang];
        if (!t || !t.admin) {
            console.warn('Admin translations not available for language:', lang);
            return;
        }

        const admin = t.admin;

        // Header translations
        this.updateElementText('admin-dashboard-title', admin.dashboard.title);
        this.updateElementText('admin-dashboard-subtitle', admin.dashboard.subtitle);

        // Navigation translations
        this.updateElementText('admin-nav-dashboard', admin.navigation.dashboard);
        this.updateElementText('admin-nav-users', admin.navigation.users);
        this.updateElementText('admin-nav-verification', admin.navigation.verification);
        this.updateElementText('admin-nav-settings', admin.navigation.settings);
        this.updateElementText('admin-nav-health', admin.navigation.health);
        this.updateElementText('admin-nav-analytics', admin.navigation.analytics);

        // Statistics translations
        this.updateElementText('admin-stat-total-users', admin.stats.total_users);
        this.updateElementText('admin-stat-verified-doctors', admin.stats.verified_doctors);
        this.updateElementText('admin-stat-appointments', admin.stats.appointments);
        this.updateElementText('admin-stat-system-health', admin.stats.system_health);

        // Section titles
        this.updateElementText('user-management-title', admin.sections?.user_management || 'User Management');
        this.updateElementText('doctor-verification-title', admin.sections?.doctor_verification || 'Doctor Verification');
        this.updateElementText('appointment-management-title', admin.sections?.appointment_management || 'Appointment Management');
        this.updateElementText('system-settings-title', admin.sections?.system_settings || 'System Settings');
        this.updateElementText('platform-health-title', admin.sections?.platform_health || 'Platform Health');
        this.updateElementText('analytics-title', admin.sections?.analytics || 'Analytics');

        // Settings translations
        this.updateElementText('save-all-settings', admin.settings?.save_all || 'Save All Settings');
        this.updateElementText('settings-general-tab', admin.settings?.general || 'General');
        this.updateElementText('settings-notifications-tab', admin.settings?.notifications || 'Notifications');
        this.updateElementText('settings-maintenance-tab', admin.settings?.maintenance || 'Maintenance');
        
        // Form labels
        this.updateElementText('default-language-label', admin.forms?.default_language || 'Default Language');
        this.updateElementText('timezone-label', admin.forms?.timezone || 'Timezone');
        this.updateElementText('registration-status-label', admin.forms?.registration_status || 'Registration Status');
        this.updateElementText('max-appointments-label', admin.forms?.max_appointments || 'Max Appointments Per Day');
        
        // Health monitoring
        this.updateElementText('server-uptime-label', admin.monitoring?.server_uptime || 'Server Uptime');
        this.updateElementText('cpu-usage-label', admin.monitoring?.cpu_usage || 'CPU Usage');
        this.updateElementText('memory-usage-label', admin.monitoring?.memory_usage || 'Memory Usage');
        this.updateElementText('response-time-label', admin.monitoring?.response_time || 'Response Time');
        this.updateElementText('analytics-cpu-label', admin.monitoring?.cpu_usage || 'CPU Usage');
        this.updateElementText('analytics-memory-label', admin.monitoring?.memory_usage || 'Memory Usage');

        // Buttons
        this.updateElementText('refresh-button', admin.buttons?.refresh || 'Refresh');
        this.updateElementText('add-doctor-manually', admin.buttons?.add_doctor_manually || 'Add Doctor Manually');
        this.updateElementText('refresh-appointments', admin.buttons?.refresh_appointments || 'Refresh');
        this.updateElementText('export-appointments', admin.buttons?.export_appointments || 'Export Data');

        // Tabs
        this.updateElementText('pending-tab', admin.tabs?.pending || 'Pending');
        this.updateElementText('approved-tab', admin.tabs?.approved || 'Approved');
        this.updateElementText('rejected-tab', admin.tabs?.rejected || 'Rejected');

        // Filters
        this.updateElementText('filter-all-appointments', admin.filters?.all_appointments || 'All Appointments');
        this.updateElementText('filter-upcoming', admin.filters?.upcoming || 'Upcoming');
        this.updateElementText('filter-today', admin.filters?.today || 'Today');
        this.updateElementText('filter-completed', admin.filters?.completed || 'Completed');
        this.updateElementText('filter-cancelled', admin.filters?.cancelled || 'Cancelled');

        // Table headers
        this.updateElementText('table-full-name', admin.table?.full_name || 'Full Name');
        this.updateElementText('table-email', admin.table?.email || 'Email');
        this.updateElementText('table-phone', admin.table?.phone || 'Phone');
        this.updateElementText('table-type', admin.table?.type || 'Type');
        this.updateElementText('table-status', admin.table?.status || 'Status');
        this.updateElementText('table-registration-date', admin.table?.registration_date || 'Registration Date');
        this.updateElementText('table-actions', admin.table?.actions || 'Actions');
        this.updateElementText('appointment-patient', admin.table?.patient || 'Patient');
        this.updateElementText('appointment-doctor', admin.table?.doctor || 'Doctor');
        this.updateElementText('appointment-datetime', admin.table?.datetime || 'Date & Time');
        this.updateElementText('appointment-status', admin.table?.status || 'Status');
        this.updateElementText('appointment-actions', admin.table?.actions || 'Actions');

        // Pagination
        this.updateElementText('per-page-10', admin.pagination?.per_page_10 || '10 per page');
        this.updateElementText('per-page-20', admin.pagination?.per_page_20 || '20 per page');
        this.updateElementText('per-page-50', admin.pagination?.per_page_50 || '50 per page');

        // Loading states
        this.updateElementText('loading-users', admin.loading?.text || 'Loading...');
        this.updateElementText('loading-appointments', admin.loading?.text || 'Loading...');
        this.updateElementText('loading-verification', admin.loading?.text || 'Loading...');
        this.updateElementText('loading-users-text', admin.loading?.users || 'Loading user data...');
        this.updateElementText('loading-appointments-text', admin.loading?.appointments || 'Loading appointment data...');
        this.updateElementText('loading-verification-text', admin.loading?.verification || 'Loading verification requests...');

        // Language options
        this.updateElementText('language-arabic', admin.languages?.arabic || 'Arabic');
        this.updateElementText('language-english', admin.languages?.english || 'English');

        // Timezone options
        this.updateElementText('timezone-cairo', admin.timezones?.cairo || 'Cairo');
        this.updateElementText('timezone-riyadh', admin.timezones?.riyadh || 'Riyadh');

        // Registration options
        this.updateElementText('registration-open', admin.registration?.open || 'Open');
        this.updateElementText('registration-closed', admin.registration?.closed || 'Closed');
        this.updateElementText('registration-doctors-only', admin.registration?.doctors_only || 'Doctors Only');

        // Notification settings
        this.updateElementText('notification-settings-title', admin.notifications?.settings_title || 'Notification Settings');
        this.updateElementText('email-notifications-label', admin.notifications?.email_notifications || 'Email Notifications');
        this.updateElementText('sms-notifications-label', admin.notifications?.sms_notifications || 'SMS Notifications');
        this.updateElementText('appointment-reminders-label', admin.notifications?.appointment_reminders || 'Appointment Reminders');
        this.updateElementText('system-alerts-label', admin.notifications?.system_alerts || 'System Alerts');

        // Maintenance settings
        this.updateElementText('maintenance-warning', admin.maintenance?.warning || 'Enabling maintenance mode will prevent users from accessing the system');
        this.updateElementText('maintenance-mode-label', admin.maintenance?.mode_label || 'Enable Maintenance Mode');
        this.updateElementText('maintenance-message-label', admin.maintenance?.message_label || 'Maintenance Message');
        
        // Set placeholder for maintenance message
        const maintenanceTextarea = document.getElementById('maintenance_message');
        if (maintenanceTextarea && admin.maintenance?.message_placeholder) {
            maintenanceTextarea.setAttribute('placeholder', admin.maintenance.message_placeholder);
        }

        // User filters
        this.updateElementText('filter-all', admin.user_filters?.all || 'All');
        this.updateElementText('filter-patients', admin.user_filters?.patients || 'Patients');
        this.updateElementText('filter-doctors', admin.user_filters?.doctors || 'Doctors');
        this.updateElementText('filter-admins', admin.user_filters?.admins || 'Admins');

        // Status filters
        this.updateElementText('status-all', admin.status_filters?.all || 'All Status');
        this.updateElementText('status-active', admin.status_filters?.active || 'Active');
        this.updateElementText('status-inactive', admin.status_filters?.inactive || 'Inactive');

        // Additional buttons
        this.updateElementText('export-data', admin.more_buttons?.export_data || 'Export Data');
        this.updateElementText('add-admin', admin.more_buttons?.add_admin || 'Add Admin');

        // Search placeholder
        const searchInput = document.getElementById('user-search');
        if (searchInput && admin.search?.placeholder) {
            searchInput.setAttribute('placeholder', admin.search.placeholder);
        }

        // Gauge labels
        this.updateElementText('gauge-uptime', admin.gauges?.uptime || 'Server Uptime');
        this.updateElementText('gauge-cpu', admin.gauges?.cpu || 'CPU Usage');
        this.updateElementText('gauge-memory', admin.gauges?.memory || 'Memory Usage');
        this.updateElementText('gauge-response', admin.gauges?.response || 'Response Time');

        // Language selector
        this.updateElementText('current-admin-language', admin.language.current);

        // Action buttons (using title attribute for tooltips)
        const profileBtn = document.getElementById('admin-btn-profile');
        const settingsBtn = document.getElementById('admin-btn-settings');
        const logoutBtn = document.getElementById('admin-btn-logout');
        
        if (profileBtn) profileBtn.title = admin.actions.profile;
        if (settingsBtn) settingsBtn.title = admin.actions.settings;
        if (logoutBtn) logoutBtn.title = admin.actions.logout;

        // Update footer
        this.updateFooter(t);

        console.log(`Admin dashboard translations updated to: ${lang}`);
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
        } else if (dashboardType === 'admin') {
            this.updateAdminDashboard(lang);
        }
        
        // Update user name with correct language prefix (admin doesn't need this)
        if (dashboardType !== 'admin') {
            this.updateUserName();
        }
        
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
        } else if (dashboardType === 'admin') {
            this.updateAdminDashboard(savedLanguage);
        }
        
        // Update user name from localStorage (admin doesn't need this)
        if (dashboardType !== 'admin') {
            this.updateUserName();
        }
        
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