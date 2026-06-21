"""Asynchronous Cloud Render Worker for the AI Avatar YouTube SaaS.

This Celery task implements Milestone 1 of the render pipeline: a production-ready,
highly parallelized, asynchronous background worker that downloads Pexels B-roll
assets, synthesizes narration through ElevenLabs, executes the Remotion CLI, and
losslessly muxes the final MP4.

Task name: ``vibetech.render_job``
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path
from typing import Any

import requests
from celery.exceptions import SoftTimeLimitExceeded

from .config import settings
from .subtitle_service import generate_subtitles
from .worker import celery_app

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s.%(funcName)s:%(lineno)d] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("vibetech.render_worker")


class RenderPipelineError(Exception):
    """Base exception class for errors during the render pipeline execution."""

    pass


# Resolve the Remotion project root relative to this file's location inside the
# monorepo (backend/avatar-render-worker/src/celery_render_worker.py -> repo root).
DEFAULT_REMOTION_ROOT = Path(__file__).resolve().parents[3] / "apps" / "ai-avatar-youtube-saas"


def _get_remotion_project_root() -> Path:
    """Return the directory from which ``npx remotion`` should be executed."""
    configured = os.getenv("REMOTION_PROJECT_ROOT")
    if configured:
        return Path(configured).resolve()
    return DEFAULT_REMOTION_ROOT


def _get_public_output_dir() -> Path:
    """Return the directory where finished MP4s are published for download."""
    configured = os.getenv("PUBLIC_RENDER_DIR")
    if configured:
        return Path(configured).resolve()
    return settings.render_output_dir / "public"


def download_file(url: str, dest_path: str) -> None:
    """Download a file from a URL to a local destination using streaming to conserve RAM."""
    logger.info("Downloading asset from: %s", url)
    try:
        with requests.get(url, stream=True, timeout=60) as response:
            response.raise_for_status()
            with open(dest_path, "wb") as handle:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        handle.write(chunk)
        logger.info("Successfully downloaded asset to: %s", dest_path)
    except Exception as exc:
        logger.error("Failed to download asset from %s: %s", url, exc)
        raise RenderPipelineError(f"Asset download failed: {exc}") from exc


def generate_elevenlabs_audio(text: str, voice_id: str, dest_path: str) -> None:
    """Call the ElevenLabs Text-to-Speech API to synthesize the vocal track."""
    api_key = settings.elevenlabs_api_key or os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RenderPipelineError("ELEVENLABS_API_KEY is not set in the environment variables.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }

    # Production parameters: emotional range, voice stability, and clean synthesis.
    payload: dict[str, Any] = {
        "text": text,
        "model_id": "eleven_multilingual_v2",  # stable, long-form emotional delivery
        "voice_settings": {
            "stability": 0.50,  # wider emotional delivery without pacing artifacts
            "similarity_boost": 0.75,  # high clone fidelity without reproducing mic noise
            "style_exaggeration": 0.00,  # minimize synthesis latency and model instability
            "speaker_boost": True,
        },
    }

    logger.info("Initiating ElevenLabs vocal synthesis for Voice ID: %s", voice_id)
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=120)
        response.raise_for_status()
        with open(dest_path, "wb") as handle:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    handle.write(chunk)
        logger.info("Vocal synthesis successfully saved to: %s", dest_path)
    except Exception as exc:
        logger.error("ElevenLabs synthesis request failed: %s", exc)
        raise RenderPipelineError(f"Vocal synthesis failed: {exc}") from exc


def run_remotion_render(
    workspace_dir: str,
    composition_id: str,
    props: dict[str, Any],
    dest_path: str,
) -> None:
    """Execute the local Remotion CLI renderer to compile visual video frames."""
    logger.info("Triggering Remotion renderer for Composition: %s", composition_id)

    # Save parameters to a temporary JSON file for Remotion ingestion.
    props_file_path = os.path.join(workspace_dir, "remotion_props.json")
    with open(props_file_path, "w", encoding="utf-8") as props_file:
        json.dump(props, props_file)

    # Remotion CLI compilation command: leverages headless browser engine.
    cmd = [
        "npx",
        "remotion",
        "render",
        composition_id,
        dest_path,
        f"--props={props_file_path}",
        "--jpeg",  # faster frame extraction in headless environments
        "--quality=90",
        "--overwrite",
    ]

    try:
        process = subprocess.Popen(
            cmd,
            cwd=workspace_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        if process.stdout is not None:
            for line in process.stdout:
                clean_log = line.strip()
                if "Rendering" in clean_log or "Frame" in clean_log:
                    logger.info("[Remotion Engine] %s", clean_log)

        return_code = process.wait()
        if return_code != 0:
            raise subprocess.CalledProcessError(return_code, cmd)

        logger.info("Remotion visuals compiled successfully.")
    except Exception as exc:
        logger.error("Remotion compilation sub-process failed: %s", exc)
        raise RenderPipelineError(f"Remotion visual compilation failed: {exc}") from exc


def mux_audio_video_lossless(video_path: str, audio_path: str, output_path: str) -> None:
    """Execute a lossless FFmpeg stream copy filter graph to mux audio and video."""
    logger.info("Muxing audio and video visual tracks losslessly using direct stream copy...")

    # Direct copy for video (-c:v copy) avoids CPU-heavy re-encoding.
    # Convert synthesized MP3 audio to standard AAC (-c:a aac).
    # Shortest flag (-shortest) cuts the final duration to the vocal track length.
    cmd = [
        settings.ffmpeg_path,
        "-y",
        "-i",
        video_path,
        "-i",
        audio_path,
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-shortest",
        output_path,
    ]

    try:
        subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=True,
        )
        logger.info("FFmpeg lossless stream copy multiplexing completed successfully.")
    except subprocess.CalledProcessError as exc:
        logger.error("FFmpeg multiplexer failed with exit code %s", exc.returncode)
        logger.error("FFmpeg Stderr: %s", exc.stderr)
        raise RenderPipelineError(f"Lossless FFmpeg muxing failed: {exc.stderr}") from exc


def _extract_video_duration(video_path: str) -> float:
    """Return the duration of a video file in seconds using ffprobe."""
    ffprobe_path = os.getenv("FFPROBE_PATH", "ffprobe")
    cmd = [
        ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    try:
        output = subprocess.check_output(cmd, text=True).strip()
        return float(output) if output else 0.0
    except Exception as exc:
        logger.warning("Failed to extract video duration with ffprobe: %s", exc)
        return 0.0


@celery_app.task(
    bind=True,
    name="vibetech.render_job",
    time_limit=1800,  # 30-minute hard limit
    soft_time_limit=1500,  # 25-minute soft limit
    track_started=True,
)
def execute_video_render_pipeline(self, payload: dict[str, Any]) -> dict[str, Any]:
    """Distributed Celery rendering task.

    Asynchronously downloads Pexels B-roll, synthesizes ElevenLabs voice narration,
    triggers the Remotion CLI renderer, and losslessly overlays the audio track
    using FFmpeg.
    """
    task_id = self.request.id or str(uuid.uuid4())
    logger.info("Starting Video Render Pipeline Task ID: %s", task_id)
    self.update_state(
        state="PROGRESS",
        meta={"progress": 5, "status": "Initializing workspace environments"},
    )

    # Setup directories.
    temp_dir = tempfile.mkdtemp(prefix=f"vibetech_render_{task_id}_")
    logger.info("Using isolated scratch workspace: %s", temp_dir)

    try:
        # 1. Parse payload variables.
        project_id = payload.get("projectId") or str(uuid.uuid4())
        script_text = payload.get("scriptText")
        voice_id = payload.get("voiceId", "21m00Tcm4TlvDq8ikWAM")  # Default ElevenLabs voice
        broll_url = payload.get("brollUrl")  # Remote Pexels video source
        composition_id = payload.get("composition", "ShortsAvatarComposition")

        if not script_text:
            raise RenderPipelineError(
                "Narration scriptText parameter is missing from request payload."
            )
        if not broll_url:
            raise RenderPipelineError(
                "Pexels B-roll background video brollUrl parameter is missing from request payload."
            )

        # Define file paths in isolated directory.
        local_broll_path = os.path.join(temp_dir, "background_broll.mp4")
        synthesized_voice_path = os.path.join(temp_dir, "vocal_narration.mp3")
        remotion_mute_output = os.path.join(temp_dir, "remotion_visuals_only.mp4")
        final_mp4_output = os.path.join(temp_dir, f"{project_id}_final_1080p.mp4")

        # 2. Download Pexels B-roll asset.
        self.update_state(
            state="PROGRESS",
            meta={"progress": 15, "status": "Downloading Pexels B-roll assets"},
        )
        download_file(broll_url, local_broll_path)

        # 3. Synthesize vocal narration track with ElevenLabs API.
        self.update_state(
            state="PROGRESS",
            meta={"progress": 35, "status": "Synthesizing voice tracks with ElevenLabs"},
        )
        generate_elevenlabs_audio(script_text, voice_id, synthesized_voice_path)

        # 4. Align word-level subtitle timestamps with faster-whisper.
        self.update_state(
            state="PROGRESS",
            meta={"progress": 45, "status": "Aligning word-level subtitles with Whisper"},
        )
        subtitles = generate_subtitles(synthesized_voice_path)

        # 5. Compile video using Remotion CLI.
        self.update_state(
            state="PROGRESS",
            meta={"progress": 55, "status": "Running Remotion headless video layout compiler"},
        )
        remotion_project_root = str(_get_remotion_project_root())
        remotion_props: dict[str, Any] = {
            "brollVideoSrc": f"file://{local_broll_path}",
            "audioVoiceSrc": f"file://{synthesized_voice_path}",
            "scriptText": script_text,
            "subtitles": subtitles,
        }
        run_remotion_render(
            workspace_dir=remotion_project_root,
            composition_id=composition_id,
            props=remotion_props,
            dest_path=remotion_mute_output,
        )

        # 6. Fast lossless multiplexing graph (FFmpeg -c:v copy).
        self.update_state(
            state="PROGRESS",
            meta={"progress": 85, "status": "Stitching tracks losslessly via FFmpeg"},
        )
        mux_audio_video_lossless(
            video_path=remotion_mute_output,
            audio_path=synthesized_voice_path,
            output_path=final_mp4_output,
        )

        # 7. Publish final output asset to the configured public distribution directory.
        public_dest_dir = _get_public_output_dir()
        public_dest_dir.mkdir(parents=True, exist_ok=True)
        public_dest_file = public_dest_dir / f"{project_id}.mp4"
        shutil.copy(final_mp4_output, public_dest_file)

        app_url = settings.next_public_app_url or os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
        download_url = f"{app_url}/api/downloads/{project_id}.mp4"
        video_duration = _extract_video_duration(str(public_dest_file))

        logger.info("Render completed successfully! Output served at: %s", download_url)
        self.update_state(state="SUCCESS", meta={"progress": 100, "status": "Success"})
        return {
            "status": "success",
            "projectId": project_id,
            "taskId": task_id,
            "downloadUrl": download_url,
            "videoDurationSeconds": video_duration,
            "subtitles": subtitles,
        }

    except SoftTimeLimitExceeded:
        logger.error("Task ID: %s timed out. Exceeded Celery Soft Time Limit constraints.", task_id)
        self.update_state(state="FAILED", meta={"status": "Soft Time Limit Exceeded"})
        return {"status": "error", "message": "Render timeout exceeded runtime limits."}
    except Exception as exc:
        logger.error("Catastrophic failure during task %s: %s", task_id, exc)
        self.update_state(state="FAILED", meta={"status": "Catastrophic error", "error": str(exc)})
        return {"status": "error", "message": str(exc)}
    finally:
        # Cleanup isolated scratch workspace to preserve disk space.
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info("Isolated workspace directory cleaned up.")
