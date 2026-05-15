from rest_framework import serializers

from .models import ChatMessage, ChatRoom


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.get_full_name", read_only=True)

    class Meta:
        model = ChatMessage
        fields = ["id", "room", "sender", "sender_name", "message", "created_at"]
        read_only_fields = ["id", "room", "sender", "sender_name", "created_at"]


class ChatRoomSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)
    seeker_name = serializers.CharField(source="seeker.get_full_name", read_only=True)
    provider_name = serializers.CharField(source="provider.get_full_name", read_only=True)
    seeker_email = serializers.EmailField(source="seeker.email", read_only=True)
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    seeker_phone = serializers.CharField(source="seeker.phone", read_only=True)
    provider_phone = serializers.CharField(source="provider.phone", read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            "id",
            "booking_id",
            "seeker",
            "seeker_name",
            "provider",
            "provider_name",
            "seeker_email",
            "provider_email",
            "seeker_phone",
            "provider_phone",
            "contact_exchange_allowed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "booking_id", "seeker", "provider", "created_at", "updated_at"]
