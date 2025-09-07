# API Architecture in Sahatak Telemedicine Platform

## Table of Contents
1. [What is an API?](#what-is-an-api)
2. [Sahatak API Architecture](#sahatak-api-architecture)
3. [API Helper - Our JavaScript Helper](#api-helper---our-javascript-helper)
4. [Backend API Structure](#backend-api-structure)
5. [Authentication & Security](#authentication--security)
6. [API Response Format](#api-response-format)
7. [Frontend-Backend Communication](#frontend-backend-communication)
8. [Common API Patterns](#common-api-patterns)
9. [Error Handling](#error-handling)
10. [Real Examples](#real-examples)

## What is an API?

**API** stands for **Application Programming Interface**. Think of it as a waiter in a restaurant:

- **You (Frontend)** are the customer who wants food
- **Kitchen (Backend)** prepares the food but you can't go there directly
- **Waiter (API)** takes your order to the kitchen and brings back your food

In web development:
- **Frontend** (what users see) needs data and functionality
- **Backend** (server) has data and business logic
- **API** is the bridge that lets them communicate

### Why Separate Frontend and Backend?

```
Traditional Web App:
┌─────────────────────┐
│   Single Server     │
│  ┌─────┐ ┌─────┐   │
│  │HTML │ │Data │   │
│  └─────┘ └─────┘   │
└─────────────────────┘

Modern Sahatak App:
┌──────────────┐    API    ┌──────────────┐
│   Frontend   │◄─────────►│   Backend    │
│ (GitHub Pages)│   Calls   │(PythonAnywhere)│
│   HTML/JS    │           │  Python/Flask│
└──────────────┘           └──────────────┘
```

**Benefits:**
- **Scalability**: Frontend and backend can scale independently
- **Flexibility**: Can have mobile app, web app, desktop app using same API
- **Team Separation**: Frontend and backend teams can work independently
- **Technology Choice**: Can use different technologies for each part

## Sahatak API Architecture

### Overall Architecture

```
User Browser (Frontend)
        │
        │ HTTP Requests
        ▼
┌─────────────────────┐
│    API Helper       │ ← JavaScript helper class
│  (Handles all API   │
│   communication)    │
└─────────────────────┘
        │
        │ HTTPS + JWT Token
        ▼
┌─────────────────────┐
│   Flask Backend     │
│                     │
│  ┌───────────────┐ │
│  │ Auth Routes   │ │ ← /api/auth/*
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │Appointment    │ │ ← /api/appointments/*
│  │Routes         │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │Medical Records│ │ ← /api/medical-records/*
│  │Routes         │ │
│  └───────────────┘ │
│  ┌───────────────┐ │
│  │Message Routes │ │ ← /api/messages/*
│  └───────────────┘ │
└─────────────────────┘
        │
        ▼
┌─────────────────────┐
│     Database        │
│   (SQLite/MySQL)    │
└─────────────────────┘
```

### Key Components

1. **Frontend**: HTML/CSS/JavaScript (GitHub Pages)
2. **API Helper**: JavaScript class that handles all API communication
3. **Backend API**: Python Flask application with organized routes
4. **Database**: Stores all application data

## API Helper - Our JavaScript Helper

### What is ApiHelper?

Located in `frontend/assets/js/main.js`, ApiHelper is a JavaScript class that:
- Makes all API calls to the backend
- Handles authentication automatically
- Manages errors consistently
- Provides caching for performance
- Adds security headers

### Why Use ApiHelper?

**Without ApiHelper (Bad Approach):**
```javascript
// Every file would need this repetitive code
const response = await fetch('https://sahatak.pythonanywhere.com/api/appointments', {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sahatak_access_token')}`,
        'Accept-Language': 'ar'
    },
    credentials: 'include'
});

if (!response.ok) {
    if (response.status === 401) {
        // Handle authentication error
        window.location.href = 'login.html';
    }
    throw new Error('API call failed');
}

const data = await response.json();
```

**With ApiHelper (Good Approach):**
```javascript
// Simple, clean, consistent
const response = await ApiHelper.makeRequest('/appointments');
```

### ApiHelper Implementation

```javascript
// frontend/assets/js/main.js
const ApiHelper = {
    baseUrl: 'https://sahatak.pythonanywhere.com/api',
    
    // Main method for making API calls
    async makeRequest(endpoint, options = {}) {
        const language = LanguageManager.getLanguage() || 'ar';
        const method = options.method || 'GET';
        
        // Add JWT token automatically
        const token = localStorage.getItem('sahatak_access_token');
        const authHeaders = {};
        if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        // Default options for all requests
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
                'X-Timestamp': Date.now().toString(),
                ...authHeaders,
                ...options.headers  // Allow overriding headers
            },
            credentials: 'include'  // Important for CORS with cookies
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            
            // Handle authentication errors automatically
            if (response.status === 401) {
                await this.handleSessionExpired();
                throw new ApiError('Your session has expired. Please log in again.', 401);
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new ApiError(data.message || 'API request failed', response.status);
            }
            
            return data;
            
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Handle session expiry
    async handleSessionExpired() {
        localStorage.removeItem('sahatak_access_token');
        localStorage.removeItem('sahatak_user_type');
        localStorage.removeItem('sahatak_user_id');
        window.location.href = '/';
    }
};
```

### ApiHelper Benefits

1. **Consistency**: All API calls work the same way
2. **Authentication**: Automatically adds JWT tokens
3. **Error Handling**: Consistent error management
4. **Security**: Proper headers and credentials
5. **Maintainability**: One place to update API logic
6. **Language Support**: Automatically sends user's language preference

## Backend API Structure

### Flask Application Setup

```python
# backend/app.py
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

app = Flask(__name__)

# Configure CORS for frontend communication
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://hello-50.github.io"],
        "supports_credentials": True
    }
})

# JWT configuration for authentication
jwt = JWTManager(app)
app.config['JWT_SECRET_KEY'] = 'your-secret-key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)

# Register API blueprints (route groups)
from routes.auth import auth_bp
from routes.appointments import appointments_bp
from routes.medical_records import medical_records_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
app.register_blueprint(medical_records_bp, url_prefix='/api/medical-records')
```

### API Routes Organization

The backend is organized into logical route groups (blueprints):

#### 1. Authentication Routes (`backend/routes/auth.py`)
```python
@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint"""
    pass

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    pass

@auth_bp.route('/logout', methods=['POST'])
@api_login_required
def logout():
    """User logout endpoint"""
    pass
```

#### 2. Appointment Routes (`backend/routes/appointments.py`)
```python
@appointments_bp.route('/', methods=['GET'])
@api_login_required
def get_appointments():
    """Get user's appointments"""
    pass

@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    """Create new appointment"""
    pass

@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@api_login_required
def update_appointment(appointment_id):
    """Update appointment"""
    pass
```

#### 3. Medical Records Routes (`backend/routes/medical_records.py`)
```python
@medical_records_bp.route('/upload', methods=['POST'])
@api_login_required
def upload_record():
    """Upload medical record file"""
    pass

@medical_records_bp.route('/<int:patient_id>', methods=['GET'])
@api_login_required
def get_patient_records(patient_id):
    """Get patient's medical records"""
    pass
```

## Authentication & Security

### JWT Token System

```python
# backend/routes/auth.py
from flask_jwt_extended import create_access_token

@auth_bp.route('/login', methods=['POST'])
def login():
    # Verify user credentials
    if user and user.check_password(password):
        # Create JWT token with user information
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'user_type': user.user_type,
                'email': user.email,
                'full_name': user.full_name
            }
        )
        
        return {
            'success': True,
            'data': {
                'user': user.to_dict(),
                'access_token': access_token
            }
        }
```

### API Protection Decorator

```python
# backend/utils/auth_utils.py
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def api_login_required(f):
    """Decorator to protect API endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()  # Check if JWT token is valid
            claims = get_jwt()       # Get token data
            
            # Set current_user from token claims
            user_id = claims.get('sub')  # 'sub' is the user ID
            current_user = User.query.get(user_id)
            
            if not current_user:
                return APIResponse.unauthorized('Invalid token')
                
            return f(*args, **kwargs)
        except Exception as e:
            return APIResponse.unauthorized('Authentication required')
    
    return decorated_function
```

### How Authentication Works

1. **User Login**: 
   - Frontend sends credentials to `/api/auth/login`
   - Backend verifies and returns JWT token
   - Frontend stores token in localStorage

2. **Making Authenticated Requests**:
   - Frontend includes token in Authorization header
   - Backend verifies token and extracts user info
   - Request proceeds if token is valid

3. **Token Expiry**:
   - Tokens expire after 7 days
   - Backend returns 401 if token expired
   - Frontend automatically redirects to login

## API Response Format

All API responses follow a consistent format:

### Success Response
```json
{
    "success": true,
    "message": "Operation completed successfully",
    "data": {
        "appointments": [
            {
                "id": 1,
                "patient_name": "Ahmed Ali",
                "doctor_name": "Dr. Sarah",
                "appointment_date": "2025-01-25T10:00:00Z",
                "status": "scheduled"
            }
        ]
    },
    "meta": {
        "total": 1,
        "page": 1,
        "per_page": 10
    }
}
```

### Error Response
```json
{
    "success": false,
    "message": "Appointment not found",
    "error_code": "APPOINTMENT_NOT_FOUND",
    "status_code": 404,
    "details": {
        "appointment_id": 123
    }
}
```

### Response Helper Class

```python
# backend/utils/responses.py
class APIResponse:
    @staticmethod
    def success(data=None, message="Success", meta=None):
        """Standard success response"""
        response = {
            "success": True,
            "message": message
        }
        
        if data is not None:
            response["data"] = data
            
        if meta:
            response["meta"] = meta
            
        return response, 200
    
    @staticmethod
    def error(message, status_code=400, error_code=None, details=None):
        """Standard error response"""
        response = {
            "success": False,
            "message": message,
            "status_code": status_code
        }
        
        if error_code:
            response["error_code"] = error_code
            
        if details:
            response["details"] = details
            
        return response, status_code
```

## Frontend-Backend Communication

### Making API Calls from Frontend

#### 1. GET Request (Fetch Data)
```javascript
// frontend/assets/js/components/appointment-booking.js
async function loadAppointments() {
    try {
        const response = await ApiHelper.makeRequest('/appointments');
        
        if (response.success) {
            displayAppointments(response.data.appointments);
        }
    } catch (error) {
        console.error('Failed to load appointments:', error);
        showErrorMessage('Failed to load appointments');
    }
}
```

#### 2. POST Request (Create Data)
```javascript
// frontend/assets/js/components/appointment-booking.js
async function bookAppointment(appointmentData) {
    try {
        const response = await ApiHelper.makeRequest('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
        
        if (response.success) {
            showSuccessMessage('Appointment booked successfully');
            loadAppointments(); // Refresh the list
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
}
```

#### 3. PUT Request (Update Data)
```javascript
// frontend/assets/js/components/appointment-booking.js
async function updateAppointment(appointmentId, updateData) {
    try {
        const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
        
        if (response.success) {
            showSuccessMessage('Appointment updated successfully');
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
}
```

#### 4. DELETE Request (Remove Data)
```javascript
// frontend/assets/js/components/appointment-booking.js
async function cancelAppointment(appointmentId) {
    try {
        const response = await ApiHelper.makeRequest(`/appointments/${appointmentId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showSuccessMessage('Appointment cancelled successfully');
            loadAppointments(); // Refresh the list
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
}
```

## Common API Patterns

### 1. CRUD Operations (Create, Read, Update, Delete)

Most entities in Sahatak follow CRUD patterns:

#### Backend CRUD Example
```python
# backend/routes/appointments.py

# CREATE - POST /api/appointments
@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    data = request.get_json()
    appointment = Appointment(
        patient_id=current_user.id,
        doctor_id=data['doctor_id'],
        appointment_date=data['appointment_date']
    )
    db.session.add(appointment)
    db.session.commit()
    
    return APIResponse.success(
        data={'appointment': appointment.to_dict()},
        message='Appointment created successfully'
    )

# READ - GET /api/appointments
@appointments_bp.route('/', methods=['GET'])
@api_login_required
def get_appointments():
    appointments = Appointment.query.filter_by(patient_id=current_user.id).all()
    
    return APIResponse.success(
        data={'appointments': [apt.to_dict() for apt in appointments]}
    )

# UPDATE - PUT /api/appointments/<id>
@appointments_bp.route('/<int:appointment_id>', methods=['PUT'])
@api_login_required
def update_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    data = request.get_json()
    
    appointment.appointment_date = data.get('appointment_date', appointment.appointment_date)
    db.session.commit()
    
    return APIResponse.success(
        data={'appointment': appointment.to_dict()},
        message='Appointment updated successfully'
    )

# DELETE - DELETE /api/appointments/<id>
@appointments_bp.route('/<int:appointment_id>', methods=['DELETE'])
@api_login_required
def delete_appointment(appointment_id):
    appointment = Appointment.query.get_or_404(appointment_id)
    db.session.delete(appointment)
    db.session.commit()
    
    return APIResponse.success(message='Appointment deleted successfully')
```

#### Frontend CRUD Usage
```javascript
// frontend/assets/js/components/appointment-manager.js
class AppointmentManager {
    // CREATE
    async createAppointment(appointmentData) {
        return await ApiHelper.makeRequest('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }
    
    // READ
    async getAppointments() {
        return await ApiHelper.makeRequest('/appointments');
    }
    
    // UPDATE
    async updateAppointment(id, updateData) {
        return await ApiHelper.makeRequest(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        });
    }
    
    // DELETE
    async deleteAppointment(id) {
        return await ApiHelper.makeRequest(`/appointments/${id}`, {
            method: 'DELETE'
        });
    }
}
```

### 2. File Upload Pattern

```javascript
// frontend/assets/js/components/ehr-manager.js
async function uploadMedicalRecord(file, patientId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    
    // Note: Don't set Content-Type for FormData
    const response = await ApiHelper.makeRequest('/medical-records/upload', {
        method: 'POST',
        headers: {
            // Authorization header is added automatically by ApiHelper
            // Don't set Content-Type - browser will set it with boundary
        },
        body: formData  // FormData, not JSON
    });
    
    return response;
}
```

```python
# backend/routes/medical_records.py
@medical_records_bp.route('/upload', methods=['POST'])
@api_login_required
def upload_medical_record():
    if 'file' not in request.files:
        return APIResponse.validation_error(
            field='file',
            message='No file uploaded'
        )
    
    file = request.files['file']
    patient_id = request.form.get('patient_id')
    
    # Save file and create record
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    
    record = MedicalRecord(
        patient_id=patient_id,
        filename=filename,
        uploaded_by=current_user.id
    )
    db.session.add(record)
    db.session.commit()
    
    return APIResponse.success(
        data={'record': record.to_dict()},
        message='File uploaded successfully'
    )
```

### 3. Pagination Pattern

```python
# backend/routes/appointments.py
@appointments_bp.route('/', methods=['GET'])
@api_login_required
def get_appointments():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    appointments = Appointment.query.filter_by(patient_id=current_user.id)\
                                  .paginate(page=page, per_page=per_page)
    
    return APIResponse.success(
        data={'appointments': [apt.to_dict() for apt in appointments.items]},
        meta={
            'total': appointments.total,
            'page': page,
            'per_page': per_page,
            'total_pages': appointments.pages
        }
    )
```

```javascript
// frontend/assets/js/components/appointment-list.js
async function loadAppointments(page = 1) {
    const response = await ApiHelper.makeRequest(`/appointments?page=${page}&per_page=10`);
    
    if (response.success) {
        displayAppointments(response.data.appointments);
        
        // Update pagination UI
        updatePagination({
            currentPage: response.meta.page,
            totalPages: response.meta.total_pages,
            total: response.meta.total
        });
    }
}
```

## Error Handling

### Backend Error Handling

```python
# backend/utils/responses.py
class APIResponse:
    @staticmethod
    def validation_error(field, message, details=None):
        """Validation error for bad input"""
        return APIResponse.error(
            message=message,
            status_code=400,
            error_code='VALIDATION_ERROR',
            details={'field': field, **(details or {})}
        )
    
    @staticmethod
    def unauthorized(message='Authentication required'):
        """Authentication error"""
        return APIResponse.error(
            message=message,
            status_code=401,
            error_code='UNAUTHORIZED'
        )
    
    @staticmethod
    def forbidden(message='Access denied'):
        """Authorization error"""
        return APIResponse.error(
            message=message,
            status_code=403,
            error_code='FORBIDDEN'
        )
    
    @staticmethod
    def not_found(message='Resource not found'):
        """Not found error"""
        return APIResponse.error(
            message=message,
            status_code=404,
            error_code='NOT_FOUND'
        )
```

### Frontend Error Handling

```javascript
// frontend/assets/js/components/error-handler.js
class ApiError extends Error {
    constructor(message, statusCode, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}

// Usage in ApiHelper
if (!response.ok) {
    const data = await response.json();
    throw new ApiError(
        data.message || 'API request failed',
        response.status,
        data.error_code
    );
}

// Handle specific errors
try {
    await ApiHelper.makeRequest('/appointments');
} catch (error) {
    if (error instanceof ApiError) {
        switch (error.statusCode) {
            case 401:
                // Redirect to login
                window.location.href = '/';
                break;
            case 403:
                showErrorMessage('You do not have permission to access this resource');
                break;
            case 404:
                showErrorMessage('The requested resource was not found');
                break;
            default:
                showErrorMessage(error.message);
        }
    }
}
```

## Real Examples

### Example 1: User Login Flow

#### Frontend (`frontend/assets/js/components/forms.js`)
```javascript
async function handleLogin(event) {
    event.preventDefault();
    
    const loginData = {
        login_identifier: document.getElementById('login_identifier').value.trim(),
        password: document.getElementById('password').value
    };
    
    try {
        const response = await ApiHelper.makeRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify(loginData)
        });
        
        if (response.success) {
            // Store user data and token
            localStorage.setItem('sahatak_access_token', response.data.access_token);
            localStorage.setItem('sahatak_user_type', response.data.user.user_type);
            localStorage.setItem('sahatak_user_id', response.data.user.id);
            
            // Redirect to dashboard
            const dashboardUrl = response.data.user.user_type === 'doctor' 
                ? 'pages/dashboard/doctor.html' 
                : 'pages/dashboard/patient.html';
            window.location.href = dashboardUrl;
        }
    } catch (error) {
        showErrorMessage(error.message);
    }
}
```

#### Backend (`backend/routes/auth.py`)
```python
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        login_identifier = data.get('login_identifier', '').strip()
        password = data.get('password')
        
        # Find user by email or phone
        user = find_user_by_identifier(login_identifier)
        
        if not user or not user.check_password(password):
            return APIResponse.unauthorized('Invalid email/phone or password')
        
        if not user.is_active:
            return APIResponse.unauthorized('Account is deactivated')
        
        # Create JWT token
        access_token = create_access_token(
            identity=user.id,
            additional_claims={
                'user_type': user.user_type,
                'email': user.email,
                'full_name': user.full_name
            }
        )
        
        # Create session
        login_user(user)
        
        return APIResponse.success(
            data={
                'user': user.to_dict(),
                'access_token': access_token
            },
            message='Login successful'
        )
        
    except Exception as e:
        return APIResponse.internal_error('Login failed')
```

### Example 2: Appointment Booking

#### Frontend (`frontend/assets/js/components/appointment-booking.js`)
```javascript
async function bookAppointment() {
    const appointmentData = {
        doctor_id: document.getElementById('doctor_select').value,
        appointment_date: document.getElementById('appointment_date').value,
        appointment_type: document.getElementById('appointment_type').value,
        symptoms: document.getElementById('symptoms').value
    };
    
    try {
        const response = await ApiHelper.makeRequest('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
        
        if (response.success) {
            showSuccessMessage('Appointment booked successfully!');
            
            // Redirect to appointments page
            window.location.href = 'appointments.html';
        }
    } catch (error) {
        if (error.statusCode === 400) {
            // Validation error - show specific field errors
            showValidationErrors(error.details);
        } else {
            showErrorMessage(error.message);
        }
    }
}
```

#### Backend (`backend/routes/appointments.py`)
```python
@appointments_bp.route('/', methods=['POST'])
@api_login_required
def create_appointment():
    try:
        data = request.get_json()
        
        # Validate input
        validation = AppointmentValidator.validate_create_data(data)
        if not validation['valid']:
            return APIResponse.validation_error(
                field=validation['field'],
                message=validation['message']
            )
        
        # Check if doctor exists and is available
        doctor = User.query.filter_by(id=data['doctor_id'], user_type='doctor').first()
        if not doctor:
            return APIResponse.validation_error(
                field='doctor_id',
                message='Doctor not found'
            )
        
        # Create appointment
        appointment = Appointment(
            patient_id=current_user.id,
            doctor_id=data['doctor_id'],
            appointment_date=datetime.fromisoformat(data['appointment_date']),
            appointment_type=data['appointment_type'],
            symptoms=data.get('symptoms', ''),
            status='scheduled'
        )
        
        db.session.add(appointment)
        db.session.commit()
        
        # Send confirmation email
        send_appointment_confirmation(appointment)
        
        return APIResponse.success(
            data={'appointment': appointment.to_dict()},
            message='Appointment booked successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        return APIResponse.internal_error('Failed to book appointment')
```

### Example 3: Real-time Messaging

#### Frontend (`frontend/assets/js/components/messaging.js`)
```javascript
class MessagingManager {
    async sendMessage(conversationId, messageText) {
        const messageData = {
            conversation_id: conversationId,
            message: messageText,
            message_type: 'text'
        };
        
        try {
            const response = await ApiHelper.makeRequest('/messages', {
                method: 'POST',
                body: JSON.stringify(messageData)
            });
            
            if (response.success) {
                // Add message to UI immediately
                this.addMessageToChat(response.data.message);
                
                // Clear input
                document.getElementById('message_input').value = '';
            }
        } catch (error) {
            showErrorMessage('Failed to send message');
        }
    }
    
    async loadMessages(conversationId, page = 1) {
        try {
            const response = await ApiHelper.makeRequest(
                `/messages/conversations/${conversationId}?page=${page}`
            );
            
            if (response.success) {
                this.displayMessages(response.data.messages);
            }
        } catch (error) {
            showErrorMessage('Failed to load messages');
        }
    }
}
```

#### Backend (`backend/routes/messages.py`)
```python
@messages_bp.route('/', methods=['POST'])
@api_login_required
def send_message():
    try:
        data = request.get_json()
        
        conversation = Conversation.query.get(data['conversation_id'])
        if not conversation:
            return APIResponse.not_found('Conversation not found')
        
        # Check if user is part of conversation
        if not conversation.has_participant(current_user.id):
            return APIResponse.forbidden('Access denied')
        
        # Create message
        message = Message(
            conversation_id=data['conversation_id'],
            sender_id=current_user.id,
            message=data['message'],
            message_type=data.get('message_type', 'text')
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Emit real-time event via WebSocket
        socketio.emit('new_message', {
            'message': message.to_dict()
        }, room=f'conversation_{conversation.id}')
        
        return APIResponse.success(
            data={'message': message.to_dict()},
            message='Message sent successfully'
        )
        
    except Exception as e:
        db.session.rollback()
        return APIResponse.internal_error('Failed to send message')
```

## Best Practices

### 1. Always Use ApiHelper
```javascript
// ✅ Good
const response = await ApiHelper.makeRequest('/appointments');

// ❌ Bad - bypassing ApiHelper
const response = await fetch('https://sahatak.pythonanywhere.com/api/appointments');
```

### 2. Handle Errors Gracefully
```javascript
// ✅ Good
try {
    const response = await ApiHelper.makeRequest('/appointments');
    displayAppointments(response.data.appointments);
} catch (error) {
    showErrorMessage('Failed to load appointments. Please try again.');
}

// ❌ Bad - no error handling
const response = await ApiHelper.makeRequest('/appointments');
displayAppointments(response.data.appointments);
```

### 3. Use Consistent Response Format
```python
# ✅ Good
return APIResponse.success(
    data={'appointments': appointments_list},
    message='Appointments retrieved successfully'
)

# ❌ Bad - inconsistent format
return {'appointments': appointments_list}
```

### 4. Validate Input Data
```python
# ✅ Good
if not data.get('email'):
    return APIResponse.validation_error(
        field='email',
        message='Email is required'
    )

# ❌ Bad - no validation
user = User(email=data.get('email'))  # Could be None
```

### 5. Use Appropriate HTTP Status Codes
```python
# ✅ Good
return APIResponse.not_found('Appointment not found')  # 404

# ❌ Bad
return APIResponse.error('Appointment not found', 500)  # Wrong status
```

## Summary

The Sahatak API architecture provides:

1. **Separation of Concerns**: Frontend handles UI, backend handles business logic
2. **Consistent Communication**: ApiHelper standardizes all API interactions
3. **Security**: JWT tokens and proper authentication
4. **Error Handling**: Consistent error responses and handling
5. **Scalability**: Can easily add new features and endpoints
6. **Maintainability**: Organized code structure with clear patterns

This architecture allows the Sahatak telemedicine platform to provide a robust, secure, and user-friendly experience for both patients and doctors while maintaining clean, maintainable code.