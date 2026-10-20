"""
Sheba Sound — Root URL Configuration
"""

import mimetypes
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, FileResponse, Http404
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


def frontend_view(request):
    """Serve the React frontend single-page application (index.html)."""
    candidates = [
        settings.BASE_DIR / "dist" / "index.html",
        settings.BASE_DIR.parent / "dist" / "index.html",
        settings.BASE_DIR / "staticfiles" / "index.html",
    ]
    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return HttpResponse(candidate.read_text(encoding="utf-8"), content_type="text/html; charset=utf-8")
    return api_root(request)


def serve_dist_asset(request, path):
    """Serve static assets directly from dist/."""
    candidates = [
        settings.BASE_DIR / "dist",
        settings.BASE_DIR.parent / "dist",
    ]
    for candidate in candidates:
        target = (candidate / path).resolve()
        # Security: ensure target stays inside candidate dir
        if str(target).startswith(str(candidate.resolve())) and target.exists() and target.is_file():
            content_type, _ = mimetypes.guess_type(str(target))
            return FileResponse(open(target, "rb"), content_type=content_type or "application/octet-stream")
    raise Http404("Asset not found")


urlpatterns = [
    path("admin/", admin.site.urls),

    # Assets & Static files from dist
    re_path(r"^assets/(?P<path>.*)$", lambda req, path: serve_dist_asset(req, f"assets/{path}")),
    re_path(r"^(?P<path>[^/]+\.(?:svg|png|jpg|jpeg|ico|json|txt|webp|woff2?|css|js))$", serve_dist_asset),

    # API routes with /api/ prefix
    path("api/", api_root, name="api-root"),
    path("api/auth/", include("accounts.urls")),
    path("api/users/", include("accounts.urls")),
    path("api/music/", include("music.urls")),
    path("api/subscriptions/", include("subscriptions.urls")),
    path("api/admin-dashboard/", include("admin_dashboard.urls")),

    # Fallback routes without /api/ prefix (if Vercel rewrite strips /api/)
    path("auth/", include("accounts.urls")),
    path("users/", include("accounts.urls")),
    path("music/", include("music.urls")),
    path("subscriptions/", include("subscriptions.urls")),
    path("admin-dashboard/", include("admin_dashboard.urls")),

    # Frontend SPA routes (serves index.html for root and all client-side navigation)
    path("", frontend_view, name="frontend-home"),
    re_path(r"^(?!api/|admin/|media/|static/|assets/).*$", frontend_view, name="frontend-spa"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
