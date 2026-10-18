"""
Sheba Sound — Send Subscription Renewal Reminders
---------------------------------------------------
Management command that queries active premium subscriptions expiring
within N days (default: 3) and sends reminder emails to each user.

Usage:
    python manage.py send_renewal_reminders           # send real emails
    python manage.py send_renewal_reminders --dry-run  # preview without sending
    python manage.py send_renewal_reminders --days 5   # custom window

Schedule this to run daily via cron or Celery Beat.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from subscriptions.models import PaymentStatus, Subscription


class Command(BaseCommand):
    help = "Send renewal reminder emails for subscriptions expiring soon."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=3,
            help="Send reminders for subscriptions expiring within this many days (default: 3).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview which users would be emailed without actually sending.",
        )

    def handle(self, *args, **options):
        days = options["days"]
        dry_run = options["dry_run"]
        now = timezone.now()
        window_end = now + timedelta(days=days)

        # Find active, completed-payment subscriptions expiring in the window
        expiring = (
            Subscription.objects.filter(
                is_active=True,
                payment_status=PaymentStatus.COMPLETED,
                end_date__gte=now,
                end_date__lte=window_end,
            )
            .select_related("user")
            .order_by("end_date")
        )

        count = expiring.count()
        self.stdout.write(
            self.style.NOTICE(
                f"Found {count} subscription(s) expiring within {days} day(s)."
            )
        )

        if count == 0:
            self.stdout.write(self.style.SUCCESS("Nothing to do."))
            return

        sent = 0
        failed = 0

        for sub in expiring:
            user = sub.user
            self.stdout.write(
                f"  → {user.email} — expires {sub.end_date.strftime('%Y-%m-%d %H:%M')} "
                f"({sub.days_remaining} day(s) left)"
            )

            if dry_run:
                continue

            # Import here to avoid circular imports at module level
            from notifications.email_service import EmailService

            ok = EmailService.send_subscription_renewal_reminder(user, sub)
            if ok:
                sent += 1
            else:
                failed += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"Dry run — {count} email(s) would be sent.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Done — {sent} sent, {failed} failed.")
            )
