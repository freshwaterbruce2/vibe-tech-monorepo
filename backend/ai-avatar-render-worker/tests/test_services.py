import pytest
from pydub.generators import Sine

from app.services.elevenlabs import (
    ELEVEN_FLASH_V2_5,
    ELEVEN_MULTILINGUAL_V2,
    build_voice_settings,
    strip_emotional_cues,
    synthesize_voice,
)
from app.services.ffmpeg import render_video
from app.services.subtitles import generate_ass_subtitles
from app.services.whisper import TranscriptionSegment


def test_strip_emotional_cues():
    raw = "Hello [sighs contentedly] world [laughs]"
    assert strip_emotional_cues(raw) == "Hello  world"


@pytest.mark.asyncio
async def test_synthesize_voice_fallback():
    audio = await synthesize_voice("hello world", "test-voice", sample_rate=16000)
    assert audio.startswith(b"FAKE_AUDIO_")


def test_build_voice_settings_defaults():
    settings = build_voice_settings()
    assert settings["stability"] == 0.50
    assert settings["similarity_boost"] == 0.75
    assert settings["style"] == 0.00
    assert settings["speed"] == 1.0
    assert settings["use_speaker_boost"] is True


def test_build_voice_settings_clamps_speed():
    assert build_voice_settings(speed=0.1)["speed"] == 0.7
    assert build_voice_settings(speed=5.0)["speed"] == 1.2


def test_model_constants():
    assert ELEVEN_FLASH_V2_5 == "eleven_flash_v2_5"
    assert ELEVEN_MULTILINGUAL_V2 == "eleven_multilingual_v2"


def test_generate_ass_subtitles():
    segments = [
        TranscriptionSegment(0.0, 1.2, "Hello world"),
        TranscriptionSegment(1.3, 2.5, "This is a test"),
    ]
    path = generate_ass_subtitles(segments, "test.ass", resolution=(1920, 1080))
    content = path.read_text(encoding="utf-8")
    assert "Hello world" in content
    assert "0:00:00.00,0:00:01.20" in content
    assert "[Events]" in content


@pytest.mark.asyncio
async def test_render_video_without_subtitles(tmp_path):
    audio = Sine(440).to_audio_segment(duration=1000)
    audio_bytes = audio.export(format="mp3").read()
    video_bytes = await render_video(audio_bytes, [], segments=None)
    assert len(video_bytes) > 1000


@pytest.mark.asyncio
async def test_render_video_with_subtitles(tmp_path):
    audio = Sine(440).to_audio_segment(duration=1500)
    audio_bytes = audio.export(format="mp3").read()
    segments = [
        TranscriptionSegment(0.0, 0.7, "Hello"),
        TranscriptionSegment(0.8, 1.4, "World"),
    ]
    video_bytes = await render_video(audio_bytes, [], segments=segments)
    assert len(video_bytes) > 1000
