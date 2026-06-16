import os
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from ..database import get_db
from ..models import Image, Detection, ChatHistory
from ..services.yolo import process_image_with_yolo
from ..services.gemini import generate_caption, chat_with_image, analyze_image_objects
from ..schemas import ChatHistory as ChatHistorySchema
from .images import run_ai_pipeline_bg

router = APIRouter(prefix="/images", tags=["ai"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class ChatRequest(BaseModel):
    message: str

@router.post("/{image_id}/rerun-detection")
def redetect(image_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    try:
        original_path = os.path.join(BASE_DIR, img.original_image_path.lstrip('/'))
        
        # Clear old detections
        db.query(Detection).filter(Detection.image_id == image_id).delete(synchronize_session=False)
        img.processing_status = "pending"
        db.commit()
        
        # Queue background task using image_id directly
        background_tasks.add_task(run_ai_pipeline_bg, image_id, original_path)
        
        return {"status": "success"}
    except Exception as e:
        print(f"Error in redetect: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{image_id}/caption")
def get_caption(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    original_path = os.path.join(BASE_DIR, img.original_image_path.lstrip('/'))
    
    try:
        caption = generate_caption(original_path, img.detections)
        return {"caption": caption}
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable, please try again")

@router.get("/{image_id}/chat", response_model=List[ChatHistorySchema])
def get_chat_history(image_id: int, db: Session = Depends(get_db)):
    return db.query(ChatHistory).filter(ChatHistory.image_id == image_id).order_by(ChatHistory.timestamp).all()

@router.post("/{image_id}/chat")
def chat(image_id: int, request: ChatRequest, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    original_path = os.path.join(BASE_DIR, img.original_image_path.lstrip('/'))
    
    # Save user message
    user_msg = ChatHistory(image_id=image_id, role="user", message=request.message)
    db.add(user_msg)
    db.commit()
    
    # Get history
    history = db.query(ChatHistory).filter(ChatHistory.image_id == image_id).order_by(ChatHistory.timestamp).all()
    
    try:
        answer = chat_with_image(original_path, history[:-1], request.message, img.detections)
        
        # Save assistant message
        assistant_msg = ChatHistory(image_id=image_id, role="assistant", message=answer)
        db.add(assistant_msg)
        db.commit()
        
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable, please try again")
