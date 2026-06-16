import os
import time
import google.generativeai as genai
from PIL import Image

def setup_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=api_key)

def get_model():
    # Use gemini-2.5-flash as specified
    return genai.GenerativeModel('gemini-2.5-flash')

def generate_caption(image_path: str, detections: list) -> str:
    """Generate a caption using Gemini 2.5 Flash."""
    setup_gemini()
    model = get_model()
    
    img = Image.open(image_path)
    
    prompt = "Please provide a descriptive caption for this image."
    if detections:
        labels = [d.label for d in detections]
        prompt += f" Context: An object detection model has identified the following objects in the image: {', '.join(labels)}."
    
    retries = 3
    for attempt in range(retries):
        try:
            response = model.generate_content([prompt, img])
            return response.text
        except Exception as e:
            if attempt == retries - 1:
                raise e
            time.sleep(2 ** attempt)  # Exponential backoff

def chat_with_image(image_path: str, history: list, new_message: str, detections: list) -> str:
    """Chat with the image maintaining conversation history."""
    setup_gemini()
    model = get_model()
    
    img = Image.open(image_path)
    
    # Construct conversation context
    context = ""
    if detections:
        labels = [d.label for d in detections]
        context += f"Context: Detected objects include {', '.join(labels)}.\n"
        
    for msg in history:
        role_str = "User" if msg.role == 'user' else "Assistant"
        context += f"{role_str}: {msg.message}\n"
        
    prompt = f"{context}\nUser: {new_message}\nAssistant:"
    
    retries = 3
    for attempt in range(retries):
        try:
            response = model.generate_content([prompt, img])
            return response.text
        except Exception as e:
            if attempt == retries - 1:
                raise e
            time.sleep(2 ** attempt)
