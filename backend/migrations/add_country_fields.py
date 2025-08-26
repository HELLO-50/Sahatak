"""
Database migration: Add country fields to doctors table
Date: 2025-08-26
Description: Add phone_country and license_country fields to support country-specific validation
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
import os
import sys

def add_country_fields_to_doctors(db):
    """
    Add phone_country and license_country columns to doctors table
    """
    try:
        # Add phone_country column
        db.engine.execute(text("""
            ALTER TABLE doctors 
            ADD COLUMN phone_country VARCHAR(2) NULL 
            COMMENT 'ISO country code for phone validation (SD, US, etc.)'
        """))
        
        # Add license_country column
        db.engine.execute(text("""
            ALTER TABLE doctors 
            ADD COLUMN license_country VARCHAR(2) NULL 
            COMMENT 'ISO country code for license validation (SD, US, etc.)'
        """))
        
        print("✅ Successfully added phone_country and license_country columns to doctors table")
        return True
        
    except Exception as e:
        print(f"❌ Error adding country fields: {str(e)}")
        return False

def rollback_country_fields(db):
    """
    Remove the added columns (rollback)
    """
    try:
        # Remove phone_country column
        db.engine.execute(text("ALTER TABLE doctors DROP COLUMN phone_country"))
        
        # Remove license_country column  
        db.engine.execute(text("ALTER TABLE doctors DROP COLUMN license_country"))
        
        print("✅ Successfully removed country fields from doctors table")
        return True
        
    except Exception as e:
        print(f"❌ Error during rollback: {str(e)}")
        return False

def run_migration():
    """
    Run the migration
    """
    # Import app configuration
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from app import create_app, db
    
    app = create_app()
    
    with app.app_context():
        print("🔄 Running migration: Add country fields to doctors table")
        
        # Check if columns already exist
        try:
            result = db.engine.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = 'doctors' 
                AND COLUMN_NAME IN ('phone_country', 'license_country')
            """))
            existing_columns = [row[0] for row in result]
            
            if 'phone_country' in existing_columns and 'license_country' in existing_columns:
                print("ℹ️  Country fields already exist in doctors table")
                return True
                
        except Exception as e:
            print(f"⚠️  Could not check existing columns: {str(e)}")
        
        # Run the migration
        success = add_country_fields_to_doctors(db)
        
        if success:
            print("✅ Migration completed successfully!")
            print("ℹ️  New columns added:")
            print("   - doctors.phone_country (VARCHAR(2), nullable)")
            print("   - doctors.license_country (VARCHAR(2), nullable)")
            return True
        else:
            print("❌ Migration failed!")
            return False

def rollback_migration():
    """
    Rollback the migration
    """
    sys.path.append(os.path.dirname(os.path.dirname(__file__)))
    from app import create_app, db
    
    app = create_app()
    
    with app.app_context():
        print("🔄 Rolling back migration: Remove country fields from doctors table")
        success = rollback_country_fields(db)
        
        if success:
            print("✅ Rollback completed successfully!")
        else:
            print("❌ Rollback failed!")
        
        return success

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback_migration()
    else:
        run_migration()