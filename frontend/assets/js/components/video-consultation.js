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
    
    // Initialize video consultation
    async init(appointmentId) {
        this.appointmentId = appointmentId;
        
        // Check session status first
        const statusCheck = await this.checkSessionStatus();
        if (!statusCheck.success) {
            this.showError(statusCheck.message);
            return;
        }
        
        // Setup UI elements
        this.setupEventListeners();
        this.showPreJoinScreen();
    },
    
    // Check if session can be started/joined
    async checkSessionStatus() {
        try {
            const response = await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/status`,
                'GET'
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
        
        const currentLang = LanguageManager.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        container.innerHTML = `
            <div class="pre-join-screen">
                <h3 class="mb-4">${isArabic ? 'الاستعداد للاستشارة' : 'Preparing for Consultation'}</h3>
                
                <!-- System Check Results -->
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div id="browser-check">
                                    <i class="bi bi-browser-chrome fs-1 mb-2"></i>
                                    <h6>${isArabic ? 'متصفح الويب' : 'Browser'}</h6>
                                    <div class="spinner-border spinner-border-sm" role="status"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div id="network-check">
                                    <i class="bi bi-wifi fs-1 mb-2"></i>
                                    <h6>${isArabic ? 'جودة الشبكة' : 'Network Quality'}</h6>
                                    <div class="spinner-border spinner-border-sm" role="status"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body text-center">
                                <div id="permissions-check">
                                    <i class="bi bi-shield-check fs-1 mb-2"></i>
                                    <h6>${isArabic ? 'الأذونات' : 'Permissions'}</h6>
                                    <div class="spinner-border spinner-border-sm" role="status"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Device Setup -->
                <div class="device-check mb-4">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="bi bi-camera-video fs-1 mb-2"></i>
                                    <h5>${isArabic ? 'الكاميرا' : 'Camera'}</h5>
                                    <video id="local-preview" autoplay muted class="w-100 mb-2" style="max-height: 200px; border-radius: 8px;"></video>
                                    <select id="camera-select" class="form-select mb-2"></select>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="audio-only-mode">
                                        <label class="form-check-label" for="audio-only-mode">
                                            ${isArabic ? 'صوت فقط' : 'Audio Only'}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="bi bi-mic fs-1 mb-2"></i>
                                    <h5>${isArabic ? 'الميكروفون' : 'Microphone'}</h5>
                                    <div class="audio-meter mb-3">
                                        <div class="progress">
                                            <div id="audio-level" class="progress-bar bg-success" style="width: 0%"></div>
                                        </div>
                                        <small class="text-muted">${isArabic ? 'تحدث لاختبار الصوت' : 'Speak to test audio'}</small>
                                    </div>
                                    <select id="mic-select" class="form-select mb-2"></select>
                                    <select id="speaker-select" class="form-select">
                                        <option value="">${isArabic ? 'اختر مكبر الصوت' : 'Select Speaker'}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Control Buttons -->
                <div class="text-center">
                    <button id="refresh-check-btn" class="btn btn-outline-secondary me-2">
                        <i class="bi bi-arrow-clockwise"></i> ${isArabic ? 'إعادة فحص' : 'Refresh Check'}
                    </button>
                    <button id="test-devices-btn" class="btn btn-secondary me-2">
                        <i class="bi bi-gear"></i> ${isArabic ? 'اختبار الأجهزة' : 'Test Devices'}
                    </button>
                    <button id="join-call-btn" class="btn btn-primary btn-lg" disabled>
                        <i class="bi bi-camera-video"></i> ${isArabic ? 'بدء الاستشارة' : 'Start Consultation'}
                    </button>
                </div>
                
                <!-- Status Messages -->
                <div id="pre-join-messages" class="mt-3">
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle"></i>
                        ${isArabic ? 
                            'جاري فحص النظام والأجهزة...' : 
                            'Checking system and devices...'}
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
            
            const currentLang = LanguageManager.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            if (hasWebRTC && isSupported) {
                browserCheck.innerHTML = `
                    <i class="bi bi-check-circle-fill text-success fs-1 mb-2"></i>
                    <h6>${isArabic ? 'متصفح الويب' : 'Browser'}</h6>
                    <small class="text-success">${browserName} ✓</small>
                `;
                this.systemChecks.browser = true;
            } else {
                browserCheck.innerHTML = `
                    <i class="bi bi-x-circle-fill text-danger fs-1 mb-2"></i>
                    <h6>${isArabic ? 'متصفح الويب' : 'Browser'}</h6>
                    <small class="text-danger">${isArabic ? 'غير مدعوم' : 'Not Supported'}</small>
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
            
            const currentLang = LanguageManager.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            let qualityText = '';
            let qualityClass = '';
            
            if (latency < 200) {
                qualityText = isArabic ? 'ممتازة' : 'Excellent';
                qualityClass = 'text-success';
                this.systemChecks.network = true;
            } else if (latency < 500) {
                qualityText = isArabic ? 'جيدة' : 'Good';
                qualityClass = 'text-info';
                this.systemChecks.network = true;
            } else if (latency < 1000) {
                qualityText = isArabic ? 'متوسطة' : 'Fair';
                qualityClass = 'text-warning';
                this.systemChecks.network = true;
            } else {
                qualityText = isArabic ? 'ضعيفة' : 'Poor';
                qualityClass = 'text-danger';
                this.systemChecks.network = false;
            }
            
            networkCheck.innerHTML = `
                <i class="bi bi-wifi fs-1 mb-2 ${qualityClass}"></i>
                <h6>${isArabic ? 'جودة الشبكة' : 'Network Quality'}</h6>
                <small class="${qualityClass}">${qualityText}</small>
                <div><small class="text-muted">${Math.round(latency)}ms</small></div>
            `;
            
        } catch (error) {
            console.error('Network check error:', error);
            const currentLang = LanguageManager.getLanguage() || 'en';
            const isArabic = currentLang === 'ar';
            
            networkCheck.innerHTML = `
                <i class="bi bi-wifi-off text-warning fs-1 mb-2"></i>
                <h6>${isArabic ? 'جودة الشبكة' : 'Network Quality'}</h6>
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
            
            const currentLang = LanguageManager.getLanguage() || 'en';
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
            const currentLang = LanguageManager.getLanguage() || 'en';
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
            
            // Determine if starting or joining
            const userType = AuthStorage.getUserType();
            const endpoint = userType === 'doctor' ? 
                `/appointments/${this.appointmentId}/video/start` :
                `/appointments/${this.appointmentId}/video/join`;
            
            const response = await ApiHelper.makeRequest(endpoint, 'POST');
            
            if (!response.success) {
                this.showError(response.message);
                return;
            }
            
            // Store session data
            this.sessionData = response.data;
            this.roomName = response.data.room_name;
            
            // Initialize Jitsi
            this.initJitsi(response.data);
            
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
        
        // Merge configurations
        const options = {
            roomName: sessionData.room_name,
            parentNode: document.getElementById('jitsi-container'),
            userInfo: {
                displayName: AuthStorage.getUser()?.full_name || 'User'
            },
            configOverwrite: sessionData.config || {},
            interfaceConfigOverwrite: sessionData.interface_config || {},
            jwt: sessionData.jwt_token || undefined
        };
        
        // Initialize Jitsi API
        this.jitsiApi = new JitsiMeetExternalAPI(domain, options);
        
        // Setup event handlers
        this.setupJitsiEventHandlers();
    },
    
    // Setup Jitsi event handlers
    setupJitsiEventHandlers() {
        if (!this.jitsiApi) return;
        
        // Video conference joined
        this.jitsiApi.addEventListener('videoConferenceJoined', (e) => {
            console.log('Joined conference:', e);
            this.onConferenceJoined();
        });
        
        // Video conference left
        this.jitsiApi.addEventListener('videoConferenceLeft', (e) => {
            console.log('Left conference:', e);
            this.onConferenceLeft();
        });
        
        // Participant joined
        this.jitsiApi.addEventListener('participantJoined', (e) => {
            console.log('Participant joined:', e);
            this.showNotification('Participant joined the call');
        });
        
        // Participant left
        this.jitsiApi.addEventListener('participantLeft', (e) => {
            console.log('Participant left:', e);
            this.showNotification('Participant left the call');
        });
        
        // Connection quality
        this.jitsiApi.addEventListener('connectionQualityChanged', (e) => {
            console.log('Connection quality:', e);
            this.updateConnectionQuality(e);
        });
        
        // Error handling
        this.jitsiApi.addEventListener('errorOccurred', (e) => {
            console.error('Jitsi error:', e);
            this.handleJitsiError(e);
        });
    },
    
    // Conference joined handler
    onConferenceJoined() {
        // Start monitoring connection
        this.startConnectionMonitoring();
        
        // Update UI
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerHTML = '<span class="badge bg-success">Connected</span>';
        }
    },
    
    // Conference left handler
    async onConferenceLeft() {
        // Stop monitoring
        this.stopConnectionMonitoring();
        
        // End session on backend
        await this.endVideoSession();
        
        // Show post-call screen
        this.showPostCallScreen();
    },
    
    // End video session
    async endVideoSession() {
        try {
            await ApiHelper.makeRequest(
                `/appointments/${this.appointmentId}/video/end`,
                'POST'
            );
        } catch (error) {
            console.error('End session error:', error);
        }
    },
    
    // Show post-call screen
    showPostCallScreen() {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        const currentLang = LanguageManager.getLanguage() || 'en';
        const isArabic = currentLang === 'ar';
        
        container.innerHTML = `
            <div class="post-call-screen text-center py-5">
                <i class="bi bi-check-circle text-success" style="font-size: 4rem;"></i>
                <h3 class="mt-3">${isArabic ? 'انتهت الاستشارة' : 'Consultation Ended'}</h3>
                <p>${isArabic ? 'شكراً لاستخدامك خدماتنا' : 'Thank you for using our services'}</p>
                
                <div class="mt-4">
                    <a href="/pages/appointments/appointment-list.html" class="btn btn-primary">
                        ${isArabic ? 'العودة إلى المواعيد' : 'Back to Appointments'}
                    </a>
                </div>
            </div>
        `;
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
    
    // End call
    endCall() {
        if (this.jitsiApi) {
            this.jitsiApi.executeCommand('hangup');
        }
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
    
    // Handle Jitsi errors
    handleJitsiError(error) {
        console.error('Jitsi error:', error);
        
        // Check error type
        if (error.type === 'connection.dropped') {
            this.showError('Connection lost. Trying to reconnect...');
            // Attempt reconnection
            setTimeout(() => this.reconnect(), 3000);
        } else {
            this.showError('An error occurred during the video call');
        }
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
        }
    },
    
    // Show loading state
    showLoading() {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Connecting to video session...</p>
            </div>
        `;
    },
    
    // Show error message
    showError(message) {
        const container = document.getElementById('video-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> ${message}
            </div>
        `;
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
        
        const currentLang = LanguageManager.getLanguage() || 'en';
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
    }
};

// Initialize on page load if on video consultation page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the video consultation page
    const urlParams = new URLSearchParams(window.location.search);
    const appointmentId = urlParams.get('appointmentId');
    
    if (appointmentId && document.getElementById('video-container')) {
        VideoConsultation.init(appointmentId);
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    VideoConsultation.cleanup();
});