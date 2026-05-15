from __future__ import annotations

import ipaddress
import json
from urllib.parse import quote
from urllib.request import urlopen


PRIVATE_IPS = {"127.0.0.1", "::1", "localhost"}


def extract_client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "").strip()

    if not ip or ip in PRIVATE_IPS:
        return None
    try:
        parsed = ipaddress.ip_address(ip)
        if parsed.is_private or parsed.is_loopback:
            return None
    except ValueError:
        return None
    return ip


def geolocate_ip(ip: str, timeout: int = 3) -> dict | None:
    # Free and simple fallback. In production, replace with your paid geolocation provider.
    endpoint = f"http://ip-api.com/json/{quote(ip)}"
    try:
        with urlopen(endpoint, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return None

    if payload.get("status") != "success":
        return None

    lat = payload.get("lat")
    lon = payload.get("lon")
    city = payload.get("city") or ""
    region = payload.get("regionName") or ""
    country = payload.get("country") or ""
    location = ", ".join([part for part in [city, region, country] if part])

    if lat is None or lon is None:
        return None
    return {
        "latitude": float(lat),
        "longitude": float(lon),
        "location": location,
    }
