"""
Script to create missing messaging tables in the database
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Conversation, Message, MessageAttachment

def create_messaging_tables():
    """Create the missing messaging-related tables"""
    
    with app.app_context():
        print("Creating messaging tables...")
        
        # Create only the tables that don't exist
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        # Check and create conversations table
        if 'conversations' not in existing_tables:
            print("Creating conversations table...")
            Conversation.__table__.create(db.engine)
            print("✓ Conversations table created")
        else:
            print("- Conversations table already exists")
        
        # Check and create messages table
        if 'messages' not in existing_tables:
            print("Creating messages table...")
            Message.__table__.create(db.engine)
            print("✓ Messages table created")
        else:
            print("- Messages table already exists")
        
        # Check and create message_attachments table
        if 'message_attachments' not in existing_tables:
            print("Creating message_attachments table...")
            MessageAttachment.__table__.create(db.engine)
            print("✓ Message_attachments table created")
        else:
            print("- Message_attachments table already exists")
        
        print("\nAll messaging tables have been created successfully!")
        
        # Verify the tables
        print("\nVerifying tables...")
        inspector = db.inspect(db.engine)
        new_tables = inspector.get_table_names()
        
        for table in ['conversations', 'messages', 'message_attachments']:
            if table in new_tables:
                print(f"✓ {table} table verified")
            else:
                print(f"✗ {table} table not found - there may be an issue")

if __name__ == "__main__":
    create_messaging_tables()