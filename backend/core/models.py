from django.db import models

class Image(models.Model):
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    original_image_path = models.CharField(max_length=500)
    processed_image_path = models.CharField(max_length=500, blank=True, null=True)
    upload_timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title or f"Image {self.id}"

class Detection(models.Model):
    image = models.ForeignKey(Image, related_name='detections', on_delete=models.CASCADE)
    label = models.CharField(max_length=100)
    confidence = models.FloatField()
    bbox_xmin = models.FloatField()
    bbox_ymin = models.FloatField()
    bbox_xmax = models.FloatField()
    bbox_ymax = models.FloatField()

    def __str__(self):
        return f"{self.label} ({self.confidence:.2f})"

class ChatHistory(models.Model):
    image = models.ForeignKey(Image, related_name='chat_history', on_delete=models.CASCADE)
    role = models.CharField(max_length=50) # 'user' or 'assistant'
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.role}] {self.message[:20]}"
