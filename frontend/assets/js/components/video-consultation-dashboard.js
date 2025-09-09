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
                
                // Open video consultation in a new window
                const videoUrl = `${window.location.origin}/Sahatak/frontend/pages/appointments/video-consultation.html?appointmentId=${appointmentId}`;
                console.log('Opening video consultation in new window:', videoUrl);
                
                // Use setTimeout to allow UI update to complete first
                setTimeout(() => {
                    const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no';
                    const videoWindow = window.open(videoUrl, `video-consultation-${appointmentId}`, windowFeatures);
                    
                    // Focus the new window
                    if (videoWindow) {
                        videoWindow.focus();
                    } else {
                        // Fallback if popup was blocked
                        console.warn('Video consultation popup was blocked, using current window');
                        window.location.href = videoUrl;
                    }
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
                // Open video consultation in a new window
                const videoUrl = `${window.location.origin}/Sahatak/frontend/pages/appointments/video-consultation.html?appointmentId=${appointmentId}`;
                console.log('Opening video consultation in new window:', videoUrl);
                
                const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,directories=no,status=no';
                const videoWindow = window.open(videoUrl, `video-consultation-${appointmentId}`, windowFeatures);
                
                // Focus the new window
                if (videoWindow) {
                    videoWindow.focus();
                } else {
                    // Fallback if popup was blocked
                    console.warn('Video consultation popup was blocked, using current window');
                    window.location.href = videoUrl;
                }
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
            console.log(`🔍 Checking video session status for appointment ${appointmentId}...`);
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/status`,
                'GET'
            );
            
            console.log(`📡 API Response for appointment ${appointmentId}:`, response);
            
            if (response.success) {
                console.log(`💾 Caching session status for appointment ${appointmentId}:`, response.data);
                this.sessionStatusCache.set(appointmentId, response.data);
                
                console.log(`🔄 Updating UI for appointment ${appointmentId}...`);
                this.updateAppointmentVideoUI(appointmentId, response.data);
                
                return response.data;
            } else {
                console.error(`❌ Session status check failed for appointment ${appointmentId}:`, response.message);
                throw new Error(response.message || 'Failed to check session status');
            }
        } catch (error) {
            console.error(`💥 Session status check error for appointment ${appointmentId}:`, error);
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
        console.log(`🎨 updateAppointmentVideoUI called for appointment ${appointmentId} with data:`, sessionData);
        
        const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (!appointmentCard) {
            console.error(`❌ Could not find appointment card for ID ${appointmentId}`);
            return;
        }
        
        console.log(`🔎 Found appointment card for ${appointmentId}:`, appointmentCard);
        
        // Check if video consultation button already exists
        let existingButton = appointmentCard.querySelector('.video-consultation-btn');
        console.log(`🔍 Existing video button for appointment ${appointmentId}:`, existingButton);
        
        // Only update if there's actually a meaningful change
        const cachedStatus = this.sessionStatusCache.get(appointmentId);
        if (cachedStatus && 
            cachedStatus.session_status === sessionData.session_status &&
            cachedStatus.appointment_status === sessionData.appointment_status) {
            console.log(`⏭️ Skipping UI update for appointment ${appointmentId} - no status change detected`);
            return;
        }
        
        // Add video consultation actions if not present
        let actionsContainer = appointmentCard.querySelector('.video-consultation-actions');
        if (!actionsContainer) {
            console.log(`➕ Creating new video-consultation-actions container for appointment ${appointmentId}`);
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'video-consultation-actions';
            appointmentCard.appendChild(actionsContainer);
        } else {
            console.log(`♻️ Using existing video-consultation-actions container for appointment ${appointmentId}`);
        }
        
        // Preserve existing button content and only add session info
        let existingContent = '';
        if (existingButton) {
            console.log(`💾 Preserving existing button content for appointment ${appointmentId}`);
            existingContent = existingButton.outerHTML;
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
        
        // Combine existing button with session info
        const updatedContent = existingContent + sessionInfo;
        
        console.log(`📝 Setting actions container content for appointment ${appointmentId}:`, updatedContent);
        actionsContainer.innerHTML = updatedContent;
        console.log(`✅ UI update completed for appointment ${appointmentId}`);
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
        console.log('🔄 VideoConsultationDashboard: Running 30-second status check...');
        const videoAppointments = document.querySelectorAll('.appointment-card.video-appointment');
        console.log(`📹 Found ${videoAppointments.length} video appointments to check:`, videoAppointments);
        
        const checkPromises = [];
        
        videoAppointments.forEach((card, index) => {
            const appointmentId = card.dataset.appointmentId;
            const appointmentStatus = card.dataset.appointmentStatus;
            console.log(`📋 Video appointment ${index + 1}: ID=${appointmentId}, Status=${appointmentStatus}`, card);
            
            if (appointmentId) {
                // Only monitor appointments that are in_progress or about to start (confirmed)
                // Skip purely scheduled appointments to reduce unnecessary API calls
                if (appointmentStatus === 'in_progress' || appointmentStatus === 'confirmed') {
                    console.log(`✅ Monitoring appointment ${appointmentId} (status: ${appointmentStatus})`);
                    checkPromises.push(this.checkVideoSessionStatus(appointmentId));
                } else {
                    console.log(`⏭️ Skipping appointment ${appointmentId} monitoring (status: ${appointmentStatus})`);
                }
            }
        });
        
        try {
            console.log(`🚀 Starting ${checkPromises.length} status checks (${videoAppointments.length - checkPromises.length} skipped)...`);
            await Promise.all(checkPromises);
            console.log('✅ All status checks completed');
        } catch (error) {
            console.error('❌ Batch session status check error:', error);
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

// Initialize on DOM ready (only on dashboard pages, not on video consultation page)
document.addEventListener('DOMContentLoaded', () => {
    // Don't initialize on the actual video consultation page
    if (!window.location.pathname.includes('video-consultation.html')) {
        VideoConsultationDashboard.init();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    VideoConsultationDashboard.cleanup();
});