"""
File service
Manages file uploads, metadata, and listing.
"""

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


class FileService:
    META_SUFFIX = ".meta"

    def __init__(self, uploads_dir: Path):
        self.uploads_dir = uploads_dir
        self.uploads_dir.mkdir(parents=True, exist_ok=True)

    def _safe_filename(self, filename: Optional[str]) -> str:
        candidate = (filename or "").strip()
        if not candidate:
            raise ValueError("Missing filename")
        safe = Path(candidate).name
        if not safe or safe in (".", ".."):
            raise ValueError("Invalid filename")
        return safe

    def _allowed_extension(self, filename: str) -> bool:
        ext = Path(filename).suffix.lower()
        return ext in {".txt", ".pdf", ".docx"}

    def list_files(self) -> List[Dict[str, Any]]:
        files = []
        for file_path in sorted(self.uploads_dir.glob("*")):
            if not file_path.is_file() or file_path.suffix == self.META_SUFFIX:
                continue
            stat = file_path.stat()
            uploaded_at = datetime.fromtimestamp(
                stat.st_mtime, tz=timezone.utc
            ).isoformat()
            files.append(
                {
                    "filename": file_path.name,
                    "size_bytes": int(stat.st_size),
                    "uploaded_at": uploaded_at,
                }
            )
        return files

    def save_upload(self, upload_file, category: str = "other") -> Dict[str, Any]:
        filename = self._safe_filename(getattr(upload_file, "filename", None))
        if not self._allowed_extension(filename):
            raise ValueError("Unsupported file type. Allowed: .txt, .pdf, .docx")

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        destination_name = f"{Path(filename).stem}_{timestamp}{Path(filename).suffix}"
        destination = self.uploads_dir / destination_name

        with destination.open("wb") as out:
            shutil.copyfileobj(upload_file.file, out)

        # Save category metadata
        meta_file = destination.with_suffix(destination.suffix + self.META_SUFFIX)
        meta_file.write_text(category, encoding="utf-8")

        return {
            "filename": destination.name,
            "size_bytes": int(destination.stat().st_size),
            "category": category,
        }

    def delete_file(self, filename: str) -> None:
        file_path = self.uploads_dir / filename
        meta_path = file_path.with_suffix(file_path.suffix + self.META_SUFFIX)

        if file_path.exists():
            file_path.unlink()
        if meta_path.exists():
            meta_path.unlink()

    def get_category(self, filename: str) -> str:
        meta_path = self.uploads_dir / (filename + self.META_SUFFIX)
        if meta_path.exists():
            return meta_path.read_text(encoding="utf-8").strip()
        return "other"
