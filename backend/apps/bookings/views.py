from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from apps.accounts.emails import send_servigo_email
from apps.accounts.models import User
from apps.chats.models import ChatRoom
from apps.notifications.models import Notification
from apps.notifications.services import NotificationDispatcher, NotificationPayload

from .models import Booking
from .serializers import BookingSerializer
from .services import BookingLifecycleService, BookingReassignmentService


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("seeker", "service", "service__provider", "assigned_provider").all().order_by("-created_at")
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["status", "service"]

    def get_queryset(self):
        BookingReassignmentService().process_expired_pending_bookings()
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.PROVIDER:
            return queryset.filter(Q(service__provider=user) | Q(assigned_provider=user))
        return queryset.filter(seeker=user)

    def _notify_admins(self, title: str, message: str):
        for admin_user in User.objects.filter(role=User.Role.ADMIN):
            Notification.objects.create(user=admin_user, title=title, message=message, type="booking")

    def _notify_provider(self, provider, title: str, message: str):
        if provider:
            Notification.objects.create(user=provider, title=title, message=message, type="booking")

    def _dispatcher(self) -> NotificationDispatcher:
        return NotificationDispatcher()

    def _email_booking_participants(self, booking: Booking, subject: str, message: str):
        provider = booking.assigned_provider or booking.service.provider
        seeker_contact = f"Seeker contact: {booking.seeker.email} / {booking.seeker.phone or 'no-phone'}"
        provider_contact = f"Provider contact: {provider.email if provider else 'n/a'} / {(provider.phone if provider else '') or 'no-phone'}"
        combined_message = f"{message}\n\n{seeker_contact}\n{provider_contact}"
        send_servigo_email(subject=subject, message=combined_message, recipient=booking.seeker.email)
        if provider and provider.email != booking.seeker.email:
            send_servigo_email(subject=subject, message=combined_message, recipient=provider.email)

    def perform_create(self, serializer):
        BookingReassignmentService().process_expired_pending_bookings()
        service = serializer.validated_data["service"]
        if not service.is_active or not service.is_published:
            raise PermissionDenied("Service is not available for booking yet")
        if not service.provider.is_provider_approved:
            raise PermissionDenied("Provider is not approved yet")
        booking = serializer.save(
            seeker=self.request.user,
            total_amount=service.price,
            assigned_provider=service.provider,
            response_timeout_seconds=serializer.validated_data.get("response_timeout_seconds", 300),
            pending_at=timezone.now(),
            provider_response_deadline=timezone.now() + timedelta(seconds=serializer.validated_data.get("response_timeout_seconds", 300)),
        )
        self._notify_provider(service.provider, "New booking request", f"You have a new booking for {service.title}.")
        self._notify_admins("New booking request", f"Booking #{booking.id} was created for {service.title}.")
        self._email_booking_participants(
            booking,
            "ServiGo booking created",
            (
                f"Booking #{booking.id} for service '{service.title}' was created successfully. "
                "You will receive further updates in app and by email."
            ),
        )

        dispatcher = self._dispatcher()
        seeker_payload = NotificationPayload(
            title="Booking created",
            message=(
                f"Booking #{booking.id} confirmed. Provider: {service.provider.get_full_name() or service.provider.email}, "
                f"Phone: {service.provider.phone or 'not-set'}."
            ),
            kind="booking",
        )
        provider_payload = NotificationPayload(
            title="New booking request",
            message=(
                f"Booking #{booking.id} from {booking.seeker.get_full_name() or booking.seeker.email}. "
                f"Phone: {booking.seeker.phone or 'not-set'}."
            ),
            kind="booking",
        )
        dispatcher.send_sms_if_offline(booking.seeker, seeker_payload)
        dispatcher.send_sms_if_offline(service.provider, provider_payload)
        return booking

    @action(detail=True, methods=["post"])
    def set_status(self, request, pk=None):
        BookingReassignmentService().process_expired_pending_bookings()
        booking = self.get_object()
        status_value = request.data.get("status")
        if status_value not in Booking.Status.values:
            return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        allowed = False
        if user.role == User.Role.ADMIN:
            allowed = True
        elif user.role == User.Role.PROVIDER and user.id in {booking.service.provider_id, booking.assigned_provider_id}:
            allowed = status_value in [
                Booking.Status.ACCEPTED,
                Booking.Status.ARRIVED,
                Booking.Status.REJECTED,
                Booking.Status.IN_PROGRESS,
                Booking.Status.COMPLETED,
            ]
        elif user.role == User.Role.SEEKER and booking.seeker_id == user.id:
            allowed = status_value == Booking.Status.CANCELLED and booking.status in [
                Booking.Status.PENDING,
                Booking.Status.ACCEPTED,
                Booking.Status.ARRIVED,
                Booking.Status.IN_PROGRESS,
            ]

        if not allowed:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)

        previous_status = booking.status
        try:
            booking = BookingLifecycleService.apply_transition(booking, status_value)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if status_value == Booking.Status.CANCELLED and user.role == User.Role.SEEKER:
            if previous_status == Booking.Status.PENDING:
                Notification.objects.create(
                    user=booking.seeker,
                    title="Booking cancelled",
                    message=f"Booking #{booking.id} was cancelled before provider approval.",
                    type="booking",
                )
                self._notify_provider(
                    booking.assigned_provider or booking.service.provider,
                    "Booking cancelled",
                    f"Booking #{booking.id} was cancelled before approval.",
                )
                self._notify_admins(
                    "Booking cancelled",
                    f"Booking #{booking.id} was cancelled by seeker before provider approval.",
                )
                self._email_booking_participants(
                    booking,
                    "ServiGo booking cancelled",
                    f"Booking #{booking.id} was cancelled before provider approval.",
                )
                return Response(self.get_serializer(booking).data)

            booking.status = previous_status
            booking.save(update_fields=["status"])
            Notification.objects.create(
                user=booking.seeker,
                title="Cancellation request submitted",
                message=(
                    f"Booking #{booking.id} is already approved/in progress. "
                    "Admin has been informed and may apply a penalty before cancellation."
                ),
                type="booking",
            )
            self._notify_provider(
                booking.assigned_provider or booking.service.provider,
                "Cancellation requested",
                f"Seeker requested cancellation for booking #{booking.id}. Await admin decision.",
            )
            self._notify_admins(
                "Cancellation decision required",
                f"Booking #{booking.id} cancellation requested after approval. Review for penalty application.",
            )
            self._email_booking_participants(
                booking,
                "ServiGo cancellation review required",
                (
                    f"Booking #{booking.id} has a cancellation request after approval/in-progress stage. "
                    "ServiGo admin will review and may apply a penalty before cancellation."
                ),
            )
            return Response(
                {
                    "detail": "Cancellation request sent to admin. Booking remains active until admin decision.",
                    "booking": self.get_serializer(booking).data,
                },
                status=status.HTTP_202_ACCEPTED,
            )

        if status_value == Booking.Status.ACCEPTED:
            room, created = ChatRoom.objects.get_or_create(
                booking=booking,
                defaults={"seeker": booking.seeker, "provider": booking.assigned_provider or booking.service.provider},
            )
            if created:
                Notification.objects.create(
                    user=booking.seeker,
                    title="Live chat enabled",
                    message=f"Provider accepted booking #{booking.id}. Chat is now available.",
                    type="chat",
                )
                self._notify_provider(
                    booking.assigned_provider or booking.service.provider,
                    "Live chat enabled",
                    f"You can now chat with customer for booking #{booking.id}.",
                )

        Notification.objects.create(
            user=booking.seeker,
            title="Booking status updated",
            message=f"Booking #{booking.id} status changed to {booking.status}.",
            type="booking",
        )
        self._notify_admins("Booking status updated", f"Booking #{booking.id} changed to {booking.status} by {user.role}.")
        self._email_booking_participants(
            booking,
            "ServiGo booking status updated",
            f"Booking #{booking.id} status changed to {booking.status}.",
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=["post"])
    def redirect_provider(self, request, pk=None):
        BookingReassignmentService().process_expired_pending_bookings()
        booking = self.get_object()
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.PROVIDER]:
            return Response({"detail": "Not allowed"}, status=status.HTTP_403_FORBIDDEN)
        if user.role == User.Role.PROVIDER and user.id not in {booking.service.provider_id, booking.assigned_provider_id}:
            return Response({"detail": "Only assigned/current provider can redirect this booking."}, status=status.HTTP_403_FORBIDDEN)

        target_provider_id = request.data.get("target_provider_id")
        target_provider = User.objects.filter(id=target_provider_id, role=User.Role.PROVIDER, is_provider_approved=True).first()
        if not target_provider:
            return Response({"detail": "Target provider not found"}, status=status.HTTP_400_BAD_REQUEST)
        if target_provider.id in {booking.service.provider_id, booking.assigned_provider_id}:
            return Response({"detail": "Please choose a different provider for redirect."}, status=status.HTTP_400_BAD_REQUEST)

        booking.assigned_provider = target_provider
        booking.status = Booking.Status.PENDING
        timeout_seconds = booking.response_timeout_seconds or 300
        booking.provider_response_deadline = timezone.now() + timedelta(seconds=timeout_seconds)
        booking.reassignment_attempts = booking.reassignment_attempts + 1
        booking.save(update_fields=["assigned_provider", "status", "provider_response_deadline", "reassignment_attempts"])

        Notification.objects.create(
            user=booking.seeker,
            title="Booking redirected",
            message=f"Booking #{booking.id} has been redirected to another provider for faster handling.",
            type="booking",
        )
        self._notify_provider(
            target_provider,
            "New redirected booking",
            f"Booking #{booking.id} was redirected to you and needs your response.",
        )
        self._notify_provider(
            booking.service.provider,
            "Booking redirected away",
            f"Booking #{booking.id} was redirected to {target_provider.get_full_name() or target_provider.email}.",
        )
        self._notify_admins(
            "Booking redirected",
            f"Booking #{booking.id} was redirected from {booking.service.provider.email} to {target_provider.email}.",
        )
        self._email_booking_participants(
            booking,
            "ServiGo booking redirected",
            (
                f"Booking #{booking.id} has been redirected to provider "
                f"{target_provider.get_full_name() or target_provider.email} for faster service handling."
            ),
        )
        return Response(self.get_serializer(booking).data)

    @action(detail=False, methods=["post"])
    def reassign_stale(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can run stale reassignment."}, status=status.HTTP_403_FORBIDDEN)
        reassigned = BookingReassignmentService().process_expired_pending_bookings()
        return Response({"detail": "Processed stale bookings.", "reassigned": reassigned})

    @action(detail=False, methods=["get"])
    def admin_all(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can view all bookings."}, status=status.HTTP_403_FORBIDDEN)
        queryset = Booking.objects.select_related("seeker", "service", "service__provider", "assigned_provider").all().order_by("-created_at")
        return Response(self.get_serializer(queryset, many=True).data)
