"""CVE pin guards for vibe-justice backend.

These tests fail the build if any dep regresses below the CVE-patched floor.
Each assertion maps 1:1 to a specific CVE tracked in the 2026-04-21 review.
"""
from __future__ import annotations

import re
from pathlib import Path

REQ = Path(__file__).resolve().parents[2] / "requirements.txt"


def _pin(name: str) -> str:
    """Return the version spec for `name` from requirements.txt (case-insensitive)."""
    pattern = re.compile(rf"^{re.escape(name)}\s*([<>=!~].*)", re.IGNORECASE)
    for line in REQ.read_text(encoding="utf-8").splitlines():
        m = pattern.match(line.strip())
        if m:
            return m.group(1).strip()
    raise AssertionError(f"{name} not found in {REQ}")


def _min_version(spec: str) -> tuple[int, ...]:
    """Extract the `>=X.Y.Z` floor from a spec like '>=1.2.2,<2.0.0'."""
    m = re.search(r">=\s*(\d+(?:\.\d+)*)", spec)
    assert m, f"no >= floor in spec: {spec}"
    return tuple(int(p) for p in m.group(1).split("."))


def test_python_multipart_patched() -> None:
    # Keep the floor on the maintained 0.x release line; no 1.x release exists upstream.
    assert _min_version(_pin("python-multipart")) >= (0, 0, 26)


def test_pypdf_patched() -> None:
    # CVE-2026-40260, 31826, 28351, 27888, 33123, 33699 — all DoS, fixed in 6.10.2
    assert _min_version(_pin("pypdf")) >= (6, 10, 2)


def test_pillow_patched() -> None:
    # CVE-2026-40192 FITS decompression bomb, CVE-2026-25990 PSD heap overflow — fixed in 12.2.0
    assert _min_version(_pin("Pillow")) >= (12, 2, 0)


def test_requests_patched() -> None:
    # CVE-2024-47081 netrc cert-verify bypass — fixed in 2.32.4
    assert _min_version(_pin("requests")) >= (2, 32, 4)
