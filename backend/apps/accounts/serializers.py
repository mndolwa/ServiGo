from django.contrib.auth import get_user_model
from django.db.models import Q, Sum
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.payments.models import AdminWallet, Payment, ProviderWallet
from .models import ProviderProfile

User = get_user_model()


class ProviderProfileSerializer(serializers.ModelSerializer):
    service_certificate_url = serializers.SerializerMethodField()
    birth_certificate_url = serializers.SerializerMethodField()
    cv_document_url = serializers.SerializerMethodField()

    class Meta:
        model = ProviderProfile
        fields = [
            "service_type",
            "service_name",
            "service_category",
            "years_of_experience",
            "bio",
            "is_online",
            "is_available",
            "rating_avg",
            "rating_count",
            "service_certificate_url",
            "birth_certificate_url",
            "cv_document_url",
        ]
        read_only_fields = ["rating_avg", "rating_count"]

    def get_service_certificate_url(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.role == "admin":
            return obj.service_certificate.url if obj.service_certificate else None
        return None

    def get_birth_certificate_url(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.role == "admin":
            return obj.birth_certificate.url if obj.birth_certificate else None
        return None

    def get_cv_document_url(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.role == "admin":
            return obj.cv_document.url if obj.cv_document else None
        return None


class UserSerializer(serializers.ModelSerializer):
    provider_profile = serializers.SerializerMethodField()
    wallet = serializers.SerializerMethodField()
    profile_image_url = serializers.SerializerMethodField()
    nin_visible = serializers.SerializerMethodField()
    nin_document_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "location",
            "bio",
            "latitude",
            "longitude",
            "is_online",
            "last_seen_at",
            "role",
            "is_active",
            "is_staff",
            "last_login",
            "date_joined",
            "is_provider_approved",
            "provider_profile",
            "wallet",
            "profile_image_url",
            "national_id_number",
            "nin_visible",
            "nin_document_url",
        ]
        read_only_fields = [
            "id",
            "username",
            "is_active",
            "is_staff",
            "last_login",
            "date_joined",
            "is_provider_approved",
            "last_seen_at",
        ]

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.profile_image.url)
            return obj.profile_image.url
        return None

    def get_nin_visible(self, obj):
        request = self.context.get("request")
        # NIN only visible to admin or the user viewing their own profile
        if request and request.user:
            if request.user.role == "admin" or request.user.id == obj.id:
                return True
        return False

    def get_nin_document_url(self, obj):
        request = self.context.get("request")
        # NIN document only visible to admin or the user viewing their own profile
        if request and request.user:
            if request.user.role == "admin" or request.user.id == obj.id:
                return obj.nin_document.url if obj.nin_document else None
        return None

    def get_provider_profile(self, obj):
        if not hasattr(obj, "provider_profile"):
            return None

        request = self.context.get("request")
        # Determine visibility level
        is_admin = request and request.user and request.user.role == "admin"
        is_self = request and request.user and request.user.id == obj.id

        serializer = ProviderProfileSerializer(obj.provider_profile, context={"request": request, "is_admin": is_admin, "is_self": is_self})
        return serializer.data

    def get_wallet(self, obj):
        if obj.role == User.Role.ADMIN:
            wallet, _ = AdminWallet.objects.get_or_create(id=1)
            
            # Recalculate balance from all released payments to ensure accuracy
            total_commission = (
                Payment.objects.filter(status=Payment.Status.RELEASED)
                .aggregate(total=Sum("admin_commission"))
                .get("total")
                or 0
            )
            
            # Update wallet if there's a discrepancy (handles retroactive transactions)
            if wallet.total_balance != total_commission:
                wallet.total_balance = total_commission
                wallet.save(update_fields=["total_balance"])
            
            total_earnings = total_commission
            
            return {
                "type": "admin",
                "balance": float(total_commission),
                "total_earnings": float(total_earnings),
            }

        if obj.role == User.Role.PROVIDER:
            wallet, _ = ProviderWallet.objects.get_or_create(provider=obj)
            total_earnings = (
                Payment.objects.filter(status=Payment.Status.RELEASED)
                .filter(
                    Q(booking__assigned_provider=obj)
                    | (Q(booking__assigned_provider__isnull=True) & Q(booking__service__provider=obj))
                )
                .aggregate(total=Sum("provider_earning"))
                .get("total")
                or 0
            )
            return {
                "type": "provider",
                "balance": float(wallet.balance),
                "pending_balance": float(wallet.pending_balance),
                "total_earnings": float(total_earnings),
            }

        return None

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("provider_profile", None)
        instance = super().update(instance, validated_data)
        if profile_data and hasattr(instance, "provider_profile"):
            for key, value in profile_data.items():
                setattr(instance.provider_profile, key, value)
            instance.provider_profile.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "password", "first_name", "last_name", "phone", "location", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role", User.Role.SEEKER)
        if role not in [User.Role.SEEKER, User.Role.PROVIDER]:
            role = User.Role.SEEKER
        user = User.objects.create_user(**validated_data, role=role)
        if role == User.Role.PROVIDER:
            user.is_provider_approved = False
            user.save(update_fields=["is_provider_approved"])
        return user


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    username_field = "email"

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        if attrs.get("email"):
            attrs["email"] = attrs["email"].strip().lower()
        try:
            return super().validate(attrs)
        except AuthenticationFailed as exc:
            # Backward-compatible rescue for users created with plaintext passwords in admin.
            email = attrs.get("email", "")
            raw_password = attrs.get("password", "")
            user = User.objects.filter(email__iexact=email).first()
            if user and user.password == raw_password:
                user.set_password(raw_password)
                user.save(update_fields=["password"])
                refresh = self.get_token(user)
                return {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            raise exc


class ApproveProviderSerializer(serializers.Serializer):
    is_provider_approved = serializers.BooleanField()
