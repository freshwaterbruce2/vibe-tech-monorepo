"""
Document text chunking for Vibe-Justice.

Canonical, boundary-aware chunker shared by the evidence indexer
(``EvidenceService.index_file``) and the offline ``scripts/index_chroma.py``
indexer. Splits on paragraph and sentence boundaries so chunks never cut
mid-word or mid-sentence, with character-bounded overlap carried across chunk
edges to preserve retrieval continuity.

Usage:
    from vibe_justice.utils.chunking import chunk_text

    for chunk in chunk_text(document_text, size=1200, overlap=200):
        ...
"""

from __future__ import annotations

import re
from typing import List

# Sentence terminator (.!?) followed by whitespace. The lookbehind keeps the
# terminator attached to the sentence it ends.
_SENTENCE_BOUNDARY = re.compile(r"(?<=[.!?])\s+")
# One or more blank lines separate paragraphs.
_PARAGRAPH_BOUNDARY = re.compile(r"\n\s*\n")


def _hard_split(sentence: str, size: int) -> List[str]:
    """Split an oversized sentence on word boundaries into ``<= size`` pieces.

    Used only when a single "sentence" (e.g. an unpunctuated table row or a
    pasted block) is longer than ``size``. A lone word longer than ``size`` is
    split mid-word as a last resort — unavoidable without exceeding ``size``.
    """
    pieces: List[str] = []
    current = ""
    for word in sentence.split():
        # A single word longer than the budget: flush, then hard-cut the word.
        while len(word) > size:
            if current:
                pieces.append(current)
                current = ""
            pieces.append(word[:size])
            word = word[size:]
        if not current:
            current = word
        elif len(current) + 1 + len(word) <= size:
            current = f"{current} {word}"
        else:
            pieces.append(current)
            current = word
    if current:
        pieces.append(current)
    return pieces


def _atomic_units(text: str, size: int) -> List[str]:
    """Break ``text`` into sentence-sized units, none longer than ``size``.

    Splits on paragraph then sentence boundaries; any sentence still longer
    than ``size`` is hard-split on word boundaries so no unit exceeds ``size``.
    """
    units: List[str] = []
    for paragraph in _PARAGRAPH_BOUNDARY.split(text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        for sentence in _SENTENCE_BOUNDARY.split(paragraph):
            sentence = sentence.strip()
            if not sentence:
                continue
            if len(sentence) <= size:
                units.append(sentence)
            else:
                units.extend(_hard_split(sentence, size))
    return units


def chunk_text(text: str, size: int = 1200, overlap: int = 200) -> List[str]:
    """Chunk ``text`` into ``<= size``-char pieces on sentence/paragraph bounds.

    Greedily packs whole sentences into each chunk up to ``size`` characters,
    then seeds the next chunk with trailing sentences from the previous one
    totalling up to ``overlap`` characters. Overlap counts toward a chunk's
    ``size`` budget, so every returned chunk is ``<= size`` characters.

    Args:
        text: Source document text.
        size: Maximum chunk length in characters (default 1200).
        overlap: Approximate characters of trailing context repeated at the
            start of the next chunk, carried as whole sentences — never a
            mid-sentence cut (default 200).

    Returns:
        List of non-empty chunk strings, each ``<= size`` characters.

    Raises:
        ValueError: If ``size <= 0``, ``overlap < 0``, or ``overlap >= size``.
    """
    if size <= 0:
        raise ValueError("size must be > 0")
    if overlap < 0:
        raise ValueError("overlap must be >= 0")
    if overlap >= size:
        raise ValueError("overlap must be < size")

    units = _atomic_units(text, size)
    if not units:
        return []

    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    def flush() -> List[str]:
        """Emit the current chunk and return trailing units to seed overlap."""
        chunks.append(" ".join(current))
        if overlap == 0:
            return []
        carry: List[str] = []
        carry_len = 0
        for unit in reversed(current):
            extra = len(unit) + (1 if carry else 0)
            if carry and carry_len + extra > overlap:
                break
            carry.insert(0, unit)
            carry_len += extra
        return carry

    for unit in units:
        extra = len(unit) + (1 if current else 0)
        if current and current_len + extra > size:
            carry = flush()
            current = []
            current_len = 0
            # Seed overlap only if the incoming unit still fits beside it;
            # otherwise drop the overlap so the chunk stays within ``size``.
            carry_len = len(" ".join(carry)) if carry else 0
            if carry and carry_len + 1 + len(unit) <= size:
                current = list(carry)
                current_len = carry_len
            extra = len(unit) + (1 if current else 0)
        current.append(unit)
        current_len += extra

    if current:
        chunks.append(" ".join(current))

    return chunks
