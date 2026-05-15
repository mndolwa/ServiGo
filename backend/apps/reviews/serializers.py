from rest_framework import serializers

from .models import Rating, Review


class ReviewSerializer(serializers.ModelSerializer):
    seeker_name = serializers.CharField(source="seeker.get_full_name", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "booking", "seeker", "seeker_name", "provider", "rating", "comment", "created_at"]
        read_only_fields = ["id", "seeker", "provider", "created_at"]


class RatingSerializer(serializers.ModelSerializer):
    from_user_name = serializers.CharField(source="from_user.get_full_name", read_only=True)
    to_user_name = serializers.CharField(source="to_user.get_full_name", read_only=True)

    class Meta:
        model = Rating
        fields = ["id", "from_user", "from_user_name", "to_user", "to_user_name", "rating", "review", "created_at"]
        read_only_fields = ["id", "from_user", "created_at"]
