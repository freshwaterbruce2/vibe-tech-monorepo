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
    derivative_path: Optional[str] = Field(default=None, max_length=600)
    error_code: Optional[str] = Field(default=None, max_length=64)
    error_message: Optional[str] = Field(default=None, max_length=500)
