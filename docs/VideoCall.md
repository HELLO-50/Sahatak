# Video Call Implementation - Sahatak Platform

This document provides a comprehensive guide to the video consultation feature implementation in the Sahatak healthcare platform, explaining all technical components, workflows, and configurations with proper code references and detailed function explanations.

## Overview

The Sahatak platform implements video consultations using **Jitsi Meet**, an open-source video solution. The implementation uses public Jitsi servers (meet.ffmuc.net as primary) to provide free video calls between doctors and patients with features like device testing, connection quality monitoring, and automatic fallback mechanisms.

**Main Implementation File**: `frontend/assets/js/components/video-consultation.js`

## Architecture Overview

### Technology Stack
```
Video Call Technology Stack
├── Frontend (Client-Side)
│   ├── HTML/CSS/JavaScript (Native)
│   ├── Jitsi Meet External API (Loaded dynamically from public servers)
│   ├── WebRTC for browser communication
│   └── Bootstrap for responsive UI
├── Backend (Server-Side)
│   ├── Python Flask for session management
│   ├── SQLite database for appointment tracking
│   └── RESTful API endpoints for configuration
├── External Services (Free/Public)
│   ├── Public Jitsi Meet Servers (meet.ffmuc.net, jitsi.riot.im, meet.jit.si)
```

---

## Core Components and Code Structure

### 1. Main Video Consultation Object
**Location**: `frontend/assets/js/components/video-consultation.js:1-46`

```javascript
// Main VideoConsultation object structure from actual file
const VideoConsultation = {
    appointmentId: null,        // Current appointment ID
    roomName: null,             // Jitsi room name
    jitsiApi: null,            // Jitsi API instance
    sessionData: null,         // Session configuration data
    connectionCheckInterval: null,  // Interval for connection monitoring
    
    // System check results
    systemChecks: {
        browser: false,         // Browser compatibility status
        network: false,         // Network quality status  
        permissions: false      // Camera/mic permissions status
    },
    
    audioOnlyMode: false,      // Flag for audio-only mode
    
    // Reconnection management (lines 15-17)
    reconnectionAttempts: 0,
    maxReconnectionAttempts: 3,
    
    // Analytics tracking object (lines 19-31)
    sessionAnalytics: {
        sessionId: null,
        startTime: null,
        endTime: null,
        duration: 0,
        connectionEvents: [],    // Track connection state changes
        qualityMetrics: [],     // Track quality measurements
        participantEvents: [],  // Track who joins/leaves
        errorEvents: [],        // Track any errors
        deviceChanges: [],      // Track device switches
        networkChanges: []      // Track network quality changes
    }
}
```

**Function Explanation - translate() (lines 40-45)**:
```javascript
// Helper function to get translations using LanguageManager
translate(key, fallback = null) {
    // Check if LanguageManager exists and has translate method
    if (LanguageManager && LanguageManager.translate) {
        // Try to get translation, use fallback if not found
        return LanguageManager.translate(key) || fallback || key;
    }
    // Return fallback or key if LanguageManager not available
    return fallback || key;
}
```
This function integrates with the platform's language system to provide Arabic/English translations.

### 2. Initialization Flow
**Location**: `frontend/assets/js/components/video-consultation.js:47-61`

```javascript
// Initialize video consultation for an appointment
async init(appointmentId) {
    this.appointmentId = appointmentId;
    
    // Clear any cached data to prevent lobby issues (line 52)
    // This is important to avoid Jitsi lobby problems
    
    // Initialize analytics tracking
    this.initSessionAnalytics();
    
    // IMPORTANT: Lines 56-57 show we skip backend status check
    // Using public Jitsi servers for free video consultations
    
    // Setup UI event listeners and show device setup screen
    this.setupEventListeners();
    this.showPreJoinScreen();
}
```

### 3. Audio Level Monitoring Implementation
**Location**: `frontend/assets/js/components/video-consultation.js:492-522`

```javascript
setupAudioLevelMonitoring(stream) {
    // Get audio track from stream
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    
    // Create Web Audio API context for analysis
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    // Configure analyser
    analyser.smoothingTimeConstant = 0.8;  // Smoothing for visual display
    analyser.fftSize = 1024;                // Frequency data size
    
    // Connect microphone to analyser
    microphone.connect(analyser);
    
    // Animation loop to update level display
    const updateLevel = () => {
        // Get frequency data
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const percentage = (average / 255) * 100;
        
        // Update progress bar width
        const levelBar = document.getElementById('audio-level');
        if (levelBar) {
            levelBar.style.width = percentage + '%';
        }
        
        // Continue animation
        requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
}
```

### 4. Video Session Creation
**Location**: `frontend/assets/js/components/video-consultation.js:524-591`

```javascript
async startVideoSession() {
    try {
        // Show loading indicator
        this.showLoading();
        
        // IMPORTANT COMMENT (line 531):
        // "BYPASS BACKEND - Use direct public room creation for free Jitsi"
        // Using public Jitsi rooms for free video consultations
        
        // Create deterministic room name (line 533)
        // Using appointment ID ensures doctor and patient join same room
        const publicRoomName = `sahatak_appointment_${this.appointmentId}`;
        
        // Build session configuration (lines 535-577)
        const publicSessionData = {
            room_name: publicRoomName,
            jitsi_domain: null, // Will be loaded from backend .env
            jwt_token: null,    // Public rooms don't use authentication
            config: {
                // CRITICAL: Disable all lobby features (lines 546-559)
                // This prevents users getting stuck in lobby
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
                // Public room configuration (no authentication needed)
                disableLobby: true,
                
                // Other important settings
                startWithVideoMuted: this.audioOnlyMode || false,
                enableInsecureRoomNameWarning: false,
                enableGuestDomain: true
            },
            interface_config: {
                // Toolbar buttons configuration (lines 567-570)
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'chat', 
                    'raisehand', 'participants-pane', 'tileview', 
                    'toggle-camera', 'hangup'
                ],
                // Disable Jitsi branding (lines 573-575)
                SHOW_POWERED_BY: false,
                SHOW_JITSI_WATERMARK: false
            }
        };
        
        // Initialize Jitsi with this configuration
        await this.initJitsi(publicSessionData);
        
    } catch (error) {
        console.error('Start video session error:', error);
        this.showError('Failed to start video session');
    }
}
```

### 5. Jitsi Initialization
**Location**: `frontend/assets/js/components/video-consultation.js:593-700`

```javascript
async initJitsi(sessionData) {
    const container = document.getElementById('video-container');
    if (!container) return;
    
    // Clear container and add Jitsi div (line 599)
    container.innerHTML = '<div id="jitsi-container" style="height: 100vh;"></div>';
    
    // CRITICAL SECTION (lines 601-628):
    // Load configuration from backend - MUST use .env settings
    let backendConfig = null;
    let domain = null;
    
    try {
        // Get language for localization
        const currentLang = LanguageManager?.getLanguage() || 'en';
        
        // Fetch Jitsi configuration from backend (lines 608-611)
        const configResponse = await ApiHelper.makeRequest(
            `/appointments/${this.appointmentId}/video/config?lang=${currentLang}`,
            { method: 'GET' }
        );
        
        backendConfig = configResponse.data;
        
        // IMPORTANT (lines 615-618):
        // Domain MUST come from backend .env file
        if (!backendConfig?.jitsi_domain) {
            throw new Error('Backend did not provide jitsi_domain - check .env configuration');
        }
        
        domain = backendConfig.jitsi_domain;
        
        // Dynamically load Jitsi API for this domain (line 623)
        await this.loadJitsiExternalAPI(domain);
        
    } catch (error) {
        // Cannot proceed without backend configuration
        console.error('CRITICAL: Failed to load config from backend:', error);
        throw new Error('Cannot proceed without backend configuration - check server and .env file');
    }
    
    // Create room name (line 664)
    const publicRoomName = `sahatak_appointment_${this.appointmentId}`;
    
    // Build Jitsi options (lines 673-682)
    const options = {
        roomName: publicRoomName,
        parentNode: document.getElementById('jitsi-container'),
        userInfo: {
            // Include appointment ID in display name for identification
            displayName: `${AuthStorage.get('name') || 'User'} (Appointment ${this.appointmentId})`
        },
        configOverwrite: finalConfig,
        interfaceConfigOverwrite: defaultInterfaceConfig
        // NOTE: Public Jitsi rooms don't require tokens
    };
    
    try {
        // Create Jitsi API instance (line 688)
        this.jitsiApi = new JitsiMeetExternalAPI(domain, options);
        
        // Setup event handlers for Jitsi events
        this.setupJitsiEventHandlers();
        
    } catch (initError) {
        console.error('Jitsi initialization failed:', initError);
        
        // Retry logic if initialization fails (lines 698-699)
        if (initError.message && initError.message.includes('membersOnly')) {
            setTimeout(() => this.retryWithFallbackConfig(), 1000);
        }
    }
}
```

---

## Backend API Endpoints

### Configuration Endpoint
**File**: `backend/routes/appointments.py:1418-1475`
**Endpoint**: `/api/appointments/{id}/video/config`
**Method**: GET
**Purpose**: Provides Jitsi configuration from .env file

```python
@appointments_bp.route('/<int:appointment_id>/video/config', methods=['GET'])
def get_video_config(appointment_id):
    """
    Get Jitsi configuration for video consultation (public endpoint)
    
    This endpoint loads all Jitsi configuration from environment variables
    to ensure consistent settings between backend and frontend.
    No authentication required for public video consultation access.
    """
    try:
        # Get appointment to verify it exists
        appointment = Appointment.query.filter_by(id=appointment_id).first()
        
        if not appointment:
            return APIResponse.not_found(message='Appointment not found')
        
        from services.video_conf_service import VideoConferenceService
        import os
        
        # Get language from query parameter or default to 'en'
        language = request.args.get('lang', 'en')
        
        # Get Jitsi configuration from environment
        config = VideoConferenceService.get_jitsi_config(language)
        interface_config = VideoConferenceService.get_interface_config()
        
        # Get domain and other settings from environment
        jitsi_domain = os.getenv('JITSI_DOMAIN', 'meet.jit.si')
        app_id = os.getenv('JITSI_APP_ID', '')
        
        response_data = {
            'jitsi_domain': jitsi_domain,
            'app_id': app_id,
            'config': config,
            'interface_config': interface_config,
            'room_prefix': os.getenv('JITSI_ROOM_PREFIX', 'sahatak_consultation_'),
            'max_duration_minutes': int(os.getenv('VIDEO_CALL_MAX_DURATION_MINUTES', '60')),
            'features': {
                'recording_enabled': os.getenv('VIDEO_CALL_RECORDING_ENABLED', 'false').lower() == 'true',
                'lobby_enabled': os.getenv('VIDEO_CALL_LOBBY_ENABLED', 'false').lower() == 'true',
                'password_protection': os.getenv('VIDEO_CALL_PASSWORD_PROTECTED', 'false').lower() == 'true',
                'guest_access': os.getenv('JITSI_GUEST_ACCESS_ENABLED', 'true').lower() == 'true',
                'moderator_rights_required': os.getenv('JITSI_MODERATOR_RIGHTS_REQUIRED', 'false').lower() == 'true',
                'e2ee_enabled': os.getenv('JITSI_ENABLE_E2EE', 'true').lower() == 'true',
                'chat_enabled': os.getenv('JITSI_ENABLE_CHAT', 'true').lower() == 'true',
                'screen_sharing_enabled': os.getenv('JITSI_ENABLE_SCREEN_SHARING', 'true').lower() == 'true',
                'audio_only_mode': os.getenv('JITSI_ENABLE_AUDIO_ONLY_MODE', 'true').lower() == 'true'
            }
        }
        
        return APIResponse.success(
            data=response_data,
            message='Video configuration retrieved successfully'
        )
```

### Session Status Endpoint
**File**: `backend/routes/appointments.py:1160-1209`
**Endpoint**: `/api/appointments/{id}/video/status`
**Method**: GET
**Purpose**: Check if video session can be started/joined (requires authentication)

```python
@appointments_bp.route('/<int:appointment_id>/video/status', methods=['GET'])
@api_login_required
def get_video_session_status(appointment_id):
    """Get current video session status"""
    try:
        # Get appointment
        appointment = Appointment.query.filter_by(id=appointment_id).first()
        
        if not appointment:
            return APIResponse.not_found(message='Appointment not found')
        
        # Verify user is participant
        is_authorized = False
        if current_user.user_type == 'doctor':
            doctor = Doctor.query.filter_by(user_id=current_user.id).first()
            is_authorized = doctor and appointment.doctor_id == doctor.id
        elif current_user.user_type == 'patient':
            patient = Patient.query.filter_by(user_id=current_user.id).first()
            is_authorized = patient and appointment.patient_id == patient.id
        
        if not is_authorized:
            return APIResponse.forbidden(message='You are not authorized for this appointment')
        
        # Check if session can be started
        from services.video_conf_service import VideoConferenceService
        
        # Doctors can always rejoin in_progress sessions
        if current_user.user_type == 'doctor' and appointment.status == 'in_progress':
            can_start = True
            timing_message = "Doctor can rejoin in-progress session"
        else:
            # Apply timing validation for other cases
            can_start, timing_message = VideoConferenceService.validate_session_timing(
                appointment.appointment_date,
                current_app.config.get('JITSI_SESSION_BUFFER_MINUTES', 15)
            )
        
        return APIResponse.success(
            data={
                'session_id': appointment.session_id,
                'session_status': appointment.session_status,
                'appointment_status': appointment.status,
                'can_start': can_start,
                'timing_message': timing_message,
                'session_started_at': appointment.session_started_at.isoformat() if appointment.session_started_at else None,
                'session_duration': appointment.session_duration
            },
            message='Session status retrieved successfully'
        )
```

---

## Environment Configuration

### Actual .env Variables Used
**File**: `backend/.env:141-222`

The following configuration is actually used by the system:

```bash
# Video Conferencing Configuration (Jitsi)
JITSI_DOMAIN=meet.ffmuc.net
JITSI_BACKUP_DOMAINS=jitsi.riot.im,meet.jit.si
JITSI_APP_ID=sahatak_telemedicine

# Video Call Settings
VIDEO_CALL_MAX_DURATION_MINUTES=60
VIDEO_CALL_RECORDING_ENABLED=false
VIDEO_CALL_LOBBY_ENABLED=false
VIDEO_CALL_PASSWORD_PROTECTED=false

# Jitsi Room Configuration
JITSI_ROOM_PREFIX=sahatak_consultation_
JITSI_REQUIRE_DISPLAY_NAME=true
JITSI_ENABLE_CHAT=true
JITSI_ENABLE_SCREEN_SHARING=true
JITSI_ENABLE_FILE_SHARING=false

# Video Quality Settings
JITSI_DEFAULT_VIDEO_QUALITY=720
JITSI_MAX_VIDEO_QUALITY=1080
JITSI_ENABLE_AUDIO_ONLY_MODE=true

# Security Settings for Video Calls
JITSI_ENABLE_E2EE=false
JITSI_MODERATOR_RIGHTS_REQUIRED=false
JITSI_GUEST_ACCESS_ENABLED=true

# Authentication & Lobby Settings (DISABLED for public Jitsi)
JITSI_AUTHENTICATION_ENABLED=false
JITSI_LOBBY_ENABLED=false
JITSI_LOBBY_CHAT_ENABLED=false
JITSI_REQUIRE_AUTH=false
JITSI_ENABLE_USER_ROLES=false
JITSI_PREJOIN_ENABLED=false
JITSI_KNOCKING_ENABLED=false
JITSI_ENABLE_KNOCKING=false
JITSI_LOBBY_MODE_ENABLED=false
JITSI_MODERATION_ENABLED=false

# Guest & Public Access Settings
JITSI_GUEST_DOMAIN_ENABLED=true
JITSI_ALLOW_GUESTS=true
JITSI_PUBLIC_ROOM_ACCESS=true
JITSI_DISABLE_MODERATOR_INDICATOR=true
JITSI_DISABLE_REMOTE_MUTE=true

# UI & Interface Settings
JITSI_HIDE_INVITE_FUNCTIONS=true
JITSI_DISABLE_PROFILE=false
JITSI_DISABLE_DEEP_LINKING=true
JITSI_SHOW_WATERMARK=false
JITSI_SHOW_POWERED_BY=false
```

---

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. "Waiting for Host" or Lobby Issues
**Problem**: Users get stuck in Jitsi lobby
**Solution**: The .env configuration disables all lobby features:
```bash
JITSI_LOBBY_ENABLED=false
JITSI_AUTHENTICATION_ENABLED=false
JITSI_GUEST_ACCESS_ENABLED=true
```

#### 2. Cannot Connect to Video
**Problem**: Video session fails to start
**Solutions**:
- Check JITSI_DOMAIN in backend/.env file (currently set to meet.ffmuc.net)
- Verify internet connectivity
- Ensure WebRTC is not blocked by firewall
- Try different browser

#### 3. Poor Video Quality
**Problem**: Video is pixelated or laggy
**Solutions**:
- Check network bandwidth
- The system auto-adjusts quality based on connection
- Switch to audio-only mode via the pre-join interface
- Close other bandwidth-consuming applications

#### 4. Permission Errors
**Problem**: Cannot access camera/microphone
**Solutions**:
- Check browser permissions in settings
- Ensure no other app is using the devices
- Try incognito/private browsing mode
- Restart browser

---

## Summary

This video consultation implementation uses public Jitsi Meet servers to provide free video calls for the Sahatak telemedicine platform. The system is configured to avoid all authentication and lobby features to ensure smooth access.

### Key Implementation Points:

1. **Public Jitsi Servers**: Uses meet.ffmuc.net as primary with fallbacks
2. **No Authentication**: All rooms are public and accessible without tokens
3. **Deterministic Room Names**: Based on appointment ID so doctor and patient join same room
4. **Lobby Avoidance**: All lobby features disabled in .env configuration
5. **Device Management**: Comprehensive device testing before joining calls
6. **Quality Monitoring**: Automatic quality adjustment based on connection
7. **Language Support**: Full Arabic/English translation support

### File References:
- **Main Implementation**: `frontend/assets/js/components/video-consultation.js`
- **Backend Config**: `backend/routes/appointments.py:1418-1475`
- **Environment Settings**: `backend/.env:141-222`

For additional information, refer to:
- [Jitsi Meet API Documentation](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe)
- [WebRTC Documentation](https://webrtc.org/)
- Platform documentation in `/docs` folder