"""
Doctor Calendar Sync - Bidirectional Google Calendar & Outlook integration
Prevents double-booking by syncing availability between Sahatak and external calendars
"""

from flask import Blueprint, request, current_app, session, redirect, url_for
from flask_login import current_user
from routes.auth import api_login_required
from models import db, Doctor, CalendarSync, CalendarSyncEvent, Appointment, User
from datetime import datetime, timedelta
from utils.responses import APIResponse
from utils.logging_config import app_logger, log_user_action
import os
import requests
import json
from functools import wraps

calendar_sync_bp = Blueprint('calendar_sync', __name__)

# OAuth 2.0 Configuration
GOOGLE_CONFIG = {
    'client_id': os.getenv('GOOGLE_CALENDAR_CLIENT_ID', ''),
    'client_secret': os.getenv('GOOGLE_CALENDAR_CLIENT_SECRET', ''),
    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
    'token_uri': 'https://oauth2.googleapis.com/token',
    'redirect_uri': os.getenv('GOOGLE_CALLBACK_URL', 'http://localhost:5000/api/calendar-sync/google/callback'),
    'scopes': ['https://www.googleapis.com/auth/calendar']
}

OUTLOOK_CONFIG = {
    'client_id': os.getenv('OUTLOOK_CLIENT_ID', ''),
    'client_secret': os.getenv('OUTLOOK_CLIENT_SECRET', ''),
    'auth_uri': 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    'token_uri': 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    'redirect_uri': os.getenv('OUTLOOK_CALLBACK_URL', 'http://localhost:5000/api/calendar-sync/outlook/callback'),
    'scopes': ['Calendars.ReadWrite']
}


@calendar_sync_bp.route('/status', methods=['GET'])
@api_login_required
def get_sync_status():
    """Get current calendar sync status and settings"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can sync calendars')
        
        doctor = current_user.doctor_profile
        if not doctor:
            return APIResponse.not_found(message='Doctor profile not found')
        
        # Get or create calendar sync record
        sync = CalendarSync.query.filter_by(doctor_id=doctor.id).first()
        if not sync:
            sync = CalendarSync(doctor_id=doctor.id)
            db.session.add(sync)
            db.session.commit()
        
        return APIResponse.success(
            data=sync.to_dict(),
            message='Calendar sync status retrieved'
        )
    except Exception as e:
        app_logger.error(f"Get sync status error: {str(e)}")
        return APIResponse.internal_error(message='Failed to retrieve sync status')


@calendar_sync_bp.route('/google/auth-url', methods=['GET'])
@api_login_required
def get_google_auth_url():
    """Generate Google Calendar OAuth URL"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can sync calendars')
        
        if not GOOGLE_CONFIG['client_id']:
            return APIResponse.error(
                message='Google Calendar integration not configured',
                status_code=503
            )
        
        # Generate OAuth URL
        auth_url = (
            f"{GOOGLE_CONFIG['auth_uri']}?"
            f"client_id={GOOGLE_CONFIG['client_id']}&"
            f"redirect_uri={GOOGLE_CONFIG['redirect_uri']}&"
            f"response_type=code&"
            f"scope={'+'.join(GOOGLE_CONFIG['scopes'])}&"
            f"access_type=offline&"
            f"prompt=consent"
        )
        
        # Store doctor ID in session for callback
        session['doctor_id'] = current_user.doctor_profile.id
        
        return APIResponse.success(
            data={'auth_url': auth_url},
            message='Google auth URL generated'
        )
    except Exception as e:
        app_logger.error(f"Get Google auth URL error: {str(e)}")
        return APIResponse.internal_error(message='Failed to generate auth URL')


@calendar_sync_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Handle Google Calendar OAuth callback"""
    try:
        code = request.args.get('code')
        doctor_id = session.get('doctor_id')
        
        if not code or not doctor_id:
            return {'error': 'Missing authorization code or doctor ID'}, 400
        
        # Exchange code for tokens
        token_response = requests.post(
            GOOGLE_CONFIG['token_uri'],
            data={
                'client_id': GOOGLE_CONFIG['client_id'],
                'client_secret': GOOGLE_CONFIG['client_secret'],
                'code': code,
                'redirect_uri': GOOGLE_CONFIG['redirect_uri'],
                'grant_type': 'authorization_code'
            }
        )
        
        if token_response.status_code != 200:
            return {'error': 'Failed to exchange authorization code'}, 400
        
        tokens = token_response.json()
        
        # Get Google Calendar ID
        calendar_response = requests.get(
            'https://www.googleapis.com/calendar/v3/calendars/primary',
            headers={'Authorization': f"Bearer {tokens['access_token']}"}
        )
        
        if calendar_response.status_code != 200:
            return {'error': 'Failed to retrieve calendar info'}, 400
        
        calendar_data = calendar_response.json()
        
        # Save tokens to database
        sync = CalendarSync.query.filter_by(doctor_id=doctor_id).first()
        if not sync:
            sync = CalendarSync(doctor_id=doctor_id)
        
        sync.google_enabled = True
        sync.google_calendar_id = calendar_data['id']
        sync.google_access_token = tokens['access_token']
        sync.google_refresh_token = tokens.get('refresh_token')
        sync.google_token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))
        
        db.session.commit()
        
        log_user_action(
            User.query.get(Doctor.query.get(doctor_id).user_id).id if doctor_id else None,
            'google_calendar_connected',
            {'calendar_id': calendar_data['id']}
        )
        
        # Redirect back to frontend with success
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/settings?calendar_sync=success&provider=google")
    
    except Exception as e:
        app_logger.error(f"Google callback error: {str(e)}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/settings?calendar_sync=error&provider=google&message={str(e)}")


@calendar_sync_bp.route('/outlook/auth-url', methods=['GET'])
@api_login_required
def get_outlook_auth_url():
    """Generate Outlook Calendar OAuth URL"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can sync calendars')
        
        if not OUTLOOK_CONFIG['client_id']:
            return APIResponse.error(
                message='Outlook integration not configured',
                status_code=503
            )
        
        auth_url = (
            f"{OUTLOOK_CONFIG['auth_uri']}?"
            f"client_id={OUTLOOK_CONFIG['client_id']}&"
            f"redirect_uri={OUTLOOK_CONFIG['redirect_uri']}&"
            f"response_type=code&"
            f"scope={'+'.join(OUTLOOK_CONFIG['scopes'])}&"
            f"access_type=offline"
        )
        
        session['doctor_id'] = current_user.doctor_profile.id
        
        return APIResponse.success(
            data={'auth_url': auth_url},
            message='Outlook auth URL generated'
        )
    except Exception as e:
        app_logger.error(f"Get Outlook auth URL error: {str(e)}")
        return APIResponse.internal_error(message='Failed to generate auth URL')


@calendar_sync_bp.route('/outlook/callback', methods=['GET'])
def outlook_callback():
    """Handle Outlook Calendar OAuth callback"""
    try:
        code = request.args.get('code')
        doctor_id = session.get('doctor_id')
        
        if not code or not doctor_id:
            return {'error': 'Missing authorization code or doctor ID'}, 400
        
        # Exchange code for tokens
        token_response = requests.post(
            OUTLOOK_CONFIG['token_uri'],
            data={
                'client_id': OUTLOOK_CONFIG['client_id'],
                'client_secret': OUTLOOK_CONFIG['client_secret'],
                'code': code,
                'redirect_uri': OUTLOOK_CONFIG['redirect_uri'],
                'grant_type': 'authorization_code'
            }
        )
        
        if token_response.status_code != 200:
            return {'error': 'Failed to exchange authorization code'}, 400
        
        tokens = token_response.json()
        
        # Get Outlook Calendar ID (use default calendar)
        calendar_response = requests.get(
            'https://graph.microsoft.com/v1.0/me/calendars?$filter=name eq \'Calendar\'',
            headers={'Authorization': f"Bearer {tokens['access_token']}"}
        )
        
        if calendar_response.status_code != 200:
            return {'error': 'Failed to retrieve calendar info'}, 400
        
        calendars = calendar_response.json().get('value', [])
        calendar_id = calendars[0]['id'] if calendars else 'primary'
        
        # Save tokens
        sync = CalendarSync.query.filter_by(doctor_id=doctor_id).first()
        if not sync:
            sync = CalendarSync(doctor_id=doctor_id)
        
        sync.outlook_enabled = True
        sync.outlook_calendar_id = calendar_id
        sync.outlook_access_token = tokens['access_token']
        sync.outlook_refresh_token = tokens.get('refresh_token')
        sync.outlook_token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))
        
        db.session.commit()
        
        app_logger.info(f"Outlook calendar connected for doctor {doctor_id}")
        
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/settings?calendar_sync=success&provider=outlook")
    
    except Exception as e:
        app_logger.error(f"Outlook callback error: {str(e)}")
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        return redirect(f"{frontend_url}/settings?calendar_sync=error&provider=outlook&message={str(e)}")


@calendar_sync_bp.route('/disconnect', methods=['POST'])
@api_login_required
def disconnect_calendar():
    """Disconnect a calendar provider"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can sync calendars')
        
        data = request.get_json()
        provider = data.get('provider')  # 'google' or 'outlook'
        
        if provider not in ['google', 'outlook']:
            return APIResponse.validation_error(
                field='provider',
                message='Provider must be "google" or "outlook"'
            )
        
        doctor = current_user.doctor_profile
        sync = CalendarSync.query.filter_by(doctor_id=doctor.id).first()
        
        if not sync:
            return APIResponse.not_found(message='No calendar sync configuration found')
        
        if provider == 'google':
            sync.google_enabled = False
            sync.google_calendar_id = None
            sync.google_access_token = None
            sync.google_refresh_token = None
        else:
            sync.outlook_enabled = False
            sync.outlook_calendar_id = None
            sync.outlook_access_token = None
            sync.outlook_refresh_token = None
        
        db.session.commit()
        
        log_user_action(current_user.id, f'{provider}_calendar_disconnected', {})
        
        return APIResponse.success(
            message=f'{provider.capitalize()} calendar disconnected'
        )
    except Exception as e:
        app_logger.error(f"Disconnect calendar error: {str(e)}")
        return APIResponse.internal_error(message='Failed to disconnect calendar')


@calendar_sync_bp.route('/settings', methods=['PUT'])
@api_login_required
def update_sync_settings():
    """Update calendar sync settings"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can update sync settings')
        
        data = request.get_json()
        doctor = current_user.doctor_profile
        
        sync = CalendarSync.query.filter_by(doctor_id=doctor.id).first()
        if not sync:
            sync = CalendarSync(doctor_id=doctor.id)
            db.session.add(sync)
        
        # Update settings
        if 'sync_direction' in data:
            sync.sync_direction = data['sync_direction']
        if 'sync_frequency' in data:
            sync.sync_frequency = max(1, int(data['sync_frequency']))  # At least 1 minute
        if 'conflict_resolution_mode' in data:
            sync.conflict_resolution_mode = data['conflict_resolution_mode']
        
        db.session.commit()
        
        return APIResponse.success(
            data=sync.to_dict(),
            message='Sync settings updated'
        )
    except Exception as e:
        app_logger.error(f"Update sync settings error: {str(e)}")
        return APIResponse.internal_error(message='Failed to update sync settings')


@calendar_sync_bp.route('/sync-now', methods=['POST'])
@api_login_required
def sync_now():
    """Manually trigger calendar sync"""
    try:
        if current_user.user_type != 'doctor':
            return APIResponse.forbidden(message='Only doctors can sync calendars')
        
        doctor = current_user.doctor_profile
        sync = CalendarSync.query.filter_by(doctor_id=doctor.id).first()
        
        if not sync or (not sync.google_enabled and not sync.outlook_enabled):
            return APIResponse.error(
                message='No calendars connected for sync',
                status_code=400
            )
        
        # Perform sync for enabled providers
        google_result = None
        outlook_result = None
        
        if sync.google_enabled:
            google_result = _sync_google_calendar(sync)
        
        if sync.outlook_enabled:
            outlook_result = _sync_outlook_calendar(sync)
        
        # Update sync status
        sync.last_sync_status = 'success' if (not google_result or google_result.get('success', False)) and \
                                             (not outlook_result or outlook_result.get('success', False)) else 'error'
        db.session.commit()
        
        return APIResponse.success(
            data={
                'google_result': google_result,
                'outlook_result': outlook_result,
                'sync_status': sync.to_dict()
            },
            message='Calendar sync completed'
        )
    except Exception as e:
        app_logger.error(f"Sync now error: {str(e)}")
        return APIResponse.internal_error(message='Failed to sync calendars')


def _sync_google_calendar(sync):
    """Sync events from Google Calendar"""
    try:
        if not sync.google_access_token:
            return {'success': False, 'message': 'No Google access token'}
        
        # Refresh token if needed
        if sync.google_token_expires_at and datetime.utcnow() > sync.google_token_expires_at:
            _refresh_google_token(sync)
        
        # Fetch events from Google Calendar
        response = requests.get(
            f"https://www.googleapis.com/calendar/v3/calendars/{sync.google_calendar_id}/events",
            headers={'Authorization': f"Bearer {sync.google_access_token}"},
            params={
                'timeMin': datetime.utcnow().isoformat() + 'Z',
                'timeMax': (datetime.utcnow() + timedelta(days=90)).isoformat() + 'Z',
                'singleEvents': True,
                'orderBy': 'startTime'
            }
        )
        
        if response.status_code != 200:
            return {'success': False, 'message': 'Failed to fetch Google Calendar events'}
        
        events = response.json().get('items', [])
        synced_count = 0
        
        # Process events and create availability blocks
        for event in events:
            # Check for conflicts and create/update blocks
            _process_external_event(sync, event, 'google')
            synced_count += 1
        
        sync.google_last_sync = datetime.utcnow()
        db.session.commit()
        
        return {'success': True, 'events_synced': synced_count}
    except Exception as e:
        app_logger.error(f"Google Calendar sync error: {str(e)}")
        return {'success': False, 'message': str(e)}


def _sync_outlook_calendar(sync):
    """Sync events from Outlook Calendar"""
    try:
        if not sync.outlook_access_token:
            return {'success': False, 'message': 'No Outlook access token'}
        
        # Refresh token if needed
        if sync.outlook_token_expires_at and datetime.utcnow() > sync.outlook_token_expires_at:
            _refresh_outlook_token(sync)
        
        # Fetch events from Outlook
        response = requests.get(
            f"https://graph.microsoft.com/v1.0/me/calendars/{sync.outlook_calendar_id}/events",
            headers={'Authorization': f"Bearer {sync.outlook_access_token}"},
            params={
                'startDateTime': datetime.utcnow().isoformat() + 'Z',
                'endDateTime': (datetime.utcnow() + timedelta(days=90)).isoformat() + 'Z'
            }
        )
        
        if response.status_code != 200:
            return {'success': False, 'message': 'Failed to fetch Outlook Calendar events'}
        
        events = response.json().get('value', [])
        synced_count = 0
        
        for event in events:
            _process_external_event(sync, event, 'outlook')
            synced_count += 1
        
        sync.outlook_last_sync = datetime.utcnow()
        db.session.commit()
        
        return {'success': True, 'events_synced': synced_count}
    except Exception as e:
        app_logger.error(f"Outlook Calendar sync error: {str(e)}")
        return {'success': False, 'message': str(e)}


def _refresh_google_token(sync):
    """Refresh Google access token"""
    try:
        response = requests.post(
            GOOGLE_CONFIG['token_uri'],
            data={
                'client_id': GOOGLE_CONFIG['client_id'],
                'client_secret': GOOGLE_CONFIG['client_secret'],
                'refresh_token': sync.google_refresh_token,
                'grant_type': 'refresh_token'
            }
        )
        
        if response.status_code == 200:
            tokens = response.json()
            sync.google_access_token = tokens['access_token']
            sync.google_token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))
            db.session.commit()
    except Exception as e:
        app_logger.error(f"Refresh Google token error: {str(e)}")


def _refresh_outlook_token(sync):
    """Refresh Outlook access token"""
    try:
        response = requests.post(
            OUTLOOK_CONFIG['token_uri'],
            data={
                'client_id': OUTLOOK_CONFIG['client_id'],
                'client_secret': OUTLOOK_CONFIG['client_secret'],
                'refresh_token': sync.outlook_refresh_token,
                'grant_type': 'refresh_token'
            }
        )
        
        if response.status_code == 200:
            tokens = response.json()
            sync.outlook_access_token = tokens['access_token']
            sync.outlook_token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))
            db.session.commit()
    except Exception as e:
        app_logger.error(f"Refresh Outlook token error: {str(e)}")


def _process_external_event(sync, event, source):
    """Process an external calendar event and handle conflicts"""
    try:
        # Parse event details based on source
        if source == 'google':
            event_id = event['id']
            title = event.get('summary', 'Busy')
            start = datetime.fromisoformat(event['start'].get('dateTime', event['start'].get('date')))
            end = datetime.fromisoformat(event['end'].get('dateTime', event['end'].get('date')))
        else:  # outlook
            event_id = event['id']
            title = event.get('subject', 'Busy')
            start = datetime.fromisoformat(event['start']['dateTime'].replace('Z', '+00:00'))
            end = datetime.fromisoformat(event['end']['dateTime'].replace('Z', '+00:00'))
        
        # Check if event already exists in sync history
        existing = CalendarSyncEvent.query.filter_by(
            sync_id=sync.id,
            external_event_id=event_id,
            source=source
        ).first()
        
        if existing:
            # Update existing record
            existing.title = title
            existing.start_time = start
            existing.end_time = end
            existing.last_synced_at = datetime.utcnow()
        else:
            # Create new sync event
            sync_event = CalendarSyncEvent(
                sync_id=sync.id,
                event_type='break',  # External events marked as breaks
                source=source,
                external_event_id=event_id,
                title=title,
                start_time=start,
                end_time=end
            )
            db.session.add(sync_event)
        
        db.session.commit()
    except Exception as e:
        app_logger.error(f"Process external event error: {str(e)}")
