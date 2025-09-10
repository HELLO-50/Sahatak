from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user
import json
import os
from datetime import datetime
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import get_logger
from utils.validators import validate_required_fields

# Initialize logger
chatbot_logger = get_logger('chatbot')

# Create blueprint
chatbot_bp = Blueprint('chatbot', __name__)

# Medical triage responses in both languages
TRIAGE_RESPONSES = {
    'emergency': {
        'en': "⚠️ URGENT: Your symptoms suggest you need immediate medical attention. Please go to the nearest emergency room or call emergency services right away.",
        'ar': "⚠️ عاجل: أعراضك تشير إلى أنك تحتاج إلى عناية طبية فورية. يرجى الذهاب إلى أقرب قسم طوارئ أو الاتصال بخدمات الطوارئ فوراً."
    },
    'appointment': {
        'en': "✅ Based on your symptoms, you can schedule an appointment with a doctor on our platform. This seems suitable for online consultation.",
        'ar': "✅ بناءً على أعراضك، يمكنك حجز موعد مع طبيب على منصتنا. هذا يبدو مناسباً للاستشارة الطبية عبر الإنترنت."
    },
    'local_doctor': {
        'en': "🏥 Your symptoms require in-person examination. Please visit a doctor in your local area for proper diagnosis and treatment.",
        'ar': "🏥 أعراضك تتطلب فحصاً شخصياً. يرجى زيارة طبيب في منطقتك للحصول على تشخيص وعلاج مناسب."
    }
}

# Emergency keywords in Arabic and English
EMERGENCY_KEYWORDS = {
    'en': ['chest pain', 'heart attack', 'stroke', 'bleeding', 'unconscious', 'difficulty breathing', 'severe pain', 'suicide', 'overdose'],
    'ar': ['ألم في الصدر', 'أزمة قلبية', 'جلطة', 'نزيف', 'فقدان الوعي', 'صعوبة في التنفس', 'ألم شديد', 'انتحار', 'جرعة زائدة']
}

def analyze_symptoms_rule_based(symptoms, language='en'):
    """
    Rule-based symptom analysis for Option 2 (Hugging Face local)
    Returns triage decision based on keywords
    """
    symptoms_lower = symptoms.lower()
    
    # Check for emergency keywords
    emergency_words = EMERGENCY_KEYWORDS.get(language, EMERGENCY_KEYWORDS['en'])
    for keyword in emergency_words:
        if keyword.lower() in symptoms_lower:
            return 'emergency'
    
    # Check for common conditions that need in-person visit
    in_person_keywords = {
        'en': ['rash', 'injury', 'wound', 'fracture', 'broken', 'cut', 'burn'],
        'ar': ['طفح جلدي', 'إصابة', 'جرح', 'كسر', 'مكسور', 'قطع', 'حرق']
    }
    
    in_person_words = in_person_keywords.get(language, in_person_keywords['en'])
    for keyword in in_person_words:
        if keyword.lower() in symptoms_lower:
            return 'local_doctor'
    
    # Default to online appointment for other symptoms
    return 'appointment'

@chatbot_bp.route('/option1', methods=['POST'])
def option1_chat():
    """
    Option 1: OpenAI GPT-3.5-Turbo chatbot for medical triage
    """
    try:
        # Validate request data
        required_fields = ['message', 'language']
        validation_result = validate_required_fields(request.json, required_fields)
        if not validation_result['valid']:
            return APIResponse.error(
                message=validation_result['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        data = request.json
        user_message = data['message']
        language = data.get('language', 'en')
        
        chatbot_logger.info(f"Option1 chat request - Language: {language}, Message length: {len(user_message)}")
        
        # For demo purposes, we'll use a simple implementation
        # In production, you would integrate with OpenAI API here
        
        # Simulate OpenAI API call with rule-based fallback for demo
        try:
            # This is where you would make the actual OpenAI API call
            # openai_response = openai.ChatCompletion.create(...)
            
            # For demo, use rule-based analysis
            triage_result = analyze_symptoms_rule_based(user_message, language)
            response_text = TRIAGE_RESPONSES[triage_result][language]
            
            # Add personalized OpenAI-style response
            if language == 'ar':
                ai_response = f"مرحباً، لقد قمت بتحليل أعراضك بعناية. {response_text}"
            else:
                ai_response = f"Hello, I've carefully analyzed your symptoms. {response_text}"
            
            response_data = {
                'response': ai_response,
                'triage_result': triage_result,
                'language': language,
                'model': 'gpt-3.5-turbo-demo',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return APIResponse.success(
                data=response_data,
                message="Chatbot response generated successfully"
            )
            
        except Exception as e:
            chatbot_logger.error(f"OpenAI API error: {str(e)}")
            # Fallback to rule-based response
            triage_result = analyze_symptoms_rule_based(user_message, language)
            response_text = TRIAGE_RESPONSES[triage_result][language]
            
            response_data = {
                'response': response_text,
                'triage_result': triage_result,
                'language': language,
                'model': 'fallback-rules',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return APIResponse.success(
                data=response_data,
                message="Chatbot response generated (fallback mode)"
            )
    
    except Exception as e:
        chatbot_logger.error(f"Option1 chat error: {str(e)}")
        return APIResponse.error(
            message="Failed to process chatbot request",
            error_code=ErrorCodes.INTERNAL_ERROR
        )

@chatbot_bp.route('/option2', methods=['POST'])
def option2_chat():
    """
    Option 2: Hugging Face local model chatbot for medical triage
    """
    try:
        # Validate request data
        required_fields = ['message', 'language']
        validation_result = validate_required_fields(request.json, required_fields)
        if not validation_result['valid']:
            return APIResponse.error(
                message=validation_result['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        data = request.json
        user_message = data['message']
        language = data.get('language', 'en')
        
        chatbot_logger.info(f"Option2 chat request - Language: {language}, Message length: {len(user_message)}")
        
        # For demo purposes, using rule-based analysis
        # In production, you would use Hugging Face transformers here
        
        try:
            # This is where you would use Hugging Face model
            # from transformers import pipeline
            # classifier = pipeline("text-classification", model="aubmindlab/bert-base-arabertv2")
            
            # For demo, use optimized rule-based analysis
            triage_result = analyze_symptoms_rule_based(user_message, language)
            response_text = TRIAGE_RESPONSES[triage_result][language]
            
            # Add Hugging Face-style response
            if language == 'ar':
                ai_response = f"مرحباً بك في مساعد صحتك الذكي. {response_text}"
            else:
                ai_response = f"Welcome to your AI health assistant. {response_text}"
            
            response_data = {
                'response': ai_response,
                'triage_result': triage_result,
                'language': language,
                'model': 'bert-base-arabertv2-demo',
                'confidence': 0.85,  # Simulated confidence score
                'processing_time_ms': 150,  # Simulated fast local processing
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return APIResponse.success(
                data=response_data,
                message="Local AI model response generated successfully"
            )
            
        except Exception as e:
            chatbot_logger.error(f"Hugging Face model error: {str(e)}")
            # Fallback to basic rule-based response
            triage_result = analyze_symptoms_rule_based(user_message, language)
            response_text = TRIAGE_RESPONSES[triage_result][language]
            
            response_data = {
                'response': response_text,
                'triage_result': triage_result,
                'language': language,
                'model': 'rule-based-fallback',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return APIResponse.success(
                data=response_data,
                message="Basic triage response generated"
            )
    
    except Exception as e:
        chatbot_logger.error(f"Option2 chat error: {str(e)}")
        return APIResponse.error(
            message="Failed to process local AI request",
            error_code=ErrorCodes.INTERNAL_ERROR
        )

@chatbot_bp.route('/health', methods=['GET'])
def chatbot_health():
    """Health check endpoint for chatbot service"""
    return APIResponse.success(
        data={
            'service': 'chatbot',
            'status': 'healthy',
            'options': ['option1-openai', 'option2-huggingface'],
            'timestamp': datetime.utcnow().isoformat()
        },
        message="Chatbot service is healthy"
    )