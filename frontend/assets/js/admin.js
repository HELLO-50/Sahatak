// Admin Authentication and Dashboard Management
const AdminAuth = {
    API_BASE_URL: 'https://sahatak.pythonanywhere.com/api',
    
    // Check if user is authenticated
    isAuthenticated() {
        const userType = localStorage.getItem('userType');
        const adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true' || sessionStorage.getItem('adminLoggedIn') === 'true';
        const hasToken = !!(localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken'));
        return adminLoggedIn && userType === 'admin' && hasToken;
    },
    
    // Get auth token
    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    },
    
    // Verify session validity
    async verifySession() {
        // Check with the backend if the session is still valid
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
                method: 'GET',
                credentials: 'include', // Important for session cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    },
    
    // Admin authentication guard
    guard() {
        // Check if user is authenticated as admin
        if (!this.isAuthenticated()) {
            console.log('Admin not authenticated, redirecting to login');
            window.location.href = './index.html';
            return false;
        }
        
        return true;
    },
    
    // Verify token (for compatibility)
    async verifyToken() {
        const token = this.getToken();
        if (!token) return false;
        
        // For now, just check if token exists and is valid format
        return token && token.length === 64; // Our tokens are 64 character hex strings
    },
    
    // Login function
    async login(email, password, remember = false) {
        try {
            const requestBody = {
                login_identifier: email,
                password: password,
                remember_me: remember
            };
            
            console.log('Sending login request with:', requestBody);
            
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                credentials: 'include', // Important: include cookies for session
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            console.log('Login response:', response.status, data);
            
            if (response.ok && data.success) {
                // Check if user is admin (user data is nested under data.data.user)
                const userData = data.data.user;
                if (userData.user_type !== 'admin') {
                    throw new Error('Access denied. Admin credentials required.');
                }
                
                // Store authentication data
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('adminLoggedIn', 'true');
                
                // Store token if provided (for admin users)
                if (data.data.access_token) {
                    storage.setItem('adminToken', data.data.access_token);
                }
                
                localStorage.setItem('userType', userData.user_type);
                localStorage.setItem('adminEmail', userData.email);
                localStorage.setItem('adminName', userData.full_name);
                
                if (remember) {
                    localStorage.setItem('rememberAdmin', 'true');
                }
                
                return { success: true, data: userData };
            } else {
                throw new Error(data.message || 'Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message || 'Login failed. Please try again.' };
        }
    },
    
    // Logout function
    logout() {
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminName');
        localStorage.removeItem('rememberAdmin');
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminToken');
        window.location.href = './index.html';
    },
    
    // Authentication guard
    guard() {
        if (!this.isAuthenticated()) {
            window.location.href = './index.html';
            return false;
        }
        return true;
    },
    
    // Make authenticated API request
    async apiRequest(endpoint, options = {}) {
        const token = this.getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        const response = await fetch(`${this.API_BASE_URL}${endpoint}`, mergedOptions);
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            this.logout();
            throw new Error('Session expired');
        }
        
        return response;
    }
};

// Dashboard functionality
const AdminDashboard = {
    currentSection: 'overview',
    
    // Initialize dashboard
    async init() {
        // Check authentication
        if (!AdminAuth.guard()) return;
        
        // Set user info in UI
        this.updateUserInfo();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Try to load dashboard data (but don't logout on failure)
        try {
            await this.loadDashboardData();
        } catch (error) {
            console.error('Failed to load initial dashboard data:', error);
        }
        
        // Setup periodic refresh
        this.setupAutoRefresh();
        
        // Setup create admin form
        this.setupCreateAdminForm();
    },
    
    // Update user info in UI
    updateUserInfo() {
        const adminName = localStorage.getItem('adminName');
        
        // Update name elements
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = adminName || 'Admin User';
        }
        
        // Also update any elements with user-name class
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            if (!el.id) el.textContent = adminName || 'Admin User';
        });
    },
    
    // Load dashboard data
    async loadDashboardData() {
        try {
            const response = await AdminAuth.apiRequest('/admin/dashboard');
            
            if (!response.ok) {
                console.error(`Dashboard API returned ${response.status}: ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Dashboard data received:', data);
            
            if (data.success) {
                this.updateDashboardStats(data.data);
            } else {
                console.error('Dashboard API returned success=false:', data);
                throw new Error(data.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification(`Failed to load dashboard data: ${error.message}`, 'error');
        }
    },
    
    // Update dashboard statistics
    updateDashboardStats(data) {
        // Update stat cards
        if (data.stats) {
            // Update Total Users card
            const totalUsersElement = document.getElementById('total-users-count');
            if (totalUsersElement) {
                totalUsersElement.textContent = data.stats.total_users || 0;
            }
            
            // Update Verified Doctors card
            const verifiedDoctorsElement = document.getElementById('verified-doctors-count');
            if (verifiedDoctorsElement) {
                verifiedDoctorsElement.textContent = data.stats.verified_doctors || 0;
            }
            
            // Update Appointments card
            const appointmentsElement = document.getElementById('appointments-count');
            if (appointmentsElement) {
                appointmentsElement.textContent = data.stats.total_appointments || 0;
            }
            
            // Update System Health card
            const systemHealthElement = document.getElementById('system-health-percentage');
            if (systemHealthElement) {
                systemHealthElement.textContent = (data.stats.system_health || 0) + '%';
            }
        }
        
        // Update recent activities
        if (data.recent_activities) {
            this.updateRecentActivities(data.recent_activities);
        }
        
        // Update analytics data
        if (data.analytics) {
            this.updateAnalytics(data.analytics);
        }
        
        // Update individual activity stats that might be in stats instead of analytics
        if (data.stats) {
            // Update recent activity summary
            const newUsers30dEl = document.getElementById('new-users-30d');
            if (newUsers30dEl) newUsers30dEl.textContent = data.stats.new_users_30d || 0;
            
            const appointments30dEl = document.getElementById('appointments-30d');
            if (appointments30dEl) appointments30dEl.textContent = data.stats.appointments_30d || 0;
            
            const completedEl = document.getElementById('completed-appointments');
            if (completedEl) completedEl.textContent = data.stats.completed_appointments || 0;
            
            const activeUsers7dEl = document.getElementById('active-users-7d');
            if (activeUsers7dEl) activeUsers7dEl.textContent = data.stats.active_users_7d || 0;
        }
    },
    
    // Update recent activities
    updateRecentActivities(activities) {
        const container = document.getElementById('recentActivities');
        if (!container) return;
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-text">${activity.description}</p>
                    <span class="activity-time">${this.formatTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    },
    
    // Get activity icon based on type
    getActivityIcon(type) {
        const icons = {
            'user_registration': 'user-plus',
            'appointment': 'calendar-check',
            'payment': 'dollar-sign',
            'doctor_verification': 'user-md',
            'system': 'cog'
        };
        return icons[type] || 'circle';
    },
    
    // Format timestamp
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
        return date.toLocaleDateString();
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    AdminAuth.logout();
                }
            });
        }
        
        // Navigation menu items
        document.querySelectorAll('.btn-admin-nav').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const section = btn.dataset.target;
                if (section) {
                    this.switchSection(section);
                }
            });
        });
        
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    },
    
    // Switch dashboard section
    switchSection(section) {
        // Hide all sections
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.style.display = 'none';
        });
        
        // Show selected section
        const selectedSection = document.getElementById(section);
        if (selectedSection) {
            selectedSection.style.display = 'block';
        }
        
        // Update active nav item
        document.querySelectorAll('.btn-admin-nav').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.target === section) {
                btn.classList.add('active');
            }
        });
        
        this.currentSection = section;
        
        // Load section-specific data
        this.loadSectionData(section);
    },
    
    // Load section-specific data
    async loadSectionData(section) {
        const loaders = {
            'users': this.loadUsersData,
            'doctors': this.loadDoctorsData,
            'appointments': this.loadAppointmentsData,
            'analytics': this.loadAnalyticsData,
            'settings': this.loadSettingsData
        };
        
        const loader = loaders[section];
        if (loader) {
            await loader.call(this);
        }
        
        // Also load admin users when settings section is opened
        if (section === 'settings') {
            this.loadAdminUsers();
        }
    },
    
    // Load users data
    async loadUsersData() {
        try {
            const response = await AdminAuth.apiRequest('/admin/users?page=1&per_page=20');
            const data = await response.json();
            
            console.log('Users data received:', data); // Debug log
            
            if (data.success && data.data) {
                this.displayUsersTable(data.data.users);
                // Update pagination if needed
                if (data.data.pagination) {
                    this.updateUsersPagination(data.data.pagination);
                }
            } else {
                console.error('Invalid users response:', data);
                this.displayUsersTable([]);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showNotification('Failed to load users: ' + error.message, 'error');
            this.displayUsersTable([]);
        }
    },
    
    // Display users table
    displayUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <p class="text-muted">No users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = users.map((user, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${user.full_name || 'N/A'}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${user.user_type === 'admin' ? 'danger' : user.user_type === 'doctor' ? 'info' : 'primary'}">
                        ${user.user_type}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.is_active ? 'success' : 'secondary'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            Actions
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="AdminDashboard.viewUser(${user.id}, '${user.full_name || user.email}')"><i class="bi bi-eye me-2"></i>View</a></li>
                            <li><a class="dropdown-item" href="#" onclick="AdminDashboard.changeUserPassword(${user.id}, '${user.full_name || user.email}')"><i class="bi bi-key me-2"></i>Change Password</a></li>
                            <li><a class="dropdown-item" href="#" onclick="AdminDashboard.toggleUserStatus(${user.id})"><i class="bi bi-${user.is_active ? 'x-circle' : 'check-circle'} me-2"></i>${user.is_active ? 'Deactivate' : 'Activate'}</a></li>
                            ${user.user_type !== 'admin' ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-danger" href="#" onclick="AdminDashboard.deleteUser(${user.id}, '${user.full_name || user.email}')"><i class="bi bi-trash me-2"></i>Delete</a></li>` : ''}
                        </ul>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Initialize Bootstrap dropdowns for dynamically created content
        setTimeout(() => {
            const dropdowns = tbody.querySelectorAll('[data-bs-toggle="dropdown"]');
            dropdowns.forEach(dropdown => {
                new bootstrap.Dropdown(dropdown);
            });
        }, 100);
    },
    
    // Update users pagination
    updateUsersPagination(pagination) {
        const paginationContainer = document.getElementById('users-pagination');
        if (!paginationContainer || !pagination) return;
        
        let html = '';
        
        // Previous button
        if (pagination.has_prev) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminDashboard.loadUsersPage(${pagination.page - 1})">Previous</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Previous</span></li>`;
        }
        
        // Page numbers
        for (let i = 1; i <= pagination.pages; i++) {
            if (i === pagination.page) {
                html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminDashboard.loadUsersPage(${i})">${i}</a></li>`;
            }
        }
        
        // Next button
        if (pagination.has_next) {
            html += `<li class="page-item"><a class="page-link" href="#" onclick="AdminDashboard.loadUsersPage(${pagination.page + 1})">Next</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Next</span></li>`;
        }
        
        paginationContainer.innerHTML = html;
    },
    
    // Load specific users page
    async loadUsersPage(page = 1) {
        try {
            const response = await AdminAuth.apiRequest(`/admin/users?page=${page}&per_page=20`);
            const data = await response.json();
            
            if (data.success && data.users) {
                this.displayUsersTable(data.users);
                this.updateUsersPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to load users page:', error);
            this.showNotification('Failed to load users', 'error');
        }
    },
    
    // Handle search
    handleSearch(query) {
        // Implement search logic based on current section
        console.log('Searching for:', query);
    },
    
    // Setup auto refresh
    setupAutoRefresh() {
        // Refresh dashboard data every 30 seconds
        setInterval(() => {
            if (this.currentSection === 'overview') {
                this.loadDashboardData();
            }
        }, 30000);
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    },
    
    // View user details
    async viewUser(userId, userName) {
        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${userId}`);
            const data = await response.json();
            
            if (data.success) {
                const user = data.user;
                const modalHtml = `
                    <div class="modal fade" id="viewUserModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">User Details - ${user.full_name || user.email}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row">
                                        <div class="col-sm-4 fw-bold">Full Name:</div>
                                        <div class="col-sm-8">${user.full_name || 'N/A'}</div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4 fw-bold">Email:</div>
                                        <div class="col-sm-8">${user.email}</div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4 fw-bold">Phone:</div>
                                        <div class="col-sm-8">${user.phone || 'N/A'}</div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4 fw-bold">User Type:</div>
                                        <div class="col-sm-8">
                                            <span class="badge bg-${user.user_type === 'admin' ? 'danger' : user.user_type === 'doctor' ? 'info' : 'primary'}">
                                                ${user.user_type}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4 fw-bold">Status:</div>
                                        <div class="col-sm-8">
                                            <span class="badge bg-${user.is_active ? 'success' : 'secondary'}">
                                                ${user.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="row mt-2">
                                        <div class="col-sm-4 fw-bold">Registration Date:</div>
                                        <div class="col-sm-8">${new Date(user.created_at).toLocaleDateString()}</div>
                                    </div>
                                    ${user.profile ? `
                                        <hr>
                                        <h6>Profile Information:</h6>
                                        ${user.profile.date_of_birth ? `<div class="row mt-2">
                                            <div class="col-sm-4 fw-bold">Date of Birth:</div>
                                            <div class="col-sm-8">${user.profile.date_of_birth}</div>
                                        </div>` : ''}
                                        ${user.profile.age ? `<div class="row mt-2">
                                            <div class="col-sm-4 fw-bold">Age:</div>
                                            <div class="col-sm-8">${user.profile.age}</div>
                                        </div>` : ''}
                                        ${user.profile.gender ? `<div class="row mt-2">
                                            <div class="col-sm-4 fw-bold">Gender:</div>
                                            <div class="col-sm-8">${user.profile.gender}</div>
                                        </div>` : ''}
                                        ${user.profile.specialization ? `<div class="row mt-2">
                                            <div class="col-sm-4 fw-bold">Specialization:</div>
                                            <div class="col-sm-8">${user.profile.specialization}</div>
                                        </div>` : ''}
                                        ${user.profile.license_number ? `<div class="row mt-2">
                                            <div class="col-sm-4 fw-bold">License Number:</div>
                                            <div class="col-sm-8">${user.profile.license_number}</div>
                                        </div>` : ''}
                                    ` : ''}
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Remove existing modal if present
                const existingModal = document.getElementById('viewUserModal');
                if (existingModal) {
                    existingModal.remove();
                }
                
                // Add modal to body
                document.body.insertAdjacentHTML('beforeend', modalHtml);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
                modal.show();
                
                // Clean up modal after hide
                document.getElementById('viewUserModal').addEventListener('hidden.bs.modal', function () {
                    this.remove();
                });
                
            } else {
                this.showNotification(data.message || 'Failed to load user details', 'error');
            }
        } catch (error) {
            console.error('View user error:', error);
            this.showNotification('Failed to load user details', 'error');
        }
    },
    
    // Change user password
    async changeUserPassword(userId, userName) {
        const modalHtml = `
            <div class="modal fade" id="changeUserPasswordModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Change Password - ${userName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="changeUserPasswordForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="newUserPassword" class="form-label">New Password</label>
                                    <input type="password" class="form-control" id="newUserPassword" required minlength="6">
                                    <div class="form-text">Password must be at least 6 characters long.</div>
                                </div>
                                <div class="mb-3">
                                    <label for="confirmUserPassword" class="form-label">Confirm Password</label>
                                    <input type="password" class="form-control" id="confirmUserPassword" required minlength="6">
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-primary">Change Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if present
        const existingModal = document.getElementById('changeUserPasswordModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('changeUserPasswordModal'));
        modal.show();
        
        // Handle form submission
        document.getElementById('changeUserPasswordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = document.getElementById('newUserPassword').value;
            const confirmPassword = document.getElementById('confirmUserPassword').value;
            
            if (newPassword !== confirmPassword) {
                this.showNotification('Passwords do not match', 'error');
                return;
            }
            
            try {
                const response = await AdminAuth.apiRequest(`/admin/users/${userId}/change-password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        new_password: newPassword
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    this.showNotification('Password changed successfully', 'success');
                    modal.hide();
                } else {
                    this.showNotification(data.message || 'Failed to change password', 'error');
                }
            } catch (error) {
                console.error('Change user password error:', error);
                this.showNotification('Failed to change password', 'error');
            }
        });
        
        // Clean up modal after hide
        document.getElementById('changeUserPasswordModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    },
    
    // Delete user
    async deleteUser(userId, userName) {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
            return;
        }
        
        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('User deleted successfully', 'success');
                // Reload users data
                this.loadUsersData();
            } else {
                this.showNotification(data.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showNotification('Failed to delete user', 'error');
        }
    },
    
    // Toggle user status
    async toggleUserStatus(userId) {
        if (!confirm('Are you sure you want to change this user\'s status?')) {
            return;
        }
        
        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${userId}/toggle-status`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('User status updated successfully', 'success');
                // Reload users data
                this.loadUsersData();
            } else {
                this.showNotification(data.message || 'Failed to update user status', 'error');
            }
        } catch (error) {
            console.error('Toggle user status error:', error);
            this.showNotification('Failed to update user status', 'error');
        }
    },
    
    // Setup create admin form
    setupCreateAdminForm() {
        const form = document.getElementById('create-admin-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.createAdminUser();
            });
        }
    },
    
    // Create admin user
    async createAdminUser() {
        const form = document.getElementById('create-admin-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Creating...';
            
            const formData = {
                full_name: document.getElementById('admin-full-name').value,
                email: document.getElementById('admin-email').value,
                password: document.getElementById('admin-password').value,
                phone: document.getElementById('admin-phone').value || null,
                user_type: 'admin'
            };
            
            const response = await AdminAuth.apiRequest('/auth/register', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Admin user created successfully', 'success');
                form.reset();
                // Reload admin users table
                this.loadAdminUsers();
            } else {
                this.showNotification(data.message || 'Failed to create admin user', 'error');
            }
        } catch (error) {
            console.error('Create admin error:', error);
            this.showNotification('Failed to create admin user: ' + error.message, 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },
    
    // Load admin users
    async loadAdminUsers() {
        try {
            const response = await AdminAuth.apiRequest('/admin/users?user_type=admin&per_page=50');
            
            if (!response.ok) {
                console.error(`Admin users API returned ${response.status}: ${response.statusText}`);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Admin users data received:', data);
            
            if (data.success && data.users) {
                this.displayAdminUsersTable(data.users);
            } else {
                console.error('Admin users API returned unexpected structure:', data);
                this.displayAdminUsersTable([]);
            }
        } catch (error) {
            console.error('Failed to load admin users:', error);
            this.displayAdminUsersTable([]);
        }
    },
    
    // Display admin users table
    displayAdminUsersTable(adminUsers) {
        const tbody = document.getElementById('admin-users-table');
        if (!tbody) return;
        
        if (!adminUsers || adminUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-3">
                        <p class="text-muted">No admin users found</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = adminUsers.map(admin => `
            <tr>
                <td>${admin.full_name || 'N/A'}</td>
                <td>${admin.email}</td>
                <td>${admin.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${admin.is_active ? 'success' : 'secondary'}">
                        ${admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(admin.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-${admin.is_active ? 'danger' : 'success'} me-1" 
                            onclick="AdminDashboard.toggleUserStatus(${admin.id})" 
                            title="${admin.is_active ? 'Deactivate' : 'Activate'}">
                        <i class="bi bi-${admin.is_active ? 'x-circle' : 'check-circle'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },
    
    // Export users data
    exportUsers() {
        console.log('Export users functionality - to be implemented');
        this.showNotification('Export functionality will be implemented soon', 'info');
    },
    
    // Add doctor manually
    addDoctorManually() {
        console.log('Add doctor manually functionality - to be implemented');
        this.showNotification('Add doctor functionality will be implemented soon', 'info');
    },
    
    // Export appointments data
    exportAppointments() {
        console.log('Export appointments functionality - to be implemented');
        this.showNotification('Export appointments functionality will be implemented soon', 'info');
    },
    
    // Update analytics data and charts
    updateAnalytics(analytics) {
        // Update performance metrics
        if (analytics.system_performance) {
            const uptimeEl = document.getElementById('uptime-value');
            if (uptimeEl) uptimeEl.textContent = analytics.system_performance.uptime_percentage + '%';
            
            const responseEl = document.getElementById('response-time-value');
            if (responseEl) responseEl.textContent = analytics.system_performance.avg_response_time + 'ms';
            
            const errorEl = document.getElementById('error-rate-value');
            if (errorEl) errorEl.textContent = analytics.system_performance.error_rate + '%';
        }
        
        // Update user activity metrics
        if (analytics.user_activity) {
            const activeUsersEl = document.getElementById('active-users-7d');
            if (activeUsersEl) activeUsersEl.textContent = analytics.user_activity.active_users_7d;
            
            const newUsers30dEl = document.getElementById('new-users-30d');
            if (newUsers30dEl) newUsers30dEl.textContent = analytics.user_activity.new_users_30d;
        }
        
        // Update appointment metrics
        if (analytics.appointment_metrics) {
            const appointments30dEl = document.getElementById('appointments-30d');
            if (appointments30dEl) appointments30dEl.textContent = analytics.appointment_metrics.appointments_30d;
            
            const completedEl = document.getElementById('completed-appointments');
            if (completedEl) completedEl.textContent = analytics.appointment_metrics.completed_appointments;
        }
        
        // Create charts
        this.createAnalyticsCharts(analytics);
    },
    
    // Create analytics charts
    createAnalyticsCharts(analytics) {
        // Doctor specialty distribution
        if (analytics.doctor_analytics && analytics.doctor_analytics.specialty_distribution) {
            this.createPieChart('specialtyDistributionChart', {
                labels: analytics.doctor_analytics.specialty_distribution.map(item => item.specialty || 'Not Specified'),
                data: analytics.doctor_analytics.specialty_distribution.map(item => item.count),
                title: 'Doctor Specialties'
            });
        }
        
        // Appointment status distribution
        if (analytics.appointment_metrics && analytics.appointment_metrics.appointment_status) {
            this.createDoughnutChart('appointmentStatusChart', {
                labels: analytics.appointment_metrics.appointment_status.map(item => item.status),
                data: analytics.appointment_metrics.appointment_status.map(item => item.count),
                title: 'Appointment Status'
            });
        }
    },
    
    // Create pie chart
    createPieChart(canvasId, config) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (window[canvasId + 'Instance']) {
            window[canvasId + 'Instance'].destroy();
        }
        
        const colors = [
            'rgb(255, 99, 132)',
            'rgb(54, 162, 235)',
            'rgb(255, 205, 86)',
            'rgb(75, 192, 192)',
            'rgb(153, 102, 255)',
            'rgb(255, 159, 64)'
        ];
        
        window[canvasId + 'Instance'] = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: config.labels,
                datasets: [{
                    data: config.data,
                    backgroundColor: colors.slice(0, config.data.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },
    
    // Create doughnut chart
    createDoughnutChart(canvasId, config) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (window[canvasId + 'Instance']) {
            window[canvasId + 'Instance'].destroy();
        }
        
        const colors = [
            'rgb(34, 197, 94)',   // Green for completed
            'rgb(234, 179, 8)',   // Yellow for pending
            'rgb(239, 68, 68)',   // Red for cancelled
            'rgb(59, 130, 246)',  // Blue for confirmed
            'rgb(168, 85, 247)'   // Purple for other
        ];
        
        window[canvasId + 'Instance'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: config.labels,
                datasets: [{
                    data: config.data,
                    backgroundColor: colors.slice(0, config.data.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    // Load admin users for the settings section
    async loadAdminUsers() {
        try {
            console.log('Loading admin users...');
            const response = await AdminAuth.apiRequest('/admin/users?user_type=admin');
            const data = await response.json();
            
            console.log('Admin users data received:', data);
            
            if (data.success && data.data && data.data.users) {
                this.displayAdminUsersTable(data.data.users);
            } else {
                throw new Error(data.message || 'Failed to load admin users');
            }
        } catch (error) {
            console.error('Failed to load admin users:', error);
            this.showNotification('Failed to load admin users', 'error');
        }
    },

    // Display admin users in table
    displayAdminUsersTable(adminUsers) {
        const tbody = document.getElementById('admin-users-table');
        if (!tbody) return;
        
        if (!adminUsers || adminUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <i class="bi bi-person-x text-muted fs-1"></i>
                        <p class="text-muted mt-2">No admin users found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = adminUsers.map(admin => `
            <tr>
                <td>${admin.full_name || 'N/A'}</td>
                <td>${admin.email}</td>
                <td>${admin.phone || 'N/A'}</td>
                <td>
                    <span class="badge bg-${admin.is_active ? 'success' : 'secondary'}">
                        ${admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(admin.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-info me-1" onclick="AdminDashboard.viewAdminDetails(${admin.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${admin.email !== 'admin' ? `
                        <button class="btn btn-sm btn-outline-secondary me-1" onclick="AdminDashboard.changeAdminPassword(${admin.id}, '${admin.full_name}')" title="Change Password">
                            <i class="bi bi-key"></i>
                        </button>
                    ` : ''}
                    ${admin.id !== this.getCurrentUserId() ? `
                        ${admin.email !== 'admin' ? `
                            <button class="btn btn-sm btn-outline-${admin.is_active ? 'warning' : 'success'} me-1" 
                                    onclick="AdminDashboard.toggleAdminStatus(${admin.id})" 
                                    title="${admin.is_active ? 'Deactivate' : 'Activate'}">
                                <i class="bi bi-${admin.is_active ? 'person-dash' : 'person-check'}"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="AdminDashboard.deleteAdmin(${admin.id})" title="Delete Admin">
                                <i class="bi bi-trash"></i>
                            </button>
                        ` : '<span class="badge bg-warning">Master Admin</span>'}
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    // Get current user ID to prevent self-deactivation
    getCurrentUserId() {
        try {
            const userData = JSON.parse(localStorage.getItem('adminUserData') || '{}');
            return userData.id || null;
        } catch {
            return null;
        }
    },

    // Change admin password
    async changeAdminPassword(adminId, adminName) {
        const newPassword = prompt(`Enter new password for ${adminName}:`);
        if (!newPassword) return;
        
        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        const confirmPassword = prompt('Confirm new password:');
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${adminId}/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPassword })
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification(`Password changed successfully for ${adminName}`, 'success');
            } else {
                throw new Error(data.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            this.showNotification('Failed to change password', 'error');
        }
    },

    // Delete admin
    async deleteAdmin(adminId) {
        if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${adminId}`, {
                method: 'DELETE'
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification('Admin deleted successfully', 'success');
                this.loadAdminUsers(); // Refresh the list
            } else {
                throw new Error(data.message || 'Failed to delete admin');
            }
        } catch (error) {
            console.error('Delete admin error:', error);
            this.showNotification('Failed to delete admin', 'error');
        }
    },

    // Toggle admin status (activate/deactivate)
    async toggleAdminStatus(adminId) {
        try {
            const response = await AdminAuth.apiRequest(`/admin/users/${adminId}/toggle-status`, {
                method: 'PUT'
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification('Admin status updated successfully', 'success');
                this.loadAdminUsers(); // Refresh the list
            } else {
                throw new Error(data.message || 'Failed to update admin status');
            }
        } catch (error) {
            console.error('Toggle status error:', error);
            this.showNotification('Failed to update admin status', 'error');
        }
    },

    // View admin details
    viewAdminDetails(adminId) {
        // For now, just show a simple alert - can be enhanced with a modal later
        alert(`Admin details for ID: ${adminId}\n(This can be enhanced with a detailed modal)`);
    },

    // Load pending doctor verifications
    async loadPendingVerifications() {
        try {
            console.log('Loading pending verifications...');
            const response = await AdminAuth.apiRequest('/admin/doctors/pending-verification');
            const data = await response.json();
            
            console.log('Pending verifications data received:', data);
            
            if (data.success && data.data && data.data.pending_doctors) {
                this.displayPendingVerifications(data.data.pending_doctors);
            } else {
                throw new Error(data.message || 'Failed to load pending verifications');
            }
        } catch (error) {
            console.error('Failed to load pending verifications:', error);
            this.showNotification('Failed to load pending verifications', 'error');
        }
    },

    // Display pending verifications in table
    displayPendingVerifications(pendingDoctors) {
        const tbody = document.getElementById('pending-verifications');
        if (!tbody) return;
        
        if (!pendingDoctors || pendingDoctors.length === 0) {
            tbody.innerHTML = `
                <div class="col-12 text-center py-4">
                    <i class="bi bi-check-circle text-muted fs-1"></i>
                    <p class="text-muted mt-2">No doctors pending verification</p>
                </div>
            `;
            return;
        }

        tbody.innerHTML = pendingDoctors.map(doctor => `
            <div class="verification-card mb-3">
                <div class="card">
                    <div class="row g-0 align-items-center p-3">
                        <div class="col-md-8">
                            <h6 class="mb-1">${doctor.name || 'Unknown Doctor'}</h6>
                            <p class="text-muted mb-1">
                                <i class="bi bi-envelope me-1"></i>${doctor.email || 'No email'} | 
                                <i class="bi bi-stethoscope me-1"></i>${doctor.specialty || 'No specialty'} | 
                                <i class="bi bi-award me-1"></i>${doctor.years_of_experience || 0} years experience
                            </p>
                            <p class="text-muted mb-1">
                                <i class="bi bi-card-text me-1"></i>License: ${doctor.license_number || 'Not specified'}
                            </p>
                            <p class="text-muted small mb-0">
                                <i class="bi bi-clock me-1"></i>Submitted: 
                                <span class="text-muted">${this.formatDate(doctor.submitted_at)}</span>
                                | <span class="badge bg-info">${doctor.days_waiting} days waiting</span>
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="d-flex flex-column gap-2">
                                <button class="btn btn-success btn-sm" onclick="AdminDashboard.approveDoctor(${doctor.id})" title="Approve">
                                    <i class="bi bi-check me-1"></i>Approve
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="AdminDashboard.rejectDoctor(${doctor.id})" title="Reject">
                                    <i class="bi bi-x me-1"></i>Reject
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="AdminDashboard.viewDoctorDetails(${doctor.id})" title="View Details">
                                    <i class="bi bi-eye me-1"></i>Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Helper to format date
    formatDate(dateString) {
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    },

    // Approve doctor
    async approveDoctor(doctorId) {
        if (!confirm('Are you sure you want to approve this doctor?')) return;

        try {
            const response = await AdminAuth.apiRequest(`/admin/doctors/${doctorId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    approved: true,
                    notes: 'Approved by admin'
                })
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification('Doctor approved successfully', 'success');
                this.loadPendingVerifications(); // Refresh the list
            } else {
                throw new Error(data.message || 'Failed to approve doctor');
            }
        } catch (error) {
            console.error('Approve doctor error:', error);
            this.showNotification('Failed to approve doctor', 'error');
        }
    },

    // Reject doctor
    async rejectDoctor(doctorId) {
        const reason = prompt('Enter reason for rejection (optional):');
        if (reason === null) return; // User cancelled

        try {
            const response = await AdminAuth.apiRequest(`/admin/doctors/${doctorId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    approved: false,
                    notes: reason || 'Rejected by admin'
                })
            });
            const data = await response.json();

            if (data.success) {
                this.showNotification('Doctor rejected successfully', 'success');
                this.loadPendingVerifications(); // Refresh the list
            } else {
                throw new Error(data.message || 'Failed to reject doctor');
            }
        } catch (error) {
            console.error('Reject doctor error:', error);
            this.showNotification('Failed to reject doctor', 'error');
        }
    },

    // View doctor details
    viewDoctorDetails(doctorId) {
        // For now, just show a simple alert - can be enhanced with a modal later
        alert(`Doctor verification details for ID: ${doctorId}\n(This can be enhanced with a detailed modal)`);
    }
};

// Export for use in HTML pages
window.AdminAuth = AdminAuth;
window.AdminDashboard = AdminDashboard;