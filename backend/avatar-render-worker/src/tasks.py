"""Celery task compatibility shim for the avatar render worker.

The original skeleton tasks have been consolidated into the production-ready
``celery_render_worker.execute_video_render_pipeline`` task. This module re-exports
that task under the legacy ``render_video_task`` name so that existing imports
continue to resolve without error.
"""

from .celery_render_worker import execute_video_render_pipeline

render_video_task = execute_video_render_pipeline
