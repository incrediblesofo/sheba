"""
Sheba Sound — Accounts Serializers
"""

import re
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import ArtistProfile, ListenerProfile

User = get_user_model()


# ------------------------------------------------------------------ #
#  Phone number validation helper                                      #
# ------------------------------------------------------------------ #

# E.164 format: + followed by 1-3 digit country code, then 4-14 digits
PHONE_E164_REGEX = re.compile(r"^\+[1-9]\d{6,14}$")


def validate_phone_number_format(value: str) -> str:
    """Validate that a phone number is in E.164 format."""
    value = value.strip()
    if not PHONE_E164_REGEX.match(value):
        raise serializers.ValidationError(
            "Phone number must be in E.164 format (e.g. +251912345678)."
        )
    return value


# ------------------------------------------------------------------ #
#  User                                                                #
# ------------------------------------------------------------------ #

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "email", "phone_number", "username", "first_name", "last_name",
            "role", "avatar_url", "is_active", "is_verified",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_active", "is_verified"]


# ------------------------------------------------------------------ #
#  Profiles                                                            #
# ------------------------------------------------------------------ #

class ListenerProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ListenerProfile
        fields = [
            "id", "user", "subscription_tier", "subscription_expiry",
            "favorite_genres", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class ArtistProfileSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    followers_count = serializers.SerializerMethodField()
    total_streams = serializers.SerializerMethodField()

    class Meta:
        model = ArtistProfile
        fields = [
            "id", "user", "stage_name", "bio", "verified",
            "profile_image_url", "cover_image_url", "social_links", "total_streams",
            "followers_count",
            "verification_status", "submitted_at", "rejection_reason",
            "is_identity_verified",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "verified", "total_streams", "followers_count",
            "verification_status", "submitted_at", "rejection_reason",
            "is_identity_verified",
            "created_at", "updated_at",
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_total_streams(self, obj):
        from django.db.models import Sum
        song_total = obj.songs.aggregate(total=Sum("stream_count"))["total"]
        return song_total if song_total is not None else obj.total_streams


# ------------------------------------------------------------------ #
#  Become Artist                                                       #
# ------------------------------------------------------------------ #

# Allowed file types and max size for uploads
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


class BecomeArtistSerializer(serializers.Serializer):
    """Accepts data for upgrading a listener account to an artist (with ID verification)."""

    artist_name = serializers.CharField(max_length=255)
    genre = serializers.CharField(max_length=50, required=False, default="")
    bio = serializers.CharField(required=False, default="", allow_blank=True)

    # ID verification fields
    id_document = serializers.ImageField(required=True)
    id_document_type = serializers.ChoiceField(
        choices=[("national_id", "National ID"), ("passport", "Passport")],
        required=True,
    )

    # Optional profile picture
    profile_picture = serializers.ImageField(required=False)

    def validate_artist_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Artist name cannot be empty.")
        return value.strip()

    def validate_id_document(self, value):
        """Validate ID document: JPEG/PNG only, max 5MB."""
        if value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f"Unsupported file type '{value.content_type}'. Only JPEG and PNG are allowed."
            )
        if value.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."
            )
        return value

    def validate_profile_picture(self, value):
        """Validate profile picture: JPEG/PNG only, max 5MB."""
        if value.content_type not in ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError(
                f"Unsupported file type '{value.content_type}'. Only JPEG and PNG are allowed."
            )
        if value.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."
            )
        return value


# ------------------------------------------------------------------ #
#  Auth                                                                #
# ------------------------------------------------------------------ #

class RegisterSerializer(serializers.Serializer):
    # Registration method: "email" (default) or "phone"
    registration_method = serializers.ChoiceField(
        choices=["email", "phone"], default="email", required=False,
    )

    # Email fields (required when registration_method == "email")
    email = serializers.EmailField(required=False, allow_blank=True)

    # Phone fields (required when registration_method == "phone")
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Common fields
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=["listener"], default="listener", required=False,
    )

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_phone_number(self, value):
        if value:
            value = validate_phone_number_format(value)
            if User.objects.filter(phone_number=value).exists():
                raise serializers.ValidationError("A user with this phone number already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, data):
        method = data.get("registration_method", "email")

        if method == "email":
            if not data.get("email"):
                raise serializers.ValidationError({"email": "Email is required for email registration."})
        elif method == "phone":
            if not data.get("phone_number"):
                raise serializers.ValidationError({"phone_number": "Phone number is required for phone registration."})

        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        validated_data.pop("role", None)
        method = validated_data.pop("registration_method", "email")
        password = validated_data.pop("password")

        # Clean up empty optional fields
        email = validated_data.pop("email", None) or None
        phone_number = validated_data.pop("phone_number", None) or None

        # All new users register as listeners; artists upgrade later
        user = User.objects.create_user(
            email=email,
            phone_number=phone_number,
            password=password,
            role="listener",
            **validated_data,
        )

        ListenerProfile.objects.create(user=user)

        # Phone-registered users are auto-verified (no email to verify)
        if method == "phone":
            user.is_verified = True
            user.save(update_fields=["is_verified"])
        else:
            from notifications.email_service import EmailService

            # send_mail failures are caught inside EmailService._send (returns False)
            user._verification_email_sent = EmailService.send_verification_email(user)

        return user


class LoginSerializer(serializers.Serializer):
    # Login method: "email" (default) or "phone"
    login_method = serializers.ChoiceField(
        choices=["email", "phone"], default="email", required=False,
    )
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        method = data.get("login_method", "email")
        if method == "email":
            if not data.get("email"):
                raise serializers.ValidationError({"email": "Email is required for email login."})
        elif method == "phone":
            if not data.get("phone_number"):
                raise serializers.ValidationError({"phone_number": "Phone number is required for phone login."})
        return data


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Add the user role to the JWT payload."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate(self, data):
        if data["new_password"] != data["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        return data
