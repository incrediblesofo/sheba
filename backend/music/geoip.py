"""
Sheba Sound — Lightweight IP Geolocation
-----------------------------------------
Resolves an IP address to a country code (ISO 3166-1 alpha-2).

Strategy:
  1. Use Django's built-in GeoIP2 if configured (MaxMind GeoLite2 DB).
  2. Fall back to a cached HTTP call to ip-api.com (free, 45 req/min).
  3. On any failure, return empty string (never block the request).

The result is cached in Django's default cache for 24 hours to minimise
external requests and respect rate limits.
"""

import logging

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cache TTL: 24 hours per IP
_CACHE_TTL = 86400


def get_client_ip(request) -> str:
    """Extract the real client IP from the request, respecting proxies."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _is_private_ip(ip: str) -> bool:
    """Check if an IP is in a private/loopback range."""
    return (
        ip.startswith("127.")
        or ip.startswith("10.")
        or ip.startswith("192.168.")
        or ip.startswith("172.16.")
        or ip.startswith("172.17.")
        or ip.startswith("172.18.")
        or ip.startswith("172.19.")
        or ip.startswith("172.2")
        or ip.startswith("172.3")
        or ip == "::1"
        or ip.startswith("fc")
        or ip.startswith("fd")
    )


def resolve_country(ip: str) -> str:
    """
    Resolve an IP address to a 2-letter country code.
    Returns '' on failure or for private/local IPs.
    """
    if not ip or _is_private_ip(ip):
        return ""

    cache_key = f"geoip:{ip}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    country = ""

    # Strategy 1: Django GeoIP2 (requires GEOIP_PATH in settings)
    try:
        from django.contrib.gis.geoip2 import GeoIP2

        g = GeoIP2()
        data = g.country(ip)
        country = data.get("country_code", "")
    except Exception:
        pass

    # Strategy 2: Free HTTP API fallback
    if not country:
        try:
            import urllib.request
            import json

            url = f"http://ip-api.com/json/{ip}?fields=countryCode"
            req = urllib.request.Request(url, headers={"User-Agent": "ShebaSoundServer/1.0"})
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode())
                country = data.get("countryCode", "")
        except Exception as exc:
            logger.debug("GeoIP HTTP fallback failed for %s: %s", ip, exc)

    cache.set(cache_key, country, _CACHE_TTL)
    return country


# Country code → display name + flag mapping (most common)
COUNTRY_DISPLAY = {
    "ET": ("Ethiopia", "🇪🇹"),
    "US": ("United States", "🇺🇸"),
    "KE": ("Kenya", "🇰🇪"),
    "GB": ("United Kingdom", "🇬🇧"),
    "DE": ("Germany", "🇩🇪"),
    "CA": ("Canada", "🇨🇦"),
    "NG": ("Nigeria", "🇳🇬"),
    "ZA": ("South Africa", "🇿🇦"),
    "AE": ("UAE", "🇦🇪"),
    "AU": ("Australia", "🇦🇺"),
    "FR": ("France", "🇫🇷"),
    "IT": ("Italy", "🇮🇹"),
    "SE": ("Sweden", "🇸🇪"),
    "NL": ("Netherlands", "🇳🇱"),
    "SA": ("Saudi Arabia", "🇸🇦"),
    "IN": ("India", "🇮🇳"),
    "DJ": ("Djibouti", "🇩🇯"),
    "ER": ("Eritrea", "🇪🇷"),
    "SD": ("Sudan", "🇸🇩"),
    "SS": ("South Sudan", "🇸🇸"),
    "SO": ("Somalia", "🇸🇴"),
    "IL": ("Israel", "🇮🇱"),
    "NO": ("Norway", "🇳🇴"),
}


def country_display(code: str) -> dict:
    """Return {country, flag} for a 2-letter country code."""
    name, flag = COUNTRY_DISPLAY.get(code, (code, "🌍"))
    return {"country": name, "flag": flag, "code": code}
