"""
Sheba Sound — Subscription Model
"""

from django.conf import settings
from django.db import models
from django.utils import timezone

from accounts.models import TimeStampedModel


class PaymentProvider(models.TextChoices):
    TELEBIRR = "telebirr", "Telebirr"
    CHAPA = "chapa", "Chapa"
    MANUAL = "manual", "Manual"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    REFUNDED = "refunded", "Refunded"


class SubscriptionTier(models.TextChoices):
    FREE = "free", "Free"
    PREMIUM = "premium", "Premium"


class Subscription(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.PREMIUM,
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    payment_provider = models.CharField(
        max_length=20,
        choices=PaymentProvider.choices,
        default=PaymentProvider.CHAPA,
    )
    transaction_ref = models.CharField(max_length=255, blank=True, null=True)

    # ── Payment tracking fields ──────────────────────────────────── #
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    auto_renew = models.BooleanField(default=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=149.00)
    currency = models.CharField(max_length=3, default="ETB")
    renewal_count = models.PositiveIntegerField(default=0)
    last_payment_date = models.DateTimeField(blank=True, null=True)
    cancellation_date = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["transaction_ref"], name="idx_sub_tx_ref"),
            models.Index(fields=["user", "is_active"], name="idx_sub_user_active"),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.tier} ({self.payment_provider})"

    # ── Helpers ──────────────────────────────────────────────────── #

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.end_date

    @property
    def can_renew(self) -> bool:
        return self.auto_renew and self.is_active and not self.cancellation_date

    @property
    def days_remaining(self) -> int:
        delta = self.end_date - timezone.now()
        return max(0, delta.days)

    def activate(self, save: bool = True) -> None:
        """Mark subscription as completed and active."""
        self.payment_status = PaymentStatus.COMPLETED
        self.is_active = True
        self.last_payment_date = timezone.now()
        if save:
            self.save(
                update_fields=[
                    "payment_status", "is_active", "last_payment_date", "updated_at",
                ]
            )

    def cancel(self, save: bool = True) -> None:
        """Cancel auto-renewal. Subscription stays active until end_date."""
        self.auto_renew = False
        self.cancellation_date = timezone.now()
        if save:
            self.save(update_fields=["auto_renew", "cancellation_date", "updated_at"])

    def expire(self, save: bool = True) -> None:
        """Mark subscription as inactive (called when end_date passes)."""
        self.is_active = False
        if save:
            self.save(update_fields=["is_active", "updated_at"])
