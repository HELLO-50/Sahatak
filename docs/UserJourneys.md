# User Journeys - Sahatak Platform

This document outlines the complete user journeys and typical workflows for patients and doctors on the Sahatak healthcare platform.

## Complete User Journeys

### New Patient Journey (First-Time User)

#### Step 1: Platform Discovery & Registration
```
Platform Discovery
├── Visit Sahatak website
├── Browse features and doctor profiles  
├── Click "Register as Patient"
└── → Registration Form

Registration Process
├── Fill personal information
│   ├── Full Name, Email, Phone
│   ├── Password, Age, Gender
│   └── Language preference
├── Submit registration
├── Receive "Verify your email" message
└── → Email Verification Required

Email Verification
├── Check email inbox
├── Click verification link
├── Email verified successfully
└── → Can now login
```

#### Step 2: First Login & Setup
```
First Login
├── Enter credentials (email/phone + password)
├── Login successful → Welcome dashboard
├── See "Complete Medical History" prompt
└── → Medical History Setup (REQUIRED)

Medical History Completion
├── Fill comprehensive medical form
│   ├── Emergency contact details
│   ├── Blood type and known allergies
│   ├── Current medications
│   ├── Chronic conditions
│   ├── Family medical history
│   └── Previous surgeries
├── Review all information
├── Submit medical history
├── Profile setup complete
└── → Can now book appointments
```

#### Step 3: First Appointment Booking
```
Appointment Booking
├── Click "Book New Appointment"
├── Browse doctors
│   ├── Filter by specialty
│   ├── View doctor profiles & reviews
│   ├── Check availability calendar
│   └── Select preferred doctor
├── Choose appointment details
│   ├── Pick date from available slots
│   ├── Select time that works
│   └── Add reason for visit/symptoms
├── Review booking summary
├── Confirm appointment
├── Booking confirmed
├── Receive confirmation email
└── → Wait for consultation day
```

#### Step 4: Consultation Experience

**For Video Consultations:**
```
Video Consultation Day
├── Receive appointment reminder with video link
├── Pre-consultation Setup (15 minutes before)
│   ├── Click "Join Video Consultation" from dashboard
│   ├── Browser compatibility check
│   │   ├── Check WebRTC support
│   │   ├── Verify browser version
│   │   └── Display compatibility status
│   ├── Network quality assessment
│   │   ├── Test network latency
│   │   ├── Check bandwidth availability
│   │   └── Show connection quality indicator
│   ├── Device testing and setup
│   │   ├── Camera preview and device selection
│   │   ├── Microphone testing with audio levels
│   │   ├── Speaker selection and test
│   │   ├── Option to enable audio-only mode
│   │   └── Device permissions confirmation
│   ├── System readiness confirmation
│   └── Wait in pre-join screen until ready
├── Join Video Session
│   ├── Wait for doctor to start the session
│   ├── Receive "Doctor is starting the call" notification
│   ├── Enter Jitsi meeting room automatically
│   ├── See doctor's video and establish connection
│   └── Begin consultation conversation
├── During Video Consultation
│   ├── Doctor reviews medical history
│   ├── Face-to-face discussion of symptoms
│   ├── Visual examination (as possible via video)
│   ├── Doctor shares screen for medical reports
│   ├── Real-time medical advice and guidance
│   ├── Connection quality monitoring throughout
│   ├── Automatic fallback to audio if video fails
│   └── Doctor takes consultation notes
├── End of Video Session
│   ├── Doctor ends the video session
│   ├── Automatic session cleanup
│   ├── Return to post-consultation screen
│   └── Session summary and duration displayed
└── → Post-consultation actions
```

**For Traditional Consultations:**
```
Traditional Consultation Day
├── Receive appointment reminder
├── Join consultation (audio/chat)
├── Doctor reviews medical history
├── Discuss symptoms and concerns
├── Receive medical advice
├── Get diagnosis and treatment plan
├── Receive prescription (if needed)
├── Consultation completed
└── → Post-consultation actions
```

**Common Post-Consultation Experience:**
```
After Any Consultation
├── Download prescription PDF
├── Access updated medical records
├── View consultation notes and summary
├── Send follow-up questions to doctor
├── Rate and review the consultation experience
├── Schedule follow-up appointment (if needed)
├── Set reminders for medication or treatments
└── → Ongoing healthcare relationship
```

---

### New Doctor Journey (Professional Onboarding)

#### Step 1: Professional Registration
```
Professional Discovery
├── Visit Sahatak website
├── Click "Join as Healthcare Provider"
├── Review platform benefits
└── → Professional Registration

Doctor Registration
├── Fill comprehensive application
│   ├── Personal: Name, Email, Phone, Password
│   ├── Professional: Medical License Number
│   ├── Specialty and years of experience
│   ├── Hospital/clinic affiliation
│   ├── Consultation fees
│   └── Upload license documents
├── Submit application
├── Receive "Application submitted" confirmation
└── → Email verification process

Email Verification
├── Check email inbox
├── Click verification link
├── Email verified
├── Status: "Pending admin approval"
└── → Wait for admin review
```

#### Step 2: Admin Approval Process
```
Admin Review
├── Admin team reviews application
├── Verification of medical credentials
├── License validation with medical board
├── Background check completion
└── Decision:
    ├── APPROVED → Access granted
    └── REJECTED → Resubmission required

Approval & Access
├── Receive approval notification email
├── Can now login to doctor dashboard
├── Full platform access granted
└── → Profile setup required
```

#### Step 3: Professional Profile Setup
```
Profile Completion
├── Upload professional photo
├── Write detailed medical bio
├── Set consultation fees and duration
├── Add medical specializations
├── Configure practice information
└── → Availability setup

Schedule Configuration
├── Set working days and hours
├── Define appointment slot durations
├── Configure break times
├── Set maximum daily appointments
├── Enable/disable emergency slots
└── Profile ready for patients
```

#### Step 4: First Patient Interaction
```
First Appointment Request
├── Receive appointment request notification
├── Review patient medical history
├── Check appointment time slot
├── Accept/decline appointment request
├── Send confirmation to patient
└── → Prepare for consultation

First Video Consultation Experience
├── Review patient's medical background
├── Start video consultation session
│   ├── Click "Start Video Consultation" 
│   ├── System generates secure Jitsi room
│   ├── Doctor enters as moderator
│   ├── Patient receives join notification
│   ├── Patient joins video session
│   └── Video connection established
├── Conduct video medical consultation
│   ├── Face-to-face patient interaction
│   ├── Visual examination and assessment
│   ├── Discuss symptoms and medical history
│   ├── Share screen for medical reports/images
│   ├── Use moderator controls as needed
│   ├── Monitor connection quality throughout
│   └── Take real-time consultation notes
├── End video session and documentation
│   ├── End video call for all participants
│   ├── Session automatically logs duration
│   ├── Add diagnosis and treatment notes
│   ├── Prescribe medications (if needed)
│   ├── Complete appointment documentation
│   ├── Send prescription to patient
│   └── Mark appointment as completed
├── First video consultation completed
└── → Build ongoing patient relationship
```

---

## Returning User Workflows

### Returning Patient (Quick Booking)
```
Express Appointment (5 minutes)
├── Login to dashboard
├── Click "Book Appointment"
├── Options:
│   ├── "Book with Previous Doctor" → Quick selection
│   └── "Find New Specialist" → Browse doctors
├── Select available time slot
├── Add visit reason
├── Confirm booking
├── Appointment scheduled
└── Receive confirmation
```

### Returning Doctor (Daily Routine)
```
Daily Practice Management (30 minutes)
├── Login to doctor dashboard
├── Review today's appointment schedule
├── Check patient messages → Respond to urgent ones
├── Conduct scheduled consultations
├── Update patient records after each visit
├── Respond to follow-up questions
├── Set availability for upcoming days
└── Daily practice tasks completed
```

---

## Specialized User Scenarios

### Emergency Consultation
```
Urgent Care Flow (10 minutes)
├── Patient clicks "Emergency Appointment"
├── System shows immediately available doctors
├── Patient selects doctor → Books emergency slot
├── Doctor receives urgent notification
├── Doctor accepts emergency consultation
├── Immediate consultation begins
├── Emergency care provided
└── Follow-up care scheduled if needed
```

### Follow-up Care Management
```
Continuous Care
├── Patient sends follow-up message to doctor
├── Doctor reviews patient progress
├── Doctor provides additional care instructions
├── Patient asks questions about treatment
├── Doctor adjusts treatment plan if needed
├── Next appointment scheduled
└── Ongoing healthcare relationship maintained
```

### Prescription Management
```
Medication Workflow
├── Patient requests prescription refill
├── Doctor reviews patient medication compliance
├── Doctor approves/modifies prescription
├── Updated prescription sent to patient
├── Patient downloads new prescription
├── Patient sets medication reminders
└── Medication management complete
```

### Family Healthcare
```
Multiple Patient Care
├── Parent registers family members
├── Parent completes medical history for each
├── Parent books appointments for family members
├── Doctor provides family-centered care
├── Parent manages all family health records
└── Complete family healthcare management
```

---

## Cross-Platform Experience

### Desktop/Laptop Journey
- Full feature access with large screen interface
- Detailed medical history forms
- Comprehensive doctor profiles
- Multi-tab workflow support

### Mobile Device Journey  
- Touch-optimized interface
- Swipe navigation between sections
- Quick appointment booking
- Push notifications for reminders
- Camera integration for document upload

### Tablet Experience
- Hybrid interface optimized for medium screens
- Split-screen consultation views
- Touch-friendly medical form completion
- Professional presentation for doctor consultations

---

## User Success Milestones

### Patient Journey Success Metrics
1. **Registration → Email Verification**: < 5 minutes
2. **Medical History Completion**: < 15 minutes  
3. **First Appointment Booking**: < 10 minutes
4. **Time to First Consultation**: < 24 hours
5. **Patient Satisfaction Rate**: > 4.5/5 stars

### Doctor Journey Success Metrics
1. **Registration → Email Verification**: < 5 minutes
2. **Admin Approval Process**: < 48 hours
3. **Profile Setup Completion**: < 20 minutes
4. **First Patient Booking**: < 7 days
5. **Doctor Rating Achievement**: > 4.0/5 stars

---

## Technical User Experience

### Security Throughout Journey
- Secure authentication at every step
- Encrypted data transmission
- HIPAA-compliant data handling
- Session timeout protection
- Audit trail for all medical actions

### Performance Expectations
- Page load times: < 3 seconds
- Appointment booking: < 2 minutes
- Video consultation: HD quality with < 2 second delay
- Mobile responsiveness: 100% feature parity
- Offline capability: View medical records without internet

---

## Video Consultation Complete User Journey

### Patient-Doctor Video Consultation (Complete Flow)

**Scenario**: Patient has a scheduled video appointment and both parties are using the video consultation feature for the first time.

```
Complete Video Consultation Journey
├── Pre-Appointment Phase
│   ├── Patient books video appointment 
│   ├── Doctor confirms appointment
│   ├── Both receive email confirmation with video details
│   └── System schedules video session creation
├── 15 Minutes Before Appointment
│   ├── Patient Side:
│   │   ├── Receives reminder notification
│   │   ├── Clicks "Join Video Consultation" from dashboard
│   │   ├── Pre-consultation system checks begin
│   │   ├── Browser compatibility verified
│   │   ├── Network quality tested (latency, bandwidth)
│   │   ├── Camera and microphone permissions requested
│   │   ├── Device enumeration and selection
│   │   ├── Local video preview started
│   │   ├── Audio level testing with feedback
│   │   ├── Option to enable audio-only mode
│   │   ├── All systems marked as ready
│   │   └── Waits in pre-join screen
│   ├── Doctor Side:
│   │   ├── Reviews patient medical history
│   │   ├── Prepares consultation notes
│   │   └── Ready to start session
├── Appointment Time
│   ├── Doctor clicks "Start Video Consultation"
│   ├── System generates unique secure room (sahatak-12345-abcd1234)
│   ├── JWT token created (if configured)
│   ├── Doctor enters Jitsi room as moderator
│   ├── Patient receives "Doctor is starting the call" notification
│   ├── Patient automatically joins Jitsi room
│   ├── Video connection established between both parties
│   ├── Connection quality indicators shown to both
│   └── Consultation begins
├── During Video Consultation
│   ├── Face-to-face medical consultation
│   ├── Doctor uses moderator privileges
│   │   ├── Controls recording (if consented)
│   │   ├── Shares screen for medical reports
│   │   ├── Can mute/unmute if needed
│   │   └── Monitors session quality
│   ├── Patient can toggle own camera/microphone
│   ├── Real-time connection quality monitoring
│   ├── Automatic fallback to audio if video fails
│   ├── Doctor takes consultation notes in parallel
│   ├── Medical discussion and visual examination
│   ├── Prescription and treatment planning
│   └── Session duration tracked
├── End of Consultation
│   ├── Doctor clicks "End Consultation" 
│   ├── Video session terminated for all participants
│   ├── Session statistics logged (duration, quality, participants)
│   ├── Automatic cleanup of video resources
│   ├── Appointment marked as completed
│   ├── Patient sees post-consultation screen with summary
│   └── Both return to their respective dashboards
├── Post-Consultation Actions
│   ├── Doctor completes appointment documentation
│   ├── Prescription sent to patient (if applicable)
│   ├── Patient downloads prescription and notes
│   ├── Both can rate the consultation experience
│   ├── Follow-up appointment scheduled if needed
│   └── Medical records updated with consultation details
```

### Technical Error Handling Scenarios

```
Video Consultation Error Recovery
├── Network Connection Issues
│   ├── Poor network quality detected
│   ├── System suggests audio-only mode
│   ├── Automatic quality adjustment
│   ├── Connection retry attempts
│   └── Manual refresh option provided
├── Browser Compatibility Issues
│   ├── WebRTC not supported warning
│   ├── Browser update suggestion
│   ├── Alternative browser recommendations
│   └── Fallback to audio/chat consultation
├── Device Permission Issues
│   ├── Camera/microphone access denied
│   ├── Clear instructions for enabling permissions
│   ├── Browser-specific guidance provided
│   ├── Audio-only alternative offered
│   └── Technical support contact information
├── Session Interruption Recovery
│   ├── Automatic reconnection attempts
│   ├── "Connection lost" notification
│   ├── Rejoin session capability
│   ├── Doctor can restart session if needed
│   └── Session state preservation where possible
```

---

## Critical User Flow Optimization

### High-Priority Journeys
1. **New Patient → First Appointment**: Most critical for platform adoption
2. **Returning Patient → Quick Booking**: Highest frequency user action
3. **Emergency Consultation**: Time-sensitive, life-critical flow
4. **Doctor Onboarding**: Essential for platform supply

### Conversion Optimization Focus
- Minimize steps in appointment booking process
- Streamline medical history completion
- Reduce doctor approval waiting time
- Enhance mobile user experience
- Improve consultation quality and reliability

---

These user journeys represent the complete experience paths users take to achieve their healthcare goals, from initial platform discovery through ongoing medical care relationships.