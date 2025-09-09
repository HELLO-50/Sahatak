"""
Video Conference Service using Jitsi Meet
Handles JWT token generation and room management for video consultations
"""

import jwt
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from utils.logging_config import app_logger


class VideoConferenceService:
    """Service for managing Jitsi Meet video consultations"""
    
    @staticmethod
    def generate_room_name(appointment_id: int) -> str:
        """
        Generate a unique room name for the appointment
        Format: sahatak-{appointment_id}-{hash}
        """
        # Create a unique hash based on appointment ID and timestamp
        hash_input = f"{appointment_id}-{int(time.time())}"
        room_hash = hashlib.md5(hash_input.encode()).hexdigest()[:8]
        room_name = f"sahatak-{appointment_id}-{room_hash}"
        
        app_logger.info(f"Generated Jitsi room name: {room_name} for appointment {appointment_id}")
        return room_name
    
    @staticmethod
    def generate_jwt_token(
        room_name: str,
        user_id: int,
        user_name: str,
        user_email: str,
        is_moderator: bool = False,
        app_id: Optional[str] = None,
        app_secret: Optional[str] = None,
        duration_minutes: int = 120
    ) -> Optional[str]:
        """
        Generate JWT token for Jitsi authentication
        
        Args:
            room_name: The Jitsi room name
            user_id: User ID
            user_name: Display name in the meeting
            user_email: User email
            is_moderator: Whether user has moderator privileges
            app_id: Jitsi app ID (optional for meet.jit.si)
            app_secret: Jitsi app secret (optional for meet.jit.si)
            duration_minutes: Token validity duration
            
        Returns:
            JWT token string or None if using public Jitsi
        """
        # If no app_id or app_secret, we're using public Jitsi (no JWT needed)
        if not app_id or not app_secret:
            app_logger.info("Using public Jitsi server, no JWT token needed")
            return None
        
        try:
            # Current timestamp
            now = int(time.time())
            
            # Token expiration
            exp = now + (duration_minutes * 60)
            
            # JWT payload for Jitsi
            payload = {
                "context": {
                    "user": {
                        "id": str(user_id),
                        "name": user_name,
                        "email": user_email,
                        "moderator": is_moderator
                    },
                    "features": {
                        "recording": False,  # Disable recording for privacy
                        "livestreaming": False,
                        "transcription": False,
                        "outbound-call": False
                    }
                },
                "aud": "jitsi",
                "iss": app_id,
                "sub": app_id,
                "room": room_name,
                "exp": exp,
                "nbf": now - 10,  # Not before (10 seconds ago for clock skew)
                "iat": now
            }
            
            # Generate token
            token = jwt.encode(payload, app_secret, algorithm="HS256")
            
            app_logger.info(f"Generated JWT token for user {user_id} in room {room_name}")
            return token
            
        except Exception as e:
            app_logger.error(f"Error generating JWT token: {str(e)}")
            return None
    
    @staticmethod
    def get_jitsi_config(language: str = 'en') -> Dict:
        """
        Get Jitsi Meet configuration options
        
        Args:
            language: Interface language ('ar' or 'en')
            
        Returns:
            Dictionary with Jitsi configuration
        """
        config = {
            "startWithAudioMuted": False,
            "startWithVideoMuted": False,
            "disableModeratorIndicator": False,
            "enableWelcomePage": False,
            "enableClosePage": False,
            "disableInviteFunctions": True,  # Disable external invites
            "disableRemoteMute": False,
            "enableLobby": False,  # Disable waiting room for public Jitsi
            "requireDisplayName": True,
            "enableInsecureRoomNameWarning": False,
            "prejoinPageEnabled": False,  # Disable pre-join for direct access
            "disableThirdPartyRequests": True,
            "enableNoisyMicDetection": True,
            "resolution": 720,  # Default video quality
            "constraints": {
                "video": {
                    "height": {
                        "ideal": 720,
                        "max": 1080,
                        "min": 240
                    }
                }
            },
            "defaultLanguage": language,
            "enableTalkWhileMuted": False,
            "disableDeepLinking": True,
            "disableProfile": False,
            "disableRecordAudioNotification": False,
            "hiddenPrejoinButtons": ["invite"],
            "notifications": [
                "connection.CONNFAIL",
                "dialog.micNotSendingData",
                "dialog.serviceUnavailable",
                "dialog.sessTerminated"
            ]
        }
        
        return config
    
    @staticmethod
    def get_interface_config() -> Dict:
        """
        Get Jitsi Meet interface configuration
        
        Returns:
            Dictionary with interface configuration
        """
        config = {
            "TOOLBAR_BUTTONS": [
                "microphone",
                "camera",
                "desktop",  # Screen sharing for medical reports
                "fullscreen",
                "raisehand",
                "chat",
                "settings",
                "hangup",
                "stats",
                "shortcuts",
                "tileview",
                "help",
                "mute-everyone",  # For moderators
                "security"  # For moderators
            ],
            "SETTINGS_SECTIONS": [
                "devices",
                "language",
                "moderator",
                "profile"
            ],
            "SHOW_JITSI_WATERMARK": False,
            "SHOW_WATERMARK_FOR_GUESTS": False,
            "DEFAULT_REMOTE_DISPLAY_NAME": "Patient",
            "DEFAULT_LOCAL_DISPLAY_NAME": "Doctor",
            "DISABLE_VIDEO_BACKGROUND": False,
            "MOBILE_APP_PROMO": False,
            "HIDE_INVITE_MORE_HEADER": True,
            "SHOW_CHROME_EXTENSION_BANNER": False,
            "TOOLBAR_ALWAYS_VISIBLE": False,
            "TOOLBAR_TIMEOUT": 4000,
            "DISABLE_JOIN_LEAVE_NOTIFICATIONS": False,
            "SHOW_POWERED_BY": False,
            "SHOW_PROMOTIONAL_CLOSE_PAGE": False,
            "GENERATE_ROOMNAMES_ON_WELCOME_PAGE": False,
            "DISPLAY_WELCOME_FOOTER": False,
            "APP_NAME": "Sahatak Consultation",
            "NATIVE_APP_NAME": "Sahatak",
            "PROVIDER_NAME": "Sahatak Telemedicine",
            "INVITATION_POWERED_BY": False,
            "RECENT_LIST_ENABLED": False,
            "VIDEO_QUALITY_LABEL_DISABLED": False,
            "CONNECTION_INDICATOR_DISABLED": False
        }
        
        return config
    
    @staticmethod
    def validate_session_timing(appointment_datetime: datetime, buffer_minutes: int = 15) -> Tuple[bool, str]:
        """
        Validate if the current time is within the allowed session window
        
        Args:
            appointment_datetime: Scheduled appointment time
            buffer_minutes: Minutes before appointment when joining is allowed
            
        Returns:
            Tuple of (is_valid, message)
        """
        now = datetime.utcnow()
        
        # Calculate session window
        session_start = appointment_datetime - timedelta(minutes=buffer_minutes)
        session_end = appointment_datetime + timedelta(hours=2)  # 2 hour maximum session
        
        if now < session_start:
            minutes_until = int((session_start - now).total_seconds() / 60)
            if minutes_until > 60:
                hours_until = minutes_until / 60
                return False, f"Session can only be started {buffer_minutes} minutes before appointment. Please wait {hours_until:.1f} hours"
            else:
                return False, f"Session can only be started {buffer_minutes} minutes before appointment. Please wait {minutes_until} minutes"
        
        if now > session_end:
            return False, "Session window has expired"
        
        return True, "Session timing is valid"
    
    @staticmethod
    def get_participant_role(user_type: str) -> str:
        """
        Determine participant role based on user type
        
        Args:
            user_type: 'doctor', 'patient', or 'admin'
            
        Returns:
            'moderator' or 'participant'
        """
        # Doctors are moderators, patients are participants
        if user_type == 'doctor':
            return 'moderator'
        return 'participant'
    
    @staticmethod
    def format_session_response(
        room_name: str,
        jwt_token: Optional[str],
        jitsi_domain: str,
        participant_role: str,
        config: Dict,
        interface_config: Dict
    ) -> Dict:
        """
        Format the response for video session API
        
        Returns:
            Formatted response dictionary
        """
        response = {
            "room_name": room_name,
            "jitsi_domain": jitsi_domain,
            "participant_role": participant_role,
            "config": config,
            "interface_config": interface_config,
            "session_started": datetime.utcnow().isoformat()
        }
        
        # Only include JWT if using authenticated Jitsi
        if jwt_token:
            response["jwt_token"] = jwt_token
        
        return response
    
    @staticmethod
    def log_session_event(
        appointment_id: int,
        event_type: str,
        user_id: int,
        details: Optional[Dict] = None
    ):
        """
        Log video session events for audit trail
        
        Args:
            appointment_id: Appointment ID
            event_type: Type of event (start, join, leave, end, error)
            user_id: User performing the action
            details: Additional event details
        """
        log_message = f"Video session event - Appointment: {appointment_id}, Event: {event_type}, User: {user_id}"
        
        if details:
            log_message += f", Details: {details}"
        
        if event_type == 'error':
            app_logger.error(log_message)
        else:
            app_logger.info(log_message)