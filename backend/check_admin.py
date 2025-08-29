"""
Script to check admin users in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User

def check_admin_users():
    with app.app_context():
        print("\n=== Checking Admin Users ===\n")
        
        # Get all admin users
        admin_users = User.query.filter_by(user_type='admin').all()
        
        if not admin_users:
            print("No admin users found in the database!")
        else:
            print(f"Found {len(admin_users)} admin user(s):\n")
            for admin in admin_users:
                print(f"ID: {admin.id}")
                print(f"Email: {admin.email}")
                print(f"Full Name: {admin.full_name}")
                print(f"User Type: {admin.user_type}")
                print(f"Is Active: {admin.is_active}")
                print(f"Is Verified: {admin.is_verified}")
                print(f"Created At: {admin.created_at}")
                print("-" * 40)
        
        # Check specific email
        email_to_check = "ahmedhanyy44444@gmail.com"
        print(f"\n=== Checking specific user: {email_to_check} ===\n")
        
        user = User.query.filter_by(email=email_to_check).first()
        if user:
            print(f"User found!")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Full Name: {user.full_name}")
            print(f"User Type: {user.user_type}")
            print(f"Is Active: {user.is_active}")
            print(f"Is Verified: {user.is_verified}")
            print(f"Password Hash Exists: {bool(user.password_hash)}")
        else:
            print(f"User with email {email_to_check} not found!")
        
        # Show all users and their types
        print("\n=== All Users in Database ===\n")
        all_users = User.query.all()
        for user in all_users:
            print(f"{user.id:3} | {user.email:30} | {user.user_type:10} | {user.full_name}")

if __name__ == "__main__":
    check_admin_users()