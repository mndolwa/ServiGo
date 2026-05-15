from django.contrib import admin

from .models import Service, ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "provider", "price", "is_active", "is_published", "published_at")
    list_filter = ("is_active", "is_published", "category")
    search_fields = ("title", "provider__email")
