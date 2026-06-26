from fastapi import FastAPI
from pydantic import BaseModel

from app.settings import settings
from app.tasks import render_task

app = FastAPI(title="VibeTech AI Avatar Render Worker")


class RenderRequest(BaseModel):
    job_id: int
    script_prompt: str
    voice_id: str
    audio_sample_rate: int = 16000
    asset_paths: list[str]
    viseme_mapping: dict | None = None


@app.get("/health")
async def health():
    return {"status": "ok", "bucket": settings.gcs_bucket_name}


@app.post("/render")
async def enqueue_render(request: RenderRequest):
    task = render_task.delay(
        request.job_id,
        request.script_prompt,
        request.voice_id,
        request.audio_sample_rate,
        request.asset_paths,
        request.viseme_mapping,
    )
    return {"job_id": request.job_id, "task_id": task.id, "status": "queued"}


@app.get("/render/{job_id}")
async def get_status(job_id: int, task_id: str):
    result = render_task.AsyncResult(task_id)
    return {
        "job_id": job_id,
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }
