from pathlib import Path

import pytest
from vibe_justice.services.extraction_service import ExtractionService


def test_extract_text_txt(extraction_service, tmp_path):
    txt_file = tmp_path / "test.txt"
    txt_file.write_text("Hello World", encoding="utf-8")

    assert extraction_service.extract_text(txt_file) == "Hello World"


def test_extract_text_unsupported(extraction_service, tmp_path):
    exe_file = tmp_path / "test.exe"
    exe_file.write_bytes(b"\x00\x01")

    assert extraction_service.extract_text(exe_file) == ""


def test_extract_text_non_existent(extraction_service):
    assert extraction_service.extract_text(Path("missing.txt")) == ""
