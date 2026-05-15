from django.contrib import admin
from django.contrib.auth.hashers import identify_hasher

from .emails import send_servigo_email
from .models import ProviderProfile, User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "role", "is_provider_approved", "is_staff")
    list_filter = ("role", "is_provider_approved", "is_staff")
    search_fields = ("email", "first_name", "last_name")

    def save_model(self, request, obj, form, change):
        previous = None
        if change:
            previous = User.objects.filter(pk=obj.pk).first()

        # If password entered in admin isn't hashed yet, hash before saving.
        if obj.password:
            try:
                identify_hasher(obj.password)
            except Exception:
                obj.set_password(obj.password)
        super().save_model(request, obj, form, change)

        if change and previous:
            changed_fields = []
            if previous.first_name != obj.first_name or previous.last_name != obj.last_name:
                changed_fields.append("name")
            if previous.phone != obj.phone:
                changed_fields.append("phone")
            if previous.location != obj.location:
                changed_fields.append("location")
            if previous.is_provider_approved != obj.is_provider_approved and obj.role == User.Role.PROVIDER and obj.is_provider_approved:
                send_servigo_email(
                    subject="ServiGo provider approved",
                    message="Your provider account has been approved by admin. You can now publish services.",
                    recipient=obj.email,
                )
            elif changed_fields:
                send_servigo_email(
                    subject="ServiGo profile updated by admin",
                    message=f"Your profile details were updated by admin: {', '.join(changed_fields)}.",
                    recipient=obj.email,
                )


@admin.register(ProviderProfile)
class ProviderProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "service_type", "is_online", "is_available", "rating_avg", "rating_count")
