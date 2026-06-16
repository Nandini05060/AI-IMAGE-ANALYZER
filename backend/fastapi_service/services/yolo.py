import os
from ultralytics import YOLO
from ..models import Detection
from sqlalchemy.orm import Session

# Load the pretrained model (it will download on first run)
# Using yolov8s.pt for better accuracy than nano
MODEL_NAME = os.getenv("YOLO_MODEL", "yolov8s.pt")
model = YOLO(MODEL_NAME)

def process_image_with_yolo(db: Session, image_record, original_path: str):
    """
    Run YOLO inference and save bounding boxes to DB.
    Frontend will be responsible for drawing the bounding boxes.
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
    return detections
