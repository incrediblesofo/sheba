"""
Sheba Sound — Music Serializers
"""

from rest_framework import serializers

from accounts.serializers import ArtistProfileSerializer
from .models import Album, Song, Playlist, PlaylistSong, ArtistEarning, Notification


# ------------------------------------------------------------------ #
#  Song                                                                #
# ------------------------------------------------------------------ #

class SongSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.stage_name", read_only=True)
    like_count = serializers.IntegerField(read_only=True, default=0)
    comment_count = serializers.IntegerField(read_only=True, default=0)
    quality_tier = serializers.SerializerMethodField()

    class Meta:
        model = Song
        fields = [
            "id", "artist", "album", "title", "genre", "duration",
            "audio_file_url", "cover_image_url", "stream_count",
            "like_count", "comment_count",
            "status", "lyrics", "tags", "audio_hash",
            "artist_name", "quality_tier", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "stream_count", "like_count", "comment_count", "status", "created_at", "updated_at"]

    def get_quality_tier(self, obj) -> str:
        """Return 'high' for premium users, 'standard' for free users."""
        request = self.context.get("request")
        if request and hasattr(request, "user") and request.user.is_authenticated:
            try:
                from accounts.models import SubscriptionTier
                profile = request.user.listener_profile
                if profile.subscription_tier == SubscriptionTier.PREMIUM:
                    return "high"
            except Exception:
                pass
        return "standard"


class SongCreateSerializer(serializers.ModelSerializer):
    """Used by artists to upload songs."""

    class Meta:
        model = Song
        fields = [
            "id", "album", "title", "genre", "duration",
            "audio_file_url", "cover_image_url", "lyrics",
            "tags", "audio_hash",
        ]
        read_only_fields = ["id"]


# ------------------------------------------------------------------ #
#  Album                                                               #
# ------------------------------------------------------------------ #

class AlbumSerializer(serializers.ModelSerializer):
    artist_name = serializers.CharField(source="artist.stage_name", read_only=True)

    class Meta:
        model = Album
        fields = [
            "id", "artist", "title", "cover_image_url",
            "release_date", "genre", "description",
            "artist_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AlbumDetailSerializer(serializers.ModelSerializer):
    """Album with nested songs list."""

    songs = SongSerializer(many=True, read_only=True)
    artist_name = serializers.CharField(source="artist.stage_name", read_only=True)

    class Meta:
        model = Album
        fields = [
            "id", "artist", "title", "cover_image_url",
            "release_date", "genre", "description",
            "songs", "artist_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AlbumCreateSerializer(serializers.ModelSerializer):
    """Used by artists to create albums."""

    cover_image = serializers.ImageField(required=False, write_only=True)

    class Meta:
        model = Album
        fields = [
            "id", "title", "cover_image_url",
            "release_date", "genre", "description",
            "cover_image",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "release_date": {"required": False},
            "cover_image_url": {"required": False},
        }


# ------------------------------------------------------------------ #
#  Playlist                                                            #
# ------------------------------------------------------------------ #

class PlaylistSongSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaylistSong
        fields = ["song", "order"]


class PlaylistSerializer(serializers.ModelSerializer):
    songs = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            "id", "owner", "title", "description", "is_public",
            "cover_image_url", "songs", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_songs(self, obj):
        """Return ordered list of song IDs to match frontend Playlist.songs type."""
        return list(
            obj.playlistsong_set
            .order_by("order")
            .values_list("song_id", flat=True)
        )


class PlaylistWithSongsSerializer(serializers.ModelSerializer):
    """Playlist serializer that embeds full song objects (used for detail view)."""
    song_objects = serializers.SerializerMethodField()
    songs = serializers.SerializerMethodField()
    song_count = serializers.SerializerMethodField()
    total_duration = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            "id", "owner", "title", "description", "is_public",
            "cover_image_url", "songs", "song_objects",
            "song_count", "total_duration",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "owner", "created_at", "updated_at"]

    def get_songs(self, obj):
        return list(
            obj.playlistsong_set.order_by("order").values_list("song_id", flat=True)
        )

    def get_song_objects(self, obj):
        from django.db.models import Count
        songs = (
            Song.objects
            .filter(playlistsong__playlist=obj)
            .select_related("artist", "album")
            .annotate(
                like_count=Count("likes", distinct=True),
                comment_count=Count("comments", distinct=True),
            )
            .order_by("playlistsong__order")
        )
        return SongSerializer(songs, many=True, context=self.context).data

    def get_song_count(self, obj):
        return obj.playlistsong_set.count()

    def get_total_duration(self, obj):
        from django.db.models import Sum
        result = Song.objects.filter(playlistsong__playlist=obj).aggregate(total=Sum("duration"))
        return result["total"] or 0


class PlaylistCreateSerializer(serializers.ModelSerializer):
    songs = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )

    class Meta:
        model = Playlist
        fields = ["id", "title", "description", "is_public", "cover_image_url", "songs"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        song_ids = validated_data.pop("songs", [])
        playlist = Playlist.objects.create(**validated_data)
        for i, song_id in enumerate(song_ids):
            PlaylistSong.objects.create(playlist=playlist, song_id=song_id, order=i)
        return playlist

    def update(self, instance, validated_data):
        song_ids = validated_data.pop("songs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if song_ids is not None:
            instance.playlistsong_set.all().delete()
            for i, song_id in enumerate(song_ids):
                PlaylistSong.objects.create(playlist=instance, song_id=song_id, order=i)

        return instance


# ------------------------------------------------------------------ #
#  Earnings                                                            #
# ------------------------------------------------------------------ #

class ArtistEarningSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtistEarning
        fields = [
            "id", "month", "streams_count", "earnings_usd",
            "paid_out", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ------------------------------------------------------------------ #
#  Withdrawal Requests                                                 #
# ------------------------------------------------------------------ #

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import WithdrawalRequest
        model = WithdrawalRequest
        fields = [
            "id", "amount", "payment_method", "account_details",
            "status", "rejection_reason", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "rejection_reason", "created_at", "updated_at"]


class CreateWithdrawalSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_method = serializers.ChoiceField(choices=["telebirr", "chapa", "bank_transfer"])
    account_details = serializers.CharField(max_length=255, required=True)


# ------------------------------------------------------------------ #
#  Notifications                                                       #
# ------------------------------------------------------------------ #

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "type", "message", "is_read", "link", "created_at",
        ]
        read_only_fields = ["id", "type", "message", "link", "created_at"]

