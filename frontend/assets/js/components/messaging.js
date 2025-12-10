/**
 * Unified Messaging System for Doctors and Patients
 * Handles real-time communication in comm-hub pages
 */

// Global variables
let currentConversationId = null;
let currentRecipientId = null;
let currentRecipientName = null;
let conversations = [];
let userType = null;
let userId = null;

// Initialize messaging based on user type
async function initializeMessaging() {
    try {
        // Get user info using AuthStorage if available, fallback to legacy
        if (window.AuthStorage && AuthStorage.isAuthenticated()) {
            const authData = AuthStorage.getAuthData();
            userType = authData.type;
            userId = parseInt(authData.id);
        } else {
            // Fallback to legacy localStorage
            userType = localStorage.getItem('sahatak_user_type');
            userId = parseInt(localStorage.getItem('sahatak_user_id'));
        }
        
        // Ensure we have valid auth data
        if (!userType || !userId) {
            console.warn('Messaging: No valid authentication data found, skipping initialization');
            return;
        }
        
        if (userType === 'doctor') {
            await initializeDoctorMessaging();
        } else if (userType === 'patient') {
            await initializePatientMessaging();
        }
        
        // Skip WebSocket initialization - use HTTP polling only
        setupPollingFallback();
        
        if (typeof SahatakLogger !== 'undefined' && SahatakLogger.info) {
            SahatakLogger.info(`${userType} messaging initialized`);
        }
    } catch (error) {
        console.error('Failed to initialize messaging', error);
        showErrorMessage('Failed to load messaging system. Please refresh the page.');
    }
}

// Initialize doctor messaging
async function initializeDoctorMessaging() {
    await loadConversations();
    await loadDoctorPatients(); // Load available patients for new conversations
    
    // If no conversations are loaded, ensure we're in default state
    if (!conversations || conversations.length === 0) {
        resetToDefaultState();
    }
}

// Initialize patient messaging
async function initializePatientMessaging() {
    try {
        // Get doctor ID from URL params or fetch from appointment
        const urlParams = new URLSearchParams(window.location.search);
        const doctorId = urlParams.get('doctor_id');
        const appointmentId = urlParams.get('appointment_id');
        
        if (doctorId) {
            await loadDoctorInfo(doctorId);
            await startOrGetConversation(doctorId, appointmentId);
        } else {
            // Load patient's doctors and conversations
            await loadPatientDoctors();
            await loadRecentConversations();
        }
    } catch (error) {
        console.error('Failed to initialize patient messaging:', error);
        showError('Failed to initialize messaging. Please refresh the page.');
    }
}

// Load patient's doctors from appointments
let availableDoctors = [];

async function loadPatientDoctors() {
    try {
        // Get patient's appointments to find doctors
        const response = await ApiHelper.makeRequest('/appointments/');
        
        if (response.success) {
            const appointments = response.data.appointments;
            
            // Extract unique doctors from appointments
            const doctorsMap = new Map();
            
            appointments.forEach(appointment => {
                if (appointment.doctor_id && appointment.doctor_name) {
                    if (!doctorsMap.has(appointment.doctor_id)) {
                        doctorsMap.set(appointment.doctor_id, {
                            id: appointment.doctor_id,
                            name: appointment.doctor_name,
                            lastAppointment: appointment.appointment_date,
                            appointmentType: appointment.appointment_type,
                            status: appointment.status,
                            specialty: appointment.doctor_specialty || 'Specialist'
                        });
                    }
                }
            });
            
            availableDoctors = Array.from(doctorsMap.values());
            console.log('Available doctors for messaging:', availableDoctors);
            
            // Update UI with doctors
            displayPatientDoctors(availableDoctors);
        }
    } catch (error) {
        console.error('Failed to load patient doctors:', error);
        availableDoctors = [];
    }
}

// Display available doctors for patient
function displayPatientDoctors(doctorsList) {
    if (!doctorsList || doctorsList.length === 0) {
        // Show default "Your Doctor" if no doctors found
        updateDoctorDisplay({ full_name: 'Your Doctor', specialty: 'Specialist' });
        return;
    }
    
    // Show the most recent doctor (first in list) and start conversation
    const primaryDoctor = doctorsList[0];
    updateDoctorDisplay({
        full_name: primaryDoctor.name,
        specialty: primaryDoctor.specialty,
        id: primaryDoctor.id
    });
    
    // Automatically start conversation with primary doctor
    currentRecipientId = primaryDoctor.id;
    currentRecipientName = primaryDoctor.name;
    startOrGetConversation(primaryDoctor.id);
    
    // If there are multiple doctors, show selection interface
    if (doctorsList.length > 1) {
        const doctorSelection = document.getElementById('doctorSelection');
        const doctorSelect = document.getElementById('doctorSelect');
        
        if (doctorSelection && doctorSelect) {
            // Clear existing options (keep the first default option)
            doctorSelect.innerHTML = '<option value="">Choose a doctor to message</option>';
            
            // Add doctors to dropdown
            doctorsList.forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor.id;
                option.textContent = `${doctor.name} - ${doctor.specialty}`;
                if (doctor.id === primaryDoctor.id) {
                    option.selected = true;
                }
                doctorSelect.appendChild(option);
            });
            
            // Show the selection dropdown
            doctorSelection.style.display = 'block';
            
            console.log(`Patient has ${doctorsList.length} doctors available for messaging`);
        }
    } else {
        // Hide selection if only one doctor
        const doctorSelection = document.getElementById('doctorSelection');
        if (doctorSelection) {
            doctorSelection.style.display = 'none';
        }
    }
}

// Select a specific doctor for messaging (for patients)
async function selectDoctor(doctorId) {
    if (!doctorId || !availableDoctors) return;
    
    const selectedDoctor = availableDoctors.find(doctor => doctor.id == doctorId);
    if (selectedDoctor) {
        updateDoctorDisplay({
            full_name: selectedDoctor.name,
            specialty: selectedDoctor.specialty,
            id: selectedDoctor.id
        });
        
        // Set current recipient for messaging
        currentRecipientId = selectedDoctor.id;
        currentRecipientName = selectedDoctor.name;
        
        // Start or get conversation with this doctor
        await startOrGetConversation(selectedDoctor.id);
        
        console.log('Selected doctor for messaging:', selectedDoctor.name);
    }
}

// Load doctor info (for patients)
async function loadDoctorInfo(doctorId) {
    try {
        const response = await fetch(`/api/users/doctors/${doctorId}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            const doctorInfo = data.data;
            updateDoctorDisplay(doctorInfo);
        }
    } catch (error) {
        console.error('Failed to load doctor info:', error);
    }
}

// Update doctor display (for patients)
function updateDoctorDisplay(doctorInfo) {
    if (!doctorInfo) return;
    
    // Update doctor info section
    const doctorNameEl = document.getElementById('doctorName');
    if (doctorNameEl) {
        doctorNameEl.textContent = doctorInfo.full_name || 'Doctor';
    }
    
    // Update chat header
    const chatDoctorNameEl = document.getElementById('chat-doctor-name');
    if (chatDoctorNameEl) {
        chatDoctorNameEl.textContent = doctorInfo.full_name || 'Doctor';
    }
    
    // Update specialty if available
    const specialtyEl = document.getElementById('doctorSpecialty');
    if (specialtyEl && doctorInfo.specialty) {
        specialtyEl.textContent = doctorInfo.specialty;
    }
    
    // Store doctor info for messaging
    if (doctorInfo.id) {
        currentRecipientId = doctorInfo.id;
        currentRecipientName = doctorInfo.full_name;
        
        // Try to start conversation with this doctor
        startOrGetConversation(doctorInfo.id);
    }
}

// Start or get conversation (for patients)
async function startOrGetConversation(doctorId, appointmentId = null) {
    try {
        const body = {
            recipient_id: doctorId
        };
        
        if (appointmentId) {
            body.appointment_id = appointmentId;
        }
        
        console.log('Starting conversation with doctor ID:', doctorId);
        
        const response = await ApiHelper.makeRequest('/messages/conversations', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        if (response.success) {
            currentConversationId = response.data.id;
            currentRecipientId = doctorId;
            console.log('Conversation started/found, ID:', currentConversationId);
            await loadMessages();
        } else {
            console.error('Failed to start conversation:', response.message);
            showErrorMessage('Failed to start conversation: ' + response.message);
        }
    } catch (error) {
        console.error('Failed to start conversation:', error);
        showErrorMessage('Failed to start conversation with doctor.');
    }
}

// Load recent conversations (for patients)
async function loadRecentConversations() {
    try {
        const response = await ApiHelper.makeRequest('/messages/conversations');
        
        if (response.success) {
            if (response.data.conversations && response.data.conversations.length > 0) {
                // Load the first conversation
                const firstConv = response.data.conversations[0];
                currentConversationId = firstConv.id;
                
                // Set recipient based on user type using direct IDs
                if (userType === 'patient') {
                    if (firstConv.doctor_id) {
                        currentRecipientId = firstConv.doctor_id;
                    } else {
                        console.warn('Doctor ID not available in conversation');
                        return; // Exit if no doctor ID
                    }
                } else {
                    if (firstConv.patient_id) {
                        currentRecipientId = firstConv.patient_id;
                    } else {
                        console.warn('Patient ID not available in conversation');
                        return; // Exit if no patient ID
                    }
                }
                
                await loadMessages();
            }
        }
    } catch (error) {
        console.error('Failed to load conversations:', error);
    }
}

// Load all conversations
async function loadConversations() {
    try {
        console.log('🔍 loadConversations called for user type:', userType);
        
        // Add debug logging for the API call
        if (typeof SahatakLogger !== 'undefined' && SahatakLogger.debug) {
            SahatakLogger.debug('Loading conversations for user type:', userType);
        }
        
        const response = await ApiHelper.makeRequest('/messages/conversations');
        console.log('💬 Conversations API response:', response);

        if (!response.success) {
            // Check if it's a profile validation error
            if (response.field === 'user_profile') {
                console.warn('User profile issue:', response.message);
                showErrorMessage(response.message || 'Profile setup required. Please complete your registration.');
                return;
            }
            throw new Error(`API Error: ${response.message}`);
        }

        conversations = response.data.conversations || [];
        
        // Debug log the loaded conversations
        if (typeof SahatakLogger !== 'undefined' && SahatakLogger.debug) {
            SahatakLogger.debug(`Loaded ${conversations.length} conversations`);
        }
        
        if (userType === 'doctor') {
            displayDoctorConversations(conversations);
        } else {
            displayPatientConversations(conversations);
        }
    } catch (error) {
        console.error('Failed to load conversations', error);
        
        // Enhanced error handling for different error types
        if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
            // Specific handling for network errors
            console.error('Network error detected in conversations API');
            showErrorMessage('Network connection issue. Please check your internet connection and try again.');
        } else if (error.statusCode === 401 || error.message?.includes('401')) {
            console.log('🔸 Messaging: Authentication issue detected');
            // Show empty state instead of causing logout
            if (userType === 'doctor') {
                displayDoctorConversations([]);
            } else {
                displayPatientConversations([]);
            }
        } else {
            showErrorMessage('Failed to load conversations. Please refresh the page.');
        }
    }
}

// Display conversations for patients (if multiple doctors)
function displayPatientConversations(conversationList) {
    // For now, patients typically have one conversation with their doctor
    // This can be expanded if patients can message multiple doctors
    if (conversationList.length > 0) {
        const firstConv = conversationList[0];
        if (firstConv.doctor_id) {
            currentConversationId = firstConv.id;
            currentRecipientId = firstConv.doctor_id;
            // Create doctor object with available data
            const doctor = {
                id: firstConv.doctor_id,
                name: firstConv.doctor_name || 'Doctor'
            };
            updateDoctorDisplay(doctor);
            loadMessages();
        } else {
            console.warn('Doctor ID not available in conversation');
            showErrorMessage('Unable to load conversation. Doctor information is missing.');
        }
    }
}

// Load doctor's patients for starting new conversations
let availablePatients = [];

async function loadDoctorPatients() {
    try {
        console.log('🔍 loadDoctorPatients called');
        // Get doctor's appointments to find patients
        const response = await ApiHelper.makeRequest('/appointments/');
        console.log('👥 Doctor appointments response:', response);
        
        if (response.success) {
            console.log('🔍 Full response.data structure:', response.data);
            console.log('🔍 response.data.appointments type:', typeof response.data.appointments);
            console.log('🔍 Array.isArray(response.data.appointments):', Array.isArray(response.data.appointments));
            
            let appointments = [];
            if (Array.isArray(response.data.appointments)) {
                appointments = response.data.appointments;
            } else if (Array.isArray(response.data)) {
                appointments = response.data;
            }
            
            console.log('📋 Final appointments array:', appointments);
            console.log('📋 Appointments length:', appointments.length);
            
            if (!Array.isArray(appointments)) {
                console.error('❌ appointments is not an array:', appointments);
                return;
            }
            
            // Extract unique patients from appointments
            const patientsMap = new Map();
            
            appointments.forEach(appointment => {
                console.log('🔍 Processing appointment:', appointment);
                // Handle different possible structures for patient data
                const patientId = appointment.patient_id;
                const patientName = appointment.patient_name || 
                                  (appointment.patient && appointment.patient.name) ||
                                  (appointment.patient && appointment.patient.user && appointment.patient.user.full_name) ||
                                  'Unknown Patient';
                
                if (patientId) {
                    if (!patientsMap.has(patientId)) {
                        console.log(`👤 Adding patient: ${patientName} (ID: ${patientId})`);
                        patientsMap.set(patientId, {
                            id: patientId,
                            name: patientName,
                            lastAppointment: appointment.appointment_date,
                            appointmentType: appointment.appointment_type,
                            status: appointment.status
                        });
                    }
                }
            });
            
            availablePatients = Array.from(patientsMap.values());
            console.log('👥 Available patients for messaging:', availablePatients);
        }
    } catch (error) {
        console.error('Failed to load doctor patients:', error);
        availablePatients = [];
    }
}

// Enhanced display for doctor conversations with available patients
function displayDoctorConversations(conversationList) {
    console.log('🔍 displayDoctorConversations called with conversations:', conversationList);
    console.log('👥 Available patients:', availablePatients);
    const patientList = document.getElementById('patientList');
    
    // Clear the patient list
    patientList.innerHTML = '';
    
    // Add "Start New Conversation" header if there are available patients
    if (availablePatients.length > 0) {
        const newConversationSection = document.createElement('div');
        newConversationSection.className = 'mb-3';
        newConversationSection.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="text-muted fw-bold">START NEW CONVERSATION</small>
                <button class="btn btn-sm btn-outline-primary" onclick="toggleNewConversationView()">
                    <i class="bi bi-plus-circle me-1"></i>New Message
                </button>
            </div>
            <div id="newConversationView" style="display: none;" class="border rounded p-2 mb-3">
                <div class="mb-2">
                    <small class="text-muted">Select a patient to start messaging:</small>
                </div>
                <div id="availablePatientsList"></div>
            </div>
        `;
        patientList.appendChild(newConversationSection);
        
        // Populate available patients
        displayAvailablePatients();
    }
    
    // Add existing conversations section
    if (conversationList && conversationList.length > 0) {
        const conversationsSection = document.createElement('div');
        conversationsSection.innerHTML = `
            <div class="mb-2">
                <small class="text-muted fw-bold">EXISTING CONVERSATIONS</small>
            </div>
        `;
        patientList.appendChild(conversationsSection);
        
        // Add existing conversations
        conversationList.forEach((conversation, index) => {
            if (!conversation.patient_id) {
                console.warn('Patient ID not available in conversation:', conversation.id);
                return; // Skip this conversation
            }
            // Get patient name from participant_info if available
            const patientName = conversation.participant_info?.patient?.name || 
                               conversation.patient_name || 
                               'Patient';
            const patient = {
                id: conversation.patient_id,
                name: patientName
            };
            const patientItem = document.createElement('div');
            patientItem.className = `patient-item ${index === 0 ? 'active' : ''}`;
            patientItem.setAttribute('data-conversation', conversation.id);
            patientItem.onclick = () => selectConversation(conversation.id, patient.id, patient.name);
            
            const lastMessage = conversation.last_message_content || 'No messages yet';
            const lastMessageTime = conversation.last_message_at ? formatTimestamp(conversation.last_message_at) : '';
            
            patientItem.innerHTML = `
                <div class="d-flex align-items-start">
                    <div class="patient-avatar me-3">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="patient-info flex-grow-1">
                        <h6 class="patient-name">${patient.name}</h6>
                        <p class="last-message text-muted">${lastMessage}</p>
                        <small class="text-muted">${lastMessageTime}</small>
                    </div>
                    ${conversation.unread_count > 0 ? 
                        `<div class="message-badge">${conversation.unread_count > 99 ? '99+' : conversation.unread_count}</div>` : ''
                    }
                </div>
            `;
            
            patientList.appendChild(patientItem);
        });
        
        // Select first conversation if available
        if (conversationList.length > 0) {
            const firstConv = conversationList[0];
            if (firstConv.patient_id) {
                // Get patient name from participant_info if available
                const patientName = firstConv.participant_info?.patient?.name || 
                                   firstConv.patient_name || 
                                   'Patient';
                const patient = {
                    id: firstConv.patient_id,
                    name: patientName
                };
                selectConversation(firstConv.id, patient.id, patient.name);
            } else {
                console.warn('Patient ID not available in first conversation');
            }
        } else {
            // If no conversations, reset to default state
            resetToDefaultState();
        }
    }
    
    // Handle case with no conversations and no available patients
    if (availablePatients.length === 0 && (!conversationList || conversationList.length === 0)) {
        // Completely empty state - no patients and no conversations
        patientList.innerHTML = `
            <div class="text-center text-muted py-5" id="no-conversations">
                <i class="bi bi-people fs-1"></i>
                <p class="mt-2">No patients available</p>
                <small>Patients will appear here when you have appointments with them</small>
            </div>
        `;
    } else if ((!conversationList || conversationList.length === 0) && availablePatients.length > 0) {
        // Has available patients but no existing conversations - ensure default state is set
        resetToDefaultState();
    }
}

// Display available patients for new conversations
function displayAvailablePatients() {
    console.log('🔍 displayAvailablePatients called with:', availablePatients);
    const availablePatientsContainer = document.getElementById('availablePatientsList');
    if (!availablePatientsContainer) {
        console.error('❌ availablePatientsList container not found');
        return;
    }
    console.log('✅ availablePatientsList container found');
    
    availablePatientsContainer.innerHTML = '';
    
    availablePatients.forEach(patient => {
        const patientItem = document.createElement('div');
        patientItem.className = 'patient-item available-patient';
        patientItem.onclick = () => startNewConversation(patient.id, patient.name);
        
        const appointmentDate = new Date(patient.lastAppointment).toLocaleDateString();
        
        patientItem.innerHTML = `
            <div class="d-flex align-items-start">
                <div class="patient-avatar me-3">
                    <i class="bi bi-person-circle text-success"></i>
                </div>
                <div class="patient-info flex-grow-1">
                    <h6 class="patient-name">${patient.name}</h6>
                    <small class="text-muted">Last appointment: ${appointmentDate}</small>
                    <span class="badge bg-success-subtle text-success ms-2">${patient.status}</span>
                </div>
                <div>
                    <i class="bi bi-chat-dots text-primary"></i>
                </div>
            </div>
        `;
        
        availablePatientsContainer.appendChild(patientItem);
    });
}

// Toggle new conversation view
function toggleNewConversationView() {
    const newConversationView = document.getElementById('newConversationView');
    if (newConversationView.style.display === 'none') {
        newConversationView.style.display = 'block';
    } else {
        newConversationView.style.display = 'none';
    }
}

// Reset to default state when no conversation is selected
function resetToDefaultState() {
    // Reset selected patient display
    document.getElementById('selectedPatientName').textContent = 'Select a patient';
    document.getElementById('selectedPatientInfo').textContent = 'Choose a patient to start messaging';
    
    // Disable action buttons
    const viewRecordBtn = document.getElementById('viewRecordBtn');
    const scheduleBtn = document.getElementById('scheduleBtn');
    const messageInputArea = document.getElementById('messageInputArea');
    
    if (viewRecordBtn) viewRecordBtn.disabled = true;
    if (scheduleBtn) scheduleBtn.disabled = true;
    if (messageInputArea) messageInputArea.style.display = 'none';
    
    // Clear chat messages and show default message
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="text-center text-muted py-5" id="no-messages">
                <i class="bi bi-chat-dots fs-1"></i>
                <p class="mt-2">Select a patient to view conversation</p>
            </div>
        `;
    }
    
    // Clear global conversation variables
    currentConversationId = null;
    currentRecipientId = null;
    currentRecipientName = null;
}

// Start a new conversation with a patient
async function startNewConversation(patientId, patientName) {
    try {
        // Check if conversation already exists
        const existingConv = conversations.find(conv => 
            conv.patient_id === patientId
        );
        
        if (existingConv) {
            // Select existing conversation
            selectConversation(existingConv.id, patientId, patientName);
            toggleNewConversationView(); // Hide the new conversation view
            return;
        }
        
        // Create a new conversation
        const response = await ApiHelper.makeRequest('/messages/conversations', {
            method: 'POST',
            body: JSON.stringify({
                recipient_id: patientId,
                recipient_type: 'patient'  // Indicate this is a patient profile ID, not user ID
            })
        });
        
        if (response.success) {
            const newConversation = response.data.conversation;
            currentConversationId = newConversation.id;
            currentRecipientId = patientId;
            currentRecipientName = patientName;
            
            // Update the display
            document.getElementById('selectedPatientName').textContent = patientName;
            document.getElementById('selectedPatientInfo').textContent = 'Ready to start conversation';
            
            // Enable message input and buttons
            const messageInputArea = document.getElementById('messageInputArea');
            const viewRecordBtn = document.getElementById('viewRecordBtn');
            const scheduleBtn = document.getElementById('scheduleBtn');
            
            if (messageInputArea) messageInputArea.style.display = 'block';
            if (viewRecordBtn) viewRecordBtn.disabled = false;
            if (scheduleBtn) scheduleBtn.disabled = false;
            
            // Clear and show empty chat
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="text-center text-muted py-4">
                        <i class="bi bi-chat-dots fs-1"></i>
                        <p class="mt-2">Start your conversation with ${patientName}</p>
                        <small>Send your first message below</small>
                    </div>
                `;
            }
            toggleNewConversationView(); // Hide the new conversation view
            
            // Refresh conversations to include the new one
            await loadConversations();
            
            console.log('New conversation started with:', patientName);
        } else {
            throw new Error(response.message || 'Failed to create conversation');
        }
        
    } catch (error) {
        console.error('Failed to start new conversation:', error);
        showErrorMessage('Failed to start conversation. Please try again.');
    }
}

// Select conversation
async function selectConversation(conversationId, recipientId, recipientName) {
    try {
        currentConversationId = conversationId;
        currentRecipientId = recipientId;
        currentRecipientName = recipientName;
        
        // Update UI based on user type
        if (userType === 'doctor') {
            // Update patient selection UI
            document.querySelectorAll('.patient-item').forEach(item => item.classList.remove('active'));
            const selectedItem = document.querySelector(`[data-conversation="${conversationId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
            }
            
            // Update chat header
            document.getElementById('selectedPatientName').textContent = recipientName;
            document.getElementById('selectedPatientInfo').textContent = `Patient ID: ${recipientId} | Active conversation`;
            
            // Enable action buttons
            const viewRecordBtn = document.getElementById('viewRecordBtn');
            const scheduleBtn = document.getElementById('scheduleBtn');
            const messageInputArea = document.getElementById('messageInputArea');
            
            if (viewRecordBtn) viewRecordBtn.disabled = false;
            if (scheduleBtn) scheduleBtn.disabled = false;
            if (messageInputArea) messageInputArea.style.display = 'block';
        }
        
        // Load messages for this conversation
        await loadMessages();
        
        // Messages are automatically marked as read when loading conversation details
        
        console.log('Selected conversation', { conversationId, recipientId });
    } catch (error) {
        console.error('Failed to select conversation', error);
        showErrorMessage('Failed to load messages');
    }
}

// Load messages for current conversation
async function loadMessages() {
    console.log('🔍 loadMessages called with conversationId:', currentConversationId);
    if (!currentConversationId) {
        console.warn('⚠️ No currentConversationId, cannot load messages');
        return;
    }

    try {
        const response = await ApiHelper.makeRequest(`/messages/conversations/${currentConversationId}`);
        console.log('💬 Messages API response:', response);

        if (!response.success) {
            throw new Error(`API Error: ${response.message}`);
        }

        const messages = response.data.messages || [];
        console.log(`📨 Received ${messages.length} messages:`, messages);
        displayMessages(messages);
    } catch (error) {
        console.error('Failed to load messages', error);
        showErrorMessage('Failed to load messages');
    }
}

// Display messages in chat
function displayMessages(messages) {
    const chatContainer = document.getElementById('chatMessages');
    
    if (!messages || messages.length === 0) {
        chatContainer.innerHTML = `
            <div class="text-center text-muted py-5" id="no-messages">
                <i class="bi bi-chat-dots fs-1"></i>
                <p class="mt-2">No messages yet. Start a conversation.</p>
            </div>
        `;
        return;
    }

    chatContainer.innerHTML = messages.map(msg => {
        const isSender = msg.sender_id === userId;
        const messageClass = isSender ? 
            (userType === 'doctor' ? 'doctor-message' : 'patient-message') : 
            (userType === 'doctor' ? 'patient-message' : 'doctor-message');
        const time = formatTimestamp(msg.created_at);
        
        return `
            <div class="message ${messageClass}">
                <div class="message-content">
                    <p>${msg.content}</p>
                    <small class="message-time">${time}</small>
                </div>
            </div>
        `;
    }).join('');
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    
    if (!content) {
        console.warn('No message content to send');
        return;
    }
    
    if (!currentConversationId) {
        console.error('No conversation ID available for sending message');
        if (currentRecipientId) {
            console.log('Attempting to start conversation first...');
            await startOrGetConversation(currentRecipientId);
            if (!currentConversationId) {
                showErrorMessage('Unable to start conversation. Please try again.');
                return;
            }
        } else {
            showErrorMessage('Please select a doctor to message first.');
            return;
        }
    }

    try {
        const response = await ApiHelper.makeRequest(`/messages/conversations/${currentConversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                content: content,
                message_type: 'text'
            })
        });

        if (!response.success) {
            throw new Error(`API Error: ${response.message}`);
        }
        
        // Clear input
        input.value = '';
        
        // Add message to display immediately
        addMessageToDisplay(response.data);
        
        // Refresh the full message list to ensure consistency
        setTimeout(() => {
            loadMessages();
        }, 500);
        
    } catch (error) {
        console.error('Failed to send message', error);
        showErrorMessage('Failed to send message. Please try again.');
    }
}

// Add new message to display
function addMessageToDisplay(message) {
    const chatContainer = document.getElementById('chatMessages');
    
    // Remove no messages placeholder if exists
    const noMessages = document.getElementById('no-messages');
    if (noMessages) {
        noMessages.remove();
    }
    
    const isSender = message.sender_id === userId;
    const messageClass = isSender ? 
        (userType === 'doctor' ? 'doctor-message' : 'patient-message') : 
        (userType === 'doctor' ? 'patient-message' : 'doctor-message');
    const time = formatTimestamp(message.created_at || new Date());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${messageClass}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            <p>${message.content}</p>
            <small class="message-time">${time}</small>
        </div>
    `;
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Mark conversation as read - NOT NEEDED
// Messages are automatically marked as read when fetching conversation details
// async function markConversationAsRead(conversationId) {
//     try {
//         // Check if endpoint exists for marking as read
//         await ApiHelper.makeRequest(`/messages/conversations/${conversationId}/read`, 'PUT');
//     } catch (error) {
//         console.error('Failed to mark conversation as read', error);
//     }
// }

// WebSocket functionality disabled - using HTTP polling only for better proxy compatibility
/*
function initializeWebSocket() {
    // This function has been disabled to avoid proxy/firewall issues
    // The messaging system now uses HTTP polling exclusively
    console.log('WebSocket disabled - using HTTP polling for messaging');
    setupPollingFallback();
}
*/

// Setup HTTP polling for messaging (primary communication method)
let pollingInterval = null;

function setupPollingFallback() {
    console.log('Setting up HTTP polling for messaging');
    
    // Prevent duplicate polling intervals
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Poll for new messages more frequently since this is the primary method
    pollingInterval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
            // Check for new messages in current conversation
            if (currentConversationId) {
                await loadMessages();
            }
            
            // For doctors, also check for new conversations periodically
            if (userType === 'doctor') {
                // Only refresh conversation list every 30 seconds to avoid excessive API calls
                const now = Date.now();
                if (!lastConversationRefresh || (now - lastConversationRefresh) > 30000) {
                    await loadConversations();
                    lastConversationRefresh = now;
                }
            }
        }
    }, 3000); // Poll every 3 seconds when tab is visible
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // Refresh immediately when page becomes visible
            if (currentConversationId) {
                loadMessages();
            }
        }
    });
}

let lastConversationRefresh = null;

// Handle key press for message input
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Filter conversations (doctors only)
function filterConversations(filter) {
    // Update active filter button
    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    let filteredConversations;
    switch(filter) {
        case 'unread':
            filteredConversations = conversations.filter(conv => conv.unread_count > 0);
            break;
        case 'urgent':
            filteredConversations = conversations.filter(conv => conv.is_urgent);
            break;
        default:
            filteredConversations = conversations;
    }
    
    displayDoctorConversations(filteredConversations);
}

// Search patients (doctors only)
function searchPatients() {
    const searchTerm = document.getElementById('patientSearch').value.toLowerCase();
    const patientItems = document.querySelectorAll('.patient-item');
    
    patientItems.forEach(item => {
        const patientName = item.querySelector('.patient-name').textContent.toLowerCase();
        item.style.display = patientName.includes(searchTerm) ? 'block' : 'none';
    });
}

// Template functions
function insertTemplate() {
    const templates = userType === 'doctor' ? [
        "Thank you for your message. I'll review your concern and get back to you shortly.",
        "Please take the medication as prescribed and let me know if you experience any side effects.",
        "Your test results look good. Continue with your current treatment plan.",
        "I recommend scheduling a follow-up appointment to monitor your progress.",
        "Please come to the clinic if symptoms worsen or you have any urgent concerns."
    ] : [
        "Thank you for the prescription. When should I take it?",
        "I'm feeling better after following your advice.",
        "I have some questions about my treatment.",
        "Can we schedule a follow-up appointment?",
        "I'm experiencing some side effects from the medication."
    ];
    
    const template = templates[Math.floor(Math.random() * templates.length)];
    document.getElementById('messageInput').value = template;
}

function insertCommonMessage() {
    insertTemplate(); // Alias for patients
}

function selectCommonMessage(msg) {
    document.getElementById('messageInput').value = msg;
}

function attachFile() {
    alert('File attachment feature coming soon');
}

function attachImage() {
    attachFile(); // Alias for patients
}

function insertPrescription() {
    if (userType !== 'doctor') return;
    
    const prescriptionTemplate = `📋 PRESCRIPTION

Medication: [Medication Name]
Dosage: [Amount]
Frequency: [Times per day]
Duration: [Treatment period]

Instructions: [Special instructions]

Please take this to your pharmacy.`;
    
    document.getElementById('messageInput').value = prescriptionTemplate;
}

// Action functions
function viewPatientRecord() {
    if (currentRecipientId && userType === 'doctor') {
        window.open(`ehr.html?patient_id=${currentRecipientId}`, '_blank');
    }
}

function scheduleFollowUp() {
    if (currentRecipientId && userType === 'doctor') {
        window.open(`../../appointments/book-appointment.html?patient_id=${currentRecipientId}`, '_blank');
    }
}

function requestAppointment() {
    if (userType === 'patient') {
        window.open(`../../appointments/book-appointment.html?doctor_id=${currentRecipientId}`, '_blank');
    }
}

function requestPrescriptionRefill() {
    const message = "I would like to request a refill for my prescription.";
    document.getElementById('messageInput').value = message;
}

function viewMedicalHistory() {
    if (userType === 'patient') {
        // Navigate to medical history page (same directory as comm-hub.html)
        // Build path relative to current page location
        const currentPath = window.location.pathname;
        const pageDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
        window.location.href = pageDir + '/medicalHistory.html';
    }
}

function startVideoCall() {
    // Check if we have a doctor to call
    if (!currentRecipientId) {
        showErrorMessage('Please select a doctor first before starting a video call.');
        return;
    }
    
    // For patients: navigate to video consultation page with doctor ID
    if (userType === 'patient') {
        // Build URL with doctor ID and optional appointment ID
        const urlParams = new URLSearchParams(window.location.search);
        const appointmentId = urlParams.get('appointment_id');
        
        let videoUrl = `../../appointments/video-consultation.html?doctor_id=${currentRecipientId}`;
        if (appointmentId) {
            videoUrl += `&appointment_id=${appointmentId}`;
        }
        
        // Navigate to video consultation page
        window.location.href = videoUrl;
    } else {
        // For doctors: show alert for now (can be expanded later)
        showErrorMessage('Video call feature for doctors is coming soon.');
    }
}

function requestUrgentConsultation() {
    const message = "URGENT: I need an urgent consultation regarding my condition.";
    document.getElementById('messageInput').value = message;
}

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Today ' + date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    } else if (diffDays === 2) {
        return 'Yesterday ' + date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

function showError(message) {
    showErrorMessage(message);
}

function showErrorMessage(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Profile and settings functions
function showProfile() {
    sessionStorage.setItem('sahatak_show_profile_on_load', 'true');
    window.location.href = userType === 'doctor' ? 
        '../../dashboard/doctor.html' : 
        '../../dashboard/patient.html';
}

function showSettings() {
    sessionStorage.setItem('sahatak_show_settings_on_load', 'true');
    window.location.href = userType === 'doctor' ? 
        '../../dashboard/doctor.html' : 
        '../../dashboard/patient.html';
}

function logout() {
    if (typeof AuthGuard !== 'undefined') {
        AuthGuard.logout();
    } else {
        // Fallback - only clear sahatak-related data
        console.warn('AuthGuard not available, using fallback logout');
        const keysToRemove = [
            'sahatak_user', 'sahatak_user_data', 'sahatak_user_id',
            'sahatak_user_type', 'sahatak_user_email', 'sahatak_user_name',
            'sahatak_doctor_data', 'sahatak_preferences', 'sahatak_return_url'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
        window.location.href = '/';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof AuthGuard !== 'undefined') {
        const requiredUserType = document.body.getAttribute('data-protect');
        if (requiredUserType) {
            AuthGuard.protectPage(requiredUserType);
        }
    }
    
    // Initialize messaging system with delay to ensure auth is ready
    setTimeout(async () => {
        await initializeMessaging();
    }, 1000); // 1 second delay to ensure authentication is fully established
});