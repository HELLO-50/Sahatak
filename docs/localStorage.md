# LocalStorage Documentation - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [What is LocalStorage?](#what-is-localstorage)
3. [Why LocalStorage in Sahatak?](#why-localstorage-in-sahatak)
4. [LocalStorage Keys and Usage](#localstorage-keys-and-usage)
5. [Session Management](#session-management)
6. [Language Preferences](#language-preferences)
7. [Cache Management](#cache-management)
8. [Admin Storage](#admin-storage)
9. [Security Considerations](#security-considerations)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The Sahatak Telemedicine Platform uses browser localStorage to persist user data, preferences, and cache information across browser sessions. This documentation explains how localStorage is implemented and managed throughout the application.

### Key Storage Areas
- **User Session Data**: Authentication and user profile information
- **Language Preferences**: User's selected language (Arabic/English)
- **Cache Data**: Frequently accessed data for performance optimization
- **Navigation State**: Return URLs and navigation context
- **Admin Settings**: Admin-specific configurations and preferences

---

## What is LocalStorage?

LocalStorage is a web storage API that allows JavaScript applications to store data in the browser with no expiration time. Unlike sessionStorage, data persists even after the browser is closed and reopened.

### Characteristics
- **Capacity**: Usually 5-10MB per domain
- **Persistence**: Data remains until explicitly cleared
- **Synchronous**: Blocking API (operations complete before continuing)
- **Domain-specific**: Data isolated per origin (protocol + domain + port)
- **String-only**: Stores only strings (objects must be JSON.stringify'd)

---

## Why LocalStorage in Sahatak?

### Benefits for Telemedicine Platform
1. **Offline Capability**: User preferences available without server connection
2. **Performance**: Reduced server requests for user data
3. **User Experience**: Instant language switching and preference loading
4. **Session Continuity**: Users remain logged in across browser restarts
5. **Sudan Context**: Works well with intermittent internet connectivity

### Trade-offs Considered
- Security vs Convenience (sensitive data in backend sessions only)
- Storage limits vs Functionality (selective caching strategy)
- Browser compatibility (all modern browsers support localStorage)

---

## LocalStorage Keys and Usage

### User Authentication Keys

**File**: `/frontend/assets/js/main.js`
```javascript
// Set after successful login
localStorage.setItem('sahatak_user_id', response.data.user.id);
localStorage.setItem('sahatak_user_type', response.data.user.user_type);
localStorage.setItem('sahatak_user_email', response.data.user.email);
localStorage.setItem('sahatak_user_name', response.data.user.full_name);
```

| Key | Purpose | Example Value | Set By | Cleared By |
|-----|---------|---------------|--------|------------|
| `sahatak_user_id` | Unique user identifier | "123" | Login process | Logout |
| `sahatak_user_type` | User role (patient/doctor/admin) | "patient" | Login process | Logout |
| `sahatak_user_email` | User's email address | "ahmed@example.com" | Login process | Logout |
| `sahatak_user_name` | User's full name for display | "Ahmed Ali" | Login process | Logout |

### Navigation Keys

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
// Store return URL when redirecting to login
localStorage.setItem('sahatak_return_url', currentHref);
```

| Key | Purpose | Example Value | Set By | Cleared By |
|-----|---------|---------------|--------|------------|
| `sahatak_return_url` | URL to return after login | "/medical/appointments" | Auth guard redirect | After redirect |

### Language Preference

**File**: `/frontend/assets/js/main.js`
```javascript
// Set language preference
localStorage.setItem('sahatak_language', lang);
```

| Key | Purpose | Example Value | Set By | Cleared By |
|-----|---------|---------------|--------|------------|
| `sahatak_language` | User's language preference | "ar" or "en" | Language switcher | Never (persists) |

---

## Session Management

### Login Flow Storage

**File**: `/frontend/assets/js/main.js`
```javascript
async function handleLogin(event) {
    // ... authentication logic ...
    
    // Store user session data
    localStorage.setItem('sahatak_user_type', response.data.user.user_type);
    localStorage.setItem('sahatak_user_email', response.data.user.email);
    localStorage.setItem('sahatak_user_id', response.data.user.id);
    localStorage.setItem('sahatak_user_name', response.data.user.full_name);
    
    // Redirect based on user type
    redirectToDashboard(response.data.user.user_type);
}
```

### Logout Flow Cleanup

**File**: `/frontend/assets/js/main.js`
```javascript
async function logout() {
    // Clear session data
    const keysToRemove = [
        'sahatak_user_type',
        'sahatak_user_email', 
        'sahatak_user_id',
        'sahatak_user_name'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Note: Language preference is preserved
    // localStorage.getItem('sahatak_language') remains
}
```

### Session Verification

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static isAuthenticated() {
    const userId = localStorage.getItem('sahatak_user_id');
    const userType = localStorage.getItem('sahatak_user_type');
    const userEmail = localStorage.getItem('sahatak_user_email');
    
    // User must have ID and type
    return userId && userType && (userEmail || userType);
}
```

---

## Language Preferences

### Language Manager Integration

**File**: `/frontend/assets/js/main.js`
```javascript
const LanguageManager = {
    setLanguage(lang) {
        // Persist language preference
        localStorage.setItem('sahatak_language', lang);
        console.log(`Language set to: ${lang}`);
    },
    
    getLanguage() {
        // Retrieve saved preference
        return localStorage.getItem('sahatak_language') || null;
    },
    
    isFirstVisit() {
        // Check if language has been set before
        return !localStorage.getItem('sahatak_language');
    }
};
```

### Language Persistence Across Sessions

**File**: `/frontend/assets/js/main.js`
```javascript
// On page load, restore language preference
document.addEventListener('DOMContentLoaded', function() {
    const storedLanguage = localStorage.getItem('sahatak_language');
    if (storedLanguage) {
        LanguageManager.applyLanguage(storedLanguage);
    } else {
        // Default to Arabic for new users
        LanguageManager.setLanguage('ar');
    }
});
```

---

## Cache Management

### Cache System Implementation

**File**: `/frontend/assets/js/components/cache.js`
```javascript
class CacheManager {
    constructor() {
        this.cachePrefix = 'sahatak_cache_';
        this.defaultTTL = 300000; // 5 minutes
    }
    
    set(key, data, ttl = this.defaultTTL) {
        const cacheKey = this.cachePrefix + key;
        const entry = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(entry));
    }
    
    get(key) {
        const cacheKey = this.cachePrefix + key;
        const stored = localStorage.getItem(cacheKey);
        
        if (!stored) return null;
        
        const entry = JSON.parse(stored);
        const age = Date.now() - entry.timestamp;
        
        if (age > entry.ttl) {
            // Cache expired
            localStorage.removeItem(cacheKey);
            return null;
        }
        
        return entry.data;
    }
}
```

### Cached Data Types

| Cache Key Pattern | Data Type | TTL | Purpose |
|-------------------|-----------|-----|---------|
| `sahatak_cache_doctors_list` | Doctor profiles | 5 min | Reduce API calls for doctor listings |
| `sahatak_cache_appointments_*` | Appointment data | 2 min | Quick appointment view loading |
| `sahatak_cache_medical_history_*` | Medical records | 10 min | Faster medical history access |
| `sahatak_cache_specialties` | Specialty list | 1 hour | Static data caching |

### Cache Cleanup

**File**: `/frontend/assets/js/components/cache.js`
```javascript
cleanExpiredCache() {
    const keys = Object.keys(localStorage);
    const keysToDelete = [];
    
    keys.forEach(key => {
        if (key.startsWith(this.cachePrefix)) {
            try {
                const entry = JSON.parse(localStorage.getItem(key));
                const age = Date.now() - entry.timestamp;
                
                if (age > entry.ttl) {
                    keysToDelete.push(key);
                }
            } catch (e) {
                keysToDelete.push(key);
            }
        }
    });
    
    keysToDelete.forEach(key => localStorage.removeItem(key));
}
```

---

## Admin Storage

### Admin-Specific Keys

**File**: `/frontend/assets/js/admin.js`
```javascript
// Admin authentication storage
localStorage.setItem('userType', userData.user_type);
localStorage.setItem('adminEmail', userData.email);
localStorage.setItem('adminName', userData.full_name);
localStorage.setItem('adminLoggedIn', 'true');
localStorage.setItem('adminToken', response.token);
```

| Key | Purpose | Security Note |
|-----|---------|---------------|
| `adminLoggedIn` | Admin session flag | Should be validated server-side |
| `adminToken` | Admin auth token | Consider sessionStorage for sensitive tokens |
| `adminEmail` | Admin email | Used for display only |
| `adminName` | Admin name | Used for display only |
| `rememberAdmin` | Remember me preference | Controls session persistence |

### Admin Settings Storage

**File**: `/frontend/assets/js/components/admin.js`
```javascript
// Store admin dashboard settings
function saveSettings(data) {
    localStorage.setItem("settings", JSON.stringify(data));
}

// Retrieve admin settings
function loadSettings() {
    const saved = JSON.parse(localStorage.getItem("settings")) || {};
    return saved;
}
```

---

## Security Considerations

### What NOT to Store in LocalStorage

**Never store these in localStorage:**
1. **Passwords**: Even hashed passwords
2. **Payment Information**: Credit cards, bank details
3. **Medical Records**: Sensitive health data
4. **Personal IDs**: National IDs, passport numbers
5. **API Keys**: Secret keys or tokens
6. **Private Keys**: Encryption or signing keys

### Security Best Practices

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
// Example: Validate localStorage data
static getCurrentUser() {
    if (!this.isAuthenticated()) {
        return null;
    }
    
    // Don't trust localStorage blindly
    const userData = {
        id: localStorage.getItem('sahatak_user_id'),
        userType: localStorage.getItem('sahatak_user_type'),
        email: localStorage.getItem('sahatak_user_email'),
        fullName: localStorage.getItem('sahatak_user_name')
    };
    
    // Validate data integrity
    if (!userData.id || !userData.userType) {
        this.clearAuth();
        return null;
    }
    
    return userData;
}
```

### XSS Prevention

**File**: `/frontend/assets/js/main.js`
```javascript
// Always sanitize data before storing
function storeUserData(userData) {
    // Sanitize user input
    const sanitizedName = DOMPurify.sanitize(userData.full_name);
    localStorage.setItem('sahatak_user_name', sanitizedName);
}

// Always validate when retrieving
function getUserName() {
    const name = localStorage.getItem('sahatak_user_name');
    return name ? DOMPurify.sanitize(name) : '';
}
```

---

## Best Practices

### 1. Namespace Your Keys

**Good Practice:**
```javascript
// Use consistent prefix
localStorage.setItem('sahatak_user_id', userId);
localStorage.setItem('sahatak_language', lang);
localStorage.setItem('sahatak_cache_doctors', data);
```

**Bad Practice:**
```javascript
// Avoid generic keys
localStorage.setItem('id', userId);
localStorage.setItem('lang', lang);
localStorage.setItem('data', data);
```

### 2. Handle Storage Errors

**File**: `/frontend/assets/js/components/cache.js`
```javascript
isStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        // Storage not available (private browsing, quota exceeded)
        console.warn('LocalStorage not available:', e);
        return false;
    }
}
```

### 3. Implement Storage Quota Management

**File**: `/frontend/assets/js/components/cache.js`
```javascript
getStorageSize() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length + key.length;
        }
    }
    return total;
}

// Clear old cache if approaching limit
if (this.getStorageSize() > 4 * 1024 * 1024) { // 4MB
    this.cleanExpiredCache();
}
```

### 4. Version Your Storage Schema

```javascript
// Track storage version for migrations
const STORAGE_VERSION = '1.0.0';

function migrateStorage() {
    const version = localStorage.getItem('sahatak_storage_version');
    
    if (!version) {
        // First time - set version
        localStorage.setItem('sahatak_storage_version', STORAGE_VERSION);
    } else if (version !== STORAGE_VERSION) {
        // Perform migration
        upgradeStorage(version, STORAGE_VERSION);
    }
}
```

### 5. Provide Fallbacks

**File**: `/frontend/assets/js/components/auth-guard.js`
```javascript
static getCurrentUser() {
    try {
        // Try localStorage first
        return {
            id: localStorage.getItem('sahatak_user_id'),
            userType: localStorage.getItem('sahatak_user_type')
        };
    } catch (e) {
        // Fallback to sessionStorage or cookies
        return {
            id: sessionStorage.getItem('sahatak_user_id'),
            userType: sessionStorage.getItem('sahatak_user_type')
        };
    }
}
```

---

## Troubleshooting

### Common Issues

#### 1. "localStorage is not defined"

**Cause**: Server-side rendering or Node.js environment  
**Solution**:
```javascript
if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('key', 'value');
}
```

#### 2. "QuotaExceededError"

**Cause**: Storage limit reached (usually 5-10MB)  
**Solution**:
**File**: `/frontend/assets/js/components/cache.js`
```javascript
try {
    localStorage.setItem(key, value);
} catch (e) {
    if (e.name === 'QuotaExceededError') {
        // Clear old cache
        this.cleanExpiredCache();
        // Try again
        localStorage.setItem(key, value);
    }
}
```

#### 3. "Data not persisting"

**Cause**: Private browsing mode or disabled cookies  
**Solution**:
```javascript
// Detect private browsing
function isPrivateBrowsing() {
    try {
        localStorage.setItem('test', '1');
        localStorage.removeItem('test');
        return false;
    } catch (e) {
        return true;
    }
}

if (isPrivateBrowsing()) {
    alert('Please disable private browsing for full functionality');
}
```

#### 4. "Inconsistent data across tabs"

**Cause**: localStorage doesn't auto-sync complex operations  
**Solution**:
```javascript
// Listen for storage changes from other tabs
window.addEventListener('storage', (e) => {
    if (e.key === 'sahatak_user_id' && !e.newValue) {
        // User logged out in another tab
        window.location.href = '/login';
    }
});
```

### Debug Helper Functions

**File**: `/frontend/assets/js/debug.js`
```javascript
// View all Sahatak localStorage data
function debugStorage() {
    const sahatakData = {};
    for (let key in localStorage) {
        if (key.startsWith('sahatak_')) {
            sahatakData[key] = localStorage.getItem(key);
        }
    }
    console.table(sahatakData);
}

// Clear all Sahatak data
function clearSahatakStorage() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('sahatak_')) {
            localStorage.removeItem(key);
        }
    });
    console.log('Sahatak storage cleared');
}

// Export localStorage for debugging
function exportStorage() {
    const data = {};
    for (let key in localStorage) {
        data[key] = localStorage.getItem(key);
    }
    return JSON.stringify(data, null, 2);
}
```

---

## Storage Lifecycle

### Complete User Journey

```
1. First Visit
   └── No localStorage data
   
2. Language Selection
   └── localStorage.setItem('sahatak_language', 'ar')
   
3. Registration/Login
   ├── localStorage.setItem('sahatak_user_id', '123')
   ├── localStorage.setItem('sahatak_user_type', 'patient')
   ├── localStorage.setItem('sahatak_user_email', 'user@example.com')
   └── localStorage.setItem('sahatak_user_name', 'User Name')
   
4. Using Platform
   ├── Cache API responses (sahatak_cache_*)
   ├── Store preferences
   └── Track navigation state
   
5. Logout
   ├── Remove user data (sahatak_user_*)
   ├── Clear sensitive cache
   └── Preserve language preference
   
6. Return Visit
   └── Language preference retained
```

---

## Summary

LocalStorage in Sahatak provides:

1. **Session Persistence**: Users stay logged in across browser sessions
2. **Performance Optimization**: Cached data reduces API calls
3. **User Preferences**: Language and settings persist
4. **Better UX**: Instant data access without server round-trips
5. **Offline Capability**: Basic functionality without internet
6. **Navigation Context**: Smart redirects after login
7. **Multi-tab Sync**: Consistent state across browser tabs

Remember:
- **Security First**: Never store sensitive data
- **Namespace Keys**: Use 'sahatak_' prefix
- **Handle Errors**: Always try-catch storage operations
- **Clean Up**: Remove expired cache regularly
- **Validate Data**: Don't trust localStorage blindly