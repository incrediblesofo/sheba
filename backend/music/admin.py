"""
Sheba Sound — Music Admin
"""

from django.contrib import admin

from .models import Album, Song, Playlist, PlaylistSong


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "genre", "release_date")
    list_filter = ("genre",)
    search_fields = ("title",)


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ("title", "artist", "album", "genre", "status", "stream_count")
    list_filter = ("status", "genre")
    search_fields = ("title",)
    list_editable = ("status",)


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ("title", "owner", "is_public", "created_at")
    list_filter = ("is_public",)
    search_fields = ("title",)


@admin.register(PlaylistSong)
class PlaylistSongAdmin(admin.ModelAdmin):
    list_display = ("playlist", "song", "order")
    list_filter = ("playlist",)
