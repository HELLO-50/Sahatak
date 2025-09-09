// Video Consultation Dashboard Component - Following existing patterns
const VideoConsultationDashboard = {
    sessionStatusCache: new Map(),
    statusCheckInterval: null,
    
    // Initialize video consultation dashboard features
    init() {
        this.setupEventListeners();
        this.startSessionStatusMonitoring();
    },
    
    // Setup event listeners for video consultation actions
    setupEventListeners() {
        // Delegate event handling to avoid multiple listeners
        document.addEventListener('click', (e) => {
            // Handle video consultation button clicks
            if (e.target.matches('.video-consultation-btn') || e.target.closest('.video-consultation-btn')) {
                const btn = e.target.matches('.video-consultation-btn') ? e.target : e.target.closest('.video-consultation-btn');
                const appointmentId = btn.dataset.appointmentId;
                const action = btn.dataset.action;
                
                if (appointmentId && action) {
                    this.handleVideoConsultationAction(appointmentId, action, btn);
                }
            }
        });
    },
    
    // Handle video consultation button actions
    async handleVideoConsultationAction(appointmentId, action, button) {
        const originalContent = button.innerHTML;
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        try {
            // Show loading state
            this.setButtonLoading(button, isArabic);
            
            switch (action) {
                case 'start':
                    await this.startVideoConsultation(appointmentId);
                    break;
                case 'join':
                    await this.joinVideoConsultation(appointmentId);
                    break;
                case 'check-status':
                    await this.checkVideoSessionStatus(appointmentId);
                    break;
                default:
                    throw new Error('Unknown video consultation action');
            }
            
        } catch (error) {
            console.error('Video consultation action error:', error);
            this.showError(error.message || 'Video consultation action failed');
            
            // Restore button state
            button.innerHTML = originalContent;
            button.disabled = false;
        }
    },
    
    // Start video consultation (doctors only)
    async startVideoConsultation(appointmentId) {
        try {
            console.log('Starting video consultation for appointment:', appointmentId);
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/start`,
                { method: 'POST' }
            );
            
            console.log('Video start response:', response);
            
            if (response && response.success) {
                // Update UI first, then navigate
                console.log('Video session started successfully, updating UI...');
                
                // Refresh the appointment status to update button
                await this.checkVideoSessionStatus(appointmentId);
                
                // Navigate to video consultation page
                const videoUrl = `../../pages/appointments/video-consultation.html?appointmentId=${appointmentId}`;
                console.log('Navigating to:', videoUrl);
                
                // Use setTimeout to allow UI update to complete first
                setTimeout(() => {
                    window.location.href = videoUrl;
                }, 500);
            } else {
                console.error('Response not successful:', response);
                throw new Error(response?.message || 'Failed to start video consultation');
            }
        } catch (error) {
            throw new Error(error.message || 'Failed to start video consultation');
        }
    },
    
    // Join video consultation (patients and doctors)
    async joinVideoConsultation(appointmentId) {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/join`,
                { method: 'POST' }
            );
            
            if (response.success) {
                // Navigate to video consultation page
                const videoUrl = `../../pages/appointments/video-consultation.html?appointmentId=${appointmentId}`;
                window.location.href = videoUrl;
            } else {
                throw new Error(response.message || 'Failed to join video consultation');
            }
        } catch (error) {
            throw new Error(error.message || 'Failed to join video consultation');
        }
    },
    
    // Check video session status
    async checkVideoSessionStatus(appointmentId) {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/status`,
                'GET'
            );
            
            if (response.success) {
                this.sessionStatusCache.set(appointmentId, response.data);
                this.updateAppointmentVideoUI(appointmentId, response.data);
                return response.data;
            } else {
                throw new Error(response.message || 'Failed to check session status');
            }
        } catch (error) {
            console.error('Session status check error:', error);
            return null;
        }
    },
    
    // Generate video consultation button HTML based on appointment and user context
    generateVideoConsultationButton(appointment) {
        if (!appointment || appointment.appointment_type !== 'video') {
            return '';
        }
        
        const userType = AuthGuard?.getCurrentUser()?.user_type || localStorage.getItem('sahatak_user_type');
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        const canStart = appointment.status === 'scheduled' || appointment.status === 'confirmed';
        const isInProgress = appointment.status === 'in_progress';
        
        console.log(`Generating button for appointment ${appointment.id}:`, {
            userType,
            status: appointment.status,
            session_status: appointment.session_status,
            canStart,
            isInProgress
        });
        
        if (!canStart && !isInProgress) {
            console.log(`No button for appointment ${appointment.id} - status: ${appointment.status}`);
            return '';
        }
        
        let buttonConfig = this.getButtonConfig(userType, appointment, isArabic);
        
        return `
            <button class="video-consultation-btn ${buttonConfig.class}" 
                    data-appointment-id="${appointment.id}"
                    data-action="${buttonConfig.action}"
                    title="${buttonConfig.title}"
                    ${buttonConfig.disabled ? 'disabled' : ''}>
                <i class="bi ${buttonConfig.icon}"></i>
                <span>${buttonConfig.text}</span>
            </button>
        `;
    },
    
    // Get button configuration based on user type and appointment status
    getButtonConfig(userType, appointment, isArabic) {
        const isInProgress = appointment.status === 'in_progress';
        
        if (userType === 'doctor') {
            if (isInProgress && appointment.session_status === 'waiting') {
                return {
                    class: 'btn-join-video',
                    action: 'join',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'انضم للاستشارة' : 'Join Consultation',
                    title: isArabic ? 'انضم للاستشارة المرئية' : 'Join Video Consultation',
                    disabled: false
                };
            } else {
                return {
                    class: 'btn-start-video',
                    action: 'start',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'بدء الاستشارة' : 'Start Consultation',
                    title: isArabic ? 'بدء الاستشارة المرئية' : 'Start Video Consultation',
                    disabled: false
                };
            }
        } else {
            // Patient
            if (isInProgress) {
                return {
                    class: 'btn-join-video',
                    action: 'join',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'انضم للاستشارة' : 'Join Consultation',
                    title: isArabic ? 'انضم للاستشارة المرئية' : 'Join Video Consultation',
                    disabled: false
                };
            } else {
                return {
                    class: 'btn-waiting',
                    action: 'check-status',
                    icon: 'bi-clock',
                    text: isArabic ? 'انتظار الطبيب' : 'Waiting for Doctor',
                    title: isArabic ? 'في انتظار بدء الطبيب للجلسة' : 'Waiting for doctor to start session',
                    disabled: true
                };
            }
        }
    },
    
    // Generate session status indicator HTML
    generateSessionStatusIndicator(sessionStatus, isArabic) {
        if (!sessionStatus) return '';
        
        const statusConfig = {
            waiting: {
                class: 'session-status-waiting',
                icon: 'bi-clock',
                text: isArabic ? 'في الانتظار' : 'Waiting'
            },
            connecting: {
                class: 'session-status-connecting',
                icon: 'bi-arrow-repeat',
                text: isArabic ? 'جاري الاتصال' : 'Connecting'
            },
            active: {
                class: 'session-status-active',
                icon: 'bi-record-circle',
                text: isArabic ? 'جلسة نشطة' : 'Active Session'
            },
            ended: {
                class: 'session-status-ended',
                icon: 'bi-check-circle',
                text: isArabic ? 'انتهت الجلسة' : 'Session Ended'
            }
        };
        
        const config = statusConfig[sessionStatus] || statusConfig.waiting;
        
        return `
            <span class="session-status-indicator ${config.class}">
                <i class="bi ${config.icon}"></i>
                <span>${config.text}</span>
            </span>
        `;
    },
    
    // Update appointment card with video consultation UI elements
    updateAppointmentVideoUI(appointmentId, sessionData) {
        const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (!appointmentCard) return;
        
        // Add video consultation actions if not present
        let actionsContainer = appointmentCard.querySelector('.video-consultation-actions');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'video-consultation-actions';
            appointmentCard.appendChild(actionsContainer);
        }
        
        // Update session info
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        let sessionInfo = '';
        if (sessionData.session_started_at) {
            const duration = this.calculateSessionDuration(sessionData.session_started_at, sessionData.session_duration);
            sessionInfo = `
                <div class="video-session-info">
                    <div class="video-session-duration">
                        <i class="bi bi-clock"></i>
                        <span>${duration}</span>
                    </div>
                    ${this.generateSessionStatusIndicator(sessionData.session_status, isArabic)}
                </div>
            `;
        }
        
        actionsContainer.innerHTML = sessionInfo;
    },
    
    // Calculate session duration display
    calculateSessionDuration(startTime, totalDuration) {
        if (totalDuration) {
            // Session ended, show total duration
            const minutes = Math.floor(totalDuration / 60);
            const seconds = totalDuration % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else if (startTime) {
            // Session ongoing, calculate current duration
            const start = new Date(startTime);
            const now = new Date();
            const diffSeconds = Math.floor((now - start) / 1000);
            const minutes = Math.floor(diffSeconds / 60);
            const seconds = diffSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return '0:00';
    },
    
    // Start monitoring session status for active video appointments
    startSessionStatusMonitoring() {
        // Check every 30 seconds for active video sessions
        this.statusCheckInterval = setInterval(() => {
            this.checkActiveVideoSessions();
        }, 30000);
    },
    
    // Check status for all active video sessions
    async checkActiveVideoSessions() {
        const videoAppointments = document.querySelectorAll('.appointment-card.video-appointment');
        const checkPromises = [];
        
        videoAppointments.forEach(card => {
            const appointmentId = card.dataset.appointmentId;
            if (appointmentId) {
                checkPromises.push(this.checkVideoSessionStatus(appointmentId));
            }
        });
        
        try {
            await Promise.all(checkPromises);
        } catch (error) {
            console.error('Batch session status check error:', error);
        }
    },
    
    // Set button loading state
    setButtonLoading(button, isArabic) {
        button.disabled = true;
        button.innerHTML = `
            <div class="video-loading">
                <div class="spinner-border" role="status"></div>
                <span>${isArabic ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
        `;
    },
    
    // Show error message using existing notification system
    showError(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            // Fallback to console
            console.error('Video consultation error:', message);
        }
    },
    
    // Show success message using existing notification system
    showSuccess(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            // Fallback to console
            console.log('Video consultation success:', message);
        }
    },
    
    // Cleanup method
    cleanup() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        this.sessionStatusCache.clear();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    VideoConsultationDashboard.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    VideoConsultationDashboard.cleanup();
});