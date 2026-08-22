"""Durable SQLModel records."""

# Alembic imports this package to register the complete runtime metadata.
from vibe_justice.models.evidence import EvidenceChunk, EvidenceRecord, ExtractionAttempt
from vibe_justice.models.issue import (
    FindingCitation,
    FindingDisposition,
    FindingMissingFact,
    FindingQualification,
    IssueAnalysisRun,
    IssueFinding,
)
from vibe_justice.models.legal_pack import LegalPack, LegalRuleElement, LegalSource

__all__ = [
    "EvidenceChunk", "EvidenceRecord", "ExtractionAttempt",
    "FindingCitation", "FindingDisposition", "FindingMissingFact",
    "FindingQualification", "IssueAnalysisRun", "IssueFinding",
    "LegalPack", "LegalRuleElement", "LegalSource",
]
