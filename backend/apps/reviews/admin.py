from django.contrib import admin

from .models import Rating, Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "provider", "seeker", "rating", "created_at")
    list_filter = ("rating",)


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("id", "from_user", "to_user", "rating", "created_at")
    list_filter = ("rating",)
