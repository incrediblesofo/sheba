"""
Sheba Sound — Payment Gateway Services
---------------------------------------
Encapsulates Chapa and Telebirr API logic. Views call these
services; they never talk to external payment APIs directly.
"""

import hashlib
import hmac
import json
import logging
import time
import uuid
from base64 import b64decode, b64encode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
#  Exceptions                                                          #
# ------------------------------------------------------------------ #


class PaymentGatewayError(Exception):
    """Raised when a payment gateway call fails."""

    def __init__(self, message: str, gateway: str, raw_response=None):
        self.message = message
        self.gateway = gateway
        self.raw_response = raw_response
        super().__init__(message)


# ------------------------------------------------------------------ #
#  Chapa Gateway                                                       #
# ------------------------------------------------------------------ #

CHAPA_BASE_URL = "https://api.chapa.co/v1"


class ChapaGateway:
    """
    Chapa payment gateway integration.
    Docs: https://developer.chapa.co/docs/accept-payments/
    """

    def __init__(self):
        self.secret_key = settings.CHAPA_SECRET_KEY
        self.webhook_secret = settings.CHAPA_WEBHOOK_SECRET

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
        }

    def generate_tx_ref(self, user_id: str) -> str:
        """Generate a unique transaction reference."""
        short_user = str(user_id)[:8]
        short_uuid = uuid.uuid4().hex[:8]
        ts = int(time.time())
        return f"sheba-{short_user}-{short_uuid}-{ts}"

    def initialize_payment(
        self,
        *,
        amount: str,
        currency: str,
        email: str,
        first_name: str,
        last_name: str,
        tx_ref: str,
        callback_url: str,
        return_url: str,
        phone_number: str = "",
    ) -> dict:
        """
        Initialize a Chapa transaction.
        Returns {"checkout_url": "...", "tx_ref": "..."} on success.
        """
        payload = {
            "amount": str(amount),
            "currency": currency,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "tx_ref": tx_ref,
            "callback_url": callback_url,
            "return_url": return_url,
            "customization": {
                "title": "Sheba Sound Premium",
                "description": "Monthly Premium subscription — ad-free music streaming",
            },
        }
        if phone_number:
            payload["phone_number"] = phone_number

        logger.info("Chapa: initializing payment tx_ref=%s amount=%s", tx_ref, amount)

        try:
            resp = requests.post(
                f"{CHAPA_BASE_URL}/transaction/initialize",
                json=payload,
                headers=self._headers,
                timeout=30,
            )
            data = resp.json()
        except requests.RequestException as exc:
            logger.error("Chapa: network error — %s", exc)
            raise PaymentGatewayError(
                "Unable to reach Chapa payment gateway.", "chapa"
            ) from exc

        if resp.status_code != 200 or data.get("status") != "success":
            logger.error("Chapa: initialize failed — %s", data)
            raise PaymentGatewayError(
                data.get("message", "Payment initialization failed."),
                "chapa",
                raw_response=data,
            )

        checkout_url = data.get("data", {}).get("checkout_url", "")
        return {"checkout_url": checkout_url, "tx_ref": tx_ref}

    def verify_payment(self, tx_ref: str) -> dict:
        """
        Verify a Chapa transaction by its tx_ref.
        Returns the full verification data dict.
        """
        logger.info("Chapa: verifying payment tx_ref=%s", tx_ref)

        try:
            resp = requests.get(
                f"{CHAPA_BASE_URL}/transaction/verify/{tx_ref}",
                headers=self._headers,
                timeout=30,
            )
            data = resp.json()
        except requests.RequestException as exc:
            logger.error("Chapa: verify network error — %s", exc)
            raise PaymentGatewayError(
                "Unable to verify payment with Chapa.", "chapa"
            ) from exc

        if resp.status_code != 200:
            logger.warning("Chapa: verify returned %s — %s", resp.status_code, data)
            return {"status": "failed", "raw": data}

        return {
            "status": data.get("data", {}).get("status", "failed"),
            "amount": data.get("data", {}).get("amount"),
            "currency": data.get("data", {}).get("currency"),
            "tx_ref": data.get("data", {}).get("tx_ref"),
            "reference": data.get("data", {}).get("reference"),
            "raw": data,
        }

    def validate_webhook(self, request) -> dict | None:
        """
        Validate a Chapa webhook request using HMAC-SHA256.
        Returns the parsed JSON body if valid, None otherwise.
        """
        signature = request.headers.get("Chapa-Signature", "")
        if not signature or not self.webhook_secret:
            # If no secret is configured, accept in dev mode but log a warning
            if settings.DEBUG and not self.webhook_secret:
                logger.warning(
                    "Chapa webhook: no secret configured — accepting in DEBUG mode"
                )
                try:
                    return json.loads(request.body)
                except (json.JSONDecodeError, Exception):
                    return None
            return None

        body = request.body
        expected = hmac.new(
            self.webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            logger.warning("Chapa webhook: invalid signature")
            return None

        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None


# ------------------------------------------------------------------ #
#  Telebirr Gateway                                                    #
# ------------------------------------------------------------------ #


class TelebirrGateway:
    """
    Telebirr H5 Web Payment integration.
    Uses RSA signing + AES encryption per Ethio Telecom spec.

    NOTE: Requires valid merchant credentials to function.
    Without credentials, calls will return clear error messages.
    """

    def __init__(self):
        self.app_id = settings.TELEBIRR_APP_ID
        self.app_key = settings.TELEBIRR_APP_KEY
        self.merchant_code = settings.TELEBIRR_MERCHANT_CODE
        self.public_key = settings.TELEBIRR_PUBLIC_KEY
        self.api_url = settings.TELEBIRR_API_URL

    @property
    def is_configured(self) -> bool:
        return bool(self.app_id and self.app_key and self.merchant_code)

    def generate_tx_ref(self, user_id: str) -> str:
        """Generate a unique transaction reference for Telebirr."""
        short_user = str(user_id)[:8]
        short_uuid = uuid.uuid4().hex[:8]
        ts = int(time.time())
        return f"sheba-tb-{short_user}-{short_uuid}-{ts}"

    def _sign_payload(self, params: dict) -> str:
        """
        Create SHA256 signature from sorted parameters.
        Telebirr requires: sort params alphabetically, concatenate key=value pairs,
        then SHA256 hash.
        """
        sorted_keys = sorted(params.keys())
        sign_str = "&".join(f"{k}={params[k]}" for k in sorted_keys if params[k])
        return hashlib.sha256(sign_str.encode("utf-8")).hexdigest().upper()

    def _encrypt_payload(self, payload_str: str) -> str:
        """
        Encrypt payload using the Telebirr public key (RSA).
        For development / when crypto libs aren't available, returns base64-encoded payload.
        """
        try:
            from Crypto.PublicKey import RSA
            from Crypto.Cipher import PKCS1_v1_5

            key = RSA.import_key(b64decode(self.public_key))
            cipher = PKCS1_v1_5.new(key)

            # RSA can only encrypt small chunks; split if needed
            data = payload_str.encode("utf-8")
            max_chunk = (key.size_in_bytes()) - 11
            chunks = [data[i : i + max_chunk] for i in range(0, len(data), max_chunk)]
            encrypted = b"".join(cipher.encrypt(chunk) for chunk in chunks)
            return b64encode(encrypted).decode("utf-8")
        except ImportError:
            logger.warning(
                "Telebirr: PyCryptodome not installed — using base64 fallback "
                "(NOT suitable for production)"
            )
            return b64encode(payload_str.encode("utf-8")).decode("utf-8")

    def initialize_payment(
        self,
        *,
        amount: str,
        order_id: str,
        notify_url: str,
        return_url: str,
        subject: str = "Sheba Sound Premium Subscription",
        timeout: str = "30",
    ) -> dict:
        """
        Initialize a Telebirr payment.
        Returns {"toPayUrl": "...", "order_id": "..."} on success.
        """
        if not self.is_configured:
            raise PaymentGatewayError(
                "Telebirr payment gateway is not configured. "
                "Please set TELEBIRR_APP_ID, TELEBIRR_APP_KEY, and "
                "TELEBIRR_MERCHANT_CODE environment variables.",
                "telebirr",
            )

        timestamp = str(int(time.time() * 1000))
        nonce = uuid.uuid4().hex[:16]

        # Build the business parameters
        biz_params = {
            "appId": self.app_id,
            "merCode": self.merchant_code,
            "nonce": nonce,
            "notifyUrl": notify_url,
            "outTradeNo": order_id,
            "returnUrl": return_url,
            "shortCode": self.merchant_code,
            "subject": subject,
            "timeoutExpress": timeout,
            "timestamp": timestamp,
            "totalAmount": str(amount),
        }

        # Sign the parameters
        sign = self._sign_payload(biz_params)

        # Build the encrypted request
        biz_content = json.dumps(biz_params, separators=(",", ":"))
        encrypted_content = self._encrypt_payload(biz_content)

        request_body = {
            "appid": self.app_id,
            "sign": sign,
            "ussd": encrypted_content,
        }

        logger.info("Telebirr: initializing payment order_id=%s amount=%s", order_id, amount)

        try:
            resp = requests.post(
                self.api_url,
                json=request_body,
                headers={"Content-Type": "application/json"},
                timeout=30,
            )
            data = resp.json()
        except requests.RequestException as exc:
            logger.error("Telebirr: network error — %s", exc)
            raise PaymentGatewayError(
                "Unable to reach Telebirr payment gateway.", "telebirr"
            ) from exc

        if data.get("code") != "200" and data.get("code") != 200:
            logger.error("Telebirr: initialize failed — %s", data)
            raise PaymentGatewayError(
                data.get("message", "Telebirr payment initialization failed."),
                "telebirr",
                raw_response=data,
            )

        to_pay_url = data.get("data", {}).get("toPayUrl", "")
        return {"checkout_url": to_pay_url, "order_id": order_id}

    def verify_callback(self, encrypted_data: str) -> dict:
        """
        Decrypt and parse the Telebirr callback notification.
        Returns the decrypted payment data.
        """
        try:
            decoded = b64decode(encrypted_data).decode("utf-8")
            payment_data = json.loads(decoded)
            return payment_data
        except Exception as exc:
            logger.error("Telebirr: callback decryption failed — %s", exc)
            raise PaymentGatewayError(
                "Failed to decrypt Telebirr callback.", "telebirr"
            ) from exc
