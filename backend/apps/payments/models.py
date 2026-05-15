from django.conf import settings
from django.db import models

from apps.bookings.models import Booking


class Payment(models.Model):
    class Method(models.TextChoices):
        MPESA = "mpesa", "M-Pesa"
        AIRTEL = "airtel", "Airtel Money"
        TIGO = "tigo", "Tigo Pesa"
        CARD = "card", "Bank Card"

    class Status(models.TextChoices):
        INITIATED = "initiated", "Initiated"
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        HELD = "held", "Held"
        RELEASED = "released", "Released"
        REFUNDED = "refunded", "Refunded"

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name="payment")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=Method.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    transaction_reference = models.CharField(max_length=100, blank=True)
    provider_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    admin_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    provider_earning = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Payment<{self.booking_id}>"

    @property
    def commission_rate(self) -> float:
        config = CommissionConfig.objects.first()
        if config:
            return float(config.commission_rate)
        return settings.PLATFORM_COMMISSION_RATE

    def save(self, *args, **kwargs):
        if not self.total_amount:
            self.total_amount = self.amount
        super().save(*args, **kwargs)


class AdminWallet(models.Model):
    total_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"AdminWallet<balance={self.total_balance}>"


class AdminWalletTransaction(models.Model):
    class EntryType(models.TextChoices):
        COMMISSION_IN = "commission_in", "Commission In"

    wallet = models.ForeignKey(AdminWallet, on_delete=models.CASCADE, related_name="transactions")
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="wallet_entry")
    entry_type = models.CharField(max_length=30, choices=EntryType.choices, default=EntryType.COMMISSION_IN)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"AdminWalletTransaction<payment={self.payment_id}, amount={self.amount}>"


class PaymentReceipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="receipt")
    receipt_number = models.CharField(max_length=30, unique=True, blank=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="generated_receipts")
    generated_for = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="receipts")
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.receipt_number:
            self.receipt_number = f"RCPT-{self.created_at:%Y%m%d}-{self.id:05d}"
            super().save(update_fields=["receipt_number"])

    def __str__(self) -> str:
        return self.receipt_number or f"PaymentReceipt<{self.id}>"


class CommissionConfig(models.Model):
    commission_rate = models.DecimalField(max_digits=5, decimal_places=4, default=0.1000)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"CommissionConfig<rate={self.commission_rate}>"


class ProviderWallet(models.Model):
    provider = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pending_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"ProviderWallet<provider={self.provider_id}, balance={self.balance}, pending={self.pending_balance}>"
