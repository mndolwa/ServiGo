from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str, **extra_fields):
        if not email:
            raise ValueError("The email must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, username=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str = None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        SEEKER = "seeker", "Service Seeker"
        PROVIDER = "provider", "Service Provider"
        IT_SUPPORT = "it_support", "IT Support"

    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SEEKER)
    is_provider_approved = models.BooleanField(default=False)
    # Document fields
    profile_image = models.ImageField(upload_to="profile_images/", null=True, blank=True)
    national_id_number = models.CharField(max_length=50, blank=True, help_text="NIN or National ID")
    nin_document = models.FileField(upload_to="nin_documents/", null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()


class ProviderProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="provider_profile")
    service_type = models.CharField(max_length=100, blank=True)
    service_name = models.CharField(max_length=150, blank=True)
    service_category = models.CharField(max_length=100, blank=True)
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    bio = models.TextField(blank=True)
    is_online = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    rating_avg = models.FloatField(default=0)
    rating_count = models.PositiveIntegerField(default=0)
    # Document fields for provider verification
    service_certificate = models.FileField(upload_to="provider_certificates/", null=True, blank=True, help_text="Service qualification certificate (PDF)")
    birth_certificate = models.FileField(upload_to="provider_birth_certs/", null=True, blank=True, help_text="Birth certificate (PDF)")
    cv_document = models.FileField(upload_to="provider_cvs/", null=True, blank=True, help_text="CV/Resume (PDF)")

    def save(self, *args, **kwargs):
        # Provider marked online should be considered available by default.
        if self.is_online and not self.is_available:
            self.is_available = True
        if self.is_online and self.user and not self.user.is_online:
            self.user.is_online = True
            self.user.last_seen_at = timezone.now()
            self.user.save(update_fields=["is_online", "last_seen_at"])
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"ProviderProfile<{self.user.email}>"
