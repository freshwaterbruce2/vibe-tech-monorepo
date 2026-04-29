"""
HTTP-only local smoke check for the running Vibe-Justice backend.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BACKEND_URL = os.getenv("VIBE_JUSTICE_BACKEND_URL", "http://127.0.0.1:8000")
DEFAULT_MESSAGE = "Say hello in one short sentence."


def read_env_value(key: str) -> str | None:
    value = os.getenv(key)
    if value:
        return value

    env_file = Path(__file__).with_name(".env")
    if not env_file.exists():
        return None

    for line in env_file.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        name, raw_value = stripped.split("=", 1)
        if name.strip() == key:
            return raw_value.strip().strip("'\"")

    return None


def request_json(path: str, *, method: str = "GET", body: dict | None = None) -> tuple[int, str]:
    headers = {"Accept": "application/json"}
    data = None

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    api_key = read_env_value("VIBE_JUSTICE_API_KEY")
    if api_key:
        headers["X-API-Key"] = api_key

    request = Request(f"{BACKEND_URL}{path}", data=data, headers=headers, method=method)

    try:
        with urlopen(request, timeout=90) as response:
            return response.status, response.read().decode("utf-8", errors="replace")
    except HTTPError as error:
        return error.code, error.read().decode("utf-8", errors="replace")
    except URLError as error:
        url = f"{BACKEND_URL}{path}"
        reason = getattr(error, "reason", error)
        raise RuntimeError(
            f"Unable to reach backend {method} {url!r}: reason={reason!r}; urlerror={error!r}"
        ) from error


def wait_for_health(timeout_seconds: int) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error = ""

    while time.monotonic() < deadline:
        try:
            status, content = request_json("/api/health")
            if status == 200:
                data = json.loads(content)
                if data.get("status") == "healthy":
                    print(f"[OK] Backend health: {data.get('service', 'healthy')}")
                    return
                last_error = content
            else:
                last_error = f"HTTP {status}: {content}"
        except RuntimeError as error:
            last_error = str(error)

        time.sleep(1)

    raise RuntimeError(f"Backend health check timed out: {last_error}")


def verify_chat(message: str) -> None:
    status, content = request_json(
        "/api/chat/simple",
        method="POST",
        body={"message": message, "domain": "general"},
    )

    if status != 200:
        raise RuntimeError(f"Chat returned HTTP {status}: {content}")

    data = json.loads(content)
    answer = str(data.get("content", "")).strip()
    model_used = str(data.get("model_used", "")).strip()

    if not answer:
        raise RuntimeError(f"Chat response was empty: {content}")

    if answer.lower().startswith("error:"):
        raise RuntimeError(f"Chat provider returned an error: {answer}")

    print(f"[OK] Chat route answered with model: {model_used or 'unknown'}")
    print(f"[OK] Chat preview: {answer[:180]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify local Vibe-Justice backend chat.")
    parser.add_argument("--health-timeout", type=int, default=45)
    parser.add_argument("--skip-chat", action="store_true")
    parser.add_argument("--message", default=DEFAULT_MESSAGE)
    args = parser.parse_args()

    try:
        wait_for_health(args.health_timeout)
        if not args.skip_chat:
            verify_chat(args.message)
    except Exception as error:
        print(f"[FAIL] {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
