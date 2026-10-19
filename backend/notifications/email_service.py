"""
Sheba Sound — Email Service
----------------------------
Centralised email utility that renders branded HTML templates and sends
transactional emails via Django's mail framework.

Usage:
    from notifications.email_service import EmailService
    EmailService.send_welcome_email(user)
"""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import PasswordResetTokenGenerator

logger = logging.getLogger(__name__)

# Singleton token generators used across the module
password_reset_token_generator = PasswordResetTokenGenerator()


class _EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """A distinct token generator for email verification so that password-
    reset tokens and email-verification tokens cannot be interchanged."""

    def _make_hash_value(self, user, timestamp):
        # Include is_verified so the token is automatically invalidated
        # once the user verifies (prevents replay).
        return f"{user.pk}{timestamp}{user.is_verified}"


email_verification_token_generator = _EmailVerificationTokenGenerator()


def _frontend_url() -> str:
    """Return the configured frontend URL (no trailing slash)."""
    return getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _from_email() -> str:
    """Return the configured DEFAULT_FROM_EMAIL."""
    return getattr(settings, "DEFAULT_FROM_EMAIL", "Sheba Sound <noreply@shebasound.com>")


def _magic_link_ttl_days() -> int:
    """Whole days (at least 1) for copy in emails; matches PASSWORD_RESET_TIMEOUT."""
    sec = int(getattr(settings, "PASSWORD_RESET_TIMEOUT", 60 * 60 * 24 * 3))
    return max(1, (sec + 43200) // 86400)


class EmailService:
    """Static helper class — every method is a classmethod so callers
    never need to instantiate."""

    # ---------------------------------------------------------------- #
    #  Welcome Email                                                     #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_welcome_email(cls, user) -> bool:
        """Send a branded welcome email to a newly registered user."""
        subject = "🎵 Welcome to Sheba Sound!"
        context = {
            "user": user,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/welcome.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Email Verification                                                #
    # ---------------------------------------------------------------- #

    @classmethod
    def generate_verification_token(cls, user) -> tuple[str, str]:
        """Generate a UID + token pair for email verification.

        Returns:
            (uid, token) — both URL-safe strings.
        """
        uid = urlsafe_base64_encode(force_bytes(str(user.pk)))
        token = email_verification_token_generator.make_token(user)
        return uid, token

    @classmethod
    def verify_email_token(cls, user, token: str) -> bool:
        """Check whether *token* is a valid email-verification token for *user*."""
        return email_verification_token_generator.check_token(user, token)

    @classmethod
    def send_verification_email(cls, user) -> bool:
        """Send a verification email with a clickable confirmation link."""
        uid, token = cls.generate_verification_token(user)
        verify_url = f"{_frontend_url()}/verify-email?uid={uid}&token={token}"
        subject = "✉️ Verify Your Sheba Sound Email"
        context = {
            "user": user,
            "verify_url": verify_url,
            "frontend_url": _frontend_url(),
            "link_expires_days": _magic_link_ttl_days(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/verify_email.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Password Reset Email                                              #
    # ---------------------------------------------------------------- #

    @classmethod
    def generate_password_reset_token(cls, user) -> tuple[str, str]:
        """Generate a UID + token pair for the password reset flow.

        Returns:
            (uid, token) — both URL-safe strings.
        """
        uid = urlsafe_base64_encode(force_bytes(str(user.pk)))
        token = password_reset_token_generator.make_token(user)
        return uid, token

    @classmethod
    def verify_password_reset_token(cls, user, token: str) -> bool:
        """Check whether *token* is valid for *user*."""
        return password_reset_token_generator.check_token(user, token)

    @classmethod
    def send_password_reset_email(cls, user, uid: str, token: str) -> bool:
        """Send the password-reset email with a clickable link."""
        reset_url = f"{_frontend_url()}/reset-password/{uid}/{token}"
        subject = "🔑 Reset Your Sheba Sound Password"
        context = {
            "user": user,
            "reset_url": reset_url,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/password_reset.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Song Approval / Rejection                                         #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_song_approved_email(cls, user, song) -> bool:
        """Notify the artist that their song has been approved."""
        subject = f"✅ Your Song \"{song.title}\" Has Been Approved!"
        context = {
            "user": user,
            "song": song,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/song_approved.html",
            context=context,
            recipient=user.email,
        )

    @classmethod
    def send_song_rejected_email(cls, user, song, reason: str = "") -> bool:
        """Notify the artist that their song has been rejected."""
        subject = f"❌ Your Song \"{song.title}\" Was Not Approved"
        context = {
            "user": user,
            "song": song,
            "reason": reason,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/song_rejected.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Subscription Renewal Reminder                                     #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_subscription_renewal_reminder(cls, user, subscription) -> bool:
        """Remind a user that their subscription is about to expire."""
        subject = "⏰ Your Sheba Sound Premium Is Expiring Soon"
        context = {
            "user": user,
            "subscription": subscription,
            "days_remaining": subscription.days_remaining,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/subscription_reminder.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Artist Verification — Approved                                    #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_artist_verified_email(cls, user, artist_profile) -> bool:
        """Notify a user that their artist application has been approved."""
        subject = "🎉 You're a Verified Artist on Sheba Sound!"
        context = {
            "user": user,
            "artist_profile": artist_profile,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/artist_verified.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Artist Verification — Rejected                                    #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_artist_rejected_email(cls, user, artist_profile, reason: str = "") -> bool:
        """Notify a user that their artist application has been rejected."""
        subject = "❌ Your Sheba Sound Artist Application Update"
        context = {
            "user": user,
            "artist_profile": artist_profile,
            "reason": reason,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/artist_rejected.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Subscription Activated                                            #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_subscription_activated_email(cls, user, subscription) -> bool:
        """Confirm to a user that their premium subscription is now active."""
        subject = "🌟 Welcome to Sheba Sound Premium!"
        context = {
            "user": user,
            "subscription": subscription,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/subscription_activated.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Renewal Payment Link                                              #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_renewal_payment_email(cls, user, checkout_url: str, subscription=None) -> bool:
        """Send a payment link for subscription auto-renewal."""
        subject = "💳 Complete Your Sheba Sound Premium Renewal"
        context = {
            "user": user,
            "checkout_url": checkout_url,
            "subscription": subscription,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/renewal_payment.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  New Release — Notify Followers (Listeners)                        #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_new_release_email(cls, follower_user, song, artist_profile) -> bool:
        """Notify a listener that an artist they follow has released a new song."""
        subject = f"🎶 New Music from {artist_profile.stage_name}!"
        context = {
            "user": follower_user,
            "song": song,
            "artist_profile": artist_profile,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/new_release.html",
            context=context,
            recipient=follower_user.email,
        )

    @classmethod
    def notify_followers_of_new_release(cls, song, artist_profile) -> int:
        """Send new-release emails to ALL followers of the given artist.

        Returns the number of emails successfully sent.
        """
        from music.models import ArtistFollow

        followers = (
            ArtistFollow.objects
            .filter(artist=artist_profile)
            .select_related("user")
        )
        sent = 0
        for follow in followers:
            if follow.user.email:
                ok = cls.send_new_release_email(follow.user, song, artist_profile)
                if ok:
                    sent += 1
        logger.info(
            "New-release notification: song=%r artist=%s sent=%d",
            song.title, artist_profile.stage_name, sent,
        )
        return sent

    # ---------------------------------------------------------------- #
    #  Password Changed Confirmation                                     #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_password_changed_email(cls, user) -> bool:
        """Confirm to a user that their password was successfully changed."""
        subject = "🔒 Your Sheba Sound Password Was Changed"
        context = {
            "user": user,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/password_changed.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  New Follower — Notify Artist                                      #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_new_follower_email(cls, artist_user, follower_user) -> bool:
        """Notify an artist that someone new is following them."""
        subject = f"👤 {follower_user.first_name or follower_user.username} Started Following You!"
        context = {
            "user": artist_user,
            "follower": follower_user,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/new_follower.html",
            context=context,
            recipient=artist_user.email,
        )

    # ---------------------------------------------------------------- #
    #  Payment Failed                                                    #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_payment_failed_email(cls, user, subscription) -> bool:
        """Notify a user that their payment did not go through."""
        subject = "⚠️ Your Sheba Sound Payment Failed"
        context = {
            "user": user,
            "subscription": subscription,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/payment_failed.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Subscription Expired                                              #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_subscription_expired_email(cls, user, subscription) -> bool:
        """Notify a user that their premium subscription has expired."""
        subject = "😢 Your Sheba Sound Premium Has Expired"
        context = {
            "user": user,
            "subscription": subscription,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/subscription_expired.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Account Suspended                                                 #
    # ---------------------------------------------------------------- #

    @classmethod
    def send_account_suspended_email(cls, user, reason: str = "") -> bool:
        """Notify a user that their account has been suspended."""
        subject = "🚫 Your Sheba Sound Account Has Been Suspended"
        context = {
            "user": user,
            "reason": reason,
            "frontend_url": _frontend_url(),
            "year": __import__("datetime").date.today().year,
        }
        return cls._send(
            subject=subject,
            template="emails/account_suspended.html",
            context=context,
            recipient=user.email,
        )

    # ---------------------------------------------------------------- #
    #  Internal send helper                                              #
    # ---------------------------------------------------------------- #

    @classmethod
    def _send(
        cls,
        subject: str,
        template: str,
        context: dict,
        recipient: str,
    ) -> bool:
        """Render *template* to HTML, derive a plain-text fallback, and
        send via Django's ``send_mail``.

        Returns True on success, False otherwise (never raises).
        """
        if not recipient:
            logger.warning("Email skipped (no recipient): subject=%r", subject)
            return False

        try:
            html_body = render_to_string(template, context)
            plain_body = strip_tags(html_body)

            send_mail(
                subject=subject.encode("ascii", "replace").decode("ascii") if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend" else subject,
                message=plain_body.encode("ascii", "replace").decode("ascii") if settings.EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend" else plain_body,
                from_email=_from_email(),
                recipient_list=[recipient],
                html_message=html_body,
                fail_silently=True,
            )
            logger.info("Email sent: subject=%r to=%s", subject, recipient)
            return True
        except Exception:
            logger.exception("Failed to send email: subject=%r to=%s", subject, recipient)
            return False

