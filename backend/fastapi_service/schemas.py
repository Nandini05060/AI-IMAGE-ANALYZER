from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class DetectionBase(BaseModel):
    label: str
    confidence: float
    bbox_xmin: float
    bbox_ymin: float
    bbox_xmax: float
    bbox_ymax: float

class Detection(DetectionBase):
    id: int
    image_id: int

    class Config:
        from_attributes = True

class ChatHistoryBase(BaseModel):
    role: str
    message: str

class ChatHistory(ChatHistoryBase):
    id: int
    image_id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class ImageBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class Image(ImageBase):
    id: int
    original_image_path: str
    processed_image_path: Optional[str] = None
    upload_timestamp: datetime
    detections: List[Detection] = []
    chat_history: List[ChatHistory] = []

    class Config:
        from_attributes = True
