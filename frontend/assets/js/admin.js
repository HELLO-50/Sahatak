// Admin Authentication and Dashboard Management
const AdminAuth = {
    API_BASE_URL: 'https://sahatak.pythonanywhere.com/api',
    
    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        const userType = localStorage.getItem('userType');
        return token && userType === 'admin';
    },
    
    // Get auth token
    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    },
    
    // Verify token validity
    async verifyToken() {
        const token = this.getToken();
        if (!token) return false;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/admin/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    },
    
    // Login function
    async login(email, password, remember = false) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login_identifier: email,
                    password: password,
                    remember_me: remember
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Check if user is admin
                if (data.data.user_type !== 'admin') {
                    throw new Error('Access denied. Admin credentials required.');
                }
                
                // Store authentication data
                const storage = remember ? localStorage : sessionStorage;
                storage.setItem('adminToken', data.data.access_token);
                localStorage.setItem('userType', data.data.user_type);
                localStorage.setItem('adminEmail', data.data.email);
                localStorage.setItem('adminName', data.data.full_name);
                
                if (remember) {
                    localStorage.setItem('rememberAdmin', 'true');
                }
                
                return { success: true, data: data.data };
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
        localStorage.removeItem('adminToken');
        localStorage.removeItem('userType');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminName');
        localStorage.removeItem('rememberAdmin');
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
            throw new Error('No authentication token');
        }
        
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
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
        
        // Verify token is still valid
        const isValid = await AdminAuth.verifyToken();
        if (!isValid) {
            AdminAuth.logout();
            return;
        }
        
        // Set user info in UI
        this.updateUserInfo();
        
        // Load dashboard data
        await this.loadDashboardData();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup periodic refresh
        this.setupAutoRefresh();
    },
    
    // Update user info in UI
    updateUserInfo() {
        const adminName = localStorage.getItem('adminName');
        const adminEmail = localStorage.getItem('adminEmail');
        
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        userNameElements.forEach(el => el.textContent = adminName || 'Admin');
        userEmailElements.forEach(el => el.textContent = adminEmail || '');
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
            document.querySelectorAll('.stat-card').forEach(card => {
                const statType = card.dataset.stat;
                if (data.stats[statType] !== undefined) {
                    card.querySelector('.stat-value').textContent = data.stats[statType];
                }
            });
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
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
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
        document.querySelectorAll('.dashboard-section').forEach(sec => {
            sec.style.display = 'none';
        });
        
        // Show selected section
        const selectedSection = document.getElementById(`${section}Section`);
        if (selectedSection) {
            selectedSection.style.display = 'block';
        }
        
        // Update active nav item
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === section) {
                link.classList.add('active');
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
    },
    
    // Load users data
    async loadUsersData() {
        try {
            const response = await AdminAuth.apiRequest('/admin/users?page=1&limit=20');
            const data = await response.json();
            
            if (data.success) {
                this.displayUsersTable(data.data.users);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    },
    
    // Display users table
    displayUsersTable(users) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${user.full_name}</td>
                <td>${user.email}</td>
                <td>${user.user_type}</td>
                <td>
                    <span class="badge badge-${user.is_active ? 'success' : 'danger'}">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="AdminDashboard.viewUser(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="AdminDashboard.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
    }
};

// Export for use in HTML pages
window.AdminAuth = AdminAuth;
window.AdminDashboard = AdminDashboard;