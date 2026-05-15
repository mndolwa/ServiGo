from django.contrib import admin

from .models import Notification, SmsGatewayConfig, SmsNotificationLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "type", "is_read", "created_at")
    list_filter = ("type", "is_read")


@admin.register(SmsNotificationLog)
class SmsNotificationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "to_phone", "sender", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("to_phone", "provider_reference", "user__email")


@admin.register(SmsGatewayConfig)
class SmsGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ("id", "sender_number", "backup_sender_number", "backend", "is_active", "updated_at")
