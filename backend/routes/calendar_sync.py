from flask import Blueprint

# Create a new blueprint named 'calendar_sync
calendar_sync_bp = Blueprint('calendar_sync', __name__)

#Test route to confirm the calendar sync blueprint is registered and working
calendar_sync_bp.route('/status', methods=['GET'])
def get_calendar_sync_status():
    
    return {'status': 'Calendar sync is working'}, 200
    