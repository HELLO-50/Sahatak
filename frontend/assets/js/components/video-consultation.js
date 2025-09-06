// Video Consultation Component - Following main.js patterns
const VideoConsultation = {
    appointmentId: null,
    roomName: null,
    jitsiApi: null,
    sessionData: null,
    connectionCheckInterval: null,
    
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
                
                <div class="device-check mb-4">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="bi bi-camera-video fs-1 mb-2"></i>
                                    <h5>${isArabic ? 'الكاميرا' : 'Camera'}</h5>
                                    <video id="local-preview" autoplay muted class="w-100 mb-2" style="max-height: 200px;"></video>
                                    <select id="camera-select" class="form-select"></select>
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
                                    </div>
                                    <select id="mic-select" class="form-select"></select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center">
                    <button id="test-devices-btn" class="btn btn-secondary me-2">
                        <i class="bi bi-gear"></i> ${isArabic ? 'اختبار الأجهزة' : 'Test Devices'}
                    </button>
                    <button id="join-call-btn" class="btn btn-primary btn-lg">
                        <i class="bi bi-camera-video"></i> ${isArabic ? 'بدء الاستشارة' : 'Start Consultation'}
                    </button>
                </div>
                
                <div class="alert alert-info mt-3">
                    <i class="bi bi-info-circle"></i>
                    ${isArabic ? 
                        'تأكد من أن الكاميرا والميكروفون يعملان بشكل صحيح قبل البدء' : 
                        'Please ensure your camera and microphone are working properly before starting'}
                </div>
            </div>
        `;
        
        // Start device enumeration
        this.enumerateDevices();
        this.startLocalPreview();
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