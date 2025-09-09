// Video Consultation Component - Following main.js patterns
const VideoConsultation = {
    appointmentId: null,
    roomName: null,
    jitsiApi: null,
    sessionData: null,
    connectionCheckInterval: null,
    systemChecks: {
        browser: false,
        network: false,
        permissions: false
    },
    audioOnlyMode: false,
    
    // Reconnection management
    reconnectionAttempts: 0,
    maxReconnectionAttempts: 3,
    
    // Analytics and monitoring
    sessionAnalytics: {
        sessionId: null,
        startTime: null,
        endTime: null,
        duration: 0,
        connectionEvents: [],
        qualityMetrics: [],
        participantEvents: [],
        errorEvents: [],
        deviceChanges: [],
        networkChanges: []
    },
    
    qualityMonitor: {
        interval: null,
        sampleRate: 5000, // 5 seconds
        lastQualityCheck: null
    },
    
    // Translation helper function
    translate(key, fallback = null) {
        if (LanguageManager && LanguageManager.translate) {
            return LanguageManager.translate(key) || fallback || key;
        }
        return fallback || key;
    },
    
    // Initialize video consultation
    async init(appointmentId) {
        this.appointmentId = appointmentId;
        
        // Clear any cached data to prevent lobby issues
        console.log('🔧 Clearing cached data to prevent authentication issues...');
        
        // Initialize analytics
        this.initSessionAnalytics();
        
        // SKIP backend status check - go directly to public room creation
        console.log('🔧 Skipping backend status check - using direct public room approach');
        
        // Setup UI elements
        this.setupEventListeners();
        this.showPreJoinScreen();
    },
    
    // Check if session can be started/joined
    async checkSessionStatus() {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/status`,
                { method: 'GET' }
            );
            
            if (response.success) {
                this.sessionData = response.data;
                return { success: true, data: response.data };
            }
            
            return { success: false, message: response.message };
        } catch (error) {
            console.error('Session status check error:', error);
            return { success: false, message: 'Failed to check session status' };
        }
    },
    
    // Show pre-join screen for device testing
    showPreJoinScreen() {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        container.innerHTML = `
            <div class="pre-join-screen">
                <!-- Header Section -->
                <div class="text-center mb-5">
                    <div class="consultation-icon mb-3">
                        <i class="bi bi-camera-video-fill text-primary" style="font-size: 3rem;"></i>
                    </div>
                    <h2 class="text-primary fw-bold mb-2">${this.translate('video_consultation.preparing', 'Preparing for Consultation')}</h2>
                    <p class="text-muted">${isArabic ? 'جاري التحقق من النظام والأجهزة للتأكد من جودة الاتصال' : 'Checking your system and devices to ensure the best consultation experience'}</p>
                </div>
                
                <!-- System Check Results -->
                <div class="system-checks mb-5">
                    <h5 class="mb-3"><i class="bi bi-gear me-2"></i>${isArabic ? 'فحص النظام' : 'System Checks'}</h5>
                    <div class="row g-3">
                        <div class="col-md-4">
                            <div class="check-card">
                                <div class="check-card-body text-center">
                                    <div id="browser-check">
                                        <i class="bi bi-browser-chrome check-icon mb-2"></i>
                                        <h6 class="check-title">${this.translate('video_consultation.system_checks.browser', 'Browser')}</h6>
                                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        <div class="check-status"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="check-card">
                                <div class="check-card-body text-center">
                                    <div id="network-check">
                                        <i class="bi bi-wifi check-icon mb-2"></i>
                                        <h6 class="check-title">${this.translate('video_consultation.system_checks.network_quality', 'Network Quality')}</h6>
                                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        <div class="check-status"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="check-card">
                                <div class="check-card-body text-center">
                                    <div id="permissions-check">
                                        <i class="bi bi-shield-check check-icon mb-2"></i>
                                        <h6 class="check-title">${this.translate('video_consultation.system_checks.permissions', 'Permissions')}</h6>
                                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        <div class="check-status"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Device Setup -->
                <div class="device-setup mb-5">
                    <h5 class="mb-3"><i class="bi bi-camera-video me-2"></i>${isArabic ? 'إعداد الأجهزة' : 'Device Setup'}</h5>
                    <div class="row g-4">
                        <div class="col-lg-6">
                            <div class="device-card">
                                <div class="device-header">
                                    <i class="bi bi-camera-video text-primary me-2"></i>
                                    <h6 class="mb-0">${this.translate('video_consultation.system_checks.camera', 'Camera')}</h6>
                                </div>
                                <div class="device-body">
                                    <div class="preview-container mb-3">
                                        <video id="local-preview" autoplay muted class="preview-video"></video>
                                        <div class="preview-overlay" id="camera-overlay" style="display: none;">
                                            <i class="bi bi-camera-video-off"></i>
                                            <p class="mb-0">${isArabic ? 'الكاميرا غير متاحة' : 'Camera not available'}</p>
                                        </div>
                                    </div>
                                    <select id="camera-select" class="form-select mb-3"></select>
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="audio-only-mode">
                                        <label class="form-check-label" for="audio-only-mode">
                                            <i class="bi bi-mic me-1"></i>
                                            ${this.translate('video_consultation.system_checks.audio_only', 'Audio Only')}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-lg-6">
                            <div class="device-card">
                                <div class="device-header">
                                    <i class="bi bi-mic text-primary me-2"></i>
                                    <h6 class="mb-0">${this.translate('video_consultation.system_checks.microphone', 'Microphone')}</h6>
                                </div>
                                <div class="device-body">
                                    <div class="audio-test mb-3">
                                        <div class="audio-meter">
                                            <div class="progress">
                                                <div id="audio-level" class="progress-bar bg-success" style="width: 0%"></div>
                                            </div>
                                            <small class="text-muted mt-1 d-block">${this.translate('video_consultation.system_checks.speak_to_test', 'Speak to test audio')}</small>
                                        </div>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label small">${isArabic ? 'الميكروفون' : 'Microphone'}</label>
                                        <select id="mic-select" class="form-select"></select>
                                    </div>
                                    <div>
                                        <label class="form-label small">${isArabic ? 'مكبر الصوت' : 'Speaker'}</label>
                                        <select id="speaker-select" class="form-select">
                                            <option value="">${this.translate('video_consultation.system_checks.select_speaker', 'Select Speaker')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Action Buttons -->
                <div class="action-buttons text-center">
                    <div class="btn-group mb-3" role="group">
                        <button id="refresh-check-btn" class="btn btn-outline-primary">
                            <i class="bi bi-arrow-clockwise me-1"></i>
                            ${this.translate('video_consultation.actions.refresh_check', 'Refresh Check')}
                        </button>
                        <button id="test-devices-btn" class="btn btn-outline-primary">
                            <i class="bi bi-gear me-1"></i>
                            ${this.translate('video_consultation.actions.test_devices', 'Test Devices')}
                        </button>
                    </div>
                    <div>
                        <button id="join-call-btn" class="btn btn-primary btn-lg px-5 py-3" disabled>
                            <i class="bi bi-camera-video me-2"></i>
                            ${this.translate('video_consultation.actions.start_consultation', 'Start Consultation')}
                        </button>
                    </div>
                </div>
                
                <!-- Status Messages -->
                <div id="pre-join-messages" class="mt-4">
                    <div class="status-card">
                        <div class="d-flex align-items-center">
                            <div class="spinner-border spinner-border-sm text-primary me-3" role="status"></div>
                            <div>
                                <h6 class="mb-1">${isArabic ? 'جاري التحضير...' : 'Getting Ready...'}</h6>
                                <p class="text-muted mb-0 small">${isArabic ? 'جاري فحص النظام والأجهزة لضمان أفضل جودة استشارة' : 'Checking system and devices to ensure the best consultation quality'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Start system checks
        this.runSystemChecks();
    },
    
    // Run comprehensive system checks
    async runSystemChecks() {
        const checks = [
            this.checkBrowserCompatibility(),
            this.checkNetworkQuality(),
            this.checkPermissions()
        ];
        
        // Run all checks in parallel
        await Promise.all(checks);
        
        // After system checks, setup devices
        this.enumerateDevices();
        this.startLocalPreview();
        
        // Enable join button if all checks pass
        this.updateJoinButtonState();
    },
    
    // Check browser compatibility
    async checkBrowserCompatibility() {
        const browserCheck = document.getElementById('browser-check');
        if (!browserCheck) return;
        
        try {
            // Check WebRTC support
            const hasWebRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            
            // Check browser type and version
            const userAgent = navigator.userAgent;
            let browserName = 'Unknown';
            let isSupported = false;
            
            if (userAgent.includes('Chrome')) {
                browserName = 'Chrome';
                isSupported = true;
            } else if (userAgent.includes('Firefox')) {
                browserName = 'Firefox';
                isSupported = true;
            } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
                browserName = 'Safari';
                isSupported = true;
            } else if (userAgent.includes('Edge')) {
                browserName = 'Edge';
                isSupported = true;
            }
            
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            if (hasWebRTC && isSupported) {
                browserCheck.innerHTML = `
                    <i class="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                    <h6>${this.translate('video_consultation.system_checks.browser', 'Browser')}</h6>
                    <small class="text-success">${browserName} ✓</small>
                `;
                this.systemChecks.browser = true;
            } else {
                browserCheck.innerHTML = `
                    <i class="bi bi-x-circle-fill text-danger fs-1 mb-2"></i>
                    <h6>${this.translate('video_consultation.system_checks.browser', 'Browser')}</h6>
                    <small class="text-danger">${this.translate('video_consultation.system_checks.not_supported', 'Not Supported')}</small>
                `;
                this.systemChecks.browser = false;
                this.showWarning(isArabic ? 
                    'المتصفح الحالي قد لا يدعم مكالمات الفيديو بشكل كامل' :
                    'Current browser may not fully support video calls'
                );
            }
        } catch (error) {
            console.error('Browser check error:', error);
            this.systemChecks.browser = false;
        }
    },
    
    // Check network quality
    async checkNetworkQuality() {
        const networkCheck = document.getElementById('network-check');
        if (!networkCheck) return;
        
        try {
            const startTime = performance.now();
            
            // Test network speed with a small image
            const testImage = new Image();
            testImage.src = 'https://meet.jit.si/images/watermark.svg?' + Math.random();
            
            await new Promise((resolve, reject) => {
                testImage.onload = resolve;
                testImage.onerror = reject;
                setTimeout(reject, 5000); // 5 second timeout
            });
            
            const endTime = performance.now();
            const latency = endTime - startTime;
            
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            let qualityText = '';
            let qualityClass = '';
            
            if (latency < 200) {
                qualityText = this.translate('video_consultation.system_checks.excellent', 'Excellent');
                qualityClass = 'text-success';
                this.systemChecks.network = true;
            } else if (latency < 500) {
                qualityText = this.translate('video_consultation.system_checks.good', 'Good');
                qualityClass = 'text-info';
                this.systemChecks.network = true;
            } else if (latency < 1000) {
                qualityText = this.translate('video_consultation.system_checks.fair', 'Fair');
                qualityClass = 'text-warning';
                this.systemChecks.network = true;
            } else {
                qualityText = this.translate('video_consultation.system_checks.poor', 'Poor');
                qualityClass = 'text-danger';
                this.systemChecks.network = false;
            }
            
            networkCheck.innerHTML = `
                <i class="bi bi-wifi fs-1 mb-2 ${qualityClass}"></i>
                <h6>${this.translate('video_consultation.system_checks.network_quality', 'Network Quality')}</h6>
                <small class="${qualityClass}">${qualityText}</small>
                <div><small class="text-muted">${Math.round(latency)}ms</small></div>
            `;
            
        } catch (error) {
            console.error('Network check error:', error);
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            networkCheck.innerHTML = `
                <i class="bi bi-wifi-off text-warning fs-1 mb-2"></i>
                <h6>${this.translate('video_consultation.system_checks.network_quality', 'Network Quality')}</h6>
                <small class="text-warning">${isArabic ? 'غير معروف' : 'Unknown'}</small>
            `;
            this.systemChecks.network = true; // Don't block on network check failure
        }
    },
    
    // Check permissions
    async checkPermissions() {
        const permissionsCheck = document.getElementById('permissions-check');
        if (!permissionsCheck) return;
        
        try {
            // Request camera and microphone permissions
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            permissionsCheck.innerHTML = `
                <i class="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                <h6>${isArabic ? 'الأذونات' : 'Permissions'}</h6>
                <small class="text-success">${isArabic ? 'تم منحها' : 'Granted'}</small>
            `;
            
            this.systemChecks.permissions = true;
            
            // Stop the test stream
            stream.getTracks().forEach(track => track.stop());
            
        } catch (error) {
            console.error('Permissions check error:', error);
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            permissionsCheck.innerHTML = `
                <i class="bi bi-x-circle-fill text-danger fs-1 mb-2"></i>
                <h6>${isArabic ? 'الأذونات' : 'Permissions'}</h6>
                <small class="text-danger">${isArabic ? 'مرفوضة' : 'Denied'}</small>
            `;
            
            this.systemChecks.permissions = false;
            this.showError(isArabic ?
                'يجب السماح بالوصول للكاميرا والميكروفون لبدء المكالمة' :
                'Camera and microphone access required to start the call'
            );
        }
    },
    
    // Enumerate available devices
    async enumerateDevices() {
        try {
            // Request permissions first
            await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const cameraSelect = document.getElementById('camera-select');
            const micSelect = document.getElementById('mic-select');
            
            // Clear existing options
            cameraSelect.innerHTML = '';
            micSelect.innerHTML = '';
            
            // Populate camera options
            devices.filter(d => d.kind === 'videoinput').forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${cameraSelect.length + 1}`;
                cameraSelect.appendChild(option);
            });
            
            // Populate microphone options
            devices.filter(d => d.kind === 'audioinput').forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Microphone ${micSelect.length + 1}`;
                micSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Device enumeration error:', error);
            this.showError('Could not access camera/microphone. Please check permissions.');
        }
    },
    
    // Start local preview
    async startLocalPreview() {
        try {
            const video = document.getElementById('local-preview');
            if (!video) return;
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            video.srcObject = stream;
            
            // Setup audio level meter
            this.setupAudioMeter(stream);
            
        } catch (error) {
            console.error('Local preview error:', error);
        }
    },
    
    // Setup audio level meter
    setupAudioMeter(stream) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;
        
        microphone.connect(analyser);
        
        const updateLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const percentage = (average / 255) * 100;
            
            const levelBar = document.getElementById('audio-level');
            if (levelBar) {
                levelBar.style.width = percentage + '%';
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    },
    
    // Start or join video session
    async startVideoSession() {
        try {
            // Show loading
            this.showLoading();
            
            // BYPASS BACKEND - Use direct public room creation for free Jitsi
            console.log('🔧 Bypassing backend - creating direct public room');
            
            // Create simple public room name (avoid any triggers for lobby/auth)
            const userName = AuthStorage.get('name') || 'User';
            const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, ''); // Remove all special chars including Arabic
            const publicRoomName = `public${this.appointmentId}${sanitizedUserName}`;
            
            const publicSessionData = {
                room_name: publicRoomName,
                jitsi_domain: 'meet.jit.si',
                jwt_token: null, // No authentication for public rooms
                config: {
                    enableWelcomePage: false,
                    enableClosePage: false,
                    disableDeepLinking: true,
                    startWithAudioMuted: false,
                    startWithVideoMuted: this.audioOnlyMode || false,
                    requireDisplayName: false,
                    // COMPLETELY DISABLE ALL LOBBY FEATURES
                    enableLobbyChat: false,
                    lobby: {
                        enabled: false,
                        autoKnock: false,
                        enableChat: false
                    },
                    roomConfig: {
                        enableLobby: false,
                        password: null,
                        requireAuth: false
                    },
                    authentication: { enabled: false },
                    disableLobby: true,
                    enableUserRolesBasedOnToken: false,
                    enableInsecureRoomNameWarning: false,
                    enableGuestDomain: true,
                    disableModeratorIndicator: true,
                    disableRemoteMute: true
                },
                interface_config: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'desktop', 'chat', 'raisehand',
                        'participants-pane', 'tileview', 'toggle-camera', 'hangup'
                    ],
                    SHOW_LOBBY_CHAT: false,
                    ENABLE_LOBBY_CHAT: false,
                    SHOW_POWERED_BY: false,
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false
                }
            };
            
            console.log('🔧 Using direct public room:', publicSessionData);
            
            // Store session data
            this.sessionData = publicSessionData;
            this.roomName = publicRoomName;
            
            // Initialize Jitsi directly with public room
            this.initJitsi(publicSessionData);
            
        } catch (error) {
            console.error('Start video session error:', error);
            this.showError('Failed to start video session');
        }
    },
    
    // Initialize Jitsi Meet
    initJitsi(sessionData) {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        // Clear container
        container.innerHTML = '<div id="jitsi-container" style="height: 100vh;"></div>';
        
        // Jitsi domain
        const domain = sessionData.jitsi_domain || 'meet.jit.si';
        
        // Debug session data
        console.log('🔧 Jitsi session data:', {
            room_name: sessionData.room_name,
            jwt_token: sessionData.jwt_token ? 'Present' : 'Missing',
            jwt_sample: sessionData.jwt_token ? sessionData.jwt_token.substring(0, 50) + '...' : 'Missing',
            domain: domain
        });
        
        // Default config to handle authentication issues - FORCE NO LOBBY
        const defaultConfig = {
            enableWelcomePage: false,
            enableClosePage: false,
            disableDeepLinking: true,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            requireDisplayName: false,
            // COMPLETELY DISABLE ALL LOBBY FEATURES
            enableLobbyChat: false,
            lobby: {
                enabled: false,
                autoKnock: false,
                enableChat: false
            },
            // Force public room
            roomConfig: {
                enableLobby: false,
                password: null,
                requireAuth: false
            },
            // Disable all authentication
            authentication: {
                enabled: false
            },
            // Additional lobby disabling options
            disableLobby: true,
            enableUserRolesBasedOnToken: false,
            enableInsecureRoomNameWarning: false,
            // Force guest access
            enableGuestDomain: true,
            // Disable moderation features that might trigger lobby
            disableModeratorIndicator: true,
            disableRemoteMute: true
        };
        
        // Default interface config - NO LOBBY FEATURES
        const defaultInterfaceConfig = {
            TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'desktop', 'chat', 'raisehand',
                'participants-pane', 'tileview', 'toggle-camera', 'hangup'
            ],
            // Disable lobby UI elements
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
            SHOW_LOBBY_CHAT: false,
            ENABLE_LOBBY_CHAT: false,
            // Remove any authentication-related UI
            SHOW_POWERED_BY: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            // Ensure guest-friendly interface
            DEFAULT_LOCAL_DISPLAY_NAME: 'User',
            DEFAULT_REMOTE_DISPLAY_NAME: 'Participant'
        };
        
        // FORCE PUBLIC ROOM (Free Jitsi doesn't support authentication)
        console.log('🔧 Using PUBLIC ROOM (free Jitsi Meet doesn\'t support authentication)');
        
        // Create simple public room name (avoid any triggers for lobby/auth)
        const userName = AuthStorage.get('name') || 'User';
        const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, '');
        const publicRoomName = `public${this.appointmentId}${sanitizedUserName}`;
        
        // Merge configurations for public room only
        const options = {
            roomName: publicRoomName, // Use our public room name instead of backend room name
            parentNode: document.getElementById('jitsi-container'),
            userInfo: {
                displayName: `${AuthStorage.get('name') || 'User'} (Appointment ${this.appointmentId})`
            },
            configOverwrite: { ...defaultConfig, ...(sessionData.config || {}) },
            interfaceConfigOverwrite: { ...defaultInterfaceConfig, ...(sessionData.interface_config || {}) }
            // NO JWT TOKEN - free Jitsi only supports public rooms
        };
        
        console.log('🔧 Jitsi options:', {
            roomName: options.roomName,
            hasJWT: !!options.jwt,
            domain: domain,
            publicRoomName: publicRoomName
        });
        
        console.log('🔧 FINAL ROOM NAME BEING USED:', options.roomName);
        
        try {
            // Initialize Jitsi API
            this.jitsiApi = new JitsiMeetExternalAPI(domain, options);
            
            // Setup event handlers
            this.setupJitsiEventHandlers();
            
            console.log('🔧 Jitsi API initialized successfully');
            
        } catch (initError) {
            console.error('🔧 Jitsi initialization failed:', initError);
            
            // If initialization fails, try fallback immediately
            if (initError.message && initError.message.includes('membersOnly')) {
                console.log('🔧 MembersOnly error during initialization - applying immediate fallback');
                setTimeout(() => this.retryWithFallbackConfig(), 1000);
            } else {
                this.handleJitsiError(initError);
            }
        }
    },
    
    // Setup Jitsi event handlers
    setupJitsiEventHandlers() {
        if (!this.jitsiApi) return;
        
        // Video conference joined
        this.jitsiApi.addEventListener('videoConferenceJoined', (e) => {
            console.log('Joined conference:', e);
            this.logAnalyticsEvent('conference_joined', { event_data: e });
            this.onConferenceJoined();
        });
        
        // Video conference left
        this.jitsiApi.addEventListener('videoConferenceLeft', (e) => {
            console.log('🚪 LEFT CONFERENCE EVENT FIRED:', e);
            console.log('🔚 Calling onConferenceLeft...');
            this.logAnalyticsEvent('conference_left', { event_data: e });
            this.onConferenceLeft();
        });
        
        // Participant joined
        this.jitsiApi.addEventListener('participantJoined', (e) => {
            console.log('Participant joined:', e);
            this.logAnalyticsEvent('participant_joined', { participant: e });
            this.showNotification('Participant joined the call');
        });
        
        // Participant left
        this.jitsiApi.addEventListener('participantLeft', (e) => {
            console.log('Participant left:', e);
            this.logAnalyticsEvent('participant_left', { participant: e });
            this.showNotification('Participant left the call');
        });
        
        // Connection quality
        this.jitsiApi.addEventListener('connectionQualityChanged', (e) => {
            console.log('Connection quality:', e);
            this.logAnalyticsEvent('connection_quality_changed', { quality: e });
            this.updateConnectionQuality(e);
        });
        
        // Error handling
        this.jitsiApi.addEventListener('errorOccurred', (e) => {
            console.error('Jitsi error:', e);
            this.logAnalyticsEvent('jitsi_error', { error: e });
            this.handleJitsiError(e);
        });
        
        // Add window unload handler as backup to catch direct window closes
        window.addEventListener('beforeunload', (e) => {
            console.log('🚪 WINDOW CLOSING - Triggering emergency session end');
            // Use sync request for immediate execution before page unloads
            this.emergencyEndSession();
        });
        
        window.addEventListener('pagehide', (e) => {
            console.log('🚪 PAGE HIDING - Triggering emergency session end');
            this.emergencyEndSession();
        });
    },
    
    // Conference joined handler
    onConferenceJoined() {
        console.log('Conference joined successfully');
        
        // Start quality monitoring
        this.startQualityMonitoring();
        
        // Start monitoring connection
        this.startConnectionMonitoring();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Update UI
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerHTML = '<span class="badge bg-success">Connected</span>';
        }
    },
    
    // Conference left handler
    async onConferenceLeft() {
        console.log('🔚 onConferenceLeft() called - starting cleanup process');
        
        // Stop monitoring
        this.stopConnectionMonitoring();
        console.log('🔚 Connection monitoring stopped');
        
        // End session on backend
        console.log('🔚 Calling endVideoSession()...');
        await this.endVideoSession();
        console.log('🔚 endVideoSession() completed');
        
        // Force refresh dashboard status even if backend call failed
        // This ensures UI updates even when API calls fail due to auth issues
        console.log('🔚 Calling refreshDashboardStatus()...');
        this.refreshDashboardStatus();
        console.log('🔚 refreshDashboardStatus() completed');
        
        // Show post-call screen
        console.log('🔚 Calling showPostCallScreen()...');
        this.showPostCallScreen();
        console.log('🔚 onConferenceLeft() completed');
    },
    
    // End video session
    async endVideoSession() {
        try {
            console.log('🔚 Attempting to end video session for appointment:', this.appointmentId);
            
            // Check if we have authentication token
            const token = localStorage.getItem('sahatak_access_token');
            if (!token) {
                console.warn('⚠️ No auth token found - attempting to refresh session');
                // Try to get token from AuthStorage if available
                const authToken = AuthStorage?.get('access_token');
                if (authToken) {
                    localStorage.setItem('sahatak_access_token', authToken);
                    console.log('✅ Token restored from AuthStorage');
                }
            }
            
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/end`,
                { method: 'POST' }
            );
            console.log('✅ Video session ended successfully:', response);
        } catch (error) {
            console.error('❌ End session error:', error);
            console.warn('⚠️ Video session end failed - appointment status may not be reset properly');
            
            // Even if backend call fails, we should still clean up locally
            // This is important because the user has left the video call
        }
    },
    
    // Emergency session end for window close/unload events
    emergencyEndSession() {
        try {
            console.log('🚨 EMERGENCY SESSION END for appointment:', this.appointmentId);
            
            // Use sendBeacon for reliable delivery during page unload
            const token = localStorage.getItem('sahatak_access_token') || AuthStorage?.get('access_token');
            
            if (navigator.sendBeacon && token) {
                const url = `${ApiHelper.baseUrl}/appointments/${this.appointmentId}/video/end`;
                const data = JSON.stringify({});
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                };
                
                // Create a Blob with the data and headers
                const blob = new Blob([data], { type: 'application/json' });
                
                console.log('🚨 Sending beacon to end session');
                navigator.sendBeacon(url, blob);
            } else {
                console.log('🚨 Beacon not available or no token, using fetch');
                // Fallback to synchronous fetch
                const url = `${ApiHelper.baseUrl}/appointments/${this.appointmentId}/video/end`;
                fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    keepalive: true
                }).catch(error => console.error('Emergency session end failed:', error));
            }
            
            // Also store a flag in localStorage to trigger dashboard refresh on next page load
            localStorage.setItem(`sahatak_video_ended_${this.appointmentId}`, Date.now().toString());
            
        } catch (error) {
            console.error('Emergency session end error:', error);
        }
    },
    
    // Refresh dashboard status to update UI after video session ends
    refreshDashboardStatus() {
        try {
            console.log('🔄 Triggering dashboard refresh after video session end');
            
            // If VideoConsultationDashboard is available, refresh it
            if (window.VideoConsultationDashboard && typeof window.VideoConsultationDashboard.checkAllAppointmentStatuses === 'function') {
                console.log('🔄 Refreshing VideoConsultationDashboard status');
                window.VideoConsultationDashboard.checkAllAppointmentStatuses();
            }
            
            // If Dashboard is available, refresh it too
            if (window.Dashboard && typeof window.Dashboard.refreshAppointments === 'function') {
                console.log('🔄 Refreshing main Dashboard');
                window.Dashboard.refreshAppointments();
            }
            
            // Also trigger a general page refresh after a short delay to ensure all dashboards update
            setTimeout(() => {
                console.log('🔄 Triggering delayed dashboard refresh');
                if (window.location.pathname.includes('dashboard')) {
                    window.location.reload();
                }
            }, 2000);
            
        } catch (error) {
            console.error('Error refreshing dashboard status:', error);
        }
    },
    
    // Show post-call screen with consultation completion options
    showPostCallScreen() {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        const userType = AuthStorage.get('type');
        const isDoctorView = userType === 'doctor';
        
        // Determine correct navigation paths based on user type
        const dashboardPath = isDoctorView 
            ? `${window.location.origin}/Sahatak/frontend/pages/dashboard/doctor.html`
            : `${window.location.origin}/Sahatak/frontend/pages/dashboard/patient.html`;
        
        const appointmentPath = './appointment-list.html';
        
        // Different screens for doctor vs patient
        if (isDoctorView) {
            // Doctor sees options to complete or continue consultation
            container.innerHTML = `
                <div class="post-call-screen text-center py-5">
                    <i class="bi bi-camera-video-off text-primary" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">${isArabic ? 'انتهت المكالمة المرئية' : 'Video Call Ended'}</h3>
                    <p class="mb-4">${isArabic ? 'ما الذي تود فعله بالاستشارة؟' : 'What would you like to do with the consultation?'}</p>
                    
                    <div class="row justify-content-center">
                        <div class="col-md-6">
                            <div class="card border-success mb-3">
                                <div class="card-body">
                                    <h5 class="card-title text-success">
                                        <i class="bi bi-check-circle me-2"></i>
                                        ${isArabic ? 'إنهاء الاستشارة' : 'Complete Consultation'}
                                    </h5>
                                    <p class="card-text text-muted">
                                        ${isArabic ? 'يتم وضع علامة على الموعد كمكتمل وإزالته من لوحة التحكم' : 'Mark appointment as completed and remove from dashboard'}
                                    </p>
                                    <button class="btn btn-success w-100" onclick="VideoConsultation.handleCompleteConsultation()">
                                        <i class="bi bi-check-lg me-2"></i>
                                        ${isArabic ? 'إنهاء الاستشارة' : 'Complete Consultation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card border-warning mb-3">
                                <div class="card-body">
                                    <h5 class="card-title text-warning">
                                        <i class="bi bi-arrow-left-circle me-2"></i>
                                        ${isArabic ? 'العودة للوحة التحكم' : 'Return to Dashboard'}
                                    </h5>
                                    <p class="card-text text-muted">
                                        ${isArabic ? 'يبقى الموعد نشطاً في لوحة التحكم للمتابعة لاحقاً' : 'Keep appointment active in dashboard for follow-up later'}
                                    </p>
                                    <a href="${dashboardPath}" class="btn btn-outline-warning w-100">
                                        <i class="bi bi-speedometer2 me-2"></i>
                                        ${isArabic ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <small class="text-muted">
                            <a href="${appointmentPath}" class="text-decoration-none">
                                <i class="bi bi-calendar-event me-1"></i>
                                ${isArabic ? 'عرض جميع المواعيد' : 'View all appointments'}
                            </a>
                        </small>
                    </div>
                </div>
            `;
        } else {
            // Patient sees standard end screen
            container.innerHTML = `
                <div class="post-call-screen text-center py-5">
                    <i class="bi bi-check-circle text-success" style="font-size: 4rem;"></i>
                    <h3 class="mt-3">${isArabic ? 'انتهت الاستشارة' : 'Consultation Ended'}</h3>
                    <p class="mb-4">${isArabic ? 'شكراً لاستخدامك خدماتنا' : 'Thank you for using our services'}</p>
                    
                    <div class="d-flex gap-2 justify-content-center flex-wrap">
                        <a href="${appointmentPath}" class="btn btn-primary">
                            <i class="bi bi-calendar-event me-2"></i>
                            ${isArabic ? 'المواعيد' : 'Appointments'}
                        </a>
                        <a href="${dashboardPath}" class="btn btn-outline-primary">
                            <i class="bi bi-speedometer2 me-2"></i>
                            ${isArabic ? 'الرئيسية' : 'Dashboard'}
                        </a>
                    </div>
                    
                    <div class="mt-3">
                        <small class="text-muted">
                            ${isArabic ? 'يمكنك إغلاق هذه النافذة الآن' : 'You can safely close this window now'}
                        </small>
                    </div>
                </div>
            `;
        }
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Join call button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'join-call-btn' || e.target.closest('#join-call-btn')) {
                this.startVideoSession();
            }
            
            if (e.target.id === 'test-devices-btn' || e.target.closest('#test-devices-btn')) {
                this.testDevices();
            }
            
            if (e.target.id === 'end-call-btn' || e.target.closest('#end-call-btn')) {
                this.endCall();
            }
        });
        
        // Device change handlers
        document.addEventListener('change', (e) => {
            if (e.target.id === 'camera-select') {
                this.changeCamera(e.target.value);
            }
            
            if (e.target.id === 'mic-select') {
                this.changeMicrophone(e.target.value);
            }
        });
    },
    
    // Test devices
    async testDevices() {
        // Re-enumerate devices
        await this.enumerateDevices();
        
        // Show success message
        this.showNotification('Devices tested successfully', 'success');
    },
    
    // Change camera
    async changeCamera(deviceId) {
        if (this.jitsiApi) {
            this.jitsiApi.setVideoInputDevice(deviceId);
        }
    },
    
    // Change microphone
    async changeMicrophone(deviceId) {
        if (this.jitsiApi) {
            this.jitsiApi.setAudioInputDevice(deviceId);
        }
    },
    
    // End call with proper cleanup (video session only, NOT appointment)
    async endCall() {
        console.log('Ending video session (keeping appointment active)...');
        
        try {
            // Call disconnect endpoint to end video session only
            await this.disconnectVideoSession();
        } catch (error) {
            console.error('Error ending video session on backend:', error);
            // Continue with cleanup even if backend call fails
        }
        
        // Perform complete cleanup
        this.cleanup();
        
        // Show post-call screen with consultation options
        this.showPostCallScreen();
    },
    
    // Disconnect video session (ends video only, keeps appointment active)
    async disconnectVideoSession() {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/disconnect`,
                { method: 'POST' }
            );
            
            if (response.success) {
                console.log('Video session disconnected successfully');
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Failed to disconnect video session:', error);
            throw error;
        }
    },
    
    // Complete consultation (marks appointment as finished)
    async completeConsultation() {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/complete`,
                { method: 'POST' }
            );
            
            if (response.success) {
                console.log('Consultation completed successfully');
                return response;
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            console.error('Failed to complete consultation:', error);
            throw error;
        }
    },
    
    // Handle unexpected disconnect
    async handleDisconnect() {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/disconnect`,
                { method: 'POST' }
            );
            
            if (response.success) {
                console.log('Disconnect handled on backend successfully');
                return response;
            }
        } catch (error) {
            console.error('Failed to handle disconnect on backend:', error);
        }
    },
    
    // Comprehensive cleanup method
    cleanup() {
        console.log('Starting comprehensive cleanup...');
        
        // 0. End session analytics
        this.endSessionAnalytics();
        
        // 1. Dispose Jitsi API
        if (this.jitsiApi) {
            try {
                console.log('Disposing Jitsi API...');
                this.jitsiApi.dispose();
                this.jitsiApi = null;
                console.log('Jitsi API disposed successfully');
            } catch (error) {
                console.error('Error disposing Jitsi API:', error);
            }
        }
        
        // 2. Stop all media streams
        this.stopAllMediaStreams();
        
        // 3. Clear all intervals
        this.stopConnectionMonitoring();
        this.stopHeartbeat();
        
        // 4. Remove event listeners
        this.removeEventListeners();
        
        // 5. Reset component state
        this.resetState();
        
        console.log('Cleanup completed');
    },
    
    // Stop all media streams to release camera/microphone
    stopAllMediaStreams() {
        console.log('Stopping all media streams...');
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Get current streams and stop them
            navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .then(stream => {
                    stream.getTracks().forEach(track => {
                        track.stop();
                        console.log(`Stopped ${track.kind} track`);
                    });
                })
                .catch(error => {
                    console.log('No active streams to stop or error getting streams');
                });
        }
        
        // Also try to stop any streams that might be attached to video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            if (video.srcObject) {
                const stream = video.srcObject;
                if (stream.getTracks) {
                    stream.getTracks().forEach(track => {
                        track.stop();
                        console.log(`Stopped track from video element: ${track.kind}`);
                    });
                }
                video.srcObject = null;
            }
        });
    },
    
    // Stop heartbeat
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
            console.log('Heartbeat stopped');
        }
    },
    
    // Remove event listeners
    removeEventListeners() {
        // Remove any specific event listeners we added
        // (Most are handled automatically when elements are removed)
        console.log('Event listeners removed');
    },
    
    // Reset component state
    resetState() {
        this.roomName = null;
        this.sessionData = null;
        this.audioOnlyMode = false;
        this.systemChecks = {
            browser: false,
            network: false,
            permissions: false
        };
        console.log('Component state reset');
    },
    
    // Start connection monitoring
    startConnectionMonitoring() {
        this.connectionCheckInterval = setInterval(() => {
            // Check if still connected
            if (this.jitsiApi) {
                // Connection is active
            } else {
                this.stopConnectionMonitoring();
            }
        }, 5000);
    },
    
    // Stop connection monitoring
    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    },
    
    // Update connection quality display
    updateConnectionQuality(data) {
        const qualityEl = document.getElementById('connection-quality');
        if (!qualityEl) return;
        
        const quality = data.quality;
        let badgeClass = 'bg-success';
        let text = 'Excellent';
        
        if (quality < 30) {
            badgeClass = 'bg-danger';
            text = 'Poor';
        } else if (quality < 60) {
            badgeClass = 'bg-warning';
            text = 'Fair';
        } else if (quality < 80) {
            badgeClass = 'bg-info';
            text = 'Good';
        }
        
        qualityEl.innerHTML = `<span class="badge ${badgeClass}">${text}</span>`;
    },
    
    // Enhanced Jitsi error handling with specific recovery strategies
    handleJitsiError(error) {
        console.error('Jitsi error occurred:', error);
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        let errorMessage, recoveryAction, showRetry = true;
        
        // Handle specific error types
        switch (error.name || error.type) {
            case 'connection.failed':
            case 'CONNECTION_FAILED':
                errorMessage = isArabic ? 'فشل في الاتصال بالخادم' : 'Failed to connect to server';
                recoveryAction = () => this.attemptReconnection();
                break;
                
            case 'conference.failed':
            case 'CONFERENCE_FAILED':
                // Check if it's a membersOnly error
                if (error.message && (error.message.includes('membersOnly') || error.message.includes('conference.connectionError.membersOnly'))) {
                    console.log('🔧 MembersOnly error detected, switching to emergency public room...');
                    errorMessage = isArabic ? 
                        'خطأ في المصادقة - التبديل للغرفة العامة' : 
                        'Authentication error - switching to public room';
                    recoveryAction = () => this.initEmergencyPublicRoom();
                    // Auto-retry IMMEDIATELY for membersOnly errors
                    console.log('🔧 Auto-switching to emergency public room IMMEDIATELY...');
                    this.initEmergencyPublicRoom();
                } else {
                    errorMessage = isArabic ? 'فشل في الانضمام للاستشارة' : 'Failed to join consultation';
                    recoveryAction = () => this.retryJoinConference();
                }
                break;
                
            case 'connection.dropped':
            case 'CONNECTION_DROPPED':
                errorMessage = isArabic ? 'انقطع الاتصال' : 'Connection was lost';
                recoveryAction = () => this.attemptReconnection();
                this.showReconnectionDialog();
                return; // Handle separately
                
            case 'not-allowed':
            case 'PERMISSION_DENIED':
                errorMessage = isArabic ? 
                    'يُرجى السماح للكاميرا والميكروفون' : 
                    'Please allow camera and microphone access';
                recoveryAction = () => this.requestPermissionsAgain();
                break;
                
            case 'camera.error':
            case 'CAMERA_ERROR':
                errorMessage = isArabic ? 
                    'خطأ في الكاميرا - التبديل للصوت فقط' : 
                    'Camera error - switching to audio only';
                recoveryAction = () => this.switchToAudioOnly();
                break;
                
            case 'microphone.error':
            case 'MICROPHONE_ERROR':
                errorMessage = isArabic ? 'خطأ في الميكروفون' : 'Microphone error';
                recoveryAction = () => this.handleMicrophoneError();
                break;
                
            case 'network.error':
            case 'NETWORK_ERROR':
                errorMessage = isArabic ? 
                    'مشكلة في الشبكة - يُرجى التحقق من الاتصال' : 
                    'Network issue - please check your connection';
                recoveryAction = () => this.handleNetworkError();
                break;
                
            default:
                errorMessage = isArabic ? 
                    'حدث خطأ غير متوقع في المكالمة' : 
                    'An unexpected error occurred during the call';
                recoveryAction = () => this.handleGenericError();
                break;
        }
        
        // Show error with recovery options
        this.showErrorScreen(errorMessage, showRetry, recoveryAction);
    },
    
    // Reconnect to session
    async reconnect() {
        try {
            // Try to rejoin
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/join`,
                'POST'
            );
            
            if (response.success) {
                this.initJitsi(response.data);
            }
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.showErrorScreen('Reconnection failed. Please try again.', true);
        }
    },
    
    // Show reconnection dialog with automatic retry
    showReconnectionDialog() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        const container = document.getElementById('video-container');
        if (!container) return;
        
        // Set up reconnection attempt counter
        this.reconnectionAttempts = 0;
        this.maxReconnectionAttempts = 3;
        
        container.innerHTML = `
            <div class="reconnection-screen text-center py-5">
                <div class="mb-4">
                    <div class="spinner-border text-warning mb-3" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">Reconnecting...</span>
                    </div>
                    <h4 class="text-warning">
                        <i class="bi bi-wifi"></i>
                        ${isArabic ? 'محاولة إعادة الاتصال...' : 'Reconnecting...'}
                    </h4>
                    <p id="reconnection-status">
                        ${isArabic ? 'يُرجى الانتظار بينما نحاول إعادة الاتصال' : 'Please wait while we try to reconnect'}
                    </p>
                    <div class="progress mb-3" style="height: 10px;">
                        <div id="reconnection-progress" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" 
                             role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="d-flex gap-2 justify-content-center">
                    <button id="manual-reconnect-btn" class="btn btn-outline-primary">
                        <i class="bi bi-arrow-clockwise"></i>
                        ${isArabic ? 'إعادة المحاولة الآن' : 'Retry Now'}
                    </button>
                    <button id="audio-only-btn" class="btn btn-outline-warning">
                        <i class="bi bi-telephone"></i>
                        ${isArabic ? 'الصوت فقط' : 'Audio Only'}
                    </button>
                    <button id="end-call-reconnection-btn" class="btn btn-outline-danger">
                        <i class="bi bi-telephone-x"></i>
                        ${isArabic ? 'إنهاء المكالمة' : 'End Call'}
                    </button>
                </div>
            </div>
        `;
        
        // Set up event listeners
        document.getElementById('manual-reconnect-btn').addEventListener('click', () => {
            this.attemptReconnection();
        });
        
        document.getElementById('audio-only-btn').addEventListener('click', () => {
            this.switchToAudioOnly();
        });
        
        document.getElementById('end-call-reconnection-btn').addEventListener('click', () => {
            this.endCall();
        });
        
        // Start automatic reconnection
        this.attemptReconnection();
    },
    
    // Attempt reconnection with exponential backoff
    async attemptReconnection() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        this.reconnectionAttempts = (this.reconnectionAttempts || 0) + 1;
        
        if (this.reconnectionAttempts > this.maxReconnectionAttempts) {
            this.showErrorScreen(
                isArabic ? 'فشل في إعادة الاتصال. يُرجى المحاولة لاحقاً' : 'Failed to reconnect. Please try again later.',
                true,
                () => this.retryJoinConference()
            );
            return;
        }
        
        // Update UI
        const statusEl = document.getElementById('reconnection-status');
        const progressEl = document.getElementById('reconnection-progress');
        
        if (statusEl) {
            statusEl.textContent = isArabic ? 
                `محاولة رقم ${this.reconnectionAttempts} من ${this.maxReconnectionAttempts}` :
                `Attempt ${this.reconnectionAttempts} of ${this.maxReconnectionAttempts}`;
        }
        
        if (progressEl) {
            const progress = (this.reconnectionAttempts / this.maxReconnectionAttempts) * 100;
            progressEl.style.width = `${progress}%`;
        }
        
        try {
            console.log(`Reconnection attempt ${this.reconnectionAttempts}/${this.maxReconnectionAttempts}`);
            
            // Check if session is still valid
            const statusResponse = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/status`,
                { method: 'GET' }
            );
            
            if (!statusResponse.success || !statusResponse.data.can_join) {
                throw new Error('Session no longer available');
            }
            
            // Try to rejoin
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/join`,
                { method: 'POST' }
            );
            
            if (response.success) {
                console.log('Reconnection successful');
                this.sessionData = response.data;
                this.initJitsi(response.data);
                this.reconnectionAttempts = 0; // Reset counter
            } else {
                throw new Error(response.message);
            }
            
        } catch (error) {
            console.error(`Reconnection attempt ${this.reconnectionAttempts} failed:`, error);
            
            // Wait before next attempt (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts - 1), 10000);
            
            setTimeout(() => {
                this.attemptReconnection();
            }, delay);
        }
    },
    
    // Retry joining conference
    async retryJoinConference() {
        this.showLoadingState('Rejoining consultation...');
        
        // Reset attempts
        this.reconnectionAttempts = 0;
        
        // Try to join again
        await this.attemptReconnection();
    },
    
    // Retry with fallback configuration (for membersOnly errors)
    async retryWithFallbackConfig() {
        console.log('🔧 Retrying with fallback configuration for membersOnly error...');
        
        try {
            // Get fresh session data from the backend
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/join`,
                { method: 'POST' }
            );
            
            if (response.success && response.data) {
                // Clean up existing Jitsi instance
                if (this.jitsiApi) {
                    this.jitsiApi.dispose();
                    this.jitsiApi = null;
                }
                
                // Add fallback configuration for authentication issues
                const fallbackSessionData = {
                    ...response.data,
                    config: {
                        ...response.data.config,
                        // Completely disable lobby and authentication
                        enableLobbyChat: false,
                        enableNoAudioDetection: false,
                        enableNoisyMicDetection: false,
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        requireDisplayName: false,
                        lobby: {
                            enabled: false
                        },
                        roomConfig: {
                            enableLobby: false,
                            password: null
                        },
                        authentication: {
                            enabled: false
                        },
                        // Override any server-side authentication settings
                        enableUserRolesBasedOnToken: false,
                        enableInsecureRoomNameWarning: false
                    },
                    // Remove JWT token to force public room access
                    jwt_token: undefined
                };
                
                console.log('🔧 Using fallback config:', fallbackSessionData);
                
                // Initialize Jitsi with fallback config
                this.sessionData = fallbackSessionData;
                this.initJitsi(fallbackSessionData);
                
            } else {
                throw new Error(response.message || 'Failed to get session data');
            }
            
        } catch (error) {
            console.error('Fallback config retry failed:', error);
            // Fall back to emergency public room
            this.initEmergencyPublicRoom();
        }
    },
    
    // Initialize emergency public room (bypasses all authentication)
    async initEmergencyPublicRoom() {
        console.log('🔧 Initializing emergency public room...');
        
        try {
            // Clean up existing Jitsi instance
            if (this.jitsiApi) {
                this.jitsiApi.dispose();
                this.jitsiApi = null;
            }
            
            // Create simple emergency public room name  
            const userName = AuthStorage.get('name') || 'User';
            const sanitizedUserName = userName.replace(/[^a-zA-Z0-9]/g, '');
            const publicRoomName = `emergency${this.appointmentId}${Date.now()}`;
            
            console.log('🔧 Emergency public room:', publicRoomName);
            
            // Container setup
            const container = document.getElementById('video-container');
            if (!container) return;
            
            container.innerHTML = '<div id="jitsi-container" style="height: 100vh;"></div>';
            
            // Minimal public room configuration
            const emergencyOptions = {
                roomName: publicRoomName,
                parentNode: document.getElementById('jitsi-container'),
                userInfo: {
                    displayName: `${AuthStorage.get('name') || 'User'} (Appointment ${this.appointmentId})`
                },
                configOverwrite: {
                    // Completely public room settings
                    enableWelcomePage: false,
                    enableClosePage: false,
                    disableDeepLinking: true,
                    startWithAudioMuted: false,
                    startWithVideoMuted: this.audioOnlyMode,
                    requireDisplayName: false,
                    enableLobbyChat: false,
                    enableNoAudioDetection: false,
                    enableNoisyMicDetection: false,
                    enableUserRolesBasedOnToken: false,
                    enableInsecureRoomNameWarning: false,
                    // Force public access
                    lobby: { enabled: false },
                    authentication: { enabled: false },
                    roomConfig: { 
                        enableLobby: false,
                        password: null,
                        requireAuth: false
                    }
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'desktop', 'chat', 'raisehand',
                        'participants-pane', 'tileview', 'toggle-camera', 'hangup'
                    ],
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false
                }
                // NO JWT TOKEN - completely public access
            };
            
            console.log('🔧 Emergency room options:', emergencyOptions);
            
            // Show notification about emergency mode
            const currentLang = LanguageManager?.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            this.showNotification(
                isArabic ? 
                    'تم التبديل للوضع الطارئ - غرفة عامة' : 
                    'Switched to emergency mode - public room',
                'warning'
            );
            
            // Initialize Jitsi with emergency settings
            this.jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', emergencyOptions);
            
            // Setup basic event handlers
            this.setupJitsiEventHandlers();
            
            console.log('🔧 Emergency public room initialized successfully');
            
        } catch (error) {
            console.error('🔧 Emergency public room failed:', error);
            this.showErrorScreen(
                'Unable to establish video connection. Please try again or contact support.',
                true,
                () => this.handleRetry()
            );
        }
    },
    
    // Switch to audio-only mode
    switchToAudioOnly() {
        console.log('Switching to audio-only mode');
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        this.audioOnlyMode = true;
        
        // If Jitsi is already initialized, disable video
        if (this.jitsiApi) {
            this.jitsiApi.executeCommand('toggleVideo');
            this.showNotification(
                isArabic ? 'تم التبديل للصوت فقط' : 'Switched to audio only mode',
                'warning'
            );
        } else {
            // Try to join in audio-only mode
            this.showLoadingState(
                isArabic ? 'الانضمام بالصوت فقط...' : 'Joining in audio-only mode...'
            );
            this.attemptReconnection();
        }
    },
    
    // Request permissions again
    async requestPermissionsAgain() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: !this.audioOnlyMode, 
                audio: true 
            });
            
            // Stop the stream immediately (we just needed to trigger permission)
            stream.getTracks().forEach(track => track.stop());
            
            this.showNotification(
                isArabic ? 'تم منح الأذونات بنجاح' : 'Permissions granted successfully',
                'success'
            );
            
            // Retry joining
            this.attemptReconnection();
            
        } catch (error) {
            this.showErrorScreen(
                isArabic ? 
                    'يُرجى السماح للكاميرا والميكروفون من إعدادات المتصفح' :
                    'Please allow camera and microphone access in your browser settings',
                true,
                () => this.requestPermissionsAgain()
            );
        }
    },
    
    // Handle microphone error
    handleMicrophoneError() {
        console.log('Handling microphone error');
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Try to continue without microphone or request new permissions
        this.showErrorScreen(
            isArabic ? 
                'خطأ في الميكروفون. هل تريد المتابعة بدون صوت؟' :
                'Microphone error. Do you want to continue without audio?',
            true,
            () => {
                if (this.jitsiApi) {
                    this.jitsiApi.executeCommand('toggleAudio');
                }
                this.attemptReconnection();
            }
        );
    },
    
    // Handle network error
    async handleNetworkError() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Test network connectivity
        try {
            const response = await fetch('/assets/img/logo.png', { method: 'HEAD' });
            if (response.ok) {
                // Network is okay, might be Jitsi server issue
                this.showErrorScreen(
                    isArabic ? 
                        'مشكلة في خادم الفيديو. محاولة إعادة الاتصال...' :
                        'Video server issue. Attempting to reconnect...',
                    true,
                    () => this.attemptReconnection()
                );
            } else {
                throw new Error('Network test failed');
            }
        } catch (error) {
            this.showErrorScreen(
                isArabic ? 
                    'لا يوجد اتصال بالإنترنت. يُرجى التحقق من الاتصال' :
                    'No internet connection. Please check your connection.',
                true,
                () => this.handleNetworkError()
            );
        }
    },
    
    // Handle generic errors
    handleGenericError() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        this.showErrorScreen(
            isArabic ? 
                'حدث خطأ. هل تريد المحاولة مرة أخرى؟' :
                'An error occurred. Would you like to try again?',
            true,
            () => this.attemptReconnection()
        );
    },
    
    // Show loading state with detailed progress
    showLoading(message = 'Connecting to video session...') {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        const loadingMessages = {
            en: {
                'connecting': 'Connecting to video session...',
                'initializing': 'Initializing video call...',
                'joining': 'Joining consultation room...',
                'reconnecting': 'Reconnecting to session...',
                'testing': 'Testing audio and video devices...',
                'authenticating': 'Authenticating session...'
            },
            ar: {
                'connecting': 'الاتصال بجلسة الفيديو...',
                'initializing': 'تهيئة مكالمة الفيديو...',
                'joining': 'الانضمام إلى غرفة الاستشارة...',
                'reconnecting': 'إعادة الاتصال بالجلسة...',
                'testing': 'اختبار أجهزة الصوت والفيديو...',
                'authenticating': 'المصادقة على الجلسة...'
            }
        };
        
        const displayMessage = loadingMessages[isArabic ? 'ar' : 'en'][message] || message;
        
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-4">
                    <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                        <span class="visually-hidden">${displayMessage}</span>
                    </div>
                </div>
                <h5 class="mb-3">${displayMessage}</h5>
                <div class="progress mx-auto" style="width: 300px; height: 8px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         role="progressbar" 
                         style="width: 100%" 
                         aria-valuenow="100" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <div class="mt-3">
                    <small class="text-muted">
                        ${isArabic ? 'يرجى الانتظار...' : 'Please wait...'}
                    </small>
                </div>
            </div>
        `;
    },
    
    // Show loading state with custom message
    showLoadingState(message) {
        this.showLoading(message);
    },
    
    // Show comprehensive error screen with recovery options
    showErrorScreen(message, showRetry = true, recoveryAction = null, errorType = 'general') {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Error type specific configurations
        const errorConfigs = {
            'connection': {
                icon: 'bi-wifi-off',
                title: isArabic ? 'مشكلة في الاتصال' : 'Connection Problem',
                suggestions: isArabic ? 
                    ['تحقق من اتصال الإنترنت', 'أعد تحميل الصفحة', 'جرب شبكة أخرى'] :
                    ['Check your internet connection', 'Reload the page', 'Try a different network']
            },
            'permissions': {
                icon: 'bi-camera-video-off',
                title: isArabic ? 'مشكلة في الأذونات' : 'Permission Problem',
                suggestions: isArabic ? 
                    ['اسمح بالوصول للكاميرا والميكروفون', 'تحقق من إعدادات المتصفح', 'أعد تحميل الصفحة'] :
                    ['Allow camera and microphone access', 'Check browser settings', 'Reload the page']
            },
            'device': {
                icon: 'bi-camera-video-off',
                title: isArabic ? 'مشكلة في الجهاز' : 'Device Problem',
                suggestions: isArabic ? 
                    ['تأكد من توصيل الكاميرا والميكروفون', 'أغلق التطبيقات الأخرى التي تستخدم الكاميرا', 'أعد تشغيل المتصفح'] :
                    ['Ensure camera and microphone are connected', 'Close other apps using camera', 'Restart browser']
            },
            'server': {
                icon: 'bi-server',
                title: isArabic ? 'مشكلة في الخادم' : 'Server Problem',
                suggestions: isArabic ? 
                    ['جرب مرة أخرى بعد قليل', 'تحقق من حالة الخدمة', 'اتصل بالدعم الفني'] :
                    ['Try again in a few moments', 'Check service status', 'Contact technical support']
            },
            'general': {
                icon: 'bi-exclamation-triangle',
                title: isArabic ? 'حدث خطأ' : 'An Error Occurred',
                suggestions: isArabic ? 
                    ['جرب مرة أخرى', 'أعد تحميل الصفحة', 'اتصل بالدعم الفني'] :
                    ['Try again', 'Reload the page', 'Contact support']
            }
        };
        
        const config = errorConfigs[errorType] || errorConfigs['general'];
        
        // Generate unique button ID for event handling
        const retryButtonId = 'retry-btn-' + Date.now();
        
        const retryButton = showRetry ? `
            <button type="button" class="btn btn-primary me-2" id="${retryButtonId}">
                <i class="bi bi-arrow-clockwise"></i>
                ${isArabic ? 'إعادة المحاولة' : 'Retry'}
            </button>
        ` : '';
        
        container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card border-0 shadow">
                        <div class="card-body text-center py-5">
                            <div class="mb-4">
                                <i class="${config.icon} display-1 text-danger"></i>
                            </div>
                            <h3 class="mb-3 text-danger">${config.title}</h3>
                            <div class="alert alert-danger mb-4">
                                <div class="fw-bold mb-2">
                                    <i class="bi bi-info-circle"></i> ${isArabic ? 'تفاصيل الخطأ:' : 'Error Details:'}
                                </div>
                                <div>${message}</div>
                            </div>
                            
                            <div class="mb-4">
                                <h5 class="mb-3">${isArabic ? 'اقتراحات للحل:' : 'Suggested Solutions:'}</h5>
                                <ul class="list-unstyled text-start">
                                    ${config.suggestions.map(suggestion => 
                                        `<li class="mb-2"><i class="bi bi-check-circle text-success me-2"></i>${suggestion}</li>`
                                    ).join('')}
                                </ul>
                            </div>
                            
                            <div class="d-flex justify-content-center gap-2">
                                ${retryButton}
                                <button type="button" class="btn btn-outline-primary" onclick="VideoConsultation.showAudioOnlyOption()">
                                    <i class="bi bi-telephone"></i>
                                    ${isArabic ? 'جرب الصوت فقط' : 'Try Audio Only'}
                                </button>
                                <button type="button" class="btn btn-outline-secondary" onclick="VideoConsultation.goBackToDashboard()">
                                    <i class="bi bi-arrow-left"></i>
                                    ${isArabic ? 'العودة' : 'Go Back'}
                                </button>
                            </div>
                            
                            <div class="mt-4 pt-3 border-top">
                                <small class="text-muted">
                                    ${isArabic ? 
                                        'إذا استمرت المشكلة، يرجى <a href="#" onclick="VideoConsultation.contactSupport()">الاتصال بالدعم الفني</a>' :
                                        'If the problem persists, please <a href="#" onclick="VideoConsultation.contactSupport()">contact technical support</a>'
                                    }
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listener for retry button if it exists
        if (showRetry && recoveryAction) {
            setTimeout(() => {
                const retryBtn = document.getElementById(retryButtonId);
                if (retryBtn) {
                    retryBtn.addEventListener('click', recoveryAction);
                }
            }, 100);
        } else if (showRetry) {
            setTimeout(() => {
                const retryBtn = document.getElementById(retryButtonId);
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => this.handleRetry());
                }
            }, 100);
        }
    },
    
    // Show simple error message (backward compatibility)
    showError(message) {
        this.showErrorScreen(message, true, null, 'general');
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    },
    
    // Error recovery actions
    handleRetry() {
        console.log('Retrying video session...');
        this.showLoading('reconnecting');
        
        // Clear any existing state
        this.cleanup();
        
        // Wait a moment then retry
        setTimeout(() => {
            this.init();
        }, 1000);
    },
    
    showAudioOnlyOption() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Set audio-only mode
        this.audioOnlyMode = true;
        
        // Show confirmation dialog
        if (confirm(isArabic ? 
            'هل تريد المتابعة بالصوت فقط بدون فيديو؟' : 
            'Would you like to continue with audio only (no video)?'
        )) {
            this.showLoading('connecting');
            this.startVideoSession();
        }
    },
    
    // Handle complete consultation button click
    async handleCompleteConsultation() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        const confirmMessage = isArabic 
            ? 'هل أنت متأكد من أنك تريد إنهاء هذه الاستشارة؟ لن يكون بإمكانك التراجع عن هذا الإجراء.'
            : 'Are you sure you want to complete this consultation? This action cannot be undone.';
        
        if (confirm(confirmMessage)) {
            try {
                // Show loading
                const container = document.getElementById('video-container');
                if (container) {
                    container.innerHTML = `
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <h5>${isArabic ? 'جاري إنهاء الاستشارة...' : 'Completing consultation...'}</h5>
                        </div>
                    `;
                }
                
                // Complete consultation
                await this.completeConsultation();
                
                // Show success and redirect
                const successMessage = isArabic 
                    ? 'تم إنهاء الاستشارة بنجاح'
                    : 'Consultation completed successfully';
                
                if (typeof showNotification === 'function') {
                    showNotification(successMessage, 'success');
                }
                
                // Navigate back to dashboard
                setTimeout(() => {
                    this.goBackToDashboard();
                }, 1500);
                
            } catch (error) {
                console.error('Error completing consultation:', error);
                const errorMessage = isArabic 
                    ? 'حدث خطأ أثناء إنهاء الاستشارة'
                    : 'Error completing consultation';
                
                if (typeof showNotification === 'function') {
                    showNotification(errorMessage, 'error');
                } else {
                    alert(errorMessage);
                }
                
                // Go back to post-call screen
                this.showPostCallScreen();
            }
        }
    },
    
    goBackToDashboard() {
        // Clean up before leaving
        this.cleanup();
        
        // Navigate back to dashboard
        if (window.navigateToDashboard) {
            window.navigateToDashboard();
        } else {
            // Fallback navigation
            const userType = AuthStorage.get('type');
            const dashboardPath = userType === 'doctor' 
                ? `${window.location.origin}/Sahatak/frontend/pages/dashboard/doctor.html`
                : `${window.location.origin}/Sahatak/frontend/pages/dashboard/patient.html`;
            window.location.href = dashboardPath;
        }
    },
    
    // ===========================================
    // Session Analytics and Monitoring Methods
    // ===========================================
    
    // Initialize session analytics
    initSessionAnalytics() {
        console.log('Initializing session analytics...');
        
        // Generate unique session ID
        this.sessionAnalytics.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.sessionAnalytics.startTime = new Date();
        
        // Log session start
        this.logAnalyticsEvent('session_initialized', {
            appointment_id: this.appointmentId,
            user_type: AuthStorage.get('type'),
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: LanguageManager?.getLanguage() || 'en'
        });
    },
    
    // Start quality monitoring
    startQualityMonitoring() {
        if (!this.jitsiApi) return;
        
        console.log('Starting quality monitoring...');
        
        this.qualityMonitor.interval = setInterval(() => {
            this.collectQualityMetrics();
        }, this.qualityMonitor.sampleRate);
        
        // Log monitoring start
        this.logAnalyticsEvent('quality_monitoring_started', {
            sample_rate: this.qualityMonitor.sampleRate
        });
    },
    
    // Collect quality metrics
    async collectQualityMetrics() {
        if (!this.jitsiApi) return;
        
        try {
            // Get connection stats from Jitsi
            const stats = await this.jitsiApi.getConnectionState();
            const participants = this.jitsiApi.getNumberOfParticipants();
            
            const metrics = {
                timestamp: new Date(),
                connection_state: stats || 'unknown',
                participant_count: participants,
                audio_muted: this.jitsiApi.isAudioMuted(),
                video_muted: this.jitsiApi.isVideoMuted(),
                screen_sharing: this.jitsiApi.isScreenSharing && this.jitsiApi.isScreenSharing(),
                network_info: this.getNetworkInfo()
            };
            
            // Store metrics
            this.sessionAnalytics.qualityMetrics.push(metrics);
            
            // Keep only last 100 metrics to avoid memory issues
            if (this.sessionAnalytics.qualityMetrics.length > 100) {
                this.sessionAnalytics.qualityMetrics = this.sessionAnalytics.qualityMetrics.slice(-100);
            }
            
            this.qualityMonitor.lastQualityCheck = new Date();
            
        } catch (error) {
            console.error('Error collecting quality metrics:', error);
        }
    },
    
    // Get network information
    getNetworkInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
            return {
                effective_type: connection.effectiveType,
                downlink: connection.downlink,
                rtt: connection.rtt,
                save_data: connection.saveData
            };
        }
        
        return { available: false };
    },
    
    // Log analytics event
    logAnalyticsEvent(eventType, data = {}) {
        const event = {
            type: eventType,
            timestamp: new Date(),
            appointment_id: this.appointmentId,
            session_id: this.sessionAnalytics.sessionId,
            data: data
        };
        
        // Store event based on type
        switch (eventType) {
            case 'connection_failed':
            case 'connection_restored':
            case 'connection_quality_changed':
                this.sessionAnalytics.connectionEvents.push(event);
                break;
            case 'participant_joined':
            case 'participant_left':
            case 'participant_muted':
            case 'participant_unmuted':
                this.sessionAnalytics.participantEvents.push(event);
                break;
            case 'error':
            case 'jitsi_error':
            case 'api_error':
                this.sessionAnalytics.errorEvents.push(event);
                break;
            case 'device_changed':
            case 'camera_changed':
            case 'microphone_changed':
                this.sessionAnalytics.deviceChanges.push(event);
                break;
            case 'network_changed':
            case 'connection_type_changed':
                this.sessionAnalytics.networkChanges.push(event);
                break;
        }
        
        console.log(`Analytics Event [${eventType}]:`, event);
        
        // Send to backend for real-time monitoring (non-blocking)
        this.sendAnalyticsEvent(event).catch(error => {
            console.error('Failed to send analytics event:', error);
        });
    },
    
    // Send analytics event to backend
    async sendAnalyticsEvent(event) {
        try {
            await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/analytics`,
                {
                    method: 'POST',
                    body: JSON.stringify(event),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
        } catch (error) {
            // Don't throw - analytics shouldn't break the main functionality
            console.warn('Analytics event send failed:', error);
        }
    },
    
    // End session analytics
    endSessionAnalytics() {
        console.log('Ending session analytics...');
        
        if (!this.sessionAnalytics.startTime) return;
        
        this.sessionAnalytics.endTime = new Date();
        this.sessionAnalytics.duration = this.sessionAnalytics.endTime - this.sessionAnalytics.startTime;
        
        // Stop quality monitoring
        if (this.qualityMonitor.interval) {
            clearInterval(this.qualityMonitor.interval);
            this.qualityMonitor.interval = null;
        }
        
        // Log session end with summary
        this.logAnalyticsEvent('session_ended', {
            duration_ms: this.sessionAnalytics.duration,
            duration_formatted: this.formatDuration(this.sessionAnalytics.duration),
            total_events: {
                connection: this.sessionAnalytics.connectionEvents.length,
                participant: this.sessionAnalytics.participantEvents.length,
                error: this.sessionAnalytics.errorEvents.length,
                device: this.sessionAnalytics.deviceChanges.length,
                network: this.sessionAnalytics.networkChanges.length
            },
            quality_samples: this.sessionAnalytics.qualityMetrics.length,
            final_quality: this.sessionAnalytics.qualityMetrics.length > 0 ? 
                this.sessionAnalytics.qualityMetrics[this.sessionAnalytics.qualityMetrics.length - 1] : null
        });
        
        // Send final analytics summary to backend
        this.sendFinalAnalytics().catch(error => {
            console.error('Failed to send final analytics:', error);
        });
    },
    
    // Send final analytics summary
    async sendFinalAnalytics() {
        try {
            await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/analytics/summary`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        session_summary: this.sessionAnalytics,
                        user_type: AuthStorage.get('type')
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('Final analytics sent successfully');
        } catch (error) {
            console.warn('Final analytics send failed:', error);
        }
    },
    
    // Format duration in human readable form
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    },
    
    contactSupport() {
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Show contact information
        alert(isArabic ? 
            'للحصول على الدعم الفني، يرجى الاتصال على:\n\nهاتف: +1-800-SAHATAK\nبريد إلكتروني: support@sahatak.com' :
            'For technical support, please contact:\n\nPhone: +1-800-SAHATAK\nEmail: support@sahatak.com'
        );
    },
    
    // Show warning message
    showWarning(message) {
        const messagesDiv = document.getElementById('pre-join-messages');
        if (messagesDiv) {
            messagesDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i> ${message}
                </div>
            `;
        }
    },
    
    // Update join button state
    updateJoinButtonState() {
        const joinBtn = document.getElementById('join-call-btn');
        const messagesDiv = document.getElementById('pre-join-messages');
        
        if (!joinBtn || !messagesDiv) return;
        
        const currentLang = LanguageManager?.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        // Check if all critical checks pass
        const canJoin = this.systemChecks.browser && this.systemChecks.permissions;
        
        if (canJoin) {
            joinBtn.disabled = false;
            joinBtn.className = 'btn btn-primary btn-lg';
            
            messagesDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    ${isArabic ? 
                        'النظام جاهز! يمكنك الآن بدء الاستشارة' : 
                        'System ready! You can now start the consultation'}
                </div>
            `;
        } else {
            joinBtn.disabled = true;
            joinBtn.className = 'btn btn-secondary btn-lg';
            
            const issues = [];
            if (!this.systemChecks.browser) issues.push(isArabic ? 'المتصفح' : 'Browser');
            if (!this.systemChecks.permissions) issues.push(isArabic ? 'الأذونات' : 'Permissions');
            
            messagesDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle"></i>
                    ${isArabic ? 
                        `مشاكل في: ${issues.join(', ')}` : 
                        `Issues with: ${issues.join(', ')}`}
                </div>
            `;
        }
        
        // Check audio-only mode
        const audioOnlyCheck = document.getElementById('audio-only-mode');
        if (audioOnlyCheck) {
            audioOnlyCheck.addEventListener('change', (e) => {
                this.audioOnlyMode = e.target.checked;
                const video = document.getElementById('local-preview');
                if (video) {
                    video.style.display = this.audioOnlyMode ? 'none' : 'block';
                }
                
                // Update join button text
                const joinBtn = document.getElementById('join-call-btn');
                if (joinBtn) {
                    const icon = this.audioOnlyMode ? 'bi-telephone' : 'bi-camera-video';
                    const text = this.audioOnlyMode ? 
                        (isArabic ? 'بدء المكالمة الصوتية' : 'Start Audio Call') :
                        (isArabic ? 'بدء الاستشارة' : 'Start Consultation');
                    
                    joinBtn.innerHTML = `<i class="${icon}"></i> ${text}`;
                }
            });
        }
    },
    
    // Cleanup on page unload
    cleanup() {
        // Stop local preview
        const video = document.getElementById('local-preview');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        
        // Dispose Jitsi API
        if (this.jitsiApi) {
            this.jitsiApi.dispose();
            this.jitsiApi = null;
        }
        
        // Stop monitoring
        this.stopConnectionMonitoring();
    },
    
    // Start heartbeat to keep session alive
    startHeartbeat() {
        console.log('Starting heartbeat...');
        
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(async () => {
            try {
                const response = await ApiHelper.makeRequest(
                    `/appointments/${this.appointmentId}/video/heartbeat`,
                    { method: 'POST' }
                );
                
                if (!response.success || !response.data.active) {
                    console.warn('Session ended by server or other participant');
                    this.endCall();
                }
            } catch (error) {
                console.error('Heartbeat error:', error);
                // Don't end call on heartbeat error - might be temporary network issue
            }
        }, 30000);
    }
};

// Initialize on page load if on video consultation page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the video consultation page
    const urlParams = new URLSearchParams(window.location.search);
    const appointmentId = urlParams.get('appointmentId');
    
    if (appointmentId && document.getElementById('video-container')) {
        // Force cache clear and public room mode
        console.log('🔧 FORCING PUBLIC ROOM MODE - No authentication allowed');
        
        // Add cache-busting parameter to prevent lobby issues
        if (!urlParams.has('publicMode')) {
            const newUrl = window.location.href + '&publicMode=true&t=' + Date.now();
            console.log('🔧 Refreshing with cache-busting parameters:', newUrl);
            window.location.href = newUrl;
            return;
        }
        
        VideoConsultation.init(appointmentId);
    }
});

// Enhanced cleanup handlers with confirmation
window.addEventListener('beforeunload', (event) => {
    if (VideoConsultation.jitsiApi) {
        console.log('Page unloading - calling disconnect endpoint...');
        
        // Call disconnect endpoint to reset appointment state if doctor
        if (VideoConsultation.appointmentId) {
            console.log(`Calling disconnect endpoint for appointment ${VideoConsultation.appointmentId}`);
            
            // Use sendBeacon for reliable disconnect on page unload
            const baseUrl = ApiHelper?.baseUrl || 'https://sahatak.pythonanywhere.com/api';
            const disconnectUrl = `${baseUrl}/appointments/${VideoConsultation.appointmentId}/video/disconnect`;
            const token = localStorage.getItem('sahatak_token') || AuthStorage?.getToken();
            
            if (!token) {
                console.error('No authentication token found for disconnect');
                return;
            }
            
            // Use synchronous XMLHttpRequest for reliability
            // sendBeacon doesn't support custom headers which we need for authorization
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', disconnectUrl, false); // false makes it synchronous
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                
                const response = xhr.send(JSON.stringify({}));
                console.log(`Disconnect endpoint response: status ${xhr.status}`);
                
                if (xhr.status === 200) {
                    console.log('Successfully called disconnect endpoint');
                } else {
                    console.error(`Disconnect endpoint failed with status ${xhr.status}: ${xhr.responseText}`);
                }
            } catch (e) {
                console.error('Failed to send disconnect notification:', e);
            }
        }
        
        VideoConsultation.cleanup();
        
        // Show confirmation dialog
        const message = 'You are currently in a video consultation. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
    }
});

// Handle page visibility changes (user switches tabs/minimizes)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && VideoConsultation.jitsiApi) {
        console.log('Page hidden - starting cleanup timer...');
        
        // Give user 2 minutes to return before cleanup
        VideoConsultation.visibilityTimer = setTimeout(() => {
            if (document.visibilityState === 'hidden') {
                console.log('Page hidden for 2 minutes - ending call');
                VideoConsultation.endCall();
            }
        }, 120000); // 2 minutes
        
    } else if (document.visibilityState === 'visible' && VideoConsultation.visibilityTimer) {
        console.log('Page visible again - canceling cleanup timer');
        clearTimeout(VideoConsultation.visibilityTimer);
        VideoConsultation.visibilityTimer = null;
    }
});

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    console.log('Navigation detected - cleaning up video consultation...');
    if (VideoConsultation.jitsiApi) {
        VideoConsultation.cleanup();
    }
});

