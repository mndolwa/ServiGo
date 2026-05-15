from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Payment
from .services import apply_payment_completion_split


@receiver(post_save, sender=Payment)
def ensure_split_fields_populated(sender, instance: Payment, created: bool, **kwargs):
    if instance.status not in {Payment.Status.HELD, Payment.Status.RELEASED, Payment.Status.PAID}:
        return
    if instance.total_amount and instance.admin_commission and instance.provider_earning:
        return
    apply_payment_completion_split(instance)
