/**
 * Session Management Utility
 * Handles session initialization, monitoring, and cleanup across the application
 */

const SessionManager = {
    // Track if session monitoring is active
    isMonitoring: false,
    
    /**
     * Initialize session management for authenticated pages
     */
    init() {
        // Only initialize if user is authenticated and not in development mode
        if (AuthGuard.isAuthenticated() && !AuthGuard.isDevelopmentMode()) {
            // Start session monitoring (ApiHelper will check if already running)
            const started = ApiHelper.startSessionMonitoring();
            if (started) {
                this.isMonitoring = true;
            }
            
            // Add page visibility change handler to pause/resume monitoring
            this.setupVisibilityHandler();
            
            // Add beforeunload handler to cleanup
            this.setupUnloadHandler();
        }
    },
    
    /**
     * Setup page visibility change handler
     */
    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden, reduce session check frequency
            } else {
                // Page is visible, resume normal session checking
                // Trigger immediate session check when page becomes visible
                if (this.isMonitoring) {
                    ApiHelper.checkSession().catch(error => {
                        console.error('Session check failed on page visibility change:', error);
                    });
                }
            }
        });
    },
    
    /**
     * Setup page unload handler
     */
    setupUnloadHandler() {
        window.addEventListener('beforeunload', () => {
            // Stop session monitoring when page is unloading
            ApiHelper.stopSessionMonitoring();
            this.isMonitoring = false;
        });
    },
    
    /**
     * Manually refresh session
     */
    async refreshSession() {
        try {
            console.log('Manually refreshing session...');
            const isValid = await ApiHelper.checkSession();
            if (isValid) {
                console.log('Session refreshed successfully');
                return true;
            } else {
                console.warn('Session refresh failed');
                return false;
            }
        } catch (error) {
            console.error('Error refreshing session:', error);
            return false;
        }
    },
    
    /**
     * Stop session monitoring (for logout, etc.)
     */
    stop() {
        ApiHelper.stopSessionMonitoring();
        this.isMonitoring = false;
        console.log('Session monitoring stopped');
    },

    /**
     * Get session management status
     */
    getStatus() {
        return {
            isActive: this.isMonitoring,
            apiMonitoringActive: ApiHelper.isSessionMonitoringActive(),
            isAuthenticated: AuthGuard ? AuthGuard.isAuthenticated() : false,
            isDevelopmentMode: AuthGuard ? AuthGuard.isDevelopmentMode() : false
        };
    }
};

// Auto-initialize session management when script loads
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other auth components are loaded
    setTimeout(() => {
        // Only initialize if not already monitoring
        if (!ApiHelper.isSessionMonitoringActive()) {
            SessionManager.init();
        } else {
            console.log('Session monitoring already active, skipping initialization');
        }
    }, 1000);
});

// Export for use in other scripts
window.SessionManager = SessionManager;