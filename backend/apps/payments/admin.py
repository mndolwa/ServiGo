from django.contrib import admin

from .models import AdminWallet, AdminWalletTransaction, CommissionConfig, Payment, PaymentReceipt, ProviderWallet


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "booking",
        "method",
        "status",
        "amount",
        "total_amount",
        "provider_earning",
        "admin_commission",
        "provider_payout_amount",
        "platform_commission",
    )
    list_filter = ("method", "status")


@admin.register(AdminWallet)
class AdminWalletAdmin(admin.ModelAdmin):
    list_display = ("id", "total_balance", "updated_at")


@admin.register(AdminWalletTransaction)
class AdminWalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "wallet", "payment", "entry_type", "amount", "created_at")
    list_filter = ("entry_type",)


@admin.register(PaymentReceipt)
class PaymentReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "payment", "generated_for", "generated_by", "created_at")
    search_fields = ("receipt_number", "payment__transaction_reference")


@admin.register(ProviderWallet)
class ProviderWalletAdmin(admin.ModelAdmin):
    list_display = ("id", "provider", "balance", "pending_balance", "updated_at")
    search_fields = ("provider__email",)


@admin.register(CommissionConfig)
class CommissionConfigAdmin(admin.ModelAdmin):
    list_display = ("id", "commission_rate", "updated_by", "updated_at")
