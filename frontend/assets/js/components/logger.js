/**
 * Production-ready logging utility
 * Handles different log levels and can be configured for production vs development
 */

class Logger {
    constructor() {
        // Get environment from config or default to production
        this.isProduction = window.SAHATAK_ENV === 'production' || 
                           !window.location.hostname.includes('localhost') && 
                           !window.location.hostname.includes('127.0.0.1');
        
        // Log levels: 0=none, 1=error, 2=warn, 3=info, 4=debug
        this.logLevel = this.isProduction ? 1 : 4; // Only errors in production
        
        // Store logs for debugging (max 100 entries)
        this.logHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Internal logging method
     */
    _log(level, levelName, message, data = null) {
        if (level > this.logLevel) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: levelName,
            message,
            data: data ? JSON.stringify(data) : null,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 100) // Truncate for storage
        };

        // Add to history
        this.logHistory.push(logEntry);
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift(); // Remove oldest entry
        }

        // Console output (only if not in production or if it's an error)
        if (!this.isProduction || level <= 1) {
            const consoleMethod = level === 1 ? console.error : 
                                level === 2 ? console.warn : console.log;
            
            if (data) {
                consoleMethod(`[${levelName}] ${timestamp}: ${message}`, data);
            } else {
                consoleMethod(`[${levelName}] ${timestamp}: ${message}`);
            }
        }

        // Send critical errors to server (in production)
        if (this.isProduction && level === 1) {
            this._sendErrorToServer(logEntry);
        }
    }

    /**
     * Send error to server for monitoring
     */
    async _sendErrorToServer(logEntry) {
        try {
            // Only send if we have an API endpoint configured
            if (window.API_BASE_URL && navigator.onLine) {
                await fetch(`${window.API_BASE_URL}/admin/client-errors`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        timestamp: logEntry.timestamp,
                        message: logEntry.message,
                        level: logEntry.level,
                        data: logEntry.data,
                        url: logEntry.url,
                        userAgent: logEntry.userAgent
                    })
                });
            }
        } catch (error) {
            // Silently fail - don't create logging loops
        }
    }

    /**
     * Public logging methods
     */
    error(message, data = null) {
        this._log(1, 'ERROR', message, data);
    }

    warn(message, data = null) {
        this._log(2, 'WARN', message, data);
    }

    info(message, data = null) {
        this._log(3, 'INFO', message, data);
    }

    debug(message, data = null) {
        this._log(4, 'DEBUG', message, data);
    }

    /**
     * API call logging
     */
    apiCall(method, url, status, duration, data = null) {
        const message = `API ${method} ${url} - ${status} (${duration}ms)`;
        if (status >= 400) {
            this.error(message, data);
        } else if (status >= 300) {
            this.warn(message, data);
        } else {
            this.debug(message, data);
        }
    }

    /**
     * Performance measurement
     */
    startTimer(name) {
        if (!this.isProduction) {
            console.time(name);
        }
        return Date.now();
    }

    endTimer(name, startTime) {
        const duration = Date.now() - startTime;
        if (!this.isProduction) {
            console.timeEnd(name);
        }
        this.debug(`Timer ${name}: ${duration}ms`);
        return duration;
    }

    /**
     * Get recent logs for debugging
     */
    getRecentLogs(limit = 50) {
        return this.logHistory.slice(-limit);
    }

    /**
     * Clear log history
     */
    clearHistory() {
        this.logHistory = [];
    }

    /**
     * Set log level dynamically
     */
    setLogLevel(level) {
        this.logLevel = level;
        this.info(`Log level changed to: ${level}`);
    }
}

// Create global logger instance
const logger = new Logger();

// Export for use in other modules
window.SahatakLogger = logger;

// Backward compatibility - replace console methods in development
if (!logger.isProduction) {
    // Keep original console methods for debugging
    window._originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        debug: console.debug
    };
}

// Global error handler
window.addEventListener('error', (event) => {
    logger.error('JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
    });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason && event.reason.stack ? event.reason.stack : null
    });
});

console.log('✅ Sahatak Logger initialized');