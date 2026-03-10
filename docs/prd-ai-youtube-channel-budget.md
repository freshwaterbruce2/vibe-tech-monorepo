# Budget AI YouTube Channel Stack

## Free/Low-Cost Alternatives

### Voice Generation (Replace $22/mo ElevenLabs)

| Option | Cost | Quality | Setup |
|--------|------|---------|-------|
| **Edge TTS** | FREE | ★★★★☆ | Easy (Python/CLI) |
| **Coqui XTTS** | FREE | ★★★★☆ | Medium (self-host) |
| **Bark** | FREE | ★★★☆☆ | Medium (GPU needed) |
| **Piper TTS** | FREE | ★★★☆☆ | Easy |
| **OpenAI TTS** | ~$3/mo | ★★★★☆ | Easy (API) |

**Recommendation:** Edge TTS (Microsoft's neural voices, completely free, sounds great)

```python
# Edge TTS example
import edge_tts
await edge_tts.Communicate("Hello world", "en-US-GuyNeural").save("output.mp3")
```

---

### Avatar Video (Replace $29/mo HeyGen)

| Option | Cost | Quality | Setup |
|--------|------|---------|-------|
| **SadTalker** | FREE | ★★★☆☆ | GPU needed |
| **Wav2Lip** | FREE | ★★★☆☆ | GPU needed |
| **LivePortrait** | FREE | ★★★★☆ | GPU needed |
| **Hedra** | FREE tier | ★★★★☆ | Easy (web) |
| **D-ID** | $6/mo | ★★★★☆ | Easy (API) |

**Recommendation:** 
- **Hedra** - Free tier, good quality, web-based
- **SadTalker/LivePortrait** - Free but needs GPU (can use Google Colab free)

---

### Script Generation (Reduce ~$20/mo Claude)

| Option | Cost | Quality | Notes |
|--------|------|---------|-------|
| **DeepSeek V3** | ~$1/mo | ★★★★☆ | 95% of Claude quality, 20x cheaper |
| **Llama 3.3 70B** | FREE | ★★★★☆ | Self-host or Groq free tier |
| **Mistral** | FREE tier | ★★★★☆ | Good for scripts |
| **Gemini Flash** | FREE tier | ★★★☆☆ | 15 RPM free |

**Recommendation:** DeepSeek API ($0.14/M input, $0.28/M output) — already your default model!

---

## Budget Stack Comparison

### Original Stack: ~$81/mo
| Service | Cost |
|---------|------|
| ElevenLabs | $22 |
| HeyGen | $29 |
| Claude API | $20 |
| Compute | $10 |
| **Total** | **$81** |

### Budget Stack A: ~$10/mo
| Service | Cost |
|---------|------|
| Edge TTS | FREE |
| Hedra (free tier) | FREE |
| DeepSeek API | ~$5 |
| Compute | ~$5 |
| **Total** | **~$10** |

### Budget Stack B: ~$0-5/mo (Full DIY)
| Service | Cost |
|---------|------|
| Edge TTS | FREE |
| SadTalker (Colab) | FREE |
| Llama 3.3 (Groq) | FREE |
| Local compute | ~$0-5 |
| **Total** | **~$0-5** |

---

## Detailed Free Stack

### 1. Voice: Edge TTS (FREE)
Microsoft's neural voices, 300+ voices, multiple languages.

```bash
pip install edge-tts
edge-tts --text "Your script here" --voice en-US-GuyNeural --write-media output.mp3
```

Best voices:
- `en-US-GuyNeural` (male, natural)
- `en-US-JennyNeural` (female, natural)
- `en-US-AriaNeural` (female, expressive)
- `en-GB-RyanNeural` (British male)

### 2. Avatar: Hedra or SadTalker

**Hedra (easiest):**
- Free tier: ~12 videos/month
- Web UI at hedra.com
- Upload image + audio → video

**SadTalker (unlimited, needs GPU):**
```bash
# Google Colab notebook available
# Or local with NVIDIA GPU
git clone https://github.com/OpenTalker/SadTalker
python inference.py --driven_audio audio.wav --source_image avatar.png
```

**LivePortrait (newer, better quality):**
```bash
git clone https://github.com/KwaiVGI/LivePortrait
# Better expressions, more natural movement
```

### 3. Scripts: DeepSeek or Groq

**DeepSeek (recommended):**
- $0.14/M input tokens, $0.28/M output
- 50 videos = ~$2-3/month
- API compatible with OpenAI SDK

**Groq (free tier):**
- Llama 3.3 70B
- 14,400 tokens/min free
- Fast inference

### 4. Video Assembly: FFmpeg + MoviePy (FREE)

```python
# Combine avatar video with overlays
from moviepy.editor import *

avatar = VideoFileClip("avatar.mp4")
overlay = ImageClip("subscribe.png").set_duration(5).set_pos(("right", "bottom"))
final = CompositeVideoClip([avatar, overlay])
final.write_videofile("output.mp4")
```

### 5. Thumbnails: Flux/SDXL (FREE)

Local image generation with ComfyUI or Automatic1111:
- Flux.1 (best quality, needs 24GB VRAM or use Replicate)
- SDXL (good quality, 8GB VRAM)

Or use Canva free tier for templates.

---

## GPU Options for Free Processing

| Option | GPU | Cost | Limits |
|--------|-----|------|--------|
| Google Colab | T4 | FREE | ~4h/day |
| Kaggle | T4x2 | FREE | 30h/week |
| Lightning.ai | T4 | FREE | 22h/month |
| RunPod | Various | ~$0.20/hr | Pay-as-go |

**Recommendation:** Google Colab for occasional use, RunPod for heavy production (~$5-10/mo)

---

## Ultra-Budget Pipeline

```
Topic (Groq/free) 
    ↓
Script (DeepSeek ~$0.05/script)
    ↓
Voice (Edge TTS - FREE)
    ↓
Avatar (Hedra free tier OR SadTalker on Colab)
    ↓
Assembly (FFmpeg/MoviePy - FREE)
    ↓
Thumbnail (Canva free OR local Flux)
    ↓
Upload (YouTube API - FREE)

TOTAL: $0-10/month for 20+ videos
```

---

## Trade-offs

### Free vs Paid Quality

| Aspect | Free Stack | Paid Stack |
|--------|------------|------------|
| Voice naturalness | 85% | 98% |
| Lip sync accuracy | 70% | 95% |
| Avatar realism | 75% | 95% |
| Setup time | 4-8 hours | 1 hour |
| Maintenance | Medium | Low |
| Scalability | Limited | High |

### When to Upgrade
- Channel hits 10K subs → upgrade voice (ElevenLabs)
- Revenue > $500/mo → upgrade avatar (HeyGen)
- Time is money → pay for convenience

---

## Recommended Budget Path

**Month 1-3: Prove concept ($0-10/mo)**
- Edge TTS + Hedra free + DeepSeek
- Validate content works, find audience

**Month 4-6: Optimize ($20-40/mo)**
- Upgrade to D-ID ($6/mo) for better avatars
- Maybe OpenAI TTS ($10/mo) for voice variety
- RunPod for faster processing

**Month 7+: Scale with revenue**
- Reinvest ad revenue into better tools
- HeyGen/ElevenLabs when justified

---

## Quick Start (Free Stack)

1. **Install tools:**
```bash
pip install edge-tts moviepy
```

2. **Get Hedra account:** hedra.com (free tier)

3. **Get DeepSeek API:** platform.deepseek.com (~$5 credit free)

4. **Create avatar image:** Use Midjourney/DALL-E or stock photo

5. **First video pipeline:**
   - DeepSeek → script
   - Edge TTS → audio
   - Hedra → avatar video
   - MoviePy → add overlays
   - YouTube upload

**Ready to test the free stack?**
