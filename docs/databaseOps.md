# Database Operations Documentation - Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [Database Setup](#database-setup)
3. [Database Models](#database-models)
4. [How Database Operations Work](#how-database-operations-work)
5. [Common Database Operations](#common-database-operations)
6. [Database Configuration](#database-configuration)
7. [Important Files and Locations](#important-files-and-locations)

---

## Overview

The Sahatak Telemedicine Platform uses **SQLAlchemy** as its Object-Relational Mapping (ORM) tool to interact with the database. This means instead of writing raw SQL queries, we use Python classes and methods to work with the database. The system supports both SQLite (for development) and MySQL (for production).

### What is an ORM?
An ORM (Object-Relational Mapping) is a programming technique that lets you work with databases using your programming language's objects instead of SQL. Think of it as a translator between Python code and database tables.

---

## Database Setup

### 1. Database Initialization

The database is initialized in `/backend/app.py`:

```python
# File: /backend/app.py (lines 42-43)
from models import db
db.init_app(app)
```

When the application starts, it automatically creates all necessary tables:

```python
# File: /backend/app.py (lines 344-346)
with app.app_context():
    app_logger.info("Creating database tables if they don't exist")
    db.create_all()
    app_logger.info("Database initialization complete")
```

### 2. The Database Object

The main database object is defined in `/backend/models.py`:

```python
# File: /backend/models.py (line 7)
db = SQLAlchemy()
```

This `db` object is used throughout the application to:
- Define database tables (as Python classes)
- Perform database operations (create, read, update, delete)
- Manage database sessions and transactions

---

## Database Models

All database tables are defined as Python classes in `/backend/models.py`. Here are the main models:

### 1. User Model (Base User Table)
Located at `/backend/models.py` (lines 9-149)

**Purpose**: Stores basic information for all users (patients, doctors, admins)

**Key Fields**:
- `id`: Unique identifier for each user
- `email`: User's email address (unique)
- `password_hash`: Encrypted password
- `full_name`: User's full name
- `user_type`: Type of user ('patient', 'doctor', 'admin')
- `language_preference`: Preferred language ('ar' or 'en')
- `is_active`: Whether the account is active
- `is_verified`: Whether email is verified

### 2. Patient Model
Located at `/backend/models.py` (lines 151-217)

**Purpose**: Stores patient-specific information

**Key Fields**:
- `user_id`: Links to User table
- `phone`: Patient's phone number
- `age`: Patient's age
- `gender`: Patient's gender
- `medical_history`: Patient's medical history
- `allergies`: Known allergies
- `current_medications`: Current medications

### 3. Doctor Model
Located at `/backend/models.py` (lines 219-310)

**Purpose**: Stores doctor-specific information

**Key Fields**:
- `user_id`: Links to User table
- `license_number`: Medical license number (unique)
- `specialty`: Medical specialty
- `years_of_experience`: Years of practice
- `consultation_fee`: Fee for consultation
- `is_verified`: Whether doctor is verified by admin

### 4. Appointment Model
Located at `/backend/models.py` (lines 348-418)

**Purpose**: Stores appointment information

**Key Fields**:
- `patient_id`: Links to Patient table
- `doctor_id`: Links to Doctor table
- `appointment_date`: Date and time of appointment
- `status`: Appointment status ('scheduled', 'completed', 'cancelled', etc.)
- `session_id`: Unique session identifier for video calls

---

## How Database Operations Work

### 1. Creating Records (INSERT)

Example from `/backend/routes/auth.py` (lines 89-102):

```python
# Creating a new user
user = User(
    email=email.lower(),
    full_name=data['full_name'].strip(),
    user_type=data['user_type'],
    language_preference=data.get('language_preference', 'ar'),
    is_verified=False
)
user.set_password(data['password'])  # Hash the password

# Add to database session
db.session.add(user)

# Save to database
db.session.commit()
```

**What happens here?**
1. Create a Python object with the data
2. Add it to the database session (staging area)
3. Commit the session (actually saves to database)

### 2. Reading Records (SELECT)

Example of finding a user by email:

```python
# File: /backend/routes/auth.py (line 56)
existing_user = User.query.filter_by(email=email.lower()).first()
```

**Common query methods:**
- `.filter_by()`: Find records matching exact values
- `.filter()`: Find records with more complex conditions
- `.first()`: Get the first matching record
- `.all()`: Get all matching records
- `.get()`: Get record by primary key (ID)

### 3. Updating Records (UPDATE)

Example of updating user's last login:

```python
# Find the user
user = User.query.get(user_id)

# Update fields
user.last_login = datetime.utcnow()
user.is_online = True

# Save changes
db.session.commit()
```

### 4. Deleting Records (DELETE)

```python
# Find the record
record = Model.query.get(record_id)

# Delete it
db.session.delete(record)

# Save changes
db.session.commit()
```

### 5. Database Sessions

**What is a session?**
A session is like a workspace where you prepare database changes before saving them. Think of it as a shopping cart - you add items, but they're not purchased until you checkout (commit).

```python
# Start making changes
db.session.add(new_record)     # Add new record
db.session.delete(old_record)  # Delete record

# Save all changes at once
db.session.commit()

# Or cancel all changes
db.session.rollback()
```

---

## Common Database Operations

### 1. User Registration
**File**: `/backend/routes/auth.py` (lines 14-249)

**Process**:
1. Validate input data
2. Check if email/phone already exists
3. Create User record
4. Create Patient or Doctor record
5. Commit transaction
6. Send verification email

### 2. User Login
**File**: `/backend/routes/auth.py`

**Process**:
1. Find user by email
2. Verify password
3. Update last_login timestamp
4. Create session

### 3. Creating an Appointment
**File**: `/backend/routes/appointments.py`

**Process**:
1. Validate patient and doctor exist
2. Check doctor availability
3. Create Appointment record
4. Send notification emails
5. Commit transaction

### 4. Retrieving Patient Medical History
**File**: `/backend/routes/medical_history.py`

**Process**:
1. Find patient by ID
2. Join with related tables (appointments, prescriptions)
3. Return formatted data

---

## Database Configuration

### Development Environment
**File**: `/backend/config.py` (lines 64-68)

```python
class DevelopmentConfig(Config):
    DEBUG = False
    # Uses SQLite database file
    SQLALCHEMY_DATABASE_URI = 'sqlite:///sahatak_dev.db'
```

**SQLite**: A lightweight database stored as a single file on disk. Perfect for development.

### Production Environment
**File**: `/backend/config.py` (lines 76-90)

```python
class ProductionConfig(Config):
    DEBUG = False
    # Uses MySQL database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    
    # MySQL connection settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,      # Test connection before using
        'pool_recycle': 300,        # Recycle connections every 5 minutes
        'pool_timeout': 20,         # Timeout for getting connection
        'max_overflow': 0           # No extra connections beyond pool
    }
```

**MySQL**: A robust database server for production use.

---

## Important Files and Locations

### Core Database Files

1. **`/backend/models.py`**
   - Contains all database table definitions
   - Defines relationships between tables
   - Contains helper methods for each model

2. **`/backend/app.py`**
   - Initializes the database connection
   - Creates tables on startup
   - Configures database settings

3. **`/backend/config.py`**
   - Database connection strings
   - Environment-specific settings
   - Connection pool configuration

### Route Files (Where Database Operations Happen)

1. **`/backend/routes/auth.py`**
   - User registration and login
   - Password management
   - Email verification

2. **`/backend/routes/appointments.py`**
   - Appointment creation and management
   - Schedule queries
   - Status updates

3. **`/backend/routes/ehr.py`**
   - Electronic Health Records
   - Medical history tracking
   - Diagnosis management

4. **`/backend/routes/users.py`**
   - User profile management
   - Doctor listings
   - Profile updates

---

## Database Relationships

The database uses **foreign keys** to link related data:

```
User (1) ─────> (1) Patient
     (1) ─────> (1) Doctor

Patient (1) ─────> (many) Appointments
Doctor  (1) ─────> (many) Appointments

Appointment (1) ─────> (many) Prescriptions
            (1) ─────> (many) Diagnoses
```

### Example: Getting a Patient's Appointments

```python
# Using relationship defined in model
patient = Patient.query.get(patient_id)
appointments = patient.appointments.all()  # Gets all appointments

# Or using explicit query
appointments = Appointment.query.filter_by(patient_id=patient_id).all()
```

---

## Transaction Management

### What is a Transaction?
A transaction groups multiple database operations together. Either all succeed, or all fail - ensuring data consistency.

### Example: Registration Transaction

```python
# File: /backend/routes/auth.py
try:
    # Start transaction (implicit)
    user = User(...)
    db.session.add(user)
    db.session.flush()  # Get user.id without committing
    
    patient = Patient(user_id=user.id, ...)
    db.session.add(patient)
    
    # If everything succeeds, save all changes
    db.session.commit()
    
except Exception as e:
    # If anything fails, cancel all changes
    db.session.rollback()
    return error_response
```

---

## Best Practices for Junior Developers

### 1. Always Use Transactions
```python
try:
    # Your database operations
    db.session.commit()
except Exception as e:
    db.session.rollback()
    # Handle error
```

### 2. Validate Before Saving
```python
# Check if record already exists
existing = Model.query.filter_by(unique_field=value).first()
if existing:
    return error_response
```

### 3. Use Model Methods
```python
# Good - uses model method
user.set_password(password)

# Bad - direct manipulation
user.password_hash = password  # Not hashed!
```

### 4. Handle Relationships Properly
```python
# Good - SQLAlchemy handles the relationship
patient.user.full_name

# Less efficient - manual join
user = User.query.get(patient.user_id)
user.full_name
```

### 5. Use Proper Queries
```python
# Good - gets only what's needed
User.query.filter_by(email=email).first()

# Bad - gets all users then filters in Python
all_users = User.query.all()
user = [u for u in all_users if u.email == email][0]
```

---

## Common Errors and Solutions

### 1. "No application found" Error
**Cause**: Trying to use database outside Flask context
**Solution**: Use `with app.app_context():`

### 2. "IntegrityError" 
**Cause**: Violating database constraints (duplicate unique values, null in required field)
**Solution**: Validate data before saving

### 3. "DetachedInstanceError"
**Cause**: Accessing relationship after session closed
**Solution**: Use `lazy='joined'` or query within session

### 4. Changes Not Saving
**Cause**: Forgot to call `db.session.commit()`
**Solution**: Always commit after changes

---

## Testing Database Operations

### Manual Testing with Python Shell
```bash
# Start Python shell with Flask context
python
>>> from app import app, db
>>> from models import User
>>> with app.app_context():
...     users = User.query.all()
...     print(len(users))
```

### Database Migrations (Future Enhancement)
Currently, the system uses `db.create_all()` which only creates new tables. For production, consider using Flask-Migrate for database versioning and migrations.

---

## Summary

The Sahatak database system:
1. Uses SQLAlchemy ORM for database operations
2. Supports both SQLite (development) and MySQL (production)
3. Defines models as Python classes in `/backend/models.py`
4. Performs operations through session management
5. Maintains data integrity through transactions
6. Uses relationships to connect related data

Remember: The database is the heart of the application. Always validate data, use transactions, and handle errors properly to maintain data integrity.