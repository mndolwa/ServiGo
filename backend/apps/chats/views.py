from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q

from apps.notifications.models import Notification

from .models import ChatMessage, ChatRoom
from .serializers import ChatMessageSerializer, ChatRoomSerializer


class ChatRoomViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ChatRoom.objects.select_related("booking", "seeker", "provider").all().order_by("-updated_at")
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return super().get_queryset().filter(Q(seeker=user) | Q(provider=user)).order_by("-updated_at")

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        if obj.seeker_id != user.id and obj.provider_id != user.id:
            raise permissions.PermissionDenied("You are not part of this chat room.")
        return obj

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        room = self.get_object()
        if request.method.lower() == "get":
            qs = room.messages.select_related("sender").all()
            return Response(ChatMessageSerializer(qs, many=True).data)

        message = (request.data.get("message") or "").strip()
        if not message:
            return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

        chat_message = ChatMessage.objects.create(room=room, sender=request.user, message=message)
        room.save(update_fields=["updated_at"])

        receiver = room.provider if request.user.id == room.seeker_id else room.seeker
        Notification.objects.create(
            user=receiver,
            title="New chat message",
            message=f"New message for booking #{room.booking_id}.",
            type="chat",
        )

        return Response(ChatMessageSerializer(chat_message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def exchange_contacts(self, request, pk=None):
        room = self.get_object()
        room.contact_exchange_allowed = True
        room.save(update_fields=["contact_exchange_allowed"])

        Notification.objects.create(
            user=room.provider if request.user.id == room.seeker_id else room.seeker,
            title="Contact exchange enabled",
            message=f"Contact exchange enabled for booking #{room.booking_id} chat.",
            type="chat",
        )
        return Response(ChatRoomSerializer(room).data)
