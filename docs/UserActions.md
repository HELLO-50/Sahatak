# User Actions Flow - Sahatak Platform

This document outlines all possible user actions and workflows for both patients and doctors on the Sahatak healthcare platform.

## Business Rules & Access Control

### Email Verification Requirements
- **All Users**: Must verify email before accessing any platform features
- **No email verification = No platform access**

### Patient Restrictions
- **Cannot login** without email verification
- **Cannot book appointments** without completing medical history
- **Cannot message doctors** without having an appointment with that doctor
- **Cannot view prescriptions** from doctors they haven't consulted
- **Cannot access medical records** of other patients

### Doctor Restrictions  
- **Cannot login** without email verification
- **Cannot access dashboard** without admin approval
- **Cannot see patients** who haven't had appointments with them
- **Cannot prescribe** to patients without active appointments
- **Cannot message patients** without established doctor-patient relationship
- **Cannot modify** other doctors' prescriptions or records

### General Security Rules
- **Session timeout**: 15 minutes of inactivity
- **Password requirements**: Minimum 6 characters
- **Failed login attempts**: Account locked after 5 attempts
- **Data access**: Users can only access their own data

---

## Patient Actions Flow

### Initial Platform Visit
```
Patient visits platform
├── Already registered?
│   ├── YES → Go to Login Flow
│   └── NO → Go to Registration Flow
```

### Registration Flow
```
Patient Registration
├── Fill registration form
│   ├── Full Name (required)
│   ├── Email (required)
│   ├── Phone (required)
│   ├── Password (required)
│   ├── Age (required)
│   ├── Gender (required)
│   └── Language Preference (ar/en)
├── Submit registration
├── Receive email verification
├── Verify email via link
└── → Redirect to Login
```

### Login Flow
```
Patient Login
├── Enter credentials (email/phone + password)
├── Authentication successful?
│   ├── YES → Check email verification status
│   │   ├── Email Verified → Go to Dashboard
│   │   └── Email NOT Verified → 
│   │       ├── Show verification required message
│   │       ├── Resend verification email option
│   │       └── CANNOT ACCESS PLATFORM
│   └── NO → Show error, retry
```

### Dashboard Actions
```
Patient Dashboard
├── View Statistics
│   ├── Upcoming Appointments Count
│   ├── Active Prescriptions Count
│   └── Medical Reports Count
├── Quick Actions
│   ├── Book New Appointment
│   ├── View All Appointments
│   ├── Contact Support
│   └── Emergency Services
├── Navigation Menu
│   ├── Appointments → Go to Appointments Flow
│   ├── Medical History → Go to Medical History Flow
│   ├── Prescriptions → Go to Prescriptions Flow
│   ├── Messages → Go to Messages Flow
│   ├── Profile → Go to Profile Management Flow
│   └── Logout
```

### Appointments Flow
```
Appointments Management
├── View Appointments List
│   ├── Filter by status (upcoming/completed/cancelled)
│   ├── View appointment details
│   └── Cancel upcoming appointments
├── Book New Appointment
│   ├── Check Prerequisites:
│   │   ├── Email Verified (required)
│   │   ├── Medical History Completed (required)
│   │   └── If NOT completed → CANNOT BOOK
│   │       └── Redirect to Medical History Form
│   ├── Select Doctor
│   │   ├── Browse by specialty
│   │   ├── Search by name
│   │   └── Filter by availability
│   ├── Choose Date & Time
│   ├── Add Notes/Reason
│   ├── Confirm booking
│   └── Receive confirmation email
├── Appointment Actions
│   ├── View Details
│   ├── Join Video Consultation (for video appointments)
│   │   ├── Pre-consultation device setup
│   │   ├── System compatibility check
│   │   ├── Camera and microphone test
│   │   ├── Network quality assessment
│   │   ├── Join waiting room
│   │   └── Enter consultation when doctor starts
│   ├── Reschedule (if allowed)
│   ├── Cancel
│   └── Rate & Review (after completion)
```

### Medical History Flow
```
Medical History Management
├── View Medical Summary
│   ├── Basic Information
│   ├── Emergency Contact
│   ├── Blood Type
│   ├── Allergies
│   ├── Chronic Conditions
│   ├── Current Medications
│   ├── Family History
│   └── Surgical History
├── Complete Initial Medical History (new users)
│   ├── Fill comprehensive form
│   ├── Submit for review
│   └── → Enable appointment booking
├── Update Medical Information
│   ├── Edit existing data
│   ├── Add new conditions
│   └── Update medications
├── View Medical Timeline
│   ├── Appointment history
│   ├── Diagnosis records
│   ├── Prescription history
│   └── Medical updates
├── Export Medical Records
└── Share with Healthcare Providers
```

### Prescriptions Flow
```
Prescriptions Management
├── View Active Prescriptions
│   ├── Current medications
│   ├── Dosage instructions
│   ├── Expiry dates
│   └── Refill reminders
├── Prescription History
│   ├── Past medications
│   ├── Prescription dates
│   └── Prescribing doctors
├── Prescription Actions
│   ├── View Details
│   ├── Download PDF
│   ├── Set Reminders
│   └── Request Refill
```

### Messages Flow
```
Messages & Communication
├── Doctor Communications
│   ├── Check Prerequisites:
│   │   ├── Must have active/completed appointment with doctor
│   │   └── If NO appointment → CANNOT MESSAGE DOCTOR
│   │       └── Show "Book appointment first" message
│   ├── Send message to doctor (only if has appointment)
│   ├── Reply to doctor messages
│   └── View conversation history
├── System Notifications
│   ├── Appointment reminders
│   ├── Prescription alerts
│   └── Platform updates
├── Support Messages (Always Available)
│   ├── Contact support
│   ├── Technical issues
│   └── General inquiries
```

### Profile Management Flow
```
Profile Management
├── Personal Information
│   ├── Update name, email, phone
│   ├── Change password
│   ├── Update emergency contact
│   └── Language preferences
├── Privacy Settings
│   ├── Account visibility
│   ├── Data sharing preferences
│   └── Communication preferences
├── Security Settings
│   ├── Change password
│   ├── Two-factor authentication
│   └── Login history
├── Account Actions
│   ├── Export data
│   ├── Deactivate account
│   └── Delete account
```

---

## Doctor Actions Flow

### Initial Platform Visit
```
Doctor visits platform
├── Already registered?
│   ├── YES → Go to Login Flow
│   └── NO → Go to Registration Flow
```

### Registration Flow
```
Doctor Registration
├── Fill registration form
│   ├── Full Name (required)
│   ├── Email (required)
│   ├── Phone (required)
│   ├── Password (required)
│   ├── Medical License Number (required)
│   ├── Specialty (required)
│   ├── Years of Experience
│   ├── Hospital/Clinic Affiliation
│   ├── Upload License Document
│   └── Language Preference (ar/en)
├── Submit registration
├── Receive email verification
├── Verify email via link
├── → Pending Admin Verification
└── Wait for admin approval
```

### Verification Process
```
Doctor Verification
├── Admin Reviews Application
│   ├── Check license validity
│   ├── Verify credentials
│   └── Approve/Reject
├── If Approved
│   ├── Receive approval email
│   ├── Account activated
│   └── → Can login and access dashboard
├── If Rejected
│   ├── Receive rejection email with reason
│   ├── Option to resubmit
│   └── → Fix issues and reapply
```

### Login Flow
```
Doctor Login
├── Enter credentials (email/phone + password)
├── Authentication successful?
│   ├── YES → Check email verification status
│   │   ├── Email NOT Verified → 
│   │   │   ├── Show verification required message
│   │   │   ├── Resend verification email option
│   │   │   └── CANNOT ACCESS PLATFORM
│   │   └── Email Verified → Check admin approval status
│   │       ├── APPROVED → Go to Dashboard
│   │       ├── PENDING → Show "Under Review" message
│   │       │   ├── Cannot access dashboard
│   │       │   ├── Can only view verification status
│   │       │   └── LIMITED ACCESS
│   │       └── REJECTED → Show rejection reason
│   │           ├── Option to resubmit application
│   │           └── CANNOT ACCESS PLATFORM
│   └── NO → Show error, retry
```

### Dashboard Actions
```
Doctor Dashboard
├── View Statistics
│   ├── Today's Appointments
│   ├── Total Patients
│   ├── Monthly Appointments
│   └── Revenue/Statistics
├── Today's Schedule
│   ├── View appointments
│   ├── Patient details
│   └── Appointment actions
├── Quick Actions
│   ├── Set Availability
│   ├── View Patient Requests
│   ├── Update Profile
│   └── Contact Support
├── Navigation Menu
│   ├── Appointments → Go to Appointments Flow
│   ├── Patients → Go to Patients Management Flow
│   ├── Availability → Go to Schedule Management Flow
│   ├── Messages → Go to Messages Flow
│   ├── Profile → Go to Profile Management Flow
│   └── Logout
```

### Appointments Flow
```
Appointments Management
├── View Appointments
│   ├── Today's schedule
│   ├── Upcoming appointments
│   ├── Completed appointments
│   └── Cancelled appointments
├── Appointment Actions
│   ├── View patient details
│   ├── Start Video Consultation (for video appointments)
│   │   ├── Review patient medical history
│   │   ├── Initialize video session
│   │   ├── Generate secure room link
│   │   ├── Wait for patient to join
│   │   ├── Control session as moderator
│   │   │   ├── Mute/unmute participants
│   │   │   ├── Share screen for medical reports
│   │   │   ├── Monitor connection quality
│   │   │   └── Record session (with consent)
│   │   └── End consultation session
│   ├── Start consultation (non-video)
│   ├── Add diagnosis
│   ├── Prescribe medication
│   ├── Schedule follow-up
│   ├── Complete appointment
│   └── Cancel/Reschedule
├── Consultation Tools
│   ├── Patient medical history
│   ├── Previous diagnoses
│   ├── Current medications
│   ├── Add notes
│   ├── Upload documents
│   └── Send prescription
```

### Video Consultation Workflow

**Patient Video Consultation Flow:**
```
Video Consultation - Patient Side
├── Navigate to appointment
├── Click "Join Video Consultation" button
├── Pre-consultation Setup
│   ├── System Compatibility Check
│   │   ├── Browser compatibility validation
│   │   ├── Network quality assessment
│   │   ├── Camera/microphone permissions
│   │   └── Device enumeration
│   ├── Device Testing
│   │   ├── Camera preview and selection
│   │   ├── Microphone test with audio levels
│   │   ├── Speaker test and selection
│   │   └── Audio-only fallback option
│   ├── Pre-join Screen
│   │   ├── Review system check results
│   │   ├── Configure device settings
│   │   ├── Enable/disable audio-only mode
│   │   └── Wait for system readiness
├── Join Session
│   ├── Wait for doctor to start session
│   ├── Enter Jitsi meeting room
│   ├── Connect with secure room name
│   └── Participate as regular attendee
├── During Consultation
│   ├── Communicate with doctor
│   ├── Toggle camera/microphone as needed
│   ├── Use chat if needed
│   ├── Switch devices if necessary
│   └── Monitor connection quality
├── End Session
│   ├── Doctor ends the session
│   ├── Automatic session cleanup
│   ├── View post-consultation screen
│   └── Return to appointment details
```

**Doctor Video Consultation Flow:**
```
Video Consultation - Doctor Side
├── View today's appointments
├── Select video appointment
├── Review patient medical history
├── Click "Start Video Consultation"
├── Session Initialization
│   ├── Generate unique room name
│   ├── Create JWT token (if configured)
│   ├── Set moderator privileges
│   ├── Initialize Jitsi session
│   └── Mark appointment as in_progress
├── Wait for Patient
│   ├── Share session link with patient
│   ├── Monitor session status
│   ├── Patient joins automatically
│   └── Begin consultation
├── During Consultation
│   ├── Control session as moderator
│   │   ├── Mute/unmute participants
│   │   ├── End call for everyone
│   │   ├── Remove disruptive users
│   │   └── Control recording
│   ├── Use consultation tools
│   │   ├── Share screen for reports
│   │   ├── Access patient files
│   │   ├── Take consultation notes
│   │   └── Monitor session quality
│   ├── Medical consultation activities
│   │   ├── Discuss symptoms
│   │   ├── Visual examination
│   │   ├── Provide diagnosis
│   │   └── Explain treatment plan
├── End Session
│   ├── Click "End Consultation"
│   ├── Session cleanup and logging
│   ├── Mark appointment as completed
│   ├── Add consultation notes
│   └── Send prescription if needed
```

**Technical Session Management:**
```
Video Session Management
├── Session Creation
│   ├── Generate deterministic room name (sahatak_appointment_{id})
│   ├── Set session timing validation (15min buffer)
│   ├── Configure Jitsi with custom settings
│   ├── Apply security settings (no recording by default)
│   └── Log session initiation
├── Session Monitoring
│   ├── Track participant join/leave events
│   ├── Monitor connection quality
│   ├── Log session duration
│   ├── Handle reconnection attempts
│   └── Manage session timeouts
├── Session Cleanup
│   ├── End Jitsi meeting room
│   ├── Update appointment status
│   ├── Log session completion
│   ├── Calculate session duration
│   └── Free system resources
```

### Patients Management Flow
```
Patients Management
├── View Patient List (RESTRICTED ACCESS)
│   ├── Only patients who had appointments with this doctor
│   ├── CANNOT see other doctors' patients
│   ├── Search within accessible patients only
│   └── Filter by conditions (own patients only)
├── Patient Profile Actions (CONDITIONAL ACCESS)
│   ├── Check Prerequisites:
│   │   ├── Must have appointment history with patient
│   │   └── If NO appointment → CANNOT ACCESS RECORDS
│   ├── View medical history (appointment-related only)
│   ├── Review past appointments (own appointments only)
│   ├── Check current medications (prescribed by this doctor)
│   ├── Add medical notes (only during/after appointments)
│   ├── Update patient records (within scope of practice)
│   └── Send messages (only to own patients)
├── Medical Records (APPOINTMENT-BASED ACCESS)
│   ├── Add diagnosis (during active appointment only)
│   ├── Update treatment plans (ongoing patients only)
│   ├── Record vital signs (appointment context)
│   ├── Upload test results (related to consultations)
│   └── Generate reports (own patients only)
```

### Schedule Management Flow
```
Schedule & Availability Management
├── Set Working Hours
│   ├── Daily schedules
│   ├── Weekly patterns
│   ├── Holiday schedules
│   └── Break times
├── Availability Settings
│   ├── Available time slots
│   ├── Appointment duration
│   ├── Maximum daily appointments
│   └── Buffer time between appointments
├── Schedule Actions
│   ├── Block time slots
│   ├── Add emergency slots
│   ├── Modify existing schedule
│   └── Set vacation periods
```

### Prescription Management Flow
```
Prescription Management
├── Create Prescriptions
│   ├── Select patient
│   ├── Add medications
│   ├── Set dosage & duration
│   ├── Add instructions
│   └── Send to patient
├── Prescription History
│   ├── View all prescriptions
│   ├── Filter by patient
│   ├── Filter by medication
│   └── Export records
├── Prescription Actions
│   ├── Modify existing prescriptions
│   ├── Renew prescriptions
│   ├── Add notes
│   └── Track compliance
```

### Messages Flow
```
Messages & Communication
├── Patient Communications (RESTRICTED ACCESS)
│   ├── Check Prerequisites:
│   │   ├── Must have established doctor-patient relationship
│   │   ├── Patient must have had appointment with this doctor
│   │   └── If NO relationship → CANNOT MESSAGE
│   ├── View patient messages (own patients only)
│   ├── Reply to patients (established relationships only)
│   ├── Send follow-up messages (post-appointment only)
│   └── Consultation notes (appointment-based)
├── System Notifications (Always Available)
│   ├── New appointment requests
│   ├── Patient messages
│   ├── Schedule changes
│   └── Platform updates
├── Professional Network (Always Available)
│   ├── Consult with colleagues
│   ├── Referral communications
│   └── Medical discussions
```

### Profile Management Flow
```
Profile Management
├── Professional Information
│   ├── Update specialty
│   ├── Update experience
│   ├── Add certifications
│   ├── Update bio/description
│   └── Upload profile photo
├── Credentials Management
│   ├── Update license information
│   ├── Add additional certifications
│   ├── Update hospital affiliations
│   └── Verification documents
├── Practice Settings
│   ├── Consultation fees
│   ├── Appointment preferences
│   ├── Communication preferences
│   └── Privacy settings
├── Account Settings
│   ├── Change password
│   ├── Update contact info
│   ├── Language preferences
│   └── Notification settings
```

### Analytics & Reports Flow
```
Analytics & Reporting
├── Practice Statistics
│   ├── Patient volume
│   ├── Appointment trends
│   ├── Revenue analytics
│   └── Performance metrics
├── Patient Reports
│   ├── Treatment outcomes
│   ├── Patient satisfaction
│   ├── Follow-up compliance
│   └── Medical reports
├── Export Data
│   ├── Patient lists
│   ├── Appointment history
│   ├── Financial reports
│   └── Medical statistics
```

---

## Common Actions (Both Users)

### Multi-language Support
- Switch between Arabic and English
- All interfaces and communications adapt

### Notifications
- Email notifications
- In-app notifications
- SMS alerts (for critical updates)

### Responsive Design
- Mobile-friendly interface
- Tablet optimization
- Desktop full features

### Security Features
- Secure login/logout
- Password recovery
- Session management
- Data encryption

### Support System
- Help documentation
- Contact support
- FAQ section
- Emergency contacts

---

## Workflow Dependencies Summary

### Patient Action Prerequisites

| Action | Prerequisites | Restrictions |
|--------|---------------|-------------|
| **Login** | Email verified | Cannot login without verification |
| **Dashboard Access** | Email verified | Limited access without verification |
| **Book Appointment** | Email verified<br>Medical history completed | Cannot book without both |
| **Message Doctor** | Active/completed appointment with doctor | Cannot contact doctors without appointment |
| **View Prescriptions** | Must be prescribed by doctor after appointment | Cannot see other patients' prescriptions |
| **Medical Records** | Own records only | Cannot access other patients' data |

### Doctor Action Prerequisites

| Action | Prerequisites | Restrictions |
|--------|---------------|-------------|
| **Login** | Email verified<br>Admin approved | Cannot login without both |
| **Dashboard Access** | Email verified<br>Admin approved | Pending doctors see limited view |
| **View Patients** | Must have appointment history | Cannot see other doctors' patients |
| **Message Patients** | Established doctor-patient relationship | Cannot message without appointment |
| **Prescribe Medicine** | Active appointment<br>During consultation | Cannot prescribe without active appointment |
| **Access Medical Records** | Appointment with patient | Cannot access other doctors' patients |

### System Enforced Rules

1. **Email Verification Gate**: No platform access without email verification
2. **Doctor Approval Gate**: Doctors cannot practice without admin approval
3. **Medical History Gate**: Patients cannot book appointments without completing medical history
4. **Appointment Relationship Gate**: Communication restricted to doctor-patient relationships
5. **Session Security**: 15-minute timeout, account lockout after failed attempts
6. **Data Privacy**: Users can only access their own data and related interactions

### Error Scenarios

| Scenario | User Experience | System Response |
|----------|----------------|----------------|
| **Unverified email login** | Login blocked | Show verification message + resend option |
| **Patient books without medical history** | Booking blocked | Redirect to medical history form |
| **Patient messages unknown doctor** | Message blocked | Show "Book appointment first" message |
| **Doctor accesses unapproved** | Dashboard blocked | Show "Under admin review" message |
| **Doctor views other's patients** | Access denied | Show "No permission" error |
| **Expired session** | Auto logout | Redirect to login with session expired message |

---

## Implementation Notes

1. **Email Verification**: Required gate for all platform access
2. **Doctor Verification**: Two-step process (email + admin approval)
3. **Medical History**: Mandatory before first appointment booking
4. **Relationship-Based Access**: All communications require established relationships
5. **Responsive Design**: All workflows available on mobile and desktop
6. **Multi-language**: Platform supports Arabic and English with RTL
7. **Security**: All actions logged and audited
8. **Notifications**: Users receive confirmations for all state changes

This comprehensive flow map ensures secure, logical user journeys while maintaining healthcare privacy and regulatory compliance.