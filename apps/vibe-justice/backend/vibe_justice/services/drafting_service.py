"""
Document Drafting Service
"""

from vibe_justice.services.ai_service import get_ai_service
from vibe_justice.utils.paths import get_data_directory
from vibe_justice.utils.timestamps import format_filename


class DraftingService:
    def __init__(self):
        self.ai_service = get_ai_service()
        # Drafts live under the per-app data directory so they respect
        # VIBE_JUSTICE_DATA_DIR overrides (tests + CI use tmp dirs).
        self.output_dir = get_data_directory() / "drafts"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_document(self, template_type: str, case_details: str, domain: str) -> str:
        """
        Generates a legal document using DeepSeek R1.
        """
        prompt = f"""
        Create a professional {template_type} document.

        Case Details:
        {case_details}

        Requirements:
        - Professional legal format
        - Include all necessary sections
        - Use formal legal language
        - Add placeholders [NAME], [DATE], etc. for missing info
        """

        content = self.ai_service.generate_response(prompt, domain, use_reasoning=True)

        # Save to file
        timestamp = format_filename()
        filename = f"{template_type.replace(' ', '_')}_{timestamp}.txt"
        filepath = self.output_dir / filename

        filepath.write_text(f"DRAFT {template_type}\n{'='*50}\n\n{content}")

        return str(filepath)