from rest_framework import serializers

from .models import Notification, SmsGatewayConfig, SmsNotificationLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "message", "type", "is_read", "created_at"]
        read_only_fields = ["id", "created_at"]


class SmsGatewayConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsGatewayConfig
        fields = ["id", "sender_number", "backup_sender_number", "backend", "webhook_url", "webhook_token", "is_active", "updated_at"]
        read_only_fields = ["id", "updated_at"]


class SmsNotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsNotificationLog
        fields = ["id", "user", "to_phone", "sender", "message", "status", "provider_reference", "created_at"]
        read_only_fields = fields
