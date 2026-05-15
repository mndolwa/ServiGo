from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.services.models import Service, ServiceCategory

User = get_user_model()


class ServiGoPaymentWorkflowTests(APITestCase):
    def setUp(self):
        self.seeker = User.objects.create_user(
            email="seeker@test.com",
            password="SeekerPass123!",
            first_name="Seek",
            last_name="User",
            role=User.Role.SEEKER,
        )
        self.provider = User.objects.create_user(
            email="provider@test.com",
            password="ProviderPass123!",
            first_name="Pro",
            last_name="User",
            role=User.Role.PROVIDER,
            is_provider_approved=True,
        )
        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            password="AdminPass123!",
            first_name="Admin",
            last_name="Root",
        )
        self.category = ServiceCategory.objects.create(name="IT Support")
        self.service = Service.objects.create(
            provider=self.provider,
            category=self.category,
            title="Laptop repair",
            description="Quick diagnostics and fix",
            price="50.00",
            duration_minutes=60,
        )

    def _create_booking(self):
        self.client.force_authenticate(user=self.seeker)
        payload = {
            "service": self.service.id,
            "scheduled_at": (timezone.now() + timedelta(days=1)).isoformat(),
            "notes": "Need urgent help",
        }
        response = self.client.post(reverse("bookings-list"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Booking.objects.get(id=response.data["id"])

    def test_full_payment_lifecycle_and_release(self):
        booking = self._create_booking()

        self.client.force_authenticate(user=self.seeker)
        response = self.client.post(
            reverse("payments-initiate"),
            {"booking_id": booking.id, "method": "mpesa", "phone": "+255700000001"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Payment.objects.get(booking=booking)
        self.assertEqual(payment.status, Payment.Status.PENDING)

        response = self.client.post(
            reverse("payments-verify"),
            {"transaction_reference": payment.transaction_reference},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.HELD)

        booking.status = Booking.Status.COMPLETED
        booking.save(update_fields=["status"])

        response = self.client.post(reverse("payments-release", args=[payment.id]), {"release": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment.refresh_from_db()
        self.assertEqual(payment.status, Payment.Status.RELEASED)
        self.assertEqual(float(payment.provider_payout_amount), 45.0)
        self.assertEqual(float(payment.platform_commission), 5.0)

    def test_other_seeker_cannot_release_payment(self):
        booking = self._create_booking()
        payment = Payment.objects.create(
            booking=booking,
            amount=booking.total_amount,
            method=Payment.Method.MPESA,
            status=Payment.Status.HELD,
            transaction_reference="MPESA-REF-1",
        )

        other_seeker = User.objects.create_user(
            email="other@test.com",
            password="OtherPass123!",
            first_name="Other",
            last_name="Seeker",
            role=User.Role.SEEKER,
        )

        self.client.force_authenticate(user=other_seeker)
        response = self.client.post(reverse("payments-release", args=[payment.id]), {"release": True}, format="json")
        # Non-owner seekers cannot see payment detail in queryset and receive 404.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_review_after_completion(self):
        booking = self._create_booking()
        booking.status = Booking.Status.COMPLETED
        booking.save(update_fields=["status"])

        self.client.force_authenticate(user=self.seeker)
        response = self.client.post(
            reverse("reviews-list"),
            {"booking": booking.id, "rating": 5, "comment": "Excellent support"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
