"""
Sheba Sound — Admin Dashboard Views
Platform stats, user management, content moderation, subscription overview, reports.
All endpoints require admin role.
"""

import datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, F
from django.db.models.functions import TruncMonth, TruncDay
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ArtistProfile, ArtistVerificationLog, UserRole, VerificationStatus
from accounts.serializers import UserSerializer, ArtistProfileSerializer
from accounts.views import IsAdmin
from music.models import Song, SongStatus, StreamEvent
from music.geoip import country_display
from subscriptions.models import Subscription

from .serializers import (
    ArtistVerificationActionSerializer,
    ModerationActionSerializer,
    ModerationItemSerializer,
    PendingArtistSerializer,
    PlatformStatsSerializer,
)

User = get_user_model()


# ------------------------------------------------------------------ #
#  Platform Stats                                                      #
# ------------------------------------------------------------------ #

class PlatformStatsView(APIView):
    """GET /api/admin-dashboard/stats/"""

    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()
        total_streams = Song.objects.aggregate(total=Sum("stream_count"))["total"] or 0
        pending_songs = Song.objects.filter(status=SongStatus.PENDING).count()
        pending_artists = ArtistProfile.objects.filter(verification_status=VerificationStatus.PENDING).count()
        active_subs = Subscription.objects.filter(is_active=True).count()

        # Real user growth stats
        this_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 1:
            last_month_start = now.replace(year=now.year - 1, month=12, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            last_month_start = now.replace(month=now.month - 1, day=1, hour=0, minute=0, second=0, microsecond=0)

        new_users_this_month = User.objects.filter(created_at__gte=this_month_start).count()
        new_users_last_month = User.objects.filter(
            created_at__gte=last_month_start,
            created_at__lt=this_month_start,
        ).count()

        data = {
            "totalUsers": User.objects.count(),
            "totalArtists": User.objects.filter(role=UserRole.ARTIST).count(),
            "totalListeners": User.objects.filter(role=UserRole.LISTENER).count(),
            "totalSongs": Song.objects.count(),
            "pendingSongs": pending_songs,
            "pendingArtists": pending_artists,
            "totalStreams": total_streams,
            "activeSubscriptions": active_subs,
            "revenue": active_subs * 2999,
            "newUsersThisMonth": new_users_this_month,
            "newUsersLastMonth": new_users_last_month,
        }
        serializer = PlatformStatsSerializer(data)
        return Response(serializer.data)


# ------------------------------------------------------------------ #
#  User Management                                                     #
# ------------------------------------------------------------------ #

class AdminUserListView(generics.ListAPIView):
    """GET /api/admin-dashboard/users/"""

    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    queryset = User.objects.all()
    filterset_fields = ["role", "is_active", "is_verified"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering_fields = ["created_at", "email"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/admin-dashboard/users/<id>/"""

    permission_classes = [IsAdmin]
    serializer_class = UserSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        user = self.get_object()
        was_active = user.is_active
        instance = serializer.save()

        # Detect account suspension (is_active changed from True → False)
        if was_active and not instance.is_active:
            reason = self.request.data.get("reason", "")
            try:
                from notifications.email_service import EmailService
                EmailService.send_account_suspended_email(instance, reason=reason)
            except Exception:
                pass  # Email failure should never block admin action


# ------------------------------------------------------------------ #
#  Content Moderation                                                  #
# ------------------------------------------------------------------ #

class ModerationQueueView(generics.ListAPIView):
    """GET /api/admin-dashboard/moderation/ — paginated songs list with moderation status."""

    permission_classes = [IsAdmin]
    serializer_class = ModerationItemSerializer
    filterset_fields = ["status"]
    ordering_fields = ["created_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Song.objects.select_related("artist").order_by("-created_at")

    def get_serializer(self, *args, **kwargs):
        """Build the dict representation expected by ModerationItemSerializer."""
        songs = args[0] if args else []
        if hasattr(songs, '__iter__') and not isinstance(songs, dict):
            items = [
                {
                    "songId": song.id,
                    "title": song.title,
                    "artistName": song.artist.stage_name,
                    "genre": song.genre,
                    "duration": song.duration,
                    "coverUrl": song.cover_image_url,
                    "status": song.status,
                    "submittedAt": song.created_at,
                }
                for song in songs
            ]
        else:
            items = songs
        return ModerationItemSerializer(items, **kwargs)


class ModerationActionView(APIView):
    """PATCH /api/admin-dashboard/moderation/<id>/ — approve or reject a song."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            song = Song.objects.select_related("artist", "artist__user").get(pk=pk)
        except Song.DoesNotExist:
            return Response(
                {"detail": "Song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = ModerationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        song.status = new_status
        song.save(update_fields=["status"])

        # Send email notification to the artist (fire-and-forget)
        try:
            from notifications.email_service import EmailService

            artist_user = song.artist.user
            if new_status == SongStatus.APPROVED:
                EmailService.send_song_approved_email(artist_user, song)
                # Notify all followers (listeners) about the new release
                EmailService.notify_followers_of_new_release(song, song.artist)
            elif new_status == SongStatus.REJECTED:
                reason = request.data.get("reason", "")
                EmailService.send_song_rejected_email(artist_user, song, reason=reason)
        except Exception:
            pass  # Email failure should never block the moderation action

        return Response({"detail": f"Song {song.status}.", "status": song.status})


# ------------------------------------------------------------------ #
#  Subscription Overview                                               #
# ------------------------------------------------------------------ #

class AdminSubscriptionListView(generics.ListAPIView):
    """GET /api/admin-dashboard/subscriptions/"""

    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        from subscriptions.serializers import SubscriptionSerializer
        return SubscriptionSerializer

    queryset = Subscription.objects.select_related("user").all()
    filterset_fields = ["tier", "is_active", "payment_provider"]
    search_fields = ["user__email", "user__username"]


# ------------------------------------------------------------------ #
#  Recent Activity Feed                                                #
# ------------------------------------------------------------------ #

class RecentActivityView(APIView):
    """GET /api/admin-dashboard/activity/ — recent platform events."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from django.utils import timezone
        from datetime import timedelta
        from django.utils.timesince import timesince

        now = timezone.now()
        since = now - timedelta(days=7)

        activities = []

        # Recent user registrations
        recent_users = User.objects.filter(created_at__gte=since).order_by("-created_at")[:5]
        for u in recent_users:
            activities.append({
                "id": f"act-user-{u.id}",
                "action": "New user registered",
                "user": f"{u.first_name} {u.last_name}",
                "timestamp": timesince(u.created_at, now) + " ago",
                "type": "user",
                "created_at": u.created_at.isoformat(),
            })

        # Recent song uploads
        recent_songs = Song.objects.filter(created_at__gte=since).select_related("artist").order_by("-created_at")[:5]
        for s in recent_songs:
            activities.append({
                "id": f"act-song-{s.id}",
                "action": f'Song "{s.title}" uploaded for review',
                "user": s.artist.stage_name,
                "timestamp": timesince(s.created_at, now) + " ago",
                "type": "song",
                "created_at": s.created_at.isoformat(),
            })

        # Recent song approvals
        recent_approved = (
            Song.objects
            .filter(status=SongStatus.APPROVED, updated_at__gte=since)
            .select_related("artist")
            .order_by("-updated_at")[:3]
        )
        for s in recent_approved:
            activities.append({
                "id": f"act-approve-{s.id}",
                "action": f'Song "{s.title}" approved',
                "user": "Admin",
                "timestamp": timesince(s.updated_at, now) + " ago",
                "type": "song",
                "created_at": s.updated_at.isoformat(),
            })

        # Recent subscriptions
        recent_subs = Subscription.objects.filter(created_at__gte=since).select_related("user").order_by("-created_at")[:3]
        for sub in recent_subs:
            u = sub.user
            activities.append({
                "id": f"act-sub-{sub.id}",
                "action": "Premium subscription activated",
                "user": f"{u.first_name} {u.last_name}",
                "timestamp": timesince(sub.created_at, now) + " ago",
                "type": "subscription",
                "created_at": sub.created_at.isoformat(),
            })

        # Sort by actual datetime descending
        activities.sort(key=lambda a: a["created_at"], reverse=True)
        # Remove the helper field
        for a in activities:
            del a["created_at"]

        return Response(activities[:10])


# ------------------------------------------------------------------ #
#  Reports / Analytics                                                 #
# ------------------------------------------------------------------ #

class ReportsView(APIView):
    """GET /api/admin-dashboard/reports/ — real aggregated platform analytics."""

    permission_classes = [IsAdmin]

    def get(self, request):
        now = timezone.now()

        # ── Genre distribution — single DB aggregation query ──
        genre_counts = dict(
            Song.objects
            .values("genre")
            .annotate(count=Count("id"))
            .values_list("genre", "count")
        )

        # ── Top artists by streams ──
        top_artists = list(
            ArtistProfile.objects
            .order_by("-total_streams")
            .values("id", "stage_name", "total_streams")[:10]
        )

        # ── Top songs by streams ──
        top_songs = list(
            Song.objects
            .filter(status=SongStatus.APPROVED)
            .order_by("-stream_count")
            .values("id", "title", "stream_count")[:10]
        )

        # ── User growth (monthly registrations, last 12 months) ──
        twelve_months_ago = now - datetime.timedelta(days=365)
        user_growth_raw = (
            User.objects
            .filter(created_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(count=Count("id"))
            .order_by("month")
        )
        # Build a full 12-month grid
        ug_map = {r["month"].strftime("%Y-%m"): r["count"] for r in user_growth_raw}
        user_growth = []
        today = now.date()
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            key = f"{y:04d}-{m:02d}"
            label = datetime.date(y, m, 1).strftime("%b %Y")
            user_growth.append({"month": label, "count": ug_map.get(key, 0)})

        # ── Stream trends (daily streams, last 30 days) ──
        thirty_days_ago = now - datetime.timedelta(days=30)
        stream_trends_raw = (
            StreamEvent.objects
            .filter(streamed_at__gte=thirty_days_ago)
            .annotate(day=TruncDay("streamed_at"))
            .values("day")
            .annotate(count=Count("id"))
            .order_by("day")
        )
        st_map = {r["day"].strftime("%Y-%m-%d"): r["count"] for r in stream_trends_raw}
        stream_trends = []
        for i in range(29, -1, -1):
            d = (now - datetime.timedelta(days=i)).date()
            key = d.strftime("%Y-%m-%d")
            label = d.strftime("%b %d")
            stream_trends.append({"date": label, "streams": st_map.get(key, 0)})

        # ── Listener demographics ──
        from accounts.models import ListenerProfile, SubscriptionTier

        total_users = User.objects.count()
        total_listeners = User.objects.filter(role=UserRole.LISTENER).count()
        total_artists = User.objects.filter(role=UserRole.ARTIST).count()
        total_admins = User.objects.filter(role=UserRole.ADMIN).count()

        premium_count = ListenerProfile.objects.filter(
            subscription_tier=SubscriptionTier.PREMIUM,
        ).count()
        free_count = total_listeners - premium_count

        listener_demographics = {
            "byRole": [
                {"label": "Listeners", "value": total_listeners},
                {"label": "Artists", "value": total_artists},
                {"label": "Admins", "value": total_admins},
            ],
            "byTier": [
                {"label": "Free", "value": free_count},
                {"label": "Premium", "value": premium_count},
            ],
        }

        # ── Geographic distribution (from StreamEvent) ──
        geo_raw = (
            StreamEvent.objects
            .exclude(country="")
            .values("country")
            .annotate(streams=Count("id"))
            .order_by("-streams")[:10]
        )
        geographic_distribution = []
        for row in geo_raw:
            display = country_display(row["country"])
            geographic_distribution.append({
                "country": display["country"],
                "code": display["code"],
                "flag": display["flag"],
                "streams": row["streams"],
            })

        return Response({
            "genreDistribution": genre_counts,
            "topArtists": top_artists,
            "topSongs": top_songs,
            "totalUsers": total_users,
            "totalSongs": Song.objects.count(),
            "totalStreams": Song.objects.aggregate(total=Sum("stream_count"))["total"] or 0,
            "userGrowth": user_growth,
            "streamTrends": stream_trends,
            "listenerDemographics": listener_demographics,
            "geographicDistribution": geographic_distribution,
        })


# ------------------------------------------------------------------ #
#  Artist Verification Management                                      #
# ------------------------------------------------------------------ #

class PendingArtistListView(APIView):
    """GET /api/admin-dashboard/pending-artists/ — list pending artist applications."""

    permission_classes = [IsAdmin]

    def get(self, request):
        status_filter = request.query_params.get("status", "pending")
        profiles = ArtistProfile.objects.filter(
            verification_status=status_filter
        ).select_related("user").order_by("-submitted_at")

        items = []
        for p in profiles:
            items.append({
                "id": p.id,
                "stage_name": p.stage_name,
                "bio": p.bio,
                "user_email": p.user.email,
                "user_phone_number": p.user.phone_number,
                "user_username": p.user.username,
                "user_full_name": f"{p.user.first_name} {p.user.last_name}".strip(),
                "verification_status": p.verification_status,
                "id_document_type": p.id_document_type,
                "submitted_at": p.submitted_at,
                "profile_image_url": p.profile_image_url,
            })

        serializer = PendingArtistSerializer(items, many=True)
        return Response(serializer.data)


class ArtistVerificationDetailView(APIView):
    """GET /api/admin-dashboard/pending-artists/<id>/ — artist detail with ID document."""

    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            profile = ArtistProfile.objects.select_related("user").get(pk=pk)
        except ArtistProfile.DoesNotExist:
            return Response({"detail": "Artist profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Generate a signed URL for the ID document if using Cloudinary private
        id_document_url = profile.id_document_url
        if id_document_url and "cloudinary" in id_document_url:
            try:
                import cloudinary.utils
                # Generate a signed URL valid for 1 hour
                signed_url = cloudinary.utils.cloudinary_url(
                    f"id_documents/id_{profile.id}",
                    type="private",
                    sign_url=True,
                )[0]
                id_document_url = signed_url
            except Exception:
                pass  # Fall back to stored URL

        data = {
            "id": profile.id,
            "stage_name": profile.stage_name,
            "bio": profile.bio,
            "user": {
                "id": profile.user.id,
                "email": profile.user.email,
                "phone_number": profile.user.phone_number,
                "username": profile.user.username,
                "full_name": f"{profile.user.first_name} {profile.user.last_name}".strip(),
            },
            "verification_status": profile.verification_status,
            "id_document_url": id_document_url,
            "id_document_type": profile.id_document_type,
            "profile_image_url": profile.profile_image_url,
            "submitted_at": profile.submitted_at,
            "reviewed_at": profile.reviewed_at,
            "rejection_reason": profile.rejection_reason,
            "is_identity_verified": profile.is_identity_verified,
            "verification_logs": [
                {
                    "action": log.action,
                    "performed_by": str(log.performed_by) if log.performed_by else None,
                    "reason": log.reason,
                    "created_at": log.created_at,
                }
                for log in profile.verification_logs.all()
            ],
        }
        return Response(data)


class VerifyArtistView(APIView):
    """PATCH /api/admin-dashboard/verify-artist/<id>/ — approve an artist application."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            profile = ArtistProfile.objects.select_related("user").get(pk=pk)
        except ArtistProfile.DoesNotExist:
            return Response({"detail": "Artist profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if profile.verification_status == VerificationStatus.VERIFIED:
            return Response({"detail": "Artist is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        profile.verification_status = VerificationStatus.VERIFIED
        profile.verified = True
        profile.is_identity_verified = True
        profile.reviewed_at = timezone.now()
        profile.reviewed_by = request.user
        profile.rejection_reason = ""
        profile.save(update_fields=[
            "verification_status", "verified", "is_identity_verified",
            "reviewed_at", "reviewed_by", "rejection_reason",
        ])

        # Upgrade user role to artist
        user = profile.user
        user.role = "artist"
        user.save(update_fields=["role"])

        # Audit log
        ArtistVerificationLog.objects.create(
            artist_profile=profile,
            action=ArtistVerificationLog.Action.APPROVED,
            performed_by=request.user,
        )

        # Send email notification (fire-and-forget)
        try:
            from notifications.email_service import EmailService
            EmailService.send_artist_verified_email(user, profile)
        except Exception:
            pass

        return Response({
            "detail": f"Artist '{profile.stage_name}' has been verified.",
            "verification_status": "verified",
        })


class RejectArtistView(APIView):
    """PATCH /api/admin-dashboard/reject-artist/<id>/ — reject an artist application."""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            profile = ArtistProfile.objects.select_related("user").get(pk=pk)
        except ArtistProfile.DoesNotExist:
            return Response({"detail": "Artist profile not found."}, status=status.HTTP_404_NOT_FOUND)

        if profile.verification_status == VerificationStatus.VERIFIED:
            return Response({"detail": "Cannot reject a verified artist."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ArtistVerificationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rejection_reason = serializer.validated_data.get("rejection_reason", "")

        profile.verification_status = VerificationStatus.REJECTED
        profile.rejection_reason = rejection_reason
        profile.reviewed_at = timezone.now()
        profile.reviewed_by = request.user
        profile.save(update_fields=[
            "verification_status", "rejection_reason", "reviewed_at", "reviewed_by",
        ])

        # Audit log
        ArtistVerificationLog.objects.create(
            artist_profile=profile,
            action=ArtistVerificationLog.Action.REJECTED,
            performed_by=request.user,
            reason=rejection_reason,
        )

        # Send email notification (fire-and-forget)
        try:
            from notifications.email_service import EmailService
            EmailService.send_artist_rejected_email(profile.user, profile, reason=rejection_reason)
        except Exception:
            pass

        return Response({
            "detail": f"Artist '{profile.stage_name}' has been rejected.",
            "verification_status": "rejected",
            "rejection_reason": rejection_reason,
        })
