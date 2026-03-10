#!/usr/bin/env python3
"""
AI YouTube Pipeline - Free Stack
Generates scripts, voice, and prepares for avatar video
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import datetime

# Try imports
try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    os.system("pip install edge-tts")
    import edge_tts

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("Installing google-genai...")
    os.system("pip install google-genai")
    from google import genai
    from google.genai import types


# Configuration
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

# Voice options (Edge TTS - all FREE)
VOICES = {
    "guy": "en-US-GuyNeural",        # Male, natural
    "jenny": "en-US-JennyNeural",    # Female, natural  
    "aria": "en-US-AriaNeural",      # Female, expressive
    "ryan": "en-GB-RyanNeural",      # British male
    "sonia": "en-GB-SoniaNeural",    # British female
    "andrew": "en-US-AndrewNeural",  # Male, casual
}

DEFAULT_VOICE = "guy"


async def generate_voice(text: str, voice: str = DEFAULT_VOICE, output_path: str = None) -> str:
    """Generate voice audio using Edge TTS (FREE)"""
    
    voice_id = VOICES.get(voice, voice)
    
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = OUTPUT_DIR / f"voice_{timestamp}.mp3"
    
    output_path = Path(output_path)
    
    print(f"[Voice] Generating with {voice_id}...")
    
    communicate = edge_tts.Communicate(text, voice_id)
    await communicate.save(str(output_path))
    
    print(f"[OK] Voice saved to: {output_path}")
    return str(output_path)


async def generate_script(topic: str, style: str = "educational", length: str = "short") -> dict:
    """Generate a video script using Google Gen AI SDK"""
    
    # Length guidelines
    lengths = {
        "short": "60-90 seconds (150-200 words)",
        "medium": "3-5 minutes (500-700 words)", 
        "long": "8-12 minutes (1200-1800 words)",
    }
    
    length_guide = lengths.get(length, lengths["short"])
    
    prompt = f"""Create a YouTube video script about: {topic}

Style: {style}
Target length: {length_guide}

Structure your response as JSON with these fields:
{{
    "title": "Catchy YouTube title (under 60 chars)",
    "hook": "Opening line that grabs attention (first 5 seconds)",
    "script": "The full script to be spoken, with natural pauses marked as [PAUSE]",
    "description": "YouTube description (2-3 sentences)",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "thumbnail_text": "2-4 words for thumbnail overlay"
}}

Make it engaging, conversational, and optimized for viewer retention.
Include a call-to-action at the end (subscribe, like, comment).
"""

    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("[WARN] No GEMINI_API_KEY found. Using placeholder script.")
        return {
            "title": f"Amazing Facts About {topic}",
            "hook": f"Did you know that {topic} can change everything?",
            "script": f"""Did you know that {topic} can change everything?

In this video, we're going to explore something incredible.

[PAUSE]

{topic} is more important than most people realize. Here's why...

First, it affects how we think about the world.

Second, it's shaping the future right now.

And third, understanding it gives you an advantage.

[PAUSE]

If you found this helpful, smash that like button and subscribe for more content like this.

Drop a comment below - what's your take on {topic}?

See you in the next one!""",
            "description": f"Discover the amazing truth about {topic}. This video explains everything you need to know.",
            "tags": [topic.lower(), "explained", "facts", "2026", "tutorial"],
            "thumbnail_text": topic.upper()[:20]
        }
    
    print(f"[Script] Generating for: {topic}")
    
    # Using the new Google Gen AI SDK
    model_name = "gemini-2.5-flash"
    print(f"[Script] Using model: {model_name}")
    
    client = genai.Client(api_key=api_key)
    
    try:
        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            )
        )
        
        if not response.text:
            raise Exception("No text returned from Gemini API")
            
        script_data = json.loads(response.text)
        print(f"[OK] Script generated: {script_data['title']}")
        return script_data
        
    except Exception as e:
        print(f"[ERROR] API error: {e}")
        raise


async def create_video_package(topic: str, voice: str = DEFAULT_VOICE, length: str = "short") -> dict:
    """Full pipeline: generate script and voice"""
    
    print(f"\n[Pipeline] Starting for: {topic}\n")
    
    # Step 1: Generate script
    script = await generate_script(topic, length=length)
    
    # Step 2: Generate voice
    # Remove [PAUSE] markers for TTS, replace with ellipsis for natural pauses
    clean_script = script["script"].replace("[PAUSE]", "...")
    voice_path = await generate_voice(clean_script, voice)
    
    # Step 3: Save metadata
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    metadata_path = OUTPUT_DIR / f"metadata_{timestamp}.json"
    
    package = {
        "topic": topic,
        "timestamp": timestamp,
        "script": script,
        "voice_file": voice_path,
        "voice_id": VOICES.get(voice, voice),
        "status": "ready_for_avatar",
        "next_step": "Upload audio to Hedra (hedra.com) with avatar image"
    }
    
    with open(metadata_path, "w") as f:
        json.dump(package, f, indent=2)
    
    print(f"\n[Package] Ready!")
    print(f"   Voice: {voice_path}")
    print(f"   Metadata: {metadata_path}")
    print(f"\n[Next] Go to hedra.com, upload the audio + an avatar image")
    
    return package


async def list_voices():
    """List all available Edge TTS voices"""
    voices = await edge_tts.list_voices()
    
    print("\n[Voices] Available English voices:\n")
    for v in voices:
        if v["Locale"].startswith("en-"):
            print(f"  {v['ShortName']:30} | {v['Gender']:8} | {v['Locale']}")


# CLI
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
AI YouTube Pipeline - Free Stack

Usage:
  python pipeline.py "topic here"              # Generate full package
  python pipeline.py "topic" --voice jenny     # Use specific voice
  python pipeline.py "topic" --length medium   # Longer script
  python pipeline.py --voices                  # List available voices
  python pipeline.py --test                    # Quick test

Voices: guy, jenny, aria, ryan, sonia, andrew
Lengths: short (60s), medium (3-5min), long (8-12min)
""")
        sys.exit(0)
    
    if sys.argv[1] == "--voices":
        asyncio.run(list_voices())
    elif sys.argv[1] == "--test":
        asyncio.run(generate_voice("Hello! This is a test of the AI YouTube pipeline. Sounds pretty good, right?", "guy"))
    else:
        topic = sys.argv[1]
        voice = DEFAULT_VOICE
        length = "short"
        
        if "--voice" in sys.argv:
            idx = sys.argv.index("--voice")
            voice = sys.argv[idx + 1]
        
        if "--length" in sys.argv:
            idx = sys.argv.index("--length")
            length = sys.argv[idx + 1]
            
        asyncio.run(create_video_package(topic, voice, length))
