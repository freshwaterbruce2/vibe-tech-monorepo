"""
Legal Cache Service - Loads and queries cached legal reference data
Provides domain-specific context for AI prompts
"""

import json
from pathlib import Path
from typing import Optional

from vibe_justice.utils.paths import get_data_directory

class LegalCacheService:
    """Service for loading and querying cached legal reference data."""

    # Domain mapping to cache files
    DOMAIN_FILES = {
        "sc_unemployment": "sc_employment/unemployment_law.json",
        "walmart": "walmart_sedgwick/walmart_policies.json",
        "sedgwick": "walmart_sedgwick/sedgwick_tpa.json",
        "lincoln_ltd": "lincoln_financial/ltd_claims.json",
        "ada_accommodations": "ada_accommodations/process.json",
        "sc_estate": "sc_estate/estate_law.json",
        "sc_family_law": "sc_family_law/custody.json",
        "sc_workers_comp": "sc_workers_comp/workers_comp.json",
        "eeoc_title_vii": "eeoc_title_vii/discrimination.json",
    }

    def __init__(self):
        data_dir = Path(get_data_directory())
        self.cache_dir = data_dir / "legal_cache"
        self._cache: dict = {}
        self._load_all_caches()

    def _load_all_caches(self) -> None:
        """Load all cache files into memory."""
        for domain, filepath in self.DOMAIN_FILES.items():
            full_path = self.cache_dir / filepath
            if full_path.exists():
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        self._cache[domain] = json.load(f)
                except Exception as e:
                    print(f"Error loading cache {filepath}: {e}")
                    self._cache[domain] = {}
            else:
                self._cache[domain] = {}

    def get_domain_context(self, domain: str) -> str:
        """Get formatted context string for AI prompts."""
        data = self._cache.get(domain, {})
        if not data:
            return f"Domain: {domain}"

        context_parts = [f"Domain: {data.get('title', domain)}"]

        # Add key facts if available
        if "key_facts" in data:
            context_parts.append("Key Facts:")
            for fact in data["key_facts"][:5]:  # Limit to 5 facts
                context_parts.append(f"  - {fact}")

        # Add contacts if available
        if "contacts" in data:
            context_parts.append("Key Contacts:")
            for name, info in list(data["contacts"].items())[:3]:
                if isinstance(info, dict):
                    phone = info.get("phone", "")
                    context_parts.append(f"  - {info.get('name', name)}: {phone}")

        # Add deadlines if available
        if "deadlines" in data:
            context_parts.append("Critical Deadlines:")
            for name, info in list(data["deadlines"].items())[:3]:
                if isinstance(info, dict):
                    days = info.get("days", "")
                    desc = info.get("description", "")
                    context_parts.append(f"  - {days} days: {desc}")

        return "\n".join(context_parts)

    def get_forms(self, domain: str) -> list:
        """Get available forms for a domain."""
        data = self._cache.get(domain, {})
        return data.get("forms", [])

    def get_contacts(self, domain: str) -> dict:
        """Get contacts for a domain."""
        data = self._cache.get(domain, {})
        return data.get("contacts", {})

    def get_deadlines(self, domain: str) -> dict:
        """Get deadlines for a domain."""
        data = self._cache.get(domain, {})
        return data.get("deadlines", {})

    def get_accommodation_examples(self) -> list:
        """Get ADA accommodation examples."""
        data = self._cache.get("ada_accommodations", {})
        return data.get("accommodation_examples", [])

    def get_appeal_requirements(self, domain: str) -> list:
        """Get appeal requirements for a domain."""
        data = self._cache.get(domain, {})
        if domain == "lincoln_ltd":
            return data.get("appeal_requirements", [])
        return []

    def get_full_cache(self, domain: str) -> dict:
        """Get full cache data for a domain."""
        return self._cache.get(domain, {})


# Singleton instance
_legal_cache_service: Optional[LegalCacheService] = None


def get_legal_cache_service() -> LegalCacheService:
    """Get singleton instance of LegalCacheService."""
    global _legal_cache_service
    if _legal_cache_service is None:
        _legal_cache_service = LegalCacheService()
    return _legal_cache_service
