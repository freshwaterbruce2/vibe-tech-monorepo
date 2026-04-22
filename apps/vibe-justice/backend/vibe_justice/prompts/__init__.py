"""
Prompts module for Vibe-Justice Legal AI.

Contains specialized prompts for different legal domains and violation detection.
"""

from vibe_justice.prompts.violation_prompts import (
    VIOLATION_PROMPTS,
    get_violation_prompt,
    get_all_violation_categories,
)

__all__ = [
    "VIOLATION_PROMPTS",
    "get_violation_prompt",
    "get_all_violation_categories",
]
