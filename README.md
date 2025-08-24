# Sahatak Telemedicine Platform

The comprehensive and first Sudanese telemedicine platform with bilingual support (Arabic/English) featuring a modern responsive frontend, adaptive UI, and robust backend API for remote video healthcare.

---

## Quick Start

For complete installation instructions, see [INSTALL.md](INSTALL.md).

```bash
# Development setup
git clone https://github.com/hmb104/Sahatak.git
cd Sahatak
```

**Deployed Application:**
- **Frontend**: GitHub Pages
- **Backend**: PythonAnywhere
- **Database**: SQLite

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

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │───▶│   GitHub Pages   │───▶│ PythonAnywhere  │
│   (Client)      │    │   (Frontend)     │    │   (Backend)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ SQLite Database │
                                               │   (Storage)     │
                                               └─────────────────┘
```

### Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Bootstrap 5 with RTL support
- Responsive PWA design
- JSON-based i18n system

**Backend:**
- Python Flask framework
- SQLAlchemy ORM
- Session-based authentication
- RESTful API architecture

**Database:**
- SQLite (development/production)
- PostgreSQL support (enterprise)

**Hosting:**
- Frontend: GitHub Pages
- Backend: PythonAnywhere
- CDN: GitHub's global CDN

---

## Project Structure

### Frontend Architecture

```
frontend/
├── index.html                    # Entry point with language selection
├── assets/
│   ├── css/
│   │   ├── main.css             # Core styles with RTL/LTR support
│   │   └── components/          # Component-specific styling
│   ├── js/
│   │   ├── main.js              # Core JavaScript & API helper
│   │   └── components/          # Feature-specific modules
│   ├── images/                  # Branding and UI assets
│   └── fonts/                   # Arabic typography (Noto Sans)
├── locales/
│   ├── ar.json                  # Arabic translations
│   └── en.json                  # English translations
└── pages/                       # Application pages
    ├── dashboard/               # User dashboards (patient/doctor/admin)
    ├── appointments/            # Appointment management
    ├── medical/                 # Medical records & assessments
    ├── profile/                 # User profile management
    └── common/                  # Static pages
```

### Backend Architecture

```
backend/
├── app.py                       # Flask application entry point
├── models.py                    # SQLAlchemy database models
├── config.py                    # Configuration management
├── routes/                      # API endpoint blueprints
│   ├── auth.py                 # Authentication endpoints
│   ├── users.py                # User management
│   ├── appointments.py         # Appointment system
│   ├── medical.py              # Medical records
│   ├── admin.py                # Admin dashboard
│   └── notifications.py        # Notification system
├── services/                    # Business logic layer
│   ├── email_service.py        # Email notifications
│   └── notification_service.py # Push notifications
├── utils/                       # Utility modules
│   ├── responses.py            # Standardized API responses
│   ├── validators.py           # Input validation
│   ├── logging_config.py       # Application logging
│   └── health_check.py         # Health monitoring
└── logs/                        # Application logs (auto-created)
```

---

## Core Features

### User Management System

**Multi-Role Architecture:**
- **Patients**: Medical history, appointment booking, health assessments
- **Doctors**: Schedule management, patient consultations, medical records
- **Administrators**: User management, platform analytics, system configuration

**Authentication & Security:**
- Session-based authentication with Flask-Login
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation and SQL injection protection

### Bilingual Support System

**Complete Internationalization:**
- Arabic (RTL) and English (LTR) layouts
- JSON-based translation system
- Dynamic language switching
- Cultural adaptation for Sudan
- Professional Arabic medical terminology

### Medical Features

**Patient Care System:**
- Comprehensive medical history management
- AI-powered symptom assessment
- Prescription tracking and management
- Appointment scheduling with calendar integration
- Video consultation support

**Clinical Tools:**
- Electronic health records (EHR)
- Digital prescription system
- Medical history tracking
- Appointment management
- Patient-doctor communication

### Administrative Dashboard

**Platform Management:**
- User verification and approval system
- Doctor credential verification
- Platform analytics and reporting
- System health monitoring
- Notification management

---

## API Architecture

### RESTful API Design

**Endpoint Structure:**
```
/api/auth/*          # Authentication & authorization
/api/users/*         # User profile management
/api/appointments/*  # Appointment system
/api/medical/*       # Medical records & prescriptions
/api/admin/*         # Administrative functions
/api/ai/*           # AI health assessments
/health/*           # System health monitoring
```

### Response Format

**Standardized JSON Responses:**
```json
{
    "success": boolean,
    "message": "string",
    "timestamp": "ISO-8601",
    "status_code": number,
    "data": object,
    "meta": object
}
```

### Error Handling

**Comprehensive Error Management:**
- Global exception handlers
- Structured error responses
- Detailed logging with request tracking
- User-friendly error messages
- Debug information for development

---

## Database Schema

### Core Entities

**Users Table:**
- Primary user information
- Authentication credentials  
- Language preferences
- Account status flags

**Patients Table:**
- Medical information (age, gender, blood type)
- Medical history and allergies
- Emergency contacts
- Notification preferences

**Doctors Table:**
- Professional credentials
- Specialties and experience
- Verification status
- Availability schedules

**Appointments Table:**
- Patient-doctor relationships
- Scheduling information
- Consultation notes
- Payment tracking

### Relationships

```
Users (1) ──────── (1) Patients
Users (1) ──────── (1) Doctors
Patients (n) ──── (n) Doctors (via Appointments)
Appointments (1) ── (n) Prescriptions
Appointments (1) ── (n) Medical Records
```

---

## Development Features

### Code Organization

**Modern JavaScript Architecture:**
- ES6+ modules and async/await
- Component-based organization
- Centralized API management
- Event-driven programming

**Python Best Practices:**
- Blueprint-based routing
- Service layer architecture
- Configuration management
- Comprehensive logging

### Development Tools

**Frontend Development:**
- Live reload development server
- Browser developer tools integration
- Responsive design testing
- Cross-browser compatibility

**Backend Development:**
- Flask development server
- Database migration tools
- API testing capabilities
- Health check endpoints

---

## Monitoring & Analytics

### Application Monitoring

**Health Checks:**
- System resource monitoring (CPU, memory, disk)
- Database connectivity tests
- External service status
- Application metrics and uptime

**Logging System:**
- Structured JSON logging
- Request/response tracking
- Error logging and alerting
- Authentication audit trails

### Analytics Dashboard

**Platform Metrics:**
- User registration and activity
- Appointment statistics
- Doctor performance metrics
- System usage patterns

---

## Security Features

### Data Protection

**Security Measures:**
- Password hashing and salting
- Session management
- Input validation and sanitization
- SQL injection prevention
- XSS protection

**Medical Data Compliance:**
- HIPAA-like privacy protections
- Encrypted data transmission
- Secure file storage
- Access logging and auditing

---

## Scalability & Performance

### Performance Optimization

**Frontend Optimization:**
- Minified CSS and JavaScript
- Optimized image assets
- Browser caching strategies
- Progressive web app features

**Backend Performance:**
- Database query optimization
- Response caching
- Efficient data serialization
- Resource monitoring

### Scalability Considerations

**Current Architecture:**
- Horizontal scaling support
- Database optimization
- CDN integration
- Load balancing ready

**Future Enhancements:**
- Microservices migration path
- Container deployment support
- Advanced caching strategies
- Real-time features with WebSockets

---

## Version History

- **v1.0.0** - Initial release with core telemedicine features
- **v1.1.0** - Added admin dashboard and medical records system
- **v1.2.0** - Enhanced notifications and RTL support improvements
- **v1.3.0** - Security enhancements and email verification system

---

## Documentation

- **[INSTALL.md](INSTALL.md)** - Complete installation guide
- **[UserStories.md](UserStories.md)** - Comprehensive user stories
- **API Documentation** - Available at `/api/docs` (when deployed)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## About Sahatak

Sahatak (صحتك - "Your Health") is the first comprehensive telemedicine platform designed specifically for Sudan. Our mission is to provide accessible, high-quality healthcare through innovative technology, bridging the gap between patients and healthcare providers across the country.

### Key Features:
- **Bilingual Support**: Full Arabic and English language support
- **Mobile-First**: Responsive design for all devices  
- **Complete Healthcare**: From symptom assessment to prescription management
- **Expert Doctors**: Verified healthcare professionals
- **Secure & Private**: Medical-grade data protection
- **AI-Powered**: Intelligent health assessments and recommendations

*Made with care for the people of Sudan*