"""
Sheba Sound — Auto-Renewal Management Command
-----------------------------------------------
Run daily via cron:  0 0 * * * python manage.py renew_subscriptions

Finds expired subscriptions with auto_renew=True, creates a new
pending subscription, and initiates payment via the user's preferred
gateway. The user receives a notification with a payment link.

Usage:
    python manage.py renew_subscriptions
    python manage.py renew_subscriptions --dry-run
"""

import logging
from datetime import timedelta

from django.conf import settings as django_settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from subscriptions.models import PaymentStatus, Subscription
from subscriptions.payment_gateways import ChapaGateway, PaymentGatewayError, TelebirrGateway

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Renew expired subscriptions that have auto_renew enabled."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List subscriptions due for renewal without processing.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        now = timezone.now()

        # Find subscriptions that:
        # 1. Have ended or will end today
        # 2. Have auto_renew enabled
        # 3. Were successfully paid
        # 4. Haven't been cancelled
        due_subscriptions = Subscription.objects.filter(
            end_date__lte=now,
            auto_renew=True,
            is_active=True,
            payment_status=PaymentStatus.COMPLETED,
            cancellation_date__isnull=True,
        ).select_related("user")

        count = due_subscriptions.count()
        self.stdout.write(f"Found {count} subscription(s) due for renewal.")

        if dry_run:
            for sub in due_subscriptions:
                self.stdout.write(
                    f"  - {sub.user.username} ({sub.user.email}) "
                    f"| provider={sub.payment_provider} "
                    f"| expired={sub.end_date.isoformat()}"
                )
            return

        renewed = 0
        failed = 0

        for sub in due_subscriptions:
            try:
                self._renew_subscription(sub, now)
                renewed += 1
            except Exception as exc:
                failed += 1
                logger.error(
                    "Failed to renew subscription for %s: %s",
                    sub.user.username,
                    exc,
                )
                self.stderr.write(
                    self.style.ERROR(
                        f"  ✗ {sub.user.username} — {exc}"
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Renewal complete: {renewed} renewed, {failed} failed."
            )
        )

    def _renew_subscription(self, old_sub: Subscription, now):
        """Create a new pending subscription and initiate payment."""
        user = old_sub.user
        provider = old_sub.payment_provider
        amount = str(django_settings.SUBSCRIPTION_PRICE_MONTHLY_ETB)
        callback_base = django_settings.PAYMENT_CALLBACK_BASE_URL
        frontend_url = django_settings.FRONTEND_URL

        # Initialize payment with the user's preferred gateway
        try:
            if provider == "chapa":
                gateway = ChapaGateway()
                tx_ref = gateway.generate_tx_ref(str(user.id))
                result = gateway.initialize_payment(
                    amount=amount,
                    currency="ETB",
                    email=user.email,
                    first_name=user.first_name or user.username,
                    last_name=user.last_name or "",
                    tx_ref=tx_ref,
                    callback_url=f"{callback_base}/api/subscriptions/webhooks/chapa/",
                    return_url=f"{frontend_url}/subscription/return?tx_ref={tx_ref}&provider=chapa",
                )
            elif provider == "telebirr":
                gateway = TelebirrGateway()
                tx_ref = gateway.generate_tx_ref(str(user.id))
                result = gateway.initialize_payment(
                    amount=amount,
                    order_id=tx_ref,
                    notify_url=f"{callback_base}/api/subscriptions/webhooks/telebirr/",
                    return_url=f"{frontend_url}/subscription/return?tx_ref={tx_ref}&provider=telebirr",
                )
            else:
                # Manual subscriptions — just create a new subscription
                tx_ref = f"manual-renewal-{user.id}-{now.timestamp():.0f}"
                result = {"checkout_url": None}

        except PaymentGatewayError as exc:
            logger.warning(
                "Auto-renewal payment init failed for %s: %s",
                user.username,
                exc.message,
            )
            # Mark old subscription as expired but don't crash
            old_sub.expire()
            raise

        # Mark the old subscription as no longer active
        old_sub.is_active = False
        old_sub.save(update_fields=["is_active", "updated_at"])

        # Create the new pending subscription
        new_sub = Subscription.objects.create(
            user=user,
            tier="premium",
            start_date=now,
            end_date=now + timedelta(days=30),
            is_active=False,
            payment_provider=provider,
            transaction_ref=tx_ref,
            payment_status=PaymentStatus.PENDING,
            amount=django_settings.SUBSCRIPTION_PRICE_MONTHLY_ETB,
            currency="ETB",
            auto_renew=True,
            renewal_count=old_sub.renewal_count + 1,
        )

        checkout_url = result.get("checkout_url")
        self.stdout.write(
            self.style.WARNING(
                f"  → {user.username} ({user.email}): "
                f"renewal initiated, tx_ref={tx_ref}"
                f"{f', checkout_url={checkout_url}' if checkout_url else ''}"
            )
        )

        # Send email notification with payment link
        try:
            from notifications.email_service import EmailService
            EmailService.send_renewal_payment_email(
                user,
                checkout_url=checkout_url or "",
                subscription=new_sub,
            )
        except Exception:
            pass  # Email failure should not block renewal processing

        return new_sub
