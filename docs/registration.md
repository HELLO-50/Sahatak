# Registration Flow in Sahatak Telemedicine Platform

## Overview

This document explains how user registration works in the Sahatak telemedicine platform. The registration system allows two types of users - **Patients** and **Doctors** - to create accounts and access the platform's medical services.

## What is Registration?

Registration is the process of creating a new user account on the platform. Think of it like signing up for a new service - you provide your personal information, choose a password, and the system creates an account for you to use.

## Registration Flow Step-by-Step

### Step 1: Language Selection
- **What happens**: When you first visit the website, you choose your preferred language
- **Options**: Arabic (العربية) or English
- **Why**: The entire registration process will be in your chosen language

### Step 2: Choose Registration or Login
- **What happens**: You see two options - "Login" or "Create New Account"
- **For new users**: Click "Create New Account" (إنشاء حساب جديد)

### Step 3: Select User Type
- **What happens**: The system asks if you are a Patient or Doctor
- **Patient**: Someone seeking medical consultation
- **Doctor**: Medical professional providing consultations

### Step 4: Fill Registration Form

#### For Patients:
```
Required Information:
- Full Name (الاسم الكامل)
- Phone Number (رقم الهاتف) - REQUIRED
- Email Address (البريد الإلكتروني) - OPTIONAL
- Age (العمر)
- Gender (الجنس): Male or Female
- Password (كلمة المرور)
```

#### For Doctors:
```
Required Information:
- Full Name (الاسم الكامل)
- Phone Number (رقم الهاتف) - REQUIRED
- Email Address (البريد الإلكتروني) - OPTIONAL
- Medical License Number (رقم الترخيص الطبي)
- Medical Specialty (التخصص)
- Years of Experience (سنوات الخبرة)
- Password (كلمة المرور)
```

### Step 5: Data Validation
- **What happens**: The system checks if your information is correct
- **Examples of validation**:
  - Phone numbers must be valid format
  - Email addresses must be properly formatted (if provided)
  - Passwords must be at least 6 characters
  - Ages must be between 1-120
  - Medical licenses must exist and be unique

### Step 6: Account Creation
- **What happens**: The system creates your user account in the database
- **Behind the scenes**: 
  - Your password is encrypted for security
  - Your information is stored safely
  - A unique user ID is assigned to you

### Step 7: Email Verification (If Email Provided)
- **What happens**: If you provided an email, you'll receive a verification email
- **What to do**: Check your email and click the verification link
- **Important**: You cannot login until you verify your email (if provided)

### Step 8: Account Ready
- **What happens**: Your account is now ready to use
- **Next step**: You can login and access the platform

## Technical Components Explained

### Frontend Components (What You See)

#### 1. HTML Structure (`index.html`)
This file contains the visual structure of all registration forms:
- Language selection screen
- User type selection screen  
- Patient registration form
- Doctor registration form
- Login form

#### 2. JavaScript Files
**`frontend/assets/js/main.js`**: Handles navigation between screens and language management
```javascript
// Example: When you click "Arabic", this function runs
function selectLanguage(lang) {
    console.log(`User selected language: ${lang}`);
    LanguageManager.setLanguage(lang);
    // Shows the next screen
}
```

**`frontend/assets/js/components/auth.js`**: Manages authentication-related functions
```javascript
// Example: Showing different screens
AuthManager.showPatientRegister(); // Shows patient form
AuthManager.showDoctorRegister();  // Shows doctor form
```

**`frontend/assets/js/components/forms.js`**: Handles form submissions and validation
```javascript
// Example: Patient registration
async function handlePatientRegister(event) {
    // Collects form data
    // Validates information
    // Sends to backend
    // Shows success message
}
```

#### 3. CSS Styling
**`frontend/assets/css/components/auth.css`**: Makes the forms look nice and professional with proper colors, spacing, and responsive design for mobile devices.

### Backend Components (What Happens Behind the Scenes)

#### 1. API Endpoint (`backend/routes/auth.py`)
The main registration function:

```python
@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (patient or doctor)"""
    # Get the data you submitted
    data = request.get_json()
    
    # Check required fields
    required_fields = ['password', 'full_name', 'user_type', 'phone']
    for field in required_fields:
        if not data.get(field):
            return error_message(f'{field} is required')
    
    # Validate phone number
    if not validate_phone(data['phone']):
        return error_message('Invalid phone number')
    
    # Create user account
    user = User(
        email=data.get('email'),
        full_name=data['full_name'],
        user_type=data['user_type'],
        language_preference=data.get('language_preference', 'ar')
    )
    user.set_password(data['password'])  # Encrypts password
    
    # Save to database
    db.session.add(user)
    db.session.commit()
    
    return success_message('Registration successful')
```

#### 2. Database Models (`backend/models.py`)
Defines how user information is stored:

```python
class User(db.Model):
    """Main user account information"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    full_name = db.Column(db.String(200), nullable=False)
    user_type = db.Column(db.Enum('patient', 'doctor'))
    language_preference = db.Column(db.Enum('ar', 'en'))
    is_verified = db.Column(db.Boolean, default=False)
    # ... more fields

class Patient(db.Model):
    """Additional patient-specific information"""
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    phone = db.Column(db.String(20), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.Enum('male', 'female'))
    # ... more fields

class Doctor(db.Model):
    """Additional doctor-specific information"""
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    license_number = db.Column(db.String(50), unique=True)
    specialty = db.Column(db.String(100))
    years_of_experience = db.Column(db.Integer)
    # ... more fields
```

#### 3. Validation (`backend/utils/validators.py`)
Ensures all data is correct:

```python
def validate_email(email: str) -> bool:
    """Check if email format is correct"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))

def validate_phone(phone: str) -> bool:
    """Check if phone number is valid"""
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone.strip())
    pattern = r'^\+?[1-9]\d{7,14}$'
    return bool(re.match(pattern, clean_phone))
```

## Registration Process Flow Diagram

```
User Visits Website
         ↓
Choose Language (Arabic/English)
         ↓
Choose "Create New Account"
         ↓
Select User Type (Patient/Doctor)
         ↓
Fill Registration Form
         ↓
Submit Form → Frontend Validation
         ↓
Send Data to Backend → Backend Validation
         ↓
Create User Account in Database
         ↓
If Email Provided → Send Verification Email
         ↓
Registration Complete
         ↓
User Can Login (after email verification if needed)
```

## Error Handling

The system handles various errors:

### Frontend Errors (What you see)
- **Empty fields**: "This field is required"
- **Invalid email**: "Please enter a valid email address"
- **Weak password**: "Password must be at least 6 characters"

### Backend Errors (Server-side)
- **Duplicate phone**: "Phone number already registered"
- **Duplicate email**: "Email already registered"
- **Invalid license**: "License number already exists"

## Security Features

### Password Security
```python
def set_password(self, password):
    """Hash and set password securely"""
    self.password_hash = generate_password_hash(password)

def check_password(self, password):
    """Check if provided password matches"""
    return check_password_hash(self.password_hash, password)
```

### Email Verification
```python
# Generate secure verification token
user.verification_token = secrets.token_urlsafe(32)

# Send verification email
email_service.send_email_confirmation(
    recipient_email=email,
    verification_token=user.verification_token
)
```

## Email Verification Process

### 1. Email Template (`backend/templates/email/en/registration_confirmation.html`)
```html
<div class="container">
    <div class="header">
        <h2>Welcome to Sahatak</h2>
    </div>
    
    <p>Hello {{ full_name }}</p>
    
    <div class="info">
        Your account has been created successfully<br>
        You can now book medical appointments
    </div>
</div>
```

### 2. Verification Process
1. User registers with email
2. System generates unique verification token
3. Verification email sent with link
4. User clicks link in email
5. System verifies token and activates account
6. User can now login

## Database Storage

### How Data is Organized (defined in `backend/models.py`)
```
users table:
├── id (unique number for each user)
├── email (optional)
├── full_name
├── user_type (patient or doctor)
├── password_hash (encrypted password)
├── language_preference
├── is_verified (true/false)
└── created_at (when account was created)

patients table:
├── user_id (links to users table)
├── phone
├── age
├── gender
└── medical information...

doctors table:
├── user_id (links to users table)
├── phone
├── license_number
├── specialty
└── professional information...
```

## API Communication

### Frontend to Backend Communication (handled in `frontend/assets/js/components/forms.js`)
```javascript
// Frontend sends this data
const formData = {
    full_name: "Ahmed Ali",
    phone: "+249123456789",
    email: "ahmed@example.com",
    age: 30,
    gender: "male",
    password: "secure123",
    user_type: "patient",
    language_preference: "ar"
};

// Send to backend (processed by backend/routes/auth.py)
const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
});
```

### Backend Response
```json
{
    "success": true,
    "message": "Registration successful",
    "data": {
        "id": 123,
        "full_name": "Ahmed Ali",
        "user_type": "patient",
        "requires_email_verification": true
    }
}
```

## Multi-language Support

### Language Management (handled in `frontend/assets/js/main.js` and `frontend/locales/`)
The system supports both Arabic and English:

```javascript
// From frontend/assets/js/main.js
const LanguageManager = {
    translations: {
        ar: {
            welcome: { title: 'مرحباً بك في منصة صحتك' },
            auth: { register: 'إنشاء حساب جديد' }
        },
        en: {
            welcome: { title: 'Welcome to Sahatak Platform' },
            auth: { register: 'Create New Account' }
        }
    }
};
```

Translations are loaded from:
- `frontend/locales/ar.json` (Arabic translations)
- `frontend/locales/en.json` (English translations)

## Common Registration Scenarios

### Scenario 1: Patient Registration (Phone Only)
```
1. Select Arabic language
2. Choose "Create New Account"
3. Select "Patient"
4. Fill form:
   - Name: "محمد أحمد"
   - Phone: "+249912345678"
   - Age: 25
   - Gender: Male
   - Password: "mypass123"
5. Submit → Account created immediately
6. Can login right away (no email verification needed)
```

### Scenario 2: Doctor Registration (With Email)
```
1. Select English language
2. Choose "Create New Account"  
3. Select "Doctor"
4. Fill form:
   - Name: "Dr. Sarah Johnson"
   - Phone: "+249912345678"
   - Email: "sarah@hospital.com"
   - License: "MD123456"
   - Specialty: "Cardiology"
   - Experience: 10 years
   - Password: "doctorpass456"
5. Submit → Account created
6. Check email for verification link
7. Click verification link
8. Account verified → Can now login
```

## Troubleshooting Common Issues

### "Phone number already registered"
- **Problem**: Someone already used this phone number
- **Solution**: Use a different phone number or try to login with existing account

### "Email already registered"
- **Problem**: This email is already in use
- **Solution**: Use different email or try to login

### "Please verify your email"
- **Problem**: You provided email but haven't verified it yet
- **Solution**: Check your email inbox and spam folder, click verification link

### "Invalid phone number format"
- **Problem**: Phone number format is incorrect
- **Solution**: Use international format like "+249912345678"

## Summary

The Sahatak registration system is designed to:
1. **Be user-friendly**: Simple steps, clear instructions
2. **Be secure**: Encrypted passwords, email verification
3. **Support multiple languages**: Arabic and English
4. **Handle errors gracefully**: Clear error messages
5. **Store data safely**: Proper database structure
6. **Validate inputs**: Ensure all data is correct

The system creates either Patient or Doctor accounts based on user selection, with appropriate data fields for each user type. Phone numbers are required while email addresses are optional, but if provided, must be verified before the account can be used.