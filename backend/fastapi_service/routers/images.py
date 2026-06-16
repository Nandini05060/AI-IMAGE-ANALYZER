import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Image, Detection, ChatHistory
from ..schemas import Image as ImageSchema
from ..services.yolo import process_image_with_yolo

router = APIRouter(prefix="/images", tags=["images"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MEDIA_UPLOADS = os.path.join(BASE_DIR, 'media', 'uploads')
MEDIA_PROCESSED = os.path.join(BASE_DIR, 'media', 'processed')

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
    title: str = Form(""),
    description: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    filename = file.filename
    original_path = os.path.join(MEDIA_UPLOADS, filename)
    processed_filename = f"processed_{filename}"
    processed_path = os.path.join(MEDIA_PROCESSED, processed_filename)
    
    with open(original_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create db record
    db_img = Image(
        title=title or filename.split('.')[0],
        description=description,
        original_image_path=f"/media/uploads/{filename}",
        processed_image_path=f"/media/processed/{processed_filename}"
    )
    db.add(db_img)
    db.commit()
    db.refresh(db_img)
    
    # Process YOLO
    process_image_with_yolo(db, db_img, original_path, processed_path)
    
    db.refresh(db_img)
    return db_img

@router.delete("/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db)):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Delete files
    original_full_path = os.path.join(BASE_DIR, img.original_image_path.lstrip('/'))
    processed_full_path = os.path.join(BASE_DIR, img.processed_image_path.lstrip('/')) if img.processed_image_path else ""
    
    if os.path.exists(original_full_path):
        os.remove(original_full_path)
    if processed_full_path and os.path.exists(processed_full_path):
        os.remove(processed_full_path)
        
    db.delete(img)
    db.commit()
    return {"status": "success"}

@router.put("/{image_id}", response_model=ImageSchema)
def update_image(
    image_id: int,
    title: str = Form(None),
    description: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    img = db.query(Image).filter(Image.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if title is not None:
        img.title = title
    if description is not None:
        img.description = description
        
    if file:
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")
            
        filename = file.filename
        original_path = os.path.join(MEDIA_UPLOADS, filename)
        processed_filename = f"processed_{filename}"
        processed_path = os.path.join(MEDIA_PROCESSED, processed_filename)
        
        with open(original_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        img.original_image_path = f"/media/uploads/{filename}"
        img.processed_image_path = f"/media/processed/{processed_filename}"
        
        # Clear old detections
        db.query(Detection).filter(Detection.image_id == image_id).delete()
        db.commit()
        
        # Process YOLO again
        process_image_with_yolo(db, img, original_path, processed_path)
        
    db.commit()
    db.refresh(img)
    return img
