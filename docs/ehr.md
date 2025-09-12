# Electronic Health Record (EHR) System - Sahatak Platform

## Overview

The Electronic Health Record (EHR) system in Sahatak is a comprehensive medical data management solution that allows doctors to access, view, and manage patient medical records securely. The system maintains complete medical histories including diagnoses, vital signs, medications, appointments, and medical history updates with proper access controls and audit trails.

## What is EHR?

Electronic Health Records (EHR) are digital versions of patients' paper charts. In the Sahatak platform, EHR encompasses:
- **Patient Medical Information**: Complete health profiles with demographics and medical history
- **Diagnosis Management**: Recording and tracking medical diagnoses with ICD-10 coding
- **Vital Signs Monitoring**: Time-series tracking of blood pressure, heart rate, temperature, etc.
- **Appointment Records**: Historical consultation data linked to medical events
- **Access Control**: Time-based permissions ensuring doctors only access authorized patient records

## EHR System Architecture

### Technology Stack
```
EHR System Components
├── Backend API (Python Flask)
│   ├── EHR Routes: backend/routes/ehr.py
│   ├── Database Models: backend/models.py (EHR-related tables)
│   ├── Access Control: Time-based patient access validation
│   └── Audit Logging: Complete medical data access tracking
├── Frontend Interface (HTML/JavaScript)
│   ├── Doctor EHR Page: frontend/pages/medical/doctor/ehr.html
│   ├── EHR Manager: frontend/assets/js/components/ehr-manager.js
│   ├── Styling: frontend/assets/css/components/ehr.css
│   └── Patient Search: Integrated patient lookup functionality
├── Security & Compliance
│   ├── Role-based Access Control (RBAC)
│   ├── Time-based Access Windows
│   ├── Audit Trail Logging
│   └── Data Validation & Sanitization
```

---

## Core Components and File Structure

### 1. Backend EHR API Routes
**Location**: `backend/routes/ehr.py`

The EHR routes handle all medical data operations with comprehensive security controls:

#### Patient Search Endpoint
```python
@ehr_bp.route('/patients/search', methods=['GET'])
@api_login_required
def search_patients():
    """Search for patients by name, ID, or phone number"""
```
**Key Features**:
- **Doctor-only Access**: Only verified doctors can search for patients
- **Flexible Search**: Supports name, phone number, and ID-based lookups
- **Appointment History**: Shows if doctor has previous consultation history
- **Result Limiting**: Maximum 50 results to prevent system overload

#### Comprehensive EHR Data Retrieval
```python
@ehr_bp.route('/patient/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_ehr(patient_id):
    """Get comprehensive EHR for a patient"""
```
**Security Implementation**:
- **Access Validation**: Uses `has_patient_access()` function with time-based controls
- **Audit Logging**: All EHR access attempts are logged for security monitoring
- **Data Aggregation**: Safely retrieves from multiple tables with error handling
- **Missing Table Handling**: Gracefully handles database schema evolution

#### Diagnosis Management
```python
@ehr_bp.route('/diagnoses', methods=['POST'])
@api_login_required  
def create_diagnosis():
    """Create a new diagnosis (doctors only)"""
```
**Validation & Processing**:
- **Text Field Validation**: Enforces minimum lengths and content validation
- **ICD-10 Support**: Optional medical coding integration
- **Follow-up Scheduling**: Built-in appointment follow-up system
- **Patient ID Resolution**: Handles both User ID and Patient ID references

#### Vital Signs Recording
```python
@ehr_bp.route('/vital-signs', methods=['POST'])
@api_login_required
def record_vital_signs():
    """Record vital signs (doctors or patients)"""
```
**Advanced Features**:
- **Multi-user Support**: Both doctors and patients can record readings
- **Type Conversion**: Safe handling of numeric input with validation
- **BMI Auto-calculation**: Automatic Body Mass Index computation
- **Range Validation**: Medical range checking for all vital signs

### 2. Access Control System
**Location**: `backend/routes/ehr.py:599-691`

The platform implements sophisticated time-based access controls:

```python
def has_patient_access(patient_id, emergency_access=False):
    """
    Check if current user has access to patient records
    """
```

**Access Windows for Doctors**:
- **30 days before** scheduled appointments
- **24-hour window** around active appointments  
- **1 year after** completed appointments
- **Emergency access** with critical logging and review requirements

**Security Features**:
- **Admin Override**: Full access with mandatory audit logging
- **Patient Self-Access**: Patients can only access their own records
- **Emergency Protocol**: Special access mode with administrator alerts
- **Comprehensive Logging**: All access attempts tracked with user actions

### 3. Database Schema Design
**Location**: `backend/models.py` (EHR-related models)

#### Patient Information Model
```python
class Patient(db.Model):
    # Core patient demographics and medical info
    age = db.Column(db.Integer, nullable=False)
    gender = db.Column(db.Enum('male', 'female'), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    blood_type = db.Column(db.String(5))
    height = db.Column(db.Float)  # cm
    weight = db.Column(db.Float)  # kg
    emergency_contact = db.Column(db.String(20))
    
    # Medical history fields
    medical_history = db.Column(db.Text)
    allergies = db.Column(db.Text)
    current_medications = db.Column(db.Text)
    chronic_conditions = db.Column(db.Text)
    family_history = db.Column(db.Text)
    surgical_history = db.Column(db.Text)
```

#### Diagnosis Tracking Model
```python
class Diagnosis(db.Model):
    """Structured diagnosis tracking system for comprehensive EHR"""
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    
    # Clinical data
    primary_diagnosis = db.Column(db.Text, nullable=False)
    secondary_diagnoses = db.Column(JSON)  # Array of additional diagnoses
    icd_10_code = db.Column(db.String(20))
    severity = db.Column(db.Enum('mild', 'moderate', 'severe', 'critical'))
    status = db.Column(db.Enum('provisional', 'confirmed', 'differential', 'rule_out'))
    
    # Clinical findings and treatment
    symptoms_reported = db.Column(JSON)  # Array of symptoms
    clinical_findings = db.Column(db.Text)
    diagnostic_tests = db.Column(JSON)  # Array of test results
    treatment_plan = db.Column(db.Text)
    
    # Follow-up management
    follow_up_required = db.Column(db.Boolean, default=False)
    follow_up_date = db.Column(db.DateTime)
    follow_up_notes = db.Column(db.Text)
    
    # Resolution tracking
    resolved = db.Column(db.Boolean, default=False)
    resolution_date = db.Column(db.DateTime)
    resolution_notes = db.Column(db.Text)
```

#### Vital Signs Monitoring Model
```python
class VitalSigns(db.Model):
    """Vital signs tracking over time for comprehensive patient monitoring"""
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Cardiovascular measurements
    systolic_bp = db.Column(db.Integer)  # Blood pressure systolic
    diastolic_bp = db.Column(db.Integer)  # Blood pressure diastolic
    heart_rate = db.Column(db.Integer)  # Beats per minute
    
    # Respiratory and temperature
    temperature = db.Column(db.Float)  # Celsius
    respiratory_rate = db.Column(db.Integer)  # Breaths per minute
    oxygen_saturation = db.Column(db.Float)  # SpO2 percentage
    
    # Physical measurements
    height = db.Column(db.Float)  # cm
    weight = db.Column(db.Float)  # kg
    bmi = db.Column(db.Float)  # Auto-calculated
    
    # Pain assessment
    pain_scale = db.Column(db.Integer)  # 0-10 scale
    pain_location = db.Column(db.String(200))
    
    # Metadata
    measured_at = db.Column(db.DateTime, default=datetime.utcnow)
    recorded_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'))
    notes = db.Column(db.Text)
```

#### Medical History Updates Model
```python
class MedicalHistoryUpdate(db.Model):
    """Track all changes to patient medical history"""
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Update tracking
    update_type = db.Column(db.Enum('initial_registration', 'appointment_update', 
                                  'patient_self_update', 'doctor_update'))
    updated_fields = db.Column(JSON)  # Array of changed field names
    old_values = db.Column(JSON)  # Previous values for audit
    new_values = db.Column(JSON)  # New values
    
    # Metadata
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'))
```

---

## Frontend EHR Interface

### 1. Doctor EHR Page
**Location**: `frontend/pages/medical/doctor/ehr.html`

The EHR interface provides a comprehensive view of patient medical records:

#### Page Structure
```html
<!-- Patient Search Section -->
<div class="row mb-4" id="patient-search-section">
    <!-- Advanced patient search with filters -->
</div>

<!-- Selected Patient Information -->
<div class="row mb-4 d-none" id="selected-patient-section">
    <!-- Patient demographic display -->
</div>

<!-- Main EHR Content -->
<div id="main-ehr-content" class="d-none">
    <!-- Quick Action Cards -->
    <div class="row mb-4">
        <div class="col-lg-3 col-md-6 mb-3">
            <div class="dashboard-card quick-action-card" onclick="generateMedicalTimeline()">
                <!-- Medical Timeline Access -->
            </div>
        </div>
        <!-- Additional quick actions for appointments, prescriptions, vital signs -->
    </div>
    
    <!-- EHR Tab Navigation -->
    <ul class="nav nav-tabs ehr-tabs" id="ehrTab" role="tablist">
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="diagnoses-tab">Diagnoses</button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="vitals-tab">Vital Signs</button>
        </li>
        <!-- Additional tabs for history and appointments -->
    </ul>
</div>
```

#### Interactive Features
1. **Patient Search**: Real-time patient lookup with appointment history
2. **Tabbed Interface**: Organized medical data in logical sections
3. **Quick Actions**: Direct access to common medical tasks
4. **Responsive Design**: Mobile-optimized for clinical use
5. **Print/Export**: Professional medical record output

### 2. EHR Manager JavaScript
**Location**: `frontend/assets/js/components/ehr-manager.js`

The EHR Manager handles all frontend medical data operations:

#### Core Initialization
```javascript
const EHRManager = {
    patientId: null,
    ehrData: null,
    charts: {},
    currentTab: 'diagnoses',
    
    async init(patientId) {
        this.patientId = patientId;
        await LanguageManager.loadTranslations();
        this.setupEventListeners();
        await this.loadEHRData();
    }
}
```

#### Patient Search Functionality
```javascript
async searchPatients(searchTerm, filters = {}) {
    const params = new URLSearchParams();
    params.append('search', searchTerm);
    // Add optional filters
    if (filters.age_min) params.append('age_min', filters.age_min);
    
    const response = await ApiHelper.makeRequest(`/ehr/patients/search?${params}`);
    return response;
}
```

#### Comprehensive EHR Data Loading
```javascript
async loadEHRData() {
    try {
        this.showLoading(true);
        const response = await ApiHelper.makeRequest(`/ehr/patient/${this.patientId}`);
        
        if (response.success) {
            this.ehrData = response.data.ehr;
            this.renderPatientOverview();
            this.renderAllTabs();
            this.showContent(true);
        }
    } catch (error) {
        // Development mode fallback with mock data
        if (AuthGuard.isDevelopmentMode()) {
            this.loadMockEHRData();
        } else {
            this.showAlert('error', 'Failed to load medical record');
        }
    }
}
```

#### Diagnosis Management Interface
```javascript
async saveDiagnosis() {
    const formData = {
        patient_id: this.patientId,
        primary_diagnosis: document.getElementById('primary_diagnosis').value.trim(),
        severity: document.getElementById('severity').value,
        clinical_findings: document.getElementById('clinical_findings').value.trim(),
        treatment_plan: document.getElementById('treatment_plan').value.trim(),
        follow_up_required: document.getElementById('follow_up_required').checked
    };
    
    // Validate minimum length requirements
    if (formData.primary_diagnosis.length < 10) {
        throw new Error('Primary diagnosis must be at least 10 characters long');
    }
    
    const response = await ApiHelper.makeRequest('/ehr/diagnoses', {
        method: 'POST',
        body: JSON.stringify(formData)
    });
}
```

#### Vital Signs Visualization
```javascript
createBloodPressureChart(vitals) {
    const ctx = document.getElementById('bloodPressureChart');
    const data = vitals.filter(v => v.systolic_bp && v.diastolic_bp);
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(v => new Date(v.measured_at).toLocaleDateString()),
            datasets: [
                {
                    label: 'Systolic',
                    data: data.map(v => v.systolic_bp),
                    borderColor: '#dc3545',
                    tension: 0.4
                },
                {
                    label: 'Diastolic', 
                    data: data.map(v => v.diastolic_bp),
                    borderColor: '#007bff',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: false, min: 40, max: 200 }
            }
        }
    });
}
```

---

## EHR System Workflows

### Complete Patient EHR Access Flow
```
Doctor Login & Authentication
├── Patient Search Interface
│   ├── Search by name, phone, or ID
│   ├── Display search results with history indicators
│   └── Select patient from results
├── Access Control Validation
│   ├── Check doctor-patient appointment relationship
│   ├── Validate access time windows
│   ├── Log access attempt for audit
│   └── Grant or deny access
├── EHR Data Aggregation
│   ├── Patient demographic information
│   ├── Active and resolved diagnoses
│   ├── Vital signs time-series data
│   ├── Appointment history
│   └── Medical history updates
├── Interactive EHR Display
│   ├── Patient overview with key metrics
│   ├── Tabbed medical data sections
│   ├── Charts and visualizations
│   └── Action buttons for medical tasks
```

### Diagnosis Creation Workflow
```
New Diagnosis Entry
├── Doctor opens diagnosis form
├── Patient ID validation and resolution
├── Clinical data entry
│   ├── Primary diagnosis (required, min 10 chars)
│   ├── Severity and status selection
│   ├── ICD-10 code (optional)
│   ├── Clinical findings documentation
│   ├── Treatment plan details
│   └── Follow-up requirements
├── Backend validation
│   ├── Text field length validation
│   ├── Medical terminology checking
│   ├── Date format validation
│   └── Doctor-patient access verification
├── Database storage
│   ├── Create diagnosis record
│   ├── Link to appointment if applicable
│   ├── Log action for audit trail
│   └── Update patient EHR timeline
├── Frontend update
│   ├── Refresh diagnosis display
│   ├── Update patient overview
│   ├── Show success notification
│   └── Close form modal
```

### Vital Signs Recording Workflow
```
Vital Signs Entry
├── Multi-user support (doctor or patient)
├── Comprehensive measurement form
│   ├── Blood pressure (systolic/diastolic)
│   ├── Heart rate and temperature
│   ├── Respiratory rate and oxygen saturation
│   ├── Physical measurements (height/weight)
│   ├── Pain assessment (scale/location)
│   └── Additional notes
├── Real-time validation
│   ├── Medical range checking
│   ├── Type conversion (string to numeric)
│   ├── BMI auto-calculation
│   └── Cross-field validation
├── Database storage with metadata
│   ├── Measurement timestamp
│   ├── Recording user identification
│   ├── Appointment linkage (if applicable)
│   └── Audit logging
├── Chart data update
│   ├── Blood pressure trend charts
│   ├── Heart rate monitoring
│   ├── Historical comparisons
│   └── Normal range indicators
```

---

## Security & Compliance Features

### Access Control Implementation
**Location**: `backend/routes/ehr.py:599-691`

#### Time-Based Access Windows
The system implements sophisticated access controls based on appointment relationships:

```python
# Doctor access timeframes
access_start = now - timedelta(days=30)  # 30 days before appointments
access_end_past = now - timedelta(days=365)  # 1 year after appointments

valid_appointment = Appointment.query.filter(
    and_(
        Appointment.patient_id == patient_id,
        Appointment.doctor_id == user_profile.id,
        or_(
            # Future appointments (within 30 days)
            and_(
                Appointment.appointment_date > now,
                Appointment.appointment_date <= now + timedelta(days=30),
                Appointment.status.in_(['scheduled', 'confirmed'])
            ),
            # Active appointments (24-hour window)  
            and_(
                Appointment.status.in_(['in_progress', 'confirmed', 'completed']),
                Appointment.appointment_date <= now + timedelta(hours=24)
            ),
            # Recent past appointments (within 1 year)
            and_(
                Appointment.appointment_date >= access_end_past,
                Appointment.appointment_date <= now,
                Appointment.status.in_(['completed', 'cancelled', 'no_show'])
            )
        )
    )
)
```

**Access Control Rules**:
1. **Future Appointments**: 30-day advance access for preparation
2. **Active Appointments**: 24-hour window around appointment time
3. **Historical Access**: 1 year access to past appointment records
4. **Patient Self-Access**: Always allowed to own records
5. **Admin Override**: Full access with mandatory audit logging
6. **Emergency Access**: Special override with critical logging

### Comprehensive Audit Logging
**Location**: Throughout `backend/routes/ehr.py`

All EHR operations are logged for security and compliance:

```python
# Successful EHR access logging
log_user_action(
    current_user.id,
    'ehr_access_granted',
    {
        'patient_id': patient_id,
        'endpoint': 'get_patient_ehr',
        'user_type': current_user.user_type
    },
    request
)

# Unauthorized access attempt logging
log_user_action(
    current_user.id,
    'unauthorized_ehr_access_attempt',
    {
        'patient_id': patient_id,
        'endpoint': 'get_patient_ehr',
        'reason': 'no_valid_appointment_in_timeframe'
    },
    request
)
```

### Data Validation & Sanitization
**Location**: `backend/utils/validators.py` and form validation throughout EHR routes

#### Text Field Validation
```python
def validate_text_field_length(value, field_name, max_len, min_len):
    """Validate text field length and content"""
    if len(value) < min_len:
        return {
            'valid': False,
            'message': f'{field_name} must be at least {min_len} characters'
        }
    
    if len(value) > max_len:
        return {
            'valid': False, 
            'message': f'{field_name} cannot exceed {max_len} characters'
        }
    
    return {'valid': True}
```

#### Vital Signs Range Validation
```python
def validate_vital_signs_ranges(data):
    """Validate vital signs are within medically acceptable ranges"""
    ranges = {
        'systolic_bp': (60, 250),
        'diastolic_bp': (40, 150),
        'heart_rate': (30, 200),
        'temperature': (35, 45),
        'respiratory_rate': (8, 40),
        'oxygen_saturation': (70, 100)
    }
    
    for field, (min_val, max_val) in ranges.items():
        if field in data and data[field] is not None:
            if not (min_val <= data[field] <= max_val):
                return {
                    'valid': False,
                    'message': f'{field} must be between {min_val} and {max_val}'
                }
    
    return {'valid': True}
```

---

## Advanced EHR Features

### 1. Medical Timeline Generation
**Location**: `frontend/assets/js/components/ehr-manager.js:1339-1396`

```javascript
generateMedicalTimeline() {
    const timeline = [];
    
    // Add diagnoses to timeline
    this.ehrData.diagnoses?.forEach(diagnosis => {
        timeline.push({
            date: diagnosis.diagnosis_date,
            type: 'diagnosis',
            title: 'New Diagnosis',
            description: diagnosis.primary_diagnosis,
            data: diagnosis
        });
        
        // Add resolution events
        if (diagnosis.resolution_date) {
            timeline.push({
                date: diagnosis.resolution_date,
                type: 'diagnosis',
                title: 'Diagnosis Resolved',
                description: `Resolved: ${diagnosis.primary_diagnosis}`,
                data: diagnosis
            });
        }
    });
    
    // Sort timeline by date (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    return timeline;
}
```

### 2. Health Score Calculation
**Location**: `frontend/assets/js/components/ehr-manager.js:1425-1447`

```javascript
calculateHealthScore() {
    let score = 100; // Start with perfect score
    const patient = this.ehrData.patient_info;
    const latestVitals = this.ehrData.vital_signs?.[0];
    const activeDiagnoses = this.ehrData.diagnoses?.filter(d => !d.resolved) || [];
    
    // Deduct points for active diagnoses
    score -= activeDiagnoses.length * 10;
    
    // Deduct points for vital signs outside normal range
    if (latestVitals) {
        if (latestVitals.systolic_bp > 140 || latestVitals.diastolic_bp > 90) score -= 15;
        if (latestVitals.bmi > 30) score -= 10;
        if (latestVitals.heart_rate > 100 || latestVitals.heart_rate < 60) score -= 5;
    }
    
    // Deduct points for lifestyle factors
    if (patient.smoking_status === 'current') score -= 20;
    if (patient.exercise_frequency === 'none') score -= 10;
    if (patient.chronic_conditions) score -= 15;
    
    return Math.max(0, Math.min(100, score));
}
```

### 3. Risk Factor Analysis
**Location**: `frontend/assets/js/components/ehr-manager.js:1030-1074`

```javascript
identifyRiskFactors() {
    const patient = this.ehrData.patient_info;
    const risks = [];
    
    // Age-related risks
    if (patient.age > 65) {
        risks.push({
            type: 'age',
            level: 'medium', 
            description: 'Senior patient - additional health monitoring required'
        });
    }
    
    // Lifestyle risks
    if (patient.smoking_status === 'current') {
        risks.push({
            type: 'lifestyle',
            level: 'high',
            description: 'Smoking - high risk for heart and lung complications'
        });
    }
    
    // Vital signs risks
    const latestVitals = this.ehrData.vital_signs?.[0];
    if (latestVitals) {
        if (latestVitals.systolic_bp > 140 || latestVitals.diastolic_bp > 90) {
            risks.push({
                type: 'vitals',
                level: 'high',
                description: 'High blood pressure detected'
            });
        }
    }
    
    return risks;
}
```

### 4. EHR Data Export System
**Location**: `frontend/assets/js/components/ehr-manager.js:1077-1119`

```javascript
async exportEHRToPDF() {
    const summary = this.generateEHRSummary();
    
    let exportText = `Electronic Health Record - ${summary.patient_info.user?.full_name}\n`;
    exportText += `Date: ${new Date().toLocaleDateString()}\n\n`;
    
    exportText += `Basic Information:\n`;
    exportText += `Age: ${summary.patient_info.age}\n`;
    exportText += `Gender: ${summary.patient_info.gender}\n`;
    exportText += `Blood Type: ${summary.patient_info.blood_type || 'Not specified'}\n\n`;
    
    if (summary.active_diagnoses.length > 0) {
        exportText += `Active Diagnoses:\n`;
        summary.active_diagnoses.forEach(diagnosis => {
            exportText += `- ${diagnosis.primary_diagnosis}\n`;
        });
    }
    
    // Create downloadable file
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ehr_${this.patientId}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
}
```

---

## Development Setup and Testing

### Setting up EHR Development Environment

#### 1. Backend Setup
```bash
# Ensure Flask environment is configured
cd backend
pip install -r requirements.txt

# Initialize database tables
python -c "from app import db; db.create_all()"

# Verify EHR routes registration
python -c "from app import app; print([rule.rule for rule in app.url_map.iter_rules() if 'ehr' in rule.rule])"
```

#### 2. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Verify EHR assets are present
ls -la assets/js/components/ehr-manager.js
ls -la assets/css/components/ehr.css
ls -la pages/medical/doctor/ehr.html

# Test page loading (development server required)
# Open browser to: http://localhost/pages/medical/doctor/ehr.html
```

#### 3. Database Schema Verification
```python
# Python script to verify EHR table structure
from backend.models import db, Patient, Diagnosis, VitalSigns, MedicalHistoryUpdate

# Check table creation
print("EHR Tables:")
print("- patients:", Patient.__table__.exists())
print("- diagnoses:", Diagnosis.__table__.exists())  
print("- vital_signs:", VitalSigns.__table__.exists())
print("- medical_history_updates:", MedicalHistoryUpdate.__table__.exists())
```

### Testing EHR Functionality

#### 1. Access Control Testing
```python
# Test time-based access controls
from backend.routes.ehr import has_patient_access
from backend.models import User, Patient, Doctor, Appointment
from datetime import datetime, timedelta

# Test scenarios
test_cases = [
    "Doctor with upcoming appointment (within 30 days)",
    "Doctor with past appointment (within 1 year)", 
    "Doctor with no appointment relationship",
    "Patient accessing own records",
    "Admin accessing any records"
]
```

#### 2. API Endpoint Testing
```bash
# Test patient search endpoint
curl -X GET "http://localhost:5000/api/ehr/patients/search?q=Ahmed" \
  -H "Authorization: Bearer [JWT_TOKEN]"

# Test EHR data retrieval
curl -X GET "http://localhost:5000/api/ehr/patient/1" \
  -H "Authorization: Bearer [JWT_TOKEN]"

# Test diagnosis creation
curl -X POST "http://localhost:5000/api/ehr/diagnoses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -d '{"patient_id": 1, "primary_diagnosis": "Acute pharyngitis with mild severity"}'
```

#### 3. Frontend Integration Testing
```javascript
// Test EHR Manager initialization
document.addEventListener('DOMContentLoaded', async function() {
    // Test patient search
    const searchResults = await EHRManager.searchPatients('Ahmed');
    console.log('Search results:', searchResults);
    
    // Test EHR data loading
    await EHRManager.init(1);
    console.log('EHR data loaded:', EHRManager.ehrData);
    
    // Test health score calculation
    const healthScore = EHRManager.calculateHealthScore();
    console.log('Patient health score:', healthScore);
});
```

### Common EHR Development Issues

#### 1. Access Control Problems
```python
# Issue: Doctor cannot access patient records
# Solution: Check appointment relationship and time windows

# Debug access control
def debug_patient_access(doctor_id, patient_id):
    appointments = Appointment.query.filter_by(
        doctor_id=doctor_id,
        patient_id=patient_id
    ).all()
    
    print(f"Doctor {doctor_id} appointments with Patient {patient_id}:")
    for apt in appointments:
        print(f"- Date: {apt.appointment_date}, Status: {apt.status}")
    
    # Check current access
    access_allowed = has_patient_access(patient_id)
    print(f"Access allowed: {access_allowed}")
```

#### 2. Frontend Chart Loading Issues
```javascript
// Issue: Vital signs charts not displaying
// Solution: Ensure Chart.js is loaded and data is valid

function debugVitalSignsCharts() {
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');
    console.log('Vital signs data:', EHRManager.ehrData?.vital_signs);
    
    const canvas = document.getElementById('bloodPressureChart');
    console.log('Chart canvas found:', !!canvas);
    
    if (canvas && EHRManager.ehrData?.vital_signs?.length > 0) {
        EHRManager.createBloodPressureChart(EHRManager.ehrData.vital_signs);
    }
}
```

#### 3. Data Validation Errors
```python
# Issue: Diagnosis creation fails validation
# Solution: Check text field length requirements

def validate_diagnosis_data(form_data):
    issues = []
    
    if len(form_data.get('primary_diagnosis', '')) < 10:
        issues.append('Primary diagnosis too short (minimum 10 characters)')
    
    if form_data.get('severity') not in ['mild', 'moderate', 'severe', 'critical', None]:
        issues.append('Invalid severity level')
    
    if issues:
        print('Validation issues:', issues)
        return False
    return True
```

---

## Integration Points

### 1. Appointment System Integration
**Files**: `backend/models.py`, `backend/routes/ehr.py`

EHR records are automatically linked to appointments:
```python
# Diagnosis linked to appointment
diagnosis = Diagnosis(
    patient_id=patient_id,
    doctor_id=doctor.id,
    appointment_id=appointment_id,  # Links to specific consultation
    primary_diagnosis=data['primary_diagnosis']
)
```

### 2. User Management Integration
**Files**: `backend/routes/auth.py`, `backend/routes/ehr.py`

EHR access leverages the existing authentication system:
```python
@ehr_bp.route('/patient/<int:patient_id>', methods=['GET'])
@api_login_required  # Uses existing auth decorator
def get_patient_ehr(patient_id):
    # current_user available from auth system
    if not has_patient_access(patient_id):
        return APIResponse.forbidden('Access denied')
```

### 3. Messaging System Integration
**Files**: `frontend/assets/js/components/messaging.js`

EHR events can trigger notifications:
```javascript
// Send notification when new diagnosis is created
if (response.success) {
    NotificationManager.send({
        type: 'medical_update',
        patient_id: this.patientId,
        message: `New diagnosis recorded: ${formData.primary_diagnosis}`
    });
}
```

### 4. Video Call Integration
EHR data is accessible during video consultations for real-time medical reference.

---

## API Reference

### EHR Endpoints Summary

| Endpoint | Method | Description | Access Level |
|----------|---------|-------------|--------------|
| `/ehr/patients/search` | GET | Search for patients | Doctor only |
| `/ehr/patient/<id>` | GET | Get comprehensive EHR | Time-based access |
| `/ehr/diagnoses` | POST | Create new diagnosis | Doctor only |
| `/ehr/diagnoses/<id>` | PUT | Update existing diagnosis | Owner doctor only |
| `/ehr/vital-signs` | POST | Record vital signs | Doctor or Patient |
| `/ehr/vital-signs/patient/<id>` | GET | Get vital signs history | Time-based access |
| `/ehr/diagnoses/patient/<id>` | GET | Get diagnosis history | Time-based access |

### Request/Response Examples

#### Patient Search
```javascript
// Request
GET /api/ehr/patients/search?q=Ahmed&limit=10

// Response
{
    "success": true,
    "data": {
        "patients": [
            {
                "id": 1,
                "name": "Ahmed Mohamed",
                "patient_id": "PAT-000001",
                "age": 35,
                "phone": "+249123456789",
                "gender": "male",
                "has_history": true,
                "last_visit": "2025-01-15"
            }
        ],
        "query": "Ahmed"
    },
    "message": "Found 1 patient(s)"
}
```

#### EHR Data Retrieval
```javascript
// Request
GET /api/ehr/patient/1

// Response
{
    "success": true,
    "data": {
        "ehr": {
            "patient_info": {
                "user": { "full_name": "Ahmed Mohamed" },
                "age": 35,
                "gender": "male",
                "blood_type": "A+",
                "medical_history": "No significant medical history"
            },
            "diagnoses": [
                {
                    "id": 1,
                    "primary_diagnosis": "Acute pharyngitis",
                    "severity": "mild",
                    "status": "confirmed",
                    "diagnosis_date": "2025-01-15T10:00:00Z",
                    "resolved": false
                }
            ],
            "vital_signs": [
                {
                    "id": 1,
                    "measured_at": "2025-01-15T10:00:00Z",
                    "systolic_bp": 120,
                    "diastolic_bp": 80,
                    "heart_rate": 72,
                    "temperature": 36.8
                }
            ]
        }
    },
    "message": "Patient EHR retrieved successfully"
}
```

---

## Summary

The Sahatak EHR system provides a comprehensive, secure, and user-friendly platform for managing patient medical records. Key features include:

### Core Capabilities:
1. **Comprehensive Patient Records**: Complete medical history tracking with demographics, diagnoses, vital signs, and appointments
2. **Advanced Security**: Time-based access controls, audit logging, and role-based permissions
3. **Interactive Interface**: Responsive web interface with charts, search, and medical timeline
4. **Multi-user Support**: Different access levels for doctors, patients, and administrators
5. **Integration Ready**: Seamless integration with appointments, messaging, and video consultation systems

### Technical Architecture:
- **Backend**: Python Flask with SQLAlchemy ORM and comprehensive validation
- **Frontend**: Modern JavaScript with Chart.js visualization and Bootstrap UI
- **Database**: PostgreSQL with structured medical data models
- **Security**: JWT authentication with time-based access controls
- **Compliance**: Full audit logging and data validation for medical standards

### Development Features:
- **Mock Data Support**: Development mode with sample medical data
- **Error Handling**: Graceful degradation and user-friendly error messages
- **Extensible Design**: Modular architecture supporting additional medical features
- **Documentation**: Comprehensive inline documentation and code comments

### File References:
- **Backend API**: `backend/routes/ehr.py` (main EHR routes)
- **Database Models**: `backend/models.py` (Patient, Diagnosis, VitalSigns, etc.)
- **Frontend Interface**: `frontend/pages/medical/doctor/ehr.html`
- **JavaScript Manager**: `frontend/assets/js/components/ehr-manager.js`
- **Styling**: `frontend/assets/css/components/ehr.css`
- **Validation**: `backend/utils/validators.py`

For additional information about related systems, refer to:
- [Authentication System](./SessionManagement.md) - User login and session management
- [Appointment System](./AppointmentBooking.md) - Medical appointment scheduling
- [API Documentation](./API.md) - Complete API reference guide

The EHR system represents the core of the Sahatak medical platform, providing doctors with the tools they need to deliver high-quality patient care while maintaining the highest standards of data security and medical compliance.