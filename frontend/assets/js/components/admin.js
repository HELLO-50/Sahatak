/**
 * ===========================================================================
 * SAHATAK ADMIN DASHBOARD JAVASCRIPT
 * ===========================================================================
 * 
 * Awab, this is your dedicated JavaScript file for admin functionality.
 * Implement all admin-specific features here to keep the code organized.
 * 
 * Key Features to Implement:
 * - User management
 
 * - Doctor verification
 * - System settings
 * - Real-time analytics
 * - Platform health monitoring
 */

// ===========================================================================
// ADMIN CONFIGURATION & CONSTANTS
// ===========================================================================

const AdminConfig = {
    apiBaseUrl: 'https://sahatak.pythonanywhere.com/api/admin',
    refreshInterval: 30000, // 30 seconds
    chartColors: {
        primary: '#3498db',
        success: '#27ae60',
        warning: '#f39c12',
        danger: '#e74c3c',
        info: '#17a2b8'
    },
    pagination: {
        defaultPerPage: 20,
        pageSizes: [10, 20, 50, 100]
    }
};

// ===========================================================================
// ADMIN API HELPER
// ===========================================================================
// ADMIN NAVIGATION & UI INITIALIZATION
// ===========================================================================

const AdminNavigation = {
    /**
     * Initialize admin navigation and UI components
     */
    init() {
        this.setupNavigation();
        this.setupKeyboardShortcuts();
        this.setupMobileToggle();
        this.initializeDashboard();
    },

    /**
     * Setup section navigation
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('.btn-admin-nav');
        const sections = document.querySelectorAll('.admin-section');

        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = button.getAttribute('data-target');
                if (targetId) {
                    this.activateSection(targetId);
                    history.replaceState(null, '', `#${targetId}`);
                }
            });
        });

        // Deep link support
        window.addEventListener('DOMContentLoaded', () => {
            const hash = location.hash.replace('#', '');
            if (hash && document.getElementById(hash)) {
                this.activateSection(hash);
            } else {
                this.activateSection('dashboard');
            }
        });
    },

    /**
     * Activate specific admin section
     */
    activateSection(targetId) {
        // Update navigation buttons
        const navButtons = document.querySelectorAll('.btn-admin-nav');
        navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-target') === targetId);
        });

        // Show/hide sections
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
                section.classList.add('active');
            } else {
                section.style.display = 'none';
                section.classList.remove('active');
            }
        });

        console.log(`Admin section activated: ${targetId}`);
    },

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        const keymap = { 
            'd': 'dashboard', 
            'u': 'users', 
            'v': 'verification', 
            's': 'settings', 
            'h': 'health', 
            'a': 'analytics' 
        };

        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }

            const targetSection = keymap[e.key?.toLowerCase()];
            if (targetSection) {
                e.preventDefault();
                this.activateSection(targetSection);
                history.replaceState(null, '', `#${targetSection}`);
            }
        });
    },

    /**
     * Setup mobile sidebar toggle (if needed)
     */
    setupMobileToggle() {
        const toggleSidebar = document.getElementById('toggleSidebar');
        const backdrop = document.getElementById('backdrop');

        if (toggleSidebar) {
            toggleSidebar.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-open');
            });
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => {
                document.body.classList.remove('sidebar-open');
            });
        }
    },

    /**
     * Initialize dashboard with real data
     */
    initializeDashboard() {
        // Load dashboard data when admin page loads
        this.loadDashboardStats();
        this.setupRefreshButton();
    },

    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            // Students can implement API calls here
            console.log('Dashboard stats loading - integrate with AdminAPI.getDashboardAnalytics()');
            
            // Example: const analytics = await AdminAPI.getDashboardAnalytics();
            // Then update the stat cards with real data
            
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            AdminUI.showError('Failed to load dashboard statistics');
        }
    },

    /**
     * Setup refresh button functionality
     */
    setupRefreshButton() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i>';
                refreshBtn.disabled = true;
                
                try {
                    await this.loadDashboardStats();
                    refreshBtn.innerHTML = '<i class="bi bi-check2"></i>';
                    AdminUI.showSuccess('Dashboard data refreshed');
                } catch (error) {
                    refreshBtn.innerHTML = '<i class="bi bi-exclamation-triangle"></i>';
                    AdminUI.showError('Failed to refresh data');
                }
                
                setTimeout(() => {
                    refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
                    refreshBtn.disabled = false;
                }, 1500);
            });
        }
    }
};
  
const AdminAPI = {
    /**
     * Awab: Make authenticated requests to admin endpoints
     */
    async makeRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            credentials: 'include' // Include session cookies
        };

        const requestOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(`${AdminConfig.apiBaseUrl}${endpoint}`, requestOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('Admin API request failed:', error);
            AdminUI.showError(error.message);
            throw error;
        }
    },

    // User Management APIs
    async getUsers(page = 1, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            per_page: AdminConfig.pagination.defaultPerPage.toString(),
            ...filters
        });
        return this.makeRequest(`/users?${params}`);
    },

    async getUserDetails(userId) {
        return this.makeRequest(`/users/${userId}`);
    },

    async toggleUserStatus(userId) {
        return this.makeRequest(`/users/${userId}/toggle-status`, {
            method: 'POST'
        });
    },

    // Doctor Verification APIs
    async getPendingVerifications() {
        return this.makeRequest('/doctors/pending-verification');
    },

    async verifyDoctor(doctorId, approved, notes = '') {
        return this.makeRequest(`/doctors/${doctorId}/verify`, {
            method: 'POST',
            body: JSON.stringify({
                approved,
                verification_notes: notes
            })
        });
    },

    async addDoctorManually(doctorData) {
        return this.makeRequest('/doctors', {
            method: 'POST',
            body: JSON.stringify(doctorData)
        });
    },

    // System Settings APIs
    async getSystemSettings() {
        return this.makeRequest('/settings');
    },

    async updateSystemSettings(settings) {
        return this.makeRequest('/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },

    // Analytics APIs
    async getDashboardAnalytics(period = 'week') {
        return this.makeRequest(`/analytics/dashboard?period=${period}`);
    },

    async getDetailedHealth() {
        return this.makeRequest('/health/detailed');
    },

    // Notification APIs
    async sendBroadcastNotification(notification) {
        return this.makeRequest('/notifications/broadcast', {
            method: 'POST',
            body: JSON.stringify(notification)
        });
    }
};

// ===========================================================================
// ADMIN UI HELPER FUNCTIONS
// ===========================================================================
// ====== Demo data (replace with API data) ======

const AdminUI = {
    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    },

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'danger');
    },

    /**
     * Show warning message
     */
    showWarning(message) {
        this.showAlert(message, 'warning');
    },

    /**
     * Show info message
     */
    showInfo(message) {
        this.showAlert(message, 'info');
    },

    /**
     * Generic alert function
     */
    showAlert(message, type = 'info') {
        const alertHtml = `
            <div class="alert admin-alert admin-alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${this.getAlertIcon(type)}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        const alertContainer = document.getElementById('alert-container') || document.body;
        alertContainer.insertAdjacentHTML('afterbegin', alertHtml);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    },

    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    /**
     * Show loading spinner
     */
    showLoading(element) {
        if (element) {
            element.innerHTML = '<div class="loading-spinner"></div>';
        }
    },

    /**
     * Format numbers for display
     */
    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    },

    /**
     * Format dates for display
     */
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Create pagination HTML
     */
    createPagination(currentPage, totalPages, onPageChange) {
        // Awab: Implement pagination component
      
    }
};

// ===========================================================================
// USER MANAGEMENT MODULE
// ===========================================================================
// ====== Pagination rendering ======

const UserManagement = {
    currentPage: 1,
    currentFilters: {},

    /**
     * Initialize user management
     */
    init() {
        this.bindEvents();
        this.loadUsers();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(() => {
                this.currentFilters.search = searchInput.value;
                this.currentPage = 1;
                this.loadUsers();
            }, 500));
        }

        // Filter buttons
        document.querySelectorAll('.user-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filterType = e.target.dataset.filter;
                this.currentFilters.user_type = filterType;
                this.currentPage = 1;
                this.loadUsers();
                
                // Update active state
                document.querySelectorAll('.user-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    },

    /**
     * Load users with current page and filters
     */
    async loadUsers() {
        try {
            AdminUI.showLoading(document.getElementById('users-table-body'));
            
            const response = await AdminAPI.getUsers(this.currentPage, this.currentFilters);
            this.renderUsersTable(response.data.users);
            this.renderPagination(response.data.pagination);
            
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },

    /**
     * Render users table
     */
    renderUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        const html = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${user.user_type === 'doctor' ? 'primary' : 'secondary'}">
                        ${user.user_type}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.is_active ? 'success' : 'danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-table-action view" onclick="UserManagement.viewUser(${user.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn-table-action edit" onclick="UserManagement.toggleUserStatus(${user.id})">
                            <i class="bi bi-toggle-${user.is_active ? 'on' : 'off'}"></i>
                        </button>
                        <button class="btn-table-action delete" onclick="UserManagement.deleteUser(${user.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.innerHTML = html;
    },

    /**
     * View user details
     */
    async viewUser(userId) {
        try {
            const response = await AdminAPI.getUserDetails(userId);
            this.showUserModal(response.data.user);
        } catch (error) {
            console.error('Failed to load user details:', error);
        }
    },

    /**
     * Toggle user active status
     */
    async toggleUserStatus(userId) {
        try {
            await AdminAPI.toggleUserStatus(userId);
            AdminUI.showSuccess('User status updated successfully');
            this.loadUsers();
        } catch (error) {
            console.error('Failed to toggle user status:', error);
        }
    },

    /**
     * Show user details modal
     */
   

    /**
     * Delete user (with confirmation)
     */
    deleteUser(userId) {
        // Awab: Implement user deletion with confirmation
        console.log('TODO: Implement user deletion', userId);
    },

    /**
     * Render pagination
     */
    renderPagination(pagination) {
        // Awab: Implement pagination rendering
        console.log('TODO: Implement pagination', pagination);
    },

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===========================================================================
// DOCTOR VERIFICATION MODULE
// ===========================================================================

const DoctorVerification = {
    /**
     * Initialize doctor verification
     */
    init() {
        this.loadPendingVerifications();
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-verifications');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadPendingVerifications());
        }
    },

    /**
     * Load pending doctor verifications
     */
    async loadPendingVerifications() {
        try {
            AdminUI.showLoading(document.getElementById('pending-verifications'));
            
            const response = await AdminAPI.getPendingVerifications();
            this.renderPendingList(response.data.pending_doctors);
            
        } catch (error) {
            console.error('Failed to load pending verifications:', error);
        }
    },

    /**
     * Render pending verifications list
     */
    renderPendingList(doctors) {
        const container = document.getElementById('pending-verifications');
        if (!container) return;

        if (doctors.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No pending verifications</div>';
            return;
        }

        const html = doctors.map(doctor => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="mb-1">${doctor.name}</h6>
                            <p class="text-muted mb-0">${doctor.email}</p>
                            <small class="text-muted">
                                ${doctor.specialty} • ${doctor.years_of_experience} years experience
                            </small>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-0"><strong>License:</strong> ${doctor.license_number}</p>
                            <p class="mb-0"><strong>Submitted:</strong> ${AdminUI.formatDate(doctor.submitted_at)}</p>
                        </div>
                        <div class="col-md-2 text-end">
                            <button class="btn btn-success btn-sm me-2" onclick="DoctorVerification.approveDoctor(${doctor.id})">
                                <i class="bi bi-check"></i> Approve
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="DoctorVerification.rejectDoctor(${doctor.id})">
                                <i class="bi bi-x"></i> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    /**
     * Approve doctor
     */
    async approveDoctor(doctorId) {
        try {
            await AdminAPI.verifyDoctor(doctorId, true);
            AdminUI.showSuccess('Doctor approved successfully');
            this.loadPendingVerifications();
        } catch (error) {
            console.error('Failed to approve doctor:', error);
        }
    },

    /**
     * Reject doctor
     */
    async rejectDoctor(doctorId) {
        // Awab: Implement rejection with notes modal
        const notes = prompt('Please provide rejection reason:');
        if (notes) {
            try {
                await AdminAPI.verifyDoctor(doctorId, false, notes);
                AdminUI.showSuccess('Doctor rejected');
                this.loadPendingVerifications();
            } catch (error) {
                console.error('Failed to reject doctor:', error);
            }
        }
    }
};

// ===========================================================================
// SYSTEM SETTINGS MODULE
// ===========================================================================

const SystemSettings = {
    /**
     * Initialize system settings
     */
    init() {
        this.loadSettings();
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const settingsForm = document.getElementById('system-settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveSettings();
            });
        }
    },

    /**
     * Load current system settings
     */
    async loadSettings() {
        try {
            const response = await AdminAPI.getSystemSettings();
            this.populateSettingsForm(response.data.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    },

    /**
     * Populate settings form
     */
    populateSettingsForm(settings) {
        Object.keys(settings).forEach(key => {
            const input = document.getElementById(`setting_${key}`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = settings[key];
                } else {
                    input.value = settings[key];
                }
            }
        });
    },

    /**
     * Save settings
     */
    async saveSettings() {
        try {
            const formData = new FormData(document.getElementById('system-settings-form'));
            const settings = Object.fromEntries(formData.entries());
            
            await AdminAPI.updateSystemSettings(settings);
            AdminUI.showSuccess('Settings updated successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
};

// ===========================================================================
// DASHBOARD ANALYTICS MODULE
// ===========================================================================

const DashboardAnalytics = {
    charts: {},

    /**
     * Initialize dashboard analytics
     */
    init() {
        this.loadAnalytics();
        this.startAutoRefresh();
    },

    /**
     * Load analytics data
     */
    async loadAnalytics() {
        try {
            const response = await AdminAPI.getDashboardAnalytics();
            this.updateStatCards(response.data.analytics);
            this.renderCharts(response.data.analytics);
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    },

    /**
     * Update statistics cards
     */
    updateStatCards(analytics) {
        const stats = {
            'total-users': analytics.user_stats.total_users,
            'total-doctors': analytics.doctor_stats.total_doctors,
            'total-appointments': analytics.appointment_stats.total_appointments,
            'system-health': '98%' // From health endpoint
        };

        Object.keys(stats).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.textContent = AdminUI.formatNumber(stats[key]);
            }
        });
    },

    /**
     * Render analytics charts
     */
    renderCharts(analytics) {
        // Awab: Implement Chart.js charts here
        console.log('TODO: Implement analytics charts', analytics);
        
        // Example chart implementations:
        // this.renderUserGrowthChart(analytics.user_stats);
        // this.renderAppointmentTrendsChart(analytics.appointment_stats);
        // this.renderDoctorActivityChart(analytics.doctor_stats);
    },

    /**
     * Start auto-refresh for real-time data
     */
    startAutoRefresh() {
        setInterval(() => {
            this.loadAnalytics();
        }, AdminConfig.refreshInterval);
    }
};

// ===========================================================================
// PLATFORM HEALTH MONITORING
// ===========================================================================

const HealthMonitoring = {
    /**
     * Initialize health monitoring
     */
    init() {
        this.loadHealthData();
        this.startHealthCheck();
    },

    /**
     * Load detailed health information
     */
    async loadHealthData() {
        try {
            const response = await AdminAPI.getDetailedHealth();
            this.updateHealthDisplay(response.data.health);
        } catch (error) {
            console.error('Failed to load health data:', error);
        }
    },

    /**
     * Update health display
     */
    updateHealthDisplay(health) {
        // Update database status
        this.updateHealthStatus('database', health.database.status);
        
        // Update system metrics
        this.updateSystemMetrics(health.system);
        
        // Update API metrics
        this.updateAPIMetrics(health.api);
    },

    /**
     * Update health status indicator
     */
    updateHealthStatus(component, status) {
        const indicator = document.getElementById(`${component}-status`);
        if (indicator) {
            indicator.className = `health-indicator ${status}`;
            indicator.textContent = status;
        }
    },

    /**
     * Update system metrics
     */
    updateSystemMetrics(system) {
        const metrics = [
            { id: 'cpu-usage', value: system.cpu_usage_percent },
            { id: 'memory-usage', value: system.memory_usage_percent },
            { id: 'disk-usage', value: system.disk_usage_percent }
        ];

        metrics.forEach(metric => {
            const element = document.getElementById(metric.id);
            if (element) {
                element.textContent = `${metric.value}%`;
                element.style.color = metric.value > 80 ? '#e74c3c' : '#27ae60';
            }
        });
    },

    /**
     * Update API metrics
     */
    updateAPIMetrics(api) {
        const avgResponseTime = document.getElementById('avg-response-time');
        if (avgResponseTime) {
            avgResponseTime.textContent = `${api.avg_response_time_ms}ms`;
        }

        const errorRate = document.getElementById('error-rate');
        if (errorRate) {
            errorRate.textContent = `${(api.error_rate_24h * 100).toFixed(2)}%`;
        }
    },

    /**
     * Start periodic health checks
     */
    startHealthCheck() {
        setInterval(() => {
            this.loadHealthData();
        }, AdminConfig.refreshInterval);
    }
};

// ===========================================================================
// NOTIFICATION SYSTEM
// ===========================================================================

const NotificationSystem = {
    /**
     * Initialize notification system
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const broadcastForm = document.getElementById('broadcast-form');
        if (broadcastForm) {
            broadcastForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendBroadcast();
            });
        }
    },

    /**
     * Send broadcast notification
     */
    async sendBroadcast() {
        try {
            const formData = new FormData(document.getElementById('broadcast-form'));
            const notification = Object.fromEntries(formData.entries());
            
            await AdminAPI.sendBroadcastNotification(notification);
            AdminUI.showSuccess('Broadcast notification sent successfully');
            
            // Reset form
            document.getElementById('broadcast-form').reset();
            
        } catch (error) {
            console.error('Failed to send broadcast:', error);
        }
    }
};

// ===========================================================================
// ADMIN MAIN INITIALIZATION
// ===========================================================================

class AdminDashboard {
    constructor() {
        this.currentModule = 'dashboard';
        this.init();
    }

    /**
     * Initialize admin dashboard
     */
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    }

    /**
     * Handle DOM ready
     */
    onDOMReady() {
        this.bindGlobalEvents();
        this.initializeModules();
        this.setupNavigation();
    }

    /**
     * Bind global event listeners
     */
    bindGlobalEvents() {
        // Mobile sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', this.toggleSidebar);
        }

        // Global error handling
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            AdminUI.showError('An unexpected error occurred');
        });
    }

    /**
     * Initialize all modules
     */
    initializeModules() {
        DashboardAnalytics.init();
        UserManagement.init();
        DoctorVerification.init();
        SystemSettings.init();
        HealthMonitoring.init();
        NotificationSystem.init();
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const module = e.target.dataset.module;
                if (module) {
                    this.switchModule(module);
                }
            });
        });
    }

    /**
     * Switch between admin modules
     */
    switchModule(moduleName) {
        // Update active navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`)?.classList.add('active');

        // Show/hide module content
        document.querySelectorAll('.admin-module').forEach(module => {
            module.style.display = 'none';
        });
        document.getElementById(`${moduleName}-module`)?.style.display = 'block';

        this.currentModule = moduleName;
    }

    /**
     * Toggle sidebar (mobile)
     */
    toggleSidebar() {
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show');
        }
    }
}

// ===========================================================================
// AWAB'S IMPLEMENTATION CHECKLIST
// ===========================================================================

/*
AWAB - JAVASCRIPT IMPLEMENTATION TASKS:

1. CHART INTEGRATION:
   - Install Chart.js or similar library
   - Implement user growth charts
   - Create appointment trends visualization
   - Add real-time system health charts
   - Implement interactive analytics dashboards

2. DATA TABLES:
   - Add sorting functionality to tables
   - Implement advanced filtering
   - Add bulk actions (select multiple users)
   - Create export functionality (CSV, PDF)
   - Add column visibility toggles

3. REAL-TIME FEATURES:
   - WebSocket connection for live updates
   - Real-time notification system
   - Live system health monitoring
   - Auto-refresh dashboard data
   - Push notifications for admin alerts

4. FORM ENHANCEMENTS:
   - Rich text editor for notifications
   - File upload for doctor documents
   - Multi-step forms for complex settings
   - Form validation with real-time feedback
   - Auto-save functionality

5. USER EXPERIENCE:
   - Loading states for all async operations
   - Smooth page transitions
   - Keyboard shortcuts for common actions
   - Bulk operations confirmations
   - Success/error animations

6. MOBILE OPTIMIZATION:
   - Touch-friendly interface
   - Responsive data tables
   - Mobile navigation drawer
   - Swipe gestures for actions
   - Optimized forms for mobile

7. ACCESSIBILITY:
   - Keyboard navigation
   - Screen reader support
   - High contrast mode
   - Focus management
   - ARIA labels and descriptions

8. PERFORMANCE:
   - Lazy loading for large datasets
   - Virtual scrolling for long lists
   - Image optimization
   - Caching strategies
   - Bundle optimization

Remember to test all functionality thoroughly and
maintain clean, well-documented code!
*/

// Initialize admin dashboard when script loads
const adminDashboard = new AdminDashboard();

// ======================= Users Management =======================
const demoUsers = [];
for (let i = 1; i <= 57; i++) {
  demoUsers.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    phone: `010${(10000000 + i).toString().slice(-8)}`,
    role: (i % 3 === 0 ? 'admin' : (i % 2 === 0 ? 'doctor' : 'patient')),
    is_active: i % 4 !== 0,
    last_login: new Date(Date.now() - i * 3600 * 1000).toISOString()
  });
}

const UserState = {
  all: demoUsers,
  filtered: [],
  page: 1,
  perPage: parseInt(document.getElementById('per-page').value || 10),
  currentFilter: 'all',
  searchQuery: ''
};

// ---- Helpers ----
function formatDateISO(iso) {
  return new Date(iso).toLocaleString();
}
function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
function showToast(msg, type = "success") {
  const toastBox = document.getElementById("toastBox");
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.role = "alert";
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
  toastBox.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ---- Filters + Search ----
function applyFiltersAndRender() {
  const { all, currentFilter, searchQuery } = UserState;
  let list = [...all];

  if (currentFilter !== 'all') list = list.filter(u => u.role === currentFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  }

  UserState.filtered = list;
  renderUsersTable();
  renderPagination();
}

// ---- Render Table ----
function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';

  const start = (UserState.page - 1) * UserState.perPage;
  const end = start + UserState.perPage;
  const pageItems = UserState.filtered.slice(start, end);

  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No users found</td></tr>`;
    return;
  }

  tbody.innerHTML = pageItems.map((u, idx) => `
    <tr id="user-row-${u.id}">
      <td>${start + idx + 1}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone}</td>
      <td><span class="badge bg-${u.role === 'doctor' ? 'primary' : (u.role === 'admin' ? 'dark' : 'secondary')}">${u.role}</span></td>
      <td><span id="status-${u.id}" class="badge ${u.is_active ? 'bg-success' : 'bg-danger'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td>
        <button class="btn btn-sm btn-info" onclick="viewUser(${u.id})"><i class="bi bi-eye"></i></button>
        <button class="btn btn-sm btn-warning" onclick="toggleUser(${u.id})"><i class="bi bi-toggle-${u.is_active ? 'on' : 'off'}"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.id})"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ---- Pagination ----
function renderPagination() {
  const container = document.getElementById('users-pagination');
  container.innerHTML = '';
  const total = UserState.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / UserState.perPage));
  const current = UserState.page;

  const addPageItem = (label, page, disabled = false, active = false) => {
    const li = document.createElement('li');
    li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'page-link'; a.href = '#'; a.textContent = label;
    a.addEventListener('click', (e) => { e.preventDefault(); if (!disabled) { UserState.page = page; applyFiltersAndRender(); } });
    li.appendChild(a); container.appendChild(li);
  };

  addPageItem('«', Math.max(1, current - 1), current === 1);
  for (let p = Math.max(1, current - 2); p <= Math.min(totalPages, current + 2); p++) {
    addPageItem(p, p, false, p === current);
  }
  addPageItem('»', Math.min(totalPages, current + 1), current === totalPages);
}

// ---- Actions ----
function viewUser(id) {
  const u = UserState.all.find(x => x.id === id);
  if (!u) return;
  document.getElementById('userViewBody').innerHTML = `
    <p><strong>Name:</strong> ${u.name}</p>
    <p><strong>Email:</strong> ${u.email}</p>
    <p><strong>Phone:</strong> ${u.phone}</p>
    <p><strong>Role:</strong> ${u.role}</p>
    <p><strong>Last login:</strong> ${formatDateISO(u.last_login)}</p>`;
  new bootstrap.Modal(document.getElementById('userViewModal')).show();
}

function toggleUser(id) {
  const user = UserState.all.find(x => x.id === id);
  if (!user) return;
  user.is_active = !user.is_active;
  const badge = document.getElementById(`status-${id}`);
  if (badge) {
    badge.textContent = user.is_active ? 'Active' : 'Inactive';
    badge.className = user.is_active ? 'badge bg-success' : 'badge bg-danger';
  }
  showToast("✅ User status updated successfully");
}
function deleteUser(id) {
  if (!confirm('❌ Are you sure you want to delete this user?')) return;
  UserState.all = UserState.all.filter(u => u.id !== id);
  applyFiltersAndRender();
  showToast("🗑️ User deleted successfully", "danger");
}
function exportUsersCSV() {
  const rows = [["Name", "Email", "Phone", "Role", "Status"]];
  UserState.all.forEach(u => rows.push([u.name, u.email, u.phone, u.role, u.is_active ? "Active" : "Inactive"]));
  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "users.csv"; a.click();
}

// ---- Init ----
(function initUserManagement() {
  document.querySelectorAll('.user-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.user-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      UserState.currentFilter = btn.dataset.filter;
      UserState.page = 1;
      applyFiltersAndRender();
    });
  });
  document.getElementById('per-page').addEventListener('change', e => {
    UserState.perPage = parseInt(e.target.value, 10);
    UserState.page = 1; applyFiltersAndRender();
  });
  document.getElementById('user-search').addEventListener('input', debounce(e => {
    UserState.searchQuery = e.target.value; UserState.page = 1; applyFiltersAndRender();
  }, 350));
  applyFiltersAndRender();
})();

// ======================= Doctors Verification =======================
const doctors = [
  { name: "Dr. Khalid", license: "license1.pdf", verified: false },
  { name: "Dr. Samia", license: "license2.pdf", verified: false }
];

function renderDoctors(filter = "pending") {
  const section = document.getElementById("doctorList");
  if (!section) return;
  section.innerHTML = "";
  doctors.forEach((d, i) => {
    if (filter === "all" || (filter === "pending" && !d.verified) || (filter === "verified" && d.verified)) {
      section.innerHTML += `
        <div class="card p-2 mb-2">
          <strong>${d.name}</strong> - <a href="${d.license}" target="_blank">📄 View License</a><br/>
          ${d.verified ? '<span class="badge bg-success">Verified</span>' : `
            <button onclick="verifyDoctor(${i})" class="btn btn-success btn-sm mt-1">Verify</button>
            <button onclick="rejectDoctor(${i})" class="btn btn-danger btn-sm mt-1">Reject</button>
          `}
        </div>`;
    }
  });
}
function verifyDoctor(i) { doctors[i].verified = true; showToast("✅ Doctor verified successfully"); renderDoctors(); }
function rejectDoctor(i) { showToast("❌ Doctor verification rejected", "danger"); renderDoctors(); }
renderDoctors();

// ======================= Settings =======================
const settingsForm = document.getElementById("settingsForm");
if (settingsForm) {
  const saved = JSON.parse(localStorage.getItem("settings")) || {};
  if (saved.language) document.getElementById("language").value = saved.language;
  if (saved.timezone) document.getElementById("timezone").value = saved.timezone;
  if (saved.maintenance) document.getElementById("maintenance").value = saved.maintenance;

  settingsForm.addEventListener("submit", e => {
    e.preventDefault();
    const data = {
      maintenance: document.getElementById("maintenance").value,
      language: document.getElementById("language").value,
      timezone: document.getElementById("timezone").value,
    };
    localStorage.setItem("settings", JSON.stringify(data));
    showToast("⚙️ Settings saved successfully");
  });
}

// ======================= Analytics =======================
function simulateHealthData() {
  const cpu = Math.floor(Math.random() * 100);
  const mem = Math.floor(Math.random() * 100);
  document.getElementById("cpuUsage").innerText = cpu + "%";
  document.getElementById("memUsage").innerText = mem + "%";
}
setInterval(simulateHealthData, 5000);

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("analyticsChart");
  if (ctx) {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["يناير", "فبراير", "مارس", "أبريل"],
        datasets: [{ label: "عدد المستخدمين الجدد", data: [40, 55, 65, 90], backgroundColor: "#667eea" }]
      }
    });
  }
});

//<!-- Chart.js Script -->

  // Chart.js Script
const  healthCtx = document.getElementById('healthChart').getContext('2d');
new Chart(healthCtx, {
    type: 'line',
    data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Active Users',
                data: [1200, 1400, 1350, 1500, 1600, 1550, 1700],
                borderColor: '#007bff',
                backgroundColor: 'rgba(0,123,255,0.2)',
                fill: true,
                tension: 0.3
            },
            {
                label: 'Error Rate (%)',
                data: [0.15, 0.1, 0.12, 0.09, 0.11, 0.1, 0.08],
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220,53,69,0.2)',
                fill: true,
                tension: 0.3
            }
        ]
    },
    options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true } }
    }
});
  
    const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuToggle");

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("closed");
});
//!-- Modal for user details -->
function openUserModal(user) {
    document.getElementById("modalName").innerText = user.name;
    document.getElementById("modalEmail").innerText = user.email;
    document.getElementById("modalPhone").innerText = user.phone;
    document.getElementById("modalRole").innerText = user.role;
    document.getElementById("modalStatus").innerText = user.status;
    
    document.getElementById("toggleStatusBtn").innerText = user.status === "Active" ? "Deactivate" : "Activate";
    document.getElementById("toggleStatusBtn").onclick = () => toggleStatus(user.name);

    new bootstrap.Modal(document.getElementById("userModal")).show();
}
function sendNotification() {
    alert("Notification sent!");
}

function resetPassword() {
    alert("Password reset!");
}
//Chart.js Script for API Response Times -->
const ctx = document.getElementById('apiResponseChart').getContext('2d');
new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        datasets: [{
            label: 'API Response Time (ms)',
            data: [120, 100, 150, 130, 140, 110],
            borderColor: 'green',
            borderWidth: 2,
            fill: false
        }]
    }
});
// users.js  -->
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users_table_body'); // ✅ مطابق للـHTML
  if (!tbody) return;

  if (!Array.isArray(users)) {
    console.warn('renderUsersTable: users is not an array', users);
    tbody.innerHTML = '<tr><td colspan="7">لا توجد بيانات</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  users.forEach((user, index) => {
    const name =
      user.full_name ??
        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
      'غير متوفر';

    const email = user.email ?? 'غير متوفر';
    const phone = user.phone ?? 'غير متوفر';
    const role = user.user_type ?? user.role ?? 'غير محدد';
    const status = user.status ?? 'غير معروف';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(email)}</td>
      <td>${escapeHtml(phone)}</td>
      <td>${escapeHtml(role)}</td>
      <td>${escapeHtml(status)}</td>
      <td>
        <button class="btn btn-sm btn-primary" data-user-id="${escapeHtml(user.id ?? '')}">
          عرض
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}  
document.addEventListener('DOMContentLoaded', loadUsers);

//showUserModal(user) -->
function showUserModal(user) {
  // نعبي البيانات في المودال
  document.getElementById('modalUserName').textContent =
   `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
     document.getElementById('modalUserType').textContent =
    user.user_type ?? user.role ?? 'غير محدد';
  document.getElementById('modalUserEmail').textContent =
    user.email ?? 'غير متوفر';

  // نظهر المودال باستخدام Bootstrap
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  modal.show();
}
// بعد بناء الجدول
document.querySelectorAll('.show-user-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const user = JSON.parse(btn.dataset.user);
    showUserModal(user);
  });
});
    
//initialize chart  -->
function initializeCharts() {
  // 1️⃣ مثال: Chart لعدد المستخدمين المسجلين شهريًا
  const ctx1 = document.getElementById('usersChart');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
        datasets: [{
          label: 'عدد المستخدمين',
          data: [10, 25, 40, 30, 50, 70], // بيانات تجريبية
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'المستخدمين الجدد شهريًا' }
        }
      }
    });
  }

  // 2️⃣ مثال: Chart لأنواع المستخدمين (admin, editor, viewer)
  const ctx2 = document.getElementById('rolesChart');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Admin', 'Editor', 'Viewer'],
        datasets: [{
          label: 'نوع المستخدم',
          data: [5, 8, 12], // بيانات تجريبية
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'توزيع أنواع المستخدمين' }
        }
      }
    });
  }
}
// Call the function to initialize charts
document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
});

function initializeNavigation() {
  // نخفي كل الأقسام ما عدا أول واحد
  const sections = document.querySelectorAll('.page-section');
  sections.forEach((sec, i) => {
    if (i !== 0) sec.classList.add('d-none');
  });

  // نربط الأزرار
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;

      // نخفي الكل
      sections.forEach(sec => sec.classList.add('d-none'));

      // نظهر الهدف فقط
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('d-none');

      // تحديث الشكل النشط للأزرار
      document.querySelectorAll('.nav-btn').forEach(b => 
        b.classList.remove('btn-primary')
      );
      btn.classList.add('btn-primary');
    });
  });
}
// ===========================================================================
// ADMIN INITIALIZATION
// ===========================================================================

/**
 * Initialize admin dashboard when page loads
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin dashboard initializing...');
    
    // Initialize navigation system
    AdminNavigation.init();
    
    // Keep existing navigation for compatibility
    if (typeof initializeNavigation === 'function') {
        initializeNavigation();
    }
    
    console.log('Admin dashboard initialized successfully');
});

