import asyncio
from io import BytesIO

from celery import Celery

from app.services.elevenlabs import ELEVEN_MULTILINGUAL_V2, synthesize_voice
from app.services.ffmpeg import render_video
from app.services.gcs import get_bucket
from app.services.whisper import transcribe_audio
from app.settings import settings

app = Celery("render_worker", broker=settings.redis_url, backend=settings.redis_url)


def _write_audio_to_temp(audio_bytes: bytes) -> str:
    """Write raw audio bytes to a temporary file and return the path."""
    import tempfile

    fd, path = tempfile.mkstemp(suffix=".mp3")
    with open(fd, "wb") as f:
        f.write(audio_bytes)
    return path


@app.task(bind=True)
def render_task(
    self,
    job_id: int,
    script_prompt: str,
    voice_id: str,
    audio_sample_rate: int,
    asset_paths: list[str],
    viseme_mapping: dict | None,
):
    """End-to-end asynchronous render task.

    Stages:
      1. Synthesize voiceover with ElevenLabs.
      2. Transcribe audio with Whisper for subtitle timing.
      3. Render final MP4 via FFmpeg.
      4. Upload result to GCS and return a signed URL.
    """

    async def _run():
        self.update_state(state="SYNTHESIZING_AUDIO", meta={"job_id": job_id})
        audio_bytes = await synthesize_voice(
            script_prompt,
            voice_id,
            sample_rate=audio_sample_rate,
            model_id=ELEVEN_MULTILINGUAL_V2,
            speed=1.0,
            strip_cues=True,
        )

        self.update_state(state="TRANSCRIBING", meta={"job_id": job_id})
        audio_temp_path = _write_audio_to_temp(audio_bytes)
        segments = await transcribe_audio(audio_temp_path)

        self.update_state(state="BUILDING_VIDEO", meta={"job_id": job_id})
        video_bytes = await render_video(
            audio_bytes=audio_bytes,
            asset_paths=asset_paths,
            segments=segments,
        )

        self.update_state(state="UPLOADING", meta={"job_id": job_id})
        output_path = f"renders/{job_id}.mp4"
        bucket = get_bucket()
        if bucket:
            blob = bucket.blob(output_path)
            blob.upload_from_file(BytesIO(video_bytes), content_type="video/mp4")
            output_url = blob.generate_signed_url(
                version="v4",
                expiration=settings.render_output_ttl_seconds,
                method="GET",
            )
        else:
            output_url = f"mock://{output_path}"

        return {
            "job_id": job_id,
            "status": "completed",
            "output_url": output_url,
            "segments": [segment.to_dict() for segment in segments],
        }

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_run())
        loop.close()
        return result
    except Exception as exc:
        self.update_state(state="FAILED", meta={"error": str(exc)})
        raise exc
