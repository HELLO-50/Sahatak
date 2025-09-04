/**
 * Unified Messaging System for Doctors and Patients
 * Handles real-time communication in comm-hub pages
 */

// Global variables
let currentConversationId = null;
let currentRecipientId = null;
let currentRecipientName = null;
let conversations = [];
let socket = null;
let userType = null;
let userId = null;

// Initialize messaging based on user type
async function initializeMessaging() {
    try {
        // Get user info
        userType = localStorage.getItem('sahatak_user_type');
        userId = parseInt(localStorage.getItem('sahatak_user_id'));
        
        if (userType === 'doctor') {
            await initializeDoctorMessaging();
        } else if (userType === 'patient') {
            await initializePatientMessaging();
        }
        
        initializeWebSocket();
        
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
            // If no doctor specified, load recent conversations
            await loadRecentConversations();
        }
    } catch (error) {
        console.error('Failed to initialize patient messaging:', error);
        showError('Failed to initialize messaging. Please refresh the page.');
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
    
    const doctorNameEl = document.getElementById('doctorName');
    if (doctorNameEl) {
        doctorNameEl.textContent = doctorInfo.full_name || 'Doctor';
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
        
        const response = await ApiHelper.makeRequest('/messages/conversations', 'POST', body);
        
        if (response.success) {
            currentConversationId = response.data.id;
            currentRecipientId = doctorId;
            await loadMessages();
        }
    } catch (error) {
        console.error('Failed to start conversation:', error);
        showError('Failed to start conversation with doctor.');
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
                
                // Set recipient based on user type
                if (userType === 'patient') {
                    currentRecipientId = firstConv.participants.doctor.id;
                } else {
                    currentRecipientId = firstConv.participants.patient.id;
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
        const response = await ApiHelper.makeRequest('/messages/conversations');

        if (!response.success) {
            throw new Error(`API Error: ${response.message}`);
        }

        conversations = response.data.conversations || [];
        
        if (userType === 'doctor') {
            displayDoctorConversations(conversations);
        } else {
            displayPatientConversations(conversations);
        }
    } catch (error) {
        console.error('Failed to load conversations', error);
        // Prevent messaging errors from triggering session expiry
        if (error.statusCode !== 401 && !error.message?.includes('401')) {
            showErrorMessage('Failed to load conversations. Please refresh the page.');
        } else {
            console.log('🔸 Messaging: Ignoring 401 error to prevent logout loop');
            // Show empty state instead of causing logout
            if (userType === 'doctor') {
                displayDoctorConversations([]);
            } else {
                displayPatientConversations([]);
            }
        }
    }
}

// Display conversations for doctors
function displayDoctorConversations(conversationList) {
    const patientList = document.getElementById('patientList');
    
    if (!conversationList || conversationList.length === 0) {
        patientList.innerHTML = `
            <div class="text-center text-muted py-5" id="no-conversations">
                <i class="bi bi-people fs-1"></i>
                <p class="mt-2">No conversations yet</p>
                <small>Patients will appear here when they message you</small>
            </div>
        `;
        return;
    }

    patientList.innerHTML = '';
    
    conversationList.forEach((conversation, index) => {
        const patient = conversation.participants.patient;
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
        const patient = firstConv.participants.patient;
        selectConversation(firstConv.id, patient.id, patient.name);
    }
}

// Display conversations for patients (if multiple doctors)
function displayPatientConversations(conversationList) {
    // For now, patients typically have one conversation with their doctor
    // This can be expanded if patients can message multiple doctors
    if (conversationList.length > 0) {
        const firstConv = conversationList[0];
        const doctor = firstConv.participants.doctor;
        currentConversationId = firstConv.id;
        currentRecipientId = doctor.id;
        updateDoctorDisplay(doctor);
        loadMessages();
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
        
        // Mark conversation as read
        await markConversationAsRead(conversationId);
        
        if (typeof Logger !== 'undefined') {
            Logger.info('Selected conversation', { conversationId, recipientId });
        }
    } catch (error) {
        console.error('Failed to select conversation', error);
        showErrorMessage('Failed to load messages');
    }
}

// Load messages for current conversation
async function loadMessages() {
    if (!currentConversationId) return;

    try {
        const response = await ApiHelper.makeRequest(`/messages/conversations/${currentConversationId}`);

        if (!response.success) {
            throw new Error(`API Error: ${response.message}`);
        }

        displayMessages(response.data.messages || []);
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
    
    if (!content || !currentConversationId) return;

    try {
        const response = await ApiHelper.makeRequest(`/messages/conversations/${currentConversationId}/messages`, 'POST', {
            content: content,
            message_type: 'text'
        });

        if (!response.success) {
            throw new Error(`API Error: ${response.message}`);
        }
        
        // Clear input
        input.value = '';
        
        // Add message to display
        addMessageToDisplay(response.data);
        
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

// Mark conversation as read
async function markConversationAsRead(conversationId) {
    try {
        // Check if endpoint exists for marking as read
        await ApiHelper.makeRequest(`/messages/conversations/${conversationId}/read`, 'PUT');
    } catch (error) {
        console.error('Failed to mark conversation as read', error);
    }
}

// Initialize WebSocket
function initializeWebSocket() {
    if (typeof io === 'undefined') {
        console.warn('Socket.IO not available, using polling fallback');
        // Fallback to polling
        setInterval(() => {
            if (currentConversationId) {
                loadMessages();
            }
        }, 5000);
        return;
    }
    
    socket = io('https://sahatak.pythonanywhere.com', {
        autoConnect: true,
        reconnection: true
    });
    
    socket.on('connect', () => {
        console.log('WebSocket connected');
        if (currentConversationId) {
            socket.emit('join_conversation', { conversation_id: currentConversationId });
        }
    });
    
    socket.on('new_message', (data) => {
        if (data.conversation_id === currentConversationId) {
            addMessageToDisplay(data.message);
        }
        // Update conversation list for doctors
        if (userType === 'doctor') {
            loadConversations();
        }
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
    });
}

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
        window.open(`../ehr.html?patient_id=${currentRecipientId}`, '_blank');
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
        window.open(`../medical-history.html`, '_blank');
    }
}

function startVideoCall() {
    alert('Video call feature coming soon');
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
    
    // Initialize messaging system
    await initializeMessaging();
});