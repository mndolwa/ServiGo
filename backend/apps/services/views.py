from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.emails import send_servigo_email
from apps.accounts.models import User
from apps.notifications.models import Notification

from .models import Service, ServiceCategory
from .serializers import ServiceCategorySerializer, ServiceSerializer


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all().order_by("name")
    serializer_class = ServiceCategorySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = (
        Service.objects.select_related("provider", "provider__provider_profile", "category")
        .annotate(booking_count=Count("bookings", distinct=True))
        .all()
        .order_by("-id")
    )
    serializer_class = ServiceSerializer
    filterset_fields = ["category", "provider", "is_active", "is_published"]
    search_fields = ["title", "description", "provider__first_name", "provider__last_name", "provider__location"]
    ordering_fields = ["price", "created_at", "provider__provider_profile__rating_avg"]

    def _notify_admins(self, title: str, message: str):
        for admin_user in User.objects.filter(role=User.Role.ADMIN):
            Notification.objects.create(user=admin_user, title=title, message=message, type="service")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role == User.Role.ADMIN:
            return queryset
        if user.is_authenticated and user.role == User.Role.PROVIDER:
            if self.action in ["list", "retrieve", "publish"]:
                return queryset.filter(
                    Q(provider=user)
                    | Q(
                        is_active=True,
                        is_published=True,
                        provider__is_provider_approved=True,
                        provider__provider_profile__is_available=True,
                        provider__provider_profile__is_online=True,
                    )
                ).distinct()
            return queryset.filter(provider=user)

        queryset = queryset.filter(
            is_active=True,
            is_published=True,
            provider__is_provider_approved=True,
            provider__provider_profile__is_available=True,
            provider__provider_profile__is_online=True,
        )
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")
        location = self.request.query_params.get("location")
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        if location:
            queryset = queryset.filter(provider__location__icontains=location)

        if user.is_authenticated and user.role == User.Role.SEEKER and user.location:
            queryset = queryset.annotate(
                proximity_rank=Case(
                    When(provider__location__icontains=user.location, then=Value(0)),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            ).order_by("proximity_rank", "-booking_count", "-id")
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role != User.Role.PROVIDER:
            raise permissions.PermissionDenied("Only providers can create services")
        if not user.is_provider_approved:
            raise permissions.PermissionDenied("Provider must be approved by admin")
        service = serializer.save(provider=user, is_published=False, published_at=None)
        self._notify_admins(
            "Service submitted for review",
            f"Provider {user.email} submitted service '{service.title}' for publishing.",
        )

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can publish services."}, status=status.HTTP_403_FORBIDDEN)
        service = self.get_object()
        publish = bool(request.data.get("publish", True))
        service.is_published = publish
        service.published_at = timezone.now() if publish else None
        service.save(update_fields=["is_published", "published_at"])
        Notification.objects.create(
            user=service.provider,
            title="Service publication status updated",
            message=(
                f"Your service '{service.title}' was {'published' if publish else 'unpublished'} by ServiGo admin."
            ),
            type="service",
        )
        send_servigo_email(
            subject="ServiGo service publication update",
            message=(
                f"Hello {service.provider.get_full_name() or service.provider.email},\n\n"
                f"Your service '{service.title}' has been {'published' if publish else 'unpublished'} by ServiGo admin."
            ),
            recipient=service.provider.email,
        )
        self._notify_admins(
            "Service publication updated",
            f"Service '{service.title}' publication changed to {service.is_published} by admin.",
        )
        return Response(self.get_serializer(service).data)
