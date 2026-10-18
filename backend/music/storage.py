"""
Sheba Sound — Cloud Media Storage Service
-----------------------------------------
Supports:
1. Supabase Storage (Primary recommended cloud storage for audio & cover art)
2. Cloudinary (Alternative cloud CDN)
3. Django default_storage (Local filesystem fallback for offline development)
"""

import hashlib
import logging
import mimetypes
import os
import uuid
import requests

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


class MediaStorage:
    """
    Unified storage service for audio files, cover art, and user avatars.
    Automatically routes to Supabase Storage, Cloudinary, or local disk.
    """

    @property
    def has_supabase(self) -> bool:
        """Check if Supabase credentials are configured."""
        return bool(
            getattr(settings, "SUPABASE_URL", "")
            and (
                getattr(settings, "SUPABASE_KEY", "")
                or getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "")
            )
        )

    @property
    def has_cloudinary(self) -> bool:
        """Check if Cloudinary credentials are configured."""
        return bool(
            getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
            and getattr(settings, "CLOUDINARY_API_KEY", "")
            and getattr(settings, "CLOUDINARY_API_SECRET", "")
        )

    @property
    def is_configured(self) -> bool:
        """True if any cloud storage backend is configured."""
        return self.has_supabase or self.has_cloudinary

    # ------------------------------------------------------------------ #
    #  Supabase Storage Helpers                                            #
    # ------------------------------------------------------------------ #

    def _ensure_supabase_bucket(self, bucket_name: str) -> bool:
        """Ensure the target bucket exists and is public in Supabase."""
        supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
        supabase_key = getattr(settings, "SUPABASE_KEY", "")
        if not (supabase_url and supabase_key):
            return False

        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": "application/json",
        }
        try:
            # Create bucket if missing (public=True for streaming)
            res = requests.post(
                f"{supabase_url}/storage/v1/bucket",
                headers=headers,
                json={"id": bucket_name, "name": bucket_name, "public": True},
                timeout=10,
            )
            # 200/201 = created, 400/409 = already exists
            return res.status_code in (200, 201, 400, 409)
        except Exception as exc:
            logger.warning("Supabase bucket check skipped: %s", exc)
            return True

    def _upload_to_supabase(
        self,
        file,
        path: str,
        *,
        bucket: str | None = None,
        content_type: str | None = None,
    ) -> dict:
        """Upload raw file content to Supabase Storage."""
        bucket_name = bucket or getattr(settings, "SUPABASE_STORAGE_BUCKET", "music")
        self._ensure_supabase_bucket(bucket_name)

        supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
        supabase_key = getattr(settings, "SUPABASE_KEY", "")

        if not content_type:
            content_type = mimetypes.guess_type(getattr(file, "name", path))[0] or "application/octet-stream"

        if hasattr(file, "seek"):
            file.seek(0)
        data = file.read() if hasattr(file, "read") else file

        upload_url = f"{supabase_url}/storage/v1/object/{bucket_name}/{path}"
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": content_type,
            "x-upsert": "true",
        }

        logger.info("Supabase: uploading %s to %s/%s", content_type, bucket_name, path)
        res = requests.post(upload_url, headers=headers, data=data, timeout=120)

        if res.status_code not in (200, 201):
            logger.error("Supabase Storage error [%d]: %s", res.status_code, res.text)
            raise RuntimeError(f"Supabase upload failed: {res.text}")

        public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{path}"
        ext = path.split(".")[-1] if "." in path else ""
        return {
            "url": public_url,
            "public_id": path,
            "duration": 0,
            "format": ext,
            "bytes": len(data),
        }

    # ------------------------------------------------------------------ #
    #  Audio Upload                                                        #
    # ------------------------------------------------------------------ #

    def upload_audio(
        self,
        file,
        *,
        folder: str = "songs/audio",
        public_id: str | None = None,
    ) -> dict:
        """
        Upload an audio file (MP3, M4A, WAV, etc.) to Supabase, Cloudinary,
        or local storage fallback.
        """
        orig_name = getattr(file, "name", "audio.mp3")
        ext = os.path.splitext(orig_name)[1] or ".mp3"
        uid = uuid.uuid4().hex

        # 1. Supabase Storage (Preferred)
        if self.has_supabase:
            try:
                path = public_id or f"{folder}/{uid}{ext}".lstrip("/")
                content_type = mimetypes.guess_type(orig_name)[0] or "audio/mpeg"
                return self._upload_to_supabase(file, path, content_type=content_type)
            except Exception as exc:
                logger.error("Supabase audio upload failed (%s), trying fallbacks...", exc)

        # 2. Cloudinary
        if self.has_cloudinary:
            try:
                import cloudinary.uploader
                pid = public_id or f"{folder}/{uid}"
                result = cloudinary.uploader.upload(
                    file,
                    resource_type="video",
                    public_id=pid,
                    overwrite=True,
                    eager=[{"format": "mp3", "audio_codec": "mp3", "bit_rate": "192k"}],
                    eager_async=True,
                )
                return {
                    "url": result.get("secure_url") or result.get("url", ""),
                    "public_id": result.get("public_id", pid),
                    "duration": result.get("duration", 0),
                    "format": result.get("format", ext.lstrip(".")),
                    "bytes": result.get("bytes", 0),
                }
            except Exception as exc:
                logger.error("Cloudinary audio upload failed: %s", exc)

        # 3. Local fallback
        return self._local_upload(file, subfolder=folder)

    # ------------------------------------------------------------------ #
    #  Image Upload                                                        #
    # ------------------------------------------------------------------ #

    def upload_image(
        self,
        file,
        *,
        folder: str = "songs/covers",
        public_id: str | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> dict:
        """
        Upload an image (JPEG, PNG, WebP) to Supabase, Cloudinary,
        or local storage fallback.
        """
        orig_name = getattr(file, "name", "cover.jpg")
        ext = os.path.splitext(orig_name)[1] or ".jpg"
        uid = uuid.uuid4().hex

        # 1. Supabase Storage
        if self.has_supabase:
            try:
                path = public_id or f"{folder}/{uid}{ext}".lstrip("/")
                content_type = mimetypes.guess_type(orig_name)[0] or "image/jpeg"
                return self._upload_to_supabase(file, path, content_type=content_type)
            except Exception as exc:
                logger.error("Supabase image upload failed (%s), trying fallbacks...", exc)

        # 2. Cloudinary
        if self.has_cloudinary:
            try:
                import cloudinary.uploader
                pid = public_id or f"{folder}/{uid}"
                transformation = {"quality": "auto:good", "fetch_format": "auto"}
                if width:
                    transformation["width"] = width
                    transformation["crop"] = "limit"
                if height:
                    transformation["height"] = height
                    transformation["crop"] = "limit"

                result = cloudinary.uploader.upload(
                    file,
                    resource_type="image",
                    public_id=pid,
                    overwrite=True,
                    transformation=transformation,
                )
                return {
                    "url": result.get("secure_url") or result.get("url", ""),
                    "public_id": result.get("public_id", pid),
                    "format": result.get("format", ext.lstrip(".")),
                    "bytes": result.get("bytes", 0),
                }
            except Exception as exc:
                logger.error("Cloudinary image upload failed: %s", exc)

        # 3. Local fallback
        return self._local_upload(file, subfolder=folder)

    # ------------------------------------------------------------------ #
    #  Delete                                                              #
    # ------------------------------------------------------------------ #

    def delete(self, public_id: str, resource_type: str = "image") -> bool:
        """Delete an asset from Supabase or Cloudinary."""
        if self.has_supabase:
            try:
                supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
                supabase_key = getattr(settings, "SUPABASE_KEY", "")
                bucket_name = getattr(settings, "SUPABASE_STORAGE_BUCKET", "music")
                headers = {"Authorization": f"Bearer {supabase_key}", "apikey": supabase_key}
                res = requests.delete(
                    f"{supabase_url}/storage/v1/object/{bucket_name}/{public_id}",
                    headers=headers,
                    timeout=10,
                )
                if res.status_code in (200, 204):
                    return True
            except Exception as exc:
                logger.error("Supabase delete failed for %s: %s", public_id, exc)

        if self.has_cloudinary:
            try:
                import cloudinary.uploader
                result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
                return result.get("result") == "ok"
            except Exception as exc:
                logger.error("Cloudinary delete failed for %s: %s", public_id, exc)

        return False

    # ------------------------------------------------------------------ #
    #  Optimized Image URL Helper                                          #
    # ------------------------------------------------------------------ #

    def get_optimized_image_url(
        self,
        public_id: str,
        *,
        width: int = 500,
        height: int = 500,
        crop: str = "fill",
        quality: str = "auto:good",
        fmt: str = "auto",
    ) -> str:
        """Generate optimized CDN URL."""
        if self.has_supabase:
            supabase_url = getattr(settings, "SUPABASE_URL", "").rstrip("/")
            bucket_name = getattr(settings, "SUPABASE_STORAGE_BUCKET", "music")
            return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{public_id}"

        if self.has_cloudinary:
            import cloudinary.utils
            url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                width=width,
                height=height,
                crop=crop,
                quality=quality,
                fetch_format=fmt,
                secure=True,
            )
            return url

        return f"{settings.MEDIA_URL}{public_id}"

    # ------------------------------------------------------------------ #
    #  Audio Hash (SHA-256)                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def compute_audio_hash(file) -> str:
        """Compute SHA-256 fingerprint for audio file."""
        sha256 = hashlib.sha256()
        if hasattr(file, "seek"):
            file.seek(0)
        while True:
            chunk = file.read(8192) if hasattr(file, "read") else b""
            if not chunk:
                break
            sha256.update(chunk)
        if hasattr(file, "seek"):
            file.seek(0)
        return f"sha256:{sha256.hexdigest()}"

    # ------------------------------------------------------------------ #
    #  Local Disk Fallback                                                 #
    # ------------------------------------------------------------------ #

    def _local_upload(self, file, *, subfolder: str = "uploads") -> dict:
        """Save file to Django's MEDIA_ROOT when offline / dev."""
        uid = uuid.uuid4().hex
        orig_name = getattr(file, "name", "file")
        ext = os.path.splitext(orig_name)[1] or ""
        clean_subfolder = subfolder.strip("/")
        rel_path = f"{clean_subfolder}/{uid}{ext}"

        if hasattr(file, "seek"):
            file.seek(0)

        saved_path = default_storage.save(rel_path, ContentFile(file.read()))
        url = f"{settings.MEDIA_URL}{saved_path}"

        logger.info("Local storage fallback: saved %s → %s", orig_name, saved_path)
        return {
            "url": url,
            "public_id": saved_path,
            "format": ext.lstrip("."),
            "bytes": getattr(file, "size", 0),
        }


# Maintain backward compatibility with existing views:
CloudinaryStorage = MediaStorage
