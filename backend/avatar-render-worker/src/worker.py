"""Celery worker configuration."""

from celery import Celery

from .config import settings

celery_app = Celery(
    'avatar_render_worker',
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=['src.celery_render_worker'],
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,
    worker_prefetch_multiplier=1,
)
