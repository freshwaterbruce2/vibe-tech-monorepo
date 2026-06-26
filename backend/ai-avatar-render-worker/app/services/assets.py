from __future__ import annotations

import asyncio
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.services.gcs import get_bucket


async def resolve_asset(asset_path: str, tmp_path: Path) -> Path:
    """Resolve an asset path to a local file usable by FFmpeg.

    Supported forms:
    - ``https://...`` / ``http://...``: downloaded via HTTP.
    - ``gs://bucket/path``: downloaded from Google Cloud Storage.
    - ``path/to/object``: treated as a GCS object name and downloaded from the
      configured bucket.
    - Local filesystem path: returned as-is.
    """
    local_path = tmp_path / f"asset_{hash(asset_path) & 0xFFFFFFFF}"

    parsed = urlparse(asset_path)
    if parsed.scheme in ("http", "https"):
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as client:
            response = await client.get(asset_path)
            response.raise_for_status()
            local_path.write_bytes(response.content)
        return local_path

    if parsed.scheme == "gs":
        blob_name = parsed.path.lstrip("/")
        return _download_gcs_blob(blob_name, local_path)

    if Path(asset_path).is_file():
        return Path(asset_path)

    # Treat as GCS object name by default.
    return _download_gcs_blob(asset_path, local_path)


def _download_gcs_blob(blob_name: str, local_path: Path) -> Path:
    bucket = get_bucket()
    if bucket is None:
        raise RuntimeError(
            f"Cannot download GCS asset {blob_name}: GCS credentials not configured"
        )
    blob = bucket.blob(blob_name)
    blob.download_to_filename(str(local_path))
    return local_path
