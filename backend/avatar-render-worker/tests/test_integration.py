import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
import pytest
import subprocess
from pathlib import Path

# Set environment variables for the test before importing worker code
os.environ["REMOTION_PROJECT_ROOT"] = str(Path(__file__).resolve().parents[3] / "apps" / "ai-avatar-youtube-saas")
os.environ["RENDER_OUTPUT_DIR"] = tempfile.mkdtemp(prefix="vibetech_test_render_out_")
os.environ["PUBLIC_RENDER_DIR"] = os.path.join(os.environ["RENDER_OUTPUT_DIR"], "public")
os.environ["FFMPEG_PATH"] = "ffmpeg"
os.environ["FFPROBE_PATH"] = "ffprobe"

from src.celery_render_worker import execute_video_render_pipeline

# Helper to generate dummy assets using FFmpeg
def generate_dummy_mp4(dest_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30",
        "-t", "2",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        dest_path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

def generate_dummy_mp3(dest_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono",
        "-t", "2",
        "-c:a", "libmp3lame",
        dest_path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

@pytest.fixture(scope="module", autouse=True)
def setup_teardown():
    # Setup
    os.makedirs(os.environ["PUBLIC_RENDER_DIR"], exist_ok=True)
    yield
    # Teardown: clean up render output directories
    shutil.rmtree(os.environ["RENDER_OUTPUT_DIR"], ignore_errors=True)

@patch("src.celery_render_worker.download_file")
@patch("src.celery_render_worker.generate_elevenlabs_audio")
@patch("src.celery_render_worker.generate_subtitles")
def test_avatar_render_pipeline_integration(
    mock_subtitles, mock_audio, mock_download
):
    # 1. Setup mock behaviors to avoid calling external paid APIs
    def mock_download_side_effect(url, dest_path):
        generate_dummy_mp4(dest_path)
    mock_download.side_effect = mock_download_side_effect

    def mock_audio_side_effect(text, voice_id, dest_path):
        generate_dummy_mp3(dest_path)
    mock_audio.side_effect = mock_audio_side_effect

    mock_subtitles.return_value = [
        {"word": "Welcome", "start": 0.0, "end": 0.8, "confidence": 0.99},
        {"word": "to", "start": 0.8, "end": 1.2, "confidence": 0.99},
        {"word": "VibeTech", "start": 1.2, "end": 2.0, "confidence": 0.99}
    ]

    # 2. Define test payload targeting the newly registered AvatarVideo composition
    payload = {
        "projectId": "integration-test-job-999",
        "scriptText": "Welcome to VibeTech",
        "voiceId": "21m00Tcm4TlvDq8ikWAM",
        "brollUrl": "https://mock.pexels.com/v1/fake-broll.mp4",
        "composition": "AvatarVideo"  # Root composition registry ID
    }

    # 3. Instantiate the Celery task and run it synchronously (bind=True requires a mock self)
    mock_self = MagicMock()
    mock_self.request.id = "integration-test-task-999"
    
    # Run the rendering pipeline
    result = execute_video_render_pipeline.run.__func__(mock_self, payload)

    # 4. Verify results
    assert result is not None
    assert result.get("status") == "success"
    
    # Construct expected output file path
    output_path = os.path.join(os.environ["PUBLIC_RENDER_DIR"], f"{payload['projectId']}.mp4")
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 0
    
    # Double check downloadUrl details
    download_url = result.get("downloadUrl")
    assert download_url is not None
    assert f"{payload['projectId']}.mp4" in download_url
    assert str(Path(output_path).parent.resolve()) == str(Path(os.environ["PUBLIC_RENDER_DIR"]).resolve())
