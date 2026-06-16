import os
from ultralytics import YOLOWorld
from ..models import Detection
from sqlalchemy.orm import Session

# Load the pretrained model (it will download on first run)
# Using yolov8s-world.pt for open-vocabulary exact object detection
MODEL_NAME = os.getenv("YOLO_MODEL", "yolov8s-world.pt")
model = YOLOWorld(MODEL_NAME)

def process_image_with_yolo(db: Session, image_record, original_path: str, custom_classes: list[str] = None):
    """
    Run YOLO inference and save bounding boxes to DB.
    Frontend will be responsible for drawing the bounding boxes.
    """
    
    # Set exact custom classes from Gemini semantic analysis
    if custom_classes:
        model.set_classes(custom_classes)
    else:
        # Fallback to standard generic COCO classes if none provided
        model.set_classes(["person", "car", "chair", "laptop", "bottle"])
        
    # Run inference with a lower confidence threshold for better detection
    results = model(original_path, conf=0.05)
    
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
