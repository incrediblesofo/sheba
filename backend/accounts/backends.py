"""
Sheba Sound — Authentication Backends
Supports login with email or phone number.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailBackend(ModelBackend):
    """Authenticate using email address."""

    def authenticate(self, request, email=None, password=None, **kwargs):
        if not email:
            return None
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


class PhoneBackend(ModelBackend):
    """Authenticate using phone number."""

    def authenticate(self, request, phone_number=None, password=None, **kwargs):
        if not phone_number:
            return None
        try:
            user = User.objects.get(phone_number=phone_number)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
