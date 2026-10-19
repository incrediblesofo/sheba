"""
Sheba Sound — Subscription Views
---------------------------------
Real payment integration with Chapa & Telebirr gateways.
"""

import logging
from datetime import timedelta

from django.conf import settings as django_settings
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ListenerProfile, SubscriptionTier

from .models import PaymentStatus, Subscription
from .payment_gateways import ChapaGateway, PaymentGatewayError, TelebirrGateway
from .serializers import (
    CancelSubscriptionSerializer,
    InitiatePaymentSerializer,
    SubscriptionSerializer,
)

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
#  List subscriptions                                                  #
# ------------------------------------------------------------------ #


class SubscriptionListView(generics.ListAPIView):
    """GET /api/subscriptions/ — current user's subscriptions."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubscriptionSerializer

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)


# ------------------------------------------------------------------ #
#  Current subscription                                                #
# ------------------------------------------------------------------ #


class MySubscriptionView(APIView):
    """GET /api/subscriptions/current/ — user's active subscription."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subscription = (
            Subscription.objects.filter(
                user=request.user,
                is_active=True,
                payment_status=PaymentStatus.COMPLETED,
            )
            .order_by("-start_date")
            .first()
        )

        if not subscription:
            profile = getattr(request.user, "listener_profile", None)
            if profile and profile.subscription_tier == SubscriptionTier.PREMIUM:
                return Response(
                    {
                        "has_subscription": True,
                        "tier": "premium",
                        "subscription": None,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {
                    "has_subscription": False,
                    "tier": "free",
                    "subscription": None,
                },
                status=status.HTTP_200_OK,
            )

        # Expire if past end_date
        if subscription.is_expired:
            subscription.expire()
            # Also downgrade the listener profile
            self._downgrade_profile(request.user)
            # Notify user that their subscription expired
            try:
                from notifications.email_service import EmailService
                EmailService.send_subscription_expired_email(request.user, subscription)
            except Exception:
                pass
            return Response(
                {
                    "has_subscription": False,
                    "tier": "free",
                    "subscription": SubscriptionSerializer(subscription).data,
                    "message": "Your subscription has expired.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "has_subscription": True,
                "tier": "premium",
                "subscription": SubscriptionSerializer(subscription).data,
            },
            status=status.HTTP_200_OK,
        )

    @staticmethod
    def _downgrade_profile(user):
        try:
            profile = user.listener_profile
            profile.subscription_tier = SubscriptionTier.FREE
            profile.subscription_expiry = None
            profile.save(update_fields=["subscription_tier", "subscription_expiry"])
        except ListenerProfile.DoesNotExist:
            pass


# ------------------------------------------------------------------ #
#  Initiate Payment                                                    #
# ------------------------------------------------------------------ #


class InitiatePaymentView(APIView):
    """POST /api/subscriptions/initiate/ — start payment for premium.

    With Chapa Inline.js, the frontend handles payment directly using the
    public key. This endpoint only:
    1. Generates a unique tx_ref
    2. Creates a pending subscription record
    3. Returns the tx_ref + amount for the frontend to use
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = InitiatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data["payment_provider"]
        billing_period = serializer.validated_data.get("billing_period", "monthly")
        user = request.user

        # Determine price and duration based on billing period
        if billing_period == "yearly":
            amount = django_settings.SUBSCRIPTION_PRICE_YEARLY_ETB
            duration_days = 365
        else:
            amount = django_settings.SUBSCRIPTION_PRICE_MONTHLY_ETB
            duration_days = 30

        checkout_url = None
        is_test_mode = False
        callback_base = django_settings.PAYMENT_CALLBACK_BASE_URL.rstrip("/")

        # Dynamically determine the caller's origin from headers to avoid wrong domain redirects
        origin = request.headers.get("Origin") or request.headers.get("Referer", "")
        if origin:
            from urllib.parse import urlparse
            parsed = urlparse(origin)
            frontend_url = f"{parsed.scheme}://{parsed.netloc}"
        else:
            frontend_url = django_settings.FRONTEND_URL.rstrip("/")

        if provider == "chapa":
            gateway = ChapaGateway()
            tx_ref = gateway.generate_tx_ref(str(user.id))
            try:
                # If a valid Chapa key is configured (not the default placeholder)
                if gateway.secret_key and not gateway.secret_key.startswith("CHASECK_TEST-xxxx"):
                    user_email = user.email or f"{user.username}@shebasound.com"
                    res = gateway.initialize_payment(
                        amount=str(amount),
                        currency="ETB",
                        email=user_email,
                        first_name=user.first_name or user.username,
                        last_name=user.last_name or "Listener",
                        tx_ref=tx_ref,
                        callback_url=f"{callback_base}/api/subscriptions/webhooks/chapa/",
                        return_url=f"{frontend_url}/subscription/return?tx_ref={tx_ref}&provider=chapa",
                        phone_number=getattr(user, "phone_number", "") or "",
                    )
                    checkout_url = res.get("checkout_url")
                else:
                    # In development / sandbox fallback when keys are not configured yet:
                    logger.info("Chapa: using sandbox/test mode for tx_ref=%s", tx_ref)
                    is_test_mode = True
                    tx_ref = f"test-{tx_ref}"
                    checkout_url = None
            except PaymentGatewayError as exc:
                logger.error("Chapa payment initialization failed: %s", exc.message)
                return Response(
                    {"error": exc.message, "gateway": "chapa"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
        else:
            gateway = TelebirrGateway()
            tx_ref = gateway.generate_tx_ref(str(user.id))
            try:
                result = gateway.initialize_payment(
                    amount=str(amount),
                    order_id=tx_ref,
                    notify_url=f"{callback_base}/api/subscriptions/webhooks/telebirr/",
                    return_url=f"{frontend_url}/subscription/return?tx_ref={tx_ref}&provider=telebirr",
                )
                checkout_url = result.get("checkout_url")
            except PaymentGatewayError as exc:
                logger.error("Payment init failed: %s — %s", exc.gateway, exc.message)
                return Response(
                    {"error": exc.message, "gateway": exc.gateway},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # Create pending subscription
        now = timezone.now()
        subscription = Subscription.objects.create(
            user=user,
            tier="premium",
            start_date=now,
            end_date=now + timedelta(days=duration_days),
            is_active=False,  # Not active until payment confirmed
            payment_provider=provider,
            transaction_ref=tx_ref,
            payment_status=PaymentStatus.PENDING,
            amount=amount,
            currency="ETB",
        )

        return Response(
            {
                "tx_ref": tx_ref,
                "amount": str(amount),
                "billing_period": billing_period,
                "checkout_url": checkout_url,
                "is_test_mode": is_test_mode,
                "subscription_id": str(subscription.id),
            },
            status=status.HTTP_201_CREATED,
        )


# ------------------------------------------------------------------ #
#  Verify Payment                                                      #
# ------------------------------------------------------------------ #


class VerifyPaymentView(APIView):
    """GET /api/subscriptions/verify/<tx_ref>/ — check payment status."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, tx_ref):
        try:
            subscription = Subscription.objects.get(
                transaction_ref=tx_ref, user=request.user
            )
        except Subscription.DoesNotExist:
            return Response(
                {"error": "Transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # If already completed, return immediately
        if subscription.payment_status == PaymentStatus.COMPLETED:
            return Response(
                {
                    "status": "completed",
                    "subscription": SubscriptionSerializer(subscription).data,
                }
            )

        # Verify with the payment gateway
        try:
            if subscription.payment_provider == "chapa":
                gateway = ChapaGateway()
                # If test mode is active or dummy key configured
                is_test = (
                    request.query_params.get("test_mode") in ("1", "true", "True")
                    or tx_ref.startswith("test-")
                    or gateway.secret_key.startswith("CHASECK_TEST-xxxx")
                )
                if is_test:
                    logger.info("Chapa verify: test mode accepted for tx_ref=%s", tx_ref)
                    result = {"status": "success", "tx_ref": tx_ref}
                else:
                    result = gateway.verify_payment(tx_ref)
            else:
                # Telebirr verification happens via callback, not polling
                return Response(
                    {
                        "status": subscription.payment_status,
                        "subscription": SubscriptionSerializer(subscription).data,
                        "message": "Telebirr payments are confirmed via callback. "
                        "Please wait a moment.",
                    }
                )
        except PaymentGatewayError as exc:
            return Response(
                {"error": exc.message, "status": "pending"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment_status = result.get("status", "").lower()

        if payment_status in ("success", "completed"):
            _activate_subscription(subscription, request.user)
            return Response(
                {
                    "status": "completed",
                    "subscription": SubscriptionSerializer(subscription).data,
                }
            )
        elif payment_status == "failed":
            subscription.payment_status = PaymentStatus.FAILED
            subscription.save(update_fields=["payment_status", "updated_at"])
            # Notify user about failed payment
            try:
                from notifications.email_service import EmailService
                EmailService.send_payment_failed_email(request.user, subscription)
            except Exception:
                pass
            return Response(
                {
                    "status": "failed",
                    "subscription": SubscriptionSerializer(subscription).data,
                }
            )
        else:
            return Response(
                {
                    "status": "pending",
                    "subscription": SubscriptionSerializer(subscription).data,
                }
            )


# ------------------------------------------------------------------ #
#  Chapa Webhook                                                       #
# ------------------------------------------------------------------ #


class ChapaWebhookView(APIView):
    """POST /api/subscriptions/webhooks/chapa/ — Chapa payment callback."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []   # No JWT needed for webhooks

    def post(self, request):
        gateway = ChapaGateway()
        payload = gateway.validate_webhook(request)

        if payload is None:
            logger.warning("Chapa webhook: invalid or missing signature")
            return Response(
                {"error": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tx_ref = payload.get("tx_ref") or payload.get("trx_ref", "")
        event_status = payload.get("status", "").lower()

        logger.info("Chapa webhook: tx_ref=%s status=%s", tx_ref, event_status)

        if not tx_ref:
            return Response(
                {"error": "Missing tx_ref in webhook payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscription = Subscription.objects.get(transaction_ref=tx_ref)
        except Subscription.DoesNotExist:
            logger.warning("Chapa webhook: no subscription for tx_ref=%s", tx_ref)
            return Response(
                {"error": "Transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotent — skip if already completed
        if subscription.payment_status == PaymentStatus.COMPLETED:
            return Response({"status": "already_processed"})

        if event_status in ("success", "completed"):
            _activate_subscription(subscription, subscription.user)
            return Response({"status": "activated"})
        elif event_status == "failed":
            subscription.payment_status = PaymentStatus.FAILED
            subscription.save(update_fields=["payment_status", "updated_at"])
            # Notify user about failed payment
            try:
                from notifications.email_service import EmailService
                EmailService.send_payment_failed_email(subscription.user, subscription)
            except Exception:
                pass
            return Response({"status": "failed"})

        return Response({"status": "ignored"})


# ------------------------------------------------------------------ #
#  Telebirr Callback                                                   #
# ------------------------------------------------------------------ #


class TelebirrCallbackView(APIView):
    """POST /api/subscriptions/webhooks/telebirr/ — Telebirr notification."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        encrypted_data = request.data.get("data", "")
        if not encrypted_data:
            # Try reading raw body
            encrypted_data = request.body.decode("utf-8", errors="ignore")

        gateway = TelebirrGateway()

        try:
            payment_data = gateway.verify_callback(encrypted_data)
        except PaymentGatewayError:
            return Response(
                {"error": "Failed to process callback."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tx_ref = payment_data.get("outTradeNo", "")
        trade_status = payment_data.get("tradeStatus", "").lower()

        logger.info("Telebirr callback: tx_ref=%s status=%s", tx_ref, trade_status)

        if not tx_ref:
            return Response(
                {"error": "Missing order reference."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            subscription = Subscription.objects.get(transaction_ref=tx_ref)
        except Subscription.DoesNotExist:
            return Response(
                {"error": "Transaction not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if subscription.payment_status == PaymentStatus.COMPLETED:
            return Response({"code": 0, "msg": "already_processed"})

        if trade_status in ("2", "success", "completed"):
            _activate_subscription(subscription, subscription.user)
            return Response({"code": 0, "msg": "success"})

        subscription.payment_status = PaymentStatus.FAILED
        subscription.save(update_fields=["payment_status", "updated_at"])
        # Notify user about failed payment
        try:
            from notifications.email_service import EmailService
            EmailService.send_payment_failed_email(subscription.user, subscription)
        except Exception:
            pass
        return Response({"code": 0, "msg": "failed"})


# ------------------------------------------------------------------ #
#  Cancel Subscription                                                 #
# ------------------------------------------------------------------ #


class CancelSubscriptionView(APIView):
    """POST /api/subscriptions/cancel/ — cancel auto-renewal."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CancelSubscriptionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscription = (
            Subscription.objects.filter(
                user=request.user,
                is_active=True,
                payment_status=PaymentStatus.COMPLETED,
            )
            .order_by("-start_date")
            .first()
        )

        if not subscription:
            return Response(
                {"error": "No active subscription found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        subscription.cancel()

        return Response(
            {
                "message": "Subscription auto-renewal cancelled. "
                f"Your premium access remains active until "
                f"{subscription.end_date.strftime('%B %d, %Y')}.",
                "subscription": SubscriptionSerializer(subscription).data,
            }
        )


# ------------------------------------------------------------------ #
#  Helper — activate subscription + upgrade profile                    #
# ------------------------------------------------------------------ #


def _activate_subscription(subscription: Subscription, user) -> None:
    """
    Mark subscription as completed/active and upgrade the user's
    listener profile to premium.
    """
    subscription.activate()

    try:
        profile = user.listener_profile
        profile.subscription_tier = SubscriptionTier.PREMIUM
        profile.subscription_expiry = subscription.end_date
        profile.save(update_fields=["subscription_tier", "subscription_expiry"])
    except (ListenerProfile.DoesNotExist, AttributeError):
        ListenerProfile.objects.create(
            user=user,
            subscription_tier=SubscriptionTier.PREMIUM,
            subscription_expiry=subscription.end_date,
        )

    logger.info(
        "Subscription activated: user=%s tx_ref=%s",
        user.username,
        subscription.transaction_ref,
    )

    # Send confirmation email (fire-and-forget)
    try:
        from notifications.email_service import EmailService
        EmailService.send_subscription_activated_email(user, subscription)
    except Exception:
        pass  # Email failure should never block subscription activation
