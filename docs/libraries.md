# Libraries Documentation - Sahatak Telemedicine Platform

## Table of Contents
1. [Backend Libraries (Python)](#backend-libraries-python)
2. [Frontend Libraries (JavaScript)](#frontend-libraries-javascript)
3. [CSS Frameworks](#css-frameworks)

---

## Backend Libraries (Python)

### Core Framework
**Flask (2.3.3)** - `/backend/requirements.txt`  
Lightweight Python web framework used as the main backend server.  
Handles HTTP requests, routing, and serves the REST API endpoints for the telemedicine platform.

**Werkzeug (2.3.7)** - `/backend/requirements.txt`  
Flask's underlying WSGI library that provides utilities for request/response handling.  
Used for password hashing, secure filename handling, and HTTP exception management.

### Database
**SQLAlchemy (2.0.23)** - `/backend/requirements.txt`  
Python SQL toolkit and Object-Relational Mapping (ORM) library.  
Maps Python classes to database tables and handles all database operations without writing raw SQL.

**Flask-SQLAlchemy (3.0.5)** - `/backend/requirements.txt`  
Flask extension that integrates SQLAlchemy with Flask applications.  
Simplifies database configuration and provides session management for the medical records system.

**PyMySQL (1.1.0)** - `/backend/requirements.txt`  
Pure Python MySQL client library for connecting to MySQL databases.  
Used in production environment to connect the application to MySQL database server.

### Authentication & Security
**Flask-Login (0.6.3)** - `/backend/requirements.txt`  
Flask extension for managing user sessions and authentication.  
Handles user login/logout, session management, and protecting routes that require authentication.

**flask-bcrypt (1.0.1)** - `/backend/requirements.txt`  
Flask extension providing bcrypt hashing utilities for password encryption.  
Securely hashes and verifies user passwords in the authentication system.

**cryptography (41.0.7)** - `/backend/requirements.txt`  
Python library for cryptographic operations and secure data handling.  
Used for generating secure tokens, encrypting sensitive medical data, and secure communications.

### Communication & Real-time Features
**Flask-SocketIO (5.3.6)** - `/backend/requirements.txt`  
Flask extension for WebSocket communication enabling real-time features.  
Powers the real-time chat between doctors and patients, and live video consultation features.

**Flask-Mail (0.9.1)** - `/backend/requirements.txt`  
Flask extension for sending emails through SMTP.  
Sends appointment confirmations, email verifications, and medical notifications to users.

**africastalking (1.2.5)** - `/backend/requirements.txt`  
Python SDK for Africa's Talking API services (SMS, voice, payments).  
Sends SMS notifications for appointments and emergency alerts to patients in Sudan.

### API & Cross-Origin Support
**Flask-CORS (4.0.0)** - `/backend/requirements.txt`  
Flask extension for handling Cross-Origin Resource Sharing (CORS).  
Allows the frontend (on different domain/port) to communicate with the backend API securely.

### Utilities
**python-dotenv (1.0.0)** - `/backend/requirements.txt`  
Loads environment variables from .env file for configuration management.  
Keeps sensitive data like API keys, database credentials, and secrets out of the codebase.

**APScheduler (3.10.4)** - `/backend/requirements.txt`  
Advanced Python Scheduler for running periodic tasks and cron jobs.  
Schedules appointment reminders, cleans expired sessions, and runs daily medical report generation.

**email-validator (2.1.0)** - `/backend/requirements.txt`  
Validates email addresses for correctness and deliverability.  
Ensures users register with valid email addresses for account verification and notifications.

**psutil (5.9.6)** - `/backend/requirements.txt`  
Cross-platform library for system and process monitoring.  
Monitors server health, tracks resource usage, and helps with performance optimization.

---

## Frontend Libraries (JavaScript)

### UI Framework
**Bootstrap (5.3.2)** - Used in all HTML files  
Responsive CSS framework for building mobile-first user interfaces.  
Provides the grid system, components, and utilities for the entire platform's UI consistency.

**Bootstrap Icons (1.11.1)** - Used in all HTML files  
Official icon library for Bootstrap with 1800+ SVG icons.  
Used throughout the platform for navigation icons, medical symbols, and user interface elements.

### Real-time Communication
**Socket.IO Client (4.7.2)** - `/frontend/pages/medical/*/comm-hub.html`  
JavaScript client for WebSocket communication with the backend.  
Enables real-time chat between doctors and patients, and live status updates for appointments.

### Data Visualization
**Chart.js** - `/frontend/pages/admin/admin.html`, `/frontend/pages/medical/doctor/ehr.html`  
JavaScript charting library for creating responsive charts and graphs.  
Displays medical statistics, patient health trends, and administrative analytics dashboards.

### Custom JavaScript Modules
**Auth Guard** - `/frontend/assets/js/components/auth-guard.js`  
Custom authentication module for protecting frontend routes and managing user sessions.  
Ensures only authorized users (patients/doctors) can access their respective dashboards.

**API Helper** - `/frontend/assets/js/api-helper.js`  
Custom module for standardizing API calls and handling responses.  
Manages all HTTP requests to backend, handles errors, and maintains consistent error handling.

**Language Manager** - `/frontend/assets/js/components/language-manager.js`  
Custom internationalization module for Arabic/English language switching.  
Provides real-time translation of the interface to support Sudan's multilingual user base.

**Validation** - `/frontend/assets/js/components/validation.js`  
Custom form validation module for client-side input validation.  
Validates phone numbers, emails, and medical data before sending to the backend.

**Cache Manager** - `/frontend/assets/js/components/cache.js`  
Custom caching module for storing frequently accessed data locally.  
Improves performance by caching doctor lists, appointment slots, and user preferences.

**Logger** - `/frontend/assets/js/components/logger.js`  
Custom logging module for debugging and error tracking.  
Provides consistent logging across the application with different log levels for development/production.

---

## CSS Frameworks

### Typography
**Noto Sans Arabic** - Google Fonts in all HTML files  
Arabic/Latin font family optimized for readability in both languages.  
Ensures proper display of Arabic medical terms and provides consistent typography across the platform.

### Custom Stylesheets
**Main CSS** - `/frontend/assets/css/main.css`  
Core stylesheet defining the platform's visual identity and theme.  
Contains custom styles for medical forms, telemedicine interface, and Sudan-specific design elements.

**Component CSS** - `/frontend/assets/css/components/*.css`  
Modular stylesheets for specific components (auth, dashboard, appointments).  
Maintains separation of concerns and allows for component-specific styling without conflicts.

---

## Development Dependencies

### Version Control & Deployment
**Git** - Version control system  
Tracks code changes, manages collaborative development, and maintains code history.  
Enables team collaboration and provides backup through GitHub repository.

### Environment Management
**.env files** - Configuration management  
Stores environment-specific variables and sensitive configuration.  
Keeps production secrets separate from development settings for security.

---

## Why These Libraries?

### Selection Criteria
1. **Reliability**: All libraries are well-maintained with active communities
2. **Security**: Libraries are regularly updated with security patches
3. **Performance**: Chosen for optimal performance in medical application context
4. **Compatibility**: All libraries work well together without conflicts
5. **Localization**: Support for Arabic language and RTL layouts
6. **Mobile Support**: All frontend libraries are mobile-responsive
7. **Healthcare Standards**: Libraries support HIPAA-compliant practices where applicable
8. **Sudan Context**: Libraries work well with limited bandwidth and older devices common in Sudan

### Key Integrations
- **Flask + SQLAlchemy**: Provides robust backend with ORM for medical records
- **Flask-Login + Flask-CORS**: Enables secure cross-origin authentication
- **Bootstrap + Arabic Fonts**: Creates responsive, bilingual user interface
- **Socket.IO + Flask-SocketIO**: Enables real-time doctor-patient communication
- **Chart.js + Medical Data**: Visualizes patient health trends and statistics
---
