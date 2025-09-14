# AI System Implementation in Sahatak Telemedicine Platform

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [OpenAI Integration](#openai-integration)
4. [AI Models Used](#ai-models-used)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Medical Triage System](#medical-triage-system)
8. [Speech-to-Text Integration](#speech-to-text-integration)
9. [Database Structure](#database-structure)
10. [Security & Privacy](#security--privacy)
11. [Error Handling](#error-handling)
12. [Configuration & Environment](#configuration--environment)
13. [API Endpoints](#api-endpoints)
14. [Real-World Examples](#real-world-examples)
15. [Best Practices](#best-practices)

## Overview

The Sahatak AI system provides intelligent medical triage and assessment capabilities using OpenAI's GPT models. It features bilingual support (English and Sudanese Arabic), voice input capabilities, and sophisticated medical triage decision-making.

### Key Features
- **Medical Triage Chatbot**: AI-powered symptom assessment with triage recommendations
- **Bilingual Support**: Automatic language detection for Arabic and English
- **Voice Input**: Speech-to-text using OpenAI Whisper
- **Sudanese Dialect**: Specialized support for Sudanese Arabic dialect
- **Triage Classification**: Emergency, in-person, or telemedicine recommendations
- **Conversation History**: Maintains context across multiple exchanges
- **Real-time Assessment**: Instant medical guidance and recommendations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Browser)                       │
│  ┌─────────────────┐              ┌─────────────────┐     │
│  │  AI Assessment  │              │  Voice Input     │     │
│  │     Widget      │              │   Component      │     │
│  └─────────────────┘              └─────────────────┘     │
│           │                                │               │
│           └───────────────┬───────────────┘               │
└───────────────────────────┼───────────────────────────────┘
                           │
                    API Requests
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Flask + OpenAI)                   │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  AI Assessment  │  │  Speech-to-Text │                 │
│  │    Endpoint     │  │    Endpoint     │                 │
│  └─────────────────┘  └─────────────────┘                 │
│           │                     │                          │
│           └──────────┬─────────┘                          │
│                      │                                     │
│              ┌───────▼────────┐                           │
│              │  OpenAI Client │                           │
│              └───────┬────────┘                           │
└──────────────────────┼──────────────────────────────────────┘
                      │
                OpenAI API
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenAI Services                        │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  GPT-3.5 Turbo  │  │    Whisper      │                 │
│  │  (Chat Model)   │  │   (STT Model)   │                 │
│  └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

## OpenAI Integration

### Client Initialization

```python
# File: backend/routes/ai_assessment.py (lines 14-132)

from openai import OpenAI

# Initialize OpenAI client (will be loaded when needed)
openai_client = None

def initialize_openai_client():
    """Initialize OpenAI client with API key from environment"""
    global openai_client
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            app_logger.warning("OPENAI_API_KEY environment variable not set")
            return False

        # Log API key info (masked for security)
        app_logger.info(f"OPENAI_API_KEY found: {api_key[:10]}...{api_key[-4:] if len(api_key) > 14 else '****'}")

        openai_client = OpenAI(api_key=api_key)
        app_logger.info("OpenAI client initialized successfully")
        return True
    except Exception as e:
        app_logger.error(f"Failed to initialize OpenAI client: {type(e).__name__}: {e}")
        return False
```

### API Key Management
- API key stored in environment variables
- Never hardcoded in source code
- Masked in logs for security
- Validated on initialization

## AI Models Used

### 1. GPT-3.5 Turbo (Chat Model)
- **Purpose**: Medical triage conversations
- **Configuration**:
  ```python
  # File: backend/routes/ai_assessment.py (lines 244-246)
  chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
  max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
  temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
  ```
- **Features**:
  - Context-aware conversations
  - Bilingual responses
  - Medical knowledge base
  - Triage decision-making

### 2. Whisper (Speech-to-Text)
- **Purpose**: Convert voice input to text
- **Model**: `whisper-1`
- **Configuration**:
  ```python
  # File: backend/routes/ai_assessment.py (line 371)
  whisper_model = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")
  ```
- **Features**:
  - Automatic language detection
  - High accuracy for medical terms
  - Support for multiple audio formats
  - Sudanese dialect recognition

## Backend Implementation

### AI Assessment Endpoint

```python
# File: backend/routes/ai_assessment.py (lines 184-327)

@ai_bp.route('/assessment', methods=['POST', 'OPTIONS'])
@cross_origin()
@handle_api_errors
def ai_assessment():
    """
    AI Symptom Assessment - Medical triage chatbot using OpenAI
    """
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    try:
        # Initialize OpenAI client if not already done
        if not openai_client and not initialize_openai_client():
            # Fallback response if OpenAI is not available
            return APIResponse.success(
                data={
                    'response': "AI service is temporarily unavailable...",
                    'triage_result': None,
                    'language': 'en',
                    'model': 'fallback',
                    'timestamp': datetime.utcnow().isoformat()
                },
                message="Fallback response - OpenAI unavailable"
            )

        # Get and validate request data
        data = request.get_json()
        user_message = data.get('message', '').strip()
        conversation_history = data.get('conversation_history', [])
        patient_name = data.get('patient_name', '')

        # Build messages with conversation history to maintain context
        system_prompt = MEDICAL_TRIAGE_SYSTEM_PROMPT
        if patient_name:
            system_prompt += f"\n\nIMPORTANT: The patient's name is {patient_name}..."

        messages = [{"role": "system", "content": system_prompt}]

        # Add conversation history for context
        for exchange in conversation_history:
            if exchange.get('user_message'):
                messages.append({"role": "user", "content": exchange['user_message']})
            if exchange.get('bot_response'):
                messages.append({"role": "assistant", "content": exchange['bot_response']})

        # Add current user message
        messages.append({"role": "user", "content": user_message})

        # Make OpenAI API call
        response = openai_client.chat.completions.create(
            model=chat_model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )

        bot_response = response.choices[0].message.content.strip()

        # Extract triage decision
        triage_result = extract_triage_decision(bot_response)

        return APIResponse.success(
            data={
                'response': bot_response,
                'triage_result': triage_result,
                'language': detect_language(user_message),
                'model': 'gpt-3.5-turbo',
                'conversation_id': data.get('conversation_id'),
                'timestamp': datetime.utcnow().isoformat()
            }
        )

    except openai.OpenAIError as e:
        app_logger.error(f"OpenAI API error: {type(e).__name__}: {e}")
        # Return fallback response
        return fallback_response()
```

### Speech-to-Text Endpoint

```python
# File: backend/routes/ai_assessment.py (lines 329-414)

@ai_bp.route('/stt', methods=['POST', 'OPTIONS'])
@cross_origin()
@handle_api_errors
def speech_to_text():
    """
    Speech-to-Text endpoint using OpenAI Whisper API
    """
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})

    try:
        # Initialize OpenAI client if not already done
        if not openai_client and not initialize_openai_client():
            return APIResponse.error(
                message="Speech-to-text service temporarily unavailable",
                error_code=ErrorCodes.SERVICE_UNAVAILABLE
            )

        # Check if audio file was uploaded
        if 'audio' not in request.files:
            return APIResponse.error(
                message="Audio file is required",
                error_code=ErrorCodes.VALIDATION_ERROR
            )

        audio_file = request.files['audio']

        # Create temporary file for audio processing
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            audio_file.save(temp_audio.name)

            try:
                # Use OpenAI Whisper for transcription
                with open(temp_audio.name, "rb") as audio:
                    transcription = openai_client.audio.transcriptions.create(
                        model=whisper_model,
                        file=audio,
                        language=None  # Auto-detect language
                    )

                transcribed_text = transcription.text.strip()
                detected_language = detect_language(transcribed_text)

                return APIResponse.success(
                    data={
                        'transcription': transcribed_text,
                        'detected_language': detected_language,
                        'model': 'whisper-1',
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )

            finally:
                # Clean up temporary file
                os.unlink(temp_audio.name)

    except openai.OpenAIError as e:
        app_logger.error(f"OpenAI Whisper API error: {e}")
        return APIResponse.error(
            message="Failed to transcribe audio",
            error_code=ErrorCodes.EXTERNAL_SERVICE_ERROR
        )
```

### Language Detection

```python
# File: backend/routes/ai_assessment.py (lines 133-148)

def detect_language(text):
    """Simple language detection for Arabic vs English"""
    arabic_chars = 0
    total_chars = 0

    for char in text:
        if char.isalpha():
            total_chars += 1
            if '\u0600' <= char <= '\u06FF' or '\u0750' <= char <= '\u077F':
                arabic_chars += 1

    if total_chars == 0:
        return 'en'

    arabic_ratio = arabic_chars / total_chars
    return 'ar' if arabic_ratio > 0.3 else 'en'
```

### Triage Decision Extraction

```python
# File: backend/routes/ai_assessment.py (lines 150-182)

def extract_triage_decision(ai_response):
    """Extract triage decision from AI response"""
    response_lower = ai_response.lower()

    # Emergency indicators (Sudanese dialect)
    emergency_keywords = ['امشي الطوارئ', 'طوارئ الحين', 'إسعاف', 'حالة طارئة خطيرة',
                         'emergency room', 'er immediately', 'call ambulance']

    # In-person visit indicators
    in_person_keywords = ['محتاج تشوف دكتور في العيادة', 'محتاج فحص شخصي',
                         'physical examination', 'see doctor in clinic']

    # Sahatak Platform indicators
    remote_keywords = ['منصة صحتك', 'ممكن تحجز معاد', 'استشارة عن بُعد',
                      'sahatak platform', 'telemedicine', 'book appointment']

    # Check for triage keywords
    emergency_count = sum(1 for keyword in emergency_keywords if keyword in response_lower)
    in_person_count = sum(1 for keyword in in_person_keywords if keyword in response_lower)
    remote_count = sum(1 for keyword in remote_keywords if keyword in response_lower)

    # Return triage decision
    if emergency_count > 0:
        return 'emergency'
    elif in_person_count > 0:
        return 'in_person'
    elif remote_count > 0:
        return 'telemedicine'
    else:
        return None  # No clear recommendation yet
```

## Frontend Implementation

### AI Assessment Component

```javascript
// File: frontend/assets/js/components/ai-assessment.js (lines 1-160)

class MedicalTriageChat {
    constructor(options = {}) {
        // Widget mode configuration
        this.isWidgetMode = options.widgetMode || false;
        this.onTriageComplete = options.onTriageComplete || null;
        this.modalElement = options.modalElement || null;

        // Store conversation data
        this.conversationHistory = [];
        this.triageResult = null;
        this.conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // Check if required DOM elements exist
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.micBtn = document.getElementById('micBtn');
        this.loadingIndicator = document.getElementById('loadingIndicator');

        // Use ApiHelper for consistent API calls
        this.apiBaseUrl = ApiHelper?.baseUrl || 'https://sahatak.pythonanywhere.com/api';

        // Initialize request timeout
        this.requestTimeout = 30000; // 30 seconds

        this.initializeEventListeners();

        // Add initial welcome message in widget mode
        if (this.isWidgetMode) {
            this.addWelcomeMessage();
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();

        if (!message) {
            this.showNotification('Please enter a message.', 'warning');
            return;
        }

        this.addUserMessage(message);
        this.messageInput.value = '';
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiBaseUrl}/ai/assessment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    language: 'auto',
                    conversation_history: this.conversationHistory,
                    conversation_id: this.conversationId,
                    patient_name: this.getPatientName()
                })
            });

            const result = await response.json();

            if (result.success && result.data) {
                this.addBotMessage(result.data.response, result.data.triage_result);

                // Store conversation history
                this.conversationHistory.push({
                    user_message: message,
                    bot_response: result.data.response,
                    triage_result: result.data.triage_result,
                    timestamp: new Date().toISOString()
                });

                // Handle triage result in widget mode
                if (this.isWidgetMode && result.data.triage_result) {
                    this.triageResult = result.data.triage_result;
                    this.handleTriageResult(result.data.triage_result);
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            this.addBotMessage('Sorry, an error occurred. Please try again.');
        } finally {
            this.showLoading(false);
            this.sendBtn.disabled = false;
            this.messageInput.disabled = false;
        }
    }
}
```

### Voice Recording Implementation

```javascript
// File: frontend/assets/js/components/ai-assessment.js (lines 285-400)

async toggleRecording() {
    if (!this.isRecording) {
        await this.startRecording();
    } else {
        this.stopRecording();
    }
}

async startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 44100,
                channelCount: 1,
                volume: 1.0
            }
        });

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm'
        });

        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            await this.sendAudioToAPI(audioBlob);
        };

        this.mediaRecorder.start();
        this.isRecording = true;

        // Update UI
        this.micBtn.classList.add('recording');
        this.micBtn.innerHTML = '<i class="bi bi-stop-circle"></i>';

    } catch (error) {
        console.error('Error starting recording:', error);
        this.showNotification('Could not access microphone', 'error');
    }
}

async sendAudioToAPI(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    this.showLoading(true);

    try {
        const response = await fetch(`${this.apiBaseUrl}/ai/stt`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success && result.data) {
            // Use transcribed text as input
            this.messageInput.value = result.data.transcription;
            this.sendMessage();
        }

    } catch (error) {
        console.error('Error sending audio:', error);
        this.showNotification('Failed to process audio', 'error');
    } finally {
        this.showLoading(false);
    }
}
```

## Medical Triage System

### System Prompt Design

```python
# File: backend/routes/ai_assessment.py (lines 18-112)

MEDICAL_TRIAGE_SYSTEM_PROMPT = """You are a warm, caring friend who happens to know about health issues.
You are bilingual in English and Sudanese Arabic dialect.

CRITICAL: You MUST reply in the SAME LANGUAGE as the user's message:
- If user writes in English → respond in English
- If user writes in Arabic → respond in Sudanese Arabic dialect (Sudani)

For Arabic speakers, use ONLY Sudanese dialect (Sudani).

SUDANESE DIALECT VOCABULARY TO USE:
- شنو = what (not ماذا)
- وين = where (not أين)
- دا/دي = this (not هذا/هذه)
- الحين = now (not الآن)
- بكرة = tomorrow (not غداً)
- وجع = pain (not ألم)
- دكتور = doctor (not طبيب)

CONVERSATION FLOW RULES:
1. This is ONE CONTINUOUS conversation with the SAME PERSON
2. NEVER restart or act like you're meeting someone new
3. Ask MAXIMUM 2-3 follow-up questions, then give your recommendation
4. After 2-3 exchanges, you MUST recommend one of the 3 options

When giving recommendations:

For EMERGENCY cases:
ARABIC: "دا شيء خطير، لازم تامشي الطوارئ الحين. ما تستنى، روح فوري!"
ENGLISH: "This is serious, you need to go to the emergency room right now!"

For IN-PERSON visits:
ARABIC: "أشوف إنك محتاج دكتور يفحصك شخصياً..."
ENGLISH: "I think you need a doctor to examine you in person..."

For TELEMEDICINE:
ARABIC: "ممكن نساعدك في منصة صحتك. اضغط على 'حجز موعد' تحت..."
ENGLISH: "We can help you on the Sahatak platform. Click 'Book Appointment' below..."
"""
```

## Database Structure

### AIAssessment Model

```python
# File: backend/models.py (lines 1850-1920)

class AIAssessment(db.Model):
    """
    AI-powered symptom assessment and triage system
    Supports text, audio, and Sudanese Arabic dialect input
    """
    __tablename__ = 'ai_assessments'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=True)

    # Input data
    assessment_type = db.Column(db.Enum('text', 'audio', 'mixed'), default='text')
    input_language = db.Column(db.Enum('ar', 'en', 'ar_sd'), default='ar')  # ar_sd = Sudanese Arabic

    # Text input
    symptoms_input = db.Column(db.Text, nullable=True)
    original_text = db.Column(db.Text, nullable=True)
    translated_text = db.Column(db.Text, nullable=True)
    processed_symptoms = db.Column(db.JSON, nullable=True)

    # Audio input
    audio_file_path = db.Column(db.String(500), nullable=True)
    audio_file_name = db.Column(db.String(255), nullable=True)
    audio_duration = db.Column(db.Integer, nullable=True)
    audio_format = db.Column(db.String(10), nullable=True)
    audio_size = db.Column(db.Integer, nullable=True)

    # Secure audio file handling
    audio_encrypted = db.Column(db.Boolean, default=False)
    audio_checksum = db.Column(db.String(64), nullable=True)  # SHA-256

    # AI response and results
    ai_response = db.Column(db.Text, nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    recommended_action = db.Column(db.String(50), nullable=True)
    risk_level = db.Column(db.String(20), nullable=True)

    # Medical professional review
    doctor_review_status = db.Column(db.String(20), default='pending')
    doctor_review_notes = db.Column(db.Text, nullable=True)
    reviewed_by_doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    # AI model tracking
    ai_model_version = db.Column(db.String(50), default='gpt-3.5-turbo')
```

### Conversation Storage

```python
# File: backend/routes/ai_assessment.py (lines 416-530)

@ai_bp.route('/conversation', methods=['POST', 'OPTIONS'])
@cross_origin()
@handle_api_errors
def save_conversation():
    """
    Save AI triage conversation to AIAssessment database
    """
    try:
        from models import AIAssessment, Patient, db
        from flask_jwt_extended import get_jwt_identity

        # Get request data
        data = request.get_json()
        conversation_id = data.get('conversation_id')
        conversation_history = data.get('conversation_history', [])
        final_triage_result = data.get('final_triage_result')

        # Get current user and patient profile
        current_user_id = get_jwt_identity()
        patient = Patient.query.filter_by(user_id=current_user_id).first()

        # Build symptoms and response text from conversation
        symptoms_text = ""
        ai_response_text = ""

        for exchange in conversation_history:
            if exchange.get('user_message'):
                symptoms_text += exchange['user_message'] + " "
            if exchange.get('bot_response'):
                ai_response_text += exchange['bot_response'] + " "

        # Map triage result to recommended action
        recommended_action_map = {
            'emergency': 'emergency',
            'in_person': 'doctor_consultation',
            'telemedicine': 'doctor_consultation'
        }

        # Create AIAssessment record
        ai_assessment = AIAssessment(
            patient_id=patient.id,
            assessment_type='text',
            input_language='ar',
            symptoms_input=symptoms_text.strip(),
            original_text=symptoms_text.strip(),
            ai_response=ai_response_text.strip(),
            recommended_action=recommended_action_map.get(final_triage_result),
            risk_level=risk_level_map.get(final_triage_result),
            processed_symptoms={
                'conversation_id': conversation_id,
                'conversation_history': conversation_history,
                'triage_widget_session': True
            },
            ai_model_version='gpt-3.5-turbo',
            doctor_review_status='pending',
            completed_at=datetime.utcnow()
        )

        db.session.add(ai_assessment)
        db.session.commit()

        return APIResponse.success(
            data={'assessment_id': ai_assessment.id}
        )

    except Exception as e:
        app_logger.error(f"Conversation save error: {str(e)}")
        return APIResponse.error(message="Failed to save conversation")
```

## Security & Privacy

### API Key Security

```python
# File: backend/config.py (lines 45-48)
class Config:
    # OpenAI Configuration
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_CHAT_MODEL = os.environ.get('OPENAI_CHAT_MODEL', 'gpt-3.5-turbo')
    OPENAI_MAX_TOKENS = int(os.environ.get('OPENAI_MAX_TOKENS', '500'))
```

### Input Validation

```python
# File: backend/routes/ai_assessment.py (lines 225-232)

# Validate message length and content
message_validation = validate_text_field_length(user_message, 'Message', 1000, 1)
if not message_validation['valid']:
    return APIResponse.error(
        message=message_validation['message'],
        error_code=ErrorCodes.VALIDATION_ERROR
    )
```

### Audio File Security

```python
# File: backend/routes/ai_assessment.py (lines 354-360)

# Check if audio file was uploaded
if 'audio' not in request.files:
    return APIResponse.error(
        message="Audio file is required",
        error_code=ErrorCodes.VALIDATION_ERROR
    )

# File size and type validation should be added here
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'webm', 'ogg'}
```

## Error Handling

### Fallback Mechanisms

```python
# File: backend/routes/ai_assessment.py (lines 300-320)

except openai.OpenAIError as e:
    app_logger.error(f"OpenAI API error: {type(e).__name__}: {e}")

    # Fallback response
    if language == 'ar':
        fallback_response = "عذراً، أواجه صعوبات تقنية مؤقتة..."
    else:
        fallback_response = "Sorry, I'm experiencing technical difficulties..."

    return APIResponse.success(
        data={
            'response': fallback_response,
            'triage_result': None,
            'language': language,
            'model': 'fallback',
            'error': 'openai_api_error',
            'timestamp': datetime.utcnow().isoformat()
        },
        message="Fallback response due to API unavailability"
    )
```

### Frontend Error Handling

```javascript
// File: frontend/assets/js/components/ai-assessment.js (lines 147-160)

} catch (error) {
    console.error('Error sending message:', error);
    this.addBotMessage(
        `Sorry, I encountered an error: ${error.message}\n\n` +
        `عذراً، واجهت خطأ: ${error.message}`
    );
} finally {
    clearTimeout(timeoutId);
    this.showLoading(false);
    this.sendBtn.disabled = false;
    this.messageInput.disabled = false;
    this.messageInput.focus();
}
```

## Configuration & Environment

### Environment Variables

```bash
# File: .env (example configuration)
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
OPENAI_WHISPER_MODEL=whisper-1
```

### Settings Manager

```python
# File: backend/utils/settings_manager.py (lines 125-140)

class SettingsManager:
    @staticmethod
    def get_openai_settings():
        """Get OpenAI configuration settings"""
        return {
            'api_key': os.getenv('OPENAI_API_KEY'),
            'chat_model': os.getenv('OPENAI_CHAT_MODEL', 'gpt-3.5-turbo'),
            'max_tokens': int(os.getenv('OPENAI_MAX_TOKENS', '500')),
            'temperature': float(os.getenv('OPENAI_TEMPERATURE', '0.7')),
            'whisper_model': os.getenv('OPENAI_WHISPER_MODEL', 'whisper-1')
        }
```

## API Endpoints

### 1. Assessment Endpoint
```
POST /api/ai/assessment
Content-Type: application/json

Request:
{
    "message": "I have a headache and fever",
    "language": "auto",
    "conversation_history": [],
    "conversation_id": "conv_123",
    "patient_name": "John Doe"
}

Response:
{
    "success": true,
    "data": {
        "response": "I understand you have a headache and fever...",
        "triage_result": "telemedicine",
        "language": "en",
        "model": "gpt-3.5-turbo",
        "conversation_id": "conv_123",
        "timestamp": "2024-01-20T10:30:00Z"
    }
}
```

### 2. Speech-to-Text Endpoint
```
POST /api/ai/stt
Content-Type: multipart/form-data

Request:
- audio: [audio file]

Response:
{
    "success": true,
    "data": {
        "transcription": "I have been feeling dizzy",
        "detected_language": "en",
        "model": "whisper-1",
        "timestamp": "2024-01-20T10:30:00Z"
    }
}
```

### 3. Health Check Endpoint

```python
# File: backend/routes/ai_assessment.py (lines 532-571)

@ai_bp.route('/health', methods=['GET'])
def chatbot_health():
    """Health check endpoint for AI assessment service"""
    openai_available = openai_client is not None or initialize_openai_client()

    return APIResponse.success(
        data={
            'service': 'ai-assessment',
            'status': 'healthy',
            'openai': {
                'available': openai_available,
                'api_key_configured': bool(os.getenv("OPENAI_API_KEY")),
                'models': {
                    'chat': os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo"),
                    'speech_to_text': os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")
                },
                'configuration': {
                    'max_tokens': os.getenv("OPENAI_MAX_TOKENS", "500"),
                    'temperature': os.getenv("OPENAI_TEMPERATURE", "0.7")
                }
            },
            'supported_languages': ['Arabic', 'English'],
            'triage_categories': ['emergency', 'in_person', 'telemedicine'],
            'endpoints': {
                'assessment': '/api/ai/assessment',
                'speech_to_text': '/api/ai/stt',
                'health': '/api/ai/health'
            }
        }
    )
```

### Integration in Patient Dashboard

```html
<!-- File: frontend/pages/dashboard/patient.html (lines 450-520) -->

<div class="ai-triage-widget">
    <div id="chatMessages" class="chat-messages"></div>
    <div class="chat-input-container">
        <input type="text" id="messageInput" placeholder="Type your symptoms...">
        <button id="sendBtn"><i class="bi bi-send"></i></button>
        <button id="micBtn"><i class="bi bi-mic"></i></button>
    </div>
    <div id="loadingIndicator" class="loading-indicator">
        <div class="spinner"></div>
    </div>
</div>

<script>
// Initialize AI Triage Chat
const triageChat = new MedicalTriageChat({
    widgetMode: true,
    onTriageComplete: function(result) {
        if (result === 'telemedicine') {
            // Show booking button
            document.getElementById('bookingButton').style.display = 'block';
        }
    }
});
</script>
```

## Best Practices

### 1. Conversation Management

```javascript
// File: frontend/assets/js/components/ai-assessment.js (lines 130-145)

// Limit conversation history to prevent token overflow
const MAX_HISTORY_LENGTH = 10;
if (this.conversationHistory.length > MAX_HISTORY_LENGTH) {
    this.conversationHistory = this.conversationHistory.slice(-MAX_HISTORY_LENGTH);
}

// Store conversation for context
this.conversationHistory.push({
    user_message: message,
    bot_response: result.data.response,
    triage_result: result.data.triage_result,
    timestamp: new Date().toISOString()
});
```

### 2. Rate Limiting

```python
# File: backend/app.py (add rate limiting)

from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: get_jwt_identity() or get_remote_address(),
    default_limits=["100 per hour"]
)

# Apply to AI endpoints
@limiter.limit("10 per minute")
@ai_bp.route('/assessment', methods=['POST'])
```

### 3. Monitoring & Logging

```python
# File: backend/routes/ai_assessment.py (lines 238-241, 277-278, 293-294)

app_logger.info(f"AI Assessment request - Language: {language}, Message length: {len(user_message)}")
app_logger.info(f"OpenAI client status: {openai_client is not None}")
app_logger.info(f"Making OpenAI call - Model: {chat_model}, Max tokens: {max_tokens}")
app_logger.info(f"OpenAI response received - Length: {len(bot_response)}")
app_logger.info(f"Triage decision: {triage_result}")
app_logger.info(f"AI Assessment successful - Triage: {triage_result}")
```

## Summary

The Sahatak AI system leverages OpenAI's advanced language models to provide:

1. **Intelligent Medical Triage**: Context-aware symptom assessment using GPT-3.5 Turbo
2. **Multilingual Support**: Seamless Arabic/English communication with Sudanese dialect
3. **Voice Capabilities**: Natural voice input via Whisper API
4. **Cultural Adaptation**: Specialized prompt engineering for regional context
5. **Safety First**: Appropriate triage recommendations (emergency/in-person/telemedicine)
6. **User-Friendly**: Simple, conversational interface integrated into patient dashboard
7. **Secure Implementation**: API key protection, input validation, HIPAA-conscious design
8. **Scalable Architecture**: Modular code structure with clear separation of concerns
9. **Error Resilience**: Graceful fallbacks when OpenAI services unavailable
10. **Comprehensive Logging**: Full audit trail for medical compliance

This AI implementation enhances the telemedicine platform by providing immediate, intelligent medical guidance while maintaining high standards of security, reliability, and user experience.