from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from faster_whisper import WhisperModel

from app.settings import settings


@lru_cache(maxsize=1)
def get_whisper_model() -> WhisperModel:
    """Load and cache the configured Whisper model.

    The model is downloaded on first use and reused across tasks. For GPU
    workers set ``WHISPER_DEVICE=cuda`` and ``WHISPER_COMPUTE_TYPE=float16``.
    """
    return WhisperModel(
        settings.whisper_model_size,
        device=settings.whisper_device,
        compute_type=settings.whisper_compute_type,
    )


class TranscriptionSegment:
    """A single timed subtitle segment."""

    def __init__(self, start: float, end: float, text: str) -> None:
        self.start = start
        self.end = end
        self.text = text.strip()

    def to_dict(self) -> dict:
        return {"start": self.start, "end": self.end, "text": self.text}


async def transcribe_audio(audio_path: str | Path) -> list[TranscriptionSegment]:
    """Transcribe an audio file into timestamped subtitle segments.

    Parameters
    ----------
    audio_path:
        Path to a WAV/MP3 audio file on disk.

    Returns
    -------
    List of ``TranscriptionSegment`` ordered by time.
    """
    model = get_whisper_model()
    segments, _ = model.transcribe(str(audio_path), word_timestamps=False)
    return [
        TranscriptionSegment(segment.start, segment.end, segment.text)
        for segment in segments
    ]
