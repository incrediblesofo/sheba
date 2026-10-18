"""
Sheba Sound — Cloud Storage Service
-------------------------------------
Wraps Cloudinary operations for audio and image uploads.
Falls back to Django's default_storage (local filesystem)
when Cloudinary credentials are not configured.
"""

import hashlib
import logging
import os
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


class CloudinaryStorage:
    """
    Upload, delete, and generate URLs for media files via Cloudinary CDN.

    Usage:
        storage = CloudinaryStorage()
        result = storage.upload_audio(file_obj, folder="songs/audio")
        # result = {"url": "https://res.cloudinary.com/...", "public_id": "...", "duration": 180}

        result = storage.upload_image(file_obj, folder="songs/covers")
        # result = {"url": "https://res.cloudinary.com/...", "public_id": "..."}
    """

    @property
    def is_configured(self) -> bool:
        """Check if Cloudinary credentials are present."""
        return bool(
            getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
            and getattr(settings, "CLOUDINARY_API_KEY", "")
            and getattr(settings, "CLOUDINARY_API_SECRET", "")
        )

    # ------------------------------------------------------------------ #
    #  Audio Upload                                                        #
    # ------------------------------------------------------------------ #

    def upload_audio(
        self,
        file,
        *,
        folder: str = "sheba-sound/songs/audio",
        public_id: str | None = None,
    ) -> dict:
        """
        Upload an audio file (MP3, WAV, FLAC, etc.).

        Cloudinary treats audio as resource_type="video" (their media type
        that covers both video and audio files).

        Returns:
            {"url": str, "public_id": str, "duration": float, "format": str, "bytes": int}
        """
        if not self.is_configured:
            return self._local_upload(file, subfolder="songs/audio")

        import cloudinary.uploader

        pid = public_id or f"{folder}/{uuid.uuid4().hex}"

        logger.info("Cloudinary: uploading audio → %s", pid)

        try:
            result = cloudinary.uploader.upload(
                file,
                resource_type="video",  # Cloudinary's type for audio/video
                public_id=pid,
                folder=None,  # Already included in public_id
                overwrite=True,
                # Streaming-optimized delivery settings:
                eager=[
                    {"format": "mp3", "audio_codec": "mp3", "bit_rate": "192k"},
                ],
                eager_async=True,
            )

            url = result.get("secure_url") or result.get("url", "")
            return {
                "url": url,
                "public_id": result.get("public_id", pid),
                "duration": result.get("duration", 0),
                "format": result.get("format", ""),
                "bytes": result.get("bytes", 0),
            }

        except Exception as exc:
            logger.error("Cloudinary audio upload failed: %s", exc)
            # Fallback to local storage on failure
            logger.warning("Falling back to local storage for audio file")
            return self._local_upload(file, subfolder="songs/audio")

    # ------------------------------------------------------------------ #
    #  Image Upload                                                        #
    # ------------------------------------------------------------------ #

    def upload_image(
        self,
        file,
        *,
        folder: str = "sheba-sound/songs/covers",
        public_id: str | None = None,
        width: int | None = None,
        height: int | None = None,
    ) -> dict:
        """
        Upload an image file (JPEG, PNG, WebP).

        Applies automatic format and quality optimization for CDN delivery.

        Returns:
            {"url": str, "public_id": str, "format": str, "bytes": int}
        """
        if not self.is_configured:
            return self._local_upload(file, subfolder="songs/covers")

        import cloudinary.uploader

        pid = public_id or f"{folder}/{uuid.uuid4().hex}"

        # Build transformation for optimized delivery
        transformation = {
            "quality": "auto:good",
            "fetch_format": "auto",  # Serve WebP to supported browsers
        }
        if width:
            transformation["width"] = width
            transformation["crop"] = "limit"
        if height:
            transformation["height"] = height
            transformation["crop"] = "limit"

        logger.info("Cloudinary: uploading image → %s", pid)

        try:
            result = cloudinary.uploader.upload(
                file,
                resource_type="image",
                public_id=pid,
                folder=None,
                overwrite=True,
                transformation=transformation,
            )

            url = result.get("secure_url") or result.get("url", "")
            return {
                "url": url,
                "public_id": result.get("public_id", pid),
                "format": result.get("format", ""),
                "bytes": result.get("bytes", 0),
            }

        except Exception as exc:
            logger.error("Cloudinary image upload failed: %s", exc)
            logger.warning("Falling back to local storage for image file")
            return self._local_upload(file, subfolder="songs/covers")

    # ------------------------------------------------------------------ #
    #  Delete                                                              #
    # ------------------------------------------------------------------ #

    def delete(self, public_id: str, resource_type: str = "image") -> bool:
        """Delete an asset from Cloudinary by its public_id."""
        if not self.is_configured:
            logger.warning("Cloudinary not configured — cannot delete %s", public_id)
            return False

        import cloudinary.uploader

        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            return result.get("result") == "ok"
        except Exception as exc:
            logger.error("Cloudinary delete failed for %s: %s", public_id, exc)
            return False

    # ------------------------------------------------------------------ #
    #  Optimized URL Generation                                            #
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
        """
        Generate a Cloudinary URL with on-the-fly transformations.
        Useful for thumbnails, responsive images, etc.
        """
        if not self.is_configured:
            return ""

        import cloudinary.utils

        url, _options = cloudinary.utils.cloudinary_url(
            public_id,
            width=width,
            height=height,
            crop=crop,
            quality=quality,
            fetch_format=fmt,
            secure=True,
        )
        return url

    # ------------------------------------------------------------------ #
    #  Audio Hash (SHA-256)                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def compute_audio_hash(file) -> str:
        """
        Compute SHA-256 hash of an audio file for copyright fingerprinting.
        Reads the file in chunks to handle large files efficiently.
        """
        sha256 = hashlib.sha256()
        file.seek(0)
        while True:
            chunk = file.read(8192)
            if not chunk:
                break
            sha256.update(chunk)
        file.seek(0)  # Reset file pointer for subsequent reads
        return f"sha256:{sha256.hexdigest()}"

    # ------------------------------------------------------------------ #
    #  Local Fallback                                                      #
    # ------------------------------------------------------------------ #

    def _local_upload(self, file, *, subfolder: str = "uploads") -> dict:
        """
        Fallback: save file to Django's MEDIA_ROOT using default_storage.
        Returns a dict shaped like the Cloudinary response for consistency.
        """
        uid = uuid.uuid4().hex
        original_name = getattr(file, "name", "file")
        ext = os.path.splitext(original_name)[1] or ""
        rel_path = f"{subfolder}/{uid}{ext}"

        # Ensure file pointer is at start
        if hasattr(file, "seek"):
            file.seek(0)

        saved_path = default_storage.save(rel_path, ContentFile(file.read()))

        # Build an absolute URL (works in dev; in production, use MEDIA_URL from CDN)
        url = f"{settings.MEDIA_URL}{saved_path}"

        logger.info("Local storage: saved %s → %s", original_name, saved_path)

        return {
            "url": url,
            "public_id": saved_path,
            "format": ext.lstrip("."),
            "bytes": getattr(file, "size", 0),
        }
