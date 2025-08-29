/**
 * Frontend Caching Utility for Sahatak
 * Implements multiple caching strategies with TTL and automatic cleanup
 */

class CacheManager {
    constructor() {
        this.memoryCache = new Map();
        this.cachePrefix = 'sahatak_cache_';
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
        
        // Cache configurations for different data types
        this.cacheConfigs = {
            // User data - cache for longer
            'user_profile': { ttl: 15 * 60 * 1000, storage: 'localStorage' }, // 15 min
            'user_settings': { ttl: 30 * 60 * 1000, storage: 'localStorage' }, // 30 min
            
            // Doctor/appointment data - moderate caching
            'doctors_list': { ttl: 10 * 60 * 1000, storage: 'memory' }, // 10 min
            'doctor_availability': { ttl: 2 * 60 * 1000, storage: 'memory' }, // 2 min
            'appointments_list': { ttl: 3 * 60 * 1000, storage: 'memory' }, // 3 min
            
            // Medical data - shorter cache
            'patient_ehr': { ttl: 5 * 60 * 1000, storage: 'memory' }, // 5 min
            'prescriptions': { ttl: 5 * 60 * 1000, storage: 'memory' }, // 5 min
            'medical_history': { ttl: 10 * 60 * 1000, storage: 'memory' }, // 10 min
            
            // Static/reference data - cache longer
            'specialties': { ttl: 60 * 60 * 1000, storage: 'localStorage' }, // 1 hour
            'languages': { ttl: 24 * 60 * 60 * 1000, storage: 'localStorage' }, // 24 hours
            
            // API responses - short cache
            'api_response': { ttl: 1 * 60 * 1000, storage: 'memory' } // 1 min
        };

        // Start cleanup interval
        this.startCleanupTimer();
        
        // Bind events
        this.bindStorageEvents();
    }

    /**
     * Generate cache key
     */
    _generateKey(key, params = null) {
        let cacheKey = `${this.cachePrefix}${key}`;
        if (params) {
            const paramString = typeof params === 'object' ? 
                JSON.stringify(params) : String(params);
            cacheKey += '_' + btoa(paramString).replace(/[+/=]/g, '');
        }
        return cacheKey;
    }

    /**
     * Get cache configuration for data type
     */
    _getConfig(dataType) {
        return this.cacheConfigs[dataType] || { 
            ttl: this.defaultTTL, 
            storage: 'memory' 
        };
    }

    /**
     * Set cache entry
     */
    set(key, data, dataType = 'api_response', params = null) {
        try {
            const config = this._getConfig(dataType);
            const cacheKey = this._generateKey(key, params);
            const entry = {
                data,
                timestamp: Date.now(),
                ttl: config.ttl,
                dataType
            };

            if (config.storage === 'localStorage' && this._isLocalStorageAvailable()) {
                localStorage.setItem(cacheKey, JSON.stringify(entry));
            } else {
                this.memoryCache.set(cacheKey, entry);
            }

            SahatakLogger?.debug(`Cache SET: ${cacheKey} (${dataType}, TTL: ${config.ttl}ms)`);
        } catch (error) {
            SahatakLogger?.error('Cache set error', { key, error: error.message });
        }
    }

    /**
     * Get cache entry
     */
    get(key, params = null) {
        try {
            const cacheKey = this._generateKey(key, params);
            let entry = null;

            // Try localStorage first
            if (this._isLocalStorageAvailable()) {
                const stored = localStorage.getItem(cacheKey);
                if (stored) {
                    entry = JSON.parse(stored);
                }
            }

            // Fallback to memory cache
            if (!entry) {
                entry = this.memoryCache.get(cacheKey);
            }

            if (!entry) {
                return null;
            }

            // Check if expired
            if (Date.now() - entry.timestamp > entry.ttl) {
                this.delete(key, params);
                SahatakLogger?.debug(`Cache EXPIRED: ${cacheKey}`);
                return null;
            }

            SahatakLogger?.debug(`Cache HIT: ${cacheKey}`);
            return entry.data;
        } catch (error) {
            SahatakLogger?.error('Cache get error', { key, error: error.message });
            return null;
        }
    }

    /**
     * Check if entry exists and is valid
     */
    has(key, params = null) {
        return this.get(key, params) !== null;
    }

    /**
     * Delete cache entry
     */
    delete(key, params = null) {
        try {
            const cacheKey = this._generateKey(key, params);
            
            if (this._isLocalStorageAvailable()) {
                localStorage.removeItem(cacheKey);
            }
            this.memoryCache.delete(cacheKey);
            
            SahatakLogger?.debug(`Cache DELETE: ${cacheKey}`);
        } catch (error) {
            SahatakLogger?.error('Cache delete error', { key, error: error.message });
        }
    }

    /**
     * Clear all cache entries for a specific data type
     */
    clearByType(dataType) {
        try {
            const keysToDelete = [];
            
            // Clear from localStorage
            if (this._isLocalStorageAvailable()) {
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(this.cachePrefix)) {
                        try {
                            const entry = JSON.parse(localStorage.getItem(key));
                            if (entry.dataType === dataType) {
                                keysToDelete.push(key);
                            }
                        } catch (e) {
                            keysToDelete.push(key); // Remove invalid entries
                        }
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            }

            // Clear from memory cache
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.dataType === dataType) {
                    this.memoryCache.delete(key);
                }
            }

            SahatakLogger?.info(`Cache cleared for type: ${dataType}`);
        } catch (error) {
            SahatakLogger?.error('Cache clear by type error', { dataType, error: error.message });
        }
    }

    /**
     * Clear all cache
     */
    clearAll() {
        try {
            // Clear memory cache
            this.memoryCache.clear();
            
            // Clear localStorage entries
            if (this._isLocalStorageAvailable()) {
                const keysToDelete = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key?.startsWith(this.cachePrefix)) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => localStorage.removeItem(key));
            }
            
            SahatakLogger?.info('All cache cleared');
        } catch (error) {
            SahatakLogger?.error('Cache clear all error', error.message);
        }
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleanupCount = 0;

        // Cleanup memory cache
        for (const [key, entry] of this.memoryCache.entries()) {
            if (now - entry.timestamp > entry.ttl) {
                this.memoryCache.delete(key);
                cleanupCount++;
            }
        }

        // Cleanup localStorage
        if (this._isLocalStorageAvailable()) {
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.cachePrefix)) {
                    try {
                        const entry = JSON.parse(localStorage.getItem(key));
                        if (now - entry.timestamp > entry.ttl) {
                            keysToDelete.push(key);
                            cleanupCount++;
                        }
                    } catch (e) {
                        keysToDelete.push(key); // Remove invalid entries
                        cleanupCount++;
                    }
                }
            }
            keysToDelete.forEach(key => localStorage.removeItem(key));
        }

        if (cleanupCount > 0) {
            SahatakLogger?.debug(`Cache cleanup: removed ${cleanupCount} expired entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        const memorySize = this.memoryCache.size;
        let localStorageSize = 0;
        
        if (this._isLocalStorageAvailable()) {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.cachePrefix)) {
                    localStorageSize++;
                }
            }
        }

        return {
            memoryEntries: memorySize,
            localStorageEntries: localStorageSize,
            totalEntries: memorySize + localStorageSize
        };
    }

    /**
     * Cache wrapper for API calls
     */
    async wrapApiCall(key, apiFunction, dataType = 'api_response', params = null, forceRefresh = false) {
        // Check cache first (unless forcing refresh)
        if (!forceRefresh) {
            const cached = this.get(key, params);
            if (cached !== null) {
                return cached;
            }
        }

        try {
            // Call API function
            const result = await apiFunction();
            
            // Cache successful results
            if (result && result.success !== false) {
                this.set(key, result, dataType, params);
            }
            
            return result;
        } catch (error) {
            SahatakLogger?.error('API call error in cache wrapper', { key, error: error.message });
            throw error;
        }
    }

    /**
     * Utility methods
     */
    _isLocalStorageAvailable() {
        try {
            const test = '__test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    startCleanupTimer() {
        // Run cleanup every 10 minutes
        setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }

    bindStorageEvents() {
        // Listen for storage events to sync across tabs
        window.addEventListener('storage', (e) => {
            if (e.key?.startsWith(this.cachePrefix)) {
                SahatakLogger?.debug('Cache updated in another tab', e.key);
            }
        });

        // Clear cache on user logout
        window.addEventListener('beforeunload', () => {
            // Keep user settings and static data, clear session data
            this.clearByType('api_response');
            this.clearByType('appointments_list');
            this.clearByType('patient_ehr');
        });
    }
}

// Create global cache instance
const cacheManager = new CacheManager();

// Export for use in other modules
window.SahatakCache = cacheManager;

console.log('✅ Cache Manager initialized');