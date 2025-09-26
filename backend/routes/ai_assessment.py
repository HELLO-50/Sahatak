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
MEDICAL_TRIAGE_SYSTEM_PROMPT = """You are a warm, caring friend who happens to know about health issues. You are bilingual in English and Sudanese Arabic dialect.

CRITICAL LANGUAGE MATCHING RULE:
You MUST respond in the EXACT SAME LANGUAGE the user is using:

If user writes in ENGLISH:
- Respond ONLY in simple, clear English
- Use short sentences for non-native speakers
- Avoid complex medical terms - explain simply
- Be warm and caring but clear
- Example: User: "I have headache" → You: "I understand. How long have you had this headache?"

If user writes in ARABIC:
- Respond in Sudanese Arabic dialect (see vocabulary below)
- Use the warm, familiar Sudanese way of speaking
- Example: User: "عندي صداع" → You: "يا سلام، صداع؟ من متين بدأ معاك؟"

NEVER mix languages. Match the user's language exactly.

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
- اسه= now (not الآن)
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

CONVERSATION FLOW RULES:
1. This is ONE CONTINUOUS conversation with the SAME PERSON
2. NEVER restart or act like you're meeting someone new
3. Remember what they told you and build on it
4. Ask MAXIMUM 2-3 follow-up questions, then give your recommendation
5. After 2-3 exchanges, you MUST recommend ONE clear option (emergency, in-person, or telemedicine)
6. NEVER mix recommendations - choose only ONE based on severity
7. Do NOT mention other options after making your recommendation

Your approach - BE A CARING FRIEND:
1. Continue the conversation naturally - don't restart
2. VARY your responses completely - never repeat the same phrases  
3. Show genuine concern and empathy in every response
4. Ask caring follow-up questions that show you're listening
5. Be reassuring but honest
6. Most health issues are manageable - help them feel better
7. Only suggest emergency care for truly serious situations
8. After 2-3 questions MAX, give clear recommendation

Example conversation style:
ARABIC: "أهلاً، قول لي شنو بيحصل؟" → "من متين بدأ؟" → "أها، فهمت. شنو كمان؟"
ENGLISH: "Hi, what's happening with you?" → "When did it start?" → "I see. What else do you feel?"

When giving recommendations, be gentle and caring but VERY SPECIFIC about next steps:

For EMERGENCY cases (ONLY for life-threatening symptoms):
ARABIC: "دا شيء خطير جداً ولازم تمشي الطوارئ فوراً! ما تستنى أبداً، امشي الطوارئ اسه أو اتصل بالإسعاف!"
ENGLISH: "This is a serious emergency! You need to go to the emergency room immediately or call an ambulance!"

For IN-PERSON visits (when physical examination is needed):
ARABIC: "أشوف إنك محتاج فحص شخصي من دكتور. محتاج تمشي تشوف دكتور في عيادة للكشف."
ENGLISH: "You need a physical examination by a doctor. Please visit a doctor at a clinic for an in-person checkup."

For TELEMEDICINE (when they can use Sahatak platform):
ARABIC: "ممكن نساعدك عن طريق منصة صحتك. احجز موعد مع دكتور للاستشارة عن بُعد."
ENGLISH: "You can book an appointment on Sahatak platform for a remote consultation with a doctor."

Always end with genuine care:
ARABIC: "أنا ما دكتور، بس دي نصيحتي ليك من القلب"
ENGLISH: "I am not a doctor, but I care about you and this is my advice"

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
        
        # Simple initialization for PythonAnywhere
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
    """Extract triage decision from AI response - only return decision if AI gives clear recommendation"""
    response_lower = ai_response.lower()

    # Emergency indicators - ONLY for true emergencies
    emergency_keywords = ['الطوارئ فوراً', 'امشي الطوارئ', 'اتصل بالإسعاف', 'طوارئ', 'إسعاف',
                         'خطير جداً', 'حالة طارئة',
                         'emergency room immediately', 'call an ambulance', 'serious emergency',
                         'go to the emergency', 'emergency!']

    # In-person visit indicators - for physical examination needs
    in_person_keywords = ['فحص شخصي', 'دكتور في عيادة', 'تشوف دكتور في عيادة',
                         'للكشف', 'عيادة للكشف', 'زيارة عيادة',
                         'physical examination', 'in-person checkup', 'visit a doctor at a clinic',
                         'see a doctor at a clinic', 'clinic for an in-person']

    # Sahatak Platform indicators - for telemedicine recommendations
    remote_keywords = ['منصة صحتك', 'احجز موعد', 'استشارة عن بُعد',
                      'للاستشارة عن بُعد', 'موعد مع دكتور',
                      'sahatak platform', 'book an appointment', 'remote consultation',
                      'appointment on sahatak']

    # Count keyword matches - prioritize emergency
    emergency_count = sum(1 for keyword in emergency_keywords if keyword in response_lower)
    in_person_count = sum(1 for keyword in in_person_keywords if keyword in response_lower)
    remote_count = sum(1 for keyword in remote_keywords if keyword in response_lower)

    # Return decision based on priority: emergency > in_person > telemedicine
    if emergency_count > 0:
        return 'emergency'
    elif in_person_count > 0:
        return 'in_person'
    elif remote_count > 0:
        return 'telemedicine'
    else:
        # No clear recommendation found - AI is still asking questions
        return None

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
        conversation_history = data.get('conversation_history', [])
        patient_name = data.get('patient_name', '')
        
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
            
            # Build messages with conversation history to maintain context

            # Detect language of current message
            detected_lang = detect_language(user_message)
            app_logger.info(f"Detected language: {detected_lang} for message: {user_message[:50]}...")

            # Add explicit language instruction at the beginning
            if detected_lang == 'en':
                language_instruction = "RESPOND IN ENGLISH ONLY. The user wrote in English, so you MUST reply in English.\n\n"
            else:
                language_instruction = "RESPOND IN SUDANESE ARABIC. The user wrote in Arabic, so you MUST reply in Sudanese Arabic.\n\n"

            system_prompt = language_instruction + MEDICAL_TRIAGE_SYSTEM_PROMPT

            if patient_name:
                system_prompt += f"\n\nIMPORTANT: The patient's name is {patient_name}. Use their name naturally in conversation to show you care about them personally."

            messages = [{"role": "system", "content": system_prompt}]

            # Add conversation history to maintain context within same session
            for exchange in conversation_history:
                if exchange.get('user_message'):
                    messages.append({"role": "user", "content": exchange['user_message']})
                if exchange.get('bot_response'):
                    messages.append({"role": "assistant", "content": exchange['bot_response']})

            # Add current user message with language hint
            user_message_with_hint = user_message
            if detected_lang == 'en':
                user_message_with_hint = user_message + "\n[Language: English - Respond in English]"
            else:
                user_message_with_hint = user_message + "\n[Language: Arabic - Respond in Sudanese Arabic]"

            messages.append({"role": "user", "content": user_message_with_hint})
            
            app_logger.info(f"Conversation context: {len(conversation_history)} previous exchanges")
            
            response = openai_client.chat.completions.create(
                model=chat_model,
                messages=messages,
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
                fallback_response = "عذرا، عندي صعوبات تقنية مؤقتة. من فضلك حاول مرة تانيه بعد شويه كده تمام ، أو إذا كانت أعراضك شديدة، امشي للطوارئ حالن.\n\nأنا ما طبيب . من فضلك استشر شوف دكتور مختص لو عندك مخاوف صحية."
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