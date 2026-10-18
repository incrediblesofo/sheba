"""
Sheba Sound — Root URL Configuration
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    """API index — lists all available endpoint groups."""
    base = request.build_absolute_uri("/api/")
    return Response({
        "message": "Welcome to the Sheba Sound API 🎵",
        "endpoints": {
            "auth": f"{base}auth/",
            "music": f"{base}music/",
            "subscriptions": f"{base}subscriptions/",
            "admin_dashboard": f"{base}admin-dashboard/",
        },
        "docs": {
            "login": f"{base}auth/login/",
            "register": f"{base}auth/register/",
            "songs": f"{base}music/songs/",
            "albums": f"{base}music/albums/",
            "artists": f"{base}auth/artists/",
            "playlists": f"{base}music/playlists/",
            "search": f"{base}music/search/?q=<query>",
        },
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api_root, name="api-root"),
    path("api/auth/", include("accounts.urls")),
    path("api/users/", include("accounts.urls")),
    path("api/music/", include("music.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
    path("api/admin-dashboard/", include("admin_dashboard.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
