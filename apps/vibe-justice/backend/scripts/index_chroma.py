#!/usr/bin/env python
"""
Index plain-text documents into the Vibe-Justice ChromaDB store.

This script is intentionally deterministic and does not require downloading
embedding models. It uses a simple hashing-based embedding so the app can be
set up offline and without secrets.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import os
import re
from pathlib import Path
from typing import Iterable, List

import chromadb


def normalize_domain(domain: str) -> str:
    domain = (domain or "").strip()
    if not domain:
        return "general"
    return {
        "sc_unemployment": "unemployment",
        "walmart_sedgwick": "labor",
    }.get(domain, domain)


def hash_embedding(text: str, dim: int = 128) -> List[float]:
    tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
    vector = [0.0] * dim
    for token in tokens:
        digest = hashlib.blake2b(token.encode("utf-8"), digest_size=4).digest()
        idx = int.from_bytes(digest, byteorder="little") % dim
        vector[idx] += 1.0

    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
    return vector


def chunk_text(text: str, chunk_size: int, overlap: int) -> Iterable[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be > 0")
    if overlap < 0:
        raise ValueError("overlap must be >= 0")
    if overlap >= chunk_size:
        raise ValueError("overlap must be < chunk_size")

    start = 0
    length = len(text)
    while start < length:
        end = min(length, start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            yield chunk
        start = end - overlap


def main() -> int:
    parser = argparse.ArgumentParser(description="Index documents into ChromaDB for Vibe-Justice")
    parser.add_argument("--domain", default="general", help="Domain to index into (default: general)")
    parser.add_argument(
        "--data-directory",
        default=os.getenv("DATA_DIRECTORY", "D:/VibeJusticeData"),
        help="Base data directory (default: DATA_DIRECTORY or D:/VibeJusticeData)",
    )
    parser.add_argument(
        "--input-dir",
        default=None,
        help="Directory of .txt files to index (default: <data-directory>/documents)",
    )
    parser.add_argument("--chunk-size", type=int, default=1200, help="Chunk size in characters (default: 1200)")
    parser.add_argument("--overlap", type=int, default=200, help="Chunk overlap in characters (default: 200)")
    parser.add_argument("--clear", action="store_true", help="Clear existing collection before indexing")
    args = parser.parse_args()

    domain = normalize_domain(args.domain)
    data_directory = Path(args.data_directory)
    chroma_directory = data_directory / "chroma"
    chroma_directory.mkdir(parents=True, exist_ok=True)

    input_dir = Path(args.input_dir) if args.input_dir else (data_directory / "documents")
    if not input_dir.exists():
        print(f"Input directory does not exist: {input_dir}")
        print("Create it and add one or more .txt files, then re-run this script.")
        return 2

    client = chromadb.PersistentClient(path=str(chroma_directory))
    collection_name = f"vibe_justice_{domain}"

    if args.clear:
        try:
            client.delete_collection(collection_name)
        except Exception:
            pass

    collection = client.get_or_create_collection(name=collection_name, metadata={"hnsw:space": "cosine"})

    text_files = sorted(input_dir.glob("*.txt"))
    if not text_files:
        print(f"No .txt files found in {input_dir}")
        return 2

    ids: List[str] = []
    documents: List[str] = []
    embeddings: List[List[float]] = []
    metadatas: List[dict] = []
    added = 0

    def flush() -> None:
        nonlocal added
        if not ids:
            return
        collection.add(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
        added += len(ids)
        ids.clear()
        documents.clear()
        embeddings.clear()
        metadatas.clear()

    for file_path in text_files:
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        for i, chunk in enumerate(chunk_text(text, args.chunk_size, args.overlap)):
            doc_id = f"{file_path.stem}:{i}"
            ids.append(doc_id)
            documents.append(chunk)
            embeddings.append(hash_embedding(chunk))
            metadatas.append({"source": file_path.name, "chunk": i})
            if len(ids) >= 100:
                flush()

    flush()

    print("Indexed documents into ChromaDB:")
    print(f"- Domain: {domain}")
    print(f"- Collection: {collection_name}")
    print(f"- Chroma directory: {chroma_directory}")
    print(f"- Input directory: {input_dir}")
    print(f"- Chunks added: {added}")
    try:
        print(f"- Total chunks in collection now: {collection.count()}")
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

