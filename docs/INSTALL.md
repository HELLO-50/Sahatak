# Sahatak Telemedicine Platform - Installation Guide

Complete step-by-step installation and deployment guide for the Sahatak Telemedicine Platform. This guide will walk you through deploying the frontend on GitHub Pages and the backend on PythonAnywhere.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Overview](#overview)
3. [Part 1: Backend Deployment on PythonAnywhere](#part-1-backend-deployment-on-pythonanywhere)
4. [Part 2: Frontend Deployment on GitHub Pages](#part-2-frontend-deployment-on-github-pages)
5. [Part 3: Integration and Testing](#part-3-integration-and-testing)
6. [Part 4: Post-Deployment Configuration](#part-4-post-deployment-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Security Checklist](#security-checklist)

---

## Prerequisites

Before starting the installation, ensure you have:

### Required Accounts
- **GitHub Account**: For frontend hosting and version control
- **PythonAnywhere Account**: For backend hosting (free tier available)
- **Gmail Account**: For email service configuration (optional)

### Required Software
- **Git**: For version control
- **Text Editor**: VS Code, Sublime Text, or similar
- **Web Browser**: Chrome, Firefox, or Safari for testing

### Knowledge Requirements
- Basic understanding of Git commands
- Familiarity with command line/terminal
- Basic understanding of Python and Flask (helpful but not required)

---

## Overview

The Sahatak platform consists of two main components:

1. **Frontend**: Static HTML/CSS/JavaScript files hosted on GitHub Pages
2. **Backend**: Python Flask API hosted on PythonAnywhere

**Architecture:**
```
User Browser → GitHub Pages (Frontend) → PythonAnywhere (Backend API) → SQLite Database
```

**Deployment Flow:**
1. Deploy backend to PythonAnywhere first
2. Update frontend configuration with backend URL
3. Deploy frontend to GitHub Pages
4. Test integration and functionality

---

## Part 1: Backend Deployment on PythonAnywhere

### Step 1: Create PythonAnywhere Account

1. Visit [PythonAnywhere.com](https://www.pythonanywhere.com)
2. Click **"Create a free account"**
3. Choose a username: `sahatak`
4. Complete registration with a valid email address
5. Verify your email address

**Note:** Your backend will be available at `https://sahatak.pythonanywhere.com`

### Step 2: Upload Code to PythonAnywhere

#### Option A: Using Git (Recommended)

1. **Open PythonAnywhere Dashboard**
   - Log in to your PythonAnywhere account
   - Click on **"Consoles"** tab
   - Click **"Bash"** to open a terminal

2. **Clone the Repository**
   ```bash
   # Clone your Sahatak repository
   git clone https://github.com/HELLO-50/sahatak.git
   cd sahatak
   
   # Verify the structure
   ls -la
   ```

3. **Navigate to Backend Directory**
   ```bash
   cd backend
   ls -la  # Should show app.py, requirements.txt, etc.
   ```

#### Option B: Manual Upload (Alternative)

1. **Download Project Files**
   - Download the Sahatak project as ZIP from GitHub
   - Extract the files locally

2. **Upload via Files Tab**
   - In PythonAnywhere dashboard, go to **"Files"** tab
   - Create folder: `sahatak`
   - Upload all backend files to `/home/sahatak/sahatak/backend/`

### Step 3: Install Dependencies

1. **In the PythonAnywhere Bash console:**
   ```bash
   # Navigate to backend directory
   cd /home/sahatak/sahatak/backend
   
   # Install requirements (this may take a few minutes)
   pip3.10 install --user -r requirements.txt
   ```

2. **Wait for installation to complete**
   - This process typically takes 2-5 minutes
   - You'll see packages being installed

3. **Verify installation:**
   ```bash
   python3.10 -c "import flask; print('Flask installed successfully')"
   ```

### Step 4: Configure Environment Variables

1. **Create Environment File**
   ```bash
   # In the backend directory
   cd /home/sahatak/sahatak/backend
   nano .env
   ```

2. **Add Configuration** (copy and paste):
   ```env
   # Flask Configuration
   SECRET_KEY=your-super-secret-key-change-this-in-production-12345
   FLASK_ENV=production
   DATABASE_URL=sqlite:////home/sahatak/sahatak/backend/sahatak_production.db
   
   # Frontend URL (will be updated later)
   FRONTEND_URL=https://HELLO-50.github.io/sahatak
   
   # Mail Configuration (Optional - for email notifications)
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-gmail-app-password
   MAIL_DEFAULT_SENDER=your-email@gmail.com
   
   # SMS Configuration (Optional)
   SMS_USERNAME=sandbox
   SMS_API_KEY=your-sms-api-key
   SMS_SENDER_ID=SAHATAK
   ```

3. **Save and Exit**
   - Press `Ctrl + X`
   - Press `Y` to confirm
   - Press `Enter` to save

4. **Secure the Environment File**
   ```bash
   chmod 600 .env
   ```

### Step 5: Create WSGI Configuration File

1. **Navigate to Web App Directory**
   ```bash
   cd /var/www
   ```

2. **Create WSGI File**
   ```bash
   nano sahatak_pythonanywhere_com_wsgi.py
   ```

3. **Add WSGI Configuration**:
   ```python
   #!/usr/bin/python3.10
   
   """
   WSGI configuration file for Sahatak Telemedicine Platform
   PythonAnywhere deployment configuration
   """
   
   import sys
   import os
   
   # Add your project directory to the Python path
   project_home = '/home/sahatak/sahatak/backend'
   if project_home not in sys.path:
       sys.path = [project_home] + sys.path
   
   # Set working directory
   os.chdir(project_home)
   
   # Set environment variables for production
   os.environ['FLASK_ENV'] = 'production'
   os.environ.setdefault('FLASK_APP', 'app.py')
   
   # Load environment variables from .env file if it exists
   env_path = os.path.join(project_home, '.env')
   if os.path.exists(env_path):
       with open(env_path) as f:
           for line in f:
               if line.strip() and not line.startswith('#'):
                   key, value = line.strip().split('=', 1)
                   os.environ.setdefault(key, value)
   
   # Import Flask application
   try:
       from app import app as application
       
       # Log successful import
       print(f"Successfully imported Flask app from {project_home}")
       
   except ImportError as import_error:
       error_message = str(import_error)
       print(f"Error importing Flask app: {error_message}")
       print(f"Python path: {sys.path}")
       print(f"Current working directory: {os.getcwd()}")
       print(f"Project home contents: {os.listdir(project_home) if os.path.exists(project_home) else 'Directory not found'}")
       
       # Create a simple error application
       def application(environ, start_response):
           status = '500 Internal Server Error'
           headers = [('Content-type', 'text/plain')]
           start_response(status, headers)
           return [f"Import Error: {error_message}".encode('utf-8')]
   
   # For debugging - remove in production
   if __name__ == '__main__':
       print("WSGI configuration loaded successfully")
       print(f"Project home: {project_home}")
       print(f"Python version: {sys.version}")
   ```

4. **Save and Exit** (`Ctrl + X`, `Y`, `Enter`)

### Step 6: Create Web App

1. **Go to Web Tab**
   - In PythonAnywhere dashboard, click **"Web"** tab
   - Click **"Add a new web app"**

2. **Configure Web App**
   - Click **"Next"** for domain confirmation
   - Select **"Manual configuration"**
   - Choose **"Python 3.10"**
   - Click **"Next"**

3. **Set Configuration Paths**
   - **Source code:** `/home/sahatak/sahatak/backend`
   - **WSGI configuration file:** `/var/www/sahatak_pythonanywhere_com_wsgi.py`

4. **Configure Virtual Environment** (Optional but recommended)
   - **Virtualenv:** `/home/sahatak/.local`

### Step 7: Initialize Database

1. **In PythonAnywhere Bash console:**
   ```bash
   cd /home/sahatak/sahatak/backend
   python3.10 -c "
   from app import app, db
   with app.app_context():
       db.create_all()
       print('Database created successfully')
   "
   ```

2. **Verify Database Creation**
   ```bash
   ls -la *.db
   # Should show sahatak_production.db
   ```

### Step 8: Test Backend Deployment

1. **Reload Web App**
   - In PythonAnywhere Web tab, click **"Reload sahatak.pythonanywhere.com"**

2. **Test Health Endpoint**
   - Visit: `https://sahatak.pythonanywhere.com/api/health`
   - Should return JSON with `"success": true`

3. **Check Error Logs** (if needed)
   ```bash
   tail -f /var/log/sahatak.pythonanywhere.com.error.log
   ```

---

## Part 2: Frontend Deployment on GitHub Pages

### Step 1: Prepare GitHub Repository

1. **Create GitHub Repository**
   - Go to [GitHub.com](https://github.com)
   - Click **"New repository"**
   - Name: `sahatak` (or your preferred name)
   - Set as **Public**
   - Initialize with README: **No** (we have existing files)
   - Click **"Create repository"**

2. **Note Your Repository URL**
   - Example: `https://github.com/HELLO-50/sahatak`

### Step 2: Update Frontend Configuration

1. **Download/Clone Project Locally**
   ```bash
   # If you don't have it locally yet
   git clone https://github.com/HELLO-50/sahatak.git
   cd sahatak
   ```

2. **Update API Base URL**
   - Open `frontend/assets/js/main.js`
   - Find the `ApiHelper` section
   - Update the `baseUrl`:

   ```javascript
   // In frontend/assets/js/main.js
   const ApiHelper = {
       // Replace 'yourusername' with your actual PythonAnywhere username
       baseUrl: 'https://sahatak.pythonanywhere.com/api',
       
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

3. **Verify All HTML Pages**
   - Check that all links in HTML files are relative paths
   - Ensure no hardcoded localhost URLs exist

### Step 3: Push Code to GitHub

1. **Initialize Git Repository** (if not already done)
   ```bash
   cd /path/to/sahatak
   git init
   ```

2. **Add Remote Origin**
   ```bash
   git remote add origin https://github.com/HELLO-50/sahatak.git
   ```

3. **Add and Commit Files**
   ```bash
   git add .
   git commit -m "Initial deployment of Sahatak Telemedicine Platform"
   ```

4. **Push to GitHub**
   ```bash
   git branch -M main
   git push -u origin main
   ```

### Step 4: Enable GitHub Pages

1. **Go to Repository Settings**
   - Navigate to your GitHub repository
   - Click **"Settings"** tab
   - Scroll down to **"Pages"** section

2. **Configure Pages**
   - **Source:** Deploy from a branch
   - **Branch:** main
   - **Folder:** / (root)
   - Click **"Save"**

3. **Wait for Deployment**
   - GitHub will show: "Your site is published at https://yourusername.github.io/sahatak"
   - This process takes 5-10 minutes

4. **Verify Deployment**
   - Visit: `https://yourusername.github.io/sahatak`
   - Should show the Sahatak homepage

---

## Part 3: Integration and Testing

### Step 1: Update CORS Configuration

1. **Update Backend CORS Settings**
   - In PythonAnywhere Bash console:
   ```bash
   cd /home/sahatak/sahatak/backend
   nano app.py
   ```

2. **Find CORS Configuration and Update**
   ```python
   # Update the CORS configuration in app.py
   from flask_cors import CORS
   
   # Replace with your actual GitHub Pages URL
   CORS(app, 
        origins=[
            'https://yourusername.github.io',  # Your GitHub Pages domain
            'http://localhost:8000',           # For local development
            'http://127.0.0.1:8000'           # For local development
        ],
        allow_headers=['Content-Type', 'Authorization', 'Accept-Language'],
        methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        supports_credentials=True)
   ```

3. **Save and Reload**
   - Save the file (`Ctrl + X`, `Y`, `Enter`)
   - Go to PythonAnywhere Web tab
   - Click **"Reload"**

### Step 2: Update Environment Variables

1. **Update Frontend URL in Backend**
   ```bash
   cd /home/sahatak/sahatak/backend
   nano .env
   ```

2. **Update FRONTEND_URL**
   ```env
   FRONTEND_URL=https://yourusername.github.io/sahatak
   ```

3. **Save and Reload**

### Step 3: Complete Integration Test

1. **Test Frontend-Backend Communication**
   - Visit: `https://yourusername.github.io/sahatak`
   - Try to register a new user
   - Check if API calls work properly

2. **Test Key Functionality**
   - User registration
   - User login
   - Language switching
   - Dashboard access

3. **Check Browser Console**
   - Open browser developer tools (F12)
   - Look for any CORS or API errors
   - Verify all resources load correctly

---

## Part 4: Post-Deployment Configuration

### Step 1: Configure Email Service (Optional)

1. **Set Up Gmail App Password**
   - Go to Google Account settings
   - Enable 2-factor authentication
   - Generate app password for "Mail"
   - Copy the 16-character password

2. **Update Environment Variables**
   ```bash
   cd /home/sahatak/sahatak/backend
   nano .env
   ```

3. **Add Email Configuration**
   ```env
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-16-char-app-password
   MAIL_DEFAULT_SENDER=your-email@gmail.com
   ```

### Step 2: Set Up Admin User

1. **Create Admin User via API**
   ```bash
   # In PythonAnywhere console
   cd /home/sahatak/sahatak/backend
   python3.10 -c "
   from app import app, db
   from models import User
   import bcrypt
   
   with app.app_context():
       # Create admin user
       admin_email = 'admin@sahatak.com'
       admin_password = 'admin123'  # Change this!
       
       hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
       
       admin_user = User(
           email=admin_email,
           password_hash=hashed_password,
           full_name='Administrator',
           user_type='admin',
           language_preference='en',
           is_active=True,
           is_verified=True
       )
       
       db.session.add(admin_user)
       db.session.commit()
       print(f'Admin user created: {admin_email}')
   "
   ```

### Step 3: Domain Configuration (Optional)

If you have a custom domain:

1. **Configure Custom Domain on GitHub Pages**
   - In repository settings → Pages
   - Add your custom domain
   - Enable "Enforce HTTPS"

2. **Update Backend CORS and Environment**
   - Add your custom domain to CORS origins
   - Update FRONTEND_URL in .env

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Backend Import Errors

**Problem:** WSGI import errors
**Solution:**
```bash
# Check Python path and dependencies
cd /home/yourusername/sahatak/backend
python3.10 -c "import sys; print(sys.path)"
pip3.10 list | grep -i flask
```

#### 2. Database Connection Issues

**Problem:** Database file not found
**Solution:**
```bash
# Recreate database
cd /home/yourusername/sahatak/backend
python3.10 -c "
from app import app, db
with app.app_context():
    db.drop_all()
    db.create_all()
    print('Database recreated')
"
```

#### 3. CORS Errors

**Problem:** "Access to fetch... has been blocked by CORS policy"
**Solution:**
- Verify CORS origins in `app.py`
- Check that GitHub Pages URL is correct
- Ensure credentials are included in fetch requests

#### 4. GitHub Pages Not Loading

**Problem:** 404 error on GitHub Pages
**Solution:**
- Check that repository is public
- Verify GitHub Pages is enabled in settings
- Wait 10-15 minutes for deployment
- Check that `index.html` is in repository root

#### 5. API Endpoints Returning 500 Errors

**Problem:** Internal server errors
**Solution:**
```bash
# Check error logs
tail -f /var/log/sahatak.pythonanywhere.com.error.log

# Check application logs
cd /home/yourusername/sahatak/backend
tail -f logs/sahatak_errors.log
```

### Debug Commands

```bash
# Check if web app is running
curl https://sahatak.pythonanywhere.com/api/health

# Test database connection
cd /home/yourusername/sahatak/backend
python3.10 -c "
from app import app, db
with app.app_context():
    print('Database connection:', db.engine.url)
    print('Tables:', db.engine.table_names())
"

# View recent logs
tail -20 /home/yourusername/sahatak/backend/logs/sahatak_app.log
```

---

## Security Checklist

### Pre-Production Security

- [ ] **Change SECRET_KEY**: Use a strong, unique secret key
- [ ] **Secure Database**: Set proper file permissions (`chmod 600`)
- [ ] **Environment Variables**: Never commit `.env` to repository
- [ ] **Admin Credentials**: Change default admin password
- [ ] **HTTPS**: Ensure both frontend and backend use HTTPS
- [ ] **Input Validation**: Verify all forms have proper validation
- [ ] **Error Handling**: Ensure no sensitive info in error messages

### Post-Deployment Monitoring

- [ ] **Health Checks**: Verify `/api/health` endpoint works
- [ ] **Log Monitoring**: Check logs regularly for errors
- [ ] **User Registration**: Test complete user registration flow
- [ ] **Email Functionality**: Verify email notifications work
- [ ] **Mobile Responsiveness**: Test on mobile devices
- [ ] **Language Switching**: Test Arabic/English switching
- [ ] **Admin Dashboard**: Verify admin functions work properly

### Backup Strategy

1. **Database Backup**
   ```bash
   # Create backup
   cd /home/sahatak/sahatak/backend
   cp sahatak_production.db sahatak_backup_$(date +%Y%m%d).db
   ```

2. **Code Backup**
   - Regular git commits and pushes
   - Keep local copies of important files

---

## Maintenance

### Regular Tasks

1. **Weekly**
   - Check application logs for errors
   - Verify health endpoint response
   - Monitor disk space usage

2. **Monthly**
   - Update dependencies if needed
   - Review security logs
   - Create database backup

3. **As Needed**
   - Update translations
   - Deploy new features
   - Handle user support requests

### Update Deployment

To update the application:

1. **Update Code Locally**
2. **Test Changes**
3. **Commit and Push to GitHub**
   ```bash
   git add .
   git commit -m "Update: description of changes"
   git push origin main
   ```
4. **Update Backend** (if needed)
   ```bash
   # On PythonAnywhere
   cd /home/yourusername/sahatak
   git pull origin main
   # Reload web app in dashboard
   ```

---

## Support and Resources

### Documentation
- [PythonAnywhere Help](https://help.pythonanywhere.com/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Flask Documentation](https://flask.palletsprojects.com/)

### Community
- GitHub Issues: Report bugs and request features
- Stack Overflow: General programming questions
- PythonAnywhere Forums: Hosting-specific questions

### Contact
For Sahatak-specific issues, create an issue in the GitHub repository with:
- Clear description of the problem
- Steps to reproduce
- Error messages (if any)
- Browser and device information

---

**Congratulations!** You have successfully deployed the Sahatak Telemedicine Platform. The system is now ready for use, providing bilingual telemedicine services with a professional frontend and robust backend infrastructure.

Visit your deployed application at:
- **Frontend**: `https://yourusername.github.io/sahatak`
- **Backend API**: `https://sahatak.pythonanywhere.com`
- **Health Check**: `https://sahatak.pythonanywhere.com/api/health`