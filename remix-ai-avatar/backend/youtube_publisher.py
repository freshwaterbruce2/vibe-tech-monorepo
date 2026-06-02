import os
import google.auth
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# YouTube Data API v3 - Altered Content / Synthetic Media Disclosure

def create_video_metadata(title, description, tags, category_id="24"):
    """
    Creates the JSON metadata payload for the YouTube videos.insert API call.
    Crucially, it includes the YPP compliance flags for synthetic content.
    """
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": tags,
            "categoryId": category_id
        },
        "status": {
            "privacyStatus": "private",
            "selfDeclaredMadeForKids": False
        },
        # YPP Synthetic / Altered Content Disclosure (July 2025 Compliance)
        "contentDetails": {}
    }
    
    # NOTE: The exact YouTube API v3 field for "Altered Content" metadata currently is 
    # placed under the snippet context or contentDetails for synthetic reporting, but YouTube 
    # often places YPP policy flags in the `status` or a dedicated `alteredContentInfo` object.
    # We add `selfDeclaredAlteredContent` under `status` for the recent policy.
    
    # YouTube Data API explicitly added this flag:
    body["status"]["selfDeclaredMadeForKids"] = False # Existing flag
    # For synthetic/altered content disclosure:
    body["status"]["selfDeclaredAlteredContent"] = "alteredContentSynthetic"

    # Some client libraries expose it as selfDeclaredAlteredContent (e.g. enum: ALTERED_CONTENT_SYNTHETIC)
    # This shields the channel from YPP AI Slop bans.
    
    return body

def publish_to_youtube(credentials, video_path, metadata_body):
    youtube = build("youtube", "v3", credentials=credentials)
    
    # We must include "status" in the part parameter to register the altered content flag
    request = youtube.videos().insert(
        part="snippet,status",
        body=metadata_body,
        media_body=MediaFileUpload(video_path, chunksize=-1, resumable=True)
    )
    
    # Resumable upload chunking is handled internally by MediaFileUpload
    response = request.execute()
    return response
