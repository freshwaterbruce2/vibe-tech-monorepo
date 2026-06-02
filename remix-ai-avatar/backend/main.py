import os
import json
import uuid
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from openai import AsyncOpenAI
import httpx
from celery.result import AsyncResult

# Import Celery app instance and celery task
from worker import execute_render_pipeline

app = FastAPI(title="MoneyPrinterTurbo Scaled Architecture (Phase 8)")

# Environment variables setup (using placeholders for local dev)
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "YOUR_PEXELS_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY")

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# ==========================================
# Data Models (Pydantic schemas)
# ==========================================

class ScriptGenerationRequest(BaseModel):
    topic: str
    duration_seconds: Optional[int] = 60

class StoryScene(BaseModel):
    scene_id: int
    narration: str
    search_keywords: List[str]
    b_roll_url: Optional[str] = None
    thumbnail_url: Optional[str] = None

class ScriptResponse(BaseModel):
    topic: str
    status: str
    scenes: List[StoryScene]


# Video Rendering Data Models
class SceneData(BaseModel):
    scene_id: int
    narration: str
    b_roll_url: str

class VoiceConfig(BaseModel):
    voice_id: str = "eleven_multilingual_v2"
    stability: float = 0.5
    similarity: float = 0.75

class RenderRequest(BaseModel):
    project_id: str
    target_resolution: str = "1080x1920"
    scenes: List[SceneData]
    voice_config: VoiceConfig

class RenderStatus(BaseModel):
    job_id: str
    status: str  # "queued", "downloading_assets", "synthesizing_audio", "compositing", "rendering", "completed", "failed"
    progress_percentage: int
    final_video_url: Optional[str] = None
    error_message: Optional[str] = None


# ==========================================
# Script & Footage Generation Pipeline
# ==========================================

async def generate_script_llm(topic: str, duration: int) -> List[dict]:
    """Calls OpenAI to generate a YouTube Short script structured scene-by-scene."""
    prompt = f"""
    You are an expert YouTube scriptwriter and video producer. Output a JSON array of scenes for a video about "{topic}".
    The total video duration should be around {duration} seconds. Provide around 3 to 5 scenes.
    For each scene, provide:
    - 'scene_id': sequential integer starting from 1.
    - 'narration': the spoken script for that scene (around 15-20 words). Ensure it is engaging and NOT 'AI slop'.
    - 'search_keywords': an array of 1 to 2 visual search keywords optimized for fetching B-roll from a stock footage API (e.g., "dark city skyline", "cyberpunk rain").
    
    Output strictly valid JSON! Do NOT use Markdown code blocks. Just the raw JSON array.
    """
    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={ "type": "json_object" }
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        if isinstance(data, dict):
            for key in ["scenes", "data", "script"]:
                if key in data:
                    return data[key]
            return [data]
        return data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM output could not be parsed as JSON.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API Error: {str(e)}")


async def fetch_pexels_broll(keywords: List[str]) -> tuple[Optional[str], Optional[str]]:
    """Calls Pexels Video API to fetch B-Roll footage based on the best keyword."""
    query = " ".join(keywords)
    url = f"https://api.pexels.com/videos/search?query={query}&per_page=1&orientation=landscape"
    headers = {"Authorization": PEXELS_API_KEY}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            videos = data.get("videos", [])
            if not videos:
                return (None, None)
            first_video = videos[0]
            thumbnail_url = first_video.get("image")
            video_files = first_video.get("video_files", [])
            hd_files = [v for v in video_files if v.get("quality") == "hd" or v.get("width", 0) >= 1280]
            if hd_files:
                return (hd_files[0].get("link"), thumbnail_url)
            elif video_files:
                return (video_files[0].get("link"), thumbnail_url)
            return (None, thumbnail_url)
        except Exception:
            return (None, None)


# ==========================================
# FastAPI Endpoints & Routers
# ==========================================

@app.post("/api/v1/generate-script", response_model=ScriptResponse)
async def generate_video_script(request: ScriptGenerationRequest):
    """Full orchestration pipeline for script generation and B-Roll sourcing."""
    scenes_data = await generate_script_llm(request.topic, request.duration_seconds)
    story_scenes = []
    for s_data in scenes_data:
        try:
            scene_id = s_data.get("scene_id", len(story_scenes) + 1)
            narration = s_data.get("narration", "")
            keywords = s_data.get("search_keywords", [request.topic])
            b_roll_url, thumbnail_url = await fetch_pexels_broll(keywords)
            scene = StoryScene(
                scene_id=scene_id,
                narration=narration,
                search_keywords=keywords,
                b_roll_url=b_roll_url,
                thumbnail_url=thumbnail_url
            )
            story_scenes.append(scene)
        except Exception as e:
            print(f"Error processing scene {s_data}: {e}")
            continue
    return ScriptResponse(topic=request.topic, status="success", scenes=story_scenes)


@app.post("/api/v1/render", response_model=RenderStatus)
@app.post("/render", response_model=RenderStatus)
async def start_render_job(request: RenderRequest):
    """
    Asynchronously registers a render job, pushes rendering parameters to the Celery Redis
    distributed task queue directly, and returns the Celery tracking ID with queued status.
    """
    try:
        # Convert Pydantic request object to serializable dict for Celery
        payload_dict = request.model_dump()
        
        # Enqueue rendering task in Celery worker context asynchronously
        task = execute_render_pipeline.delay(payload_dict)
        
        return RenderStatus(
            job_id=task.id,
            status="queued",
            progress_percentage=0,
            final_video_url=None,
            error_message=None
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to submit task rendering parameters to Redis broker: {str(e)}"
        )


@app.get("/api/v1/render/{task_id}", response_model=RenderStatus)
@app.get("/api/v1/status/{task_id}", response_model=RenderStatus)
@app.get("/status/{task_id}", response_model=RenderStatus)
async def get_render_job_status(task_id: str):
    """
    Queries Celery's Redis result backend for the dynamic execution progress state.
    Provides fallback compatibility for legacy /render/ polling calls.
    """
    try:
        task_result = AsyncResult(task_id, app=execute_render_pipeline.app)
        state_name = task_result.state
        
        # Default fallback configurations
        status_label = "queued"
        progress_percentage = 0
        final_video_url = None
        error_message = None
        
        if state_name == "SUCCESS":
            status_label = "completed"
            progress_percentage = 100
            result_data = task_result.result
            if isinstance(result_data, dict):
                final_video_url = result_data.get("final_video_url")
                error_message = result_data.get("error_message")
                if error_message:
                    status_label = "failed"
            else:
                final_video_url = f"https://storage.googleapis.com/serenity-storage/renders/{task_id}/final_output_1080p.mp4"
                
        elif state_name == "FAILURE":
            status_label = "failed"
            progress_percentage = 100
            error_message = str(task_result.info or "Unknown task execution error inside celery worker.")
            
        elif state_name == "PENDING":
            status_label = "queued"
            progress_percentage = 0
            
        else:
            # Catch intermediate custom task progress updates published using update_state()
            status_label = state_name.lower()
            meta_info = task_result.info
            if isinstance(meta_info, dict):
                progress_percentage = meta_info.get("progress", 50)
                # Fallback to custom status if set
                if "status" in meta_info:
                    status_label = meta_info.get("status", status_label)
            else:
                progress_percentage = 50

        return RenderStatus(
            job_id=task_id,
            status=status_label,
            progress_percentage=progress_percentage,
            final_video_url=final_video_url,
            error_message=error_message
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch execution state from result backend: {str(e)}"
        )
