from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from apps.bookings.models import Booking

from .models import Payment, ProviderWallet
from config.sse import broadcast_event


def compute_payment_split(total_amount: Decimal, commission_rate: float) -> tuple[Decimal, Decimal]:
    commission = (total_amount * Decimal(str(commission_rate))).quantize(Decimal("0.01"))
    earning = (total_amount - commission).quantize(Decimal("0.01"))
    return commission, earning


@transaction.atomic
def apply_payment_completion_split(payment: Payment) -> Payment:
    commission, earning = compute_payment_split(payment.total_amount or payment.amount, payment.commission_rate)
    payment.total_amount = payment.total_amount or payment.amount
    payment.admin_commission = commission
    payment.provider_earning = earning
    payment.platform_commission = commission
    payment.provider_payout_amount = earning
    payment.save(
        update_fields=[
            "total_amount",
            "admin_commission",
            "provider_earning",
            "platform_commission",
            "provider_payout_amount",
        ]
    )
    return payment


@transaction.atomic
def move_pending_to_available_wallet(booking: Booking, amount: Decimal) -> ProviderWallet:
    provider = booking.assigned_provider or booking.service.provider
    wallet, _ = ProviderWallet.objects.get_or_create(provider=provider)

    if wallet.pending_balance < amount:
        wallet.pending_balance = Decimal("0.00")
    else:
        wallet.pending_balance = (wallet.pending_balance - amount).quantize(Decimal("0.01"))

    wallet.balance = (wallet.balance + amount).quantize(Decimal("0.01"))
    wallet.save(update_fields=["balance", "pending_balance", "updated_at"])
    try:
        broadcast_event({
            "type": "provider_wallet_updated",
            "provider_id": provider.id,
            "balance": str(wallet.balance),
            "pending_balance": str(wallet.pending_balance),
        })
    except Exception:
        pass
    return wallet


@transaction.atomic
def add_pending_wallet_on_completion(booking: Booking, amount: Decimal) -> ProviderWallet:
    provider = booking.assigned_provider or booking.service.provider
    wallet, _ = ProviderWallet.objects.get_or_create(provider=provider)
    wallet.pending_balance = (wallet.pending_balance + amount).quantize(Decimal("0.01"))
    wallet.save(update_fields=["pending_balance", "updated_at"])
    try:
        broadcast_event({
            "type": "provider_wallet_updated",
            "provider_id": provider.id,
            "balance": str(wallet.balance),
            "pending_balance": str(wallet.pending_balance),
        })
    except Exception:
        pass
    return wallet
