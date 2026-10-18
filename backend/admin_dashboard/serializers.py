"""
Sheba Sound — Admin Dashboard Serializers
"""

from rest_framework import serializers


class PlatformStatsSerializer(serializers.Serializer):
    totalUsers = serializers.IntegerField()
    totalArtists = serializers.IntegerField()
    totalListeners = serializers.IntegerField()
    totalSongs = serializers.IntegerField()
    pendingSongs = serializers.IntegerField()
    pendingArtists = serializers.IntegerField()
    totalStreams = serializers.IntegerField()
    activeSubscriptions = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    newUsersThisMonth = serializers.IntegerField()
    newUsersLastMonth = serializers.IntegerField()


class ModerationItemSerializer(serializers.Serializer):
    songId = serializers.UUIDField()
    title = serializers.CharField()
    artistName = serializers.CharField()
    genre = serializers.CharField()
    duration = serializers.IntegerField()
    coverUrl = serializers.URLField(allow_null=True)
    status = serializers.CharField()
    submittedAt = serializers.DateTimeField()


class ModerationActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["approved", "rejected"])


class PendingArtistSerializer(serializers.Serializer):
    """Serializer for pending artist applications in admin list view."""
    id = serializers.UUIDField()
    stage_name = serializers.CharField()
    bio = serializers.CharField()
    user_email = serializers.CharField(allow_null=True, allow_blank=True)
    user_phone_number = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    user_username = serializers.CharField()
    user_full_name = serializers.CharField()
    verification_status = serializers.CharField()
    id_document_type = serializers.CharField()
    submitted_at = serializers.DateTimeField()
    profile_image_url = serializers.URLField(allow_null=True, allow_blank=True)


class ArtistVerificationActionSerializer(serializers.Serializer):
    """Serializer for admin verify/reject actions."""
    rejection_reason = serializers.CharField(required=False, default="", allow_blank=True)
