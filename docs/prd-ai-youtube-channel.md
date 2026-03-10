# PRD: Automated AI YouTube Channel

**Version:** 1.0
**Date:** 2026-01-27
**Author:** Vibe (AI Assistant)
**Status:** Draft

---

## 1. Executive Summary

Build a fully automated YouTube content pipeline featuring an AI-generated avatar host. The system will generate scripts, produce videos with a consistent AI persona, and publish to YouTube on a schedule — with minimal human intervention.

---

## 2. Problem Statement

Creating consistent YouTube content is:
- **Time-intensive** — scripting, filming, editing, publishing
- **Personality-dependent** — creator burnout, availability issues
- **Expensive** — studio, equipment, talent costs

**Solution:** An AI-powered pipeline that generates, produces, and publishes content autonomously while maintaining a consistent brand identity through an AI avatar.

---

## 3. Goals & Success Metrics

### Goals
1. Publish 3-7 videos per week without manual intervention
2. Build a monetizable channel (1K subs, 4K watch hours)
3. Create a recognizable AI persona/brand
4. Keep per-video cost under $5

### Success Metrics
| Metric | Target (3 months) | Target (6 months) |
|--------|-------------------|-------------------|
| Subscribers | 1,000 | 10,000 |
| Videos published | 50 | 150 |
| Avg. views per video | 500 | 2,000 |
| Watch time (hours) | 4,000 | 20,000 |
| Cost per video | < $5 | < $3 |

---

## 4. Target Audience

### Primary Niches (Choose 1-2)
- **Tech explainers** — AI news, coding tutorials, gadget reviews
- **Finance/Crypto** — Market updates, investment tips
- **Productivity** — Tools, workflows, life hacks
- **Gaming** — News, reviews, tier lists
- **Shorts/Clips** — Viral facts, motivational, humor

### Audience Profile
- Age: 18-45
- Interest: Learning, entertainment, staying informed
- Behavior: Daily YouTube consumption, mobile-first

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│  │  TOPIC   │──▶│  SCRIPT  │──▶│  AUDIO   │──▶│  VIDEO   │    │
│  │ RESEARCH │   │   GEN    │   │   GEN    │   │   GEN    │    │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘    │
│       │              │              │              │           │
│       ▼              ▼              ▼              ▼           │
│   Trending API    Claude/     ElevenLabs      HeyGen/         │
│   Reddit/X/News   GPT-4       Voice Clone     D-ID            │
│                                                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                   │
│  │  ASSETS  │──▶│ ASSEMBLY │──▶│ PUBLISH  │                   │
│  │   GEN    │   │  & QA    │   │          │                   │
│  └──────────┘   └──────────┘   └──────────┘                   │
│       │              │              │                          │
│       ▼              ▼              ▼                          │
│   DALL-E/Flux    FFmpeg/      YouTube API                     │
│   Stock APIs     Remotion     Scheduler                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Component Breakdown

### 6.1 Topic Research Engine
**Purpose:** Find trending, relevant topics with viral potential

**Data Sources:**
- YouTube Trending API
- Google Trends
- Reddit (subreddit monitoring)
- X/Twitter trends
- News APIs (NewsAPI, Bing News)
- Competitor channel analysis

**Output:** Ranked list of topics with:
- Search volume
- Competition score
- Viral potential score
- Suggested angle/hook

**Tech Stack:**
- Python scrapers
- LLM for topic scoring/filtering
- Cron job (daily refresh)

---

### 6.2 Script Generator
**Purpose:** Create engaging, SEO-optimized video scripts

**Input:** Topic + target length + style guidelines

**Output:**
- Hook (first 5 seconds)
- Main content (structured segments)
- Call-to-action
- Title options (A/B testing)
- Description + tags
- Thumbnail text suggestions

**Tech Stack:**
- Claude 3.5/GPT-4 for generation
- Custom prompts per content type
- Brand voice fine-tuning

**Script Structure:**
```
[HOOK - 0:00-0:05]
Attention-grabbing opener

[INTRO - 0:05-0:30]
Context + what viewer will learn

[MAIN CONTENT - 0:30-X:XX]
- Point 1 + visual cue
- Point 2 + visual cue
- Point 3 + visual cue

[CTA - Last 15 sec]
Subscribe + engagement prompt
```

---

### 6.3 Voice Generation
**Purpose:** Convert script to natural speech with consistent voice

**Options (ranked):**

| Platform | Quality | Cost | Clone? | API |
|----------|---------|------|--------|-----|
| ElevenLabs | ★★★★★ | $22-99/mo | Yes | Yes |
| PlayHT | ★★★★☆ | $39-99/mo | Yes | Yes |
| Murf.ai | ★★★★☆ | $29-99/mo | Yes | Yes |
| Azure TTS | ★★★☆☆ | Pay-per-use | Limited | Yes |
| OpenAI TTS | ★★★☆☆ | $15/1M chars | No | Yes |

**Recommendation:** ElevenLabs
- Best quality for long-form
- Voice cloning for unique persona
- Reasonable API pricing

**Process:**
1. Clone a voice OR create custom voice
2. Add SSML markup for pacing/emphasis
3. Generate audio segments
4. Post-process (normalize, remove silence)

---

### 6.4 AI Avatar Video Generation
**Purpose:** Create talking-head video with AI avatar

**Options (ranked):**

| Platform | Quality | Cost | Custom Avatar | API |
|----------|---------|------|---------------|-----|
| HeyGen | ★★★★★ | $29-89/mo | Yes | Yes |
| Synthesia | ★★★★★ | $29-67/mo | Yes ($$) | Yes |
| D-ID | ★★★★☆ | $6-108/mo | Yes | Yes |
| Colossyan | ★★★★☆ | $28-67/mo | Yes | Yes |
| Hour One | ★★★★☆ | Custom | Yes | Yes |

**Recommendation:** HeyGen
- Best bang for buck
- Custom avatar creation included
- Solid API
- Good lip-sync quality

**Avatar Strategy:**
1. **Option A:** Use stock avatar (fast, cheap)
2. **Option B:** Create custom AI avatar from photos
3. **Option C:** Generate fully synthetic persona (Midjourney → HeyGen)
4. **Option D:** Stylized/animated avatar (more unique, less uncanny valley)

---

### 6.5 Visual Assets Generator
**Purpose:** Create thumbnails, B-roll, graphics

**Components:**
- **Thumbnails:** DALL-E 3 / Midjourney + Canva templates
- **B-roll:** Pexels/Pixabay API (free) or Storyblocks ($)
- **Graphics:** Remotion (programmatic) or Canva API
- **Screen recordings:** Puppeteer/Playwright automation

**Thumbnail Formula:**
- Face (avatar) with expression
- 3-4 word text (large, contrasting)
- Bright/contrasting colors
- Curiosity gap element

---

### 6.6 Video Assembly
**Purpose:** Combine all assets into final video

**Tech Stack:**
- **Remotion** (React-based video) — programmatic, templateable
- **FFmpeg** — audio/video processing
- **MoviePy** (Python) — scripted editing

**Assembly Pipeline:**
1. Avatar video (talking head)
2. Overlay graphics/text
3. Insert B-roll at marked timestamps
4. Add background music (royalty-free)
5. Add captions (auto-generated)
6. Render final output

**Output Specs:**
- Resolution: 1080p (or 4K for premium)
- Format: MP4 (H.264)
- Audio: AAC 320kbps
- Captions: Burned-in + SRT file

---

### 6.7 Publishing & Scheduling
**Purpose:** Upload to YouTube with optimal timing

**Tech Stack:**
- YouTube Data API v3
- OAuth 2.0 authentication
- Cron scheduler

**Automation:**
- Upload video file
- Set title, description, tags
- Add thumbnail
- Set publish time (optimal for audience)
- Add to playlist
- Set end screens + cards
- Add captions (SRT)

**Optimal Posting:**
- Analyze audience timezone
- A/B test posting times
- Avoid content saturation days

---

## 7. Cost Analysis

### Monthly Costs (Starter Tier)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| ElevenLabs | Creator | $22 |
| HeyGen | Creator | $29 |
| Claude API | Usage-based | ~$20 |
| Stock assets | Pexels (free) | $0 |
| Hosting/Compute | Cloud functions | ~$10 |
| YouTube | Free | $0 |
| **Total** | | **~$81/mo** |

### Per-Video Cost (20 videos/month)
- **$4.05 per video**

### Scale Tier (50+ videos/month)

| Service | Plan | Monthly Cost |
|---------|------|--------------|
| ElevenLabs | Pro | $99 |
| HeyGen | Business | $89 |
| Claude API | Usage-based | ~$50 |
| Stock assets | Storyblocks | $30 |
| Hosting/Compute | Dedicated | ~$50 |
| **Total** | | **~$318/mo** |

### Per-Video Cost (50 videos/month)
- **$6.36 per video** (but higher quality)

---

## 8. Technical Requirements

### Infrastructure
- **Orchestration:** Node.js/Python service or Nx monorepo task
- **Queue:** BullMQ / Redis for job management
- **Storage:** S3/Cloudflare R2 for assets
- **Database:** PostgreSQL for content tracking
- **Scheduler:** Cron or Temporal.io for workflows

### APIs Required
- [ ] YouTube Data API v3
- [ ] ElevenLabs API
- [ ] HeyGen API
- [ ] OpenAI/Anthropic API
- [ ] News/Trends APIs
- [ ] Image generation API

### Development Estimate
| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1 | Script gen + voice | 1 week |
| Phase 2 | Avatar integration | 1 week |
| Phase 3 | Asset pipeline | 1 week |
| Phase 4 | Assembly + publish | 1 week |
| Phase 5 | Dashboard + monitoring | 1 week |
| **Total** | | **5 weeks** |

---

## 9. MVP Scope

### Phase 1: Manual-Assisted (Week 1-2)
- Script generation from topic input
- Voice generation
- Avatar video generation
- Manual upload to YouTube

### Phase 2: Semi-Automated (Week 3-4)
- Topic suggestion engine
- Automated asset generation
- One-click video assembly
- Scheduled publishing

### Phase 3: Fully Automated (Week 5+)
- Autonomous topic selection
- End-to-end pipeline
- Performance monitoring
- Self-optimization (A/B testing)

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube policy changes | High | Diversify platforms (TikTok, Shorts) |
| AI detection/penalties | Medium | Hybrid content, human oversight |
| Avatar uncanny valley | Medium | Stylized avatars, quality testing |
| API cost overruns | Medium | Usage monitoring, caching |
| Content quality drift | Medium | Human review queue, feedback loops |
| Copyright claims | High | Royalty-free assets only, originality checks |

---

## 11. Legal & Compliance

### YouTube ToS Compliance
- ✅ AI-generated content is allowed
- ⚠️ Must disclose AI in "altered content" cases
- ✅ Automated uploads allowed via API
- ⚠️ No misleading content (fake news, impersonation)

### Copyright
- Use royalty-free music (Epidemic Sound, Artlist)
- Use licensed stock footage
- Original scripts only
- No copyrighted characters/brands without permission

### Disclosure
- Consider "AI-generated" label in description
- Transparent about automation if asked

---

## 12. Success Criteria for MVP

### Must Have
- [ ] Generate script from topic in < 2 min
- [ ] Generate voice audio in < 5 min
- [ ] Generate avatar video in < 10 min
- [ ] Assemble final video in < 5 min
- [ ] Upload to YouTube via API
- [ ] Per-video cost < $10

### Nice to Have
- [ ] Automated topic research
- [ ] Thumbnail generation
- [ ] Performance dashboard
- [ ] A/B testing titles

---

## 13. Next Steps

1. **Decide on niche** — What content vertical?
2. **Design avatar persona** — Name, style, personality
3. **Set up accounts** — HeyGen, ElevenLabs, YouTube API
4. **Build MVP pipeline** — Start with Phase 1
5. **Publish first video** — Validate end-to-end
6. **Iterate** — Based on performance data

---

## 14. Open Questions

1. What niche/topic area should we focus on?
2. Do you want a realistic or stylized avatar?
3. Target video length? (Shorts vs long-form vs both)
4. Any existing brand/persona to match?
5. Hosting preference? (Add to monorepo or standalone?)

---

**Ready to start building?** 🚀
