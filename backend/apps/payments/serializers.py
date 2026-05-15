from decimal import Decimal

from rest_framework import serializers

from .models import AdminWallet, AdminWalletTransaction, CommissionConfig, Payment, PaymentReceipt, ProviderWallet


class PaymentSerializer(serializers.ModelSerializer):
    booking_status = serializers.CharField(source="booking.status", read_only=True)
    receipt_number = serializers.CharField(source="receipt.receipt_number", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "id",
            "booking",
            "booking_status",
            "amount",
            "total_amount",
            "method",
            "status",
            "transaction_reference",
            "provider_payout_amount",
            "platform_commission",
            "admin_commission",
            "provider_earning",
            "receipt_number",
            "paid_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "amount",
            "total_amount",
            "status",
            "transaction_reference",
            "provider_payout_amount",
            "platform_commission",
            "admin_commission",
            "provider_earning",
            "paid_at",
            "created_at",
        ]


class InitiatePaymentSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    method = serializers.ChoiceField(choices=Payment.Method.choices)
    phone = serializers.CharField(max_length=20)


class VerifyPaymentSerializer(serializers.Serializer):
    transaction_reference = serializers.CharField(max_length=100)


class ReleasePaymentSerializer(serializers.Serializer):
    release = serializers.BooleanField(default=True)

    def compute_split(self, amount: Decimal, commission_rate: float) -> tuple[Decimal, Decimal]:
        commission = amount * Decimal(str(commission_rate))
        payout = amount - commission
        return payout.quantize(Decimal("0.01")), commission.quantize(Decimal("0.01"))


class PaymentReceiptSerializer(serializers.ModelSerializer):
    payment_id = serializers.IntegerField(source="payment.id", read_only=True)
    payment_amount = serializers.DecimalField(source="payment.amount", max_digits=10, decimal_places=2, read_only=True)
    payment_method = serializers.CharField(source="payment.method", read_only=True)
    payment_status = serializers.CharField(source="payment.status", read_only=True)
    booking_id = serializers.IntegerField(source="payment.booking_id", read_only=True)
    service_title = serializers.CharField(source="payment.booking.service.title", read_only=True)

    class Meta:
        model = PaymentReceipt
        fields = [
            "id",
            "receipt_number",
            "payment_id",
            "booking_id",
            "service_title",
            "payment_amount",
            "payment_method",
            "payment_status",
            "generated_for",
            "generated_by",
            "created_at",
        ]


class AdminWalletTransactionSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="payment.booking_id", read_only=True)
    payment_method = serializers.CharField(source="payment.method", read_only=True)

    class Meta:
        model = AdminWalletTransaction
        fields = [
            "id",
            "booking_id",
            "payment_method",
            "entry_type",
            "amount",
            "description",
            "created_at",
        ]


class AdminWalletSerializer(serializers.ModelSerializer):
    transactions = AdminWalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = AdminWallet
        fields = ["id", "total_balance", "updated_at", "transactions"]


class ProviderWalletSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source="provider.get_full_name", read_only=True)

    class Meta:
        model = ProviderWallet
        fields = ["id", "provider", "provider_name", "balance", "pending_balance", "updated_at"]


class CommissionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommissionConfig
        fields = ["id", "commission_rate", "updated_by", "updated_at"]
        read_only_fields = ["id", "updated_by", "updated_at"]
