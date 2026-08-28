import re

import httpx

from app.settings import settings

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

# Models exposed by ElevenLabs.
ELEVEN_FLASH_V2_5 = "eleven_flash_v2_5"
ELEVEN_MULTILINGUAL_V2 = "eleven_multilingual_v2"

# Strip bracketed emotional/performance directions such as [sighs], [laughs],
# [sighs contentedly] from narration text so the voice engine interprets the
# emotion without reading the direction aloud.
EMOTIONAL_CUE_PATTERN = re.compile(r"\[[^\]]+\]")

DEFAULT_VOICE_SETTINGS = {
    "stability": 0.50,
    "similarity_boost": 0.75,
    "style": 0.00,
    "use_speaker_boost": True,
}


def strip_emotional_cues(text: str) -> str:
    """Remove bracketed stage directions from a narration script."""
    return EMOTIONAL_CUE_PATTERN.sub("", text).strip()


def build_voice_settings(
    stability: float = 0.50,
    similarity_boost: float = 0.75,
    style: float = 0.00,
    speed: float = 1.0,
    use_speaker_boost: bool = True,
) -> dict:
    """Build an ElevenLabs voice-settings payload with safe defaults.

    Style is locked to 0.00 by default to minimize latency and model instability.
    Speed is clamped to ElevenLabs' supported 0.7-1.2 range.
    """
    return {
        "stability": stability,
        "similarity_boost": similarity_boost,
        "style": max(0.0, style),
        "speed": max(0.7, min(1.2, speed)),
        "use_speaker_boost": use_speaker_boost,
    }


async def synthesize_voice(
    text: str,
    voice_id: str,
    sample_rate: int = 44100,
    model_id: str = ELEVEN_MULTILINGUAL_V2,
    speed: float = 1.0,
    strip_cues: bool = True,
) -> bytes:
    """Synthesize speech through ElevenLabs.

    Parameters
    ----------
    text:
        Raw narration script. Emotional cues like ``[laughs]`` are stripped
        before the request unless ``strip_cues`` is ``False``.
    voice_id:
        ElevenLabs voice identifier.
    sample_rate:
        Output sample rate. ``44100`` is recommended for final renders;
        ``16000`` can be used for low-latency drafts.
    model_id:
        ``eleven_flash_v2_5`` for sub-75ms drafts or
        ``eleven_multilingual_v2`` for high-fidelity final renders.
    speed:
        Playback speed factor clamped to ``0.7``-``1.2``.
    strip_cues:
        When ``True`` (default), bracketed stage directions are removed.
    """
    narration = strip_emotional_cues(text) if strip_cues else text

    if not settings.elevenlabs_api_key:
        # Deterministic fallback for tests / missing keys.
        return b"FAKE_AUDIO_" + narration.encode()

    voice_settings = build_voice_settings(speed=speed)
    output_format = f"mp3_{sample_rate}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            ELEVENLABS_URL.format(voice_id=voice_id),
            params={"model_id": model_id},
            headers={
                "xi-api-key": settings.elevenlabs_api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": narration,
                "voice_settings": voice_settings,
                "output_format": output_format,
            },
        )
        response.raise_for_status()
        return response.content
