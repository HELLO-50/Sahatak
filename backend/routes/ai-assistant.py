from flask import Blueprint, request, jsonify, current_app
from flask_login import current_user
from flask_cors import cross_origin
import json
import os
from datetime import datetime
from utils.responses import APIResponse, ErrorCodes
from utils.logging_config import app_logger
from utils.validators import validate_json_data

# Initialize logger first
chatbot_logger = app_logger

# AI Libraries (Free Local Models Only) - Optional dependencies
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM, AutoModelForSequenceClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
    chatbot_logger.info("Transformers library loaded successfully")
except ImportError as e:
    TRANSFORMERS_AVAILABLE = False
    # Create dummy objects to prevent errors
    torch = None
    AutoTokenizer = None
    AutoModelForCausalLM = None
    AutoModelForSequenceClassification = None
    chatbot_logger.warning(f"Transformers library not available: {e}. Using fallback mode.")

from datetime import timedelta

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

# Smart Questionnaire System - Symptom-based decision trees
SYMPTOM_QUESTIONNAIRES = {
    'en': {
        'chest_pain': {
            'questions': [
                "Is the chest pain severe (8-10 on pain scale)?",
                "Is the pain crushing, squeezing, or feels like an elephant on your chest?",
                "Do you have shortness of breath or difficulty breathing?",
                "Is the pain radiating to your left arm, neck, jaw, or back?",
                "Do you feel nauseous, dizzy, or sweating?",
                "Did the pain start suddenly during physical activity?"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4],  # Question indices that trigger emergency
            'followup': "Based on your chest pain symptoms, this needs immediate evaluation."
        },
        'headache': {
            'questions': [
                "Is this the worst headache of your life or different from usual headaches?",
                "Did the headache start suddenly like a 'thunderclap'?",
                "Do you have a fever with the headache?",
                "Are you experiencing confusion, difficulty speaking, or vision changes?",
                "Do you have a stiff neck or sensitivity to light?",
                "Are you nauseous or vomiting?"
            ],
            'emergency_triggers': [0, 1, 3, 4],
            'followup': "Headaches can range from simple tension headaches to serious conditions."
        },
        'abdominal_pain': {
            'questions': [
                "Is the pain severe (8-10 on pain scale) and constant?",
                "Is the pain in the lower right side of your abdomen?",
                "Are you vomiting blood or material that looks like coffee grounds?",
                "Do you have a fever with the abdominal pain?",
                "Is your abdomen rigid or very tender to touch?",
                "Are you unable to pass gas or have a bowel movement?"
            ],
            'emergency_triggers': [0, 2, 4, 5],
            'followup': "Abdominal pain can indicate various conditions from mild to serious."
        },
        'breathing': {
            'questions': [
                "Are you having severe difficulty breathing or can't catch your breath?",
                "Are your lips or fingernails turning blue?",
                "Do you have chest pain with the breathing difficulty?",
                "Are you coughing up blood?",
                "Did the breathing difficulty start suddenly?",
                "Do you have a history of asthma or heart problems?"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4],
            'followup': "Breathing difficulties can be serious and need prompt evaluation."
        },
        'fever': {
            'questions': [
                "Is your temperature over 103°F (39.4°C)?",
                "Do you have a severe headache with the fever?",
                "Are you having difficulty breathing?",
                "Do you have a rash that doesn't fade when pressed?",
                "Are you confused or have altered mental state?",
                "Do you have severe abdominal pain with the fever?"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4, 5],
            'followup': "Fever is often manageable, but some combinations need immediate care."
        },
        'injury': {
            'questions': [
                "Is there active, heavy bleeding that won't stop?",
                "Do you suspect a broken bone or can't move the injured area?",
                "Is there an obvious deformity or bone sticking out?",
                "Did you hit your head and lose consciousness?",
                "Are you experiencing numbness or tingling?",
                "Is the injured area turning blue or very swollen?"
            ],
            'emergency_triggers': [0, 1, 2, 3],
            'followup': "Injuries can often be treated, but some require immediate medical attention."
        },
        'back_pain': {
            'questions': [
                "Is the back pain so severe you can't stand or walk?",
                "Are you experiencing numbness or weakness in your legs?",
                "Do you have loss of bladder or bowel control?",
                "Did the pain start after a fall or injury?",
                "Is the pain shooting down your leg below the knee?",
                "Have you had recent weight loss or night sweats?"
            ],
            'emergency_triggers': [0, 1, 2, 5],
            'followup': "Back pain can range from simple muscle strain to serious conditions."
        },
        'joint_pain': {
            'questions': [
                "Is the joint red, hot, and extremely swollen?",
                "Did the joint pain start suddenly overnight?",
                "Can you put any weight on the affected joint?",
                "Do you have fever along with the joint pain?",
                "Is the joint completely stiff and immovable?",
                "Have you had recent infection or illness?"
            ],
            'emergency_triggers': [0, 1, 3, 4],
            'followup': "Joint pain can indicate various conditions from simple strain to infections."
        }
    },
    'ar': {
        'chest_pain': {
            'questions': [
                "هل ألم الصدر شديد (8-10 على مقياس الألم)؟",
                "هل الألم ضاغط أو كأن فيلاً يجلس على صدرك؟",
                "هل تعاني من ضيق في التنفس أو صعوبة في التنفس؟",
                "هل ينتشر الألم إلى ذراعك الأيسر أو رقبتك أو فكك أو ظهرك؟",
                "هل تشعر بالغثيان أو الدوخة أو التعرق؟",
                "هل بدأ الألم فجأة أثناء النشاط البدني؟"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4],
            'followup': "بناءً على أعراض ألم الصدر، هذا يحتاج تقييماً فورياً."
        },
        'headache': {
            'questions': [
                "هل هذا أسوأ صداع في حياتك أو مختلف عن الصداع المعتاد؟",
                "هل بدأ الصداع فجأة مثل 'صاعقة رعد'؟",
                "هل تعاني من حمى مع الصداع؟",
                "هل تعاني من ارتباك أو صعوبة في الكلام أو تغيرات في الرؤية؟",
                "هل رقبتك متيبسة أو تعاني من حساسية للضوء؟",
                "هل تشعر بالغثيان أو القيء؟"
            ],
            'emergency_triggers': [0, 1, 3, 4],
            'followup': "الصداع يمكن أن يتراوح من صداع التوتر البسيط إلى حالات خطيرة."
        },
        'abdominal_pain': {
            'questions': [
                "هل الألم شديد (8-10 على مقياس الألم) ومستمر؟",
                "هل الألم في الجهة اليمنى السفلى من البطن؟",
                "هل تتقيأ دماً أو مادة تشبه القهوة؟",
                "هل لديك حمى مع ألم البطن؟",
                "هل بطنك متيبس أو حساس جداً للمس؟",
                "هل لا تستطيع إخراج غازات أو تبرز؟"
            ],
            'emergency_triggers': [0, 2, 4, 5],
            'followup': "ألم البطن يمكن أن يشير لحالات مختلفة من البسيطة للخطيرة."
        },
        'breathing': {
            'questions': [
                "هل تعاني من صعوبة شديدة في التنفس أو لا تستطيع اللحاق بأنفاسك؟",
                "هل شفتيك أو أظافرك تتحول للأزرق؟",
                "هل لديك ألم صدر مع صعوبة التنفس؟",
                "هل تسعل دماً؟",
                "هل بدأت صعوبة التنفس فجأة؟",
                "هل لديك تاريخ مع الربو أو مشاكل القلب؟"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4],
            'followup': "صعوبات التنفس يمكن أن تكون خطيرة وتحتاج تقييم سريع."
        },
        'fever': {
            'questions': [
                "هل درجة حرارتك أكثر من 103°F (39.4°C)؟",
                "هل لديك صداع شديد مع الحمى؟",
                "هل تعاني من صعوبة في التنفس؟",
                "هل لديك طفح جلدي لا يختفي عند الضغط؟",
                "هل أنت في حالة ارتباك أو تغير في الحالة الذهنية؟",
                "هل لديك ألم بطن شديد مع الحمى؟"
            ],
            'emergency_triggers': [0, 1, 2, 3, 4, 5],
            'followup': "الحمى عادة قابلة للعلاج، لكن بعض التركيبات تحتاج رعاية فورية."
        },
        'injury': {
            'questions': [
                "هل هناك نزيف نشط وثقيل لا يتوقف؟",
                "هل تشك في كسر عظم أو لا تستطيع تحريك المنطقة المصابة؟",
                "هل هناك تشوه واضح أو عظم بارز؟",
                "هل ضربت رأسك وفقدت الوعي؟",
                "هل تعاني من تنميل أو وخز؟",
                "هل المنطقة المصابة تتحول للأزرق أو متورمة جداً؟"
            ],
            'emergency_triggers': [0, 1, 2, 3],
            'followup': "الإصابات يمكن علاجها غالباً، لكن بعضها يحتاج رعاية طبية فورية."
        },
        'back_pain': {
            'questions': [
                "هل ألم الظهر شديد لدرجة أنك لا تستطيع الوقوف أو المشي؟",
                "هل تعاني من تنميل أو ضعف في ساقيك؟",
                "هل فقدت السيطرة على المثانة أو الأمعاء؟",
                "هل بدأ الألم بعد سقطة أو إصابة؟",
                "هل الألم ينطلق أسفل ساقك تحت الركبة؟",
                "هل فقدت وزناً مؤخراً أو تعاني من تعرق ليلي؟"
            ],
            'emergency_triggers': [0, 1, 2, 5],
            'followup': "ألم الظهر يمكن أن يتراوح من شد عضلي بسيط لحالات خطيرة."
        },
        'joint_pain': {
            'questions': [
                "هل المفصل أحمر وحار ومتورم بشدة؟",
                "هل بدأ ألم المفصل فجأة خلال الليل؟",
                "هل تستطيع وضع أي وزن على المفصل المتأثر؟",
                "هل لديك حمى مع ألم المفصل؟",
                "هل المفصل متيبس تماماً وغير متحرك؟",
                "هل أصبت بعدوى أو مرض مؤخراً؟"
            ],
            'emergency_triggers': [0, 1, 3, 4],
            'followup': "ألم المفاصل يمكن أن يشير لحالات مختلفة من الشد البسيط للعدوى."
        }
    }
}

def load_local_model():
    """Load Hugging Face local model for medical analysis"""
    global local_model, local_tokenizer
    
    if not TRANSFORMERS_AVAILABLE:
        chatbot_logger.warning("Transformers library not available - cannot load local model")
        return False
    
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

def analyze_with_conversational_ai(user_message, language='en', conversation_context=None):
    """Full conversational AI system for medical triage"""
    
    # Initialize conversation context if not provided
    if conversation_context is None:
        conversation_context = {
            'stage': 'greeting',
            'symptoms_mentioned': [],
            'questions_asked': [],
            'answers_received': [],
            'severity_indicators': [],
            'triage_decision': None
        }
    
    message_lower = user_message.lower().strip()
    
    # Handle different conversation stages
    if conversation_context['stage'] == 'greeting':
        return handle_greeting(user_message, language, conversation_context)
    elif conversation_context['stage'] == 'symptom_gathering':
        return handle_symptom_gathering(user_message, language, conversation_context)
    elif conversation_context['stage'] == 'follow_up_questions':
        return handle_follow_up_questions(user_message, language, conversation_context)
    elif conversation_context['stage'] == 'assessment':
        return handle_final_assessment(user_message, language, conversation_context)
    else:
        # Fallback to greeting for unknown stages
        return handle_greeting(user_message, language, conversation_context)

def handle_greeting(user_message, language, context):
    """Handle initial greeting and start symptom collection"""
    message_lower = user_message.lower()
    
    # Check if user is already describing symptoms in greeting
    if has_symptom_keywords(message_lower, language):
        context['stage'] = 'symptom_gathering'
        return handle_symptom_gathering(user_message, language, context)
    
    # Check for greetings (including Sudanese dialect)
    greetings = {
        'en': ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        'ar': ['مرحبا', 'أهلا', 'السلام عليكم', 'صباح الخير', 'مساء الخير', 'كيف الحال', 'شلونك', 'كيفك', 'أهلين', 'مرحبتين', 'سلام']
    }
    
    is_greeting = any(greeting in message_lower for greeting in greetings.get(language, greetings['en']))
    
    if is_greeting or len(message_lower) < 10:
        # Respond with greeting and symptom request
        if language == 'ar':
            response = "أهلاً وسهلاً! أنا مساعدك الطبي الذكي. قادر أساعدك في تقييم الأعراض وأعطيك التوصيات المناسبة.\n\nشنو المشكلة اليوم؟ قولي شنو الأعراض اللي حاسس بيها أو وصفلي وضعك."
        else:
            response = "Hello! I'm your AI medical assistant. I can help assess your symptoms and provide appropriate recommendations.\n\nHow can I help you today? Please describe any symptoms you're experiencing."
        
        context['stage'] = 'symptom_gathering'
        
        return {
            'response': response,
            'triage_result': None,
            'model': 'conversational-ai',
            'conversation_stage': 'greeting',
            'tokens_generated': len(response.split())
        }
    else:
        # User might be describing symptoms in their greeting
        context['stage'] = 'symptom_gathering'
        return handle_symptom_gathering(user_message, language, context)

def handle_symptom_gathering(user_message, language, context):
    """Gather and analyze symptoms from user"""
    
    # Add to symptoms mentioned
    symptoms = extract_symptoms(user_message, language)
    context['symptoms_mentioned'].extend(symptoms)
    
    # Check for immediate emergency keywords
    if has_emergency_keywords(user_message, language):
        context['triage_decision'] = 'emergency'
        return provide_emergency_response(user_message, language, context)
    
    # Determine symptom category for targeted questions
    symptom_category = detect_symptom_category(user_message, language)
    
    if symptom_category and len(context['questions_asked']) == 0:
        # Ask specific follow-up questions based on symptom category
        questionnaire = SYMPTOM_QUESTIONNAIRES[language].get(symptom_category)
        if questionnaire:
            first_question = questionnaire['questions'][0]
            context['questions_asked'].append(first_question)
            context['current_category'] = symptom_category
            context['stage'] = 'follow_up_questions'
            
            if language == 'ar':
                response = f"فاهم إنك بتعاني من {get_symptom_name(symptom_category, language)}. خليني أسألك شوية أسئلة مهمة عشان أقدر أقيم وضعك أحسن.\n\n{first_question}"
            else:
                response = f"I understand you're experiencing {get_symptom_name(symptom_category, language)}. Let me ask you some important questions to better assess your situation.\n\n{first_question}"
            
            return {
                'response': response,
                'triage_result': None,
                'model': 'conversational-ai',
                'conversation_stage': 'follow_up_questions',
                'tokens_generated': len(response.split())
            }
    
    # General response for unclear or mild symptoms
    if language == 'ar':
        response = "مشكور على وصف الأعراض دي. عشان أساعدك أكتر، ممكن تقولي:\n\n• متين بدت الأعراض دي؟\n• كام شدة الأعراض من 1 لحد 10؟\n• في حاجة بتخلي الأعراض أسوأ أو أحسن؟"
    else:
        response = "Thank you for describing your symptoms. To help you better, can you tell me:\n\n• When did these symptoms start?\n• How severe are your symptoms on a scale of 1 to 10?\n• Is there anything that makes the symptoms worse or better?"
    
    context['stage'] = 'follow_up_questions'
    
    return {
        'response': response,
        'triage_result': None,
        'model': 'conversational-ai',
        'conversation_stage': 'symptom_gathering',
        'tokens_generated': len(response.split())
    }

def handle_follow_up_questions(user_message, language, context):
    """Handle follow-up questions and responses"""
    
    # Store the user's answer
    context['answers_received'].append(user_message)
    
    # Analyze the response for severity indicators
    severity_indicators = extract_severity_indicators(user_message, language)
    context['severity_indicators'].extend(severity_indicators)
    
    # Check if we have enough information or if emergency keywords appeared
    if has_emergency_keywords(user_message, language) or 'high_severity' in severity_indicators:
        context['triage_decision'] = 'emergency'
        return provide_emergency_response(user_message, language, context)
    
    # Ask more questions if needed
    current_category = context.get('current_category')
    if current_category and len(context['questions_asked']) < 3:
        questionnaire = SYMPTOM_QUESTIONNAIRES[language].get(current_category)
        if questionnaire:
            next_question_index = len(context['questions_asked'])
            if next_question_index < len(questionnaire['questions']):
                next_question = questionnaire['questions'][next_question_index]
                context['questions_asked'].append(next_question)
                
                if language == 'ar':
                    response = f"مشكور على الإجابة دي. سؤال تاني مهم:\n\n{next_question}"
                else:
                    response = f"Thank you for that information. One more important question:\n\n{next_question}"
                
                return {
                    'response': response,
                    'triage_result': None,
                    'model': 'conversational-ai',
                    'conversation_stage': 'follow_up_questions',
                    'tokens_generated': len(response.split())
                }
    
    # Move to final assessment
    context['stage'] = 'assessment'
    return handle_final_assessment(user_message, language, context)

def handle_final_assessment(user_message, language, context):
    """Provide final triage assessment and recommendation"""
    
    # Determine final triage based on all collected information
    if context.get('triage_decision'):
        triage_result = context['triage_decision']
    else:
        triage_result = determine_final_triage(context, language)
    
    # Generate personalized response based on conversation history
    symptoms_text = ', '.join(context['symptoms_mentioned'])
    triage_response = TRIAGE_RESPONSES[triage_result][language]
    
    if language == 'ar':
        response = f"بناءً على الأعراض اللي وصفتها والمعلومات اللي إدتني إياها، ده تقييمي وتوصيتي:\n\n{triage_response}\n\nلو عندك أي أسئلة تانية أو لو الأعراض اتغيرت، ما تترددش تسألني تاني."
    else:
        response = f"Based on the symptoms you've described and the information you've provided, here is my assessment and recommendation:\n\n{triage_response}\n\nIf you have any other questions or if your symptoms change, please don't hesitate to ask me again."
    
    # Reset context for new conversation
    context['stage'] = 'greeting'
    
    return {
        'response': response,
        'triage_result': triage_result,
        'model': 'conversational-ai',
        'conversation_stage': 'final_assessment',
        'tokens_generated': len(response.split())
    }

# Helper functions for conversational AI

def has_symptom_keywords(message, language):
    """Check if message contains symptom-related keywords (including Sudanese dialect)"""
    symptom_words = {
        'en': ['pain', 'hurt', 'ache', 'fever', 'sick', 'feel', 'symptom', 'problem', 'headache', 'stomach', 'chest', 'tired', 'dizzy', 'nausea'],
        'ar': ['ألم', 'وجع', 'مرض', 'حمى', 'أعراض', 'مشكلة', 'صداع', 'معدة', 'صدر', 'تعب', 'دوخة', 'موجوع', 'مريض', 'حاسس', 'وجعان', 'تعبان', 'مدوخ', 'غثيان', 'قيء', 'سخونة', 'رأسي', 'بطني', 'صدري']
    }
    words = symptom_words.get(language, symptom_words['en'])
    return any(word in message.lower() for word in words)

def has_emergency_keywords(message, language):
    """Check for emergency keywords in message (including Sudanese dialect)"""
    emergency_words = {
        'en': ['emergency', 'urgent', 'severe', 'worst', 'can\'t breathe', '10/10', 'crushing', 'sudden', 'blood', 'unconscious', 'excruciating', 'unbearable'],
        'ar': ['طارئ', 'عاجل', 'شديد', 'لا أستطيع', 'دم', 'فجأة', 'غائب عن الوعي', 'قوي جداً', 'ما قادر', 'خلاص', 'مو طبيعي', 'كتير', 'جداً', 'مش طايق', 'وجع كتير', 'ألم رهيب', 'مو قادر أتنفس']
    }
    words = emergency_words.get(language, emergency_words['en'])
    return any(word in message.lower() for word in words)

def extract_symptoms(message, language):
    """Extract mentioned symptoms from message"""
    # Simple extraction - can be made more sophisticated
    symptoms = []
    symptom_patterns = {
        'en': {
            'headache': ['headache', 'head pain', 'migraine', 'head ache', 'skull pain'],
            'chest_pain': ['chest pain', 'heart pain', 'cardiac pain', 'chest ache'],
            'fever': ['fever', 'temperature', 'hot', 'chills', 'burning up'],
            'nausea': ['nauseous', 'sick', 'vomiting', 'throw up', 'queasy'],
            'fatigue': ['tired', 'exhausted', 'weak', 'drained', 'worn out'],
            'dizziness': ['dizzy', 'lightheaded', 'vertigo', 'spinning'],
            'abdominal_pain': ['stomach pain', 'belly pain', 'stomach ache', 'abdominal pain']
        },
        'ar': {
            'صداع': ['صداع', 'ألم رأس', 'رأسي موجوع', 'وجع رأس', 'راسي بيوجع'],
            'ألم صدر': ['ألم صدر', 'ألم قلب', 'صدري موجوع', 'وجع صدر', 'قلبي بيوجع'],
            'حمى': ['حمى', 'سخونة', 'حرارة', 'سخن', 'محموم', 'جسمي سخن'],
            'غثيان': ['غثيان', 'قيء', 'مرض', 'نفسي مقفولة', 'مقرف', 'عايز أستفرغ'],
            'تعب': ['تعب', 'إرهاق', 'ضعف', 'تعبان', 'مرهق', 'خلاص', 'ما عندي قوة'],
            'دوخة': ['دوخة', 'دايخ', 'مدوخ', 'الدنيا بتدور', 'حاسس بدوار'],
            'ألم بطن': ['ألم بطن', 'بطني موجوع', 'وجع بطن', 'معدتي بتوجع', 'ألم معدة']
        }
    }
    
    patterns = symptom_patterns.get(language, symptom_patterns['en'])
    message_lower = message.lower()
    
    for symptom, keywords in patterns.items():
        for keyword in keywords:
            if keyword in message_lower:
                symptoms.append(symptom)
                break
    
    return symptoms

def extract_severity_indicators(message, language):
    """Extract severity indicators from user response"""
    indicators = []
    message_lower = message.lower()
    
    # Severity scale indicators
    if any(num in message_lower for num in ['8', '9', '10']):
        indicators.append('high_severity')
    elif any(num in message_lower for num in ['6', '7']):
        indicators.append('moderate_severity')
    elif any(num in message_lower for num in ['1', '2', '3', '4', '5']):
        indicators.append('low_severity')
    
    # Severity descriptors
    high_severity_words = {
        'en': ['severe', 'worst', 'unbearable', 'excruciating', 'terrible'],
        'ar': ['شديد', 'قوي', 'لا يحتمل', 'فظيع']
    }
    
    words = high_severity_words.get(language, high_severity_words['en'])
    if any(word in message_lower for word in words):
        indicators.append('high_severity')
    
    return indicators

def get_symptom_name(category, language):
    """Get localized symptom name (including Sudanese dialect)"""
    names = {
        'en': {
            'chest_pain': 'chest pain',
            'headache': 'headache',
            'abdominal_pain': 'abdominal pain',
            'breathing': 'breathing difficulties',
            'fever': 'fever',
            'injury': 'injury',
            'back_pain': 'back pain',
            'joint_pain': 'joint pain',
            'skin_issues': 'skin problems'
        },
        'ar': {
            'chest_pain': 'وجع في الصدر',
            'headache': 'صداع',
            'abdominal_pain': 'وجع في البطن',
            'breathing': 'مشاكل في التنفس',
            'fever': 'سخونة',
            'injury': 'إصابة',
            'back_pain': 'وجع ظهر',
            'joint_pain': 'وجع مفاصل',
            'skin_issues': 'مشاكل جلدية'
        }
    }
    return names.get(language, names['en']).get(category, category)

def provide_emergency_response(message, language, context):
    """Provide emergency response (including Sudanese dialect)"""
    if language == 'ar':
        response = "⚠️ بناءً على الأعراض اللي وصفتها، هذا شايف إنه حالة طارئة. لازم تروح أقرب طوارئ حالاً أو تتصل بخدمات الإسعاف.\n\nما تتأخر في طلب العلاج العاجل. صحتك مهمة!"
    else:
        response = "⚠️ Based on the symptoms you've described, this appears to be an emergency situation. You need to go to the nearest ER immediately or call emergency services.\n\nDo not delay in seeking urgent medical care."
    
    return {
        'response': response,
        'triage_result': 'emergency',
        'model': 'conversational-ai',
        'conversation_stage': 'emergency_response',
        'tokens_generated': len(response.split())
    }

def determine_final_triage(context, language):
    """Determine final triage based on conversation context"""
    
    # Check for high severity indicators
    if 'high_severity' in context.get('severity_indicators', []):
        return 'emergency'
    
    # Check symptom category
    category = context.get('current_category')
    if category in ['chest_pain', 'breathing']:
        return 'emergency'
    elif category in ['injury', 'abdominal_pain', 'headache']:
        if 'moderate_severity' in context.get('severity_indicators', []):
            return 'in_person'
        else:
            return 'telemedicine'
    
    # Default based on number of symptoms and answers
    if len(context.get('symptoms_mentioned', [])) > 2:
        return 'in_person'
    else:
        return 'telemedicine'

def analyze_with_dialogpt(symptoms, language='en'):
    """Legacy DialoGPT function - now redirects to conversational AI"""
    return analyze_with_conversational_ai(symptoms, language)
    
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
    
    if not TRANSFORMERS_AVAILABLE:
        chatbot_logger.info("Transformers not available - using enhanced rules fallback")
        triage_result = analyze_symptoms_enhanced(symptoms, language)
        response_text = generate_local_response(symptoms, triage_result, language)
        return {
            'response': response_text,
            'triage_result': triage_result,
            'confidence': 0.8,
            'model': 'enhanced-rules-system',
            'processing_time_ms': 50
        }
    
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

def detect_symptom_category(symptoms, language='en'):
    """Detect the main symptom category from user input"""
    symptoms_lower = symptoms.lower()
    
    # Symptom keywords for categorization
    symptom_patterns = {
        'en': {
            'chest_pain': ['chest pain', 'chest hurt', 'heart pain', 'cardiac pain', 'chest pressure', 'chest tightness'],
            'headache': ['headache', 'head pain', 'head hurt', 'migraine', 'head ache'],
            'abdominal_pain': ['stomach pain', 'belly pain', 'abdominal pain', 'stomach hurt', 'stomach ache'],
            'breathing': ['shortness of breath', 'difficulty breathing', 'can\'t breathe', 'breathing problem', 'breathless'],
            'fever': ['fever', 'high temperature', 'hot', 'chills', 'temperature'],
            'injury': ['injury', 'hurt', 'accident', 'fell', 'cut', 'broken', 'sprain', 'wound'],
            'back_pain': ['back pain', 'lower back', 'spine pain', 'back ache'],
            'joint_pain': ['joint pain', 'arthritis', 'knee pain', 'shoulder pain'],
            'skin_issues': ['rash', 'itching', 'skin problem', 'allergy', 'hives']
        },
        'ar': {
            'chest_pain': ['ألم في الصدر', 'ألم الصدر', 'وجع الصدر', 'ألم قلب', 'صدري بيوجع', 'قلبي موجوع'],
            'headache': ['صداع', 'ألم رأس', 'ألم في الرأس', 'وجع رأس', 'رأسي بيوجع', 'راسي موجوع'],
            'abdominal_pain': ['ألم في البطن', 'ألم بطن', 'وجع بطن', 'ألم معدة', 'بطني بتوجع', 'معدتي موجوعة'],
            'breathing': ['ضيق تنفس', 'صعوبة تنفس', 'لا أستطيع التنفس', 'ما قادر أتنفس', 'نفسي قصير', 'تنفسي تقيل'],
            'fever': ['حمى', 'سخونة', 'حرارة عالية', 'سخن', 'محموم', 'جسمي حار'],
            'injury': ['إصابة', 'جرح', 'كسر', 'حادث', 'سقطت', 'ضربة', 'رضة'],
            'back_pain': ['ألم ظهر', 'وجع ظهر', 'ظهري بيوجع', 'ألم في الظهر'],
            'joint_pain': ['ألم مفاصل', 'وجع ركبة', 'ألم كتف', 'مفاصلي بتوجع'],
            'skin_issues': ['طفح جلدي', 'حكة', 'مشكلة جلد', 'حساسية', 'جلدي مو طبيعي']
        }
    }
    
    patterns = symptom_patterns.get(language, symptom_patterns['en'])
    
    for category, keywords in patterns.items():
        for keyword in keywords:
            if keyword in symptoms_lower:
                return category
    
    return None

def determine_triage_from_category(category, symptoms, language):
    """Determine triage level based on symptom category and content"""
    symptoms_lower = symptoms.lower()
    
    # High-risk categories that usually need emergency care
    emergency_categories = ['chest_pain', 'breathing']
    
    # Check for emergency keywords in any category
    emergency_words = {
        'en': ['severe', 'worst ever', 'can\'t breathe', '10/10', 'excruciating', 'sudden', 'crushing'],
        'ar': ['شديد', 'لا أستطيع', 'فجأة', 'قوي جداً']
    }
    
    emergency_terms = emergency_words.get(language, emergency_words['en'])
    has_emergency_terms = any(term in symptoms_lower for term in emergency_terms)
    
    if category in emergency_categories or has_emergency_terms:
        return 'emergency'
    elif category == 'injury':
        return 'in_person'
    elif category in ['headache', 'abdominal_pain']:
        # These can be either emergency or in-person based on severity
        return 'in_person' if has_emergency_terms else 'telemedicine'
    else:
        return 'telemedicine'

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
def ai_assessment():
    """
    AI Symptom Assessment - Medical triage chatbot
    """
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        response = jsonify({'status': 'ok'})
        
        # Allow specific origins that match our CORS config
        allowed_origins = [
            'https://hello-50.github.io',
            'http://localhost:5500',
            'http://127.0.0.1:5500'
        ]
        
        if origin in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
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
        conversation_id = data.get('conversation_id', None)
        
        # Get or create conversation context from session
        from flask import session
        if conversation_id:
            session_key = f"conversation_{conversation_id}"
            conversation_context = session.get(session_key, None)
        else:
            conversation_context = None
        
        chatbot_logger.info(f"AI Assessment chat request - Language: {language}, Message length: {len(user_message)}, Conversation ID: {conversation_id}")
        
        try:
            # Use conversational AI as primary option
            ai_result = analyze_with_conversational_ai(user_message, language, conversation_context)
            
            # Save conversation context back to session
            if conversation_id and 'conversation_context' in locals():
                session[session_key] = conversation_context
            
            response_data = {
                'response': ai_result['response'],
                'triage_result': ai_result['triage_result'],
                'language': language,
                'model': ai_result['model'],
                'conversation_stage': ai_result.get('conversation_stage', 'unknown'),
                'usage_tokens': ai_result.get('tokens_generated', 0),
                'conversation_id': conversation_id,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            chatbot_logger.info(f"Conversational AI response successful - Stage: {ai_result.get('conversation_stage')}, Triage: {ai_result['triage_result']}, Tokens: {ai_result.get('tokens_generated', 0)}")
            
            return APIResponse.success(
                data=response_data,
                message="AI assessment response generated successfully"
            )
            
        except Exception as e:
            chatbot_logger.error(f"Conversational AI error: {str(e)}")
            
            # Fallback to basic conversational response
            if has_symptom_keywords(user_message, language) or has_emergency_keywords(user_message, language):
                # Emergency fallback
                if has_emergency_keywords(user_message, language):
                    triage_result = 'emergency'
                else:
                    triage_result = analyze_symptoms_enhanced(user_message, language)
                
                response_text = TRIAGE_RESPONSES[triage_result][language]
                
                # Add fallback indicator in a conversational way
                if language == 'ar':
                    ai_response = f"فهمت الأعراض اللي بتحكي عنها. {response_text}\n\nلو محتاج مساعدة أكتر أو الوضع اتغير، كلمني تاني."
                else:
                    ai_response = f"I understand the symptoms you're describing. {response_text}\n\nIf you need more help or your situation changes, please let me know."
            else:
                # Greeting fallback
                if language == 'ar':
                    ai_response = "أهلاً وسهلاً! أنا هنا عشان أساعدك في تقييم أي أعراض صحية. شنو اللي بيضايقك اليوم؟"
                else:
                    ai_response = "Hello! I'm here to help assess any health symptoms you might have. What's bothering you today?"
                triage_result = None
            
            response_data = {
                'response': ai_response,
                'triage_result': triage_result,
                'language': language,
                'model': 'conversational-fallback',
                'conversation_stage': 'fallback',
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
    local_model_available = TRANSFORMERS_AVAILABLE and (local_model is not None and local_tokenizer is not None)
    
    # System info with safe torch access
    system_info = {
        'transformers_available': TRANSFORMERS_AVAILABLE,
    }
    
    if torch is not None:
        system_info.update({
            'cuda_available': torch.cuda.is_available(),
            'torch_version': torch.__version__
        })
    else:
        system_info.update({
            'cuda_available': False,
            'torch_version': 'not_installed'
        })
    
    return APIResponse.success(
        data={
            'service': 'ai-assessment',
            'status': 'healthy',
            'ai_models': {
                'dialogpt': {
                    'available': local_model_available,
                    'model': current_app.config.get('HUGGINGFACE_MODEL_NAME', 'microsoft/DialoGPT-medium'),
                    'status': 'ready' if local_model_available else 'dependencies_missing'
                },
                'fallback': {
                    'available': True,
                    'model': 'enhanced-rules-system',
                    'status': 'ready'
                }
            },
            'system_info': system_info,
            'timestamp': datetime.utcnow().isoformat()
        },
        message="AI Assessment service health check completed"
    )