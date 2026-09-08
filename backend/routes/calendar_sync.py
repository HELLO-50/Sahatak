from flask import Blueprint, session 
from flask_login import current_user
from models import db, CalendarSync, Doctor, PatientCalendarConnection, Patient
from routes.auth import api_login_required
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