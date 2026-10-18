"""
Sheba Sound — Music Views
Public catalog browsing, artist song/album management, search, and playlists.
"""

from django.db.models import Count, F, Max, Q, Sum
from django.db.models.functions import TruncMonth
from django.db import models as db_models
from django.conf import settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from accounts.models import ArtistProfile
from accounts.serializers import ArtistProfileSerializer
from accounts.views import IsArtist, IsVerifiedArtist

from .models import Album, Song, Playlist, PlaylistSong, SongLike, SongStatus, ListeningHistory, ArtistFollow, StreamEvent
from .geoip import get_client_ip, resolve_country, country_display
from .serializers import (
    AlbumCreateSerializer,
    AlbumDetailSerializer,
    AlbumSerializer,
    PlaylistCreateSerializer,
    PlaylistSerializer,
    PlaylistWithSongsSerializer,
    SongCreateSerializer,
    SongSerializer,
)


def _songs_with_counts():
    """Base queryset that annotates like_count and comment_count."""
    return (
        Song.objects
        .select_related("artist", "album")
        .annotate(
            like_count=Count("likes", distinct=True),
            comment_count=Count("comments", distinct=True),
        )
    )


# ------------------------------------------------------------------ #
#  Public Catalog                                                      #
# ------------------------------------------------------------------ #

class SongListView(generics.ListAPIView):
    """GET /api/music/songs/ — list approved songs (public)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = SongSerializer
    filterset_fields = ["genre", "artist", "album"]
    search_fields = ["title"]
    ordering_fields = ["stream_count", "created_at", "title"]

    def get_queryset(self):
        return _songs_with_counts().filter(status=SongStatus.APPROVED)


class SongDetailView(generics.RetrieveAPIView):
    """GET /api/music/songs/<id>/ — single song detail."""

    permission_classes = [permissions.AllowAny]
    serializer_class = SongSerializer
    queryset = _songs_with_counts()


class SongStreamView(APIView):
    """POST /api/music/songs/<id>/stream/ — increment stream count and record analytics event."""

    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        # Fetch only what we need; filter approved songs
        updated = Song.objects.filter(pk=pk, status=SongStatus.APPROVED).update(
            stream_count=F("stream_count") + 1
        )
        if not updated:
            return Response(
                {"detail": "Song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        song = Song.objects.select_related("artist").get(pk=pk)
        # Atomically increment artist total_streams too
        ArtistProfile.objects.filter(pk=song.artist_id).update(
            total_streams=F("total_streams") + 1
        )

        # ── Record StreamEvent for analytics ──
        ip = get_client_ip(request)
        country = resolve_country(ip)
        user = request.user if request.user.is_authenticated else None

        StreamEvent.objects.create(
            user=user,
            song=song,
            ip_address=ip or None,
            country=country,
        )

        # Refresh to get the updated stream_count after F() increment
        song.refresh_from_db(fields=["stream_count"])

        return Response(
            {"stream_count": song.stream_count},
            status=status.HTTP_200_OK,
        )


class SongDownloadView(APIView):
    """
    GET /api/music/songs/<id>/download/ — download a song (premium only).
    Records the download and redirects to the audio file.
    """

    permission_classes = [permissions.IsAuthenticated]

    MAX_DOWNLOADS = 25  # per-user limit for web app

    def get(self, request, pk):
        from accounts.models import ListenerProfile, SubscriptionTier
        from .models import DownloadedSong

        # Check premium status
        is_premium = False
        try:
            profile = request.user.listener_profile
            is_premium = profile.subscription_tier == SubscriptionTier.PREMIUM
        except ListenerProfile.DoesNotExist:
            pass

        if not is_premium:
            return Response(
                {"detail": "Premium subscription required for downloads."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Fetch song
        try:
            song = Song.objects.get(pk=pk, status=SongStatus.APPROVED)
        except Song.DoesNotExist:
            return Response(
                {"detail": "Song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check download limit
        current_count = DownloadedSong.objects.filter(user=request.user).count()
        if current_count >= self.MAX_DOWNLOADS:
            # Allow re-download of already-downloaded songs
            if not DownloadedSong.objects.filter(user=request.user, song=song).exists():
                return Response(
                    {
                        "detail": f"Download limit reached ({self.MAX_DOWNLOADS} songs). "
                        "Remove some downloads to add new ones.",
                        "limit": self.MAX_DOWNLOADS,
                        "current": current_count,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Record the download (upsert)
        DownloadedSong.objects.update_or_create(
            user=request.user,
            song=song,
            defaults={"downloaded_at": timezone.now()},
        )

        return Response({
            "download_url": song.audio_file_url,
            "song_id": str(song.id),
            "title": song.title,
        })


class SongDownloadRemoveView(APIView):
    """DELETE /api/music/songs/<id>/download/ — remove a download record."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        from .models import DownloadedSong

        deleted, _ = DownloadedSong.objects.filter(
            user=request.user, song_id=pk
        ).delete()

        if not deleted:
            return Response(
                {"detail": "Download not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MyDownloadsView(APIView):
    """GET /api/music/downloads/ — list user's downloaded songs."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import DownloadedSong
        from .serializers import SongSerializer

        downloads = DownloadedSong.objects.filter(
            user=request.user
        ).select_related("song", "song__artist")

        songs = [d.song for d in downloads]
        serializer = SongSerializer(songs, many=True)

        return Response({
            "count": len(songs),
            "limit": SongDownloadView.MAX_DOWNLOADS,
            "songs": serializer.data,
        })


class AlbumListView(generics.ListAPIView):
    """GET /api/music/albums/ — list all albums."""

    permission_classes = [permissions.AllowAny]
    serializer_class = AlbumSerializer
    queryset = Album.objects.all()
    filterset_fields = ["genre", "artist"]
    search_fields = ["title"]
    ordering_fields = ["release_date", "title"]


class AlbumDetailView(generics.RetrieveAPIView):
    """GET /api/music/albums/<id>/ — album detail with songs."""

    permission_classes = [permissions.AllowAny]
    serializer_class = AlbumDetailSerializer
    queryset = Album.objects.prefetch_related("songs")


# ── Playlist limits per subscription tier ─────────────────────────── #
FREE_PLAYLIST_LIMIT = 3


def _is_premium(user):
    """Return True if the user has an active premium subscription."""
    from accounts.models import ListenerProfile, SubscriptionTier
    try:
        profile = user.listener_profile
        if profile.subscription_tier == SubscriptionTier.PREMIUM:
            from django.utils import timezone
            if profile.subscription_expiry and profile.subscription_expiry > timezone.now():
                return True
    except ListenerProfile.DoesNotExist:
        pass
    return False


class PlaylistListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/music/playlists/"""

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PlaylistCreateSerializer
        return PlaylistSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        qs = Playlist.objects.prefetch_related("playlistsong_set")
        if user.is_authenticated:
            return qs.filter(Q(is_public=True) | Q(owner=user))
        return qs.filter(is_public=True)

    def create(self, request, *args, **kwargs):
        user = request.user
        # Artists bypass the playlist limit entirely
        if user.role != "artist":
            current_count = Playlist.objects.filter(owner=user).count()
            if not _is_premium(user) and current_count >= FREE_PLAYLIST_LIMIT:
                return Response(
                    {
                        "detail": "Free users can create up to 3 playlists. Upgrade to Premium for unlimited playlists.",
                        "limit_reached": True,
                        "current_count": current_count,
                        "limit": FREE_PLAYLIST_LIMIT,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/music/playlists/<id>/"""

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return PlaylistCreateSerializer
        # Use the rich serializer (embeds full song objects) for GET
        return PlaylistWithSongsSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        qs = Playlist.objects.prefetch_related("playlistsong_set")
        if user.is_authenticated:
            return qs.filter(Q(is_public=True) | Q(owner=user))
        return qs.filter(is_public=True)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response(
                {"detail": "You can only edit your own playlists."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.owner != request.user:
            return Response(
                {"detail": "You can only delete your own playlists."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


# ------------------------------------------------------------------ #
#  Playlist Song Management (add / remove / reorder)                   #
# ------------------------------------------------------------------ #

class PlaylistSongsView(APIView):
    """
    POST /api/music/playlists/<id>/songs/
    Body: { "song_id": "<uuid>" }
    Adds a song to the playlist. Song is appended at the end (max order + 1).
    Only the playlist owner can add songs.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({"detail": "Playlist not found."}, status=status.HTTP_404_NOT_FOUND)

        if playlist.owner != request.user:
            return Response({"detail": "You can only add songs to your own playlists."}, status=status.HTTP_403_FORBIDDEN)

        song_id = request.data.get("song_id")
        if not song_id:
            return Response({"detail": "song_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            song = Song.objects.get(pk=song_id, status=SongStatus.APPROVED)
        except Song.DoesNotExist:
            return Response({"detail": "Song not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if song is already in playlist
        if PlaylistSong.objects.filter(playlist=playlist, song=song).exists():
            return Response({"detail": "Song already in playlist."}, status=status.HTTP_409_CONFLICT)

        # Append at the end
        max_order = playlist.playlistsong_set.aggregate(m=Max("order"))["m"]
        next_order = (max_order or -1) + 1
        PlaylistSong.objects.create(playlist=playlist, song=song, order=next_order)

        # Return updated playlist
        playlist.refresh_from_db()
        return Response(
            PlaylistWithSongsSerializer(playlist, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class PlaylistSongDetailView(APIView):
    """
    DELETE /api/music/playlists/<id>/songs/<song_id>/
    Removes a song from the playlist and re-numbers remaining songs.
    Only the playlist owner can remove songs.
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, song_pk):
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({"detail": "Playlist not found."}, status=status.HTTP_404_NOT_FOUND)

        if playlist.owner != request.user:
            return Response({"detail": "You can only remove songs from your own playlists."}, status=status.HTTP_403_FORBIDDEN)

        deleted, _ = PlaylistSong.objects.filter(playlist=playlist, song_id=song_pk).delete()
        if not deleted:
            return Response({"detail": "Song not in playlist."}, status=status.HTTP_404_NOT_FOUND)

        # Re-number remaining songs to keep order contiguous
        for i, ps in enumerate(playlist.playlistsong_set.order_by("order")):
            if ps.order != i:
                ps.order = i
                ps.save(update_fields=["order"])

        playlist.refresh_from_db()
        return Response(
            PlaylistWithSongsSerializer(playlist, context={"request": request}).data,
        )


class PlaylistSongsReorderView(APIView):
    """
    POST /api/music/playlists/<id>/songs/reorder/
    Body: { "song_ids": ["<uuid1>", "<uuid2>", ...] }  (full ordered list)
    Reorders songs in the playlist to match the provided order.
    Only the playlist owner can reorder songs.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response({"detail": "Playlist not found."}, status=status.HTTP_404_NOT_FOUND)

        if playlist.owner != request.user:
            return Response({"detail": "You can only reorder your own playlists."}, status=status.HTTP_403_FORBIDDEN)

        song_ids = request.data.get("song_ids", [])
        if not song_ids:
            return Response({"detail": "song_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Build a map of existing PlaylistSong entries
        ps_map = {str(ps.song_id): ps for ps in playlist.playlistsong_set.all()}

        for i, song_id in enumerate(song_ids):
            ps = ps_map.get(str(song_id))
            if ps and ps.order != i:
                ps.order = i
                ps.save(update_fields=["order"])

        playlist.refresh_from_db()
        return Response(
            PlaylistWithSongsSerializer(playlist, context={"request": request}).data,
        )


class PlaylistCoverImageView(APIView):
    """
    POST /api/music/playlists/<id>/cover/
    Upload or replace the playlist cover image.
    Accepts multipart/form-data with a single `cover_image` file field.
    Only the playlist owner can update the cover.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")

    def post(self, request, pk):
        from .storage import CloudinaryStorage

        try:
            playlist = Playlist.objects.get(pk=pk)
        except Playlist.DoesNotExist:
            return Response(
                {"detail": "Playlist not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if playlist.owner != request.user:
            return Response(
                {"detail": "You can only update the cover of your own playlists."},
                status=status.HTTP_403_FORBIDDEN,
            )

        cover_image = request.FILES.get("cover_image")
        if not cover_image:
            return Response(
                {"cover_image": "A cover image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cover_image.content_type not in self.ALLOWED_IMAGE_TYPES:
            return Response(
                {"cover_image": "Unsupported image format. Allowed: JPEG, PNG, WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Upload to Cloudinary (or local fallback)
        storage = CloudinaryStorage()
        result = storage.upload_image(
            cover_image,
            folder="sheba-sound/playlists/covers",
            width=800,
            height=800,
        )
        cover_url = result["url"]

        # Keep relative /media/ paths — resolved by the frontend proxy
        # DO NOT use build_absolute_uri() here (bakes in stale IPs)

        # Update the playlist record
        playlist.cover_image_url = cover_url
        playlist.save(update_fields=["cover_image_url"])

        return Response(
            {
                "message": "Playlist cover image updated successfully.",
                "cover_image_url": cover_url,
                "playlist": PlaylistWithSongsSerializer(
                    playlist, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class MyPlaylistListView(APIView):
    """
    GET /api/music/playlists/my/ — returns the authenticated user's
    own playlists plus quota information.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        playlists = (
            Playlist.objects
            .filter(owner=request.user)
            .prefetch_related("playlistsong_set")
            .order_by("-updated_at")
        )
        is_premium = _is_premium(request.user)
        is_artist = request.user.role == "artist"
        return Response({
            "playlists": PlaylistSerializer(playlists, many=True).data,
            "count": playlists.count(),
            "limit": None if (is_premium or is_artist) else FREE_PLAYLIST_LIMIT,
            "is_premium": is_premium or is_artist,
        })


class SongLikeView(APIView):
    """POST /api/music/songs/<id>/like/ — toggle like/unlike."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            song = Song.objects.get(pk=pk)
        except Song.DoesNotExist:
            return Response({"detail": "Song not found."}, status=status.HTTP_404_NOT_FOUND)

        like, created = SongLike.objects.get_or_create(user=request.user, song=song)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True

        like_count = SongLike.objects.filter(song=song).count()
        return Response({"liked": liked, "like_count": like_count})


class LikedSongsListView(generics.ListAPIView):
    """GET /api/music/liked-songs/ — user's liked songs."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SongSerializer

    def get_queryset(self):
        liked_song_ids = SongLike.objects.filter(
            user=self.request.user,
        ).values_list("song_id", flat=True)
        return _songs_with_counts().filter(id__in=liked_song_ids)


class ListeningHistoryView(APIView):
    """
    GET  /api/music/history/ — user's recent listening history (last 50 songs).
    POST /api/music/history/ — record a listen.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        entries = (
            ListeningHistory.objects
            .filter(user=request.user)
            .select_related("song", "song__artist", "song__album")
            .order_by("-listened_at")[:50]
        )
        songs = [entry.song for entry in entries]
        # Deduplicate: keep only the first occurrence of each song
        seen = set()
        unique_songs = []
        for song in songs:
            if song.id not in seen:
                seen.add(song.id)
                unique_songs.append(song)
        return Response(SongSerializer(unique_songs, many=True).data)

    def post(self, request):
        song_id = request.data.get("song")
        if not song_id:
            return Response(
                {"detail": "song ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            song = Song.objects.get(pk=song_id)
        except Song.DoesNotExist:
            return Response(
                {"detail": "Song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        ListeningHistory.objects.create(user=request.user, song=song)
        return Response({"detail": "Recorded."}, status=status.HTTP_201_CREATED)


class SearchView(APIView):
    """GET /api/music/search/?q=<query> — full-text search."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response(
                {"songs": [], "albums": [], "artists": []},
                status=status.HTTP_200_OK,
            )

        songs = _songs_with_counts().filter(
            Q(title__icontains=query) | Q(lyrics__icontains=query),
            status=SongStatus.APPROVED,
        )[:20]

        albums = Album.objects.filter(
            Q(title__icontains=query) | Q(description__icontains=query),
        )[:10]

        artists = ArtistProfile.objects.filter(
            Q(stage_name__icontains=query) | Q(bio__icontains=query),
            verified=True,
        )[:10]

        return Response({
            "songs": SongSerializer(songs, many=True).data,
            "albums": AlbumSerializer(albums, many=True).data,
            "artists": ArtistProfileSerializer(artists, many=True).data,
        })


# ------------------------------------------------------------------ #
#  Follow / Unfollow Artist                                            #
# ------------------------------------------------------------------ #

class ToggleFollowArtistView(APIView):
    """POST /api/music/artists/<id>/follow/ — toggle follow/unfollow."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            artist = ArtistProfile.objects.get(pk=pk)
        except ArtistProfile.DoesNotExist:
            return Response({"detail": "Artist not found."}, status=status.HTTP_404_NOT_FOUND)

        follow, created = ArtistFollow.objects.get_or_create(user=request.user, artist=artist)
        if not created:
            follow.delete()
            following = False
        else:
            following = True
            # Notify the artist about the new follower (fire-and-forget)
            try:
                from notifications.email_service import EmailService
                EmailService.send_new_follower_email(artist.user, request.user)
            except Exception:
                pass

        followers_count = ArtistFollow.objects.filter(artist=artist).count()
        return Response({"following": following, "followers_count": followers_count})


class FollowStatusView(APIView):
    """GET /api/music/artists/<id>/follow-status/ — check if following."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        following = ArtistFollow.objects.filter(
            user=request.user, artist_id=pk
        ).exists()
        return Response({"following": following})


class FollowedArtistsListView(APIView):
    """GET /api/music/followed-artists/ — user's followed artists."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        followed_ids = ArtistFollow.objects.filter(
            user=request.user
        ).values_list("artist_id", flat=True)
        artists = ArtistProfile.objects.filter(id__in=followed_ids)
        return Response(ArtistProfileSerializer(artists, many=True).data)


# ------------------------------------------------------------------ #
#  Artist's Own Content                                                #
# ------------------------------------------------------------------ #

class ArtistSongListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/music/artist/songs/ — artist's own songs."""

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsVerifiedArtist()]
        return [IsArtist()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SongCreateSerializer
        return SongSerializer

    def get_queryset(self):
        return Song.objects.filter(artist=self.request.user.artist_profile).select_related("artist", "album")

    def perform_create(self, serializer):
        serializer.save(
            artist=self.request.user.artist_profile,
            status=SongStatus.PENDING,
        )


class SongUploadView(APIView):
    """
    POST /api/music/artist/songs/upload/
    Accepts multipart/form-data with real audio + cover image files.
    Uploads files to Cloudinary CDN (or local MEDIA_ROOT as fallback),
    computes a real SHA-256 audio hash, and creates a Song in PENDING status.

    Required fields: title, genre, duration (seconds)
    Optional fields:  album (uuid), lyrics, tags (comma-separated), audio_file, cover_image
    """

    permission_classes = [IsVerifiedArtist]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        import json

        from .storage import CloudinaryStorage

        storage = CloudinaryStorage()
        data = request.data
        errors = {}

        # ---- Validate required fields ----
        title = data.get("title", "").strip()
        genre = data.get("genre", "").strip()
        duration_raw = data.get("duration", "")
        if not title:
            errors["title"] = "Song title is required."
        if not genre:
            errors["genre"] = "Genre is required."
        try:
            duration = int(duration_raw)
            if duration <= 0:
                raise ValueError
        except (ValueError, TypeError):
            errors["duration"] = "Duration must be a positive integer (seconds)."
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        # ---- Upload audio file to Cloudinary (or local fallback) ----
        audio_file = request.FILES.get("audio_file")
        audio_url = ""
        audio_hash = None

        if audio_file:
            # Compute real SHA-256 hash server-side for copyright detection
            audio_hash = storage.compute_audio_hash(audio_file)

            # Check for duplicate audio fingerprint
            if Song.objects.filter(audio_hash=audio_hash).exists():
                return Response(
                    {"audio_hash": "A song with this audio fingerprint already exists. Upload rejected (duplicate)."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Upload to Cloudinary CDN
            result = storage.upload_audio(audio_file)
            audio_url = result["url"]

            # Keep relative /media/ paths as-is — the frontend Vite proxy
            # and Django's static serving both resolve them correctly.
            # DO NOT use build_absolute_uri() here: it bakes in the server's
            # current IP, which breaks when the network changes.
        else:
            # Allow passing a URL directly (for external hosting / migration)
            audio_url = data.get("audio_file_url", "").strip()
            if not audio_url:
                return Response(
                    {"audio_file": "An audio file or audio_file_url is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Use client-provided hash if URL-only upload
            audio_hash = data.get("audio_hash", "").strip() or None
            if audio_hash and Song.objects.filter(audio_hash=audio_hash).exists():
                return Response(
                    {"audio_hash": "A song with this audio fingerprint already exists. Upload rejected (duplicate)."},
                    status=status.HTTP_409_CONFLICT,
                )

        # ---- Upload cover image (optional) to Cloudinary ----
        ALLOWED_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")
        cover_url = ""
        cover_image = request.FILES.get("cover_image")

        if cover_image:
            if cover_image.content_type not in ALLOWED_IMAGE_TYPES:
                return Response(
                    {"cover_image": "Unsupported image format. Allowed: JPEG, PNG, WebP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = storage.upload_image(cover_image, width=800, height=800)
            cover_url = result["url"]

            # Keep relative /media/ paths (see audio comment above)
        else:
            cover_url = data.get("cover_image_url", "").strip() or None

        # ---- Tags (sent as JSON array string or comma-separated) ----
        tags_raw = data.get("tags", "[]")
        try:
            tags = json.loads(tags_raw) if tags_raw.startswith("[") else [
                t.strip() for t in tags_raw.split(",") if t.strip()
            ]
        except Exception:
            tags = []

        # ---- Album (optional FK) ----
        album_id = data.get("album", "").strip() or None
        album = None
        if album_id:
            try:
                album = Album.objects.get(pk=album_id, artist=request.user.artist_profile)
            except Album.DoesNotExist:
                return Response({"album": "Album not found or does not belong to you."}, status=status.HTTP_400_BAD_REQUEST)

        # ---- Create Song ----
        song = Song.objects.create(
            artist=request.user.artist_profile,
            album=album,
            title=title,
            genre=genre,
            duration=duration,
            audio_file_url=audio_url,
            cover_image_url=cover_url,
            lyrics=data.get("lyrics", "").strip() or None,
            tags=tags,
            audio_hash=audio_hash,
            status=SongStatus.PENDING,
        )

        return Response(SongSerializer(song).data, status=status.HTTP_201_CREATED)


class ArtistSongDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/music/artist/songs/<id>/"""

    permission_classes = [IsArtist]
    serializer_class = SongCreateSerializer

    def get_queryset(self):
        return Song.objects.filter(artist=self.request.user.artist_profile).select_related("artist", "album")


class SongCoverImageView(APIView):
    """
    POST /api/music/artist/songs/<id>/cover/ — upload/replace a song's cover image.
    Accepts multipart/form-data with a single `cover_image` file field.
    Supports JPEG, PNG, and WebP formats.
    """

    permission_classes = [IsArtist]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")

    def post(self, request, pk):
        from .storage import CloudinaryStorage

        # Ensure the song belongs to the authenticated artist
        try:
            song = Song.objects.get(pk=pk, artist=request.user.artist_profile)
        except Song.DoesNotExist:
            return Response(
                {"detail": "Song not found or does not belong to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cover_image = request.FILES.get("cover_image")
        if not cover_image:
            return Response(
                {"cover_image": "A cover image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cover_image.content_type not in self.ALLOWED_IMAGE_TYPES:
            return Response(
                {"cover_image": "Unsupported image format. Allowed: JPEG, PNG, WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Upload to Cloudinary (or local fallback)
        storage = CloudinaryStorage()
        result = storage.upload_image(cover_image, width=800, height=800)
        cover_url = result["url"]

        # Keep relative /media/ paths — resolved by the frontend proxy
        # DO NOT use build_absolute_uri() here (bakes in stale IPs)

        # Update the song record
        song.cover_image_url = cover_url
        song.save(update_fields=["cover_image_url"])

        return Response(
            {
                "message": "Cover image updated successfully.",
                "cover_image_url": cover_url,
                "song": SongSerializer(song).data,
            },
            status=status.HTTP_200_OK,
        )


class ArtistAlbumListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/music/artist/albums/ — artist's own albums."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsVerifiedArtist()]
        return [IsArtist()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AlbumCreateSerializer
        return AlbumSerializer

    def get_queryset(self):
        return Album.objects.filter(artist=self.request.user.artist_profile).select_related("artist")

    def perform_create(self, serializer):
        # Pop cover_image before saving — it's not a model field
        cover_image = serializer.validated_data.pop("cover_image", None)
        cover_url = serializer.validated_data.get("cover_image_url") or ""

        if cover_image:
            from .storage import CloudinaryStorage
            storage = CloudinaryStorage()
            ALLOWED_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")
            if cover_image.content_type not in ALLOWED_IMAGE_TYPES:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"cover_image": "Unsupported format. Allowed: JPEG, PNG, WebP."})
            result = storage.upload_image(cover_image, width=800, height=800)
            cover_url = result["url"]

        serializer.save(
            artist=self.request.user.artist_profile,
            cover_image_url=cover_url,
        )


class ArtistAlbumDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/music/artist/albums/<id>/"""

    permission_classes = [IsArtist]
    serializer_class = AlbumCreateSerializer

    def get_queryset(self):
        return Album.objects.filter(artist=self.request.user.artist_profile).select_related("artist")


class AlbumCoverImageView(APIView):
    """
    POST /api/music/artist/albums/<id>/cover/ — upload/replace an album's cover image.
    Accepts multipart/form-data with a single `cover_image` file field.
    Supports JPEG, PNG, and WebP formats.
    """

    permission_classes = [IsArtist]
    parser_classes = [MultiPartParser, FormParser]

    ALLOWED_IMAGE_TYPES = ("image/jpeg", "image/png", "image/webp")

    def post(self, request, pk):
        from .storage import CloudinaryStorage

        try:
            album = Album.objects.get(pk=pk, artist=request.user.artist_profile)
        except Album.DoesNotExist:
            return Response(
                {"detail": "Album not found or does not belong to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        cover_image = request.FILES.get("cover_image")
        if not cover_image:
            return Response(
                {"cover_image": "A cover image file is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cover_image.content_type not in self.ALLOWED_IMAGE_TYPES:
            return Response(
                {"cover_image": "Unsupported image format. Allowed: JPEG, PNG, WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        storage = CloudinaryStorage()
        result = storage.upload_image(cover_image, width=800, height=800)
        cover_url = result["url"]

        album.cover_image_url = cover_url
        album.save(update_fields=["cover_image_url"])

        return Response(
            {
                "message": "Album cover updated successfully.",
                "cover_image_url": cover_url,
                "album": AlbumSerializer(album).data,
            },
            status=status.HTTP_200_OK,
        )


# ------------------------------------------------------------------ #
#  Artist Analytics (real data)                                        #
# ------------------------------------------------------------------ #

class ArtistAnalyticsView(APIView):
    """GET /api/music/artist/analytics/ — real aggregated analytics for the logged-in artist."""

    permission_classes = [IsArtist]

    def get(self, request):
        import datetime

        profile = request.user.artist_profile
        song_ids = list(
            Song.objects.filter(artist=profile).values_list("id", flat=True)
        )

        # ── Total streams (use the cached counter, faster than COUNT(*)) ──
        total_streams = profile.total_streams or (
            Song.objects.filter(artist=profile).aggregate(
                total=Sum("stream_count")
            )["total"] or 0
        )

        # ── Real monthly streams from StreamEvent (last 12 months) ──
        now = timezone.now()
        twelve_months_ago = now - datetime.timedelta(days=365)

        monthly_raw = (
            StreamEvent.objects
            .filter(song_id__in=song_ids, streamed_at__gte=twelve_months_ago)
            .annotate(month=TruncMonth("streamed_at"))
            .values("month")
            .annotate(
                streams=Count("id"),
                listeners=Count("user", distinct=True),
            )
            .order_by("month")
        )

        # Build a full 12-month grid (fill gaps with 0)
        month_map = {r["month"].strftime("%Y-%m"): r for r in monthly_raw}
        monthly_streams = []
        today = datetime.date.today()
        for i in range(11, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            key = f"{y:04d}-{m:02d}"
            label = datetime.date(y, m, 1).strftime("%b")
            entry = month_map.get(key, {})
            monthly_streams.append({
                "month": label,
                "streams": entry.get("streams", 0),
                "listeners": entry.get("listeners", 0),
            })

        # ── Real monthly listeners (unique users who streamed this month) ──
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_listeners = (
            StreamEvent.objects
            .filter(song_id__in=song_ids, streamed_at__gte=month_start, user__isnull=False)
            .values("user")
            .distinct()
            .count()
        )

        # ── Real engagement stats ──
        total_likes = SongLike.objects.filter(song_id__in=song_ids).count()
        from .models import SongComment
        total_comments = SongComment.objects.filter(song_id__in=song_ids).count()

        total_followers = ArtistFollow.objects.filter(artist=profile).count()
        new_followers_this_month = ArtistFollow.objects.filter(
            artist=profile,
            created_at__gte=month_start,
        ).count()

        engagement = {
            "total_likes": total_likes,
            "total_comments": total_comments,
            "total_shares": 0,  # real share count requires a ShareEvent model
            "new_followers_this_month": new_followers_this_month,
            "total_followers": total_followers,
        }

        # ── Real geographic data from StreamEvent ──
        geo_raw = (
            StreamEvent.objects
            .filter(song_id__in=song_ids)
            .exclude(country="")
            .values("country")
            .annotate(listeners=Count("user", distinct=True))
            .order_by("-listeners")[:10]
        )

        geo_listeners = []
        for row in geo_raw:
            display = country_display(row["country"])
            geo_listeners.append({
                "country": display["country"],
                "listeners": row["listeners"],
                "flag": display["flag"],
            })

        # If no StreamEvent data yet, show a hint with the home country
        if not geo_listeners and total_streams > 0:
            geo_listeners = [
                {"country": "Ethiopia", "listeners": 0, "flag": "🇪🇹"},
            ]

        return Response({
            "total_streams": total_streams,
            "monthly_listeners": monthly_listeners,
            "published_songs": len(song_ids),
            "monthly_streams": monthly_streams,
            "engagement": engagement,
            "geo_listeners": geo_listeners,
        })


# ------------------------------------------------------------------ #
#  Artist Earnings                                                     #
# ------------------------------------------------------------------ #

class ArtistEarningsView(APIView):
    """GET /api/music/artist/earnings/ — earnings and payment history."""

    permission_classes = [IsArtist]

    def get(self, request):
        from .models import ArtistEarning, WithdrawalRequest
        from .serializers import ArtistEarningSerializer, WithdrawalRequestSerializer

        profile = request.user.artist_profile
        earnings = ArtistEarning.objects.filter(artist=profile).order_by("-month")
        total = sum(e.earnings_usd for e in earnings)
        unpaid = sum(e.earnings_usd for e in earnings if not e.paid_out)

        withdrawals = WithdrawalRequest.objects.filter(artist=profile).order_by("-created_at")[:20]
        pending_withdrawal = withdrawals.filter(status="pending").first()

        return Response({
            "earnings": ArtistEarningSerializer(earnings, many=True).data,
            "total_earnings": float(total),
            "unpaid_earnings": float(unpaid),
            "withdrawals": WithdrawalRequestSerializer(withdrawals, many=True).data,
            "has_pending_withdrawal": pending_withdrawal is not None,
        })


# ------------------------------------------------------------------ #
#  Withdrawal Requests                                                 #
# ------------------------------------------------------------------ #

class WithdrawalRequestView(APIView):
    """
    GET  /api/music/artist/withdrawals/ — withdrawal history.
    POST /api/music/artist/withdrawals/ — create a withdrawal request.
    """

    permission_classes = [IsArtist]

    MINIMUM_WITHDRAWAL = 50.00  # USD

    def get(self, request):
        from .models import WithdrawalRequest
        from .serializers import WithdrawalRequestSerializer

        profile = request.user.artist_profile
        withdrawals = WithdrawalRequest.objects.filter(artist=profile)
        return Response(WithdrawalRequestSerializer(withdrawals, many=True).data)

    def post(self, request):
        from decimal import Decimal
        from .models import ArtistEarning, WithdrawalRequest
        from .serializers import CreateWithdrawalSerializer, WithdrawalRequestSerializer

        profile = request.user.artist_profile

        ser = CreateWithdrawalSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        amount = Decimal(str(ser.validated_data["amount"]))

        # Check for existing pending withdrawal
        if WithdrawalRequest.objects.filter(artist=profile, status="pending").exists():
            return Response(
                {"detail": "You already have a pending withdrawal request. Please wait for it to be processed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check minimum
        if amount < Decimal(str(self.MINIMUM_WITHDRAWAL)):
            return Response(
                {"detail": f"Minimum withdrawal amount is ${self.MINIMUM_WITHDRAWAL:.2f}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check against unpaid balance
        earnings = ArtistEarning.objects.filter(artist=profile, paid_out=False)
        unpaid = sum(e.earnings_usd for e in earnings)
        if amount > unpaid:
            return Response(
                {"detail": f"Insufficient balance. Your available balance is ${float(unpaid):.2f}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        withdrawal = WithdrawalRequest.objects.create(
            artist=profile,
            amount=amount,
            payment_method=ser.validated_data["payment_method"],
            account_details=ser.validated_data["account_details"],
        )

        return Response(
            WithdrawalRequestSerializer(withdrawal).data,
            status=status.HTTP_201_CREATED,
        )


# ------------------------------------------------------------------ #
#  Artist Notifications                                                #
# ------------------------------------------------------------------ #

class ArtistNotificationsView(generics.ListAPIView):
    """GET /api/music/artist/notifications/ — artist's notification feed."""

    permission_classes = [IsArtist]

    def get_serializer_class(self):
        from .serializers import NotificationSerializer
        return NotificationSerializer

    def get_queryset(self):
        from .models import Notification
        return Notification.objects.filter(recipient=self.request.user).order_by("-created_at")[:50]


class NotificationDetailView(APIView):
    """PATCH /api/music/artist/notifications/<id>/ — mark as read."""

    permission_classes = [IsArtist]

    def patch(self, request, pk):
        from .models import Notification
        try:
            notif = Notification.objects.get(pk=pk, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        notif.is_read = True
        notif.save(update_fields=["is_read"])
        return Response({"detail": "Marked as read."})


# ------------------------------------------------------------------ #
#  Radio / Auto-play Recommendations                                   #
# ------------------------------------------------------------------ #

class RadioRecommendationsView(APIView):
    """
    GET /api/music/songs/radio/
    ?seed=<song_uuid>           — required: the currently playing song
    &exclude=<id1,id2,...>      — optional: comma-separated UUIDs to skip
    &limit=<int>                — optional: number of songs to return (default 10, max 20)

    Returns a list of recommended songs using a 3-tier scoring system:

    Tier 1 (all users):
        Same genre as seed song, ordered by stream_count DESC.

    Tier 2 (authenticated users with history):
        Annotates each candidate with a personalized score:
          +1  for each time the user has listened to a song of this genre
          +2  for each time the user has liked a song of this artist
          +3  bonus if the song's artist is followed by the user

    This lets heavily-listened genres and favourite artists float naturally
    to the top without any ML infrastructure.
    """

    permission_classes = [permissions.AllowAny]

    MAX_LIMIT = 20
    DEFAULT_LIMIT = 10

    def get(self, request):
        from django.db.models import IntegerField, Subquery, OuterRef, Value
        from django.db.models.functions import Coalesce
        from .models import ListeningHistory, SongLike, ArtistFollow, DownloadedSong

        # ── Parse params ──────────────────────────────────────────── #
        seed_id = request.query_params.get("seed", "").strip()
        exclude_raw = request.query_params.get("exclude", "").strip()
        try:
            limit = min(int(request.query_params.get("limit", self.DEFAULT_LIMIT)), self.MAX_LIMIT)
        except (ValueError, TypeError):
            limit = self.DEFAULT_LIMIT

        if not seed_id:
            return Response(
                {"detail": "seed parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Fetch seed song ───────────────────────────────────────── #
        try:
            seed = Song.objects.get(pk=seed_id, status=SongStatus.APPROVED)
        except Song.DoesNotExist:
            return Response(
                {"detail": "Seed song not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        genre = seed.genre

        # ── IDs to exclude (already in queue / played) ────────────── #
        exclude_ids = set()
        if exclude_raw:
            for raw_id in exclude_raw.split(","):
                raw_id = raw_id.strip()
                if raw_id:
                    exclude_ids.add(raw_id)
        # Always exclude the seed itself
        exclude_ids.add(str(seed_id))

        # ── Base queryset: same genre, approved, not excluded ─────── #
        qs = (
            _songs_with_counts()
            .filter(status=SongStatus.APPROVED, genre=genre)
            .exclude(pk__in=exclude_ids)
        )

        # ── Tier 2 + 3: personalised score for authenticated users ── #
        user = request.user if request.user.is_authenticated else None

        if user:
            # History count for this genre (how many times user played songs of this genre)
            history_genre_sq = (
                ListeningHistory.objects
                .filter(user=user, song__genre=genre, song__artist_id=OuterRef("artist_id"))
                .values("user")
                .annotate(cnt=Count("id"))
                .values("cnt")[:1]
            )

            # Like count for this artist
            like_artist_sq = (
                SongLike.objects
                .filter(user=user, song__artist_id=OuterRef("artist_id"))
                .values("user")
                .annotate(cnt=Count("id"))
                .values("cnt")[:1]
            )

            # Follow bonus (1 if user follows the artist, else 0)
            follow_sq = (
                ArtistFollow.objects
                .filter(user=user, artist_id=OuterRef("artist_id"))
                .values("user")
                .annotate(cnt=Count("id"))
                .values("cnt")[:1]
            )

            qs = qs.annotate(
                history_score=Coalesce(Subquery(history_genre_sq, output_field=IntegerField()), Value(0)),
                like_score=Coalesce(Subquery(like_artist_sq, output_field=IntegerField()), Value(0)) * 2,
                follow_score=Coalesce(Subquery(follow_sq, output_field=IntegerField()), Value(0)) * 3,
                personal_score=db_models.F("history_score") + db_models.F("like_score") + db_models.F("follow_score"),
            )
            # Order by combined personalised score DESC, then stream popularity
            qs = qs.order_by("-personal_score", "-stream_count")
        else:
            # Anonymous: simple popularity order
            qs = qs.order_by("-stream_count")

        songs = qs[:limit]

        # ── If same-genre pool is exhausted, fallback to global popular ─ #
        if songs.count() < limit:
            needed = limit - songs.count()
            got_ids = list(songs.values_list("id", flat=True))
            fallback = (
                _songs_with_counts()
                .filter(status=SongStatus.APPROVED)
                .exclude(pk__in=list(exclude_ids) + [str(i) for i in got_ids])
                .order_by("-stream_count")[:needed]
            )
            # Merge
            songs = list(songs) + list(fallback)

        return Response(SongSerializer(songs, many=True).data)

