from flask import Blueprint
from flask_login import current_user
from models import db, CalendarSync, Doctor
from routes.auth import api_login_required

# Create a new blueprint named 'calendar_sync
calendar_sync_bp = Blueprint('calendar_sync', __name__)

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