"""Whisper Subtitle Alignment Engine for the AI Avatar YouTube SaaS.

Provides word-level timestamp extraction from synthesized vocal tracks using
faster-whisper (ctranslate2). Audio is first normalized to 16 kHz mono with a
light high-pass filter to maximize transcription accuracy and minimize subtitle
drift.

Example output:

    [
        {"word": "Welcome", "start": 0.12, "end": 0.45, "confidence": 0.98},
        {"word": "to",      "start": 0.48, "end": 0.62, "confidence": 0.99},
        {"word": "VibeTech!","start": 0.65, "end": 1.12, "confidence": 0.97}
    ]
"""

from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path
from typing import Any

from .config import settings

logger = logging.getLogger("vibetech.render_worker")

# Module-level cache so the Whisper model is loaded once per worker process.
_whisper_model_cache: dict[str, Any] = {}


class SubtitleAlignmentError(Exception):
    """Raised when subtitle alignment or audio normalization fails."""

    pass


def _normalize_audio(
    input_path: str,
    output_path: str,
    sample_rate: int = 16000,
    ffmpeg_path: str = "ffmpeg",
    timeout_seconds: float = 120.0,
) -> None:
    """Normalize audio to mono at the target sample rate with a high-pass filter.

    The filter chain removes low-frequency room tone and hum that can cause
    Whisper word-level timestamps to drift.
    """
    cmd = [
        ffmpeg_path,
        "-y",
        "-i",
        input_path,
        "-ar",
        str(sample_rate),
        "-ac",
        "1",
        "-af",
        "highpass=f=80,afftdn=nf=-25",
        "-vn",
        output_path,
    ]

    logger.info("Normalizing audio for Whisper: %s", " ".join(cmd))
    try:
        subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
            timeout=timeout_seconds,
        )
    except subprocess.CalledProcessError as exc:
        logger.error("Audio normalization failed:\nSTDERR: %s", exc.stderr)
        raise SubtitleAlignmentError(
            f"Audio normalization failed: {exc.stderr or exc.stdout}"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        logger.error("Audio normalization timed out after %ss", timeout_seconds)
        raise SubtitleAlignmentError(
            f"Audio normalization timed out after {timeout_seconds}s"
        ) from exc

    logger.info("Audio normalized successfully: %s", output_path)


def _load_whisper_model(model_size: str, device: str, compute_type: str) -> Any:
    """Load and cache a faster-whisper model.

    The model is cached by a composite key of (size, device, compute_type) so
    repeated render tasks in the same worker process avoid the cold-start
    download and initialization cost.
    """
    cache_key = f"{model_size}:{device}:{compute_type}"
    if cache_key not in _whisper_model_cache:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise SubtitleAlignmentError(
                "faster-whisper is not installed. Run: pip install faster-whisper"
            ) from exc

        logger.info(
            "Loading faster-whisper model=%s device=%s compute_type=%s",
            model_size,
            device,
            compute_type,
        )
        model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root=os.getenv("WHISPER_MODEL_DIR"),
        )
        _whisper_model_cache[cache_key] = model

    return _whisper_model_cache[cache_key]


def generate_subtitles(
    audio_path: str,
    model_size: str | None = None,
    device: str | None = None,
    compute_type: str | None = None,
    language: str | None = "en",
    beam_size: int = 5,
    best_of: int = 5,
    temperature: float = 0.0,
    condition_on_previous_text: bool = False,
) -> list[dict[str, Any]]:
    """Generate word-level subtitle timestamps from an audio file.

    The input audio is first normalized to 16 kHz mono. Then faster-whisper
    transcribes it with word-level timestamps enabled and returns a serialized
    JSON-ready list of word objects.

    Args:
        audio_path: Path to the input audio file (MP3/WAV/etc.).
        model_size: Whisper model size, e.g. ``tiny``, ``base``, ``small``.
        device: Compute device, ``cpu`` or ``cuda``.
        compute_type: Quantization, e.g. ``int8``, ``float16``, ``int8_float16``.
        language: Language code (default ``en``). Set to ``None`` for auto-detect.
        beam_size: Whisper decoding beam size.
        best_of: Whisper decoding best-of samples.
        temperature: Sampling temperature (0.0 for deterministic).
        condition_on_previous_text: Whether to condition decoding on prior text.

    Returns:
        A list of word dictionaries with ``word``, ``start``, ``end``, and
        ``confidence`` keys.
    """
    model_size = model_size or settings.whisper_model_size
    device = device or settings.whisper_device
    compute_type = compute_type or settings.whisper_compute_type

    audio_path_obj = Path(audio_path)
    if not audio_path_obj.exists():
        raise SubtitleAlignmentError(f"Audio file not found: {audio_path}")

    temp_dir = Path(audio_path_obj).parent
    normalized_path = temp_dir / f"{audio_path_obj.stem}_16k_mono.wav"

    try:
        _normalize_audio(
            input_path=str(audio_path_obj),
            output_path=str(normalized_path),
            ffmpeg_path=settings.ffmpeg_path,
        )

        model = _load_whisper_model(model_size, device, compute_type)

        logger.info(
            "Transcribing audio with faster-whisper (model=%s, word_timestamps=True)",
            model_size,
        )
        segments, info = model.transcribe(
            str(normalized_path),
            language=language,
            beam_size=beam_size,
            best_of=best_of,
            temperature=temperature,
            condition_on_previous_text=condition_on_previous_text,
            word_timestamps=True,
            vad_filter=True,
        )

        logger.info(
            "Whisper detected language=%s probability=%.2f",
            info.language,
            info.language_probability,
        )

        words: list[dict[str, Any]] = []
        for segment in segments:
            if segment.words is None:
                continue
            for word in segment.words:
                words.append(
                    {
                        "word": word.word.strip(),
                        "start": round(float(word.start), 3),
                        "end": round(float(word.end), 3),
                        "confidence": round(float(word.probability), 3),
                    }
                )

        logger.info("Extracted %d word-level subtitle entries", len(words))
        return words

    finally:
        # The normalized file is a temporary artifact; remove it to save disk.
        if normalized_path.exists():
            normalized_path.unlink()
