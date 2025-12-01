/**
 * Calendar Sync Manager
 * Handles bidirectional calendar synchronization with Google Calendar and Outlook
 */

const CalendarSync = {
    apiUrl: '/api/calendar-sync',
    syncStatus: {},
    
    /**
     * Initialize calendar sync UI and load status
     */
    async init() {
        console.log('🔄 Initializing Calendar Sync...');
        try {
            // Load sync status
            await this.loadSyncStatus();
            
            // Initialize translations for calendar sync section
            this.translateCalendarSync();
            
            console.log('✅ Calendar Sync initialized');
        } catch (error) {
            console.error('❌ Error initializing Calendar Sync:', error);
        }
    },

    /**
     * Load sync status from backend
     */
    async loadSyncStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/status`, {
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.syncStatus = data.data;
                this.updateUIFromStatus();
            }
        } catch (error) {
            console.error('Error loading sync status:', error);
            // Don't fail silently - show error but continue
        }
    },

    /**
     * Update UI to reflect current sync status
     */
    updateUIFromStatus() {
        const status = this.syncStatus;

        // Update Google Calendar UI
        if (status.google_calendar_id) {
            this.setConnected('google', true, status.google_calendar_id);
        } else {
            this.setConnected('google', false);
        }

        // Update Outlook UI
        if (status.outlook_calendar_id) {
            this.setConnected('outlook', true, status.outlook_calendar_id);
        } else {
            this.setConnected('outlook', false);
        }

        // Update sync status display
        if (status.last_sync_status === 'success' && status.last_sync_timestamp) {
            const lastSync = new Date(status.last_sync_timestamp);
            const timeAgo = this.formatTimeAgo(lastSync);
            document.getElementById('sync-status-text').textContent = `Last synced: ${timeAgo}`;
            document.getElementById('sync-status-container').style.display = 'block';
        }

        // Update sync settings if provider is connected
        if (status.google_calendar_id) {
            document.getElementById('google-sync-direction').value = status.google_sync_direction || 'bidirectional';
            document.getElementById('google-conflict-mode').value = status.google_conflict_mode || 'manual';
        }

        if (status.outlook_calendar_id) {
            document.getElementById('outlook-sync-direction').value = status.outlook_sync_direction || 'bidirectional';
            document.getElementById('outlook-conflict-mode').value = status.outlook_conflict_mode || 'manual';
        }
    },

    /**
     * Set provider as connected/disconnected in UI
     */
    setConnected(provider, connected, calendarId = null) {
        const prefix = provider.toLowerCase();
        const connectBtn = document.getElementById(`${prefix}-connect-btn`);
        const disconnectBtn = document.getElementById(`${prefix}-disconnect-btn`);
        const statusText = document.getElementById(`${prefix}-status-text`);
        const settingsDiv = document.getElementById(`${prefix}-settings`);

        if (connected) {
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-block';
            statusText.textContent = `Connected: ${calendarId}`;
            statusText.className = 'text-success';
            settingsDiv.style.display = 'block';
        } else {
            connectBtn.style.display = 'inline-block';
            disconnectBtn.style.display = 'none';
            statusText.textContent = 'Not connected';
            statusText.className = 'text-muted';
            settingsDiv.style.display = 'none';
        }
    },

    /**
     * Connect to Google Calendar
     */
    async connectGoogle() {
        try {
            const response = await fetch(`${this.apiUrl}/google/auth-url`, {
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.data.auth_url) {
                // Redirect to Google OAuth
                window.location.href = data.data.auth_url;
            } else {
                this.showAlert('Failed to get Google auth URL', 'danger');
            }
        } catch (error) {
            console.error('Error connecting to Google:', error);
            this.showAlert('Error connecting to Google Calendar', 'danger');
        }
    },

    /**
     * Connect to Outlook Calendar
     */
    async connectOutlook() {
        try {
            const response = await fetch(`${this.apiUrl}/outlook/auth-url`, {
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.data.auth_url) {
                // Redirect to Outlook OAuth
                window.location.href = data.data.auth_url;
            } else {
                this.showAlert('Failed to get Outlook auth URL', 'danger');
            }
        } catch (error) {
            console.error('Error connecting to Outlook:', error);
            this.showAlert('Error connecting to Outlook Calendar', 'danger');
        }
    },

    /**
     * Disconnect Google Calendar
     */
    async disconnectGoogle() {
        if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider: 'google' })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.setConnected('google', false);
                this.showAlert('Google Calendar disconnected', 'success');
            } else {
                this.showAlert(data.message || 'Failed to disconnect', 'danger');
            }
        } catch (error) {
            console.error('Error disconnecting Google:', error);
            this.showAlert('Error disconnecting Google Calendar', 'danger');
        }
    },

    /**
     * Disconnect Outlook Calendar
     */
    async disconnectOutlook() {
        if (!confirm('Are you sure you want to disconnect Outlook Calendar?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider: 'outlook' })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.setConnected('outlook', false);
                this.showAlert('Outlook Calendar disconnected', 'success');
            } else {
                this.showAlert(data.message || 'Failed to disconnect', 'danger');
            }
        } catch (error) {
            console.error('Error disconnecting Outlook:', error);
            this.showAlert('Error disconnecting Outlook Calendar', 'danger');
        }
    },

    /**
     * Update sync settings for a provider
     */
    async updateSettings(provider) {
        try {
            const prefix = provider.toLowerCase();
            const syncDirection = document.getElementById(`${prefix}-sync-direction`).value;
            const conflictMode = document.getElementById(`${prefix}-conflict-mode`).value;

            const payload = {
                provider: provider,
                sync_direction: syncDirection,
                conflict_resolution_mode: conflictMode
            };

            const response = await fetch(`${this.apiUrl}/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.showAlert('Settings updated successfully', 'success');
            } else {
                this.showAlert(data.message || 'Failed to update settings', 'danger');
            }
        } catch (error) {
            console.error('Error updating settings:', error);
            this.showAlert('Error updating calendar sync settings', 'danger');
        }
    },

    /**
     * Manually trigger sync for a provider
     */
    async syncNow(provider) {
        try {
            const btn = event.target.closest('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Syncing...';

            const response = await fetch(`${this.apiUrl}/sync-now`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AuthStorage.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ provider: provider })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                await this.loadSyncStatus();
                this.showAlert(`${provider} Calendar synced successfully`, 'success');
            } else {
                this.showAlert(data.message || 'Sync failed', 'danger');
            }
        } catch (error) {
            console.error('Error syncing:', error);
            this.showAlert(`Error syncing ${provider} Calendar`, 'danger');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    /**
     * Apply translations to calendar sync UI
     */
    translateCalendarSync() {
        // Wait for LanguageManager to be ready
        if (typeof LanguageManager === 'undefined') {
            console.warn('LanguageManager not available yet');
            return;
        }

        // Translate all elements with data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = LanguageManager.translate(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });
    },

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.insertBefore(alert, alertContainer.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alert.remove();
        }, 5000);
    },

    /**
     * Format timestamp as relative time (e.g., "2 minutes ago")
     */
    formatTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        
        return date.toLocaleDateString();
    }
};

// Handle OAuth callbacks
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('code')) {
        const provider = urlParams.get('provider');
        const code = urlParams.get('code');
        
        console.log(`OAuth callback received for ${provider}`);
        
        // The backend will handle the callback and redirect back
        // Just reload status after a short delay
        setTimeout(() => {
            if (typeof CalendarSync !== 'undefined') {
                CalendarSync.loadSyncStatus();
            }
        }, 2000);
    }
});
