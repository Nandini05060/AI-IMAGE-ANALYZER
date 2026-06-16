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

def generate_content_with_fallback(contents) -> str:
    setup_gemini()
    models = ['gemini-3.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash']
    last_exc = None
    for model_name in models:
        try:
            print(f"Attempting content generation with model: {model_name}")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(contents)
            text = response.text
            print(f"Success with model: {model_name}")
            return text
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            last_exc = e
            continue
    raise last_exc

def analyze_image_objects(image_path: str) -> list[str]:
    """Use Gemini to identify specific exact objects/brands in the image for YOLO-World classes."""
    try:
        setup_gemini()
        img = Image.open(image_path)
    except Exception as e:
        print(f"Gemini object analysis skipped: {e}")
        return ["person", "car", "chair", "laptop"] # Fallback if no API key or image fails to load
        
    prompt = "Identify all distinct objects, brands, and entities in this image. Provide a comprehensive comma-separated list of these items. Return ONLY the list without any other text or punctuation. For example: 'Apple iPhone 14, Starbucks coffee cup, Ray-Ban sunglasses, person, golden retriever, window, table, chair'"
    
    retries = 3
    for attempt in range(retries):
        try:
            text = generate_content_with_fallback([prompt, img]).strip()
            # Parse the comma-separated list
            items = [item.strip() for item in text.split(",") if item.strip()]
            if not items:
                raise ValueError("No items parsed")
            return items
        except Exception as e:
            print(f"Gemini API Error (attempt {attempt+1}): {e}")
            if attempt == retries - 1:
                return ["person", "car", "chair", "laptop"] # Graceful fallback to default classes
            time.sleep(2 ** attempt)

def generate_caption(image_path: str, detections: list) -> str:
    """Generate a caption using Gemini 2.5 Flash."""
    img = Image.open(image_path)
    
    prompt = "Please provide a descriptive caption for this image."
    if detections:
        labels = [d.label for d in detections]
        prompt += f" Context: An object detection model has identified the following objects in the image: {', '.join(labels)}."
    
    retries = 3
    for attempt in range(retries):
        try:
            return generate_content_with_fallback([prompt, img])
        except Exception as e:
            if attempt == retries - 1:
                raise e
            time.sleep(2 ** attempt)  # Exponential backoff

def chat_with_image(image_path: str, history: list, new_message: str, detections: list) -> str:
    """Chat with the image maintaining conversation history."""
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
            return generate_content_with_fallback([prompt, img])
        except Exception as e:
            if attempt == retries - 1:
                raise e
            time.sleep(2 ** attempt)
