"""Configuration for the avatar render worker."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        extra='ignore',
    )

    app_name: str = 'avatar-render-worker'
    port: int = 5400
    host: str = '127.0.0.1'

    redis_url: str = 'redis://localhost:6379/0'

    openrouter_api_key: str | None = None
    openrouter_base_url: str = 'https://openrouter.ai/api/v1'

    elevenlabs_api_key: str | None = None
    pexels_api_key: str | None = None
    google_ai_api_key: str | None = None

    next_public_app_url: str = 'http://localhost:3000'

    render_output_dir: Path = Path('D:/render-output')
    ffmpeg_path: str = 'ffmpeg'

    whisper_model_size: str = 'small'
    whisper_device: str = 'cpu'
    whisper_compute_type: str = 'int8'

    log_level: str = 'INFO'


settings = Settings()
