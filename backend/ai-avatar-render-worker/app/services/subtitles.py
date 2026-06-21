from __future__ import annotations

import re
from pathlib import Path

from app.services.whisper import TranscriptionSegment
from app.settings import settings


def _format_ass_time(seconds: float) -> str:
    """Convert seconds to ASS subtitle time format H:MM:SS.cc."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        centis = 99
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def _escape_ass_text(text: str) -> str:
    """Escape ASS special characters and normalize whitespace."""
    text = re.sub(r"\{\*?\\[^{}]*\}|[{}]", "", text)
    text = text.replace("\\N", " ").replace("\\n", " ")
    text = " ".join(text.split())
    return text


def generate_ass_subtitles(
    segments: list[TranscriptionSegment],
    output_path: str | Path,
    resolution: tuple[int, int] = (1920, 1080),
    font_name: str | None = None,
) -> Path:
    """Write a styled ASS subtitle file from timed transcription segments.

    The style is optimized for short-form talking-head content: large white
    text with a dark outline, centered near the bottom of the frame.
    """
    output_path = Path(output_path)
    font_name = font_name or settings.subtitle_font_name
    width, height = resolution
    margin_v = int(height * 0.08)
    font_size = int(height * 0.045)
    outline = int(max(2, font_size * 0.08))

    # ASS uses BGR for colors.
    primary_color = "&H00FFFFFF"  # white
    outline_color = "&H00000000"  # black
    back_color = "&H00000000"

    header = f"""[Script Info]
Title: VibeTech Auto Subtitles
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{font_size},{primary_color},{primary_color},{outline_color},{back_color},-1,0,0,0,100,100,0,0,1,{outline},0,2,20,20,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = [header]
    for segment in segments:
        if not segment.text:
            continue
        start = _format_ass_time(segment.start)
        end = _format_ass_time(segment.end)
        text = _escape_ass_text(segment.text)
        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    return output_path
