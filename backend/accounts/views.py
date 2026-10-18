"""
Sheba Sound — Accounts Views
Auth endpoints + artist profile management + identity verification.
"""

from django.contrib.auth import authenticate, get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.exceptions import TokenError

from .models import ArtistProfile, ListenerProfile, ArtistVerificationLog, VerificationStatus
from .serializers import (
    ArtistProfileSerializer,
    BecomeArtistSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)

User = get_user_model()


# ------------------------------------------------------------------ #
#  Permissions                                                         #
# ------------------------------------------------------------------ #

class IsArtist(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("artist", "admin")


class IsVerifiedArtist(permissions.BasePermission):
    """Only artists whose identity has been verified can create content."""
    message = "Your identity verification is still pending or was rejected. Only verified artists can upload music."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == "admin":
            return True
        if request.user.role != "artist":
            return False
        try:
            return request.user.artist_profile.verification_status == VerificationStatus.VERIFIED
        except ArtistProfile.DoesNotExist:
            return False


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


# ------------------------------------------------------------------ #
#  Auth Views                                                          #
# ------------------------------------------------------------------ #

class RegisterView(APIView):
    """POST /api/auth/register/ — create a new listener or artist account."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        message = "Account created successfully."
        payload = {"user": UserSerializer(user).data, "message": message}

        if user.email and not user.is_verified:
            sent = getattr(user, "_verification_email_sent", False)
            payload["verification_email_sent"] = sent
            if not sent:
                payload["message"] = (
                    "Account created. We could not send the verification email. "
                    "After you sign in, tap Resend in the banner at the top, or contact support if this continues."
                )

        return Response(payload, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/ — obtain JWT tokens + user object.
       Supports login via email or phone number."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        login_method = serializer.validated_data.get("login_method", "email")
        password = serializer.validated_data["password"]

        if login_method == "phone":
            phone_number = serializer.validated_data.get("phone_number")
            user = authenticate(request, phone_number=phone_number, password=password)
            error_msg = "Invalid phone number or password."
        else:
            email = serializer.validated_data.get("email")
            user = authenticate(request, email=email, password=password)
            error_msg = "Invalid email or password."

        if user is None:
            return Response({"detail": error_msg}, status=status.HTTP_401_UNAUTHORIZED)
        if not user.is_active:
            return Response({"detail": "Account is deactivated."}, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        return Response({
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
            "user": UserSerializer(user).data,
        })


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist the refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"detail": "Refresh token is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            return Response({"detail": "Token is invalid or already blacklisted."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"detail": "Successfully logged out."})


class MeView(APIView):
    """GET /api/auth/me/ — return the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DeleteAccountView(APIView):
    """DELETE /api/auth/me/delete/ — permanently delete the authenticated user's account.

    Requires ``password`` in the request body for security confirmation.
    Deletes the user and ALL associated data (songs, playlists, follows,
    subscriptions) via Django's cascade delete.
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        password = request.data.get("password", "").strip()
        if not password:
            return Response(
                {"detail": "Password is required to confirm account deletion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(password):
            return Response(
                {"detail": "Incorrect password. Account deletion cancelled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        user_email = request.user.email or request.user.username

        # Permanently delete the user — cascades to all related objects
        request.user.delete()

        return Response(
            {"detail": f"Account '{user_email}' has been permanently deleted."},
            status=status.HTTP_200_OK,
        )


class UpdateAvatarView(APIView):
    """POST /api/auth/me/avatar/ — upload / change profile image.
       DELETE /api/auth/me/avatar/ — remove profile image."""
    permission_classes = [permissions.IsAuthenticated]
    MAX_SIZE_MB = 5
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    def post(self, request):
        file = request.FILES.get("avatar")
        if not file:
            return Response({"detail": "No file provided. Send a file under the 'avatar' field."}, status=status.HTTP_400_BAD_REQUEST)
        if file.content_type not in self.ALLOWED_TYPES:
            return Response({"detail": f"Unsupported image type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF."}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > self.MAX_SIZE_MB * 1024 * 1024:
            return Response({"detail": f"Image must be smaller than {self.MAX_SIZE_MB}MB."}, status=status.HTTP_400_BAD_REQUEST)

        avatar_url = self._save_image(file, request.user)
        request.user.avatar_url = avatar_url
        request.user.save(update_fields=["avatar_url"])
        return Response({"message": "Profile image updated successfully.", "avatar_url": avatar_url, "user": UserSerializer(request.user).data})

    def delete(self, request):
        request.user.avatar_url = None
        request.user.save(update_fields=["avatar_url"])
        return Response({"message": "Profile image removed.", "user": UserSerializer(request.user).data})

    @staticmethod
    def _save_image(file, user):
        """Try Cloudinary first; fall back to local media storage."""
        from django.conf import settings
        if getattr(settings, "CLOUDINARY_CLOUD_NAME", ""):
            try:
                import cloudinary.uploader
                result = cloudinary.uploader.upload(
                    file, folder="avatars", public_id=str(user.id), overwrite=True,
                    resource_type="image",
                    transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}],
                )
                return result["secure_url"]
            except Exception:
                pass
        import os
        ext = os.path.splitext(file.name)[1] or ".jpg"
        filename = f"avatars/{user.id}{ext}"
        filepath = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        return f"{settings.MEDIA_URL}{filename}"


class ForgotPasswordView(APIView):
    """POST /api/auth/forgot-password/ — send a password-reset email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"message": "If this email exists, a reset link has been sent."})
        from notifications.email_service import EmailService
        uid, token = EmailService.generate_password_reset_token(user)
        EmailService.send_password_reset_email(user, uid, token)
        return Response({"message": "If this email exists, a reset link has been sent."})


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ — validate token and set new password."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid_b64 = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        try:
            user_id = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)
        from notifications.email_service import EmailService
        if not EmailService.verify_password_reset_token(user, token):
            return Response({"detail": "Invalid or expired reset link."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        # Send password changed confirmation (fire-and-forget)
        try:
            EmailService.send_password_changed_email(user)
        except Exception:
            pass
        return Response({"message": "Password has been reset successfully."})


class VerifyEmailView(APIView):
    """GET /api/auth/verify-email/?uid=...&token=..."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        uid_b64 = request.query_params.get("uid")
        token = request.query_params.get("token")
        if not uid_b64 or not token:
            return Response({"detail": "uid and token query parameters are required."}, status=status.HTTP_400_BAD_REQUEST)
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
        try:
            user_id = force_str(urlsafe_base64_decode(uid_b64))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"detail": "Invalid verification link."}, status=status.HTTP_400_BAD_REQUEST)
        if user.is_verified:
            return Response({"detail": "Email is already verified.", "already_verified": True})
        from notifications.email_service import EmailService
        if not EmailService.verify_email_token(user, token):
            return Response({"detail": "Invalid or expired verification link."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_verified = True
        user.save(update_fields=["is_verified"])
        try:
            EmailService.send_welcome_email(user)
        except Exception:
            pass
        return Response({"detail": "Email verified successfully.", "verified": True})


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response({"detail": "Email is already verified."})
        from notifications.email_service import EmailService
        sent = EmailService.send_verification_email(user)
        if sent:
            return Response({"detail": "Verification email sent. Check your inbox."})
        return Response({"detail": "Failed to send verification email. Please try again later."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GoogleAuthView(APIView):
    """POST /api/auth/google/ — sign in or register with a Google ID token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token_str = request.data.get("id_token")
        if not id_token_str:
            return Response({"detail": "id_token is required."}, status=status.HTTP_400_BAD_REQUEST)
        from django.conf import settings
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
        if not client_id:
            return Response({"detail": "Google authentication is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            idinfo = google_id_token.verify_oauth2_token(id_token_str, google_requests.Request(), client_id)
        except ValueError:
            return Response({"detail": "Invalid Google token."}, status=status.HTTP_401_UNAUTHORIZED)
        email = idinfo.get("email")
        if not email:
            return Response({"detail": "Google account does not have an email."}, status=status.HTTP_400_BAD_REQUEST)
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        picture = idinfo.get("picture", "")
        try:
            user = User.objects.get(email=email)
            if not user.avatar_url and picture:
                user.avatar_url = picture
                user.save(update_fields=["avatar_url"])
        except User.DoesNotExist:
            base_username = email.split("@")[0].replace(".", "_")[:30]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1
            user = User.objects.create_user(email=email, username=username, first_name=first_name, last_name=last_name, role="listener")
            user.set_unusable_password()
            user.is_verified = True
            if picture:
                user.avatar_url = picture
            user.save()
            ListenerProfile.objects.create(user=user)
            try:
                from notifications.email_service import EmailService
                EmailService.send_welcome_email(user)
            except Exception:
                pass
        if not user.is_active:
            return Response({"detail": "Account is deactivated."}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({
            "tokens": {"access": str(refresh.access_token), "refresh": str(refresh)},
            "user": UserSerializer(user).data,
        })


# ------------------------------------------------------------------ #
#  File Upload Helpers                                                  #
# ------------------------------------------------------------------ #

def _upload_id_document(file, artist_profile):
    """Upload ID document securely (Cloudinary private or local private dir)."""
    from django.conf import settings

    if getattr(settings, "CLOUDINARY_CLOUD_NAME", ""):
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file,
                folder="id_documents",
                public_id=f"id_{artist_profile.id}",
                overwrite=True,
                resource_type="image",
                type="private",
            )
            return result["secure_url"]
        except Exception:
            pass

    # Local fallback — store in private dir (not served by Django static)
    import os
    ext = os.path.splitext(file.name)[1] or ".jpg"
    filename = f"private/id_documents/{artist_profile.id}{ext}"
    filepath = os.path.join(settings.MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    return f"{settings.MEDIA_URL}{filename}"


def _upload_profile_picture(file, artist_profile):
    """Upload profile picture to Cloudinary or local storage."""
    from django.conf import settings

    if getattr(settings, "CLOUDINARY_CLOUD_NAME", ""):
        try:
            import cloudinary.uploader
            result = cloudinary.uploader.upload(
                file,
                folder="artist_profiles",
                public_id=f"{artist_profile.id}_profile",
                overwrite=True,
                resource_type="image",
                transformation=[{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}],
            )
            return result["secure_url"]
        except Exception:
            pass

    import os
    ext = os.path.splitext(file.name)[1] or ".jpg"
    filename = f"artist_profiles/{artist_profile.id}{ext}"
    filepath = os.path.join(settings.MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb+") as dest:
        for chunk in file.chunks():
            dest.write(chunk)
    return f"{settings.MEDIA_URL}{filename}"


# ------------------------------------------------------------------ #
#  Become Artist (with Identity Verification)                          #
# ------------------------------------------------------------------ #

class BecomeArtistView(APIView):
    """POST /api/users/become-artist/ — submit artist application with ID verification.
       PUT  /api/users/become-artist/ — resubmit after rejection."""

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user

        # Check if user already has an ArtistProfile
        existing = ArtistProfile.objects.filter(user=user).first()
        if existing:
            # If admin demoted this artist back to listener but the old
            # verified profile still exists, clean it up so they can re-apply.
            if (
                user.role == "listener"
                and existing.verification_status == VerificationStatus.VERIFIED
            ):
                existing.delete()
                existing = None  # allow fall-through to create new profile

        if existing:
            if existing.verification_status == VerificationStatus.VERIFIED:
                return Response({"detail": "You are already a verified artist."}, status=status.HTTP_400_BAD_REQUEST)
            if existing.verification_status == VerificationStatus.PENDING:
                return Response({
                    "detail": "Your artist application is already under review.",
                    "verification_status": "pending",
                    "submitted_at": existing.submitted_at,
                }, status=status.HTTP_400_BAD_REQUEST)
            # If rejected, tell them to use PUT to resubmit
            if existing.verification_status == VerificationStatus.REJECTED:
                return Response({
                    "detail": "Your previous application was rejected. Use the resubmit option to apply again.",
                    "verification_status": "rejected",
                    "rejection_reason": existing.rejection_reason,
                }, status=status.HTTP_400_BAD_REQUEST)

        serializer = BecomeArtistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                artist_profile = ArtistProfile.objects.create(
                    user=user,
                    stage_name=serializer.validated_data["artist_name"],
                    bio=serializer.validated_data.get("bio", ""),
                    verification_status=VerificationStatus.PENDING,
                    id_document_type=serializer.validated_data["id_document_type"],
                    submitted_at=timezone.now(),
                )

                # Upload ID document securely
                id_doc = serializer.validated_data["id_document"]
                artist_profile.id_document_url = _upload_id_document(id_doc, artist_profile)

                # Upload profile picture if provided
                profile_pic = serializer.validated_data.get("profile_picture")
                if profile_pic:
                    artist_profile.profile_image_url = _upload_profile_picture(profile_pic, artist_profile)

                artist_profile.save()

                # Audit log
                ArtistVerificationLog.objects.create(
                    artist_profile=artist_profile,
                    action=ArtistVerificationLog.Action.SUBMITTED,
                    performed_by=user,
                )

                # Role stays as listener until approved

        except Exception:
            return Response(
                {"detail": "An error occurred while creating the artist profile."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({
            "message": "Your artist application has been submitted for review. We'll notify you once it's reviewed.",
            "artist_profile": ArtistProfileSerializer(artist_profile).data,
            "user": UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)

    def put(self, request):
        """Resubmit after rejection."""
        user = request.user

        try:
            artist_profile = ArtistProfile.objects.get(user=user)
        except ArtistProfile.DoesNotExist:
            return Response({"detail": "No existing application found. Submit a new one instead."}, status=status.HTTP_404_NOT_FOUND)

        if artist_profile.verification_status != VerificationStatus.REJECTED:
            return Response({"detail": "You can only resubmit after a rejection."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = BecomeArtistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                artist_profile.stage_name = serializer.validated_data["artist_name"]
                artist_profile.bio = serializer.validated_data.get("bio", "")
                artist_profile.id_document_type = serializer.validated_data["id_document_type"]
                artist_profile.verification_status = VerificationStatus.PENDING
                artist_profile.rejection_reason = ""
                artist_profile.submitted_at = timezone.now()
                artist_profile.reviewed_at = None
                artist_profile.reviewed_by = None

                # Re-upload ID document
                id_doc = serializer.validated_data["id_document"]
                artist_profile.id_document_url = _upload_id_document(id_doc, artist_profile)

                # Re-upload profile picture if provided
                profile_pic = serializer.validated_data.get("profile_picture")
                if profile_pic:
                    artist_profile.profile_image_url = _upload_profile_picture(profile_pic, artist_profile)

                artist_profile.save()

                ArtistVerificationLog.objects.create(
                    artist_profile=artist_profile,
                    action=ArtistVerificationLog.Action.RESUBMITTED,
                    performed_by=user,
                )
        except Exception:
            return Response({"detail": "An error occurred while resubmitting."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            "message": "Your application has been resubmitted for review.",
            "artist_profile": ArtistProfileSerializer(artist_profile).data,
            "user": UserSerializer(user).data,
        })


# ------------------------------------------------------------------ #
#  Artist Verification Status                                          #
# ------------------------------------------------------------------ #

class ArtistVerificationStatusView(APIView):
    """GET /api/auth/artist-status/ — check current verification status."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            profile = ArtistProfile.objects.get(user=request.user)
        except ArtistProfile.DoesNotExist:
            return Response({
                "has_application": False,
                "verification_status": None,
            })

        # If the admin demoted this user back to "listener" but the old
        # ArtistProfile still carries a "verified" status, the profile is
        # stale.  Delete it so the user can apply from scratch.
        if (
            request.user.role == "listener"
            and profile.verification_status == VerificationStatus.VERIFIED
        ):
            profile.delete()
            return Response({
                "has_application": False,
                "verification_status": None,
            })

        data = {
            "has_application": True,
            "verification_status": profile.verification_status,
            "stage_name": profile.stage_name,
            "submitted_at": profile.submitted_at,
            "is_identity_verified": profile.is_identity_verified,
        }

        if profile.verification_status == VerificationStatus.REJECTED:
            data["rejection_reason"] = profile.rejection_reason

        return Response(data)


# ------------------------------------------------------------------ #
#  Artist Profile Views                                                #
# ------------------------------------------------------------------ #

class ArtistListView(generics.ListAPIView):
    """GET /api/auth/artists/ — public list of verified artists."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ArtistProfileSerializer
    queryset = ArtistProfile.objects.filter(verified=True).select_related("user")
    search_fields = ["stage_name", "bio"]


class ArtistDetailView(generics.RetrieveAPIView):
    """GET /api/auth/artists/<id>/ — single artist profile."""
    permission_classes = [permissions.AllowAny]
    serializer_class = ArtistProfileSerializer
    queryset = ArtistProfile.objects.all()


class ArtistOwnProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/artist/profile/ — current artist's profile."""
    permission_classes = [IsArtist]
    serializer_class = ArtistProfileSerializer

    def get_object(self):
        return get_object_or_404(ArtistProfile, user=self.request.user)


class ArtistImageUploadView(APIView):
    """POST /api/auth/artist/profile/image/ — upload profile photo or cover image.
       DELETE /api/auth/artist/profile/image/?type=profile|cover — remove image."""
    permission_classes = [IsArtist]
    MAX_SIZE_MB = 10
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

    def post(self, request):
        file = request.FILES.get("image")
        image_type = request.data.get("type", "profile")
        if image_type not in ("profile", "cover"):
            return Response({"detail": "type must be 'profile' or 'cover'."}, status=status.HTTP_400_BAD_REQUEST)
        if not file:
            return Response({"detail": "No file provided. Send a file under the 'image' field."}, status=status.HTTP_400_BAD_REQUEST)
        if file.content_type not in self.ALLOWED_TYPES:
            return Response({"detail": f"Unsupported image type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF."}, status=status.HTTP_400_BAD_REQUEST)
        if file.size > self.MAX_SIZE_MB * 1024 * 1024:
            return Response({"detail": f"Image must be smaller than {self.MAX_SIZE_MB}MB."}, status=status.HTTP_400_BAD_REQUEST)

        artist_profile = get_object_or_404(ArtistProfile, user=request.user)
        image_url = self._save_image(file, artist_profile, image_type)

        if image_type == "profile":
            artist_profile.profile_image_url = image_url
            artist_profile.save(update_fields=["profile_image_url"])
        else:
            artist_profile.cover_image_url = image_url
            artist_profile.save(update_fields=["cover_image_url"])

        return Response({
            "message": f"{'Profile photo' if image_type == 'profile' else 'Cover image'} updated successfully.",
            "image_url": image_url,
            "artist_profile": ArtistProfileSerializer(artist_profile).data,
        })

    def delete(self, request):
        image_type = request.query_params.get("type", "profile")
        if image_type not in ("profile", "cover"):
            return Response({"detail": "type must be 'profile' or 'cover'."}, status=status.HTTP_400_BAD_REQUEST)
        artist_profile = get_object_or_404(ArtistProfile, user=request.user)
        if image_type == "profile":
            artist_profile.profile_image_url = None
            artist_profile.save(update_fields=["profile_image_url"])
        else:
            artist_profile.cover_image_url = None
            artist_profile.save(update_fields=["cover_image_url"])
        return Response({
            "message": f"{'Profile photo' if image_type == 'profile' else 'Cover image'} removed.",
            "artist_profile": ArtistProfileSerializer(artist_profile).data,
        })

    @staticmethod
    def _save_image(file, artist_profile, image_type):
        """Try Cloudinary first; fall back to local media storage."""
        from django.conf import settings
        folder = "artist_profiles" if image_type == "profile" else "artist_covers"
        public_id = f"{artist_profile.id}_{image_type}"
        if getattr(settings, "CLOUDINARY_CLOUD_NAME", ""):
            try:
                import cloudinary.uploader
                transformation = (
                    [{"width": 400, "height": 400, "crop": "fill", "gravity": "face"}]
                    if image_type == "profile"
                    else [{"width": 1500, "height": 500, "crop": "fill", "gravity": "auto"}]
                )
                result = cloudinary.uploader.upload(
                    file, folder=folder, public_id=public_id, overwrite=True,
                    resource_type="image", transformation=transformation,
                )
                return result["secure_url"]
            except Exception:
                pass
        import os
        ext = os.path.splitext(file.name)[1] or ".jpg"
        filename = f"{folder}/{artist_profile.id}{ext}"
        filepath = os.path.join(settings.MEDIA_ROOT, filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "wb+") as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        return f"{settings.MEDIA_URL}{filename}"
