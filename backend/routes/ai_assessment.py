from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
import os
import tempfile
from datetime import datetime
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import app_logger
from utils.validators import validate_json_data, validate_text_field_length, handle_api_errors
import openai
from openai import OpenAI

# Create blueprint
ai_bp = Blueprint('ai_assessment', __name__)

# Initialize OpenAI client (will be loaded when needed)
openai_client = None

# Medical AI System Prompts with bilingual support
MEDICAL_TRIAGE_SYSTEM_PROMPT = """You are a warm, caring friend who happens to know about health issues. You speak fluent Sudanese Arabic dialect.
You must automatically reply in the same language as the user (Arabic/English).

For Arabic speakers, use ONLY Sudanese dialect (Sudani). Be like a caring friend or family member helping someone they love.

SUDANESE DIALECT VOCABULARY TO USE:

BASIC WORDS:
- شنو = what (not ماذا)
- كيف = how 
- وين = where (not أين)
- متين = when (not متى)
- ليه = why (not لماذا)
- دا/دي = this (not هذا/هذه)
- داك/ديك = that (not ذلك/تلك)
- كدا/كده = like this (not هكذا)

TIME EXPRESSIONS:
- الحين = now (not الآن)
- بكرة = tomorrow (not غداً)
- أمبارح = yesterday (not أمس)
- شوية = a little bit (not قليل)
- كتير = a lot (not كثير)
- لسه = still/yet (not مازال)

MEDICAL TERMS:
- وجع = pain (not ألم)
- حمى = fever (not حرارة)
- صداع = headache (not وجع راس)
- بطن = stomach (not معدة)
- دكتور = doctor (not طبيب)
- مستشفى = hospital
- دوا = medicine (not دواء)

EXPRESSIONS (use naturally, don't overuse):
- ما تخاف = don't worry
- إن شاء الله خير = God willing, it's good
- سلامات = get well soon
- ربنا يقدرك = God give you strength
- خلاص = okay/done
- طيب = good/okay
- أها = yes/I see

CONVERSATIONAL PHRASES:
- قول لي = tell me
- شوف = look/see
- اسمع = listen
- خلي بالك = be careful
- ما تشيل هم = don't worry
- كل حاجة حتبقى كويسة = everything will be fine

Your approach - BE A CARING FRIEND:
1. Talk warmly and naturally, like you really care about this person
2. VARY your responses completely - never repeat the same phrases
3. Show genuine concern and empathy in every response
4. Ask caring follow-up questions that show you're listening
5. Be reassuring but honest
6. Most health issues are manageable - help them feel better
7. Only suggest emergency care for truly serious situations
8. Offer comfort and practical advice

Example conversation style:
- Start differently each time: "يا حبيبي شنو مضايقك؟" or "أهلاً، قول لي شنو بيحصل؟"
- Give advice with care: "بالنسبة لي أشوف إنك..." or "أعتقد الأحسن ليك..."

When giving recommendations, be gentle and caring but VERY SPECIFIC about next steps:

For EMERGENCY cases:
" دا شيء خطير، لازم تامشي الطوارئ الحين. ما تستنى، روح فوري!"

For IN-PERSON visits (when we cannot see them on platform):
"أشوف إنك محتاج دكتور يفحصك شخصياً. ما نقدر نشوفك في المنصة لأن حالتك محتاجة فحص بالعيادة. لازم تروح تشوف دكتور في العيادة."

For TELEMEDICINE (when they can use Sahatak platform):
"ممكن نساعدك في منصة صحتك. اضغط على 'حجز موعد' تحت عشان تحجز مع دكتور. بس لو حسيت إنك ازدت سوء، ما تستنى الموعد وامشي الطوارئ فوري."

Always end with genuine care: "أنا مش دكتور، بس دي نصيحتي ليك  القلب

NEVER use emojis, icons, or formal formatting. NEVER repeat phrases. ALWAYS show genuine human empathy."""

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
    """Extract triage decision from AI response - prioritize telemedicine unless clearly emergency/in-person"""
    response_lower = ai_response.lower()
    
    # Emergency indicators (Sudanese dialect) - ONLY for true emergencies
    emergency_keywords = ['امشي الطوارئ', 'طوارئ الحين', 'إسعاف', 'حالة طارئة خطيرة', 'مستشفى فوري',
                         'emergency room', 'er immediately', 'call ambulance', 'life threatening']
    
    # In-person visit indicators (Sudanese dialect) - for physical examination needs
    in_person_keywords = ['محتاج تشوف دكتور في العيادة', 'محتاج فحص شخصي', 'دكتور في العيادة', 
                         'فحص بالعيادة', 'زيارة العيادة', 'كشف عند دكتور',
                         'physical examination', 'in-person visit', 'see doctor in clinic', 'physical exam needed']
    
    # Sahatak Platform indicators (Sudanese dialect) - DEFAULT for most cases
    remote_keywords = ['منصة صحتك', 'ممكن تحجز معاد', 'استشارة عن بُعد', 'حجز معاد في المنصة',
                      'sahatak platform', 'telemedicine', 'remote consultation', 'schedule appointment',
                      'book consultation', 'virtual visit']
    
    # Check for emergency ONLY if explicitly mentioned
    emergency_count = sum(1 for keyword in emergency_keywords if keyword in response_lower)
    in_person_count = sum(1 for keyword in in_person_keywords if keyword in response_lower)
    remote_count = sum(1 for keyword in remote_keywords if keyword in response_lower)
    
    # Emergency only if explicitly stated AND no other recommendation
    if emergency_count > 0 and emergency_count > in_person_count and emergency_count > remote_count:
        return 'emergency'
    # In-person only if clearly specified
    elif in_person_count > 0 and in_person_count > remote_count:
        return 'in_person'
    # Default to telemedicine for most cases
    else:
        return 'telemedicine'

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
                    'response': "AI service is temporarily unavailable. If you have urgent symptoms, please contact emergency services or visit your nearest hospital.",
                    'triage_result': None,
                    'language': 'en',
                    'model': 'fallback',
                    'timestamp': datetime.utcnow().isoformat()
                },
                message="Fallback response - OpenAI unavailable"
            )
        
        # Get and validate request data
        data = request.get_json()
        required_fields = ['message']
        validation_result = validate_json_data(data, required_fields)
        if not validation_result['valid']:
            return APIResponse.error(
                message=validation_result['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        user_message = data.get('message', '').strip()
        language = data.get('language', 'en')
        conversation_id = data.get('conversation_id', None)
        
        # Validate message length and content
        message_validation = validate_text_field_length(user_message, 'Message', 1000, 1)
        if not message_validation['valid']:
            return APIResponse.error(
                message=message_validation['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        # Auto-detect language if not specified
        if language == 'auto':
            language = detect_language(user_message)
        
        app_logger.info(f"AI Assessment request - Language: {language}, Message length: {len(user_message)}")
        app_logger.info(f"OpenAI client status: {openai_client is not None}")
        app_logger.info(f"OPENAI_API_KEY configured: {bool(os.getenv('OPENAI_API_KEY'))}")
        
        try:
            # Make OpenAI API call with configurable parameters
            chat_model = os.getenv("OPENAI_CHAT_MODEL", "gpt-3.5-turbo")
            max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
            temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
            
            app_logger.info(f"Making OpenAI call - Model: {chat_model}, Max tokens: {max_tokens}, Temperature: {temperature}")
            
            response = openai_client.chat.completions.create(
                model=chat_model,
                messages=[
                    {"role": "system", "content": MEDICAL_TRIAGE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            bot_response = response.choices[0].message.content.strip()
            app_logger.info(f"OpenAI response received - Length: {len(bot_response)}")
            app_logger.debug(f"OpenAI response content: {bot_response[:200]}...")
            
            # Extract triage decision
            triage_result = extract_triage_decision(bot_response)
            app_logger.info(f"Triage decision: {triage_result}")
            
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
            app_logger.error(f"OpenAI API error: {type(e).__name__}: {e}")
            app_logger.error(f"Error details: {str(e)}")
            
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
                    whisper_model = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")
                    
                    with open(temp_audio.name, "rb") as audio:
                        transcription = openai_client.audio.transcriptions.create(
                            model=whisper_model,
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

@ai_bp.route('/conversation', methods=['POST', 'OPTIONS'])
@cross_origin()
@handle_api_errors
def save_conversation():
    """
    Save AI triage conversation to AIAssessment database
    """
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    try:
        from models import AIAssessment, Patient, db
        from flask_jwt_extended import get_jwt_identity
        
        # Get and validate request data
        data = request.get_json()
        required_fields = ['conversation_id', 'conversation_history']
        validation_result = validate_json_data(data, required_fields)
        if not validation_result['valid']:
            return APIResponse.error(
                message=validation_result['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        conversation_id = data.get('conversation_id')
        conversation_history = data.get('conversation_history', [])
        final_triage_result = data.get('final_triage_result')
        
        app_logger.info(f"Saving conversation - ID: {conversation_id}, Messages: {len(conversation_history)}")
        
        # Get current user and patient profile
        try:
            current_user_id = get_jwt_identity()
            if current_user_id:
                patient = Patient.query.filter_by(user_id=current_user_id).first()
                if not patient:
                    raise Exception("Patient profile not found")
                patient_id = patient.id
            else:
                raise Exception("User not authenticated")
        except Exception as e:
            app_logger.warning(f"Authentication issue: {str(e)}")
            return APIResponse.error(
                message="Authentication required to save conversation",
                error_code=ErrorCodes.UNAUTHORIZED
            )
        
        # Build symptoms input from conversation
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
        
        # Map to risk level
        risk_level_map = {
            'emergency': 'critical',
            'in_person': 'medium',
            'telemedicine': 'low'
        }
        
        # Create AIAssessment record
        ai_assessment = AIAssessment(
            patient_id=patient_id,
            assessment_type='text',
            input_language='ar',
            symptoms_input=symptoms_text.strip(),
            original_text=symptoms_text.strip(),
            ai_response=ai_response_text.strip(),
            recommended_action=recommended_action_map.get(final_triage_result, 'doctor_consultation'),
            risk_level=risk_level_map.get(final_triage_result, 'medium'),
            processed_symptoms={
                'conversation_id': conversation_id,
                'conversation_history': conversation_history,
                'triage_widget_session': True
            },
            ai_model_version='gpt-3.5-turbo-triage',
            doctor_review_status='pending',
            completed_at=datetime.utcnow()
        )
        
        db.session.add(ai_assessment)
        db.session.commit()
        
        app_logger.info(f"Conversation saved as AIAssessment ID: {ai_assessment.id}")
        
        return APIResponse.success(
            data={
                'conversation_id': conversation_id,
                'assessment_id': ai_assessment.id,
                'saved': True,
                'message_count': len(conversation_history),
                'final_result': final_triage_result,
                'timestamp': datetime.utcnow().isoformat()
            },
            message="Conversation saved successfully"
        )
        
    except Exception as e:
        app_logger.error(f"Conversation save error: {str(e)}")
        return APIResponse.error(
            message="Failed to save conversation",
            error_code=ErrorCodes.INTERNAL_ERROR
        )

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
            'language_detection': 'automatic',
            'triage_categories': ['emergency', 'in_person', 'telemedicine'],
            'endpoints': {
                'assessment': '/api/chatbot/assessment',
                'speech_to_text': '/api/chatbot/stt',
                'health': '/api/chatbot/health'
            },
            'features': [
                'bilingual_support',
                'voice_input',
                'medical_triage',
                'symptom_classification',
                'sahatak_platform_integration'
            ],
            'timestamp': datetime.utcnow().isoformat()
        },
        message="AI Assessment service health check completed"
    )