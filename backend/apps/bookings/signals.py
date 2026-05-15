from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from apps.accounts.models import User
from apps.notifications.services import NotificationDispatcher, NotificationPayload

from .models import Booking
from .services import BookingReassignmentService


dispatcher = NotificationDispatcher()


@receiver(pre_save, sender=Booking)
def track_previous_status(sender, instance: Booking, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return
    previous = Booking.objects.filter(pk=instance.pk).only("status").first()
    instance._previous_status = previous.status if previous else None


@receiver(post_save, sender=Booking)
def initialize_pending_metadata(sender, instance: Booking, created: bool, **kwargs):
    if not created:
        return

    now = timezone.now()
    update_fields = []
    if instance.pending_at is None:
        instance.pending_at = now
        update_fields.append("pending_at")
    if instance.provider_response_deadline is None and instance.status == Booking.Status.PENDING:
        timeout_seconds = instance.response_timeout_seconds or 300
        instance.provider_response_deadline = now + timedelta(seconds=timeout_seconds)
        update_fields.append("provider_response_deadline")
    if update_fields:
        instance.save(update_fields=update_fields)


@receiver(post_save, sender=Booking)
def handle_booking_status_events(sender, instance: Booking, created: bool, **kwargs):
    if created:
        return

    previous_status = getattr(instance, "_previous_status", None)
    if previous_status == instance.status:
        return

    provider = instance.assigned_provider or instance.service.provider

    if instance.status == Booking.Status.ACCEPTED:
        payload = NotificationPayload(
            title="Booking accepted",
            message=f"Booking #{instance.id} has been accepted by the provider.",
            kind="booking",
        )
        dispatcher.send_in_app(instance.seeker, payload)
        dispatcher.send_email(instance.seeker, payload)
        dispatcher.send_sms_if_offline(instance.seeker, payload)

    if instance.status == Booking.Status.COMPLETED:
        from apps.payments.models import CommissionConfig
        from apps.payments.services import add_pending_wallet_on_completion, compute_payment_split

        payload = NotificationPayload(
            title="Booking completed",
            message=f"Booking #{instance.id} has been marked completed.",
            kind="booking",
        )
        dispatcher.send_in_app(instance.seeker, payload)
        dispatcher.send_email(instance.seeker, payload)
        dispatcher.send_sms_if_offline(instance.seeker, payload)
        if provider:
            dispatcher.send_in_app(provider, payload)
            dispatcher.send_sms_if_offline(provider, payload)

        config = CommissionConfig.objects.first()
        commission_rate = float(config.commission_rate) if config else float(settings.PLATFORM_COMMISSION_RATE)
        _, earning = compute_payment_split(instance.total_amount, commission_rate)
        add_pending_wallet_on_completion(instance, earning)

    if instance.status == Booking.Status.REJECTED:
        BookingReassignmentService().reassign(
            booking=instance,
            reason="Assigned provider rejected booking",
            exclude_ids={provider.id} if provider else set(),
        )

    admins = User.objects.filter(role=User.Role.ADMIN)
    dispatcher.broadcast(
        admins,
        NotificationPayload(
            title="Booking status changed",
            message=f"Booking #{instance.id} status changed from {previous_status} to {instance.status}.",
            kind="booking",
        ),
        include_email=False,
    )
