"""
Sheba Sound — Music Models
Album, Song, Playlist, PlaylistSong.
"""

from datetime import date

from django.conf import settings
from django.db import models

from accounts.models import ArtistProfile, Genre, TimeStampedModel


# ------------------------------------------------------------------ #
#  Choices                                                             #
# ------------------------------------------------------------------ #

class SongStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


# ------------------------------------------------------------------ #
#  Album                                                               #
# ------------------------------------------------------------------ #

class Album(TimeStampedModel):
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="albums",
    )
    title = models.CharField(max_length=255)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    release_date = models.DateField(default=date.today)
    genre = models.CharField(max_length=20, choices=Genre.choices)
    description = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-release_date"]

    def __str__(self):
        return f"{self.title} — {self.artist.stage_name}"


# ------------------------------------------------------------------ #
#  Song                                                                #
# ------------------------------------------------------------------ #

class Song(TimeStampedModel):
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="songs",
    )
    album = models.ForeignKey(
        Album,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="songs",
    )
    title = models.CharField(max_length=255)
    genre = models.CharField(max_length=20, choices=Genre.choices)
    duration = models.PositiveIntegerField(help_text="Duration in seconds")
    audio_file_url = models.URLField(max_length=500)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    stream_count = models.PositiveBigIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=SongStatus.choices,
        default=SongStatus.PENDING,
    )
    lyrics = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True, help_text="List of genre/mood tags")
    audio_hash = models.CharField(
        max_length=128, blank=True, null=True, unique=True,
        help_text="SHA-256 fingerprint for copyright duplicate detection",
    )

    class Meta:
        ordering = ["-stream_count"]

    def __str__(self):
        return f"{self.title} — {self.artist.stage_name}"


# ------------------------------------------------------------------ #
#  Fan Engagement                                                      #
# ------------------------------------------------------------------ #

class SongLike(models.Model):
    """Tracks which user liked which song (no duplicates)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="song_likes",
    )
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "song")

    def __str__(self):
        return f"{self.user} likes {self.song.title}"


class SongComment(models.Model):
    """User comment on a song."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="song_comments",
    )
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Comment by {self.user} on {self.song.title}"


# ------------------------------------------------------------------ #
#  Artist Follow                                                       #
# ------------------------------------------------------------------ #

class ArtistFollow(models.Model):
    """Tracks which user follows which artist (no duplicates)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="artist_follows",
    )
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="followers",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "artist")

    def __str__(self):
        return f"{self.user} follows {self.artist.stage_name}"


# ------------------------------------------------------------------ #
#  Playlist                                                            #
# ------------------------------------------------------------------ #

class Playlist(TimeStampedModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="playlists",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_public = models.BooleanField(default=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    songs = models.ManyToManyField(
        Song,
        through="PlaylistSong",
        related_name="in_playlists",
        blank=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class PlaylistSong(models.Model):
    """Through table to maintain song order inside a playlist."""

    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = ("playlist", "song")

    def __str__(self):
        return f"{self.playlist.title} #{self.order}: {self.song.title}"


# ------------------------------------------------------------------ #
#  Notifications                                                       #
# ------------------------------------------------------------------ #

class NotificationType(models.TextChoices):
    NEW_FOLLOWER = "new_follower", "New Follower"
    STREAM_MILESTONE = "stream_milestone", "Stream Milestone"
    REVENUE_UPDATE = "revenue_update", "Revenue Update"
    SONG_APPROVED = "song_approved", "Song Approved"
    SONG_REJECTED = "song_rejected", "Song Rejected"


class Notification(models.Model):
    """In-app notification for artists."""
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=NotificationType.choices)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.type}] {self.recipient} — {self.message[:40]}"


# ------------------------------------------------------------------ #
#  Revenue                                                             #
# ------------------------------------------------------------------ #

class ArtistEarning(models.Model):
    """Monthly earnings record for an artist."""
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="earnings",
    )
    month = models.CharField(max_length=7, help_text="Format: YYYY-MM")  # e.g. 2026-06
    streams_count = models.PositiveBigIntegerField(default=0)
    earnings_usd = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-month"]
        unique_together = ("artist", "month")

    def __str__(self):
        return f"{self.artist.stage_name} — {self.month}: ${self.earnings_usd}"


# ------------------------------------------------------------------ #
#  Withdrawal Requests                                                 #
# ------------------------------------------------------------------ #

class WithdrawalStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    COMPLETED = "completed", "Completed"
    REJECTED = "rejected", "Rejected"


class PaymentMethod(models.TextChoices):
    TELEBIRR = "telebirr", "TeleBirr"
    CHAPA = "chapa", "Chapa"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"


class WithdrawalRequest(models.Model):
    """Artist withdrawal request for unpaid earnings."""
    artist = models.ForeignKey(
        ArtistProfile,
        on_delete=models.CASCADE,
        related_name="withdrawals",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices,
    )
    account_details = models.CharField(
        max_length=255, blank=True, default="",
        help_text="Phone number or bank account info for payout",
    )
    status = models.CharField(
        max_length=20,
        choices=WithdrawalStatus.choices,
        default=WithdrawalStatus.PENDING,
    )
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.artist.stage_name} — ${self.amount} ({self.status})"


# ------------------------------------------------------------------ #
#  Listening History                                                   #
# ------------------------------------------------------------------ #

class ListeningHistory(models.Model):
    """Records individual song plays for a user."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listening_history",
    )
    song = models.ForeignKey(
        Song,
        on_delete=models.CASCADE,
        related_name="listen_history",
    )
    listened_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-listened_at"]
        indexes = [
            models.Index(fields=["user", "-listened_at"]),
        ]

    def __str__(self):
        return f"{self.user} listened to {self.song.title}"


# ------------------------------------------------------------------ #
#  Stream Events (real analytics)                                      #
# ------------------------------------------------------------------ #

class StreamEvent(models.Model):
    """
    Records each individual stream with metadata for analytics.
    Enables real stream counting, geographic distribution, and
    listener demographics without approximation.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="stream_events",
    )
    song = models.ForeignKey(
        Song,
        on_delete=models.CASCADE,
        related_name="stream_events",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    country = models.CharField(
        max_length=2, blank=True, default="",
        help_text="ISO 3166-1 alpha-2 country code",
    )
    city = models.CharField(max_length=128, blank=True, default="")
    streamed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-streamed_at"]
        indexes = [
            models.Index(fields=["song", "-streamed_at"]),
            models.Index(fields=["user", "-streamed_at"]),
            models.Index(fields=["country"]),
            models.Index(fields=["-streamed_at"]),
        ]

    def __str__(self):
        who = self.user or self.ip_address or "anonymous"
        return f"Stream: {who} → {self.song.title}"


# ------------------------------------------------------------------ #
#  Downloaded Songs (premium offline)                                  #
# ------------------------------------------------------------------ #

class DownloadedSong(models.Model):
    """Tracks songs downloaded by premium users for offline playback."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="downloads",
    )
    song = models.ForeignKey(
        Song,
        on_delete=models.CASCADE,
        related_name="downloads",
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-downloaded_at"]
        unique_together = [("user", "song")]
        indexes = [
            models.Index(fields=["user", "-downloaded_at"]),
        ]

    def __str__(self):
        return f"Download: {self.user} → {self.song.title}"

