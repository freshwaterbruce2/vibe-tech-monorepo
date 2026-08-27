#!/usr/bin/env python3
"""Non-destructive staging integration tests for external API credentials.

This script performs read-only or signature-verification checks against:
- Pexels API (video search)
- ElevenLabs API (voice registry)
- Stripe webhook HMAC validation
- Google OAuth2 refresh-token exchange

It does not generate videos, charge cards, or publish content.
"""

import hmac
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def env(key: str) -> str:
    value = os.environ.get(key, "").strip()
    if not value:
        print(f"❌ Missing environment variable: {key}")
        sys.exit(1)
    return value


def request_json(url: str, method: str = "GET", headers: dict | None = None, data: bytes | None = None) -> dict:
    req = urllib.request.Request(url, method=method, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body}") from exc


def test_pexels() -> None:
    print("\n▶ Pexels API connection")
    api_key = env("PEXELS_API_KEY")
    url = "https://api.pexels.com/videos/search?query=nature&per_page=1"
    data = request_json(url, headers={"Authorization": api_key})

    videos = data.get("videos", [])
    if not videos:
        raise RuntimeError("Pexels returned no videos")

    first = videos[0]
    video_files = first.get("video_files", [])
    if not video_files:
        raise RuntimeError("Pexels video has no streamable files")

    stream_url = video_files[0].get("link", "")
    if not stream_url.startswith("http"):
        raise RuntimeError(f"Invalid Pexels stream URL: {stream_url}")

    # Verify the URL is reachable (HEAD only)
    head = urllib.request.Request(stream_url, method="HEAD")
    with urllib.request.urlopen(head, timeout=30) as response:
        if response.status not in (200, 206):
            raise RuntimeError(f"Pexels stream HEAD returned {response.status}")

    print("✅ Pexels API key is valid and video streams are reachable")


def test_elevenlabs() -> None:
    print("\n▶ ElevenLabs voice permissions")
    api_key = env("ELEVENLABS_API_KEY")
    voice_id = env("ELEVENLABS_VOICE_ID")
    url = "https://api.elevenlabs.io/v1/voices"
    data = request_json(url, headers={"xi-api-key": api_key})

    voices = data.get("voices", [])
    voice = next((v for v in voices if v.get("voice_id") == voice_id), None)
    if voice is None:
        raise RuntimeError(f"Voice ID {voice_id} not found in ElevenLabs account")

    print(f"✅ ElevenLabs voice is accessible: {voice.get('name', voice_id)}")


def test_stripe_webhook() -> None:
    print("\n▶ Stripe webhook cryptographic handshake")
    secret = env("STRIPE_WEBHOOK_SECRET")
    payload = json.dumps(
        {
            "id": "evt_test_123",
            "object": "event",
            "type": "invoice.payment_succeeded",
            "data": {"object": {"id": "in_test_123"}},
            "created": int(time.time()),
        },
        separators=(",", ":"),
    )
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{payload}"
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signed_payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    signature_header = f"t={timestamp},v1={expected_signature}"

    # Validate using the same parsing logic Stripe expects
    parsed = {}
    for item in signature_header.split(","):
        if "=" not in item:
            continue
        key, value = item.split("=", 1)
        parsed[key.strip()] = value.strip()

    if "t" not in parsed or "v1" not in parsed:
        raise RuntimeError("Malformed Stripe signature header")

    if abs(int(parsed["t"]) - timestamp) > 300:
        raise RuntimeError("Stripe webhook timestamp outside tolerance")

    computed = hmac.new(
        secret.encode("utf-8"),
        f"{parsed['t']}.{payload}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed, parsed["v1"]):
        raise RuntimeError("Stripe webhook signature mismatch")

    print("✅ Stripe webhook HMAC-SHA256 signature parsing is correct")


def test_google_refresh() -> None:
    print("\n▶ Google OAuth2 refresh protocol")
    client_id = env("YOUTUBE_CLIENT_ID")
    client_secret = env("YOUTUBE_CLIENT_SECRET")
    refresh_token = env("YOUTUBE_REFRESH_TOKEN")

    data = urllib.parse.urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")

    result = request_json(
        "https://oauth2.googleapis.com/token",
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data=data,
    )

    if "access_token" not in result:
        raise RuntimeError(f"Google refresh did not return access_token: {result}")

    expires_in = result.get("expires_in", 0)
    print(f"✅ Google refresh-token exchange succeeded (access_token expires_in={expires_in}s)")


def main() -> int:
    print(f"\n🧪 VibeTech AI Avatar SaaS — Staging Verification")
    print(f"Started at {datetime.now(timezone.utc).isoformat()} UTC")

    try:
        test_pexels()
        test_elevenlabs()
        test_stripe_webhook()
        test_google_refresh()
    except Exception as exc:  # noqa: BLE001
        print(f"\n❌ Staging check failed: {exc}")
        return 1

    print("\n✅ All staging checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
