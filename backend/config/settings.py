"""
Sheba Sound — Django Settings
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

# Load .env file (if present) so credentials don't need manual export
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-sheba-sound-dev-key-change-in-production!",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() in ("true", "1", "yes")

ALLOWED_HOSTS = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

# ------------------------------------------------------------------ #
#  Installed Apps                                                      #
# ------------------------------------------------------------------ #

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    # Local apps
    "accounts",
    "music",
    "subscriptions",
    "admin_dashboard",
    "notifications",
]

# ------------------------------------------------------------------ #
#  Middleware                                                           #
# ------------------------------------------------------------------ #

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            BASE_DIR / "notifications" / "templates",
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ------------------------------------------------------------------ #
#  Database — PostgreSQL                                               #
# ------------------------------------------------------------------ #

DATABASES = {
    "default": dj_database_url.config(
        default=(
            f"postgresql://{os.environ.get('DB_USER', 'postgres')}"
            f":{os.environ.get('DB_PASSWORD', 'postgres')}"
            f"@{os.environ.get('DB_HOST', 'localhost')}"
            f":{os.environ.get('DB_PORT', '5432')}"
            f"/{os.environ.get('DB_NAME', 'sheba_sound_db')}"
        ),
        conn_max_age=600,
    )
}


# ------------------------------------------------------------------ #
#  Auth                                                                #
# ------------------------------------------------------------------ #

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailBackend",
    "accounts.backends.PhoneBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ------------------------------------------------------------------ #
#  Internationalization                                                #
# ------------------------------------------------------------------ #

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Addis_Ababa"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------ #
#  Static & Media                                                      #
# ------------------------------------------------------------------ #

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ------------------------------------------------------------------ #
#  Cloudinary (Cloud Storage + CDN)                                    #
# ------------------------------------------------------------------ #

CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME", "")
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")

# Auto-configure the Cloudinary SDK when credentials are present.
# When not configured, uploads fall back to local MEDIA_ROOT storage.
if CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET:
    import cloudinary as _cloudinary  # noqa: E402
    _cloudinary.config(
        cloud_name=CLOUDINARY_CLOUD_NAME,
        api_key=CLOUDINARY_API_KEY,
        api_secret=CLOUDINARY_API_SECRET,
        secure=True,
    )

# ------------------------------------------------------------------ #
#  Google OAuth                                                        #
# ------------------------------------------------------------------ #

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

# ------------------------------------------------------------------ #
#  Default primary key                                                 #
# ------------------------------------------------------------------ #

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ------------------------------------------------------------------ #
#  Django REST Framework                                               #
# ------------------------------------------------------------------ #

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
}

# ------------------------------------------------------------------ #
#  SimpleJWT                                                           #
# ------------------------------------------------------------------ #

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,   # Issue a new refresh token on every refresh
    "BLACKLIST_AFTER_ROTATION": True,  # Old token is immediately blacklisted
    "AUTH_HEADER_TYPES": ("Bearer",),
    "TOKEN_OBTAIN_SERIALIZER": "accounts.serializers.CustomTokenObtainPairSerializer",
}

# ------------------------------------------------------------------ #
#  CORS                                                                #
# ------------------------------------------------------------------ #

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

# Add extra frontend URL if configured in .env
_frontend_url = os.environ.get("FRONTEND_URL", "")
if _frontend_url and _frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(_frontend_url)

CORS_ALLOW_CREDENTIALS = True

# ------------------------------------------------------------------ #
#  Payment Gateways                                                    #
# ------------------------------------------------------------------ #

# Chapa (https://developer.chapa.co)
CHAPA_SECRET_KEY = os.environ.get("CHAPA_SECRET_KEY", "CHASECK_TEST-xxxxxxxxxxxxxxxx")
CHAPA_PUBLIC_KEY = os.environ.get("CHAPA_PUBLIC_KEY", "CHAPUBK_TEST-xxxxxxxxxxxxxxxx")
CHAPA_WEBHOOK_SECRET = os.environ.get("CHAPA_WEBHOOK_SECRET", "")

# Telebirr (Ethio Telecom H5 Web Payment)
TELEBIRR_APP_ID = os.environ.get("TELEBIRR_APP_ID", "")
TELEBIRR_APP_KEY = os.environ.get("TELEBIRR_APP_KEY", "")
TELEBIRR_MERCHANT_CODE = os.environ.get("TELEBIRR_MERCHANT_CODE", "")
TELEBIRR_PUBLIC_KEY = os.environ.get("TELEBIRR_PUBLIC_KEY", "")
TELEBIRR_API_URL = os.environ.get(
    "TELEBIRR_API_URL", "https://developmentapp.ethiotelecom.et/payment/v1/merchant/preOrder"
)

# Base URL for payment callbacks (your public-facing backend URL)
PAYMENT_CALLBACK_BASE_URL = os.environ.get(
    "PAYMENT_CALLBACK_BASE_URL", "http://localhost:8000"
)

# Frontend URL for return redirects after payment
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# Subscription pricing
from decimal import Decimal  # noqa: E402
SUBSCRIPTION_PRICE_MONTHLY_ETB = Decimal(os.environ.get("SUBSCRIPTION_PRICE_MONTHLY_ETB", "99.99"))
SUBSCRIPTION_PRICE_YEARLY_ETB = Decimal(os.environ.get("SUBSCRIPTION_PRICE_YEARLY_ETB", "1000.00"))

# ------------------------------------------------------------------ #
#  Email                                                               #
# ------------------------------------------------------------------ #

# In development, emails are printed to the console.
# In production, switch to SMTP by setting EMAIL_BACKEND in .env.
_email_backend = os.environ.get(
    "EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend"
)
EMAIL_BACKEND = _email_backend

# SMTP settings (used only when EMAIL_BACKEND is the SMTP backend)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "True").lower() in ("true", "1", "yes")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.environ.get(
    "DEFAULT_FROM_EMAIL", "Sheba Sound <noreply@shebasound.com>"
)

# Magic links for password reset and email verification (seconds; Django token TTL).
PASSWORD_RESET_TIMEOUT = int(
    os.environ.get("PASSWORD_RESET_TIMEOUT", str(60 * 60 * 24 * 3))
)

# ------------------------------------------------------------------ #
#  Production Security (only when DEBUG=False)                         #
# ------------------------------------------------------------------ #

if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
