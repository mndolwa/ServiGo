from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "seeker",
        "service",
        "status",
        "assigned_provider",
        "reassignment_attempts",
        "provider_response_deadline",
        "total_amount",
        "scheduled_at",
    )
    list_filter = ("status",)
