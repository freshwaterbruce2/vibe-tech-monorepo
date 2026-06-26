#!/usr/bin/env python3
"""One-shot, USER-AUTHORIZED: mint NotebookLM auth by reusing your own logged-in Chrome.

Captures the *user's own* Google session, from the *user's own* Chrome profile, on the
*user's own* machine, for the *user's own* NotebookLM CLI. Cookie values are never printed;
the temp copy is deleted afterward.

Chrome 136's remote-debugging block only applies to the DEFAULT user-data-dir, so this
copies the chosen profile to a temporary NON-default dir and launches real Chrome there
(which decrypts its own App-Bound-encrypted cookies on the same machine). Success is decided
by whether the required Google cookies come across decrypted -- not by waiting on a full page
load. A copy of all output is written to D:\\temp\\nlm_mint_out.txt.

Run with ALL Chrome windows CLOSED, preferring the skill venv python (has patchright):
    & "$HOME\\.claude\\skills\\notebooklm\\.venv\\Scripts\\python.exe" D:\\temp\\nlm_profile_mint.py
    ...optional profile name:   ... D:\\temp\\nlm_profile_mint.py "Profile 14"
"""

import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

try:
    from patchright.sync_api import sync_playwright
    ENGINE = "patchright"
except ImportError:
    from playwright.sync_api import sync_playwright
    ENGINE = "playwright"

PROFILE = sys.argv[1] if len(sys.argv) > 1 else "Default"
SRC = Path(os.environ["LOCALAPPDATA"]) / "Google" / "Chrome" / "User Data"
TMP = Path(r"D:\temp") / "nlm-chrome-profile"
LOG_FILE = Path(r"D:\temp") / "nlm_mint_out.txt"
STATE_FILE = Path.home() / ".claude" / "skills" / "notebooklm" / "data" / "browser_state" / "state.json"
CLI_STORAGE = Path.home() / ".notebooklm" / "storage_state.json"

REQUIRED = ["SID", "HSID", "SSID", "APISID", "SAPISID"]
SUFFIXES = (".google.com", "notebooklm.google.com", ".googleusercontent.com")
NLM = re.compile(r"^https://notebooklm\.google\.com/")
SKIP = {
    "Cache", "Code Cache", "GPUCache", "GraphiteDawnCache", "DawnCache", "DawnGraphiteCache",
    "DawnWebGPUCache", "GrShaderCache", "ShaderCache", "Service Worker", "Crashpad",
    "component_crx_cache", "extensions_crx_cache", "Application Cache", "File System",
    "IndexedDB", "blob_storage",
}


def log(msg: str = "") -> None:
    print(msg)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(str(msg) + "\n")
    except Exception:
        pass


def chrome_running() -> bool:
    out = subprocess.run(
        ["powershell", "-NoProfile", "-Command",
         "(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count"],
        capture_output=True, text=True,
    )
    return out.stdout.strip() not in ("", "0")


def copy_profile() -> None:
    if TMP.exists():
        shutil.rmtree(TMP, ignore_errors=True)
    (TMP / PROFILE).mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC / "Local State", TMP / "Local State")  # holds the App-Bound key
    for item in (SRC / PROFILE).iterdir():
        if item.is_dir() and item.name in SKIP:
            continue
        try:
            if item.is_dir():
                shutil.copytree(item, TMP / PROFILE / item.name, dirs_exist_ok=True,
                                ignore=shutil.ignore_patterns(*SKIP))
            else:
                shutil.copy2(item, TMP / PROFILE / item.name)
        except (OSError, shutil.Error):
            pass


def required_cookies(state) -> tuple[int, list]:
    """Return (#google cookies, missing-or-empty required names) from a storage_state."""
    vals = {}
    for c in state.get("cookies", []):
        dom, name = c.get("domain", ""), c.get("name", "")
        if name and any(dom == s or dom.endswith(s) for s in SUFFIXES):
            vals[name] = c.get("value", "")
    missing = [r for r in REQUIRED if not vals.get(r)]  # absent OR empty value
    return len(vals), missing


def main() -> int:
    try:
        LOG_FILE.write_text("", encoding="utf-8")
    except Exception:
        pass
    log(f"engine={ENGINE}  profile={PROFILE!r}")

    if not (SRC / PROFILE).exists():
        log(f"❌ Profile not found: {SRC / PROFILE}")
        return 1
    if chrome_running():
        log("❌ Chrome is still running — close ALL Chrome windows, then re-run.")
        return 1

    log(f"📋 Copying '{PROFILE}' -> {TMP} (caches skipped)...")
    copy_profile()

    pw = ctx = None
    try:
        pw = sync_playwright().start()
        ctx = pw.chromium.launch_persistent_context(
            user_data_dir=str(TMP), channel="chrome", headless=False, no_viewport=True,
            args=[f"--profile-directory={PROFILE}", "--no-first-run", "--no-default-browser-check",
                  "--hide-crash-restore-bubble", "--disable-sync"],
            ignore_default_args=["--enable-automation"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        try:
            page.goto("https://notebooklm.google.com/", wait_until="commit", timeout=30000)
        except Exception as e:
            log(f"   (nav note: {type(e).__name__} — polling cookies anyway)")

        # Success = required cookies present & decrypted. Poll up to 40s.
        deadline, url, ok, ncookies = time.time() + 40, "", False, 0
        while time.time() < deadline:
            try:
                url = page.url
            except Exception:
                url = ""
            try:
                state = ctx.storage_state()
            except Exception:
                state = {}
            ncookies, missing = required_cookies(state)
            if not missing:
                ok = True
                break
            time.sleep(1.5)

        if not ok:
            log(f"❌ Required Google cookies not decrypted after 40s. Final URL: {url!r}")
            if "accounts.google.com" in url:
                log("   -> redirected to login = copied session is NOT valid")
            log("   -> App-Bound Encryption most likely blocked decryption on the copy.")
            return 1

        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        ctx.storage_state(path=str(STATE_FILE))
        CLI_STORAGE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(STATE_FILE, CLI_STORAGE)
        log(f"✅ storage_state -> {STATE_FILE}")
        log(f"✅ CLI default   -> {CLI_STORAGE}")
        log(f"   {ncookies} Google cookies captured; all required present: True")
        log("\nNext: notebooklm list")
        return 0
    except Exception as e:
        log(f"❌ Error: {e}")
        return 1
    finally:
        if ctx:
            try:
                ctx.close()
            except Exception:
                pass
        if pw:
            try:
                pw.stop()
            except Exception:
                pass
        shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
