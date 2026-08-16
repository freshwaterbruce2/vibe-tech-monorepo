"""Durable, case-scoped evidence records."""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import CheckConstraint, Index
from sqlmodel import Field, SQLModel

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class EvidenceRecord(SQLModel, table=True):
    __tablename__ = "evidence_records"
    __table_args__ = (CheckConstraint("byte_length >= 0"), Index("ix_evidence_case_imported", "case_id", "imported_at"), Index("ix_evidence_sha256", "sha256"))
    evidence_id: str = Field(primary_key=True, max_length=36)
    case_id: str = Field(index=True, max_length=64)
    display_filename: str = Field(max_length=255)
    original_path: str = Field(max_length=600)
    byte_length: int
    sha256: str = Field(max_length=64)
    declared_mime: Optional[str] = Field(default=None, max_length=255)
    detected_mime: str = Field(max_length=120)
    detected_type: str = Field(max_length=20)
    imported_at: datetime = Field(default_factory=utc_now)
    source_label: str = Field(max_length=200)
    received_from: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=4000)
    evidence_date: Optional[datetime] = None
    status: str = Field(default="staged", max_length=32)
    error_code: Optional[str] = Field(default=None, max_length=64)
    error_message: Optional[str] = Field(default=None, max_length=500)
    same_content_as: Optional[str] = Field(default=None, index=True, max_length=36)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

class ExtractionAttempt(SQLModel, table=True):
    __tablename__ = "extraction_attempts"
    __table_args__ = (Index("ix_attempt_evidence_started", "evidence_id", "started_at"),)
    attempt_id: str = Field(primary_key=True, max_length=36)
    evidence_id: str = Field(index=True, foreign_key="evidence_records.evidence_id", max_length=36)
    extractor_name: str = Field(max_length=100)
    extractor_version: str = Field(max_length=50)
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None
    status: str = Field(default="pending", max_length=32)
    page_count: Optional[int] = None
    text_path: Optional[str] = Field(default=None, max_length=600)
    text_sha256: Optional[str] = Field(default=None, max_length=64)
    derivative_path: Optional[str] = Field(default=None, max_length=600)
    error_code: Optional[str] = Field(default=None, max_length=64)
    error_message: Optional[str] = Field(default=None, max_length=500)

class EvidenceChunk(SQLModel, table=True):
    """A durable, reproducible citation unit derived from extracted text."""
    __tablename__ = "evidence_chunks"
    __table_args__ = (
        CheckConstraint("ordinal >= 0"),
        CheckConstraint("char_start >= 0"),
        CheckConstraint("char_end >= char_start"),
        Index("ix_chunk_case_evidence_ordinal", "case_id", "evidence_id", "ordinal", unique=True),
        Index("ix_chunk_attempt", "extraction_attempt_id"),
        Index("ix_chunk_text_sha256", "text_sha256"),
    )
    chunk_id: str = Field(primary_key=True, max_length=64)
    case_id: str = Field(index=True, max_length=64)
    evidence_id: str = Field(index=True, foreign_key="evidence_records.evidence_id", max_length=36)
    extraction_attempt_id: str = Field(foreign_key="extraction_attempts.attempt_id", max_length=36)
    ordinal: int
    text: str
    text_sha256: str = Field(max_length=64)
    paragraph_index: Optional[int] = None
    page_number: Optional[int] = None
    char_start: int
    char_end: int
    status: str = Field(default="active", max_length=20)
    created_at: datetime = Field(default_factory=utc_now)
