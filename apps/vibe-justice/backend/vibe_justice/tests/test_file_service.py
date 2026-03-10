from io import BytesIO
from pathlib import Path

import pytest
from vibe_justice.services.file_service import FileService


class MockUploadFile:
    def __init__(self, filename, content):
        self.filename = filename
        self.file = BytesIO(content)


def test_list_files_empty(file_service):
    assert file_service.list_files() == []


def test_save_upload_and_list(file_service):
    content = b"test content"
    upload = MockUploadFile("test.txt", content)

    result = file_service.save_upload(upload, category="test")

    assert "filename" in result
    assert result["category"] == "test"

    files = file_service.list_files()
    assert len(files) == 1
    assert files[0]["filename"] == result["filename"]
    assert files[0]["size_bytes"] == len(content)


def test_delete_file(file_service):
    upload = MockUploadFile("delete_me.txt", b"content")
    saved = file_service.save_upload(upload)
    filename = saved["filename"]

    assert len(file_service.list_files()) == 1
    file_service.delete_file(filename)
    assert len(file_service.list_files()) == 0


def test_get_category(file_service):
    upload = MockUploadFile("cat.txt", b"content")
    saved = file_service.save_upload(upload, category="legal")
    filename = saved["filename"]

    assert file_service.get_category(filename) == "legal"
    assert file_service.get_category("non-existent") == "other"


def test_invalid_extension(file_service):
    upload = MockUploadFile("danger.exe", b"malware")
    with pytest.raises(ValueError, match="Unsupported file type"):
        file_service.save_upload(upload)
