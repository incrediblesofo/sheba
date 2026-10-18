"""
Sheba Sound — Admin Dashboard URL Configuration
"""

from django.urls import path

from . import views

urlpatterns = [
    path("stats/", views.PlatformStatsView.as_view(), name="admin-stats"),
    path("users/", views.AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<uuid:pk>/", views.AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("moderation/", views.ModerationQueueView.as_view(), name="admin-moderation-queue"),
    path("moderation/<uuid:pk>/", views.ModerationActionView.as_view(), name="admin-moderation-action"),
    path("subscriptions/", views.AdminSubscriptionListView.as_view(), name="admin-subscription-list"),
    path("reports/", views.ReportsView.as_view(), name="admin-reports"),
    path("activity/", views.RecentActivityView.as_view(), name="admin-activity"),

    # Artist verification
    path("pending-artists/", views.PendingArtistListView.as_view(), name="admin-pending-artists"),
    path("pending-artists/<uuid:pk>/", views.ArtistVerificationDetailView.as_view(), name="admin-artist-verification-detail"),
    path("verify-artist/<uuid:pk>/", views.VerifyArtistView.as_view(), name="admin-verify-artist"),
    path("reject-artist/<uuid:pk>/", views.RejectArtistView.as_view(), name="admin-reject-artist"),
]
