from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Iterable
from urllib.request import Request, urlopen

from django.conf import settings

from apps.accounts.emails import send_servigo_email
from apps.accounts.models import User

from .models import Notification, SmsGatewayConfig, SmsNotificationLog


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class NotificationPayload:
    title: str
    message: str
    kind: str = "system"


class NotificationDispatcher:
    """Dispatches notifications across channels.

    The SMS and push methods are placeholders to keep the integration points
    ready for future providers.
    """

    def send_in_app(self, user: User, payload: NotificationPayload) -> Notification:
        return Notification.objects.create(
            user=user,
            title=payload.title,
            message=payload.message,
            type=payload.kind,
        )

    def send_email(self, user: User, payload: NotificationPayload) -> bool:
        return send_servigo_email(subject=payload.title, message=payload.message, recipient=user.email)

    def _get_sms_config(self) -> SmsGatewayConfig:
        config, _ = SmsGatewayConfig.objects.get_or_create(
            id=1,
            defaults={
                "sender_number": settings.SMS_SENDER_NUMBER,
                "backend": settings.SMS_BACKEND,
                "webhook_url": settings.SMS_WEBHOOK_URL,
                "webhook_token": settings.SMS_WEBHOOK_TOKEN,
                "is_active": True,
            },
        )
        return config

    def _dispatch_sms(self, user: User, message: str) -> tuple[str, str]:
        config = self._get_sms_config()
        if not config.is_active:
            return "skipped", "gateway-inactive"
        backend = config.backend.lower()
        sender = config.sender_number
        webhook_url = config.webhook_url
        webhook_token = config.webhook_token

        if backend == "webhook" and webhook_url:
            body = json.dumps(
                {
                    "from": sender,
                    "to": user.phone,
                    "message": message,
                    "label": "SerGo",
                }
            ).encode("utf-8")
            req = Request(
                webhook_url,
                method="POST",
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {webhook_token}",
                },
            )
            with urlopen(req, timeout=4) as response:
                provider_ref = response.read().decode("utf-8")[:100]
            return "sent", provider_ref

        logger.info("SMS[%s -> %s]: %s", sender, user.phone, message)
        return "sent", "console-backend"

    def send_sms(self, user: User, payload: NotificationPayload) -> bool:
        if not user.phone:
            return False

        config = self._get_sms_config()
        sender = config.sender_number
        message = f"SerGo: {payload.title}. {payload.message}"
        status = "failed"
        provider_ref = ""
        try:
            status, provider_ref = self._dispatch_sms(user, message)
        except Exception as exc:
            logger.warning("Failed to send SMS to %s: %s", user.phone, exc)

        SmsNotificationLog.objects.create(
            user=user,
            to_phone=user.phone,
            sender=sender,
            message=message,
            status=status,
            provider_reference=provider_ref,
        )

        if status != "sent":
            if config.backup_sender_number and config.sender_number != config.backup_sender_number:
                config.sender_number = config.backup_sender_number
                config.save(update_fields=["sender_number", "updated_at"])
        return status == "sent"

    def is_user_online(self, user: User) -> bool:
        if user.role == User.Role.PROVIDER and hasattr(user, "provider_profile"):
            return bool(user.provider_profile.is_online)
        return bool(getattr(user, "is_online", False))

    def send_sms_if_offline(self, user: User, payload: NotificationPayload) -> bool:
        if self.is_user_online(user):
            return False
        return self.send_sms(user, payload)

    def send_push(self, user: User, payload: NotificationPayload) -> None:
        # Intentionally left as extension hook for future push integrations.
        return None

    def broadcast(self, users: Iterable[User], payload: NotificationPayload, include_email: bool = True) -> None:
        for user in users:
            self.send_in_app(user, payload)
            if include_email:
                self.send_email(user, payload)
