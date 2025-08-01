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
        console.log('TODO: Implement pagination component');
    }
};

// ===========================================================================
// USER MANAGEMENT MODULE
// ===========================================================================

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
    showUserModal(user) {
        // Awab: Implement user details modal
        console.log('TODO: Implement user details modal', user);
    },

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