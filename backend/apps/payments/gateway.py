import hashlib
import hmac
from datetime import datetime
from typing import Protocol
from uuid import uuid4


class PaymentProvider(Protocol):
    method: str

    def initiate(self, amount: float, phone: str) -> dict:
        ...

    def verify(self, transaction_reference: str) -> dict:
        ...


class BaseProvider:
    method = "unknown"

    def _reference(self) -> str:
        return f"{self.method.upper()}-{uuid4().hex[:10]}"

    def initiate(self, amount: float, phone: str) -> dict:
        return {
            "provider": self.method,
            "status": "pending",
            "transaction_reference": self._reference(),
            "requested_at": datetime.utcnow().isoformat(),
            "phone": phone,
            "amount": amount,
        }

    def verify(self, transaction_reference: str) -> dict:
        return {
            "provider": self.method,
            "status": "paid",
            "transaction_reference": transaction_reference,
            "verified": True,
            "verified_at": datetime.utcnow().isoformat(),
        }


class MpesaProvider(BaseProvider):
    method = "mpesa"


class AirtelProvider(BaseProvider):
    method = "airtel"


class TigoProvider(BaseProvider):
    method = "tigo"


class CardProvider(BaseProvider):
    method = "card"


class PaymentGatewayRegistry:
    def __init__(self):
        self._providers: dict[str, PaymentProvider] = {
            "mpesa": MpesaProvider(),
            "airtel": AirtelProvider(),
            "tigo": TigoProvider(),
            "card": CardProvider(),
        }

    def get(self, method: str) -> PaymentProvider:
        if method not in self._providers:
            raise ValueError(f"Unsupported payment method: {method}")
        return self._providers[method]

    def initiate(self, method: str, amount: float, phone: str) -> dict:
        provider = self.get(method)
        return provider.initiate(amount=amount, phone=phone)

    def verify(self, method: str, transaction_reference: str) -> dict:
        provider = self.get(method)
        return provider.verify(transaction_reference=transaction_reference)


def verify_callback_signature(payload: str, signature: str, secret: str) -> bool:
    if not secret:
        return False
    computed = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature)
