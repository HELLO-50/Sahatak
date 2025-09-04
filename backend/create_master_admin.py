#!/usr/bin/env python3
"""
Script to create master admin user for Sahatak platform
"""
import os
import sys
from werkzeug.security import generate_password_hash
from models import db, User
from app import create_app

def create_master_admin():
    """Create the master admin user that cannot be deleted"""
    app = create_app()
    
    with app.app_context():
        # Check if master admin already exists
        existing_admin = User.query.filter_by(email='admin').first()
        
        if existing_admin:
            print("Master admin user 'admin' already exists.")
            # Update password if needed
            existing_admin.password_hash = generate_password_hash('Sahatak!23')
            existing_admin.full_name = 'Master Administrator'
            existing_admin.user_type = 'admin'
            existing_admin.is_active = True
            db.session.commit()
            print("Master admin password updated.")
        else:
            # Create new master admin
            master_admin = User(
                email='admin',
                full_name='Master Administrator',
                user_type='admin',
                is_active=True
            )
            master_admin.set_password('Sahatak!23')
            
            db.session.add(master_admin)
            db.session.commit()
            print("Master admin user created successfully.")
            print("Email: admin")
            print("Password: Sahatak!23")
            print("This user cannot be deleted from the admin interface.")

if __name__ == '__main__':
    create_master_admin()