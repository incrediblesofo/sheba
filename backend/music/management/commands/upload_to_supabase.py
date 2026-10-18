"""
Sheba Sound — Upload Local Media to Supabase Storage
----------------------------------------------------
Uploads all local audio files and song covers from backend/media/
directly to Supabase Storage, and updates the database Song records
with the public Supabase CDN URLs.

Usage:
    python manage.py upload_to_supabase
"""

import os
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from music.models import Album, Song
from music.storage import MediaStorage


class Command(BaseCommand):
    help = "Upload local media (songs & covers) to Supabase Storage and update database records."

    def handle(self, *args, **options):
        storage = MediaStorage()
        if not storage.has_supabase:
            self.stdout.write(
                self.style.ERROR(
                    "❌ Supabase is not configured! Please set SUPABASE_URL and SUPABASE_KEY in backend/.env"
                )
            )
            return

        bucket_name = getattr(settings, "SUPABASE_STORAGE_BUCKET", "music")
        self.stdout.write(f"Connecting to Supabase Storage (bucket: {bucket_name})...")
        storage._ensure_supabase_bucket(bucket_name)

        media_root = Path(settings.MEDIA_ROOT)
        audio_dir = media_root / "songs" / "audio"
        covers_dir = media_root / "songs" / "covers"

        uploaded_audio = {}
        uploaded_covers = {}

        # 1. Upload audio files
        if audio_dir.exists():
            audio_files = [f for f in audio_dir.iterdir() if f.is_file()]
            self.stdout.write(f"Found {len(audio_files)} audio file(s) in {audio_dir}...")
            for audio_file in audio_files:
                self.stdout.write(f"  Uploading audio: {audio_file.name}...")
                try:
                    with open(audio_file, "rb") as f:
                        res = storage.upload_audio(
                            f,
                            folder="songs/audio",
                            public_id=f"songs/audio/{audio_file.name}",
                        )
                        uploaded_audio[audio_file.name] = res["url"]
                        self.stdout.write(self.style.SUCCESS(f"    ✓ {res['url']}"))
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"    ✗ Failed to upload {audio_file.name}: {exc}"))
        else:
            self.stdout.write("No local audio directory found.")

        # 2. Upload cover images
        if covers_dir.exists():
            cover_files = [f for f in covers_dir.iterdir() if f.is_file()]
            self.stdout.write(f"Found {len(cover_files)} cover image(s) in {covers_dir}...")
            for cover_file in cover_files:
                self.stdout.write(f"  Uploading cover: {cover_file.name}...")
                try:
                    with open(cover_file, "rb") as f:
                        res = storage.upload_image(
                            f,
                            folder="songs/covers",
                            public_id=f"songs/covers/{cover_file.name}",
                        )
                        uploaded_covers[cover_file.name] = res["url"]
                        self.stdout.write(self.style.SUCCESS(f"    ✓ {res['url']}"))
                except Exception as exc:
                    self.stdout.write(self.style.ERROR(f"    ✗ Failed to upload {cover_file.name}: {exc}"))
        else:
            self.stdout.write("No local covers directory found.")

        # 3. Update database records
        updated_songs = 0
        for song in Song.objects.all():
            updated = False
            # Check audio
            if song.audio_file_url:
                for filename, supabase_url in uploaded_audio.items():
                    if filename in song.audio_file_url:
                        song.audio_file_url = supabase_url
                        updated = True
                        break
            # Check cover
            if song.cover_image_url:
                for filename, supabase_url in uploaded_covers.items():
                    if filename in song.cover_image_url:
                        song.cover_image_url = supabase_url
                        updated = True
                        break
            if updated:
                song.save()
                updated_songs += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Finished! Uploaded {len(uploaded_audio)} songs and {len(uploaded_covers)} covers to Supabase. "
                f"Updated {updated_songs} database records."
            )
        )
