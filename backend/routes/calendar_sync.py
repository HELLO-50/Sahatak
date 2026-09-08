from flask import Blueprint, session 
from flask_login import current_user
from models import db, CalendarSync, Doctor, PatientCalendarConnection, Patient
from routes.auth import api_login_required
import requests
from datetime import datetime, timedelta
import os

# Create a new blueprint named 'calendar_sync
calendar_sync_bp = Blueprint('calendar_sync', __name__)

# Google OAuth settings
GOOGLE_CONFIG = {
    'client_id': os.getenv('GOOGLE_CALENDAR_CLIENT_ID', ''),
    'client_secret': os.getenv('GOOGLE_CALENDAR_CLIENT_SECRET', ''),
    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
    'token_uri': 'https://oauth2.googleapis.com/token',
    'redirect_uri': os.getenv('GOOGLE_CALLBACK_URL', ''),
    'scopes': ['https://www.googleapis.com/auth/calendar.events']
}

#Test route to confirm the calendar sync blueprint is registered and working
@calendar_sync_bp.route('/status', methods=['GET'])

@api_login_required
def get_calendar_sync_status():
    
    # Only doctors should check their own calendar sync status
    if current_user.user_type != 'doctor':
        return {'error': 'Only doctors can check calendar sync status'}, 403
    
    # Get this doctor's profile (linked to the logged-in user)
    doctor = current_user.doctor_profile
    
    # Look for an existing CalendarSync record for this doctor
    sync = CalendarSync.query.filter_by(doctor_id=doctor.id).first()

    # If no record exists yet, it means they've never tried to connect
    if not sync:
        return {'google_connected': False}, 200

    # Return whether Google Calendar is connected
    return {'google_connected': sync.google_enabled}, 200    

#Generate the Google login link for a patient to click
@calendar_sync_bp.route('/patient/google/auth-url', methods=['GET'])
@api_login_required
def get_patient_google_auth_url():
    # Only patients should use this route
    if current_user.user_type != 'patient':
        return {'error': 'Only patients can connect their calendar here'}, 403

    # Build the Google login URL with our app's credentials and requested permissions
    auth_url = (
        f"{GOOGLE_CONFIG['auth_uri']}?"
        f"client_id={GOOGLE_CONFIG['client_id']}&"
        f"redirect_uri={GOOGLE_CONFIG['redirect_uri']}&"
        f"response_type=code&"
        f"scope={'+'.join(GOOGLE_CONFIG['scopes'])}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    # Remember which patient started this, so we know who to save tokens for later
    session['patient_id'] = current_user.patient_profile.id

    return {'auth_url': auth_url}, 200

#Google redirects here after the user approves (or denies) calendar access.
@calendar_sync_bp.route('/google/callback', methods=['GET'])
def google_callback():
    from flask import request

    # Google includes a temporary "code" in the URL if the user approved access
    code = request.args.get('code')

    if not code:
        return {'error': 'Google did not provide an authorization code'}, 400

    # Exchange the temporary code for real access + refresh tokens
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
        return {'error': 'Failed to exchange authorization code for tokens'}, 400

    tokens = token_response.json()

    # Figure out who started this: was it a patient or a doctor?
    patient_id = session.get('patient_id')

    if patient_id:
        # Find or create this patient's calendar connection record
        connection = PatientCalendarConnection.query.filter_by(patient_id=patient_id).first()
        if not connection:
            connection = PatientCalendarConnection(patient_id=patient_id)
            db.session.add(connection)

        connection.google_enabled = True
        connection.google_access_token = tokens['access_token']
        connection.google_refresh_token = tokens.get('refresh_token')
        connection.google_token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get('expires_in', 3600))

        db.session.commit()

        return {'message': 'Google Calendar connected successfully'}, 200

    return {'error': 'No patient or doctor found in session'}, 400