"""
Sheba Sound — Subscription Serializers
"""

from rest_framework import serializers

from .models import Subscription


class SubscriptionSerializer(serializers.ModelSerializer):
    days_remaining = serializers.IntegerField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = Subscription
        fields = [
            "id", "user", "tier", "start_date", "end_date",
            "is_active", "payment_provider", "transaction_ref",
            "payment_status", "auto_renew", "amount", "currency",
            "renewal_count", "last_payment_date", "cancellation_date",
            "days_remaining", "is_expired",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "start_date", "end_date",
            "payment_status", "renewal_count", "last_payment_date",
            "cancellation_date", "days_remaining", "is_expired",
            "created_at", "updated_at",
        ]


class InitiatePaymentSerializer(serializers.Serializer):
    payment_provider = serializers.ChoiceField(choices=["chapa", "telebirr"])
    tier = serializers.ChoiceField(choices=["premium"], default="premium")
    billing_period = serializers.ChoiceField(
        choices=["monthly", "yearly"], default="monthly"
    )

    def validate_payment_provider(self, value):
        if value == "telebirr":
            from django.conf import settings
            if not settings.TELEBIRR_APP_ID:
                raise serializers.ValidationError(
                    "Telebirr payments are not yet available. Please use Chapa."
                )
        return value


class CancelSubscriptionSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(
        help_text="Must be true to confirm cancellation."
    )

    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError(
                "You must confirm the cancellation."
            )
        return value
