from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class AccountsAuthTests(APITestCase):
    def test_register_and_login_with_email(self):
        register_payload = {
            "email": "newuser@test.com",
            "password": "SecurePass123!",
            "first_name": "New",
            "last_name": "User",
            "phone": "+255700111222",
            "location": "Dar es Salaam",
            "role": "seeker",
        }
        register_response = self.client.post(reverse("auth-register"), register_payload, format="json")
        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": register_payload["email"], "password": register_payload["password"]},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)

    def test_login_plaintext_admin_created_user_rehashes_password(self):
        # Simulate legacy admin-created user with plaintext password in DB.
        user = User.objects.create(
            email="legacy@test.com",
            username="legacy@test.com",
            password="LegacyPass123!",
            first_name="Legacy",
            last_name="User",
            role=User.Role.SEEKER,
        )

        token_response = self.client.post(
            reverse("token_obtain_pair"),
            {"email": "legacy@test.com", "password": "LegacyPass123!"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", token_response.data)

        user.refresh_from_db()
        self.assertNotEqual(user.password, "LegacyPass123!")
        self.assertTrue(user.check_password("LegacyPass123!"))
