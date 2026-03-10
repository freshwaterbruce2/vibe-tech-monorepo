import asyncio
import os
from hedra import AsyncHedra

async def test_hedra():
    client = AsyncHedra()
    print("Uploading audio...")
    with open("output/voice_20260221_165111.mp3", "rb") as f:
        audio = await client.audio.create(file=f)
    print("Audio URL:", audio.url)
    
    print("Uploading portrait...")
    with open("avatar.jpg", "rb") as f:
        portrait = await client.portraits.create(file=f) # no aspect_ratio to see if it works
    print("Portrait URL:", portrait.url)
    
    print("Generating character...")
    character = await client.characters.create(
        avatar_image=portrait.url,
        audio_source="audio",
        voice_url=audio.url,
        aspect_ratio="16:9"
    )
    job_id = character.job_id
    print("Job ID:", job_id)
    
    project = await client.projects.retrieve(job_id)
    print("Project Status:", getattr(project, "status", None))
    print("Project Stage:", getattr(project, "stage", None))

asyncio.run(test_hedra())