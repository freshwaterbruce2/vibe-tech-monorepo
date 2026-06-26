from __future__ import annotations

import asyncio
import tempfile
from pathlib import Path

from pydub import AudioSegment

from app.services.assets import resolve_asset
from app.services.subtitles import generate_ass_subtitles
from app.services.whisper import TranscriptionSegment
from app.settings import settings

FFMPEG = "ffmpeg"


def _parse_resolution(resolution: str) -> tuple[int, int]:
    width, height = resolution.split("x")
    return int(width), int(height)


def _audio_duration(audio_path: Path) -> float:
    """Return the duration of an audio file in seconds."""
    segment = AudioSegment.from_file(str(audio_path))
    return segment.duration_seconds


async def _run_ffmpeg(args: list[str], cwd: str | None = None) -> None:
    """Run an FFmpeg command and raise a descriptive error on failure."""
    proc = await asyncio.create_subprocess_exec(
        FFMPEG,
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=cwd,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        message = stderr.decode(errors="ignore")[-800:] or stdout.decode(errors="ignore")[-800:]
        raise RuntimeError(f"FFmpeg failed (exit {proc.returncode}): {message}")


def _is_video(path: Path) -> bool:
    return path.suffix.lower() in {".mp4",".mov",".webm",".mkv",".avi"}


async def build_base_video(
    asset_path: Path | None,
    duration: float,
    subtitle_path: Path | None,
    output_path: Path,
    resolution: str | None = None,
    fps: int | None = None,
    work_dir: Path | None = None,
) -> Path:
    """Build a silent H.264 base video from an avatar asset and optional subtitles.

    The output is intentionally encoded once so that the final audio mux can use
    ``-c:v copy`` for lossless, fast container remuxing.

    ``work_dir`` is the directory in which FFmpeg is executed. Paths inside that
    directory are passed as relative names so Windows drive-letter colons do not
    interfere with FFmpeg's filter option parser.
    """
    resolution = resolution or settings.default_video_resolution
    fps = fps or settings.default_video_fps
    width, height = _parse_resolution(resolution)
    work_dir = work_dir or output_path.parent

    def _relative(path: Path | None) -> str | None:
        if path is None:
            return None
        try:
            return path.relative_to(work_dir).as_posix()
        except ValueError:
            return path.as_posix()

    video_filter = f"format=yuv420p,scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2"
    relative_subs = _relative(subtitle_path)
    if relative_subs:
        video_filter = f"subtitles={relative_subs}:charenc=utf-8,{video_filter}"

    input_args: list[str] = []
    if asset_path is None:
        # Fallback test pattern when no asset is available.
        input_args = [
            "-f", "lavfi",
            "-i", f"color=c=black:s={resolution}:r={fps}",
        ]
    elif _is_video(asset_path):
        input_args = ["-i", _relative(asset_path) or str(asset_path)]
    else:
        # Treat as a still image and loop it for the full duration.
        input_args = [
            "-loop", "1",
            "-framerate", str(fps),
            "-i", _relative(asset_path) or str(asset_path),
        ]

    command = [
        "-y",
        *input_args,
        "-vf", video_filter,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-r", str(fps),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-t", str(duration),
        "-an",
        _relative(output_path) or str(output_path),
    ]
    await _run_ffmpeg(command, cwd=str(work_dir))
    return output_path


async def mux_video_audio(
    base_video_path: Path,
    audio_path: Path,
    output_path: Path,
    work_dir: Path | None = None,
) -> Path:
    """Mux a pre-encoded H.264 video with an audio track.

    The video stream is copied losslessly while the audio is transcoded to AAC.
    ``-shortest`` ensures the output ends when the shorter input ends, which is
    normally the audio track.
    """
    work_dir = work_dir or output_path.parent

    def _relative(path: Path) -> str:
        try:
            return path.relative_to(work_dir).as_posix()
        except ValueError:
            return path.as_posix()

    command = [
        "-y",
        "-i", _relative(base_video_path),
        "-i", _relative(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "48000",
        "-ac", "2",
        "-shortest",
        "-movflags", "+faststart",
        _relative(output_path),
    ]
    await _run_ffmpeg(command, cwd=str(work_dir))
    return output_path


async def render_video(
    audio_bytes: bytes,
    asset_paths: list[str],
    segments: list[TranscriptionSegment] | None = None,
    resolution: str | None = None,
    fps: int | None = None,
) -> bytes:
    """Render a final MP4 from synthesized audio, avatar assets, and subtitles.

    Pipeline:
      1. Save audio to disk and measure its duration.
      2. Resolve the first avatar asset to a local file.
      3. Generate an ASS subtitle file from the transcription segments.
      4. Encode a silent H.264 base video (asset loop + burned subtitles).
      5. Remux with the audio track using ``-c:v copy -c:a aac -shortest``.
    """
    resolution = resolution or settings.default_video_resolution
    fps = fps or settings.default_video_fps

    async with asyncio.timeout(600):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            audio_path = tmp_path / "audio.mp3"
            audio_path.write_bytes(audio_bytes)
            duration = _audio_duration(audio_path)

            asset_path: Path | None = None
            if asset_paths:
                asset_path = await resolve_asset(asset_paths[0], tmp_path)

            subtitle_path: Path | None = None
            if segments:
                subtitle_path = generate_ass_subtitles(
                    segments,
                    tmp_path / "subtitles.ass",
                    resolution=_parse_resolution(resolution),
                )

            base_video_path = tmp_path / "base.mp4"
            await build_base_video(
                asset_path,
                duration,
                subtitle_path,
                base_video_path,
                resolution=resolution,
                fps=fps,
                work_dir=tmp_path,
            )

            final_path = tmp_path / "final.mp4"
            await mux_video_audio(
                base_video_path,
                audio_path,
                final_path,
                work_dir=tmp_path,
            )
            return final_path.read_bytes()
