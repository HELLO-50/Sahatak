// Authentication Guard - Protects dashboard and protected routes
class AuthGuard {
    
    /**
     * Check if we're in development mode (localhost)
     * @returns {boolean} True if in development mode
     */
    static isDevelopmentMode() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname === '';
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated, false otherwise
     */
    static isAuthenticated() {
        // Bypass authentication in development mode
        if (this.isDevelopmentMode()) {
            console.log('Development mode: bypassing authentication');
            return true;
        }
        
        const userId = localStorage.getItem('sahatak_user_id');
        const userType = localStorage.getItem('sahatak_user_type');
        const userEmail = localStorage.getItem('sahatak_user_email');
        
        return userId && userType && (userEmail || userType); // Email optional for phone-only users
    }
    
    /**
     * Get current user data from localStorage
     * @returns {object|null} User data or null if not authenticated
     */
    static getCurrentUser() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        // Provide mock user data in development mode
        if (this.isDevelopmentMode()) {
            return {
                id: '1',
                userType: 'doctor', // Default to doctor for testing
                email: 'dev@localhost.com',
                fullName: 'Developer User'
            };
        }
        
        return {
            id: localStorage.getItem('sahatak_user_id'),
            userType: localStorage.getItem('sahatak_user_type'),
            email: localStorage.getItem('sahatak_user_email'),
            fullName: localStorage.getItem('sahatak_user_name')
        };
    }
    
    /**
     * Check if current user has specific user type
     * @param {string} requiredType - 'patient' or 'doctor'
     * @returns {boolean} True if user has required type
     */
    static hasUserType(requiredType) {
        // Bypass user type check in development mode
        if (this.isDevelopmentMode()) {
            console.log(`Development mode: bypassing user type check for ${requiredType}`);
            return true;
        }
        
        const userType = localStorage.getItem('sahatak_user_type');
        return userType === requiredType;
    }
    
    /**
     * Redirect to login page with return URL
     * @param {string} returnUrl - URL to return to after login (optional)
     */
    static redirectToLogin(returnUrl = null) {
        // Store return URL for after login
        const currentHref = window.location.href;
        if (!currentHref.includes('index.html') && !currentHref.endsWith('/')) {
            localStorage.setItem('sahatak_return_url', currentHref);
        }
        
        // For GitHub Pages, use absolute path to root
        if (window.location.hostname.includes('github.io')) {
            // On GitHub Pages - use absolute path from repository root
            const repoPath = '/Sahatak/'; // Your repository name
            window.location.href = repoPath;
        } else {
            // Local development or other hosting - use relative paths
            let loginUrl;
            if (window.location.pathname.includes('/pages/dashboard/')) {
                loginUrl = '../../index.html';
            } else if (window.location.pathname.includes('/pages/')) {
                loginUrl = '../index.html';
            } else {
                loginUrl = 'index.html';
            }
            window.location.href = loginUrl;
        }
    }
    
    /**
     * Protect a page - redirect to login if not authenticated
     * @param {string} requiredUserType - 'patient', 'doctor', or null for any authenticated user
     */
    static protectPage(requiredUserType = null) {
        // Development mode bypass - always allow access
        if (this.isDevelopmentMode()) {
            console.log(`🔓 Development mode: Page protection bypassed (required: ${requiredUserType || 'any'})`);
            // this.addDevelopmentModeIndicator(); // Commented out to hide dev banner in UI
            return true;
        }
        
        // Check if user is authenticated
        if (!this.isAuthenticated()) {
            console.warn('User not authenticated, redirecting to login');
            this.redirectToLogin();
            return false;
        }
        
        // Check user type if specified
        if (requiredUserType && !this.hasUserType(requiredUserType)) {
            console.warn(`User type mismatch. Required: ${requiredUserType}, Current: ${localStorage.getItem('sahatak_user_type')}`);
            
            // Redirect to correct dashboard based on actual user type
            const actualUserType = localStorage.getItem('sahatak_user_type');
            if (actualUserType === 'patient') {
                if (window.location.pathname.includes('/pages/dashboard/')) {
                    window.location.href = 'patient.html';
                } else {
                    window.location.href = 'frontend/pages/dashboard/patient.html';
                }
            } else if (actualUserType === 'doctor') {
                if (window.location.pathname.includes('/pages/dashboard/')) {
                    window.location.href = 'doctor.html';
                } else {
                    window.location.href = 'frontend/pages/dashboard/doctor.html';
                }
            } else {
                this.redirectToLogin();
            }
            return false;
        }
        
        return true;
    }
    
    /**
     * Add visual indicator for development mode
     */
    static addDevelopmentModeIndicator() {
        // Add a small dev indicator if not already present
        if (!document.getElementById('dev-mode-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'dev-mode-indicator';
            indicator.innerHTML = '🚧 DEV MODE - Auth Disabled';
            indicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                background: #ff6b35;
                color: white;
                padding: 4px 12px;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(indicator);
        }
    }
    
    /**
     * Verify authentication with backend (optional - for enhanced security)
     * @returns {Promise<boolean>} True if session is valid
     */
    static async verifySession() {
        try {
            // This would require implementing a /api/auth/verify endpoint
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.success;
            }
            
            return false;
        } catch (error) {
            console.error('Session verification failed:', error);
            return false;
        }
    }
    
    /**
     * Clear authentication data (logout)
     */
    static clearAuth() {
        // Clear all possible sahatak localStorage keys
        const keysToRemove = [
            'sahatak_user_id',
            'sahatak_user_type', 
            'sahatak_user_email',
            'sahatak_user_name',
            'sahatak_user_data',
            'sahatak_doctor_data',
            'sahatak_user',
            'sahatak_token',
            'sahatak_preferences',
            'sahatak_return_url'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear session storage
        sessionStorage.clear();
        
        console.log('All authentication data cleared');
    }
    
    /**
     * Complete logout - clear local data and call backend
     * @returns {Promise<boolean>} True if logout successful
     */
    static async logout() {
        try {
            // Call backend logout endpoint to invalidate session
            const baseUrl = 'https://sahatak.pythonanywhere.com/api';
            const response = await fetch(`${baseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Backend logout successful:', response.ok);
        } catch (error) {
            console.error('Backend logout error:', error);
            // Continue with frontend cleanup even if backend fails
        }
        
        // Clear all local authentication data
        this.clearAuth();
        
        // Redirect to login page
        this.redirectToLogin();
        
        return true;
    }
    
    /**
     * Create logout button element
     * @param {string} className - CSS classes for the button
     * @param {string} text - Button text (optional)
     * @returns {HTMLElement} Logout button element
     */
    static createLogoutButton(className = 'btn btn-outline-danger', text = null) {
        const lang = localStorage.getItem('sahatak_language') || 'ar';
        const defaultText = lang === 'ar' ? 'تسجيل خروج' : 'Logout';
        
        const button = document.createElement('button');
        button.className = className;
        button.innerHTML = `<i class="bi bi-box-arrow-right me-1"></i> ${text || defaultText}`;
        button.onclick = () => this.logout();
        
        return button;
    }
}

// Auto-protect pages that include this script with data-protect attribute
document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const protectType = body.getAttribute('data-protect');
    
    if (protectType !== null) {
        // Page requires protection
        const requiredUserType = protectType === '' ? null : protectType;
        AuthGuard.protectPage(requiredUserType);
    }
});

// Export for use in other scripts
window.AuthGuard = AuthGuard;