"""
Evidence service

Persists uploads and indexes extracted text into ChromaDB for retrieval.
All persistent data is stored under DATA_DIRECTORY (defaults to D:\\VibeJusticeData).
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, List

try:
    import chromadb  # type: ignore
except Exception:  # pragma: no cover
    chromadb = None

from vibe_justice.services.extraction_service import ExtractionService
from vibe_justice.services.file_service import FileService
from vibe_justice.services.retrieval_service import _hash_embedding
from vibe_justice.utils.domain import normalize_domain
from vibe_justice.utils.paths import get_data_directory


class EvidenceService:
    def __init__(self):
        data_directory = Path(get_data_directory())
        self.data_directory = data_directory
        self.uploads_dir = data_directory / "uploads"

        self.file_service = FileService(self.uploads_dir)
        self.extraction_service = ExtractionService()

        self.chroma_directory = data_directory / "chroma"
        self.chroma_directory.mkdir(parents=True, exist_ok=True)

    def _ensure_chroma(self):
        if chromadb is None:
            raise RuntimeError("ChromaDB not available.")
        return chromadb.PersistentClient(path=str(self.chroma_directory))

    def list_files(self) -> List[Dict[str, Any]]:
        return self.file_service.list_files()

    def save_upload(self, upload_file, category: str = "other") -> Dict[str, Any]:
        return self.file_service.save_upload(upload_file, category)

    def delete_file(self, filename: str) -> Dict[str, Any]:
        """Delete file and remove from index."""
        self.file_service.delete_file(filename)

        # Remove from index
        if chromadb is not None:
            try:
                client = self._ensure_chroma()
                for collection in client.list_collections():
                    try:
                        existing = collection.get(where={"source": filename})
                        if existing and existing["ids"]:
                            collection.delete(ids=existing["ids"])
                    except Exception:
                        pass
            except Exception:
                pass
        return {"deleted": filename}

    def get_index_status(self, filename: str) -> Dict[str, Any]:
        if chromadb is None:
            return {"status": "no_chromadb", "chunks": 0}

        try:
            client = self._ensure_chroma()
            total_chunks = 0
            indexed_in = []
            for col in client.list_collections():
                try:
                    existing = col.get(where={"source": filename})
                    if existing and existing["ids"]:
                        total_chunks += len(existing["ids"])
                        indexed_in.append(col.name)
                except Exception:
                    pass

            return {
                "status": "indexed" if total_chunks > 0 else "not_indexed",
                "chunks": total_chunks,
                "collections": indexed_in,
            }
        except Exception:
            return {"status": "error", "chunks": 0}

    def get_preview(self, filename: str, max_chars: int = 500) -> Dict[str, Any]:
        file_path = self.uploads_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(filename)

        text = self.extraction_service.extract_text(file_path)
        preview = text[:max_chars] + ("..." if len(text) > max_chars else "")
        return {"filename": filename, "preview": preview, "total_chars": len(text)}

    def index_file(self, filename: str, domain: str) -> Dict[str, Any]:
        file_path = self.uploads_dir / filename
        if not file_path.exists():
            raise FileNotFoundError(filename)

        domain = normalize_domain(domain)
        text = self.extraction_service.extract_text(file_path)
        if not text.strip():
            raise ValueError("No text extracted")

        chunks = self._chunk_text(text, 1200, 200)
        file_hash = self._calculate_file_hash(file_path)

        client = self._ensure_chroma()
        collection = client.get_or_create_collection(
            name=f"vibe_justice_{domain}", metadata={"hnsw:space": "cosine"}
        )

        ids, docs, emiss, metas = [], [], [], []
        for i, chunk in enumerate(chunks):
            ids.append(f"{filename}:{i}")
            docs.append(chunk)
            emiss.append(_hash_embedding(chunk))
            metas.append({"source": filename, "chunk": i, "file_hash": file_hash})

        collection.upsert(ids=ids, documents=docs, embeddings=emiss, metadatas=metas)
        return {"chunks_indexed": len(ids), "status": "indexed"}

    def _chunk_text(self, text: str, size: int, overlap: int) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + size
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap
        return chunks

    def _calculate_file_hash(self, path: Path) -> str:
        hasher = hashlib.sha256()
        try:
            with path.open("rb") as f:
                while chunk := f.read(8192):
                    hasher.update(chunk)
            return hasher.hexdigest()
        except Exception:
            return ""
