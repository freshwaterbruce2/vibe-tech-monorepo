"""Deterministic, offline retrieval over case-scoped extracted evidence."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from uuid import NAMESPACE_URL, uuid5

from fastapi import HTTPException
from sqlmodel import Session, delete, select

from vibe_justice.models.evidence import EvidenceChunk, ExtractionAttempt
from vibe_justice.services.evidence_import_service import EvidenceImportService

MAX_QUERY_LENGTH = 500
MAX_SEARCH_LIMIT = 50
CHUNK_CHARS = 1200
TOKEN_RE = re.compile(r"[a-z0-9]+(?:['’-][a-z0-9]+)?", re.IGNORECASE)


@dataclass(frozen=True)
class LocatedText:
    text: str
    paragraph_index: int
    char_start: int
    char_end: int
    page_number: int | None = None


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _located_chunks(text: str, page_spans: list[tuple[int, int, int]] | None = None) -> list[LocatedText]:
    """Split without losing exact source offsets or repeated-text identity."""
    chunks: list[LocatedText] = []
    for paragraph_index, match in enumerate(re.finditer(r"[^\r\n]+(?:\r?\n|$)", text)):
        raw = match.group(0).rstrip("\r\n")
        if not raw.strip():
            continue
        leading = len(raw) - len(raw.lstrip())
        paragraph = raw.strip()
        base = match.start() + leading
        cursor = 0
        while cursor < len(paragraph):
            end = min(cursor + CHUNK_CHARS, len(paragraph))
            if end < len(paragraph):
                boundary = paragraph.rfind(" ", cursor, end + 1)
                if boundary > cursor:
                    end = boundary
            piece = paragraph[cursor:end]
            if piece:
                char_start, char_end = base + cursor, base + end
                page_number = next((page for start, finish, page in (page_spans or []) if start <= char_start and char_end <= finish), None)
                if page_spans and page_number is None:
                    raise HTTPException(409, "PDF page locator reconstruction failed")
                chunks.append(LocatedText(piece, paragraph_index, char_start, char_end, page_number))
            cursor = end
            while cursor < len(paragraph) and paragraph[cursor].isspace():
                cursor += 1
    return chunks


def _tokens(value: str) -> list[str]:
    return TOKEN_RE.findall(value.casefold())


class EvidenceRetrievalService:
    def __init__(self) -> None:
        self.imports = EvidenceImportService()
        self.engine = self.imports.engine

    def _latest_attempt(self, evidence_id: str) -> ExtractionAttempt:
        attempts = self.imports.attempts(evidence_id)
        attempt = next((item for item in attempts if item.status == "succeeded" and item.text_path), None)
        if not attempt:
            raise HTTPException(409, "Successful extracted text is required before indexing")
        return attempt

    def _verified_text(self, attempt: ExtractionAttempt) -> tuple[str, str]:
        path = self.imports.resolve(attempt.text_path)
        if not path.is_file():
            self._mark_stale(attempt.evidence_id)
            raise HTTPException(409, "Extracted text is missing; extract the evidence again")
        text = path.read_text(encoding="utf-8")
        digest = _hash_text(text)
        if not attempt.text_sha256:
            self._mark_stale(attempt.evidence_id)
            raise HTTPException(409, "Extracted text predates integrity tracking; extract the evidence again")
        if digest != attempt.text_sha256:
            self._mark_stale(attempt.evidence_id)
            raise HTTPException(409, "Extracted text failed integrity verification; extract the evidence again")
        return text, digest

    def _pdf_page_spans(self, record, text: str) -> list[tuple[int, int, int]] | None:
        if record.detected_type != "pdf":
            return None
        from pypdf import PdfReader
        pages = [(page.extract_text() or "") for page in PdfReader(self.imports.resolve(record.original_path)).pages]
        if "\n\n".join(pages) != text:
            raise HTTPException(409, "PDF text no longer matches its immutable original")
        spans=[]; cursor=0
        for page_number, page_text in enumerate(pages, start=1):
            spans.append((cursor, cursor + len(page_text), page_number))
            cursor += len(page_text) + (2 if page_number < len(pages) else 0)
        return spans

    def _mark_stale(self, evidence_id: str) -> None:
        with Session(self.engine) as session:
            chunks = session.exec(select(EvidenceChunk).where(EvidenceChunk.evidence_id == evidence_id)).all()
            for chunk in chunks:
                chunk.status = "stale"
                session.add(chunk)
            session.commit()

    def index(self, case_id: str, evidence_id: str) -> list[EvidenceChunk]:
        record = self.imports.get(case_id, evidence_id)
        if record.status in {"missing", "corrupt"}:
            raise HTTPException(409, record.error_message or "Evidence integrity check failed")
        attempt = self._latest_attempt(evidence_id)
        text, digest = self._verified_text(attempt)
        if not text.strip():
            raise HTTPException(409, "no_searchable_text")
        page_spans = self._pdf_page_spans(record, text)
        with Session(self.engine) as session:
            prior = list(session.exec(select(EvidenceChunk).where(
                EvidenceChunk.evidence_id == evidence_id,
                EvidenceChunk.extraction_attempt_id == attempt.attempt_id,
            )).all())
            if prior and any(chunk.text_sha256 != digest for chunk in prior):
                for chunk in prior:
                    chunk.status = "stale"
                    session.add(chunk)
                session.commit()
                raise HTTPException(409, "Extracted text changed after indexing; extract the evidence again")
            existing = list(session.exec(select(EvidenceChunk).where(
                EvidenceChunk.case_id == case_id,
                EvidenceChunk.evidence_id == evidence_id,
                EvidenceChunk.extraction_attempt_id == attempt.attempt_id,
                EvidenceChunk.text_sha256 == digest,
                EvidenceChunk.status == "active",
            ).order_by(EvidenceChunk.ordinal)).all())
            located = _located_chunks(text, page_spans)
            if len(existing) == len(located) and all(chunk.text == source.text for chunk, source in zip(existing, located)):
                return existing
            session.exec(delete(EvidenceChunk).where(EvidenceChunk.evidence_id == evidence_id))
            created = []
            for ordinal, source in enumerate(located):
                chunk = EvidenceChunk(
                    chunk_id=str(uuid5(NAMESPACE_URL, f"vibe-justice:{evidence_id}:{attempt.attempt_id}:{digest}:{ordinal}")),
                    case_id=case_id, evidence_id=evidence_id, extraction_attempt_id=attempt.attempt_id,
                    ordinal=ordinal, text=source.text, text_sha256=digest,
                    paragraph_index=source.paragraph_index, page_number=source.page_number,
                    char_start=source.char_start, char_end=source.char_end,
                )
                session.add(chunk)
                created.append(chunk)
            session.commit()
            for chunk in created:
                session.refresh(chunk)
            return created

    def chunks(self, case_id: str, evidence_id: str) -> list[EvidenceChunk]:
        self.imports.get(case_id, evidence_id)
        with Session(self.engine) as session:
            chunks = list(session.exec(select(EvidenceChunk).where(
                EvidenceChunk.case_id == case_id, EvidenceChunk.evidence_id == evidence_id,
                EvidenceChunk.status == "active",
            ).order_by(EvidenceChunk.ordinal)).all())
        if not chunks:
            attempt = self._latest_attempt(evidence_id)
            text, _ = self._verified_text(attempt)
            if not text.strip():
                raise HTTPException(409, "no_searchable_text")
            return []
        attempt = self._latest_attempt(evidence_id)
        _, digest = self._verified_text(attempt)
        if any(chunk.extraction_attempt_id != attempt.attempt_id or chunk.text_sha256 != digest for chunk in chunks):
            self._mark_stale(evidence_id)
            raise HTTPException(409, "Extracted text changed after indexing; extract the evidence again")
        return chunks

    def search(self, case_id: str, query: str, limit: int) -> list[tuple[EvidenceChunk, str, float, list[str]]]:
        self.imports.list(case_id)  # validates case and original integrity
        query = query.strip()
        if not query or len(query) > MAX_QUERY_LENGTH:
            raise HTTPException(422, "Search query must contain 1 to 500 characters")
        limit = max(1, min(limit, MAX_SEARCH_LIMIT))
        query_tokens = _tokens(query)
        if not query_tokens:
            return []
        with Session(self.engine) as session:
            candidates = list(session.exec(select(EvidenceChunk).where(
                EvidenceChunk.case_id == case_id, EvidenceChunk.status == "active"
            )).all())
        results = []
        verified: dict[str, bool] = {}
        for chunk in candidates:
            if chunk.evidence_id not in verified:
                try:
                    attempt = self._latest_attempt(chunk.evidence_id)
                    _, digest = self._verified_text(attempt)
                    verified[chunk.evidence_id] = attempt.attempt_id == chunk.extraction_attempt_id and digest == chunk.text_sha256
                except HTTPException:
                    verified[chunk.evidence_id] = False
                if not verified[chunk.evidence_id]:
                    self._mark_stale(chunk.evidence_id)
            if not verified[chunk.evidence_id]:
                continue
            chunk_tokens = _tokens(chunk.text)
            chunk_set = set(chunk_tokens)
            matched = list(dict.fromkeys(token for token in query_tokens if token in chunk_set))
            if not matched:
                continue
            coverage = len(set(matched)) / len(set(query_tokens))
            phrase = query.casefold() in chunk.text.casefold()
            score = coverage + (2.0 if phrase else 0.0) + min(len(matched), 10) / 100
            quote = chunk.text
            results.append((chunk, quote, round(score, 4), matched))
        results.sort(key=lambda item: (-item[2], item[0].evidence_id, item[0].ordinal))
        return results[:limit]
