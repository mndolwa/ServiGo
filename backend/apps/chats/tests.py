from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.bookings.models import Booking
from apps.chats.models import ChatRoom
from apps.services.models import Service, ServiceCategory

User = get_user_model()


class ChatWorkflowTests(APITestCase):
    def setUp(self):
        self.seeker = User.objects.create_user(
            email="chatseeker@test.com",
            password="SeekerPass123!",
            first_name="Chat",
            last_name="Seeker",
            role=User.Role.SEEKER,
        )
        self.provider = User.objects.create_user(
            email="chatprovider@test.com",
            password="ProviderPass123!",
            first_name="Chat",
            last_name="Provider",
            role=User.Role.PROVIDER,
            is_provider_approved=True,
        )
        category = ServiceCategory.objects.create(name="Electrical")
        self.service = Service.objects.create(
            provider=self.provider,
            category=category,
            title="Wiring service",
            description="Electrical check",
            price="30.00",
            duration_minutes=45,
        )
        self.booking = Booking.objects.create(
            seeker=self.seeker,
            service=self.service,
            scheduled_at=timezone.now() + timedelta(days=1),
            total_amount="30.00",
        )

    def test_chat_room_created_on_booking_accept(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.post(reverse("bookings-set-status", args=[self.booking.id]), {"status": "accepted"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(ChatRoom.objects.filter(booking=self.booking).exists())

    def test_chat_message_send_after_acceptance(self):
        room = ChatRoom.objects.create(booking=self.booking, seeker=self.seeker, provider=self.provider)
        self.client.force_authenticate(user=self.seeker)
        response = self.client.post(reverse("chats-messages", args=[room.id]), {"message": "Hello provider"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.get(reverse("chats-messages", args=[room.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["message"], "Hello provider")
