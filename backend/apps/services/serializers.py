from rest_framework import serializers

from .models import Service, ServiceCategory


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "slug"]


class ServiceSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.get_full_name", read_only=True)
    provider_email = serializers.EmailField(source="provider.email", read_only=True)
    provider_location = serializers.CharField(source="provider.location", read_only=True)
    provider_is_online = serializers.BooleanField(source="provider.provider_profile.is_online", read_only=True)
    provider_is_available = serializers.BooleanField(source="provider.provider_profile.is_available", read_only=True)
    provider_rating = serializers.FloatField(source="provider.provider_profile.rating_avg", read_only=True)
    booking_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "provider",
            "provider_name",
            "provider_email",
            "provider_location",
            "provider_is_online",
            "provider_is_available",
            "provider_rating",
            "category",
            "title",
            "description",
            "price",
            "duration_minutes",
            "is_active",
            "is_published",
            "published_at",
            "booking_count",
            "created_at",
        ]
        read_only_fields = ["id", "provider", "is_published", "published_at", "booking_count", "created_at"]
