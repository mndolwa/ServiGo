from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.notifications.services import NotificationDispatcher, NotificationPayload
from apps.services.geo import haversine_km

from .models import Booking


STATUS_TRANSITIONS = {
    Booking.Status.PENDING: {
        Booking.Status.ACCEPTED,
        Booking.Status.REJECTED,
        Booking.Status.CANCELLED,
    },
    Booking.Status.ACCEPTED: {
        Booking.Status.ARRIVED,
        Booking.Status.IN_PROGRESS,
        Booking.Status.CANCELLED,
    },
    Booking.Status.ARRIVED: {
        Booking.Status.IN_PROGRESS,
        Booking.Status.COMPLETED,
        Booking.Status.CANCELLED,
    },
    Booking.Status.IN_PROGRESS: {
        Booking.Status.COMPLETED,
        Booking.Status.CANCELLED,
    },
    Booking.Status.COMPLETED: {
        Booking.Status.PAID,
    },
    Booking.Status.PAID: set(),
    Booking.Status.CANCELLED: set(),
    Booking.Status.REJECTED: set(),
}

STATUS_TIMESTAMP_FIELDS = {
    Booking.Status.PENDING: "pending_at",
    Booking.Status.ACCEPTED: "accepted_at",
    Booking.Status.ARRIVED: "arrived_at",
    Booking.Status.REJECTED: "rejected_at",
    Booking.Status.IN_PROGRESS: "in_progress_at",
    Booking.Status.COMPLETED: "completed_at",
    Booking.Status.PAID: "paid_at",
    Booking.Status.CANCELLED: "cancelled_at",
}


class BookingLifecycleService:
    response_timeout_seconds = 300

    @classmethod
    def validate_transition(cls, booking: Booking, target_status: str) -> None:
        if target_status not in Booking.Status.values:
            raise ValidationError("Invalid status")

        allowed = STATUS_TRANSITIONS.get(booking.status, set())
        if target_status not in allowed:
            raise ValidationError(f"Invalid transition from {booking.status} to {target_status}")

    @classmethod
    def apply_transition(cls, booking: Booking, target_status: str) -> Booking:
        cls.validate_transition(booking, target_status)
        now = timezone.now()
        booking.status = target_status

        ts_field = STATUS_TIMESTAMP_FIELDS.get(target_status)
        if ts_field and getattr(booking, ts_field) is None:
            setattr(booking, ts_field, now)

        if target_status == Booking.Status.PENDING:
            timeout_seconds = booking.response_timeout_seconds or cls.response_timeout_seconds
            booking.provider_response_deadline = now + timedelta(seconds=timeout_seconds)
        elif target_status in {Booking.Status.ACCEPTED, Booking.Status.CANCELLED, Booking.Status.REJECTED}:
            booking.provider_response_deadline = None

        update_fields = ["status", "provider_response_deadline"]
        if ts_field:
            update_fields.append(ts_field)
        booking.save(update_fields=update_fields)
        return booking


class BookingReassignmentService:
    _last_sweep_at = None
    min_sweep_interval_seconds = 30

    def __init__(self):
        self.dispatcher = NotificationDispatcher()

    def _provider_distance(self, booking: Booking, provider: User) -> float:
        if booking.seeker.latitude is None or booking.seeker.longitude is None:
            return 0.0
        if provider.latitude is None or provider.longitude is None:
            return float("inf")
        return haversine_km(booking.seeker.latitude, booking.seeker.longitude, provider.latitude, provider.longitude)

    def find_next_provider(self, booking: Booking, exclude_ids: set[int] | None = None) -> User | None:
        exclude_ids = exclude_ids or set()
        if booking.assigned_provider_id:
            exclude_ids.add(booking.assigned_provider_id)
        if booking.service.provider_id:
            exclude_ids.add(booking.service.provider_id)

        providers = (
            User.objects.filter(
                role=User.Role.PROVIDER,
                is_provider_approved=True,
                provider_profile__is_available=True,
                provider_profile__is_online=True,
                services__category=booking.service.category,
                services__is_active=True,
                services__is_published=True,
            )
            .exclude(id__in=exclude_ids)
            .distinct()
            .select_related("provider_profile")
        )

        ranked = sorted(
            providers,
            key=lambda provider: (
                self._provider_distance(booking, provider),
                -(provider.provider_profile.rating_avg if hasattr(provider, "provider_profile") else 0),
            ),
        )
        return ranked[0] if ranked else None

    def reassign(self, booking: Booking, reason: str, exclude_ids: set[int] | None = None) -> bool:
        previous_provider = booking.assigned_provider
        next_provider = self.find_next_provider(booking=booking, exclude_ids=exclude_ids)
        if not next_provider:
            return False

        if previous_provider and hasattr(previous_provider, "provider_profile") and "did not respond" in reason.lower():
            profile = previous_provider.provider_profile
            profile.is_available = False
            profile.save(update_fields=["is_available"])

        booking.assigned_provider = next_provider
        booking.status = Booking.Status.PENDING
        booking.provider_response_deadline = timezone.now() + timedelta(seconds=booking.response_timeout_seconds or BookingLifecycleService.response_timeout_seconds)
        booking.reassignment_attempts = booking.reassignment_attempts + 1
        if booking.pending_at is None:
            booking.pending_at = timezone.now()
        booking.save(
            update_fields=[
                "assigned_provider",
                "status",
                "provider_response_deadline",
                "reassignment_attempts",
                "pending_at",
            ]
        )

        self.dispatcher.send_in_app(
            booking.seeker,
            NotificationPayload(
                title="Booking reassigned",
                message=f"Booking #{booking.id} was reassigned to another nearby provider.",
                kind="booking",
            ),
        )
        self.dispatcher.send_sms_if_offline(
            booking.seeker,
            NotificationPayload(
                title="Booking reassigned",
                message=f"Booking #{booking.id} was moved to another provider to avoid delay.",
                kind="booking",
            ),
        )
        self.dispatcher.send_in_app(
            next_provider,
            NotificationPayload(
                title="New reassigned booking",
                message=(
                    f"Booking #{booking.id} requires your response within "
                    f"{booking.response_timeout_seconds or BookingLifecycleService.response_timeout_seconds} seconds."
                ),
                kind="booking",
            ),
        )
        self.dispatcher.send_sms_if_offline(
            next_provider,
            NotificationPayload(
                title="New reassigned booking",
                message=f"Booking #{booking.id} needs your response now.",
                kind="booking",
            ),
        )

        admins = User.objects.filter(role=User.Role.ADMIN)
        self.dispatcher.broadcast(
            admins,
            NotificationPayload(
                title="Booking auto-reassigned",
                message=f"Booking #{booking.id} was auto-reassigned. Reason: {reason}",
                kind="booking",
            ),
            include_email=False,
        )
        return True

    def process_expired_pending_bookings(self) -> int:
        now = timezone.now()
        if self.__class__._last_sweep_at and (now - self.__class__._last_sweep_at).total_seconds() < self.min_sweep_interval_seconds:
            return 0

        stale_bookings = Booking.objects.filter(
            status=Booking.Status.PENDING,
            provider_response_deadline__isnull=False,
            provider_response_deadline__lt=now,
        ).select_related("seeker", "service", "service__category", "assigned_provider")

        reassigned = 0
        for booking in stale_bookings:
            timeout_seconds = booking.response_timeout_seconds or BookingLifecycleService.response_timeout_seconds
            if self.reassign(booking, reason=f"Provider did not respond within {timeout_seconds} seconds"):
                reassigned += 1

        self.__class__._last_sweep_at = now
        return reassigned
