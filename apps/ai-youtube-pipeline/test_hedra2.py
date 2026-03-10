import asyncio
import os
import traceback
import httpx
from hedra import AsyncHedra

async def test_hedra():
    try:
        api_key = os.environ.get('HEDRA_API_KEY')
        client = AsyncHedra(api_key=api_key, http_client=httpx.AsyncClient())
        print("Connected.")
        
        print("Uploading audio...")
        with open("output/voice_20260221_165111.mp3", "rb") as f:
            audio = await client.audio.create(file=f)
        print("Audio URL:", audio.url)
        
    except Exception as e:
        print("Error:")
        traceback.print_exc()

asyncio.run(test_hedra())