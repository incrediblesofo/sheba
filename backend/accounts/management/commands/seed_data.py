"""
Sheba Sound — Seed Data Management Command
Populates the database with mock data matching the frontend mockMusic.ts / mockAdmin.ts.

Usage:
    python manage.py seed_data
    python manage.py seed_data --clear  # Drop existing seed data first
"""

from datetime import datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import ArtistProfile, Genre, ListenerProfile, User, UserRole
from music.models import Album, Playlist, PlaylistSong, Song, SongStatus


AUDIO_BASE = "https://www.soundhelix.com/examples/mp3"


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
        self.stdout.write("Seeding songs...")
        songs = self._create_songs(artists, albums)
        self.stdout.write("Seeding playlists...")
        self._create_playlists(users, songs)

        self.stdout.write(self.style.SUCCESS("✅ Database seeded successfully!"))

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
            ("user-artist-6", "betty@example.com", "betty_g", "Betty", "G", UserRole.ARTIST),
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
            users[key] = user

            # Auto-create profiles
            if role == UserRole.LISTENER:
                ListenerProfile.objects.get_or_create(user=user)
            if role == UserRole.ADMIN:
                user.is_staff = True
                user.is_superuser = True
                user.save()

        return users

    # ------------------------------------------------------------------ #
    #  Artists                                                             #
    # ------------------------------------------------------------------ #

    def _create_artists(self, users):
        artists = {}
        artist_data = [
            ("user-artist-1", "Teddy Afro", "One of Ethiopia's most beloved musicians, known for his powerful voice and patriotic songs.", 12500000),
            ("user-artist-2", "Aster Aweke", "The Queen of Ethiopian music, with decades of timeless Amharic ballads.", 8900000),
            ("user-artist-3", "Mulatu Astatke", "The father of Ethio-jazz, blending traditional Ethiopian scales with modern jazz.", 6200000),
            ("user-artist-4", "Tilahun Gessesse", "The Voice of Ethiopia — a legendary singer whose music spans generations.", 15000000),
            ("user-artist-5", "Eyob Mekonnen", "A modern Ethiopian pop sensation blending R&B with Amharic lyricism.", 4100000),
            ("user-artist-6", "Betty G", "Ethiopia's pop queen, known for energetic performances and modern Afrobeat fusion.", 5500000),
        ]

        for user_key, stage_name, bio, streams in artist_data:
            profile, _ = ArtistProfile.objects.get_or_create(
                user=users[user_key],
                defaults={
                    "stage_name": stage_name,
                    "bio": bio,
                    "verified": True,
                    "profile_image_url": f"https://picsum.photos/seed/{stage_name.lower().replace(' ', '')}/300/300",
                    "total_streams": streams,
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
            ("album-001", "user-artist-1", "Ethiopia", Genre.MODERN, "2017-05-01", "A patriotic masterpiece celebrating Ethiopian unity and love."),
            ("album-002", "user-artist-2", "Fikir", Genre.TIZITA, "2015-09-15", "A collection of timeless love ballads in the Tizita scale."),
            ("album-003", "user-artist-3", "Ethio-Jazz Voyage", Genre.ETHIOJAZZ, "2010-03-20", "A journey through Ethiopian scales fused with jazz improvisation."),
            ("album-004", "user-artist-4", "Yene Abeba", Genre.TIZITA, "1998-06-10", "Classic Ethiopian ballads by the legendary Tilahun Gessesse."),
            ("album-005", "user-artist-5", "Addis Vibe", Genre.MODERN, "2023-11-01", "Modern Ethiopian pop with R&B influences from the streets of Addis."),
            ("album-006", "user-artist-6", "Sheger Beats", Genre.MODERN, "2024-02-14", "High-energy Afrobeat fused with traditional Ethiopian rhythms."),
        ]

        for key, artist_key, title, genre, release, desc in album_data:
            album, _ = Album.objects.get_or_create(
                title=title,
                artist=artists[artist_key],
                defaults={
                    "cover_image_url": f"https://picsum.photos/seed/{title.lower().replace(' ', '-')}/300/300",
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
            ("song-001", "user-artist-1", "album-001", "Alhed Ale", Genre.MODERN, 285, 1, 3200000),
            ("song-002", "user-artist-1", "album-001", "Tikur Sew", Genre.MODERN, 312, 2, 4500000),
            ("song-003", "user-artist-2", "album-002", "Tizita", Genre.TIZITA, 267, 3, 2800000),
            ("song-004", "user-artist-2", "album-002", "Ewedihalehu", Genre.TIZITA, 245, 4, 1900000),
            ("song-005", "user-artist-3", "album-003", "Yekermo Sew", Genre.ETHIOJAZZ, 298, 5, 2100000),
            ("song-006", "user-artist-3", "album-003", "Motherland", Genre.ETHIOJAZZ, 340, 6, 1750000),
            ("song-007", "user-artist-4", "album-004", "Yene Abeba", Genre.TIZITA, 276, 7, 5100000),
            ("song-008", "user-artist-4", "album-004", "Min Tebegn", Genre.AMBASSEL, 260, 8, 3400000),
            ("song-009", "user-artist-5", "album-005", "Yemeskel Let", Genre.MODERN, 230, 9, 1200000),
            ("song-010", "user-artist-5", "album-005", "Addis Ababa", Genre.MODERN, 215, 10, 980000),
            ("song-011", "user-artist-6", "album-006", "Ere Suk", Genre.MODERN, 198, 11, 2300000),
            ("song-012", "user-artist-6", "album-006", "Abet", Genre.MODERN, 210, 12, 1800000),
        ]

        for key, artist_key, album_key, title, genre, duration, audio_num, streams in song_data:
            song, _ = Song.objects.get_or_create(
                title=title,
                artist=artists[artist_key],
                defaults={
                    "album": albums[album_key],
                    "genre": genre,
                    "duration": duration,
                    "audio_file_url": f"{AUDIO_BASE}/SoundHelix-Song-{audio_num}.mp3",
                    "cover_image_url": f"https://picsum.photos/seed/{title.lower().replace(' ', '')}/300/300",
                    "stream_count": streams,
                    "status": SongStatus.APPROVED,
                },
            )
            songs[key] = song

        return songs

    # ------------------------------------------------------------------ #
    #  Playlists                                                           #
    # ------------------------------------------------------------------ #

    def _create_playlists(self, users, songs):
        # Use the admin user as the system playlist owner
        system_user = users["user-admin-1"]

        playlists_data = [
            ("Best of Ethiopian Classics", "Timeless hits from the golden era of Ethiopian music.", ["song-007", "song-008", "song-003", "song-004"]),
            ("Ethio-Jazz Essentials", "The finest Ethio-jazz from Mulatu and beyond.", ["song-005", "song-006"]),
            ("Modern Ethiopian Hits", "Fresh tracks from the new wave of Ethiopian pop.", ["song-001", "song-002", "song-009", "song-010", "song-011", "song-012"]),
            ("Tizita Moods", "Melancholic and beautiful Tizita-scale melodies for reflection.", ["song-003", "song-004", "song-007"]),
        ]

        for title, desc, song_keys in playlists_data:
            playlist, created = Playlist.objects.get_or_create(
                title=title,
                owner=system_user,
                defaults={
                    "description": desc,
                    "is_public": True,
                    "cover_image_url": f"https://picsum.photos/seed/{title.lower().replace(' ', '')}/300/300",
                },
            )
            if created:
                for i, song_key in enumerate(song_keys):
                    if song_key in songs:
                        PlaylistSong.objects.create(
                            playlist=playlist,
                            song=songs[song_key],
                            order=i,
                        )
