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

# MySQL configuration for PythonAnywhere
os.environ.setdefault('DATABASE_URL', 'mysql+pymysql://sahatak:HELLO-50@30@sahatak.mysql.pythonanywhere-services.com/sahatak$sahatak_db')

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
    
    # Log successful import
    print(f"Successfully imported Flask app from {project_home}")
    
except ImportError as import_error:
    error_message = str(import_error)
    print(f"Error importing Flask app: {error_message}")
    print(f"Python path: {sys.path}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Project home contents: {os.listdir(project_home) if os.path.exists(project_home) else 'Directory not found'}")
    
    # Create a simple error application
    def application(environ, start_response):
        status = '500 Internal Server Error'
        headers = [('Content-type', 'text/plain')]
        start_response(status, headers)
        return [f"Import Error: {error_message}".encode('utf-8')]

# For debugging - remove in production
if __name__ == '__main__':
    print("WSGI configuration loaded successfully")
    print(f"Project home: {project_home}")
    print(f"Python version: {sys.version}")
    print(f"Flask app: {application}")