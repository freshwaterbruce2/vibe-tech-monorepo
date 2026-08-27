#!/usr/bin/env python3
"""Convert a USER-EXPORTED cookies file into the NotebookLM auth the CLI needs.

You export your OWN NotebookLM cookies from your already-logged-in Chrome (e.g. with the
"Get cookies.txt LOCALLY" extension, on https://notebooklm.google.com/), save the file, and
this reformats it into a Playwright storage_state for the `notebooklm` CLI. It ONLY reads the
file you provide -- it never touches your Chrome profile. Cookie values are never printed.

Usage:
    python D:\\temp\\nlm_cookies_to_storage.py [path-to-export]   # default: D:\\temp\\cookies.txt
Accepts either a Netscape cookies.txt or a JSON cookie export.
"""

import json
import sys
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"D:\temp\cookies.txt")
STATE_FILE = Path.home() / ".claude" / "skills" / "notebooklm" / "data" / "browser_state" / "state.json"
CLI_STORAGE = Path.home() / ".notebooklm" / "storage_state.json"
REQUIRED = ["SID", "HSID", "SSID", "APISID", "SAPISID"]
SUFFIXES = (".google.com", "notebooklm.google.com", ".googleusercontent.com")


def norm_samesite(v) -> str:
    return {"no_restriction": "None", "none": "None", "lax": "Lax", "strict": "Strict",
            "unspecified": "Lax", "": "Lax", None: "Lax"}.get((v or "").lower() if v else "", "Lax")


def from_json(text: str) -> list:
    out = []
    for c in json.loads(text):
        try:
            exp = int(c.get("expirationDate", c.get("expires", -1)) or -1)
        except (TypeError, ValueError):
            exp = -1
        out.append({
            "name": c.get("name", ""), "value": c.get("value", ""),
            "domain": c.get("domain", ""), "path": c.get("path", "/"),
            "expires": exp, "httpOnly": bool(c.get("httpOnly", False)),
            "secure": bool(c.get("secure", False)), "sameSite": norm_samesite(c.get("sameSite")),
        })
    return out


def from_netscape(text: str) -> list:
    out = []
    for raw in text.splitlines():
        line = raw.rstrip("\n")
        if not line.strip():
            continue
        http_only = False
        if line.startswith("#HttpOnly_"):
            http_only, line = True, line[len("#HttpOnly_"):]
        elif line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 7:
            continue
        domain, _inc, path, secure, expires, name, value = parts
        try:
            exp = int(expires)
        except ValueError:
            exp = -1
        out.append({
            "name": name, "value": value, "domain": domain, "path": path or "/",
            "expires": exp if exp > 0 else -1, "httpOnly": http_only,
            "secure": secure.strip().upper() == "TRUE", "sameSite": "Lax",
        })
    return out


def main() -> int:
    if not SRC.exists():
        print(f"❌ Export file not found: {SRC}")
        print("   Export your cookies on https://notebooklm.google.com/ and save it to that path.")
        return 1
    text = SRC.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        print(f"❌ {SRC} is empty.")
        return 1

    cookies = from_json(text) if text[:1] in "[{" else from_netscape(text)
    google = [c for c in cookies if c["name"]
              and any(c["domain"] == s or c["domain"].endswith(s) for s in SUFFIXES)]
    have = {c["name"]: c["value"] for c in google}
    missing = [r for r in REQUIRED if not have.get(r)]

    state = {"cookies": google, "origins": []}
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    CLI_STORAGE.parent.mkdir(parents=True, exist_ok=True)
    CLI_STORAGE.write_text(json.dumps(state, indent=2), encoding="utf-8")

    print(f"✅ wrote {len(google)} Google cookies -> {STATE_FILE}")
    print(f"✅ wrote -> {CLI_STORAGE}")
    if missing:
        print(f"⚠️  missing required cookies: {missing}")
        print("   Re-export while signed in ON https://notebooklm.google.com/ (so .google.com")
        print("   cookies are included), then re-run.")
        return 1
    print("   all required cookies present.")
    print("\nNext: notebooklm list")
    return 0


if __name__ == "__main__":
    sys.exit(main())
