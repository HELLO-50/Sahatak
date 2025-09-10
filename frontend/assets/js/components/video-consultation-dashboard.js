// Video Consultation Dashboard Component - Following existing patterns
const VideoConsultationDashboard = {
    sessionStatusCache: new Map(),
    statusCheckInterval: null,
    
    // Initialize video consultation dashboard features
    init() {
        // Check for any pending video session ends from emergency handlers
        this.checkEmergencySessionEnds();
        
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
                case 'restart':
                    // Restart is same as start for doctor
                    await this.startVideoConsultation(appointmentId);
                    break;
                case 'join':
                    await this.joinVideoConsultation(appointmentId);
                    break;
                case 'check-status':
                    // Show feedback to user that we're checking
                    const checkingMessage = isArabic 
                        ? 'جاري التحقق من حالة الجلسة...'
                        : 'Checking session status...';
                    this.showInfo(checkingMessage);
                    
                    await this.checkVideoSessionStatus(appointmentId);
                    break;
                case 'complete-consultation':
                    await this.completeConsultationFromDashboard(appointmentId);
                    break;
                case 'wait-restart':
                    // Patient waiting for doctor to restart - refresh status and show message
                    const statusMessage = isArabic 
                        ? 'المكالمة المرئية انتهت. في انتظار الطبيب لبدء جلسة جديدة...'
                        : 'Video call ended. Waiting for doctor to start a new session...';
                    
                    this.showInfo(statusMessage);
                    
                    // Force refresh appointment status after 2 seconds
                    setTimeout(async () => {
                        try {
                            await this.checkVideoSessionStatus(appointmentId);
                            // Also refresh dashboard if function exists
                            if (typeof loadDashboardStats === 'function') {
                                loadDashboardStats();
                            }
                        } catch (error) {
                            console.warn('Failed to refresh appointment status:', error);
                        }
                    }, 2000);
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
            
            // Log detailed response data for debugging
            if (response && response.data) {
                console.log('🔍 Video start response data:', {
                    appointment_id: response.data.appointment_id,
                    session_status: response.data.session_status,
                    appointment_status: response.data.appointment_status,
                    session_started_at: response.data.session_started_at,
                    session_id: response.data.session_id
                });
            }
            
            if (response && response.success) {
                // Update UI first, then navigate
                console.log('Video session started successfully, updating UI...');
                
                // Refresh the appointment status to update button with force refresh
                await this.checkVideoSessionStatus(appointmentId, true);
                
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
    
    // Complete consultation from dashboard (doctors only)
    async completeConsultationFromDashboard(appointmentId) {
        try {
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            const confirmMessage = isArabic 
                ? 'هل أنت متأكد من أنك تريد إنهاء هذه الاستشارة؟ لن يكون بإمكانك التراجع عن هذا الإجراء.'
                : 'Are you sure you want to complete this consultation? This action cannot be undone.';
            
            if (!confirm(confirmMessage)) {
                return;
            }
            
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/complete`,
                { method: 'POST' }
            );
            
            if (response.success) {
                // Show success message
                const successMessage = isArabic 
                    ? 'تم إنهاء الاستشارة بنجاح'
                    : 'Consultation completed successfully';
                
                this.showSuccess(successMessage);
                
                // Clear caches and refresh dashboard
                this.sessionStatusCache.delete(appointmentId);
                
                // Clear all appointment-related cache to ensure fresh data
                if (window.SahatakCache) {
                    window.SahatakCache.clearByType('appointments_list');
                    window.SahatakCache.clearByType('dashboard_stats');
                    // Clear all cache as extra measure
                    window.SahatakCache.clear();
                    console.log('🗑️ Cleared all cache after appointment completion');
                }
                
                // Remove appointment from dashboard or refresh stats
                const appointmentCard = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
                if (appointmentCard) {
                    appointmentCard.style.animation = 'fadeOut 0.5s ease-out';
                    setTimeout(() => {
                        appointmentCard.remove();
                        // Refresh dashboard statistics immediately
                        if (typeof refreshDoctorDashboardStats === 'function') {
                            refreshDoctorDashboardStats();
                        }
                        // Also refresh video consultation dashboard
                        this.refreshVideoConsultationData();
                    }, 500);
                } else {
                    // If no card found, still refresh data
                    if (typeof refreshDoctorDashboardStats === 'function') {
                        refreshDoctorDashboardStats();
                    }
                    this.refreshVideoConsultationData();
                }
            } else {
                throw new Error(response.message || 'Failed to complete consultation');
            }
        } catch (error) {
            console.error('Error completing consultation from dashboard:', error);
            throw new Error(error.message || 'Failed to complete consultation');
        }
    },
    
    // Check video session status with enhanced synchronization
    async checkVideoSessionStatus(appointmentId, forceRefresh = false) {
        try {
            console.log(`🔍 Checking video session status for appointment ${appointmentId}...`);
            
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/status`,
                'GET'
            );
            
            if (response.success) {
                console.log(`✅ Session status response for appointment ${appointmentId}:`, response.data);
                
                this.sessionStatusCache.set(appointmentId, response.data);
                this.updateAppointmentVideoUI(appointmentId, response.data);
                
                // Force refresh dashboard if requested
                if (forceRefresh && typeof loadDashboardStats === 'function') {
                    console.log(`🔄 Force refreshing dashboard stats...`);
                    setTimeout(() => loadDashboardStats(), 500);
                }
                
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
        
        if (!buttonConfig) {
            return ''; // No button for completed appointments
        }
        
        // Handle dual buttons for doctor when session ended but appointment in progress
        if (buttonConfig.isDual) {
            return `
                <div class="video-consultation-buttons d-flex gap-2">
                    <button class="video-consultation-btn ${buttonConfig.button1.class}" 
                            data-appointment-id="${appointment.id}"
                            data-action="${buttonConfig.button1.action}"
                            title="${buttonConfig.button1.title}"
                            ${buttonConfig.button1.disabled ? 'disabled' : ''}>
                        <i class="bi ${buttonConfig.button1.icon}"></i>
                        <span>${buttonConfig.button1.text}</span>
                    </button>
                    <button class="video-consultation-btn ${buttonConfig.button2.class}" 
                            data-appointment-id="${appointment.id}"
                            data-action="${buttonConfig.button2.action}"
                            title="${buttonConfig.button2.title}"
                            ${buttonConfig.button2.disabled ? 'disabled' : ''}>
                        <i class="bi ${buttonConfig.button2.icon}"></i>
                        <span>${buttonConfig.button2.text}</span>
                    </button>
                </div>
            `;
        }
        
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
    
    // Check for emergency session end flags from video consultation page
    checkEmergencySessionEnds() {
        try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('sahatak_video_ended_'));
            
            if (keys.length > 0) {
                console.log('🔄 Found emergency session end flags:', keys);
                
                // Clear the flags and trigger status refresh
                keys.forEach(key => {
                    const appointmentId = key.replace('sahatak_video_ended_', '');
                    console.log('🔄 Processing emergency session end for appointment:', appointmentId);
                    localStorage.removeItem(key);
                });
                
                // Force a complete dashboard refresh
                setTimeout(() => {
                    console.log('🔄 Refreshing dashboard after emergency session ends');
                    this.checkAllAppointmentStatuses();
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking emergency session ends:', error);
        }
    },
    
    // Get button configuration based on user type and appointment status
    getButtonConfig(userType, appointment, isArabic) {
        const isScheduled = appointment.status === 'scheduled' || appointment.status === 'confirmed';
        const isInProgress = appointment.status === 'in_progress';
        const isCompleted = appointment.status === 'completed';
        
        // Session states (expanded to handle more cases)
        const sessionActive = appointment.session_status === 'active' || 
                            appointment.session_status === 'in_call' ||
                            appointment.session_status === 'waiting_patient' ||
                            appointment.session_status === 'waiting' ||
                            (appointment.session_started_at && !appointment.session_status);
        const sessionEnded = appointment.session_status === 'ended' || 
                            appointment.session_status === 'disconnected';
        
        // Debug logging for troubleshooting
        console.log(`🔍 Button config debug for ${userType}:`, {
            appointmentId: appointment.id,
            status: appointment.status,
            session_status: appointment.session_status,
            session_started_at: appointment.session_started_at,
            isScheduled,
            isInProgress,
            sessionActive,
            sessionEnded,
            // Additional debug info
            sessionActiveReasons: {
                session_status_active: appointment.session_status === 'active',
                session_status_in_call: appointment.session_status === 'in_call',
                session_status_waiting_patient: appointment.session_status === 'waiting_patient',
                session_status_waiting: appointment.session_status === 'waiting',
                has_session_started_but_no_status: appointment.session_started_at && !appointment.session_status
            }
        });
        
        if (userType === 'doctor') {
            // Doctor button logic
            if (isScheduled && !appointment.session_started_at) {
                // Scheduled, not started yet - show Start Consultation
                return {
                    class: 'btn-start-video',
                    action: 'start',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'بدء الاستشارة' : 'Start Consultation',
                    title: isArabic ? 'بدء الاستشارة المرئية' : 'Start Video Consultation',
                    disabled: false
                };
            } else if (isInProgress && sessionActive) {
                // In progress, session active - show Call in Session
                return {
                    class: 'btn-in-session',
                    action: 'join',
                    icon: 'bi-camera-video-fill',
                    text: isArabic ? 'الجلسة نشطة' : 'Call in Session',
                    title: isArabic ? 'الجلسة المرئية نشطة - انضم مرة أخرى' : 'Video session active - rejoin',
                    disabled: false
                };
            } else if (isInProgress && sessionEnded) {
                // In progress but session ended - show both In Session (disabled) and Complete button
                // Return special marker for dual buttons
                return {
                    class: 'dual-buttons',
                    isDual: true,
                    button1: {
                        class: 'btn-session-ended',
                        action: 'restart',
                        icon: 'bi-camera-video',
                        text: isArabic ? 'إعادة بدء الجلسة' : 'Restart Session',
                        title: isArabic ? 'إعادة بدء الجلسة المرئية' : 'Restart video session',
                        disabled: false
                    },
                    button2: {
                        class: 'btn-complete-consultation',
                        action: 'complete-consultation',
                        icon: 'bi-check-circle',
                        text: isArabic ? 'إنهاء الاستشارة' : 'Complete Consultation',
                        title: isArabic ? 'إنهاء الاستشارة ووضع علامة كمكتملة' : 'Complete consultation and mark as finished',
                        disabled: false
                    }
                };
            } else if (isCompleted) {
                // Completed - no button
                return null;
            } else {
                // Default to start
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
            // Patient button logic
            if (sessionActive && (isScheduled || isInProgress)) {
                // Session is active (doctor has started) - show Join Consultation
                console.log(`✅ Patient can join - sessionActive: ${sessionActive}`);
                return {
                    class: 'btn-join-video',
                    action: 'join',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'انضم للاستشارة' : 'Join Consultation',
                    title: isArabic ? 'انضم للاستشارة المرئية' : 'Join Video Consultation',
                    disabled: false
                };
            } else if (isInProgress && appointment.session_started_at && !sessionEnded) {
                // Doctor has started session (in_progress + session_started_at) - allow join even if session_status unclear
                console.log(`✅ Patient can join - inProgress with session_started_at: ${appointment.session_started_at}`);
                return {
                    class: 'btn-join-video',
                    action: 'join',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'انضم للاستشارة' : 'Join Consultation',
                    title: isArabic ? 'انضم للاستشارة المرئية' : 'Join Video Consultation',
                    disabled: false
                };
            } else if (isInProgress && !sessionEnded) {
                // Fallback: If appointment is in_progress and not ended, allow join (more permissive)
                console.log(`🔄 Patient fallback join - appointment in progress, assuming doctor started`);
                return {
                    class: 'btn-join-video',
                    action: 'join',
                    icon: 'bi-camera-video',
                    text: isArabic ? 'انضم للاستشارة' : 'Join Consultation',
                    title: isArabic ? 'انضم للاستشارة المرئية' : 'Join Video Consultation',
                    disabled: false
                };
            } else if (isScheduled && !sessionActive) {
                // Scheduled but session not started - show Waiting for Doctor
                return {
                    class: 'btn-waiting',
                    action: 'check-status',
                    icon: 'bi-clock',
                    text: isArabic ? 'انتظار الطبيب' : 'Waiting for Doctor to Join',
                    title: isArabic ? 'في انتظار بدء الطبيب للجلسة' : 'Waiting for doctor to start session',
                    disabled: true
                };
            } else if (isInProgress && !sessionActive && !appointment.session_started_at) {
                // In progress but no session started yet - show waiting
                return {
                    class: 'btn-waiting',
                    action: 'check-status',
                    icon: 'bi-clock',
                    text: isArabic ? 'انتظار الطبيب' : 'Waiting for Doctor',
                    title: isArabic ? 'في انتظار بدء الطبيب للجلسة' : 'Waiting for doctor to start session',
                    disabled: true
                };
            } else if (isInProgress && sessionEnded) {
                // In progress but session ended - show Waiting for Doctor
                return {
                    class: 'btn-waiting-restart',
                    action: 'wait-restart',
                    icon: 'bi-clock-history',
                    text: isArabic ? 'في انتظار الطبيب' : 'Waiting for Doctor',
                    title: isArabic ? 'الجلسة انتهت - في انتظار الطبيب' : 'Session ended - waiting for doctor',
                    disabled: true
                };
            } else if (isCompleted) {
                // Completed - no button or show completed status
                return null;
            } else {
                // Default waiting state
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
        if (!appointmentCard) {
            console.error(`❌ Could not find appointment card for ID ${appointmentId}`);
            return;
        }
        
        // Check if video consultation button already exists
        let existingButton = appointmentCard.querySelector('.video-consultation-btn');
        
        // Check for truly inconsistent state that needs fixing
        // Only force reset if the session has been waiting for too long (over 5 minutes)
        const needsStatusFix = sessionData.appointment_status === 'in_progress' && 
                              sessionData.session_status === 'waiting' && 
                              sessionData.session_started_at &&
                              (new Date() - new Date(sessionData.session_started_at)) > 5 * 60 * 1000; // 5 minutes
        
        if (needsStatusFix) {
            console.log(`🚨 Found inconsistent state for appointment ${appointmentId} - session waiting for over 5 minutes, forcing status reset`);
            // Force call to video/end endpoint to reset status
            this.forceSessionEnd(appointmentId);
        }
        
        // Only update if there's actually a meaningful change
        const cachedStatus = this.sessionStatusCache.get(appointmentId);
        if (cachedStatus && 
            cachedStatus.session_status === sessionData.session_status &&
            cachedStatus.appointment_status === sessionData.appointment_status &&
            !needsStatusFix) {
            return; // Skip UI update silently
        }
        
        // Add video consultation actions if not present
        let actionsContainer = appointmentCard.querySelector('.video-consultation-actions');
        if (!actionsContainer) {
            actionsContainer = document.createElement('div');
            actionsContainer.className = 'video-consultation-actions';
            appointmentCard.appendChild(actionsContainer);
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
        if (totalDuration && totalDuration > 0) {
            // Session ended, show total duration
            const minutes = Math.floor(totalDuration / 60);
            const seconds = totalDuration % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else if (startTime) {
            // Session ongoing, calculate current duration
            const start = new Date(startTime);
            const now = new Date();
            
            // Validate date parsing
            if (isNaN(start.getTime())) {
                console.warn('Invalid start time for session duration:', startTime);
                return '0:00';
            }
            
            const diffSeconds = Math.floor((now - start) / 1000);
            
            // Ensure non-negative duration
            if (diffSeconds < 0) {
                console.warn('Negative duration detected, showing 0:00');
                return '0:00';
            }
            
            const minutes = Math.floor(diffSeconds / 60);
            const seconds = diffSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        return '0:00';
    },
    
    // Force session end for appointments in inconsistent state
    async forceSessionEnd(appointmentId) {
        try {
            console.log(`🚨 Forcing session end for appointment ${appointmentId}`);
            
            const response = await ApiHelper.makeRequest(
                `/appointments/${appointmentId}/video/end`,
                { method: 'POST' }
            );
            
            console.log(`✅ Forced session end successful for appointment ${appointmentId}:`, response);
            
            // Trigger status refresh after a short delay
            setTimeout(() => {
                console.log(`🔄 Refreshing status after forced session end for appointment ${appointmentId}`);
                this.checkVideoSessionStatus(appointmentId);
            }, 1000);
            
        } catch (error) {
            console.error(`❌ Failed to force session end for appointment ${appointmentId}:`, error);
        }
    },
    
    // Start monitoring session status for active video appointments
    startSessionStatusMonitoring() {
        // Check every 10 seconds for active video sessions (faster for better UX)
        this.statusCheckInterval = setInterval(() => {
            this.checkActiveVideoSessions();
        }, 10000);
    },
    
    // Check status for all active video sessions
    async checkActiveVideoSessions() {
        const videoAppointments = document.querySelectorAll('.appointment-card.video-appointment');
        const checkPromises = [];
        
        videoAppointments.forEach((card) => {
            const appointmentId = card.dataset.appointmentId;
            const appointmentStatus = card.dataset.appointmentStatus;
            
            if (appointmentId) {
                // Only monitor appointments that are in_progress or about to start (confirmed)
                // Skip purely scheduled appointments to reduce unnecessary API calls
                if (appointmentStatus === 'in_progress' || appointmentStatus === 'confirmed') {
                    checkPromises.push(this.checkVideoSessionStatus(appointmentId));
                }
            }
        });
        
        // Only log if there are active sessions to check
        if (checkPromises.length > 0) {
            console.log(`🔄 VideoConsultationDashboard: Checking ${checkPromises.length} active video sessions`);
        }
        
        try {
            await Promise.all(checkPromises);
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
    
    // Show info message using existing notification system
    showInfo(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'info');
        } else {
            // Fallback to console
            console.log('Video consultation info:', message);
        }
    },
    
    // Refresh video consultation dashboard data
    refreshVideoConsultationData() {
        // Clear caches
        this.sessionStatusCache.clear();
        
        // Trigger re-initialization or data refresh
        setTimeout(() => {
            this.init();
        }, 100);
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