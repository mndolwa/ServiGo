from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from apps.accounts.models import User
from apps.bookings.models import Booking

from .models import Rating, Review
from .serializers import RatingSerializer, ReviewSerializer


class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("booking", "provider", "seeker").all().order_by("-created_at")
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.PROVIDER:
            return queryset.filter(provider=user)
        return queryset.filter(seeker=user)

    def create(self, request, *args, **kwargs):
        booking_id = request.data.get("booking")
        booking = Booking.objects.select_related("service", "seeker").get(id=booking_id)

        if booking.seeker_id != request.user.id:
            return Response({"detail": "Only seeker can review this booking."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status != Booking.Status.COMPLETED:
            return Response({"detail": "Booking must be completed before review."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(seeker=request.user, provider=booking.service.provider, booking=booking)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RatingViewSet(viewsets.ModelViewSet):
    queryset = Rating.objects.select_related("from_user", "to_user").all().order_by("-created_at")
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == User.Role.ADMIN:
            return queryset
        return queryset.filter(Q(from_user=user) | Q(to_user=user)).distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        target_user = serializer.validated_data["to_user"]
        if target_user.id == request.user.id:
            return Response({"detail": "You cannot rate yourself."}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(from_user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
