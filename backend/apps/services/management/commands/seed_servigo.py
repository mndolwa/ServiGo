from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.bookings.models import Booking
from apps.payments.models import AdminWallet, AdminWalletTransaction, Payment, PaymentReceipt
from apps.services.models import Service
from apps.services.models import ServiceCategory

User = get_user_model()


class Command(BaseCommand):
    help = "Seed ServiGo sample data (users, categories, services, bookings, payments, receipts)"

    def handle(self, *args, **options):
        category_names = [
            "Plumbing",
            "Electrical",
            "IT Support",
            "Tutoring",
            "Cleaning",
            "Carpentry",
            "Painting",
            "Laundry",
            "Gardening",
            "Security",
            "Appliance Repair",
            "Mobile Repair",
            "Home Moving",
            "Interior Design",
            "Pest Control",
            "Catering",
            "Photography",
            "Beauty Services",
            "AC Repair",
            "Water Tank Cleaning",
        ]
        categories = [ServiceCategory.objects.get_or_create(name=name)[0] for name in category_names]

        admin, _ = User.objects.get_or_create(
            email="admin@servigo.local",
            defaults={
                "username": "admin@servigo.local",
                "first_name": "ServiGo",
                "last_name": "Admin",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if not admin.check_password("AdminPass123!"):
            admin.set_password("AdminPass123!")
            admin.save(update_fields=["password"])

        locations = [
            "Kinondoni",
            "Ilala",
            "Temeke",
            "Ubungo",
            "Kigamboni",
            "Mikocheni",
            "Masaki",
            "Sinza",
            "Mwenge",
            "Tabata",
        ]

        providers = []
        for idx in range(10):
            email = f"provider{idx + 1}@servigo.local"
            provider, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": f"Provider{idx + 1}",
                    "last_name": "ServiGo",
                    "role": User.Role.PROVIDER,
                    "phone": f"+255700000{idx:03d}",
                    "location": locations[idx % len(locations)],
                    "is_provider_approved": True,
                },
            )
            provider.is_provider_approved = True
            provider.location = provider.location or locations[idx % len(locations)]
            provider.save(update_fields=["is_provider_approved", "location"])
            if not provider.check_password("ProviderPass123!"):
                provider.set_password("ProviderPass123!")
                provider.save(update_fields=["password"])
            providers.append(provider)

        seekers = []
        for idx in range(15):
            email = f"seeker{idx + 1}@servigo.local"
            seeker, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": f"Seeker{idx + 1}",
                    "last_name": "ServiGo",
                    "role": User.Role.SEEKER,
                    "phone": f"+255710000{idx:03d}",
                    "location": locations[idx % len(locations)],
                },
            )
            if not seeker.check_password("SeekerPass123!"):
                seeker.set_password("SeekerPass123!")
                seeker.save(update_fields=["password"])
            seekers.append(seeker)

        for idx in range(3):
            email = f"itsupport{idx + 1}@servigo.local"
            support_user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": email,
                    "first_name": f"IT{idx + 1}",
                    "last_name": "Support",
                    "role": User.Role.IT_SUPPORT,
                    "phone": f"+255720000{idx:03d}",
                    "location": "Dar es Salaam",
                },
            )
            if not support_user.check_password("SupportPass123!"):
                support_user.set_password("SupportPass123!")
                support_user.save(update_fields=["password"])

        services = []
        for idx in range(100):
            provider = providers[idx % len(providers)]
            category = categories[idx % len(categories)]
            title = f"{category.name} Service {idx + 1}"
            service, _ = Service.objects.get_or_create(
                provider=provider,
                title=title,
                defaults={
                    "category": category,
                    "description": f"Professional {category.name.lower()} by {provider.first_name}.",
                    "price": Decimal("25.00") + Decimal(str((idx % 15) * 5)),
                    "duration_minutes": 30 + (idx % 5) * 30,
                    "is_active": True,
                    "is_published": True,
                    "published_at": timezone.now(),
                },
            )
            if not service.is_published:
                service.is_published = True
                service.published_at = timezone.now()
                service.save(update_fields=["is_published", "published_at"])
            services.append(service)

        wallet, _ = AdminWallet.objects.get_or_create(id=1)
        for idx, service in enumerate(services[:80]):
            seeker = seekers[idx % len(seekers)]
            scheduled_at = timezone.now() - timedelta(days=(idx % 14) + 1)
            booking, _ = Booking.objects.get_or_create(
                seeker=seeker,
                service=service,
                scheduled_at=scheduled_at,
                defaults={
                    "status": Booking.Status.COMPLETED,
                    "notes": "Seeded completed booking",
                    "total_amount": service.price,
                    "assigned_provider": service.provider,
                },
            )
            if booking.status != Booking.Status.COMPLETED:
                booking.status = Booking.Status.COMPLETED
                booking.assigned_provider = booking.assigned_provider or service.provider
                booking.total_amount = booking.total_amount or service.price
                booking.save(update_fields=["status", "assigned_provider", "total_amount"])

            method = [Payment.Method.MPESA, Payment.Method.CARD, Payment.Method.AIRTEL, Payment.Method.TIGO][idx % 4]
            payment, _ = Payment.objects.get_or_create(
                booking=booking,
                defaults={
                    "amount": booking.total_amount,
                    "method": method,
                    "status": Payment.Status.RELEASED,
                    "transaction_reference": f"SEED-TX-{booking.id:05d}",
                    "provider_payout_amount": (booking.total_amount * Decimal("0.90")).quantize(Decimal("0.01")),
                    "platform_commission": (booking.total_amount * Decimal("0.10")).quantize(Decimal("0.01")),
                    "paid_at": timezone.now() - timedelta(days=idx % 10),
                },
            )
            if payment.status != Payment.Status.RELEASED:
                payment.status = Payment.Status.RELEASED
                payment.transaction_reference = payment.transaction_reference or f"SEED-TX-{booking.id:05d}"
                payment.provider_payout_amount = (payment.amount * Decimal("0.90")).quantize(Decimal("0.01"))
                payment.platform_commission = (payment.amount * Decimal("0.10")).quantize(Decimal("0.01"))
                payment.paid_at = payment.paid_at or timezone.now()
                payment.save(
                    update_fields=[
                        "status",
                        "transaction_reference",
                        "provider_payout_amount",
                        "platform_commission",
                        "paid_at",
                    ]
                )

            entry, created = AdminWalletTransaction.objects.get_or_create(
                payment=payment,
                defaults={
                    "wallet": wallet,
                    "amount": payment.platform_commission,
                    "description": f"10% commission captured from booking #{booking.id}",
                },
            )
            if created:
                wallet.total_balance = wallet.total_balance + entry.amount

            PaymentReceipt.objects.get_or_create(
                payment=payment,
                defaults={
                    "generated_by": admin,
                    "generated_for": seeker,
                },
            )

        wallet.save(update_fields=["total_balance"])

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete: 1 admin, 10 providers, 15 seekers, 3 IT support, 20 categories, 100 services, 80 paid/released bookings."
            )
        )
        self.stdout.write(self.style.WARNING("Admin login: admin@servigo.local / AdminPass123!"))
