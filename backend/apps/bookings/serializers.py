from rest_framework import serializers

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    seeker_name = serializers.CharField(source="seeker.get_full_name", read_only=True)
    provider_id = serializers.IntegerField(source="service.provider.id", read_only=True)
    provider_name = serializers.CharField(source="service.provider.get_full_name", read_only=True)
    assigned_provider_id = serializers.IntegerField(source="assigned_provider.id", read_only=True)
    assigned_provider_name = serializers.CharField(source="assigned_provider.get_full_name", read_only=True)
    service_title = serializers.CharField(source="service.title", read_only=True)
    response_timeout_seconds = serializers.IntegerField(required=False, min_value=30, max_value=3600)

    class Meta:
        model = Booking
        fields = [
            "id",
            "seeker",
            "seeker_name",
            "service",
            "service_title",
            "provider_id",
            "provider_name",
            "assigned_provider_id",
            "assigned_provider_name",
            "scheduled_at",
            "status",
            "response_timeout_seconds",
            "provider_response_deadline",
            "reassignment_attempts",
            "pending_at",
            "accepted_at",
            "arrived_at",
            "in_progress_at",
            "completed_at",
            "paid_at",
            "cancelled_at",
            "rejected_at",
            "notes",
            "total_amount",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "seeker",
            "status",
            "total_amount",
            "provider_response_deadline",
            "reassignment_attempts",
            "pending_at",
            "accepted_at",
            "arrived_at",
            "in_progress_at",
            "completed_at",
            "paid_at",
            "cancelled_at",
            "rejected_at",
            "created_at",
        ]
