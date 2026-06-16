from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Image(Base):
    __tablename__ = "core_image"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    description = Column(Text)
    original_image_path = Column(String(500))
    processed_image_path = Column(String(500), nullable=True)
    upload_timestamp = Column(DateTime, default=datetime.utcnow)

    detections = relationship("Detection", back_populates="image", cascade="all, delete-orphan")
    chat_history = relationship("ChatHistory", back_populates="image", cascade="all, delete-orphan")


class Detection(Base):
    __tablename__ = "core_detection"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("core_image.id"))
    label = Column(String(100))
    confidence = Column(Float)
    bbox_xmin = Column(Float)
    bbox_ymin = Column(Float)
    bbox_xmax = Column(Float)
    bbox_ymax = Column(Float)

    image = relationship("Image", back_populates="detections")


class ChatHistory(Base):
    __tablename__ = "core_chathistory"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(Integer, ForeignKey("core_image.id"))
    role = Column(String(50))
    message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    image = relationship("Image", back_populates="chat_history")
