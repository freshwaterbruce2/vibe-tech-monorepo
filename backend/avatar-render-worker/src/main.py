"""FastAPI entry point for the avatar render worker."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .celery_render_worker import execute_video_render_pipeline
from .config import settings
from .worker import celery_app


class CreateRenderPayloadRequest(BaseModel):
    """Direct render payload matching the Studio panel worker expectations."""

    model_config = {"populate_by_name": True}

    project_id: str = Field(..., alias="projectId", min_length=1)
    script_text: str = Field(..., alias="scriptText", min_length=1)
    voice_id: str = Field(
        default="21m00Tcm4TlvDq8ikWAM", alias="voiceId", min_length=1
    )
    broll_url: str = Field(..., alias="brollUrl", min_length=1)
    composition: str = Field(default="ShortsAvatarComposition", alias="composition")


class RenderJobResponse(BaseModel):
    job_id: str
    project_id: str
    status: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.render_output_dir.mkdir(parents=True, exist_ok=True)
    (settings.render_output_dir / 'public').mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title='Avatar Render Worker',
    lifespan=lifespan,
)


@app.get('/health')
async def health() -> dict:
    return {
        'ok': True,
        'app': settings.app_name,
        'redis': celery_app.conf.broker_url,
    }


@app.post('/render', response_model=RenderJobResponse)
async def create_render_job(request: CreateRenderPayloadRequest) -> RenderJobResponse:
    """Queue a render job using the full asynchronous Celery render worker."""
    try:
        task = execute_video_render_pipeline.delay(request.model_dump(by_alias=True))
        return RenderJobResponse(
            job_id=task.id,
            project_id=request.project_id,
            status='queued',
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get('/jobs/{job_id}', response_model=RenderJobResponse)
async def get_job(job_id: str) -> RenderJobResponse:
    result = celery_app.AsyncResult(job_id)
    project_id = ''
    if result.result and isinstance(result.result, dict):
        project_id = result.result.get('projectId') or result.result.get(
            'project_id', ''
        )
    return RenderJobResponse(
        job_id=job_id,
        project_id=project_id,
        status=result.status.lower(),
    )


if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'src.main:app',
        host=settings.host,
        port=settings.port,
        reload=True,
    )
