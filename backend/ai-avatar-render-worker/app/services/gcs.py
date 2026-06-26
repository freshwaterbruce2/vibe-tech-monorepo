import json
from functools import lru_cache

from google.cloud import storage

from app.settings import settings


@lru_cache
def get_bucket():
    if not settings.gcs_credentials or settings.gcs_credentials == "{}":
        return None
    credentials = json.loads(settings.gcs_credentials)
    client = storage.Client(credentials=credentials)
    return client.bucket(settings.gcs_bucket_name)
