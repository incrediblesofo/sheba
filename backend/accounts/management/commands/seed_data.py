"""
Sheba Sound — Seed Data Management Command
Populates the database with real Ethiopian music tracks, synchronized artist streams,
albums with matching songs and covers, and listening history.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear  # Drop existing seed data first
"""

import random
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import ArtistProfile, Genre, ListenerProfile, User, UserRole
from music.models import (
    Album,
    ListeningHistory,
    Playlist,
    PlaylistSong,
    Song,
    SongStatus,
    StreamEvent,
)


AUDIO_BASE = "https://owqqlnxqfcijptiivzyr.supabase.co/storage/v1/object/public/music"

COVERS = {
    "teddy_afro": f"{AUDIO_BASE}/songs/covers/197aef8788b44bfda70b3aefa0cc503e.jpg",
    "aster_aweke": f"{AUDIO_BASE}/songs/covers/6059a57b26094fd2aa1ace34524a720e.jpeg",
    "mulatu_astatke": f"{AUDIO_BASE}/songs/covers/66bf43fc505d4ff68c6d0c8f6e43b596.jpeg",
    "tilahun_gessesse": f"{AUDIO_BASE}/songs/covers/701319f24c23448cb4295a92cc15e291.jpg",
    "eyob_mekonnen": f"{AUDIO_BASE}/songs/covers/7d7aea88b7c84143a3363ea2d9a5fd80.jpeg",
    "playlist_default": f"{AUDIO_BASE}/songs/covers/e8ded85717b64619b1bd6aef8274387d.jpg",
}


class Command(BaseCommand):
    help = "Seed the database with sample Ethiopian music data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all seeded data before re-creating.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Clearing existing data...")
            StreamEvent.objects.all().delete()
            ListeningHistory.objects.all().delete()
            PlaylistSong.objects.all().delete()
            Playlist.objects.all().delete()
            Song.objects.all().delete()
            Album.objects.all().delete()
            ArtistProfile.objects.all().delete()
            ListenerProfile.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()

        self.stdout.write("Seeding users...")
        users = self._create_users()

        self.stdout.write("Seeding artist profiles...")
        artists = self._create_artists(users)

        self.stdout.write("Seeding albums...")
        albums = self._create_albums(artists)

        self.stdout.write("Seeding songs with matching audio...")
        songs = self._create_songs(artists, albums)

        self.stdout.write("Syncing artist stream counts...")
        self._sync_artist_streams(artists)

        self.stdout.write("Seeding playlists...")
        self._create_playlists(users, songs)

        self.stdout.write("Seeding listening history & stream analytics...")
        self._create_history_and_analytics(users, songs)

        self.stdout.write(self.style.SUCCESS("Database seeded successfully!"))

    # ------------------------------------------------------------------ #
    #  Users                                                               #
    # ------------------------------------------------------------------ #

    def _create_users(self):
        users = {}
        user_data = [
            ("user-listener-1", "abebe.kebede@example.com", "abebe_k", "Abebe", "Kebede", UserRole.LISTENER),
            ("user-listener-2", "hana.solomon@example.com", "hana_s", "Hana", "Solomon", UserRole.LISTENER),
            ("user-listener-3", "meron.girma@example.com", "meron_g", "Meron", "Girma", UserRole.LISTENER),
            ("user-listener-4", "solomon.bekele@example.com", "solomon_b", "Solomon", "Bekele", UserRole.LISTENER),
            ("user-artist-1", "teddy@example.com", "teddy_afro", "Teddy", "Afro", UserRole.ARTIST),
            ("user-artist-2", "aster@example.com", "aster_aweke", "Aster", "Aweke", UserRole.ARTIST),
            ("user-artist-3", "mulatu@example.com", "mulatu_astatke", "Mulatu", "Astatke", UserRole.ARTIST),
            ("user-artist-4", "tilahun@example.com", "tilahun_gessesse", "Tilahun", "Gessesse", UserRole.ARTIST),
            ("user-artist-5", "eyob@example.com", "eyob_mekonnen", "Eyob", "Mekonnen", UserRole.ARTIST),
            ("user-admin-1", "dawit.mekonnen@example.com", "dawit_m", "Dawit", "Mekonnen", UserRole.ADMIN),
        ]

        for key, email, username, first, last, role in user_data:
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "first_name": first,
                    "last_name": last,
                    "role": role,
                    "is_active": True,
                    "is_verified": True,
                    "is_staff": role == UserRole.ADMIN,
                },
            )
            if created:
                user.set_password("ShebaSound123!")
                user.save()

            if role == UserRole.LISTENER:
                ListenerProfile.objects.get_or_create(user=user)
            elif role == UserRole.ADMIN:
                user.is_staff = True
                user.is_superuser = True
                user.save()

            users[key] = user

        return users

    # ------------------------------------------------------------------ #
    #  Artists                                                             #
    # ------------------------------------------------------------------ #

    def _create_artists(self, users):
        artists = {}
        artist_data = [
            ("user-artist-1", "Teddy Afro", "One of Ethiopia's most beloved musicians, known for his powerful voice and patriotic songs.", COVERS["teddy_afro"]),
            ("user-artist-2", "Aster Aweke", "The Queen of Ethiopian music, with decades of timeless Amharic ballads.", COVERS["aster_aweke"]),
            ("user-artist-3", "Mulatu Astatke", "The father of Ethio-jazz, blending traditional Ethiopian scales with modern jazz.", COVERS["mulatu_astatke"]),
            ("user-artist-4", "Tilahun Gessesse", "The Voice of Ethiopia — a legendary singer whose music spans generations.", COVERS["tilahun_gessesse"]),
            ("user-artist-5", "Eyob Mekonnen", "A modern Ethiopian reggae and pop sensation blending soulful melodies with Amharic lyricism.", COVERS["eyob_mekonnen"]),
        ]

        for user_key, stage_name, bio, cover_url in artist_data:
            profile, _ = ArtistProfile.objects.get_or_create(
                user=users[user_key],
                defaults={
                    "stage_name": stage_name,
                    "bio": bio,
                    "verified": True,
                    "profile_image_url": cover_url,
                    "cover_image_url": cover_url,
                    "total_streams": 0,
                },
            )
            artists[user_key] = profile

        return artists

    # ------------------------------------------------------------------ #
    #  Albums                                                              #
    # ------------------------------------------------------------------ #

    def _create_albums(self, artists):
        albums = {}
        album_data = [
            ("album-001", "user-artist-1", "Tikur Sew", Genre.MODERN, "2012-04-10", "Teddy Afro's landmark masterpiece celebrating Ethiopian unity, love, and history.", COVERS["teddy_afro"]),
            ("album-002", "user-artist-2", "Fikir", Genre.TIZITA, "2015-09-15", "A collection of timeless love ballads in the deep Tizita scale by Aster Aweke.", COVERS["aster_aweke"]),
            ("album-003", "user-artist-3", "Ethio-Jazz Voyage", Genre.ETHIOJAZZ, "2010-03-20", "Improvisational journeys through Ethiopian traditional scales fused with jazz.", COVERS["mulatu_astatke"]),
            ("album-004", "user-artist-4", "Yene Abeba", Genre.TIZITA, "1998-06-10", "Classic Ethiopian ballads by the timeless voice of Tilahun Gessesse.", COVERS["tilahun_gessesse"]),
            ("album-005", "user-artist-5", "Addis Vibe", Genre.MODERN, "2010-11-01", "Soulful Ethiopian roots and reggae fusion from Eyob Mekonnen.", COVERS["eyob_mekonnen"]),
        ]

        for key, artist_key, title, genre, release, desc, cover in album_data:
            album, _ = Album.objects.get_or_create(
                title=title,
                artist=artists[artist_key],
                defaults={
                    "cover_image_url": cover,
                    "release_date": datetime.strptime(release, "%Y-%m-%d").date(),
                    "genre": genre,
                    "description": desc,
                },
            )
            albums[key] = album

        return albums

    # ------------------------------------------------------------------ #
    #  Songs                                                               #
    # ------------------------------------------------------------------ #

    def _create_songs(self, artists, albums):
        songs = {}
        song_data = [
            # Teddy Afro (Album: Tikur Sew)
            ("song-001", "user-artist-1", "album-001", "Tikur Sew", Genre.MODERN, 300,
             f"{AUDIO_BASE}/songs/audio/a5e0fd539c5b4cb280ce74d0a769e499.mp3",
             COVERS["teddy_afro"], 0),
            ("song-002", "user-artist-1", "album-001", "Alhed Ale", Genre.MODERN, 240,
             f"{AUDIO_BASE}/songs/audio/76eda65892574d8c8ee04ffbfc02e886.mp3",
             COVERS["teddy_afro"], 0),

            # Aster Aweke (Album: Fikir)
            ("song-003", "user-artist-2", "album-002", "Ewedihalehu", Genre.TIZITA, 274,
             f"{AUDIO_BASE}/songs/audio/cdbe6fadba394f6d8b9bbe610b5c9d5f.mp3",
             COVERS["aster_aweke"], 0),

            # Mulatu Astatke (Album: Ethio-Jazz Voyage)
            ("song-004", "user-artist-3", "album-003", "Yekermo Sew", Genre.ETHIOJAZZ, 402,
             f"{AUDIO_BASE}/songs/audio/095f4d36a0664f3eba617b84cad7f7fb.m4a",
             COVERS["mulatu_astatke"], 0),

            # Tilahun Gessesse (Album: Yene Abeba)
            ("song-005", "user-artist-4", "album-004", "Yene Abeba", Genre.TIZITA, 438,
             f"{AUDIO_BASE}/songs/audio/59486fd93b424318a56202072702ff9b.m4a",
             COVERS["tilahun_gessesse"], 0),
            ("song-006", "user-artist-4", "album-004", "Min Tebegn", Genre.AMBASSEL, 206,
             f"{AUDIO_BASE}/songs/audio/b855610ae5254ce492bdf87d0246de45.m4a",
             COVERS["tilahun_gessesse"], 0),

            # Eyob Mekonnen (Album: Addis Vibe)
            ("song-007", "user-artist-5", "album-005", "Yemeskel Let", Genre.MODERN, 329,
             f"{AUDIO_BASE}/songs/audio/cb71a4f2b2584897adad4b034322d494.m4a",
             COVERS["eyob_mekonnen"], 0),
            ("song-008", "user-artist-5", "album-005", "Addis Ababa", Genre.MODERN, 221,
             f"{AUDIO_BASE}/songs/audio/e4dbe98d7cc5422eab75424819072474.m4a",
             COVERS["eyob_mekonnen"], 0),
        ]

        for key, artist_key, album_key, title, genre, duration, audio_url, cover_url, streams in song_data:
            song, created = Song.objects.get_or_create(
                title=title,
                artist=artists[artist_key],
                defaults={
                    "album": albums[album_key],
                    "genre": genre,
                    "duration": duration,
                    "audio_file_url": audio_url,
                    "cover_image_url": cover_url,
                    "stream_count": streams,
                    "status": SongStatus.APPROVED,
                },
            )
            if not created:
                song.album = albums[album_key]
                song.genre = genre
                song.duration = duration
                song.audio_file_url = audio_url
                song.cover_image_url = cover_url
                song.stream_count = streams
                song.status = SongStatus.APPROVED
                song.save()

            songs[key] = song

        return songs

    # ------------------------------------------------------------------ #
    #  Sync Artist Streams                                                 #
    # ------------------------------------------------------------------ #

    def _sync_artist_streams(self, artists):
        """Ensure each artist's total_streams exactly equals the sum of their songs."""
        for artist in artists.values():
            song_total = sum(s.stream_count for s in artist.songs.all())
            artist.total_streams = song_total
            artist.save(update_fields=["total_streams"])

    # ------------------------------------------------------------------ #
    #  Playlists                                                           #
    # ------------------------------------------------------------------ #

    def _create_playlists(self, users, songs):
        system_user = users["user-admin-1"]

        playlists_data = [
            ("Best of Ethiopian Classics", "Timeless hits from the golden era of Ethiopian music.",
             ["song-005", "song-006", "song-003", "song-001"], COVERS["tilahun_gessesse"]),
            ("Ethio-Jazz Essentials", "The finest Ethio-jazz from Mulatu Astatke and beyond.",
             ["song-004"], COVERS["mulatu_astatke"]),
            ("Modern Ethiopian Hits", "Fresh tracks from the new wave of Ethiopian pop and reggae.",
             ["song-001", "song-002", "song-007", "song-008"], COVERS["teddy_afro"]),
            ("Tizita Moods", "Melancholic and beautiful Tizita-scale melodies for reflection.",
             ["song-003", "song-005"], COVERS["aster_aweke"]),
        ]

        for title, desc, song_keys, cover_url in playlists_data:
            playlist, created = Playlist.objects.get_or_create(
                title=title,
                owner=system_user,
                defaults={
                    "description": desc,
                    "is_public": True,
                    "cover_image_url": cover_url,
                },
            )
            if created or not playlist.playlist_songs.exists():
                playlist.cover_image_url = cover_url
                playlist.save(update_fields=["cover_image_url"])
                for order, s_key in enumerate(song_keys):
                    if s_key in songs:
                        PlaylistSong.objects.get_or_create(
                            playlist=playlist,
                            song=songs[s_key],
                            defaults={"order": order},
                        )

    # ------------------------------------------------------------------ #
    #  Listening History & Stream Events                                   #
    # ------------------------------------------------------------------ #

    def _create_history_and_analytics(self, users, songs):
        """Clean start: all streaming analytics start from 0 real views."""
        pass
