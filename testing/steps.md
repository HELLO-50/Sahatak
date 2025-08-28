# Sahatak Testing Guide

This guide provides step-by-step instructions to test all major workflows in your Sahatak environment:
1. Email Requirement Validation
2. Doctor Registration & Profile Verification
3. Admin Verification Management  
4. Patient Medical History Completion

**URLs:**
- Frontend: https://hello-50.github.io/Sahatak/
- Backend: https://sahatak.pythonanywhere.com/api
- Local Backend: http://localhost:5000/api

---

## PHASE 1: Setup Postman

### Step 1: Download Postman
1. Go to https://www.postman.com/downloads/
2. Download Postman for your OS (Windows/Mac/Linux)
3. Install and create free account (or skip signup)

### Step 2: Create Testing Environment
1. Open Postman
2. Click "Environments" on left sidebar
3. Click "+" to create new environment
4. Name it "Sahatak"
5. Add these variables:
   ```
   Variable: backend_url
   Current Value: https://sahatak.pythonanywhere.com/api
   
   Variable: frontend_url  
   Current Value: https://hello-50.github.io/Sahatak
   ```
6. Click "Save"

### Step 3: Import Test Collections
1. In Postman, click "Import" (top left)
2. Click "Upload Files" 
3. Import these test files from testing/ folder:
   - `01_Auth_Tests.postman_collection.json`
   - `01_Email_Requirement_Tests.postman_collection.json`
   - `02_Doctor_Tests.postman_collection.json`
4. Click "Import"

### Step 4: Select Environment
1. In top-right corner of Postman, click environment dropdown
2. Select "Sahatak"
3. Verify you see `backend_url: https://sahatak.pythonanywhere.com/api`

---

## PHASE 2: Test Email Requirement Validation

**Execute requests in this exact order:**

### Step 5.0: Email Validation Tests
1. Click "01 - Email Requirement Tests" collection
2. Run these tests to validate email requirements:

#### 5.0.1: Register Patient WITHOUT Email
1. Click "Register Patient WITHOUT Email (Should Fail)"
2. Click **Send**
3. **Expected Response: 400 Bad Request**
   ```json
   {
     "success": false,
     "field": "email", 
     "message": "email is required"
   }
   ```

#### 5.0.2: Register with INVALID Email
1. Click "Register Patient with INVALID Email (Should Fail)"
2. Click **Send**
3. **Expected Response: 400 Bad Request**
   ```json
   {
     "success": false,
     "field": "email",
     "message": "Invalid email format" 
   }
   ```

#### 5.0.3: Register with VALID Email
1. Click "Register Patient with VALID Email (Should Succeed & Require Verification)"
2. Click **Send**
3. **Expected Response: 201 Created**
   ```json
   {
     "success": true,
     "data": {
       "id": 123,
       "email": "valid.patient@example.com",
       "requires_email_verification": true,
       "is_verified": false
     },
     "message": "User registered successfully. Please check your email to verify your account."
   }
   ```

#### 5.0.4: Login with Unverified Email  
1. Click "Login with Unverified Email (Should Fail)"
2. Click **Send**
3. **Expected Response: 403 Forbidden**
   ```json
   {
     "success": false,
     "message": "Please verify your email address before logging in"
   }
   ```

---

## PHASE 3: Test Doctor Verification Workflow

**Execute requests in this exact order:**

### Step 5.1: Register Doctor
1. Click "01 - Authentication Tests" collection
2. Click "Doctor Authentication" → "Register Doctor"
3. Click **Send**
4. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "User registered successfully. Please check your email to verify your account.",
     "data": {
       "id": 123,
       "email": "doctor.test@example.com",
       "requires_email_verification": true,
       "is_verified": false
     }
   }
   ```
5. **If you get "email already exists" error:** 
   - Go to Body tab
   - Change email to unique value like `doctor.test2@example.com`
   - Click Send again

### Step 5.2: Login Doctor
1. Click "Doctor Authentication" → "Login Doctor" 
2. **If you changed email above, update it in the Body here too**
3. Click **Send**
4. **Expected Response:**
   ```json
   {
     "success": true,
     "data": {
       "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
       "user": {...}
     }
   }
   ```
5. **CHECK:** Look at Console tab (bottom of Postman) - you should see "Doctor token saved"

### Step 5.3: Complete Doctor Profile  
1. Click "02 - Doctor Workflow Tests" collection
2. Click "Profile Management" → "Complete Profile"
3. Click **Send**
4. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Profile completed successfully",
     "data": {
       "profile_completed": true
     }
   }
   ```

### Step 5.4: Submit for Verification
1. Click "1.4 Submit for Verification"
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Profile submitted for verification successfully. You will be notified once reviewed.",
     "data": {
       "verification_status": "submitted",
       "submitted_at": "2025-01-XX..."
     }
   }
   ```

### Step 5.5: Check Verification Status
1. Click "1.5 Check Verification Status"  
2. Click **Send**
3. **Expected Response:** Should show `"verification_status": "submitted"`

---

## PHASE 4: Test Admin Verification Workflow

### Step 6.1: Register Admin
1. Click "01 - Authentication Tests" collection
2. Click "Admin Authentication" → "Register Admin"
3. Click **Send**
4. **Expected Response:** Success with admin user created

### Step 6.2: Login Admin
1. Click "Admin Authentication" → "Login Admin"
2. Click **Send**
3. **Expected Response:** Success with admin token
4. **✅ CHECK:** Console should show "Admin token saved"

### Step 6.3: View Pending Verifications
1. Click "2.3 Get Pending Verifications"
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Pending verifications retrieved successfully",
     "data": {
       "doctors": [
         {
           "doctor_id": 1,
           "full_name": "Dr. Test Smith",
           "email": "testdoctor@example.com",
           "specialty": "General Medicine",
           "verification_status": "submitted",
           "profile_completed": true,
           "submitted_at": "2025-01-XX..."
         }
       ]
     }
   }
   ```
4. **✅ CHECK:** Console should show "Doctor ID saved for approval"

### Step 6.4: View Doctor Details
1. Click "2.4 Get Doctor Details"
2. Click **Send**
3. **Expected Response:** Complete doctor profile with education details, office info, etc.

### Step 6.5: Approve Doctor
1. Click "2.5 Approve Doctor"
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Doctor verification approved successfully",
     "data": {
       "doctor_id": 1,
       "status": "approved"
     }
   }
   ```

**✅ VERIFICATION COMPLETE:** Doctor is now verified and can see patients!

---

## PHASE 5: Test Patient Medical History

### Step 7.1: Register Patient
1. Click "01 - Authentication Tests" collection
2. Click "Patient Authentication" → "Register Patient" 
3. Click **Send**
4. **Expected Response:** Success with patient user created

### Step 7.2: Login Patient
1. Click "Patient Authentication" → "Login Patient"
2. Click **Send**
3. **Expected Response:** Success with patient token
4. **✅ CHECK:** Console shows "Patient token saved" and "Patient ID saved"

### Step 7.3: Complete Medical History
1. Click "3.3 Complete Medical History"
2. Click **Send**
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Medical history completed successfully",
     "data": {
       "medical_history_completed": true,
       "last_updated": "2025-01-XX..."
     }
   }
   ```

### Step 7.4: Retrieve Medical History
1. Click "3.4 Get Patient Medical History"
2. Click **Send**
3. **Expected Response:** Complete medical history data including height, weight, allergies, etc.

---

## PHASE 6: Test EHR Integration

### Step 8.1: Test Patient Search (Doctor accessing EHR)
1. Click "02 - Doctor Workflow Tests" collection
2. Click "EHR Access" → "Search Patients"
3. Click **Send**
4. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Found X patient(s)",
     "data": {
       "patients": [
         {
           "id": 1,
           "name": "Patient Test",
           "medical_id": "...",
           "age": 35,
           "phone": "+249555123456",
           "has_history": false,
           "last_visit": null
         }
       ]
     }
   }
   ```

### Step 8.2: Access Patient EHR
1. Click "EHR Access" → "Get Patient EHR"
2. Click **Send**
3. **Expected Response:** Complete patient medical records accessible by doctor

---

## ✅ FINAL SUCCESS CHECKLIST

After completing all steps, you should have successfully tested:

**Email Requirement Validation:**
- [ ] Registration fails without email for all user types
- [ ] Registration fails with invalid email format
- [ ] Registration succeeds with valid email and requires verification
- [ ] Login fails before email verification

**Doctor Workflow:**
- [ ] Doctor registration with email verification requirement
- [ ] Doctor login and token generation
- [ ] Profile completion with all required fields
- [ ] Submission for verification
- [ ] Status tracking

**Admin Workflow:**
- [ ] Admin registration with email verification requirement
- [ ] Admin can view pending doctor verifications
- [ ] Admin can view detailed doctor information
- [ ] Admin can approve doctor verifications
- [ ] Verification status updates correctly

**Patient Workflow:**
- [ ] Patient registration with email verification requirement
- [ ] Patient login and token generation
- [ ] Medical history completion with comprehensive data
- [ ] Medical history retrieval and verification

**EHR Integration:**
- [ ] Doctor can search for patients
- [ ] Doctor can access patient medical records
- [ ] Cross-workflow data consistency

**Overall System:**
- [ ] All API endpoints responding correctly
- [ ] Email requirement enforced across all user registrations
- [ ] Email verification workflow functioning
- [ ] Authentication working across all user types
- [ ] Data persistence verified
- [ ] Complete workflow integration confirmed

---

## 🚨 Troubleshooting Common Issues

### Authentication Errors
- **"Token not found"** → Re-run the login request for that user type
- **"Forbidden"** → Make sure you're using the correct token (doctor/admin/patient)
- **"Invalid token"** → Token may have expired, login again

### Registration Errors  
- **"Email already exists"** → Change email addresses in request bodies to unique values
- **"email is required"** → Email field is now mandatory for all registrations
- **"Invalid email format"** → Check email format is valid (user@domain.com)
- **"Validation error"** → Check required fields are filled correctly (phone, age, etc.)

### Server Errors
- **"500 Internal Server Error"** → Backend issue, check server logs or try request again
- **"CORS error"** → Backend needs to allow GitHub Pages origin (`https://hello-50.github.io`)
- **"Connection refused"** → Check if backend server is running

### Data Issues
- **Empty responses** → Make sure previous steps completed successfully
- **Missing patient in search** → Ensure patient was created and has medical history
- **Doctor not found in pending** → Verify doctor submitted for verification

### Debug Tips
1. **Check Console Tab** in Postman for detailed logs
2. **Verify Environment Variables** are set correctly
3. **Run requests in order** - later requests depend on earlier ones
4. **Check Response Status Codes** - 200/201 = success, 400+ = error

---

## Next Steps After Testing

Once all tests pass, you can:
1. **Test the live frontend** at https://hello-50.github.io/Sahatak/
2. **Create additional test scenarios** with different user data
3. **Test error scenarios** (invalid data, unauthorized access, etc.)
4. **Performance testing** with multiple concurrent users
5. **Integration testing** with real document uploads

Your production environment is now fully validated and ready for users! 🎉