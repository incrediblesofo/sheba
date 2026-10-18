"""
Sheba Sound — Custom User Manager
"""

from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """Custom manager: uses email as the unique identifier for auth."""

    def create_user(self, username, email=None, phone_number=None, password=None, **extra_fields):
        if not email and not phone_number:
            raise ValueError("Either email or phone_number is required")
        if email:
            email = self.normalize_email(email)
        user = self.model(email=email, phone_number=phone_number, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_verified", True)
        extra_fields.setdefault("role", "admin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(username=username, email=email, password=password, **extra_fields)
