# Sahatak Telemedicine Platform

The comprehensive and first Sudanese telemedicine platform with bilingual support (Arabic/English) featuring a modern responsive frontend, adaptive UI, and robust backend API for remote video healthcare.

---

## Recent Updates (Since v1.0.0)

### Major Features Added
- **Complete Admin Dashboard**: Comprehensive admin interface with Arabic translations and full functionality
- **Medical Records System**: Complete medical records and prescription management system
- **Advanced Appointment System**: Calendar integration and doctor scheduling with RTL support
- **Enhanced Notifications**: Fixed notification import errors and improved reliability
- **Email Verification**: Complete email confirmation system with 2G-optimized templates
- **Sudanese Arabic Dialect**: Updated speech format to include Sudanese Arabic dialect support
- **User Management**: Enhanced user authentication, verification, and profile management
- **Health Analytics**: Real-time health monitoring charts and platform analytics
- **Security Improvements**: Enhanced logout functionality, authentication guards, and session management

### UI/UX Improvements
- **Blue Medical Theme**: Replaced red theme with professional medical blue throughout the platform
- **RTL Enhancements**: Fixed Arabic RTL layout issues across admin and user interfaces
- **Translation Fixes**: Comprehensive translation updates for admin dashboard and user interfaces
- **Responsive Design**: Fixed stats cards layout and improved mobile responsiveness
- **Favicon Updates**: Added medical heart-pulse icon across all pages
- **Dashboard Enhancements**: Improved patient and doctor dashboard layouts with proper navigation

### Technical Improvements
- **Error Handling**: Enhanced error code consistency and proper JSON response formats
- **API Stability**: Fixed authentication endpoints, registration flows, and session management
- **Database Updates**: Migrated to single fullName field and improved data validation
- **WSGI Configuration**: Fixed deployment issues for PythonAnywhere hosting
- **Code Organization**: Moved JavaScript to components, improved translation patterns, and API helpers

---

## Frontend Application

### Frontend Features
- **Bilingual Interface**: Complete Arabic and English language support with RTL/LTR layouts
- **Responsive Design**: Mobile-first design using Bootstrap 5 with Arabic font support
- **User Authentication Flow**: Complete registration and login system for patients and doctors
- **Dashboard System**: Separate dashboards for patients and doctors with role-specific features
- **Translation Management**: JSON-based localization system with fallback support
- **Medical Theme**: Healthcare-focused UI with medical color schemes
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Progressive Enhancement**: Graceful degradation with fallback functionality

### Frontend Structure

```
frontend/
├── index.html                    # Main entry point with authentication flow
├── package.json                  # Frontend dependencies and scripts
├── assets/
│   ├── css/
│   │   ├── main.css             # Main stylesheet with Arabic/English support
│   │   └── components/
│   │       └── dashboard.css    # Dashboard-specific styling
│   ├── js/
│   │   ├── main.js              # Core JavaScript with language management
│   │   └── components/
│   │       ├── dashboard-translations.js  # Dashboard translations
│   │       ├── appointment-booking.js     # Appointment system
│   │       ├── audio-recorder.js          # Voice recording features
│   │       ├── symptom-assessment.js      # Health assessment forms
│   │       ├── validation.js              # Form validation
│   │       └── date-utils.js             # Date/time utilities
│   ├── images/
│   │   └── logo/                # Platform branding
│   └── fonts/
│       └── noto-sans-arabic/    # Arabic font files
├── locales/
│   ├── ar.json                  # Arabic translations
│   └── en.json                  # English translations
└── pages/
    ├── dashboard/
    │   ├── patient.html         # Patient dashboard
    │   ├── doctor.html          # Doctor dashboard
    │   └── admin.html          # Admin dashboard
    ├── appointments/
    │   ├── appointment-list.html    # Appointment management
    │   ├── book-appointment.html    # Appointment booking
    │   └── video-consultation.html  # Video call interface
    ├── medical/
    │   ├── medical-records.html     # Medical history
    │   └── symptom-assessment.html  # Health assessment
    ├── profile/
    │   ├── patient.html         # Patient profile management
    │   └── doctor.html          # Doctor profile management
    └── common/
        ├── about.html           # About page
        ├── contact-us.html      # Contact information
        ├── services.html        # Services overview
        └── support.html         # Help and support
```

### Frontend Technologies
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern styling with CSS Grid, Flexbox, and CSS variables
- **JavaScript (ES6+)**: Modern JavaScript with modules and async/await
- **Bootstrap 5**: Responsive UI framework with Arabic RTL support
- **Noto Sans Arabic**: Professional Arabic typography
- **Bootstrap Icons**: Comprehensive icon library

### Language Management System

The frontend includes a sophisticated language management system:

```javascript
// Language switching
selectLanguage('ar')  // Switch to Arabic with RTL layout
selectLanguage('en')  // Switch to English with LTR layout

// Translation loading with fallback
LanguageManager.loadTranslations()  // Load from JSON files
LanguageManager.getTranslation('ar', 'welcome.title')  // Get specific translation

// Automatic layout switching
document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
document.documentElement.setAttribute('lang', lang)
```

### User Experience Flow
1. **Language Selection**: First-time visitors choose Arabic or English
2. **Authentication Choice**: Login or register decision
3. **User Type Selection**: Patient or doctor account type
4. **Registration**: Complete profile setup with real-time validation
5. **Dashboard Access**: Role-specific dashboard with medical features
6. **Profile Management**: Update information and language preferences

### Responsive Design Features
- **Mobile-First**: Optimized for smartphones and tablets
- **Touch-Friendly**: Large buttons and touch targets
- **Cross-Browser**: Compatible with modern browsers
- **Performance**: Optimized loading and smooth animations
- **Offline Fallback**: Graceful handling of network issues

### Key Frontend Components

#### Authentication Flow
- **Language Selection Screen**: Beautiful gradient background with language options
- **Login/Register Forms**: Comprehensive validation with error handling
- **User Type Selection**: Visual cards for patient/doctor selection
- **Password Strength**: Real-time password validation feedback

#### Dashboard Features
- **Patient Dashboard**: Health summary, appointments, quick actions
- **Doctor Dashboard**: Schedule management, patient overview, statistics
- **Admin Dashboard**: User management, analytics, system settings
- **Navigation**: Intuitive sidebar with role-based menu items
- **Profile Management**: Complete profile editing with validation

#### Medical Features
- **Appointment Booking**: Calendar integration with time slot selection
- **Symptom Assessment**: Interactive health questionnaire
- **Medical Records**: Secure viewing of health history
- **Video Consultation**: Integrated video call interface

### Frontend Setup

```bash
# Navigate to project root
cd /path/to/sahatak

# Start development server (Python)
cd frontend
python -m http.server 8000
```

The frontend will be available at `http://localhost:8000`

---

## Backend API

### Backend Features
- **User Management**: Registration, authentication, and profile management
- **Bilingual Support**: Full Arabic and English language support in API responses
- **Role-Based Access**: Separate patient, doctor, and admin user types with permissions
- **Medical Profiles**: Detailed patient and doctor profile management
- **Appointment System**: Complete appointment booking and management system
- **Health Assessments**: AI-powered health assessment framework
- **Admin Dashboard**: Comprehensive administrative functions
- **Notification System**: Email and SMS notification management
- **Medical Records**: Complete medical history and prescription management

### Production-Ready Infrastructure
- **Standardized API Responses**: Consistent JSON response format across all endpoints
- **Comprehensive Error Handling**: Global error handlers with detailed logging
- **Health Monitoring**: Multiple health check endpoints with system metrics
- **Structured Logging**: JSON-formatted logs with request tracking and audit trails
- **CORS Configuration**: Proper cross-origin resource sharing for frontend integration
- **Input Validation**: Robust validation for all user inputs with Arabic text support
- **Security**: Password hashing, input sanitization, and SQL injection protection

## Backend Structure

```
backend/
├── app.py                      # Main Flask application
├── config.py                   # Configuration management
├── models.py                   # Database models
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── logs/                      # Application logs (auto-created)
│   ├── sahatak_app.log       # General application logs
│   ├── sahatak_errors.log    # Error logs
│   └── sahatak_auth.log      # Authentication logs
├── routes/                    # API route blueprints
│   ├── auth.py               # Authentication endpoints
│   ├── users.py              # User management endpoints
│   ├── appointments.py       # Appointment management
│   ├── medical.py            # Medical records
│   ├── ai_assessment.py      # AI health assessments
│   ├── admin.py              # Admin dashboard endpoints
│   └── notifications.py      # Notification management
├── services/                  # Service layer
│   ├── email_service.py      # Email notifications
│   └── notification_service.py # Notification management
└── utils/                     # Utility modules
    ├── responses.py          # Standardized API responses
    ├── error_handlers.py     # Global error handling
    ├── logging_config.py     # Logging configuration
    ├── health_check.py       # Health monitoring
    └── validators.py         # Input validation
```

## Setup Instructions
### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
```bash
# Edit the environment file
.env

# Edit the .env file with your configuration
```
**Required Environment Variables:**
```env
# Flask Configuration
SECRET_KEY=your-secret-key-here
FLASK_ENV=development
DATABASE_URL=sqlite:///sahatak_dev.db

# Mail Configuration (Optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# SMS Configuration (Optional)
SMS_USERNAME=sandbox
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=SAHATAK
```

### 3. Run the Application
```bash
python app.py
```

The API will start at `http://localhost:5000`

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user (patient/doctor) |
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| GET | `/me` | Get current user info |
| POST | `/change-password` | Change password |
| POST | `/update-language` | Update language preference |

### User Management (`/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Get user profile |
| PUT | `/profile` | Update user profile |
| GET | `/doctors` | List verified doctors |
| GET | `/doctors/{id}` | Get doctor details |
| GET | `/specialties` | Get medical specialties |
| POST | `/deactivate` | Deactivate account |

### Appointments (`/api/appointments`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user appointments |
| POST | `/` | Create new appointment |
| GET | `/{id}` | Get appointment details |

### Medical (`/api/medical`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/records` | Get medical records |
| GET | `/prescriptions` | Get prescriptions |

### AI Assessment (`/api/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/assessment` | AI health assessment |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Admin dashboard data |
| GET | `/users` | Get all users |
| PUT | `/users/{id}/status` | Update user status |
| GET | `/doctors/pending` | Get pending doctor verifications |
| PUT | `/doctors/{id}/verify` | Verify doctor |
| GET | `/analytics` | Platform analytics |
| GET | `/system/health` | System health status |

### Health Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Basic health check |
| GET | `/health/detailed` | Comprehensive health status |
| GET | `/health/database` | Database health check |

## API Response Format

All API responses follow a standardized format:

### Success Response
```json
{
    "success": true,
    "message": "Operation successful",
    "timestamp": "2025-01-31T10:30:00Z",
    "status_code": 200,
    "data": {
        // Response data here
    },
    "meta": {
        // Optional metadata (pagination, etc.)
    }
}
```

### Error Response
```json
{
    "success": false,
    "message": "Error description",
    "timestamp": "2025-01-31T10:30:00Z",
    "status_code": 400,
    "error_code": "VALIDATION_ERROR",
    "field": "email",
    "details": {
        // Additional error details
    }
}
```

## Authentication

The API uses session-based authentication with Flask-Login. After successful login, users receive a session cookie that must be included in subsequent requests.

### Registration Examples

**Patient Registration:**
```json
POST /api/auth/register
{
    "email": "patient@example.com",
    "password": "securepass123",
    "full_name": "أحمد محمد",
    "user_type": "patient",
    "language_preference": "ar",
    "phone": "+249123456789",
    "age": 30,
    "gender": "male"
}
```

**Doctor Registration:**
```json
POST /api/auth/register
{
    "email": "doctor@example.com",
    "password": "securepass123",
    "full_name": "Dr. Sarah Ahmed",
    "user_type": "doctor",
    "language_preference": "en",
    "phone": "+249987654321",
    "license_number": "MD12345",
    "specialty": "cardiology",
    "years_of_experience": 10
}
```

## Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password_hash` - Hashed password
- `full_name` - User full name
- `user_type` - 'patient', 'doctor', or 'admin'
- `language_preference` - 'ar' or 'en'
- `is_active`, `is_verified` - Status flags
- Timestamps and audit fields

### Patients Table
- Links to Users table
- Medical information (age, gender, blood type)
- Medical history, allergies, medications
- Emergency contact information

### Doctors Table
- Links to Users table
- Professional information (license, specialty, experience)
- Verification status and ratings
- Consultation fees and availability

### Appointments Table
- Links to Patients and Doctors
- Appointment details (date, type, status)
- Medical notes and prescriptions
- Payment information

## Error Handling

The API includes comprehensive error handling:

- **Validation Errors**: Input validation with field-specific messages
- **Authentication Errors**: Login/permission issues
- **Database Errors**: Automatic rollback and logging
- **System Errors**: Graceful handling with error IDs for tracking

## Logging & Monitoring

### Log Files
- `sahatak_app.log` - General application logs
- `sahatak_errors.log` - Error-specific logs
- `sahatak_auth.log` - Authentication events

### Health Checks
- System resource monitoring (CPU, memory, disk)
- Database connectivity tests
- External service status
- Application metrics and uptime

## Production Deployment

### Frontend Deployment on GitHub Pages

#### Step 1: Prepare Frontend for Production
# Update API base URL in main.js
# Change from localhost to your PythonAnywhere domain
```

#### Step 2: Create GitHub Repository
```bash
# Initialize git repository
git init
git add .
git commit -m "Initial frontend deployment"

# Create repository on GitHub and push
git remote add origin https://github.com/HELLO-50/sahatak.git
git branch -M main
git push -u origin main
```

#### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**
6. Your frontend will be available at: `https://HELLO-50.github.io/sahatak/frontend/`

#### Step 4: Update CORS Configuration
Update your backend's CORS settings to include the GitHub Pages URL:
```python
# In backend/app.py
CORS(app, 
     origins=[
         'https://HELLO-50.github.io/sahatak/'  # Add your GitHub Pages URL
     ],
     allow_headers=['Content-Type', 'Authorization', 'Accept-Language'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     supports_credentials=True)
```

### Backend Deployment on PythonAnywhere

#### Step 1: Create PythonAnywhere Account
1. Sign up at [PythonAnywhere.com](https://www.pythonanywhere.com)

#### Step 2: Upload Backend Code
```bash
# Upload via Git (Recommended)
# On PythonAnywhere Bash console:
git clone https://github.com/HELLO-50/sahatak.git
cd sahatak/backend
```

#### Step 3: Install Dependencies
```bash
# On PythonAnywhere Bash console:
cd /home/sahatak/sahatak/backend
pip3.13 install --user -r requirements.txt
```

#### Step 4: Configure Environment Variables
```bash
# Create .env file
nano .env

# Add your production configuration:
SECRET_KEY=your-production-secret-key-here
FLASK_ENV=production
DATABASE_URL=sqlite:////home/yourusername/sahatak-backend/sahatak_production.db

# Mail configuration (optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# SMS configuration (optional)
SMS_USERNAME=your-sms-username
SMS_API_KEY=your-sms-api-key
SMS_SENDER_ID=SAHATAK
```

#### Step 5: Create WSGI Configuration
Create `/var/www/yourusername_pythonanywhere_com_wsgi.py`:
```python
import sys
import os

# Add your project directory to sys.path
project_home = '/home/yourusername/sahatak-backend'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set environment variables
os.environ['FLASK_ENV'] = 'production'

# Import your Flask app
from app import app as application

if __name__ == '__main__':
    application.run()
```

#### Step 6: Configure Web App
1. Go to **Web** tab in PythonAnywhere dashboard
2. Click **Add a new web app**
3. Choose **Manual configuration**
4. Select **Python 3.10**
5. Set **Source code** to: `/home/yourusername/sahatak-backend`
6. Set **WSGI configuration file** to: `/var/www/yourusername_pythonanywhere_com_wsgi.py`

#### Step 7: Initialize Database
```bash
# On PythonAnywhere Bash console:
cd /home/yourusername/sahatak-backend
python3.10 -c "from app import app, db; app.app_context().push(); db.create_all()"
```

#### Step 8: Configure Static Files (if needed)
In the **Web** tab:
- **Static files URL**: `/static/`
- **Static files directory**: `/home/sahatak/sahatak/static/`

#### Step 9: Reload and Test
1. Click **Reload** button in Web tab
2. Visit your app at: `https://sahatak.pythonanywhere.com`
3. Test API endpoints and functionality

### Frontend-Backend Integration

#### Update Frontend API Configuration
In your frontend's `main.js`, update the API base URL:
```javascript
// In frontend/assets/js/main.js
const ApiHelper = {
    baseUrl: 'https://sahatak.pythonanywhere.com/api', // Update this line
    
    async makeRequest(endpoint, options = {}) {
        const language = LanguageManager.getLanguage() || 'ar';
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': language,
                ...options.headers
            },
            credentials: 'include' // Important for cross-origin cookies
        };
        
        const requestOptions = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};
```

### Production Checklist

#### Frontend (GitHub Pages)
- [ ] Update API base URL to PythonAnywhere domain
- [ ] Test all pages and functionality
- [ ] Verify responsive design on mobile devices
- [ ] Check Arabic/English language switching
- [ ] Ensure all assets load correctly

#### Backend (PythonAnywhere)
- [ ] Set `FLASK_ENV=production`
- [ ] Use strong secret keys
- [ ] Configure proper database (consider PostgreSQL for larger deployments)
- [ ] Set up proper mail server credentials
- [ ] Configure SMS service if needed
- [ ] Test all API endpoints
- [ ] Verify CORS configuration
- [ ] Check logging functionality
- [ ] Test health check endpoints

#### Security Considerations
- [ ] Use HTTPS for production (PythonAnywhere provides this)
- [ ] Store sensitive data in environment variables
- [ ] Implement proper session management
- [ ] Set up monitoring and alerting
- [ ] Regular security updates
- [ ] Backup database regularly

### Monitoring and Maintenance

#### Health Checks
Monitor your deployment using the built-in health endpoints:
- `https://sahatak.pythonanywhere.com/health` - Basic health check
- `https://sahatak.pythonanywhere.com/health/detailed` - Comprehensive status
- `https://sahatak.pythonanywhere.com/health/database` - Database connectivity

#### Logs Access
```bash
# View application logs on PythonAnywhere
tail -f /var/log/sahatak.pythonanywhere.com.server.log
tail -f /var/log/sahatak.pythonanywhere.com.error.log

# View custom application logs
tail -f /home/yourusername/sahatak-backend/logs/sahatak_app.log
tail -f /home/yourusername/sahatak-backend/logs/sahatak_errors.log
```

## Version History

- **v1.0.0** - Initial release with full user management, authentication, and health monitoring
- **v1.1.0** - Added comprehensive admin dashboard, medical records system, enhanced appointment management
- **v1.2.0** - Fixed notification system, improved RTL support, added Sudanese Arabic dialect support
- **v1.3.0** - Enhanced security, improved error handling, added email verification system

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## About Sahatak

Sahatak (صحتك - "Your Health") is the first comprehensive telemedicine platform designed specifically for Sudan. Our mission is to provide accessible, high-quality healthcare through innovative technology, bridging the gap between patients and healthcare providers across the country.

### Key Features:
- **Bilingual Support**: Full Arabic and English language support
- **Mobile-First**: Responsive design for all devices
- **Complete Healthcare**: From symptom assessment to prescription management
- **Expert Doctors**: Verified healthcare professionals
- **Secure & Private**: Medical-grade data protection
- **AI-Powered**: Intelligent health assessments and recommendations

---

*Made with care for the people of Sudan*