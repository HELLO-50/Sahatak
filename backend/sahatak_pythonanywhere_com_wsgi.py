#!/usr/bin/python3.10

"""
WSGI configuration file for Sahatak Telemedicine Platform
PythonAnywhere deployment configuration

This file should be uploaded to: /var/www/sahatak_pythonanywhere_com_wsgi.py
"""

import sys
import os

# Add your project directory to the Python path
project_home = '/home/sahatak/sahatak/backend'
if project_home not in sys.path:
    sys.path = [project_home] + sys.path

# Set working directory
os.chdir(project_home)

# Set environment variables for production
os.environ['FLASK_ENV'] = 'production'
os.environ.setdefault('FLASK_APP', 'app.py')

# Note: DATABASE_URL should be set in .env file, not hardcoded here

# Load environment variables from .env file if it exists
env_path = os.path.join(project_home, '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ.setdefault(key, value)

# Import Flask application
try:
    from app import app as application
    
except ImportError as import_error:
    error_message = str(import_error)
    
    # Create a simple error application
    def application(environ, start_response):
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain')]
        start_response(status, headers)
        return [f"Import Error: {error_message}".encode('utf-8')]