import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db, SessionLocal
from ..models import Image, Detection, ChatHistory
from ..schemas import Image as ImageSchema
from ..services.yolo import process_image_with_yolo
from ..services.gemini import analyze_image_objects

router = APIRouter(prefix="/images", tags=["images"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEDIA_UPLOADS = os.path.join(BASE_DIR, 'media', 'uploads')
MEDIA_PROCESSED = os.path.join(BASE_DIR, 'media', 'processed')

def run_ai_pipeline_bg(image_id: int, original_path: str):
    """Background task to run Gemini and YOLO-World."""
    db = SessionLocal()
    try:
        img = db.query(Image).filter(Image.id == image_id).first()
        if not img:
            return
            
        custom_classes = analyze_image_objects(original_path)
        process_image_with_yolo(db, img, original_path, custom_classes)
        
        img.processing_status = 'completed'
        db.commit()
    except Exception as e:
        print(f"Background AI processing failed: {e}")
        img = db.query(Image).filter(Image.id == image_id).first()
        if img:
            img.processing_status = 'failed'
            db.commit()
    finally:
        db.close()

@router.get("/", response_model=List[ImageSchema])
def list_images(db: Session = Depends(get_db)):
    return db.query(Image).all()

@router.get("/{image_id}", response_model=ImageSchema)
def get_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return img

@router.post("/", response_model=ImageSchema)
def upload_image(
    background_tasks: BackgroundTasks,
    title: str = Form(""),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    filename = file.filename
    original_path = os.path.join(MEDIA_UPLOADS, filename)
    
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create db record
    db_img = Image(
        title=title or filename.split('.')[0],
        description=description,
        original_image_path=f"/media/uploads/{filename}",
        processing_status="pending"
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    
    # Queue background task
    background_tasks.add_task(run_ai_pipeline_bg, db_img.id, original_path)
    
    return db_img

@router.delete("/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Delete file
    original_full_path = os.path.join(BASE_DIR, img.original_image_path.lstrip('/'))
    if os.path.exists(original_full_path):
        os.remove(original_full_path)
        
    db.delete(img)
    db.commit()
    return {"status": "success"}

@router.patch("/{image_id}", response_model=ImageSchema)
def update_image(
    image_id: int,
    title: str = Form(None),
    description: str = Form(None),
    db: Session = Depends(get_db)
):
    """Update title/notes of an image."""
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if title is not None:
        img.title = title
    if description is not None:
        img.description = description
        
    db.commit()
    db.refresh(img)
    return img

@router.put("/{image_id}/replace", response_model=ImageSchema)
def replace_image(
    image_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Replace image file and rerun detection."""
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    filename = file.filename
    original_path = os.path.join(MEDIA_UPLOADS, filename)
    
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    img.original_image_path = f"/media/uploads/{filename}"
    img.processing_status = "pending"
    
    # Clear old detections
    db.query(Detection).filter(Detection.image_id == image_id).delete(synchronize_session=False)
    db.commit()
    
    # Queue background task
    background_tasks.add_task(run_ai_pipeline_bg, image_id, original_path)
    
    db.refresh(img)
    return img
