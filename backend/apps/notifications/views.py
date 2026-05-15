from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import User

from .models import Notification, SmsGatewayConfig, SmsNotificationLog
from .serializers import NotificationSerializer, SmsGatewayConfigSerializer, SmsNotificationLogSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"detail": "All notifications marked as read."})

    @action(detail=False, methods=["post"])
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response({"detail": "All notifications cleared."})

    @action(detail=False, methods=["get", "post"])
    def sms_gateway(self, request):
        if request.user.role != User.Role.ADMIN:
            return Response({"detail": "Only admins can manage SMS settings."}, status=403)

        config, _ = SmsGatewayConfig.objects.get_or_create(
            id=1,
            defaults={
                "sender_number": "+255 786 225 687",
                "backend": "console",
                "is_active": True,
            },
        )

        if request.method == "GET":
            logs = SmsNotificationLog.objects.select_related("user").all()[:10]
            return Response({
                "config": SmsGatewayConfigSerializer(config).data,
                "logs": SmsNotificationLogSerializer(logs, many=True).data,
            })

        serializer = SmsGatewayConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        config = serializer.save()
        return Response(SmsGatewayConfigSerializer(config).data)
