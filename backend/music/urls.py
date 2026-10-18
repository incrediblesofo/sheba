"""
Sheba Sound — Music URL Configuration
"""

from django.urls import path

from . import views

urlpatterns = [
    # Public catalog
    path("songs/", views.SongListView.as_view(), name="song-list"),
    path("songs/radio/", views.RadioRecommendationsView.as_view(), name="song-radio"),
    path("songs/<uuid:pk>/", views.SongDetailView.as_view(), name="song-detail"),
    path("songs/<uuid:pk>/stream/", views.SongStreamView.as_view(), name="song-stream"),
    path("songs/<uuid:pk>/download/", views.SongDownloadView.as_view(), name="song-download"),
    path("songs/<uuid:pk>/download/remove/", views.SongDownloadRemoveView.as_view(), name="song-download-remove"),
    path("songs/<uuid:pk>/like/", views.SongLikeView.as_view(), name="song-like"),
    path("downloads/", views.MyDownloadsView.as_view(), name="my-downloads"),
    path("liked-songs/", views.LikedSongsListView.as_view(), name="liked-songs"),
    path("history/", views.ListeningHistoryView.as_view(), name="listening-history"),
    path("albums/", views.AlbumListView.as_view(), name="album-list"),
    path("albums/<uuid:pk>/", views.AlbumDetailView.as_view(), name="album-detail"),
    path("playlists/my/", views.MyPlaylistListView.as_view(), name="my-playlists"),
    path("playlists/", views.PlaylistListCreateView.as_view(), name="playlist-list-create"),
    path("playlists/<uuid:pk>/", views.PlaylistDetailView.as_view(), name="playlist-detail"),
    path("playlists/<uuid:pk>/cover/", views.PlaylistCoverImageView.as_view(), name="playlist-cover"),
    path("playlists/<uuid:pk>/songs/", views.PlaylistSongsView.as_view(), name="playlist-songs"),
    path("playlists/<uuid:pk>/songs/reorder/", views.PlaylistSongsReorderView.as_view(), name="playlist-songs-reorder"),
    path("playlists/<uuid:pk>/songs/<uuid:song_pk>/", views.PlaylistSongDetailView.as_view(), name="playlist-song-detail"),
    path("search/", views.SearchView.as_view(), name="music-search"),

    # Follow / Unfollow
    path("artists/<uuid:pk>/follow/", views.ToggleFollowArtistView.as_view(), name="artist-follow"),
    path("artists/<uuid:pk>/follow-status/", views.FollowStatusView.as_view(), name="artist-follow-status"),
    path("followed-artists/", views.FollowedArtistsListView.as_view(), name="followed-artists"),

    # Artist's own content
    path("artist/songs/upload/", views.SongUploadView.as_view(), name="artist-song-upload"),
    path("artist/songs/", views.ArtistSongListCreateView.as_view(), name="artist-song-list"),
    path("artist/songs/<uuid:pk>/", views.ArtistSongDetailView.as_view(), name="artist-song-detail"),
    path("artist/songs/<uuid:pk>/cover/", views.SongCoverImageView.as_view(), name="artist-song-cover"),
    path("artist/albums/", views.ArtistAlbumListCreateView.as_view(), name="artist-album-list"),
    path("artist/albums/<uuid:pk>/", views.ArtistAlbumDetailView.as_view(), name="artist-album-detail"),
    path("artist/albums/<uuid:pk>/cover/", views.AlbumCoverImageView.as_view(), name="artist-album-cover"),

    # Artist analytics, earnings & notifications
    path("artist/analytics/", views.ArtistAnalyticsView.as_view(), name="artist-analytics"),
    path("artist/earnings/", views.ArtistEarningsView.as_view(), name="artist-earnings"),
    path("artist/withdrawals/", views.WithdrawalRequestView.as_view(), name="artist-withdrawals"),
    path("artist/notifications/", views.ArtistNotificationsView.as_view(), name="artist-notifications"),
    path("artist/notifications/<uuid:pk>/", views.NotificationDetailView.as_view(), name="artist-notification-detail"),
]
