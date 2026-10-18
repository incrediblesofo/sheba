"""
Sheba Sound — Accounts Models
Custom User with email auth, ListenerProfile, ArtistProfile.
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


# ------------------------------------------------------------------ #
#  Choices                                                             #
# ------------------------------------------------------------------ #

class UserRole(models.TextChoices):
    LISTENER = "listener", "Listener"
    ARTIST = "artist", "Artist"
    ADMIN = "admin", "Admin"


class SubscriptionTier(models.TextChoices):
    FREE = "free", "Free"
    PREMIUM = "premium", "Premium"


class Genre(models.TextChoices):
    TIZITA = "tizita", "Tizita"
    BATI = "bati", "Bati"
    AMBASSEL = "ambassel", "Ambassel"
    ANCHIHOYE = "anchihoye", "Anchihoye"
    ETHIOJAZZ = "ethiojazz", "Ethio-Jazz"
    TIGRIGNA = "tigrigna", "Tigrigna"
    OROMO = "oromo", "Oromo"
    GURAGE = "gurage", "Gurage"
    MODERN = "modern", "Modern"
    GOSPEL = "gospel", "Gospel"
    HIPHOP = "hiphop", "Hip-Hop"
    OTHER = "other", "Other"


class VerificationStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    VERIFIED = "verified", "Verified"
    REJECTED = "rejected", "Rejected"


class IDDocumentType(models.TextChoices):
    NATIONAL_ID = "national_id", "National ID"
    PASSPORT = "passport", "Passport"


# ------------------------------------------------------------------ #
#  Base Model                                                          #
# ------------------------------------------------------------------ #

class TimeStampedModel(models.Model):
    """Abstract base with UUID primary key and timestamps."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ------------------------------------------------------------------ #
#  User                                                                #
# ------------------------------------------------------------------ #

class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Custom user with email or phone authentication and RBAC role."""

    email = models.EmailField(unique=True, blank=True, null=True)
    phone_number = models.CharField(
        max_length=20, unique=True, blank=True, null=True,
        help_text="Phone number in E.164 format, e.g. +251912345678",
    )
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.LISTENER,
    )
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=~models.Q(email__isnull=True, phone_number__isnull=True),
                name="user_must_have_email_or_phone",
            ),
        ]

    def __str__(self):
        identifier = self.email or self.phone_number or "no-contact"
        return f"{self.username} ({identifier})"


# ------------------------------------------------------------------ #
#  Listener Profile                                                    #
# ------------------------------------------------------------------ #

class ListenerProfile(TimeStampedModel):
    """Extended profile for listeners."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="listener_profile",
    )
    subscription_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
    )
    subscription_expiry = models.DateTimeField(blank=True, null=True)
    favorite_genres = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"ListenerProfile: {self.user.username}"


# ------------------------------------------------------------------ #
#  Artist Profile                                                      #
# ------------------------------------------------------------------ #

class ArtistProfile(TimeStampedModel):
    """Extended profile for artists (includes identity verification)."""

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="artist_profile",
    )
    stage_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, default="")
    verified = models.BooleanField(default=False)
    profile_image_url = models.URLField(max_length=500, blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    social_links = models.JSONField(default=dict, blank=True)
    total_streams = models.PositiveBigIntegerField(default=0)

    # ── Identity verification fields ──
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )
    id_document_url = models.URLField(
        max_length=500, blank=True, default="",
        help_text="Securely stored ID document URL (private, admin-only access)",
    )
    id_document_type = models.CharField(
        max_length=20,
        choices=IDDocumentType.choices,
        blank=True,
        default="",
    )
    rejection_reason = models.TextField(
        blank=True, default="",
        help_text="Admin-provided reason if the application was rejected",
    )
    submitted_at = models.DateTimeField(
        blank=True, null=True,
        help_text="When the artist application was submitted",
    )
    reviewed_at = models.DateTimeField(
        blank=True, null=True,
        help_text="When an admin last reviewed this application",
    )
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_artists",
        help_text="Admin who last reviewed this application",
    )
    is_identity_verified = models.BooleanField(
        default=False,
        help_text="True only after admin has verified the identity document",
    )

    class Meta:
        ordering = ["-total_streams"]

    def __str__(self):
        return f"ArtistProfile: {self.stage_name}"


# ------------------------------------------------------------------ #
#  Artist Verification Audit Log                                       #
# ------------------------------------------------------------------ #

class ArtistVerificationLog(TimeStampedModel):
    """Audit trail for artist verification actions."""

    class Action(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        RESUBMITTED = "resubmitted", "Resubmitted"

    artist_profile = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="verification_logs",
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="verification_actions",
    )
    reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} — {self.artist_profile.stage_name} by {self.performed_by}"
