from django.contrib import admin
from django.http import HttpResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.views import AuthViewSet, EmailTokenObtainPairView, PlatformSummaryView, UserViewSet
from apps.bookings.views import BookingViewSet
from apps.chats.views import ChatRoomViewSet
from apps.notifications.views import NotificationViewSet
from apps.payments.views import PaymentViewSet
from apps.reviews.views import RatingViewSet, ReviewViewSet
from apps.services.views import ServiceCategoryViewSet, ServiceViewSet

router = DefaultRouter()
router.register("auth", AuthViewSet, basename="auth")
router.register("users", UserViewSet, basename="users")
router.register("categories", ServiceCategoryViewSet, basename="categories")
router.register("services", ServiceViewSet, basename="services")
router.register("bookings", BookingViewSet, basename="bookings")
router.register("payments", PaymentViewSet, basename="payments")
router.register("reviews", ReviewViewSet, basename="reviews")
router.register("ratings", RatingViewSet, basename="ratings")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("chats", ChatRoomViewSet, basename="chats")


def root_status(_request):
        return HttpResponse(
                """
                <!doctype html>
                <html lang="en">
                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1" />
                        <title>ServiGo API</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 0; background: #0f1720; color: #e8f1fb; }
                            .wrap { max-width: 760px; margin: 8vh auto; padding: 28px; }
                            .card { background: #162433; border: 1px solid #27405a; border-radius: 18px; padding: 24px; }
                            h1 { margin: 0 0 10px; font-size: 36px; }
                            p { color: #b9c9d8; line-height: 1.6; }
                            .links { display: grid; gap: 10px; margin-top: 18px; }
                            a { color: #9ed0ff; text-decoration: none; font-weight: 700; }
                            .pill { display: inline-block; background: #213549; color: #d8ecff; padding: 5px 10px; border-radius: 999px; margin-right: 8px; }
                            code { background: #0b1118; padding: 2px 6px; border-radius: 6px; }
                        </style>
                    </head>
                    <body>
                        <div class="wrap">
                            <div class="card">
                                <div class="pill">ServiGo</div>
                                <h1>API ready</h1>
                                <p>The backend is live and the tunnel is working. Use the links below to open the API, sign in, or open admin.</p>
                                <div class="links">
                                    <a href="/api/">Open API root</a>
                                    <a href="/api/token/">Open token endpoint</a>
                                    <a href="/admin/">Open admin panel</a>
                                </div>
                                <p style="margin-top:18px;">If you want the full app UI, open the frontend tunnel on port 3000 instead of this backend tunnel.</p>
                            </div>
                        </div>
                    </body>
                </html>
                """,
                content_type="text/html; charset=utf-8",
        )

urlpatterns = [
    path("", root_status),
    path("admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/platform/summary/", PlatformSummaryView.as_view({"get": "list"}), name="platform-summary"),
    path("api/token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]
