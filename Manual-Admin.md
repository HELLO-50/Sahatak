# SAHATAK Admin Manual

This manual will guide you through all the administrative features available on the Sahatak platform.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Analytics & Overview](#analytics--overview)
4. [User Management](#user-management)
5. [Doctor Verification](#doctor-verification)
6. [Appointments Management](#appointments-management)
7. [System Settings](#system-settings)
9. [Admin Account Management](#admin-account-management)

---

## Getting Started

### Creating the First Admin Account

1. **Initial Setup**
   - When the platform is first set up, use the **"Initialize First Admin"** endpoint
   - This creates the initial admin account

2. **Access the Admin Panel**
   - Go to `/admin/admin.html` page
   - Login with your admin credentials

### Logging In as Admin

1. **Go to Login Page**
   - Navigate to the login page

2. **Enter Admin Credentials**
   - Enter your **Email** or **Phone Number**
   - Enter your **Password**
   - Click **"Login"**

3. **Access Admin Dashboard**
   - You'll be redirected to the admin dashboard

---

## Dashboard Overview

### Dashboard Layout

The admin dashboard is organized into **tabs** for easy navigation:

1. **Dashboard Tab** - Overview, statistics, and analytics
2. **User Management Tab** - Manage all users (patients, doctors, admins)
3. **Doctor Verification Tab** - Verify doctor accounts
4. **Appointments Tab** - View and manage all appointments
5. **Settings Tab** - System configuration and settings

### Navigation

- Click on each **tab** to switch between sections
- Use the **top navigation** to access different areas
- **Logout** button available in header
- **Language selector** to switch between Arabic/English

---

## Dashboard Tab - Analytics & Overview

### Accessing Dashboard Tab

1. **From Admin Panel**
   - Click **"Dashboard"** tab (usually the first tab)
   - This is the default view when you log in

### Platform Statistics

The dashboard displays key platform metrics:

#### **Total Users**
- **Total Users**: Total count of all users (patients + doctors + admins)
- **Total Patients**: Number of registered patients
- **Verified Doctors**: Number of doctors verified and active
- **Total Appointments**: Total appointment count

#### **System Health**
- **System Health Score**: Overall platform health (0-100%)
  - Green (90-100%): Excellent
  - Yellow (70-89%): Good
  - Red (<70%): Needs attention

### Platform Health & Analytics

#### **Performance Metrics**
- **Server Uptime**: Percentage of time server is operational
- **Average Response Time**: Average API response time
- **Error Rate**: Percentage of failed requests
- **Active Users (7 days)**: Number of users active in the last 7 days

#### **Charts & Visualizations**
- **Doctor Specialty Distribution** (Pie Chart)
  - Shows breakdown of doctors by specialty
  - Helps identify coverage areas

- **Appointment Status Distribution** (Bar Chart)
  - Shows appointments by status:
    - Scheduled
    - Completed
    - Cancelled
  - Visual representation of platform activity

#### **Recent Activity Summary**
- **New Users (7 days)**: Recent user registrations
- **Appointments (7 days)**: Appointments created in last week
- **Completed Appointments (7 days)**: Appointments finished in last week

---

## User Management

### Accessing User Management Tab

1. **From Admin Dashboard**
   - Click **"User Management"** or **"Users"** tab

### Viewing All Users

1. **In User Management Tab**
   - See paginated list of all users
   - Default view shows all user types

2. **User Information Displayed**
   - **User ID**: Unique identifier
   - **Email**: User's email address
   - **Name**: Full name
   - **User Type**: Patient, Doctor, or Admin
   - **Status**: Active or Inactive
   - **Verification Status**: Verified or Unverified (for doctors)
   - **Profile Completion**: Percentage or status
   - **Last Login**: Last login date/time
   - **Actions**: Buttons for user management

### Filtering Users

1. **Filter by User Type**
   - Look for **"User Type"** filter dropdown
   - Select:
     - **All Users** (default)
     - **Patients**
     - **Doctors**
     - **Admins**
   - Click **"Apply"** or **"Filter"**

2. **Filter by Status**
   - Look for **"Status"** filter dropdown
   - Select:
     - **All** (default)
     - **Active**
     - **Inactive**
   - Click **"Apply"** or **"Filter"**

### Searching for Users

1. **Use Search Box**
   - Look for **"Search Users"** input box

2. **Enter Search Criteria**
   - Search by:
     - **Name**
     - **Email**
     - **Phone Number**

3. **Press Enter or Click Search**
   - Results will filter the user list

### Viewing User Details

1. **Click on a User**
   - From the user list, click on any user row
   - Or click **"View Details"** button

2. **See Complete User Information**
   - **Personal Information**:
     - Full name
     - Email
     - Phone number
     - Age (for patients)
     - Gender (for patients)
   - **Account Information**:
     - User type
     - Account status
     - Registration date
     - Last login
     - Profile completion status
   - **Type-Specific Information**:
     - **For Doctors**: Specialty, license number, experience, verification status
     - **For Patients**: Medical info, emergency contact
   - **Account History**:
     - Login history
     - Activity log

### Activating/Deactivating User Accounts

1. **Find User**
   - Search for or browse to the user

2. **Click "Toggle Status" or "Activate/Deactivate"**
   - Look for status toggle button in user details or actions column

3. **Confirm Action**
   - **To Deactivate**:
     - Confirm you want to deactivate the account
     - User will be logged out and unable to login
   - **To Activate**:
     - Confirm you want to activate the account
     - User can login again

4. **Status Updated**
   - User status changes immediately

### Resetting User Password

1. **Open User Details**
   - Click on the user

2. **Click "Change Password" or "Reset Password"**
   - Look for password reset button

3. **Enter New Password**
   - Type the **new password** for the user
   - Confirm the password

4. **Save New Password**
   - Click **"Save"** or **"Reset"**
   - User must use the new password to login
   - Inform the user of their new password securely

### Deleting a User Account

**⚠️ Warning**: Deleting a user is permanent and cannot be undone.

1. **Open User Details**
   - Find and click on the user to delete

2. **Click "Delete User" or "Delete Account"**
   - Look for delete button (usually red)

3. **Confirm Deletion**
   - Read the warning message
   - Confirm you understand this is permanent
   - Type confirmation if required

4. **User Deleted**
   - User account is permanently removed
   - All associated data may be deleted or anonymized
   - Action is logged in audit log

### Adding a Doctor Manually

1. **In User Management or Doctor Verification Tab**
   - Look for **"Add Doctor"** button

2. **Click "Add Doctor"**
   - Opens doctor creation form

3. **Fill in Doctor Information**
   - **Full Name**
   - **Email Address**
   - **Phone Number**
   - **Medical License Number**
   - **Specialty**
   - **Years of Experience**
   - **Password** (initial password)

4. **Submit Form**
   - Click **"Create Doctor"** or **"Add"**
   - Doctor account is created
   - Doctor can login with provided credentials

5. **Verify Doctor** (optional)
   - You can immediately verify the doctor
   - Or verify later through Doctor Verification tab

### Pagination

- Use **"Next"**, **"Previous"** buttons at bottom of user list
- Or enter **page number** to jump to specific page
- Adjust **items per page** (if available)

---

## Doctor Verification

### Understanding Doctor Verification

- Doctors register on the platform but cannot accept appointments until verified
- Admins review doctor credentials and approve their accounts
- Verification ensures only qualified doctors provide consultations

### Accessing Doctor Verification Tab

1. **From Admin Dashboard**
   - Click **"Doctor Verification"** or **"Verification"** tab

### Viewing Pending Verifications

1. **In Doctor Verification Tab**
   - See list of doctors awaiting verification

2. **Doctor Information Displayed**
   - **Doctor Name**
   - **Email**
   - **Phone Number**
   - **Specialty**
   - **License Number**
   - **Years of Experience**
   - **Profile Completion Status**
   - **Registration Date**
   - **Actions** (Verify button)

### Reviewing a Doctor's Profile

1. **Click on a Doctor**
   - From pending list, click on doctor row
   - Or click **"View Details"** button

2. **Review Professional Information**
   - Check **License Number**: Verify it's valid
   - Review **Specialty**: Ensure it's legitimate
   - Check **Experience**: Verify years of experience
   - Review **Credentials**: Check uploaded documents (if available)
   - Review **Education**: Check medical education details
   - Review **Certifications**: Verify professional certifications

3. **Verify Credentials**
   - Cross-check license number with medical board (external)
   - Verify doctor's identity
   - Ensure all information is accurate

### Verifying a Doctor Account

1. **After Reviewing Profile**
   - If credentials are valid and complete

2. **Click "Verify Doctor" or "Approve"**
   - Look for verification button

3. **Confirm Verification**
   - Confirm you've reviewed credentials
   - Confirm approval

4. **Doctor Verified**
   - Doctor's status changes to **"Verified"**
   - Doctor can now:
     - Accept appointments
     - Access patient communication
     - Manage availability
     - Review patient records
   - Doctor is notified of verification

### Rejecting a Doctor (if needed)

If credentials are invalid or incomplete:

1. **Click "Reject" or Contact Doctor**
   - Request additional information
   - Or deactivate account if fraudulent

2. **Provide Reason**
   - Explain why verification was denied
   - Request missing documents or corrections

---

## Appointments Management

### Accessing Appointments Tab

1. **From Admin Dashboard**
   - Click **"Appointments"** or **"Appointments Management"** tab

### Viewing All Appointments

1. **In Appointments Tab**
   - See paginated list of all appointments system-wide

2. **Appointment Information Displayed**
   - **Appointment ID**: Unique identifier
   - **Patient Name**: Patient's full name
   - **Doctor Name**: Doctor's full name
   - **Date & Time**: Scheduled date and time
   - **Status**: Scheduled, Completed, Cancelled
   - **Actions**: Cancel or Delete buttons

### Filtering Appointments

1. **Filter by Status**
   - Look for **"Status"** filter dropdown
   - Select:
     - **All** (default)
     - **Scheduled**
     - **Completed**
     - **Cancelled**
   - Click **"Apply"** or **"Filter"**

2. **Filter by Date Range**
   - Look for **"Date Range"** filter
   - Select:
     - **Start Date**
     - **End Date**
   - Click **"Apply"** or **"Filter"**
   - View appointments within date range

### Viewing Appointment Details

1. **Click on an Appointment**
   - From appointments list, click appointment row
   - Or click **"View Details"** button

2. **See Complete Appointment Information**
   - Patient details
   - Doctor details
   - Date and time
   - Appointment status
   - Patient symptoms/notes
   - Prescription (if created)
   - Diagnosis (if recorded)

### Cancelling an Appointment

1. **Find the Appointment**
   - Search or browse to the appointment

2. **Click "Cancel Appointment"**
   - Look for cancel button in actions column or details page

3. **Confirm Cancellation**
   - Provide reason (optional)
   - Confirm you want to cancel

4. **Appointment Cancelled**
   - Status changes to "Cancelled"
   - Patient and doctor are notified
   - Action is logged

### Deleting an Appointment Record

**⚠️ Warning**: Deleting appointments is permanent.

1. **Find the Appointment**
   - Search or browse to the appointment

2. **Click "Delete Appointment"**
   - Look for delete button (usually red)

3. **Confirm Deletion**
   - Read warning message
   - Confirm permanent deletion

4. **Appointment Deleted**
   - Record is permanently removed
   - Action is logged in audit log

### Pagination

- Use **"Next"**, **"Previous"** buttons to navigate pages
- Enter **page number** to jump to specific page
- Adjust **items per page** if available

---

## System Settings

### Accessing Settings Tab

1. **From Admin Dashboard**
   - Click **"Settings"** or **"System Settings"** tab

### Viewing Current Settings

1. **In Settings Tab**
   - See current system configuration
   - View all setting values

### System Configuration Options

#### **Maintenance Mode**
- **Purpose**: Put platform in maintenance mode for updates or repairs
- **When Enabled**:
  - Regular users (patients, doctors) cannot access the platform
  - Maintenance page is shown to users
  - Admins can still access admin panel

#### **Other Settings**
- **Language Defaults**: Set default language for new users
- **Notification Configurations**: System-wide notification settings
- **Feature Toggles**: Enable/disable specific features
- **System Parameters**: Platform-wide configuration values

### Enabling Maintenance Mode

1. **In Settings Tab**
   - Find **"Maintenance Mode"** section

2. **Toggle Maintenance Mode**
   - Click toggle or checkbox to **enable**
   - Or click **"Enable Maintenance Mode"** button

3. **Save Settings**
   - Click **"Save"** or **"Update Settings"**

4. **Maintenance Mode Active**
   - Users see maintenance page when accessing platform
   - System shows "under maintenance" message
   - Admins can still access admin functions

### Disabling Maintenance Mode

1. **In Settings Tab**
   - Find **"Maintenance Mode"** section

2. **Toggle Maintenance Mode**
   - Click toggle or checkbox to **disable**
   - Or click **"Disable Maintenance Mode"** button

3. **Save Settings**
   - Click **"Save"** or **"Update Settings"**

4. **Platform Back Online**
   - Users can access the platform normally
   - All services resume

### Updating System Settings

1. **In Settings Tab**
   - Find the setting you want to change

2. **Modify Setting Value**
   - Change the value or toggle the option

3. **Save Changes**
   - Click **"Save Settings"** or **"Update"**
   - Changes take effect immediately or after restart (depending on setting)

---


## Admin Account Management

### Creating Additional Admin Accounts

1. **Access Admin Creation**
   - Look for **"Create Admin"** button or link
   - May be in User Management or Settings

2. **Click "Create Admin"**
   - Opens admin creation form

3. **Fill in Admin Information**
   - **Full Name**
   - **Email Address**
   - **Phone Number**
   - **Password** (initial password)
   - **Permissions** (if role-based access available)

4. **Create Admin**
   - Click **"Create Admin"** or **"Add"**
   - New admin account is created
   - Provide credentials to the new admin securely

5. **Admin Account Active**
   - New admin can login with provided credentials
   - Has access to admin dashboard

---

## Best Practices for Admins

### 1. Regular Monitoring
- Check dashboard daily for system health
- Monitor user activity and statistics
- Review error rates and performance metrics

### 2. Doctor Verification
- Verify doctor credentials thoroughly
- Don't rush the verification process
- Keep records of verification decisions

### 3. User Management
- Handle user issues promptly
- Be cautious when deleting accounts
- Keep audit trail of actions

### 4. Security
- Use strong passwords
- Change passwords regularly
- Don't share admin credentials
- Review audit logs periodically

### 5. Maintenance Planning
- Schedule maintenance during low-usage hours
- Notify users in advance via broadcast
- Keep maintenance mode time minimal

### 6. Communication
- Use broadcast notifications judiciously
- Keep users informed of platform updates
- Respond to support requests promptly

### 7. Data Management
- Regularly review user data
- Monitor appointment trends
- Ensure data privacy and compliance

---

## Reports & Analytics (if available)

### Generating Reports

1. **Access Reports Section**
   - Look for **"Reports"** or **"Analytics"** in dashboard

2. **Select Report Type**
   - User registration reports
   - Appointment statistics
   - Doctor performance
   - Platform usage
   - Financial reports (if applicable)

3. **Set Parameters**
   - Date range
   - User types
   - Other filters

4. **Generate Report**
   - Click **"Generate"** or **"Export"**
   - Download report (PDF, CSV, Excel)

### Viewing Analytics

1. **In Dashboard Tab**
   - View charts and graphs
   - See trends over time

2. **Advanced Analytics**
   - Click **"Advanced Analytics"** if available
   - Access detailed metrics and insights

---

## Troubleshooting

### Can't Access Admin Dashboard?
- Verify you're using admin credentials
- Check if account has admin privileges
- Contact other admins or support

### User Can't Login?
- Check if user account is active
- Verify email is verified
- Reset password if needed
- Check for system-wide issues

### Doctor Verification Not Working?
- Ensure all doctor info is complete
- Check doctor's profile completion status
- Verify network connection
- Contact technical support

### Maintenance Mode Not Activating?
- Verify settings are saved
- Refresh the page
- Check for errors in console
- Contact technical support

### Notifications Not Sending?
- Check notification settings
- Verify email/SMS configurations
- Test with single user first
- Check audit logs for errors

---

## Contact Technical Support

For technical issues or questions:
- Document the issue (screenshots, error messages)
- Check audit logs for related events
- Contact Sahatak technical support team
- Provide admin credentials if required for support access

---

## Security Reminders

### Admin Account Security
- **Never share** admin credentials
- **Use strong passwords** with mix of characters
- **Change passwords regularly**
- **Log out** when not using admin dashboard
- **Use secure networks** when accessing admin panel

### Data Privacy
- **Respect user privacy** when viewing personal information
- **Only access data** when necessary for administrative tasks
- **Don't share** user information outside platform
- **Follow data protection regulations** (GDPR, HIPAA, etc.)

### Audit Trail
- **All actions are logged** in audit logs
- **Actions are traceable** to your admin account
- **Be accountable** for your administrative actions

---

**Thank you for managing the Sahatak Telemedicine Platform!**

Your work ensures the platform runs smoothly and provides quality healthcare services to patients and doctors. Your role is critical to the platform's success and reliability.
