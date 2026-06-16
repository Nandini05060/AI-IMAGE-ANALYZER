import os
import sys

sys.path.insert(0, os.path.abspath('backend'))

from fastapi_service.main import app
from fastapi_service.database import SessionLocal
from fastapi_service.models import Image, Detection

db = SessionLocal()
img = db.query(Image).first()
if not img:
    img = Image(title="Test", original_image_path="/media/uploads/test.png", processing_status="completed")
    db.add(img)
    db.commit()
    db.refresh(img)
image_id = img.id

det = Detection(image_id=image_id, label="person", confidence=0.9, bbox_xmin=0, bbox_ymin=0, bbox_xmax=10, bbox_ymax=10)
db.add(det)
db.commit()

print(f"Testing redetect with image_id={image_id}")
try:
    from fastapi import BackgroundTasks
    from fastapi_service.utils import redetect
    tasks = BackgroundTasks()
    res = redetect(image_id, tasks, db)
    print("Success:", res)
except Exception as e:
    print("Error:", e)

for route in app.routes:
    print(route.__class__.__name__, getattr(route, "path", getattr(route, "path_format", "No path")))
    if hasattr(route, "methods"):
        print("  Methods:", route.methods)
