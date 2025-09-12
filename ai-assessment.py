import os
import tempfile
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
from openai import OpenAI
import uvicorn
from typing import Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Medical Triage API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

openai_client = None

SYSTEM_PROMPT = """You are a bilingual medical triage assistant.
You must automatically reply in the same language as the user (Arabic or English).
Your role is to ask relevant follow-up questions about the user's symptoms and then classify the situation into one of three categories:
(1) Remote consultation is sufficient
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
- Remote consultation: minor symptoms, general health questions, medication inquiries, follow-ups for stable conditions

Always be compassionate and thorough in your questioning before making a recommendation."""

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class TranscriptionResponse(BaseModel):
    transcription: str

def initialize_openai():
    global openai_client
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY environment variable not set")
        raise ValueError("OpenAI API key is required. Please set the OPENAI_API_KEY environment variable.")
    
    openai_client = OpenAI(api_key=api_key)
    logger.info("OpenAI client initialized successfully")

@app.on_event("startup")
async def startup_event():
    try:
        initialize_openai()
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")

@app.get("/")
async def root():
    return {"message": "Medical Triage API is running", "status": "healthy"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(chat_message: ChatMessage):
    try:
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI client not initialized")
        
        if not chat_message.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        logger.info(f"Received chat message: {chat_message.message[:100]}...")
        
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": chat_message.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        bot_response = response.choices[0].message.content.strip()
        logger.info(f"Generated response: {bot_response[:100]}...")
        
        return ChatResponse(response=bot_response)
        
    except openai.OpenAIError as e:
        logger.error(f"OpenAI API error: {e}")
        error_message = "Sorry, I'm experiencing technical difficulties. Please try again later.\n\nعذراً، أواجه صعوبات تقنية. من فضلك حاول مرة أخرى لاحقاً."
        return ChatResponse(response=error_message)
    except Exception as e:
        logger.error(f"Unexpected error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/stt", response_model=TranscriptionResponse)
async def speech_to_text_endpoint(audio: UploadFile = File(...)):
    try:
        if not openai_client:
            raise HTTPException(status_code=500, detail="OpenAI client not initialized")
        
        if not audio.content_type or not audio.content_type.startswith('audio/'):
            raise HTTPException(status_code=400, detail="Invalid audio file format")
        
        logger.info(f"Received audio file: {audio.filename}, type: {audio.content_type}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
            content = await audio.read()
            temp_audio.write(content)
            temp_audio.flush()
            
            try:
                with open(temp_audio.name, "rb") as audio_file:
                    transcription = openai_client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=None  # Auto-detect language
                    )
                
                transcribed_text = transcription.text.strip()
                logger.info(f"Transcribed text: {transcribed_text}")
                
                return TranscriptionResponse(transcription=transcribed_text)
                
            finally:
                try:
                    os.unlink(temp_audio.name)
                except OSError:
                    pass
        
    except openai.OpenAIError as e:
        logger.error(f"OpenAI API error in STT: {e}")
        return TranscriptionResponse(transcription="")
    except Exception as e:
        logger.error(f"Unexpected error in STT endpoint: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_initialized": openai_client is not None,
        "api_key_set": bool(os.getenv("OPENAI_API_KEY"))
    }

if __name__ == "__main__":
    uvicorn.run(
        "ai-assessment:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )