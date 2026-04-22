"""
Forms Service - Provides legal form templates
"""

from typing import Dict, List


class FormsService:
    def get_forms(self, domain: str = "general") -> List[Dict]:
        """
        Returns available legal forms for the domain.
        """
        all_forms = [
            {
                "id": "sc_dew_appeal",
                "name": "SC DEW Appeal Notice",
                "domain": "sc_unemployment",
                "description": "Appeal form for SC unemployment determination",
                "url": "https://dew.sc.gov/appeals"
            },
            {
                "id": "sc_complaint",
                "name": "SC Civil Complaint",
                "domain": "general",
                "description": "General civil complaint form for SC courts",
                "url": "https://www.sccourts.org/forms"
            },
            {
                "id": "walmart_ethics",
                "name": "Walmart Ethics Complaint",
                "domain": "walmart_sedgwick",
                "description": "Ethics and workplace complaint form",
                "url": "https://www.walmartethics.com"
            }
        ]

        if domain == "general":
            return all_forms

        return [f for f in all_forms if f["domain"] == domain]