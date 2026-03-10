#!/usr/bin/env python3
"""
Full AI YouTube Pipeline - Automated End-to-End Video Creation

Pipeline:
1. Generate script (DeepSeek)
2. Generate voice (Edge TTS - FREE)
3. Generate avatar video (Hedra)
4. Upload to YouTube

Usage:
  python full_pipeline.py "Your topic here"
  python full_pipeline.py "AI News" --voice jenny --avatar avatar.png
  python full_pipeline.py "Tech Tips" --shorts  # 9:16 aspect ratio
"""

import asyncio
import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime

# Add skills to path
SKILLS_DIR = Path(r"C:\Users\fresh_zxae3v6\clawd\skills")
sys.path.insert(0, str(SKILLS_DIR / "hedra"))
sys.path.insert(0, str(SKILLS_DIR / "youtube-upload"))

# Local imports
from pipeline import generate_script, generate_voice, VOICES, OUTPUT_DIR

# Conditional imports
try:
    from hedra import HedraClient
    HEDRA_AVAILABLE = True
except ImportError:
    HEDRA_AVAILABLE = False
    print("[WARN] Hedra module not available - avatar generation disabled")

try:
    from youtube_upload import YouTubeUploader
    YOUTUBE_AVAILABLE = True
except ImportError:
    YOUTUBE_AVAILABLE = False
    print("[WARN] YouTube upload module not available")


async def full_pipeline(
    topic: str,
    voice: str = "guy",
    avatar_image: str = None,
    aspect_ratio: str = "16:9",
    length: str = "short",
    privacy: str = "private",
    upload: bool = False
) -> dict:
    """
    Run the full AI YouTube video pipeline.
    
    Args:
        topic: Video topic/subject
        voice: Edge TTS voice name
        avatar_image: Path to avatar image for Hedra
        aspect_ratio: "16:9" for regular, "9:16" for shorts
        length: "short", "medium", or "long"
        privacy: YouTube privacy setting
        upload: Whether to upload to YouTube
    
    Returns:
        dict with all generated assets and metadata
    """
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    project_dir = OUTPUT_DIR / f"project_{timestamp}"
    project_dir.mkdir(exist_ok=True)
    
    result = {
        "topic": topic,
        "timestamp": timestamp,
        "project_dir": str(project_dir),
        "steps": {}
    }
    
    print(f"\n{'='*60}")
    print(f"[Pipeline] AI YouTube Video Generator")
    print(f"{'='*60}")
    print(f"Topic: {topic}")
    print(f"Voice: {voice}")
    print(f"Aspect Ratio: {aspect_ratio}")
    print(f"{'='*60}\n")
    
    # Step 1: Generate Script
    print("[Step 1/4] Generating script...")
    try:
        script = await generate_script(topic, length=length)
        script_path = project_dir / "script.json"
        with open(script_path, "w") as f:
            json.dump(script, f, indent=2)
        result["steps"]["script"] = {
            "status": "success",
            "path": str(script_path),
            "title": script.get("title"),
            "data": script
        }
        print(f"[OK] Script: {script.get('title')}")
    except Exception as e:
        result["steps"]["script"] = {"status": "failed", "error": str(e)}
        print(f"[FAIL] Script generation failed: {e}")
        return result
    
    # Step 2: Generate Voice
    print("\n[Step 2/4] Generating voice audio...")
    try:
        clean_script = script["script"].replace("[PAUSE]", "...")
        voice_path = str(project_dir / "voice.mp3")
        await generate_voice(clean_script, voice, voice_path)
        result["steps"]["voice"] = {
            "status": "success",
            "path": voice_path,
            "voice_id": VOICES.get(voice, voice)
        }
        print(f"[OK] Voice saved: {voice_path}")
    except Exception as e:
        result["steps"]["voice"] = {"status": "failed", "error": str(e)}
        print(f"[FAIL] Voice generation failed: {e}")
        return result
    
    # Step 3: Generate Avatar Video
    print("\n[Step 3/4] Generating avatar video...")
    if not avatar_image:
        print("[SKIP] No avatar image provided.")
        print("       To generate avatar video, provide --avatar path/to/face.png")
        print("       Or upload audio to hedra.com manually")
        result["steps"]["avatar"] = {
            "status": "skipped",
            "reason": "No avatar image provided",
            "manual_option": "Upload voice.mp3 to hedra.com with your avatar image"
        }
    elif not HEDRA_AVAILABLE:
        print("[SKIP] Hedra module not available")
        result["steps"]["avatar"] = {"status": "skipped", "reason": "Hedra not available"}
    elif not os.environ.get("HEDRA_API_KEY"):
        print("[SKIP] HEDRA_API_KEY not set")
        print("       Get API key from: https://www.hedra.com/api")
        result["steps"]["avatar"] = {"status": "skipped", "reason": "No API key"}
    else:
        try:
            client = HedraClient()
            video_path = str(project_dir / "avatar_video.mp4")
            client.generate_video(
                audio_path=voice_path,
                image_path=avatar_image,
                output_path=video_path,
                aspect_ratio=aspect_ratio
            )
            result["steps"]["avatar"] = {
                "status": "success",
                "path": video_path
            }
            print(f"[OK] Avatar video: {video_path}")
        except Exception as e:
            result["steps"]["avatar"] = {"status": "failed", "error": str(e)}
            print(f"[FAIL] Avatar generation failed: {e}")
    
    # Step 4: Upload to YouTube
    print("\n[Step 4/4] YouTube upload...")
    if not upload:
        print("[SKIP] Upload disabled. Use --upload to enable.")
        result["steps"]["youtube"] = {"status": "skipped", "reason": "Upload disabled"}
    elif not YOUTUBE_AVAILABLE:
        print("[SKIP] YouTube module not available")
        result["steps"]["youtube"] = {"status": "skipped", "reason": "Module not available"}
    elif not os.environ.get("YOUTUBE_CLIENT_ID"):
        print("[SKIP] YouTube credentials not set")
        result["steps"]["youtube"] = {"status": "skipped", "reason": "No credentials"}
    elif result["steps"].get("avatar", {}).get("status") != "success":
        print("[SKIP] No video to upload (avatar step not completed)")
        result["steps"]["youtube"] = {"status": "skipped", "reason": "No video file"}
    else:
        try:
            uploader = YouTubeUploader()
            video_id = uploader.upload(
                video_path=result["steps"]["avatar"]["path"],
                title=script["title"],
                description=script["description"],
                tags=script.get("tags", []),
                category="28",  # Science & Technology
                privacy=privacy
            )
            result["steps"]["youtube"] = {
                "status": "success",
                "video_id": video_id,
                "url": f"https://youtube.com/watch?v={video_id}"
            }
            print(f"[OK] Uploaded: https://youtube.com/watch?v={video_id}")
        except Exception as e:
            result["steps"]["youtube"] = {"status": "failed", "error": str(e)}
            print(f"[FAIL] YouTube upload failed: {e}")
    
    # Save result summary
    result_path = project_dir / "pipeline_result.json"
    with open(result_path, "w") as f:
        json.dump(result, f, indent=2)
    
    # Print summary
    print(f"\n{'='*60}")
    print("[Pipeline] Summary")
    print(f"{'='*60}")
    for step, data in result["steps"].items():
        status = data.get("status", "unknown")
        icon = {"success": "[OK]", "failed": "[X]", "skipped": "[--]"}.get(status, "[?]")
        print(f"  {icon} {step}: {status}")
    print(f"\n  Project folder: {project_dir}")
    print(f"{'='*60}\n")
    
    return result


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Full AI YouTube Pipeline - Automated Video Creation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python full_pipeline.py "AI Agents Explained"
  python full_pipeline.py "Tech News" --voice jenny
  python full_pipeline.py "Tips" --avatar face.png --upload
  python full_pipeline.py "Gaming" --shorts --avatar gamer.png
        """
    )
    
    parser.add_argument("topic", help="Video topic/subject")
    parser.add_argument("--voice", "-v", default="guy", 
                       choices=list(VOICES.keys()),
                       help="Voice to use (default: guy)")
    parser.add_argument("--avatar", "-a", help="Path to avatar image for video")
    parser.add_argument("--shorts", action="store_true", 
                       help="Use 9:16 aspect ratio for YouTube Shorts")
    parser.add_argument("--length", "-l", default="short",
                       choices=["short", "medium", "long"],
                       help="Script length (default: short)")
    parser.add_argument("--upload", "-u", action="store_true",
                       help="Upload to YouTube after generation")
    parser.add_argument("--privacy", "-p", default="private",
                       choices=["private", "unlisted", "public"],
                       help="YouTube privacy setting (default: private)")
    
    args = parser.parse_args()
    
    aspect_ratio = "9:16" if args.shorts else "16:9"
    
    asyncio.run(full_pipeline(
        topic=args.topic,
        voice=args.voice,
        avatar_image=args.avatar,
        aspect_ratio=aspect_ratio,
        length=args.length,
        privacy=args.privacy,
        upload=args.upload
    ))


if __name__ == "__main__":
    main()
