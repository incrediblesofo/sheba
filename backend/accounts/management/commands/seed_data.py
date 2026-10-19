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
    "teddy_afro": f"{AUDIO_BASE}/songs/covers/197aef8788b44bfda70b3aefa0cc503e.jpg",      # Teddy Afro - Etorika
    "lij_michael": f"{AUDIO_BASE}/songs/covers/701319f24c23448cb4295a92cc15e291.jpg",     # Lij Michael - Alew Masinqo
    "lij_yeshi": f"{AUDIO_BASE}/songs/covers/6059a57b26094fd2aa1ace34524a720e.jpeg",       # Lij Michael - Yeshi
    "veronica_adane": f"{AUDIO_BASE}/songs/covers/66bf43fc505d4ff68c6d0c8f6e43b596.jpeg",  # Veronica Adane
    "tsegaye_eshetu": f"{AUDIO_BASE}/songs/covers/7d7aea88b7c84143a3363ea2d9a5fd80.jpeg",  # Tsegaye Eshetu - Best of
    "gossaye_tesfaye": f"{AUDIO_BASE}/songs/covers/e8ded85717b64619b1bd6aef8274387d.jpg", # Gossaye Tesfaye - Satamagne Bela
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
            ("user-artist-2", "lijmic@example.com", "lij_michael", "Lij", "Michael", UserRole.ARTIST),
            ("user-artist-3", "gossaye@example.com", "gossaye_tesfaye", "Gossaye", "Tesfaye", UserRole.ARTIST),
            ("user-artist-4", "veronica@example.com", "veronica_adane", "Veronica", "Adane", UserRole.ARTIST),
            ("user-artist-5", "tsegaye@example.com", "tsegaye_eshetu", "Tsegaye", "Eshetu", UserRole.ARTIST),
            ("user-artist-6", "erimusik@example.com", "eri_musik", "Eri", "Musik", UserRole.ARTIST),
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
            ("user-artist-1", "Teddy Afro", "One of Ethiopia's most beloved musicians, known for his powerful voice, poetic storytelling, and iconic albums.", COVERS["teddy_afro"]),
            ("user-artist-2", "Lij Michael", "Pioneering Ethiopian hip-hop and Afro-pop artist blending traditional Ethiopian instruments with modern beats.", COVERS["lij_michael"]),
            ("user-artist-3", "Gossaye Tesfaye", "Acclaimed Ethiopian vocalist renowned for his emotional ballads and soulful Amharic love songs.", COVERS["gossaye_tesfaye"]),
            ("user-artist-4", "Veronica Adane", "Rising Ethiopian singer celebrated for her sweet vocals and contemporary popular hits.", COVERS["veronica_adane"]),
            ("user-artist-5", "Tsegaye Eshetu", "Legendary Ethiopian vocalist and golden-age icon famous for classic Tizita and traditional hits.", COVERS["tsegaye_eshetu"]),
            ("user-artist-6", "Eri-Musik", "Traditional Horn of Africa folklore ensemble preserving cultural musical heritage.", COVERS["lij_yeshi"]),
        ]

        for user_key, stage_name, bio, cover_url in artist_data:
            profile, created = ArtistProfile.objects.get_or_create(
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
            if not created:
                profile.stage_name = stage_name
                profile.bio = bio
                profile.verified = True
                profile.profile_image_url = cover_url
                profile.cover_image_url = cover_url
                profile.save()
            artists[user_key] = profile

        return artists

    # ------------------------------------------------------------------ #
    #  Albums                                                              #
    # ------------------------------------------------------------------ #

    def _create_albums(self, artists):
        albums = {}
        album_data = [
            ("album-001", "user-artist-1", "Etorika", Genre.MODERN, "2026-04-16", "Teddy Afro's landmark sixth studio album featuring traditional and modern Ethiopian rhythms.", COVERS["teddy_afro"]),
            ("album-002", "user-artist-2", "Kemen Lejemer", Genre.HIPHOP, "2024-02-14", "High-energy Ethiopian hip-hop fusion featuring masinqo and traditional melodies by Lij Michael.", COVERS["lij_michael"]),
            ("album-003", "user-artist-3", "Satamagne Bela", Genre.TIZITA, "2006-11-20", "Timeless Ethiopian romantic classics featuring Gossaye's iconic vocal style.", COVERS["gossaye_tesfaye"]),
            ("album-004", "user-artist-4", "Tefet Alegn", Genre.MODERN, "2021-08-10", "Contemporary Ethiopian pop hits showcasing Veronica Adane's distinctive melodic presence.", COVERS["veronica_adane"]),
            ("album-005", "user-artist-5", "Best of Tsegaye Eshetu", Genre.TIZITA, "2013-05-12", "Oldies collection featuring the timeless recordings of legendary singer Tsegaye Eshetu.", COVERS["tsegaye_eshetu"]),
            ("album-006", "user-artist-6", "Horn Folklore", Genre.TIGRIGNA, "2020-01-01", "Traditional rhythms and folk strings from the Horn of Africa.", COVERS["lij_yeshi"]),
        ]

        for key, artist_key, title, genre, release, desc, cover in album_data:
            album, created = Album.objects.get_or_create(
                title=title,
                artist=artists[artist_key],
                defaults={
                    "cover_image_url": cover,
                    "release_date": datetime.strptime(release, "%Y-%m-%d").date(),
                    "genre": genre,
                    "description": desc,
                },
            )
            if not created:
                album.artist = artists[artist_key]
                album.cover_image_url = cover
                album.genre = genre
                album.description = desc
                album.save()
            albums[key] = album

        return albums

    # ------------------------------------------------------------------ #
    #  Songs                                                               #
    # ------------------------------------------------------------------ #

    def _create_songs(self, artists, albums):
        songs = {}
        song_data = [
            # Teddy Afro (Album: Etorika)
            ("song-001", "user-artist-1", "album-001", "Das Tal (Ansaw)", Genre.MODERN, 438,
             f"{AUDIO_BASE}/songs/audio/59486fd93b424318a56202072702ff9b.m4a",
             COVERS["teddy_afro"], 0),
            ("song-002", "user-artist-1", "album-001", "Lemn Yhon", Genre.MODERN, 274,
             f"{AUDIO_BASE}/songs/audio/cdbe6fadba394f6d8b9bbe610b5c9d5f.mp3",
             COVERS["teddy_afro"], 0),

            # Lij Michael (Album: Kemen Lejemer)
            ("song-003", "user-artist-2", "album-002", "Alew Masinqo", Genre.HIPHOP, 221,
             f"{AUDIO_BASE}/songs/audio/e4dbe98d7cc5422eab75424819072474.m4a",
             COVERS["lij_michael"], 0),
            ("song-004", "user-artist-2", "album-002", "Nanye", Genre.HIPHOP, 206,
             f"{AUDIO_BASE}/songs/audio/b855610ae5254ce492bdf87d0246de45.m4a",
             COVERS["lij_yeshi"], 0),

            # Gossaye Tesfaye (Album: Satamagne Bela)
            ("song-005", "user-artist-3", "album-003", "Enateye", Genre.TIZITA, 329,
             f"{AUDIO_BASE}/songs/audio/cb71a4f2b2584897adad4b034322d494.m4a",
             COVERS["gossaye_tesfaye"], 0),

            # Veronica Adane (Album: Tefet Alegn)
            ("song-006", "user-artist-4", "album-004", "Tefet Alegn", Genre.MODERN, 240,
             f"{AUDIO_BASE}/songs/audio/76eda65892574d8c8ee04ffbfc02e886.mp3",
             COVERS["veronica_adane"], 0),

            # Tsegaye Eshetu (Album: Best of Tsegaye Eshetu)
            ("song-007", "user-artist-5", "album-005", "Sew Yale Sew", Genre.TIZITA, 402,
             f"{AUDIO_BASE}/songs/audio/095f4d36a0664f3eba617b84cad7f7fb.m4a",
             COVERS["tsegaye_eshetu"], 0),

            # Eri-Musik (Album: Horn Folklore)
            ("song-008", "user-artist-6", "album-006", "'Sey", Genre.TIGRIGNA, 300,
             f"{AUDIO_BASE}/songs/audio/a5e0fd539c5b4cb280ce74d0a769e499.mp3",
             COVERS["lij_yeshi"], 0),
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
                song.artist = artists[artist_key]
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
            ("Ethiopian Greatest Hits", "Timeless hits from the golden era and modern Ethiopian music.",
             ["song-001", "song-002", "song-003", "song-005"], COVERS["teddy_afro"]),
            ("Lij Michael Collection", "High-energy Ethiopian hip-hop fusion and modern street anthems.",
             ["song-003", "song-004"], COVERS["lij_michael"]),
            ("Romantic Amharic Classics", "Heartfelt vocal ballads from Gossaye Tesfaye, Veronica Adane, and more.",
             ["song-005", "song-006", "song-007"], COVERS["gossaye_tesfaye"]),
            ("Golden Era Tizita", "Melancholic and soulful Tizita-scale recordings by legendary masters.",
             ["song-007", "song-005"], COVERS["tsegaye_eshetu"]),
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
            if created or not playlist.playlistsong_set.exists():
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
