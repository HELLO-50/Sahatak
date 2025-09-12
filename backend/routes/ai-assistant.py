from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
import os
import tempfile
from datetime import datetime
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import app_logger
import openai
from openai import OpenAI

# Create blueprint
chatbot_bp = Blueprint('chatbot', __name__)

# Initialize OpenAI client (will be loaded when needed)
openai_client = None

# Medical AI System Prompts with bilingual support
MEDICAL_TRIAGE_SYSTEM_PROMPT = """You are a bilingual medical triage assistant.
You must automatically reply in the same language as the user (Arabic or English).
Your role is to ask relevant follow-up questions about the user's symptoms and then classify the situation into one of three categories:
(1) You can be seen at Sahatak Telemedicine Platform, go ahead and schedule an appointment
(2) In-person doctor visit is required
(3) Emergency Room is required immediately.

After making the recommendation, explain briefly why.
Always add a disclaimer:
- English: "I am not a doctor. Please seek professional medical advice for any health concerns."
- Arabic: "أنا لست طبيبًا. من فضلك استشر طبيبًا مختصًا لأي مخاوف صحية."

Do not provide treatments, medications, or detailed diagnoses. Only triage and guidance.

Guidelines for classification:
- Emergency Room: severe chest pain, difficulty breathing, severe bleeding, loss of consciousness, severe allergic reactions, stroke symptoms, severe head injuries
- In-person visit: persistent fever, moderate injuries, concerning symptoms that need physical examination, chronic condition changes
- Sahatak Telemedicine Platform: minor symptoms, general health questions, medication inquiries, follow-ups for stable conditions that can be handled via video consultation

Always be compassionate and thorough in your questioning before making a recommendation."""

def initialize_openai_client():
    """Initialize OpenAI client with API key from environment"""
    global openai_client
    try:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            app_logger.warning("OPENAI_API_KEY environment variable not set")
            return False
        
        openai_client = OpenAI(api_key=api_key)
        app_logger.info("OpenAI client initialized successfully")
        return True
    except Exception as e:
        app_logger.error(f"Failed to initialize OpenAI client: {e}")
        return False

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

def extract_triage_decision(ai_response):
    """Extract triage decision from AI response"""
    response_lower = ai_response.lower()
    
    # Emergency indicators
    emergency_keywords = ['emergency room', 'er immediately', 'emergency', 'urgent', 'call 911', 'ambulance', 
                         'طوارئ', 'إسعاف', 'عاجل', 'فوري', 'غرفة الطوارئ']
    
    # In-person visit indicators
    in_person_keywords = ['in-person', 'in person', 'visit', 'see a doctor', 'primary care', 'physician', 
                         'شخصي', 'زيارة', 'طبيب', 'عيادة', 'فحص شخصي']
    
    # Sahatak Telemedicine Platform indicators
    remote_keywords = ['sahatak telemedicine platform', 'sahatak platform', 'telemedicine platform', 
                      'schedule an appointment', 'remote consultation', 'telemedicine', 'virtual visit', 'online', 'platform', 
                      'منصة صحتك', 'منصة الطب عن بُعد', 'احجز موعد', 'بُعد', 'افتراضي', 'منصة', 'الإنترنت', 'استشارة عن بُعد']
    
    # Check for emergency first (highest priority)
    if any(keyword in response_lower for keyword in emergency_keywords):
        return 'emergency'
    elif any(keyword in response_lower for keyword in in_person_keywords):
        return 'in_person'
    elif any(keyword in response_lower for keyword in remote_keywords):
        return 'telemedicine'
    else:
        # Default to telemedicine if unclear
        return 'telemedicine'

@chatbot_bp.route('/assessment', methods=['POST', 'OPTIONS'])
@cross_origin()
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
                    'response': "AI service is temporarily unavailable. If you have urgent symptoms, please contact emergency services or visit your nearest hospital.",
                    'triage_result': None,
                    'language': 'en',
                    'model': 'fallback',
                    'timestamp': datetime.utcnow().isoformat()
                },
                message="Fallback response - OpenAI unavailable"
            )
        
        # Get request data
        data = request.get_json()
        if not data or 'message' not in data:
            return APIResponse.error(
                message="Message is required",
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        user_message = data.get('message', '').strip()
        language = data.get('language', 'en')
        conversation_id = data.get('conversation_id', None)
        
        if not user_message:
            return APIResponse.error(
                message="Message cannot be empty",
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        # Auto-detect language if not specified
        if language == 'auto':
            language = detect_language(user_message)
        
        app_logger.info(f"AI Assessment request - Language: {language}, Message length: {len(user_message)}")
        
        try:
            # Make OpenAI API call
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": MEDICAL_TRIAGE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            bot_response = response.choices[0].message.content.strip()
            
            # Extract triage decision
            triage_result = extract_triage_decision(bot_response)
            
            response_data = {
                'response': bot_response,
                'triage_result': triage_result,
                'language': language,
                'model': 'gpt-3.5-turbo',
                'conversation_id': conversation_id,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            app_logger.info(f"OpenAI response successful - Triage: {triage_result}")
            
            return APIResponse.success(
                data=response_data,
                message="AI assessment completed successfully"
            )
            
        except openai.OpenAIError as e:
            app_logger.error(f"OpenAI API error: {e}")
            
            # Fallback response
            if language == 'ar':
                fallback_response = "عذراً، أواجه صعوبات تقنية مؤقتة. من فضلك حاول مرة أخرى لاحقاً، أو إذا كانت أعراضك شديدة، توجه للطوارئ فوراً.\n\nأنا لست طبيبًا. من فضلك استشر طبيبًا مختصًا لأي مخاوف صحية."
            else:
                fallback_response = "Sorry, I'm experiencing temporary technical difficulties. Please try again later, or if your symptoms are severe, go to the emergency room immediately.\n\nI am not a doctor. Please seek professional medical advice for any health concerns."
            
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
        
    except Exception as e:
        app_logger.error(f"AI Assessment error: {str(e)}")
        return APIResponse.error(
            message="Failed to process AI assessment request",
            error_code=ErrorCodes.INTERNAL_ERROR
        )

@chatbot_bp.route('/stt', methods=['POST', 'OPTIONS'])
@cross_origin()
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
        if audio_file.filename == '':
            return APIResponse.error(
                message="No audio file selected",
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        app_logger.info(f"Received audio file: {audio_file.filename}")
        
        try:
            # Create temporary file for audio processing
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                audio_file.save(temp_audio.name)
                
                try:
                    # Use OpenAI Whisper for transcription
                    with open(temp_audio.name, "rb") as audio:
                        transcription = openai_client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio,
                            language=None  # Auto-detect language
                        )
                    
                    transcribed_text = transcription.text.strip()
                    detected_language = detect_language(transcribed_text) if transcribed_text else 'en'
                    
                    app_logger.info(f"Transcription successful: {transcribed_text[:50]}... (Language: {detected_language})")
                    
                    return APIResponse.success(
                        data={
                            'transcription': transcribed_text,
                            'detected_language': detected_language,
                            'model': 'whisper-1',
                            'timestamp': datetime.utcnow().isoformat()
                        },
                        message="Audio transcription completed"
                    )
                    
                finally:
                    # Clean up temporary file
                    try:
                        os.unlink(temp_audio.name)
                    except OSError:
                        pass
        
        except openai.OpenAIError as e:
            app_logger.error(f"OpenAI Whisper API error: {e}")
            return APIResponse.error(
                message="Failed to transcribe audio. Please try again.",
                error_code=ErrorCodes.EXTERNAL_SERVICE_ERROR
            )
        
    except Exception as e:
        app_logger.error(f"STT endpoint error: {str(e)}")
        return APIResponse.error(
            message="Failed to process speech-to-text request",
            error_code=ErrorCodes.INTERNAL_ERROR
        )

@chatbot_bp.route('/health', methods=['GET'])
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
                    'chat': 'gpt-3.5-turbo',
                    'speech_to_text': 'whisper-1'
                }
            },
            'supported_languages': ['Arabic', 'English'],
            'endpoints': {
                'assessment': '/api/chatbot/assessment',
                'speech_to_text': '/api/chatbot/stt',
                'health': '/api/chatbot/health'
            },
            'timestamp': datetime.utcnow().isoformat()
        },
        message="AI Assessment service health check completed"
    )