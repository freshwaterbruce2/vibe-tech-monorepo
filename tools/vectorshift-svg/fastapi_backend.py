import json
import os
import re
from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from vector_engine import VectorEngine

app = FastAPI(title="VectorShift SVG Local Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
DEFAULT_OUTPUT_DIR = Path(os.getenv("VECTORSHIFT_OUTPUT_DIR", "D:/VectorShift_Outputs"))
MAX_FILES = int(os.getenv("VECTORSHIFT_MAX_FILES", "100"))
MAX_UPLOAD_BYTES = int(os.getenv("VECTORSHIFT_MAX_UPLOAD_MB", "25")) * 1024 * 1024


class EngineSettings(BaseModel):
    output_dir: str = Field(default=str(DEFAULT_OUTPUT_DIR))
    model: str = Field(default="svg-wrapper")
    vram_gb: int = Field(default=12, ge=1, le=48)


class SettingsUpdate(BaseModel):
    outputDir: str | None = None
    model: str | None = None
    vramGb: int | None = Field(default=None, ge=1, le=48)


settings = EngineSettings()
engine = VectorEngine()


def get_output_dir() -> Path:
    output_dir = Path(settings.output_dir).expanduser()
    if not output_dir.is_absolute():
        output_dir = DEFAULT_OUTPUT_DIR / output_dir

    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir.resolve()


def ensure_inside_output_dir(path: Path, output_dir: Path) -> Path:
    resolved = path.resolve()
    if resolved != output_dir and output_dir not in resolved.parents:
        raise HTTPException(status_code=400, detail="Requested file is outside the output directory.")
    return resolved


def sanitize_stem(filename: str | None, fallback: str) -> str:
    raw_name = Path(filename or fallback).name
    stem = Path(raw_name).stem
    safe = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-_")
    return (safe or fallback)[:80]


def unique_output_path(output_dir: Path, stem: str) -> Path:
    candidate = output_dir / f"{stem}.svg"
    counter = 2
    while candidate.exists():
        candidate = output_dir / f"{stem}-{counter}.svg"
        counter += 1
    return candidate


def settings_payload() -> dict[str, str | int]:
    return {
        "outputDir": str(get_output_dir()),
        "model": settings.model,
        "vramGb": settings.vram_gb,
        "maxFiles": MAX_FILES,
        "maxUploadMb": MAX_UPLOAD_BYTES // (1024 * 1024),
    }


@app.get("/api/health")
async def health():
    return {"status": "ok", "settings": settings_payload()}


@app.get("/api/settings")
async def get_settings():
    return settings_payload()


@app.post("/api/settings")
async def update_settings(update: SettingsUpdate):
    if update.outputDir:
        requested_dir = Path(update.outputDir).expanduser()
        if not requested_dir.is_absolute():
            requested_dir = DEFAULT_OUTPUT_DIR / requested_dir
        requested_dir.mkdir(parents=True, exist_ok=True)
        settings.output_dir = str(requested_dir.resolve())

    if update.model:
        settings.model = update.model

    if update.vramGb is not None:
        settings.vram_gb = update.vramGb

    return settings_payload()


@app.post("/api/batch-process")
async def process_batch(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files were uploaded.")
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Batch limit is {MAX_FILES} files.")

    output_dir = get_output_dir()
    uploaded_files = []

    for index, file in enumerate(files):
        display_name = Path(file.filename or f"image-{index + 1}").name
        extension = Path(display_name).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            uploaded_files.append(
                {
                    "index": index,
                    "filename": display_name,
                    "contents": None,
                    "error": "Unsupported file format.",
                    "status": "skipped",
                }
            )
            continue

        try:
            contents = await file.read(MAX_UPLOAD_BYTES + 1)
            if len(contents) > MAX_UPLOAD_BYTES:
                raise ValueError(f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit.")

            uploaded_files.append(
                {
                    "index": index,
                    "filename": display_name,
                    "contents": contents,
                    "error": None,
                    "status": "ready",
                }
            )
        except Exception as error:
            uploaded_files.append(
                {
                    "index": index,
                    "filename": display_name,
                    "contents": None,
                    "error": str(error),
                    "status": "failed",
                }
            )

    async def generate_responses():
        total_files = len(uploaded_files)
        yield json.dumps({"type": "start", "total": total_files, "output_dir": str(output_dir)}) + "\n"

        for item in uploaded_files:
            index = item["index"]
            display_name = item["filename"]

            if item["status"] in {"skipped", "failed"}:
                yield json.dumps(
                    {
                        "type": "progress",
                        "current": index + 1,
                        "total": total_files,
                        "filename": display_name,
                        "status": item["status"],
                        "error": item["error"],
                    }
                ) + "\n"
                continue

            try:
                image_format = Path(display_name).suffix.lstrip(".").lower()
                svg_output = engine.process_image(item["contents"], image_format=image_format, preset=settings.model)
                output_path = unique_output_path(output_dir, sanitize_stem(display_name, f"image-{index + 1}"))
                output_path.write_text(svg_output, encoding="utf-8")

                yield json.dumps(
                    {
                        "type": "progress",
                        "current": index + 1,
                        "total": total_files,
                        "filename": display_name,
                        "output_path": str(output_path),
                        "output_name": output_path.name,
                        "download_url": f"/api/download/{output_path.name}",
                        "status": "success",
                    }
                ) + "\n"
            except Exception as error:
                yield json.dumps(
                    {
                        "type": "progress",
                        "current": index + 1,
                        "total": total_files,
                        "filename": display_name,
                        "error": str(error),
                        "status": "failed",
                    }
                ) + "\n"

        yield json.dumps({"type": "complete"}) + "\n"

    return StreamingResponse(generate_responses(), media_type="application/x-ndjson")


@app.get("/api/download/{output_name}")
async def download_output(output_name: str):
    output_dir = get_output_dir()
    safe_name = Path(output_name).name
    if safe_name != output_name or not safe_name.lower().endswith(".svg"):
        raise HTTPException(status_code=400, detail="Invalid output filename.")

    output_path = ensure_inside_output_dir(output_dir / safe_name, output_dir)
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Output file not found.")

    return FileResponse(output_path, media_type="image/svg+xml", filename=safe_name)


@app.post("/api/purge-cache")
async def purge_cache():
    output_dir = get_output_dir()
    deleted = 0

    for path in output_dir.glob("*.svg"):
        ensure_inside_output_dir(path, output_dir)
        path.unlink()
        deleted += 1

    return {"status": "success", "message": f"Deleted {deleted} SVG file(s)."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("fastapi_backend:app", host="127.0.0.1", port=8000, reload=True)
