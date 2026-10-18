"""
Sheba Sound — Subscriptions Admin
"""

from django.contrib import admin

from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "user", "tier", "payment_provider", "payment_status",
        "is_active", "auto_renew", "amount", "currency",
        "start_date", "end_date",
    )
    list_filter = ("tier", "is_active", "payment_provider", "payment_status", "auto_renew")
    search_fields = ("user__email", "user__username", "transaction_ref")
    readonly_fields = ("transaction_ref", "created_at", "updated_at")
