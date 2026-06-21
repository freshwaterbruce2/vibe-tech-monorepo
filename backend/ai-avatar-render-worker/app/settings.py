from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379/0"
    gcs_credentials: str = "{}"
    gcs_bucket_name: str = "vibetech-avatar-assets"
    elevenlabs_api_key: str | None = None
    render_output_ttl_seconds: int = 3600
    whisper_model_size: str = "base"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    default_video_resolution: str = "1920x1080"
    default_video_fps: int = 30
    subtitle_font_name: str = "Arial"


settings = Settings()
