from django.contrib import admin
from .models import Image, Detection, ChatHistory

@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ('title', 'upload_timestamp')

@admin.register(Detection)
class DetectionAdmin(admin.ModelAdmin):
    list_display = ('image', 'label', 'confidence')
    list_filter = ('label',)

@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ('image', 'role', 'timestamp')
    list_filter = ('role',)
