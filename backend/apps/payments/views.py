from io import BytesIO
import os

from django.http import HttpResponse
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from reportlab.graphics.barcode import code128
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from apps.accounts.emails import send_servigo_email
from apps.accounts.models import User
from apps.bookings.models import Booking
from apps.bookings.services import BookingLifecycleService
from apps.notifications.models import Notification

from .gateway import PaymentGatewayRegistry, verify_callback_signature
from .models import AdminWallet, AdminWalletTransaction, CommissionConfig, Payment, PaymentReceipt, ProviderWallet
from .services import apply_payment_completion_split, move_pending_to_available_wallet
from config.sse import broadcast_event
from .serializers import (
    AdminWalletSerializer,
    CommissionConfigSerializer,
    InitiatePaymentSerializer,
    PaymentSerializer,
    PaymentReceiptSerializer,
    ProviderWalletSerializer,
    ReleasePaymentSerializer,
    VerifyPaymentSerializer,
)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.select_related("booking", "booking__service", "booking__seeker", "receipt").all().order_by("-created_at")
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _notify_admins(self, title: str, message: str):
        for admin_user in User.objects.filter(role=User.Role.ADMIN):
            Notification.objects.create(user=admin_user, title=title, message=message, type="payment")

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        if user.role == User.Role.ADMIN:
            return queryset
        if user.role == User.Role.PROVIDER:
            return queryset.filter(booking__service__provider=user)
        return queryset.filter(booking__seeker=user)

    def _send_payment_email(self, payment: Payment, subject: str, message: str):
        send_servigo_email(subject=subject, message=message, recipient=payment.booking.seeker.email)
        provider = payment.booking.assigned_provider or payment.booking.service.provider
        if provider and provider.email:
            send_servigo_email(subject=subject, message=message, recipient=provider.email)

    @action(detail=False, methods=["post"])
    def initiate(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = Booking.objects.select_related("service", "seeker").get(id=serializer.validated_data["booking_id"])

        if request.user.id != booking.seeker_id:
            return Response({"detail": "Only booking owner can initiate payment."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status not in [Booking.Status.PENDING, Booking.Status.ACCEPTED]:
            return Response({"detail": "Booking cannot be paid in current status."}, status=status.HTTP_400_BAD_REQUEST)

        payment, created = Payment.objects.get_or_create(
            booking=booking,
            defaults={"amount": booking.total_amount, "method": serializer.validated_data["method"]},
        )
        if not created and payment.status in {
            Payment.Status.INITIATED,
            Payment.Status.PENDING,
            Payment.Status.PAID,
            Payment.Status.HELD,
            Payment.Status.RELEASED,
        }:
            return Response(
                {
                    "detail": (
                        "Payment already exists for this booking. "
                        "Reuse existing payment flow instead of initiating repayment."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        payment.method = serializer.validated_data["method"]

        gateway = PaymentGatewayRegistry()
        gateway_response = gateway.initiate(method=payment.method, amount=float(payment.amount), phone=serializer.validated_data["phone"])
        payment.transaction_reference = gateway_response["transaction_reference"]
        payment.status = Payment.Status.PENDING
        payment.save(update_fields=["method", "transaction_reference", "status"])
        self._send_payment_email(
            payment,
            "ServiGo payment initiated",
            f"Payment for booking #{booking.id} was initiated via {payment.method}. Reference: {payment.transaction_reference}",
        )
        self._notify_admins(
            "Payment initiated",
            f"Payment was initiated for booking #{booking.id} via {payment.method}.",
        )

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def verify(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = Payment.objects.get(transaction_reference=serializer.validated_data["transaction_reference"])
        gateway = PaymentGatewayRegistry()
        verification = gateway.verify(method=payment.method, transaction_reference=payment.transaction_reference)

        if verification["status"] == "paid":
            payment.status = Payment.Status.HELD
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])
            apply_payment_completion_split(payment)
            Notification.objects.create(
                user=payment.booking.seeker,
                title="Payment confirmed",
                message=f"Payment for booking #{payment.booking_id} is now held in escrow.",
                type="payment",
            )
            self._notify_admins(
                "Payment verified",
                f"Payment for booking #{payment.booking_id} has been verified and moved to held status.",
            )
            self._send_payment_email(
                payment,
                "ServiGo payment verified",
                f"Payment for booking #{payment.booking_id} has been verified and is now held in escrow.",
            )

        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def provider_callback(self, request):
        """Generic callback endpoint for payment providers.

        Expected fields: method, transaction_reference, status
        Header: X-Signature (sha256 hmac of JSON payload)
        """
        signature = request.headers.get("X-Signature", "")
        secret = os.getenv("PAYMENT_CALLBACK_SECRET", "")
        payload = request.body.decode("utf-8")
        if not verify_callback_signature(payload=payload, signature=signature, secret=secret):
            return Response({"detail": "Invalid signature"}, status=status.HTTP_403_FORBIDDEN)

        transaction_reference = request.data.get("transaction_reference")
        provider_status = request.data.get("status")
        if not transaction_reference:
            return Response({"detail": "transaction_reference is required"}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.get(transaction_reference=transaction_reference)
        if provider_status == "paid":
            payment.status = Payment.Status.HELD
            payment.paid_at = timezone.now()
            payment.save(update_fields=["status", "paid_at"])

        return Response(PaymentSerializer(payment).data)

    @action(detail=True, methods=["post"])
    def release(self, request, pk=None):
        payment = self.get_object()
        serializer = ReleasePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.role == User.Role.ADMIN:
            pass
        elif user.role == User.Role.SEEKER and payment.booking.seeker_id == user.id:
            pass
        else:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if payment.status != Payment.Status.HELD:
            return Response({"detail": "Payment must be in held status."}, status=status.HTTP_400_BAD_REQUEST)

        payout, commission = serializer.compute_split(payment.amount, payment.commission_rate)
        with transaction.atomic():
            payment.provider_payout_amount = payout
            payment.platform_commission = commission
            payment.provider_earning = payout
            payment.admin_commission = commission
            payment.total_amount = payment.amount
            payment.status = Payment.Status.RELEASED
            payment.save(
                update_fields=[
                    "provider_payout_amount",
                    "platform_commission",
                    "provider_earning",
                    "admin_commission",
                    "total_amount",
                    "status",
                ]
            )

            wallet, _ = AdminWallet.objects.get_or_create(id=1)
            wallet_entry, created = AdminWalletTransaction.objects.get_or_create(
                payment=payment,
                defaults={
                    "wallet": wallet,
                    "entry_type": AdminWalletTransaction.EntryType.COMMISSION_IN,
                    "amount": commission,
                    "description": f"10% commission captured from booking #{payment.booking_id}",
                },
            )
            if created:
                wallet.total_balance = wallet.total_balance + wallet_entry.amount
                wallet.save(update_fields=["total_balance", "updated_at"])

            try:
                broadcast_event({
                    "type": "admin_wallet_updated",
                    "balance": str(wallet.total_balance),
                    "payment_id": payment.id,
                })
            except Exception:
                pass

            if payment.booking.status == Booking.Status.COMPLETED:
                BookingLifecycleService.apply_transition(payment.booking, Booking.Status.PAID)
            move_pending_to_available_wallet(payment.booking, payout)

            try:
                broadcast_event({
                    "type": "payment_released",
                    "payment_id": payment.id,
                    "provider_id": payment.booking.assigned_provider_id or payment.booking.service.provider_id,
                })
            except Exception:
                pass

        Notification.objects.create(
            user=payment.booking.service.provider,
            title="Payment released",
            message=f"Payment for booking #{payment.booking_id} has been released.",
            type="payment",
        )
        self._notify_admins(
            "Payment released",
            f"Payment for booking #{payment.booking_id} was released by {user.role}.",
        )
        self._send_payment_email(
            payment,
            "ServiGo payment released",
            (
                f"Payment for booking #{payment.booking_id} was released. "
                f"Provider payout: {payment.provider_payout_amount}, ServiGo commission: {payment.platform_commission}."
            ),
        )
        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=["get"])
    def provider_wallet(self, request):
        user = request.user
        if user.role == User.Role.ADMIN:
            wallets = ProviderWallet.objects.select_related("provider").all().order_by("-updated_at")
            return Response(ProviderWalletSerializer(wallets, many=True).data)
        if user.role != User.Role.PROVIDER:
            return Response({"detail": "Only providers can access wallet details."}, status=status.HTTP_403_FORBIDDEN)
        wallet, _ = ProviderWallet.objects.get_or_create(provider=user)
        return Response(ProviderWalletSerializer(wallet).data)

    @action(detail=False, methods=["get", "post"])
    def commission_config(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can manage commission rate."}, status=status.HTTP_403_FORBIDDEN)

        config, _ = CommissionConfig.objects.get_or_create(id=1)
        if request.method == "GET":
            return Response(CommissionConfigSerializer(config).data)

        serializer = CommissionConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(updated_by=request.user)
        return Response(CommissionConfigSerializer(instance).data)

    @action(detail=False, methods=["get"])
    def wallet(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can access wallet details."}, status=status.HTTP_403_FORBIDDEN)
        wallet, _ = AdminWallet.objects.get_or_create(id=1)
        wallet = AdminWallet.objects.prefetch_related("transactions", "transactions__payment").get(id=wallet.id)
        return Response(AdminWalletSerializer(wallet).data)

    @action(detail=True, methods=["post"])
    def generate_receipt(self, request, pk=None):
        payment = self.get_object()
        user = request.user
        provider_id = payment.booking.assigned_provider_id or payment.booking.service.provider_id
        allowed_ids = {payment.booking.seeker_id, provider_id}
        if user.role != User.Role.ADMIN and user.id not in allowed_ids:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        receipt, _ = PaymentReceipt.objects.get_or_create(
            payment=payment,
            defaults={"generated_by": user, "generated_for": payment.booking.seeker},
        )
        if not receipt.generated_by_id:
            receipt.generated_by = user
            receipt.save(update_fields=["generated_by"])

        return Response(PaymentReceiptSerializer(receipt).data)

    @action(detail=True, methods=["get"])
    def receipt_pdf(self, request, pk=None):
        payment = self.get_object()
        user = request.user
        provider_id = payment.booking.assigned_provider_id or payment.booking.service.provider_id
        allowed_ids = {payment.booking.seeker_id, provider_id}
        if user.role != User.Role.ADMIN and user.id not in allowed_ids:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        receipt, _ = PaymentReceipt.objects.get_or_create(
            payment=payment,
            defaults={"generated_by": user, "generated_for": payment.booking.seeker},
        )
        if not receipt.generated_by_id:
            receipt.generated_by = user
            receipt.save(update_fields=["generated_by"])

        buffer = BytesIO()
        pdf = canvas.Canvas(buffer, pagesize=A4)
        page_width, page_height = A4
        margin = 18 * mm
        top = page_height - margin

        pdf.setTitle(f"{receipt.receipt_number or f'RECEIPT-{payment.id}'}")
        pdf.setAuthor("ServiGo")
        pdf.setFont("Helvetica-Bold", 18)
        pdf.setFillColor(HexColor("#18324d"))
        pdf.drawString(margin, top, "SERVIGO EFD RECEIPT")
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(HexColor("#4d647b"))
        pdf.drawRightString(page_width - margin, top + 2, receipt.receipt_number or f"RCPT-{payment.id}")

        pdf.setStrokeColor(HexColor("#d8e2ee"))
        pdf.line(margin, top - 8, page_width - margin, top - 8)

        details_top = top - 34
        detail_rows = [
            ("Receipt", receipt.receipt_number or "-"),
            ("Booking", f"#{payment.booking_id}"),
            ("Service", payment.booking.service.title),
            ("Method", str(payment.method).upper()),
            ("Status", payment.status),
            ("Amount", f"{payment.total_amount:.2f}"),
            ("Generated for", receipt.generated_for.get_full_name() or receipt.generated_for.email if receipt.generated_for else "-"),
        ]
        left_x = margin
        value_x = 70 * mm
        pdf.setFont("Helvetica-Bold", 11)
        pdf.setFillColor(HexColor("#18324d"))
        current_y = details_top
        for label, value in detail_rows:
            pdf.drawString(left_x, current_y, f"{label}:")
            pdf.setFont("Helvetica", 11)
            pdf.drawString(value_x, current_y, str(value))
            pdf.setFont("Helvetica-Bold", 11)
            current_y -= 9 * mm

        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(HexColor("#5c7288"))
        pdf.drawString(margin, 86 * mm, "Barcode")

        barcode_value = receipt.receipt_number or f"RCPT-{payment.id:05d}"
        barcode = code128.Code128(barcode_value, barHeight=18 * mm, barWidth=0.35 * mm)
        barcode_width = barcode.width
        barcode_x = margin
        barcode_y = 58 * mm
        barcode.drawOn(pdf, barcode_x, barcode_y)

        pdf.setFont("Helvetica-Bold", 10)
        pdf.setFillColor(HexColor("#18324d"))
        pdf.drawCentredString(barcode_x + barcode_width / 2, barcode_y - 6 * mm, barcode_value)

        pdf.setStrokeColor(HexColor("#d8e2ee"))
        pdf.line(margin, 44 * mm, page_width - margin, 44 * mm)
        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(HexColor("#5c7288"))
        pdf.drawString(margin, 36 * mm, "This receipt can be downloaded, printed, and saved as PDF from the same document.")
        pdf.drawString(margin, 30 * mm, f"Generated on {timezone.now():%Y-%m-%d %H:%M}")

        pdf.showPage()
        pdf.save()
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{barcode_value}.pdf"'
        return response

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """Get detailed payment statistics by status and method for admin."""
        user = request.user
        if user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can view statistics."}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Q, Count, Sum, Case, When, F, DecimalField
        
        # Statistics by payment status
        by_status = {}
        for status_choice in Payment.Status.choices:
            status_value = status_choice[0]
            status_label = status_choice[1]
            count = Payment.objects.filter(status=status_value).count()
            total_amount = Payment.objects.filter(status=status_value).aggregate(total=Sum("amount"))["total"] or 0
            total_commission = Payment.objects.filter(status=status_value).aggregate(total=Sum("admin_commission"))["total"] or 0
            total_provider_earning = Payment.objects.filter(status=status_value).aggregate(total=Sum("provider_earning"))["total"] or 0
            
            by_status[status_value] = {
                "label": status_label,
                "count": count,
                "total_amount": float(total_amount),
                "total_commission": float(total_commission),
                "total_provider_earning": float(total_provider_earning),
            }
        
        # Statistics by payment method
        by_method = {}
        for method_choice in Payment.Method.choices:
            method_value = method_choice[0]
            method_label = method_choice[1]
            count = Payment.objects.filter(method=method_value).count()
            total_amount = Payment.objects.filter(method=method_value).aggregate(total=Sum("amount"))["total"] or 0
            total_commission = Payment.objects.filter(method=method_value).aggregate(total=Sum("admin_commission"))["total"] or 0
            total_provider_earning = Payment.objects.filter(method=method_value).aggregate(total=Sum("provider_earning"))["total"] or 0
            
            by_method[method_value] = {
                "label": method_label,
                "count": count,
                "total_amount": float(total_amount),
                "total_commission": float(total_commission),
                "total_provider_earning": float(total_provider_earning),
            }
        
        # Overall statistics
        total_payments = Payment.objects.count()
        total_amount = Payment.objects.aggregate(total=Sum("amount"))["total"] or 0
        total_commission = Payment.objects.aggregate(total=Sum("admin_commission"))["total"] or 0
        total_provider_earning = Payment.objects.aggregate(total=Sum("provider_earning"))["total"] or 0
        
        return Response({
            "overall": {
                "total_payments": total_payments,
                "total_amount": float(total_amount),
                "total_commission": float(total_commission),
                "total_provider_earning": float(total_provider_earning),
            },
            "by_status": by_status,
            "by_method": by_method,
        })

    @action(detail=False, methods=["get"])
    def receipts(self, request):
        user = request.user
        queryset = PaymentReceipt.objects.select_related("payment", "payment__booking", "payment__booking__service").all().order_by("-created_at")
        if user.role == User.Role.ADMIN:
            pass
        elif user.role == User.Role.PROVIDER:
            queryset = queryset.filter(payment__booking__service__provider=user)
        else:
            queryset = queryset.filter(payment__booking__seeker=user)
        return Response(PaymentReceiptSerializer(queryset, many=True).data)
