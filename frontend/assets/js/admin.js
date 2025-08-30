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
        const adminEmail = localStorage.getItem('adminEmail');
        
        // Update name elements
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = adminName || 'Admin User';
        }
        
        // Update email elements
        const userEmailElement = document.getElementById('user-email');
        if (userEmailElement) {
            userEmailElement.textContent = adminEmail || 'admin@sahatak.com';
        }
        
        // Also update any elements with these classes
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        userNameElements.forEach(el => {
            if (!el.id) el.textContent = adminName || 'Admin User';
        });
        userEmailElements.forEach(el => {
            if (!el.id) el.textContent = adminEmail || '';
        });
    },
    
    // Load dashboard data
    async loadDashboardData() {
        try {
            const response = await AdminAuth.apiRequest('/admin/dashboard');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.data);
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
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
            
            if (data.success && data.data.users) {
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
                    <button class="btn btn-sm btn-primary me-1" onclick="AdminDashboard.viewUser(${user.id})" title="View">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning me-1" onclick="AdminDashboard.editUser(${user.id})" title="Edit">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-${user.is_active ? 'danger' : 'success'}" onclick="AdminDashboard.toggleUserStatus(${user.id})" title="${user.is_active ? 'Deactivate' : 'Activate'}">
                        <i class="bi bi-${user.is_active ? 'x-circle' : 'check-circle'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
            
            if (data.success && data.data.users) {
                this.displayUsersTable(data.data.users);
                this.updateUsersPagination(data.data.pagination);
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
    viewUser(userId) {
        console.log('View user:', userId);
        // Implement view user modal
    },
    
    // Edit user
    editUser(userId) {
        console.log('Edit user:', userId);
        // Implement edit user modal
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
            const data = await response.json();
            
            if (data.success && data.data.users) {
                this.displayAdminUsersTable(data.data.users);
            }
        } catch (error) {
            console.error('Failed to load admin users:', error);
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
    }
};

// Export for use in HTML pages
window.AdminAuth = AdminAuth;
window.AdminDashboard = AdminDashboard;