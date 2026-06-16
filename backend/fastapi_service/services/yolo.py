import os
from ultralytics import YOLO
from PIL import Image, ImageDraw, ImageFont
from ..models import Detection
from sqlalchemy.orm import Session

# Load the pretrained model (it will download on first run)
# Using yolov8s.pt for better accuracy than nano
MODEL_NAME = os.getenv("YOLO_MODEL", "yolov8s.pt")
model = YOLO(MODEL_NAME)

def process_image_with_yolo(db: Session, image_record, original_path: str, processed_path: str):
    """
    Run YOLO inference, save bounding boxes to DB, and draw them on the image.
    """
    # Run inference with a lower confidence threshold for better detection
    results = model(original_path, conf=0.15)
    
    detections = []
    
    # Process results
    for r in results:
        boxes = r.boxes
        for box in boxes:
            # Box coords
            b = box.xyxy[0].tolist()  # [xmin, ymin, xmax, ymax]
            conf = box.conf[0].item()
            cls = int(box.cls[0].item())
            label = model.names[cls]
            
            # Create Detection record
            det = Detection(
                image_id=image_record.id,
                label=label,
                confidence=conf,
                bbox_xmin=b[0],
                bbox_ymin=b[1],
                bbox_xmax=b[2],
                bbox_ymax=b[3]
            )
            detections.append(det)
            db.add(det)
    
    db.commit()

    # Draw boxes on the image and save to processed_path
    if detections:
        img = Image.open(original_path).convert("RGB")
        draw = ImageDraw.Draw(img)
        
        # Try to load a larger font, fallback to default
        try:
            # Try a common default font path, or just use default size
            font = ImageFont.truetype("arial.ttf", 24)
        except IOError:
            font = ImageFont.load_default()
            
        for det in detections:
            draw.rectangle(
                [det.bbox_xmin, det.bbox_ymin, det.bbox_xmax, det.bbox_ymax],
                outline="red", width=5
            )
            # Use background for text for better visibility
            text_str = f"{det.label} {det.confidence:.2f}"
            
            # Get text bounding box for background
            if hasattr(font, 'getbbox'):
                bbox = font.getbbox(text_str)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            else:
                text_width, text_height = draw.textsize(text_str, font=font)
                
            draw.rectangle(
                [det.bbox_xmin, det.bbox_ymin - text_height - 4, det.bbox_xmin + text_width + 4, det.bbox_ymin],
                fill="red"
            )
            draw.text((det.bbox_xmin + 2, det.bbox_ymin - text_height - 2), text_str, fill="white", font=font)
        
        img.save(processed_path)
    else:
        # If no detections, just copy original
        img = Image.open(original_path)
        img.save(processed_path)
        
    return detections
