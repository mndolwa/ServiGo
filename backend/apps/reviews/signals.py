from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.accounts.models import ProviderProfile

from .models import Rating, Review


@receiver(post_save, sender=Review)
@receiver(post_delete, sender=Review)
def update_provider_rating(sender, instance: Review, **kwargs):
    review_summary = Review.objects.filter(provider=instance.provider).aggregate(avg=Avg("rating"), count=Count("id"))
    rating_summary = Rating.objects.filter(to_user=instance.provider).aggregate(avg=Avg("rating"), count=Count("id"))

    review_count = int(review_summary["count"] or 0)
    rating_count = int(rating_summary["count"] or 0)
    total_count = review_count + rating_count
    weighted_avg = 0.0
    if total_count:
        weighted_total = (float(review_summary["avg"] or 0) * review_count) + (float(rating_summary["avg"] or 0) * rating_count)
        weighted_avg = weighted_total / total_count

    profile, _ = ProviderProfile.objects.get_or_create(user=instance.provider)
    profile.rating_avg = float(weighted_avg)
    profile.rating_count = total_count
    profile.save(update_fields=["rating_avg", "rating_count"])


@receiver(post_save, sender=Rating)
@receiver(post_delete, sender=Rating)
def update_provider_rating_from_ratings(sender, instance: Rating, **kwargs):
    if instance.to_user.role != instance.to_user.Role.PROVIDER:
        return
    review_summary = Review.objects.filter(provider=instance.to_user).aggregate(avg=Avg("rating"), count=Count("id"))
    rating_summary = Rating.objects.filter(to_user=instance.to_user).aggregate(avg=Avg("rating"), count=Count("id"))

    review_count = int(review_summary["count"] or 0)
    rating_count = int(rating_summary["count"] or 0)
    total_count = review_count + rating_count
    weighted_avg = 0.0
    if total_count:
        weighted_total = (float(review_summary["avg"] or 0) * review_count) + (float(rating_summary["avg"] or 0) * rating_count)
        weighted_avg = weighted_total / total_count

    profile, _ = ProviderProfile.objects.get_or_create(user=instance.to_user)
    profile.rating_avg = float(weighted_avg)
    profile.rating_count = total_count
    profile.save(update_fields=["rating_avg", "rating_count"])
