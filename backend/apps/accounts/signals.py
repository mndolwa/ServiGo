from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ProviderProfile, User


@receiver(post_save, sender=User)
def create_provider_profile(sender, instance: User, created: bool, **kwargs):
    if created and instance.role == User.Role.PROVIDER:
        ProviderProfile.objects.create(user=instance)
