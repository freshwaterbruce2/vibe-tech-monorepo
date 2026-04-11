# ai-youtube-pipeline — AI Context

## What this is
Automated YouTube Shorts pipeline — generates a script from a topic, synthesises voiceover via Azure TTS, and (optionally) uploads via YouTube API.

## Stack
- **Runtime**: Python 3 (script-based, no web framework)
- **Framework**: Standalone scripts; Azure Cognitive Services TTS, OpenAI/OpenRouter for script generation
- **Key deps**: edge-tts or azure-cognitiveservices-speech, openai SDK, yt-dlp

## Dev
```bash
python output/  # not a runnable app — invoke pipeline scripts directly
```

## Notes
- Output directory (`output/`) contains finished MP3 voice files, metadata JSON, and project folders
- No `package.json` or `src/` — this is a script-only tool, not a built app
- Avatar video step requires Hedra API key (currently skipped if missing)
- YouTube upload step is disabled by default; enable via env var
- Outputs stored locally in `C:\dev\apps\ai-youtube-pipeline\output\` (not on D:\)
