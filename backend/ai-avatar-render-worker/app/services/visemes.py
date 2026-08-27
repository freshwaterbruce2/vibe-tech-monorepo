from typing import Any

# Rive 8-viseme state machine labels.
VISeme_LABELS = ["Neutral", "Closed", "Wide", "Open", "Smile", "Round", "Frown", "Ah"]


def compute_viseme_mapping(audio_bytes: bytes) -> list[dict[str, Any]]:
    """Generate a deterministic viseme timeline from audio length.

    In production this would run phoneme recognition; for Phase 1 we return a
    placeholder 120 fps neutral-open oscillation.
    """
    frame_duration_ms = 1000 / 120
    duration_ms = max(len(audio_bytes) * 2, 1000)  # crude placeholder
    frames = []
    t = 0.0
    while t < duration_ms:
        label = VISeme_LABELS[int(t / 100) % len(VISeme_LABELS)]
        frames.append({"time_ms": round(t, 2), "viseme": label})
        t += frame_duration_ms
    return frames
