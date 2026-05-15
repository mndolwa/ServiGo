from django.conf import settings
from django.db import models


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=30, default="system")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Notification<{self.user_id}:{self.title}>"


class SmsNotificationLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sms_logs")
    to_phone = models.CharField(max_length=20)
    sender = models.CharField(max_length=40)
    message = models.TextField()
    status = models.CharField(max_length=30, default="queued")
    provider_reference = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"SmsNotificationLog<{self.to_phone}:{self.status}>"


class SmsGatewayConfig(models.Model):
    sender_number = models.CharField(max_length=40, default="+255 786 225 687")
    backup_sender_number = models.CharField(max_length=40, blank=True)
    backend = models.CharField(max_length=20, default="console")
    webhook_url = models.URLField(blank=True)
    webhook_token = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk:
            existing = SmsGatewayConfig.objects.first()
            if existing:
                self.pk = existing.pk
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"SmsGatewayConfig<{self.sender_number}>"
