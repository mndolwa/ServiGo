from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .emails import send_servigo_email
from .permissions import IsAdmin
from .serializers import (
    ApproveProviderSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)
from apps.bookings.models import Booking
from apps.services.geo import haversine_km
from apps.services.models import Service
from .location import extract_client_ip, geolocate_ip

User = get_user_model()


class AuthViewSet(viewsets.GenericViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=["post"])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        if user.role == User.Role.PROVIDER:
            send_servigo_email(
                subject="ServiGo registration successful - approval pending",
                message=(
                    "Welcome to ServiGo. Your provider account was created successfully and is waiting for admin approval. "
                    "You will receive another email once your account is approved."
                ),
                recipient=user.email,
            )
        else:
            send_servigo_email(
                subject="Welcome to ServiGo",
                message="Your ServiGo account was registered successfully. You can now sign in and start using the platform.",
                recipient=user.email,
            )

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class PlatformSummaryView(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        return Response(
            {
                "active_users": User.objects.filter(is_active=True).count(),
                "verified_providers": User.objects.filter(
                    role=User.Role.PROVIDER,
                    is_active=True,
                    is_provider_approved=True,
                ).count(),
                "completed_jobs": Booking.objects.filter(status__in=[Booking.Status.COMPLETED, Booking.Status.PAID]).count(),
                "active_services": Service.objects.filter(is_active=True, is_published=True).count(),
            }
        )


class UserViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = User.objects.all().order_by("-id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.ADMIN:
            queryset = User.objects.all().order_by("-id")
            role = self.request.query_params.get("role")
            if role:
                queryset = queryset.filter(role=role)
            approved = self.request.query_params.get("is_provider_approved")
            if approved is not None:
                queryset = queryset.filter(is_provider_approved=approved.lower() == "true")
            return queryset
        if self.request.query_params.get("role") == User.Role.PROVIDER:
            queryset = User.objects.filter(
                role=User.Role.PROVIDER,
                is_provider_approved=True,
                provider_profile__is_available=True,
            ).order_by("-id")
            if self.request.query_params.get("exclude_self") == "true":
                queryset = queryset.exclude(id=user.id)
            return queryset
        return User.objects.filter(id=user.id)

    @action(detail=False, methods=["get"])
    def me(self, request):
        user = request.user
        if user.latitude is None or user.longitude is None or not user.location:
            ip = extract_client_ip(request)
            if ip:
                geo = geolocate_ip(ip)
                if geo:
                    user.latitude = user.latitude if user.latitude is not None else geo["latitude"]
                    user.longitude = user.longitude if user.longitude is not None else geo["longitude"]
                    if not user.location and geo.get("location"):
                        user.location = geo["location"]
                    user.save(update_fields=["latitude", "longitude", "location"])
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def presence(self, request):
        user = request.user
        is_online = bool(request.data.get("is_online", True))
        user.is_online = is_online
        user.last_seen_at = timezone.now()
        update_fields = ["is_online", "last_seen_at"]

        if user.latitude is None and request.data.get("latitude") is not None:
            user.latitude = float(request.data.get("latitude"))
            update_fields.append("latitude")
        if user.longitude is None and request.data.get("longitude") is not None:
            user.longitude = float(request.data.get("longitude"))
            update_fields.append("longitude")
        if not user.location and request.data.get("location"):
            user.location = str(request.data.get("location"))
            update_fields.append("location")
        user.save(update_fields=update_fields)

        if user.role == User.Role.PROVIDER and hasattr(user, "provider_profile"):
            profile = user.provider_profile
            profile.is_online = is_online
            # Providers online are considered available by default.
            if is_online:
                profile.is_available = True
                profile.save(update_fields=["is_online", "is_available"])
            else:
                profile.save(update_fields=["is_online"])

        return Response({"detail": "Presence updated.", "is_online": user.is_online, "last_seen_at": user.last_seen_at})

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def nearby_providers(self, request):
        try:
            lat = float(request.query_params.get("lat"))
            lng = float(request.query_params.get("lng"))
            radius = float(request.query_params.get("radius", 10))
        except (TypeError, ValueError):
            return Response({"detail": "lat, lng and radius must be valid numbers."}, status=status.HTTP_400_BAD_REQUEST)

        category_id = request.query_params.get("category")

        providers = User.objects.filter(
            role=User.Role.PROVIDER,
            is_provider_approved=True,
            provider_profile__is_available=True,
            provider_profile__is_online=True,
            latitude__isnull=False,
            longitude__isnull=False,
        ).select_related("provider_profile")

        if category_id:
            providers = providers.filter(
                services__category_id=category_id,
                services__is_active=True,
                services__is_published=True,
            ).distinct()

        results = []
        for provider in providers:
            distance_km = haversine_km(lat, lng, provider.latitude, provider.longitude)
            if distance_km <= radius:
                services_qs = Service.objects.filter(
                    provider=provider,
                    is_active=True,
                    is_published=True,
                )
                if category_id:
                    services_qs = services_qs.filter(category_id=category_id)

                results.append(
                    {
                        "provider": UserSerializer(provider).data,
                        "distance_km": round(distance_km, 2),
                        "rating": provider.provider_profile.rating_avg,
                        "matching_services": services_qs.count(),
                    }
                )

        results.sort(key=lambda item: (item["distance_km"], -item["rating"]))
        return Response({"count": len(results), "results": results})

    def perform_update(self, serializer):
        target_user = self.get_object()
        old_first_name = target_user.first_name
        old_last_name = target_user.last_name
        old_phone = target_user.phone
        old_location = target_user.location
        updated_user = serializer.save()

        if self.request.user.role == User.Role.ADMIN:
            changed_fields = []
            if old_first_name != updated_user.first_name or old_last_name != updated_user.last_name:
                changed_fields.append("name")
            if old_phone != updated_user.phone:
                changed_fields.append("phone")
            if old_location != updated_user.location:
                changed_fields.append("location")
            if changed_fields:
                send_servigo_email(
                    subject="ServiGo profile updated by admin",
                    message=(
                        "Your profile details were updated by a ServiGo admin: "
                        f"{', '.join(changed_fields)}."
                    ),
                    recipient=updated_user.email,
                )

    def destroy(self, request, *args, **kwargs):
        target_user = self.get_object()
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can delete users."}, status=status.HTTP_403_FORBIDDEN)
        if target_user.id == request.user.id:
            return Response({"detail": "Admin cannot delete own account."}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def approve_provider(self, request, pk=None):
        provider = self.get_object()
        if provider.role != User.Role.PROVIDER:
            return Response({"detail": "User is not a provider."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ApproveProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider.is_provider_approved = serializer.validated_data["is_provider_approved"]
        provider.save(update_fields=["is_provider_approved"])

        if provider.is_provider_approved:
            send_servigo_email(
                subject="ServiGo provider approved",
                message="Your provider account has been approved. You can now publish services for seekers.",
                recipient=provider.email,
            )

        return Response(UserSerializer(provider).data)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated, IsAdmin])
    def verify_provider(self, request):
        provider_id = request.data.get("provider_id")
        provider = User.objects.filter(id=provider_id, role=User.Role.PROVIDER).first()
        if not provider:
            return Response({"detail": "Provider not found."}, status=status.HTTP_404_NOT_FOUND)

        provider.is_provider_approved = bool(request.data.get("is_provider_approved", True))
        provider.save(update_fields=["is_provider_approved"])

        if provider.is_provider_approved:
            send_servigo_email(
                subject="ServiGo provider approved",
                message="Your provider account has been verified and approved by admin.",
                recipient=provider.email,
            )
        return Response(UserSerializer(provider).data)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
