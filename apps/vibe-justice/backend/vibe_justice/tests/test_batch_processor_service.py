"""Tests for concurrent batch extraction in BatchProcessorService."""

import asyncio

from vibe_justice.services.batch_processor_service import (
    BatchFileResult,
    BatchProcessorService,
)


def _bare_service(concurrency: int) -> BatchProcessorService:
    """Build a service without running __init__ (skips OCR/PIL imports)."""
    svc = object.__new__(BatchProcessorService)
    svc._extraction_concurrency = concurrency
    return svc


async def test_process_batch_preserves_input_order():
    svc = _bare_service(concurrency=4)

    async def fake(path: str) -> BatchFileResult:
        # Reverse-proportional sleep so later files would finish first if
        # ordering came from completion time rather than submission order.
        await asyncio.sleep(0.001 * (10 - int(path.split(".")[0][1:])))
        return BatchFileResult(
            filename=path, file_type=".txt", success=True, text_content=path
        )

    svc._process_single_file = fake  # type: ignore[method-assign]

    paths = [f"f{i}.txt" for i in range(8)]
    result = await svc.process_batch(paths, run_analysis=False)

    assert [r.filename for r in result.file_results] == paths
    assert result.successful_files == 8
    assert result.failed_files == 0


async def test_extraction_runs_concurrently_within_cap():
    cap = 3
    svc = _bare_service(concurrency=cap)

    active = 0
    max_active = 0

    async def fake(path: str) -> BatchFileResult:
        nonlocal active, max_active
        active += 1
        max_active = max(max_active, active)
        await asyncio.sleep(0.01)
        active -= 1
        return BatchFileResult(
            filename=path, file_type=".txt", success=True, text_content="x"
        )

    svc._process_single_file = fake  # type: ignore[method-assign]

    await svc.process_batch([f"f{i}.txt" for i in range(9)], run_analysis=False)

    assert max_active > 1, "extraction did not run in parallel"
    assert max_active <= cap, "exceeded the concurrency cap"


async def test_failed_files_counted_without_aborting_batch():
    svc = _bare_service(concurrency=4)

    async def fake(path: str) -> BatchFileResult:
        if path == "bad.txt":
            return BatchFileResult(
                filename=path, file_type=".txt", success=False, error="boom"
            )
        return BatchFileResult(
            filename=path, file_type=".txt", success=True, text_content="ok"
        )

    svc._process_single_file = fake  # type: ignore[method-assign]

    result = await svc.process_batch(
        ["a.txt", "bad.txt", "c.txt"], run_analysis=False
    )

    assert result.total_files == 3
    assert result.successful_files == 2
    assert result.failed_files == 1
