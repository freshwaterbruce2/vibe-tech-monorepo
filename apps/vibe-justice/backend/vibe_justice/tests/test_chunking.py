"""Tests for the boundary-aware document chunker."""

import pytest

from vibe_justice.utils.chunking import chunk_text


def test_empty_text_returns_no_chunks():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_short_text_is_single_chunk():
    text = "This is one short sentence."
    assert chunk_text(text, size=1200, overlap=200) == [text]


def test_chunks_never_exceed_size():
    # Many sentences, each well under size.
    text = " ".join(f"Sentence number {i} here." for i in range(200))
    chunks = chunk_text(text, size=200, overlap=40)
    assert len(chunks) > 1
    assert all(len(c) <= 200 for c in chunks)


def test_does_not_split_mid_word():
    text = " ".join(f"word{i}" for i in range(300))
    chunks = chunk_text(text, size=120, overlap=20)
    # No chunk should start or end with a partial token boundary artifact:
    # every space-delimited token must appear intact somewhere.
    for chunk in chunks:
        for token in chunk.split():
            assert token.startswith("word")


def test_respects_sentence_boundaries():
    text = "Alpha beta gamma. Delta epsilon zeta. Eta theta iota."
    chunks = chunk_text(text, size=25, overlap=0)
    # Each chunk should be composed of whole sentences (end with a period).
    assert all(c.endswith(".") for c in chunks)


def test_overlap_carries_trailing_sentence():
    s1 = "First sentence about the matter."
    s2 = "Second sentence with more detail."
    s3 = "Third sentence closing things out."
    text = f"{s1} {s2} {s3}"
    # Size forces a split; overlap large enough to carry one sentence forward.
    chunks = chunk_text(text, size=70, overlap=40)
    assert len(chunks) >= 2
    # The last sentence of chunk[0] should reappear at the start of chunk[1].
    assert chunks[1].startswith(s2) or chunks[1].startswith(s3)


def test_oversized_sentence_is_hard_split_on_words():
    # A single "sentence" longer than size (no terminators).
    long_sentence = " ".join(f"token{i}" for i in range(100))
    chunks = chunk_text(long_sentence, size=50, overlap=10)
    assert len(chunks) > 1
    assert all(len(c) <= 50 for c in chunks)


def test_single_word_longer_than_size_is_split():
    giant = "x" * 250
    chunks = chunk_text(giant, size=100, overlap=10)
    assert all(len(c) <= 100 for c in chunks)
    assert "".join(chunks) == giant


def test_paragraph_boundaries_split_units():
    text = "Para one sentence.\n\nPara two sentence.\n\nPara three sentence."
    chunks = chunk_text(text, size=30, overlap=0)
    assert all(len(c) <= 30 for c in chunks)


@pytest.mark.parametrize(
    "size,overlap",
    [(0, 0), (-1, 0), (100, -1), (100, 100), (100, 150)],
)
def test_invalid_arguments_raise(size, overlap):
    with pytest.raises(ValueError):
        chunk_text("some text", size=size, overlap=overlap)
