"""
Sheba Sound — Accounts URL Configuration
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("google/", views.GoogleAuthView.as_view(), name="auth-google"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("me/avatar/", views.UpdateAvatarView.as_view(), name="auth-avatar"),
    path("me/delete/", views.DeleteAccountView.as_view(), name="auth-delete-account"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("forgot-password/", views.ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="auth-reset-password"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="auth-resend-verification"),

    # Artist profiles
    path("artists/", views.ArtistListView.as_view(), name="artist-list"),
    path("artists/<uuid:pk>/", views.ArtistDetailView.as_view(), name="artist-detail"),
    path("artist/profile/", views.ArtistOwnProfileView.as_view(), name="artist-own-profile"),
    path("artist/profile/image/", views.ArtistImageUploadView.as_view(), name="artist-image-upload"),
    path("become-artist/", views.BecomeArtistView.as_view(), name="become-artist"),
    path("artist-status/", views.ArtistVerificationStatusView.as_view(), name="artist-status"),
]
