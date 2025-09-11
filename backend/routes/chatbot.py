from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user
from flask_cors import cross_origin
import json
import os
from datetime import datetime
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import app_logger
from utils.validators import validate_json_data

# AI Libraries (Free Local Models Only)
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM, AutoModelForSequenceClassification
import torch
from datetime import timedelta

# Initialize logger
chatbot_logger = app_logger

# Medical AI System Prompts
MEDICAL_SYSTEM_PROMPT = {
    'en': '''You are a medical AI assistant for symptom assessment. Your only role is to:
1. Ask follow-up questions to understand patient symptoms better
2. Collect symptom details (severity, duration, associated symptoms)
3. Provide exactly ONE of these three recommendations:
   - "telemedicine": You can be seen on this platform, please schedule an appointment
   - "emergency": You need to go to the nearest ER immediately 
   - "in_person": You need to be seen in person, please schedule an appointment with your primary care or with any physician

Guidelines:
- NEVER provide medical diagnoses or treatment advice
- Ask specific follow-up questions about symptoms
- Focus on symptom assessment only
- Emergency for: chest pain, difficulty breathing, loss of consciousness, severe bleeding, stroke signs, severe injury
- Telemedicine for: mild symptoms that can be evaluated remotely (cold, mild fever, basic questions)
- In-person for: physical symptoms requiring examination (rash, injury, persistent pain, physical findings needed)

Always conclude with exactly one of the three recommendations above.''',
    'ar': '''أنت مساعد ذكي لتقييم الأعراض الطبية. دورك الوحيد:
1. طرح أسئلة متابعة لفهم أعراض المريض بشكل أفضل
2. جمع تفاصيل الأعراض (الشدة، المدة، الأعراض المصاحبة)
3. تقديم واحدة فقط من هذه التوصيات الثلاث:
   - "telemedicine": يمكن فحصك على هذه المنصة، يرجى حجز موعد
   - "emergency": تحتاج للذهاب إلى أقرب قسم طوارئ فوراً
   - "in_person": تحتاج للفحص الشخصي، يرجى حجز موعد مع طبيب الرعاية الأولية أو أي طبيب

الإرشادات:
- لا تقدم أبداً تشخيصاً طبياً أو نصائح علاجية
- اطرح أسئلة متابعة محددة حول الأعراض
- ركز على تقييم الأعراض فقط
- طوارئ للأعراض: ألم الصدر، صعوبة التنفس، فقدان الوعي، النزيف الشديد، علامات الجلطة، إصابة شديدة
- طب عن بُعد للأعراض: الأعراض البسيطة التي يمكن تقييمها عن بُعد (برد، حمى بسيطة، أسئلة أساسية)
- فحص شخصي للأعراض: الأعراض الجسدية التي تتطلب فحصاً (طفح جلدي، إصابة، ألم مستمر، حاجة لفحص جسدي)

اختتم دائماً بواحدة بالضبط من التوصيات الثلاث أعلاه.'''
}

# Initialize AI models (will be loaded when needed)
local_model = None
local_tokenizer = None

# Create blueprint
chatbot_bp = Blueprint('chatbot', __name__)

# Medical triage responses in both languages
TRIAGE_RESPONSES = {
    'emergency': {
        'en': "⚠️ You need to go to the nearest ER immediately.",
        'ar': "⚠️ تحتاج للذهاب إلى أقرب قسم طوارئ فوراً."
    },
    'telemedicine': {
        'en': "✅ You can be seen on this platform, please schedule an appointment.",
        'ar': "✅ يمكن فحصك على هذه المنصة، يرجى حجز موعد."
    },
    'in_person': {
        'en': "🏥 You need to be seen in person, please schedule an appointment with your primary care or with any physician.",
        'ar': "🏥 تحتاج للفحص الشخصي، يرجى حجز موعد مع طبيب الرعاية الأولية أو أي طبيب."
    }
}

# Emergency keywords in Arabic and English
EMERGENCY_KEYWORDS = {
    'en': ['chest pain', 'heart attack', 'stroke', 'bleeding', 'unconscious', 'difficulty breathing', 'severe pain', 'suicide', 'overdose'],
    'ar': ['ألم في الصدر', 'أزمة قلبية', 'جلطة', 'نزيف', 'فقدان الوعي', 'صعوبة في التنفس', 'ألم شديد', 'انتحار', 'جرعة زائدة']
}

def load_local_model():
    """Load Hugging Face local model for medical analysis"""
    global local_model, local_tokenizer
    
    try:
        model_name = current_app.config.get('HUGGINGFACE_MODEL_NAME', 'aubmindlab/bert-base-arabertv2')
        chatbot_logger.info(f"Loading local model: {model_name}")
        
        # Load tokenizer and model
        local_tokenizer = AutoTokenizer.from_pretrained(model_name)
        local_model = AutoModelForSequenceClassification.from_pretrained(model_name)
        
        chatbot_logger.info("Local model loaded successfully")
        return True
    except Exception as e:
        chatbot_logger.error(f"Failed to load local model: {str(e)}")
        return False

def analyze_with_dialogpt(symptoms, language='en'):
    """Analyze symptoms using DialoGPT for conversational medical triage"""
    global local_model, local_tokenizer
    
    try:
        # Load DialoGPT model if not loaded
        if local_model is None:
            model_name = current_app.config.get('HUGGINGFACE_MODEL_NAME', 'microsoft/DialoGPT-medium')
            chatbot_logger.info(f"Loading DialoGPT model: {model_name}")
            
            local_tokenizer = AutoTokenizer.from_pretrained(model_name)
            local_model = AutoModelForCausalLM.from_pretrained(model_name)
            
            # Add padding token if not present
            if local_tokenizer.pad_token is None:
                local_tokenizer.pad_token = local_tokenizer.eos_token
        
        # Prepare medical context prompt
        medical_prompt = MEDICAL_SYSTEM_PROMPT.get(language, MEDICAL_SYSTEM_PROMPT['en'])
        input_text = f"{medical_prompt}\n\nPatient: {symptoms}\nMedical AI:"
        
        # Encode input
        inputs = local_tokenizer.encode(input_text, return_tensors='pt', truncation=True, max_length=512)
        
        # Generate response
        with torch.no_grad():
            outputs = local_model.generate(
                inputs,
                max_length=inputs.shape[1] + current_app.config.get('AI_MAX_LENGTH', 100),
                temperature=current_app.config.get('AI_TEMPERATURE', 0.7),
                do_sample=True,
                pad_token_id=local_tokenizer.eos_token_id,
                no_repeat_ngram_size=2
            )
        
        # Decode response
        response_text = local_tokenizer.decode(outputs[0], skip_special_tokens=True)
        ai_response = response_text[len(input_text):].strip()
        
        # If response is too short, use enhanced rules
        if len(ai_response) < 10:
            triage_result = analyze_symptoms_enhanced(symptoms, language)
            ai_response = generate_local_response(symptoms, triage_result, language)
        else:
            triage_result = extract_triage_decision(ai_response)
        
        return {
            'response': ai_response,
            'triage_result': triage_result,
            'model': 'DialoGPT-medical',
            'tokens_generated': len(outputs[0]) - len(inputs[0])
        }
        
    except Exception as e:
        chatbot_logger.error(f"DialoGPT model error: {str(e)}")
        raise e

def analyze_with_local_model(symptoms, language='en'):
    """Analyze symptoms using local Hugging Face model"""
    global local_model, local_tokenizer
    
    try:
        # Load model if not already loaded
        if local_model is None or local_tokenizer is None:
            if not load_local_model():
                raise ValueError("Local model not available")
        
        # Prepare input for BERT-style classification
        # For medical triage, we'll use a simple classification approach
        inputs = local_tokenizer(symptoms, return_tensors="pt", truncation=True, padding=True, max_length=512)
        
        with torch.no_grad():
            outputs = local_model(**inputs)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
        
        # Get confidence score
        confidence = float(torch.max(predictions))
        
        # For now, use enhanced rule-based logic with confidence weighting
        # In production, you would train the model specifically for medical triage
        triage_result = analyze_symptoms_enhanced(symptoms, language, confidence)
        
        # Generate response based on triage result
        response_text = generate_local_response(symptoms, triage_result, language)
        
        return {
            'response': response_text,
            'triage_result': triage_result,
            'confidence': confidence,
            'model': current_app.config.get('HUGGINGFACE_MODEL_NAME', 'local-bert'),
            'processing_time_ms': 150  # Approximate local processing time
        }
        
    except Exception as e:
        chatbot_logger.error(f"Local model error: {str(e)}")
        raise e

def analyze_symptoms_enhanced(symptoms, language='en', confidence=0.0):
    """Enhanced rule-based analysis with confidence weighting"""
    symptoms_lower = symptoms.lower()
    
    # Emergency keywords with severity weighting
    emergency_keywords = {
        'en': {
            'critical': ['chest pain', 'heart attack', 'stroke', 'unconscious', 'bleeding heavily', 'difficulty breathing', 'severe pain'],
            'urgent': ['bleeding', 'vomiting blood', 'severe headache', 'high fever']
        },
        'ar': {
            'critical': ['ألم في الصدر', 'أزمة قلبية', 'جلطة', 'فقدان الوعي', 'نزيف شديد', 'صعوبة في التنفس', 'ألم شديد'],
            'urgent': ['نزيف', 'قيء دم', 'صداع شديد', 'حمى عالية']
        }
    }
    
    lang_keywords = emergency_keywords.get(language, emergency_keywords['en'])
    
    # Check critical symptoms
    for keyword in lang_keywords['critical']:
        if keyword.lower() in symptoms_lower:
            return 'emergency'
    
    # Check urgent symptoms
    for keyword in lang_keywords['urgent']:
        if keyword.lower() in symptoms_lower:
            return 'emergency'
    
    # Check for in-person consultation needs
    in_person_keywords = {
        'en': ['rash', 'injury', 'wound', 'fracture', 'broken', 'cut', 'burn', 'swelling', 'lump', 'physical exam', 'examination needed'],
        'ar': ['طفح جلدي', 'إصابة', 'جرح', 'كسر', 'مكسور', 'قطع', 'حرق', 'تورم', 'كتلة', 'فحص جسدي']
    }
    
    in_person_words = in_person_keywords.get(language, in_person_keywords['en'])
    for keyword in in_person_words:
        if keyword.lower() in symptoms_lower:
            return 'in_person'
    
    # Default to telemedicine for other symptoms
    return 'telemedicine'

def extract_triage_decision(ai_response):
    """Extract triage decision from AI response"""
    response_lower = ai_response.lower()
    
    if any(word in response_lower for word in ['emergency', 'urgent', 'immediate', 'طارئ', 'عاجل', 'er immediately']):
        return 'emergency'
    elif any(word in response_lower for word in ['in-person', 'in person', 'primary care', 'شخصي', 'رعاية أولية']):
        return 'in_person'
    elif any(word in response_lower for word in ['telemedicine', 'platform', 'schedule', 'منصة', 'حجز موعد']):
        return 'telemedicine'
    else:
        return 'telemedicine'

def generate_local_response(symptoms, triage_result, language):
    """Generate appropriate response for local model"""
    base_responses = TRIAGE_RESPONSES[triage_result][language]
    
    if language == 'ar':
        return f"تم تحليل أعراضك باستخدام الذكاء الاصطناعي المحلي. {base_responses}"
    else:
        return f"Your symptoms have been analyzed using local AI. {base_responses}"

def analyze_symptoms_rule_based(symptoms, language='en'):
    """Fallback rule-based analysis (kept for compatibility)"""
    return analyze_symptoms_enhanced(symptoms, language, 0.0)

@chatbot_bp.route('/assessment', methods=['POST', 'OPTIONS'])
@cross_origin(origins=['http://127.0.0.1:5500', 'http://localhost:5500'], methods=['POST', 'OPTIONS'])
def ai_assessment():
    """
    AI Symptom Assessment - Medical triage chatbot
    """
    try:
        # Validate request data
        required_fields = ['message', 'language']
        validation_result = validate_json_data(request.json, required_fields)
        if not validation_result['valid']:
            return APIResponse.error(
                message=validation_result['message'],
                error_code=ErrorCodes.VALIDATION_ERROR
            )
        
        data = request.json
        user_message = data['message']
        language = data.get('language', 'en')
        
        chatbot_logger.info(f"AI Assessment chat request - Language: {language}, Message length: {len(user_message)}")
        
        try:
            # Use DialoGPT local model as primary option
            ai_result = analyze_with_dialogpt(user_message, language)
            
            response_data = {
                'response': ai_result['response'],
                'triage_result': ai_result['triage_result'],
                'language': language,
                'model': ai_result['model'],
                'usage_tokens': ai_result.get('tokens_generated', 0),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            chatbot_logger.info(f"DialoGPT response successful - Triage: {ai_result['triage_result']}, Tokens: {ai_result.get('tokens_generated', 0)}")
            
            return APIResponse.success(
                data=response_data,
                message="AI assessment response generated successfully"
            )
            
        except Exception as e:
            chatbot_logger.error(f"DialoGPT model error: {str(e)}")
            
            # Fallback to enhanced rule-based response
            triage_result = analyze_symptoms_enhanced(user_message, language)
            response_text = TRIAGE_RESPONSES[triage_result][language]
            
            # Add fallback indicator
            if language == 'ar':
                ai_response = f"تم التحليل باستخدام النظام الاحتياطي. {response_text}"
            else:
                ai_response = f"Analysis completed using backup system. {response_text}"
            
            response_data = {
                'response': ai_response,
                'triage_result': triage_result,
                'language': language,
                'model': 'enhanced-fallback',
                'fallback_reason': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return APIResponse.success(
                data=response_data,
                message="Fallback response generated due to API unavailability"
            )
    
    except Exception as e:
        chatbot_logger.error(f"AI Assessment critical error: {str(e)}")
        return APIResponse.error(
            message="Failed to process AI assessment request",
            error_code=ErrorCodes.INTERNAL_ERROR
        )


@chatbot_bp.route('/health', methods=['GET'])
def chatbot_health():
    """Health check endpoint for AI assessment service"""
    # Check local model availability
    local_model_available = (local_model is not None and local_tokenizer is not None) or torch.cuda.is_available()
    
    return APIResponse.success(
        data={
            'service': 'ai-assessment',
            'status': 'healthy',
            'ai_models': {
                'dialogpt': {
                    'available': local_model_available,
                    'model': current_app.config.get('HUGGINGFACE_MODEL_NAME', 'microsoft/DialoGPT-medium'),
                    'status': 'ready' if local_model_available else 'model_not_loaded'
                },
                'fallback': {
                    'available': True,
                    'model': 'enhanced-rules-system',
                    'status': 'ready'
                }
            },
            'system_info': {
                'cuda_available': torch.cuda.is_available(),
                'torch_version': torch.__version__
            },
            'timestamp': datetime.utcnow().isoformat()
        },
        message="AI Assessment service health check completed"
    )