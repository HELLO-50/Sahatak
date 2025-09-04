/**
 * Centralized Authentication Storage Manager
 * Manages all authentication-related localStorage operations
 * Provides a single source of truth for auth state
 */

class AuthStorage {
    // Define the auth data structure
    static AUTH_KEY = 'sahatak_auth';
    static LANGUAGE_KEY = 'sahatak_language';
    static RETURN_URL_KEY = 'sahatak_return_url';
    
    /**
     * Save authentication data as a single object
     * @param {Object} authData - User authentication data
     */
    static setAuthData(authData) {
        if (!authData) return false;
        
        const authObject = {
            id: authData.id || authData.user_id,
            type: authData.user_type || authData.userType,
            email: authData.email,
            name: authData.full_name || authData.fullName,
            token: authData.access_token || authData.token,
            profile: authData.profile || null,
            timestamp: Date.now()
        };
        
        // Store as single object
        localStorage.setItem(this.AUTH_KEY, JSON.stringify(authObject));
        
        // Also maintain individual keys for backward compatibility (will phase out later)
        this._setLegacyKeys(authObject);
        
        return true;
    }
    
    /**
     * Get authentication data
     * @returns {Object|null} Authentication data or null if not authenticated
     */
    static getAuthData() {
        try {
            const authStr = localStorage.getItem(this.AUTH_KEY);
            if (authStr) {
                return JSON.parse(authStr);
            }
            
            // Fallback: try to construct from legacy keys
            return this._getLegacyAuthData();
        } catch (error) {
            console.error('Error reading auth data:', error);
            return null;
        }
    }
    
    /**
     * Get specific auth property
     * @param {string} key - Property name (id, type, email, name, token)
     * @returns {*} Property value or null
     */
    static get(key) {
        const authData = this.getAuthData();
        return authData ? authData[key] : null;
    }
    
    /**
     * Check if user is authenticated
     * @returns {boolean} True if authenticated
     */
    static isAuthenticated() {
        const authData = this.getAuthData();
        return !!(authData && authData.id && authData.type);
    }
    
    /**
     * Clear all authentication data
     */
    static clearAuth() {
        // Remove main auth object
        localStorage.removeItem(this.AUTH_KEY);
        
        // ONLY clear auth-related keys, preserve others
        const authOnlyKeys = [
            'sahatak_user_id',
            'sahatak_user_type',
            'sahatak_user_email',
            'sahatak_user_name',
            'sahatak_user_data',
            'sahatak_doctor_data',
            'sahatak_patient_data',
            'sahatak_user',
            'sahatak_token',
            'sahatak_access_token'
        ];
        
        authOnlyKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear return URL as it's auth-related
        localStorage.removeItem(this.RETURN_URL_KEY);
        
        // DO NOT clear:
        // - sahatak_language (user preference)
        // - sahatak_preferences (user settings)
        // - adminEmail, adminLoggedIn, etc (admin system)
        // - Any other non-auth keys
        
        console.log('Authentication data cleared (non-auth data preserved)');
    }
    
    /**
     * Get/Set language preference (persists across sessions)
     */
    static getLanguage() {
        return localStorage.getItem(this.LANGUAGE_KEY) || 'ar';
    }
    
    static setLanguage(lang) {
        if (lang === 'ar' || lang === 'en') {
            localStorage.setItem(this.LANGUAGE_KEY, lang);
            return true;
        }
        return false;
    }
    
    /**
     * Get/Set return URL for post-login redirect
     */
    static getReturnUrl() {
        return localStorage.getItem(this.RETURN_URL_KEY);
    }
    
    static setReturnUrl(url) {
        if (url) {
            localStorage.setItem(this.RETURN_URL_KEY, url);
        }
    }
    
    static clearReturnUrl() {
        localStorage.removeItem(this.RETURN_URL_KEY);
    }
    
    // Private methods for backward compatibility
    static _setLegacyKeys(authObject) {
        // Maintain legacy keys for components not yet updated
        if (authObject.id) localStorage.setItem('sahatak_user_id', authObject.id.toString());
        if (authObject.type) localStorage.setItem('sahatak_user_type', authObject.type);
        if (authObject.email) localStorage.setItem('sahatak_user_email', authObject.email);
        if (authObject.name) localStorage.setItem('sahatak_user_name', authObject.name);
        if (authObject.token) localStorage.setItem('sahatak_access_token', authObject.token);
    }
    
    static _getLegacyAuthData() {
        // Construct auth object from legacy keys if new format not available
        const id = localStorage.getItem('sahatak_user_id');
        const type = localStorage.getItem('sahatak_user_type');
        
        if (!id || !type) return null;
        
        return {
            id: id,
            type: type,
            email: localStorage.getItem('sahatak_user_email'),
            name: localStorage.getItem('sahatak_user_name'),
            token: localStorage.getItem('sahatak_access_token'),
            profile: null,
            timestamp: Date.now()
        };
    }
}

// Export for use in other modules
window.AuthStorage = AuthStorage;