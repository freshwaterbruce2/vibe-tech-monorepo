"""
Date Extraction Service - Find critical dates and deadlines in legal documents
Uses: regex patterns + AI reasoning for classification
"""

import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from vibe_justice.ai.openrouter_client import OpenRouterClient


class CriticalDate:
    """Represents a critical date found in legal documents."""

    def __init__(
        self,
        date: datetime,
        label: str,
        importance: str,
        source: str,
        context: str,
        days_remaining: int
    ):
        self.date = date
        self.label = label
        self.importance = importance  # CRITICAL, HIGH, MEDIUM
        self.source = source
        self.context = context
        self.days_remaining = days_remaining

    def to_dict(self) -> Dict:
        return {
            "date": self.date.isoformat(),
            "label": self.label,
            "importance": self.importance,
            "source": self.source,
            "context": self.context,
            "days_remaining": self.days_remaining,
            "is_urgent": self.days_remaining <= 7 and self.days_remaining >= 0
        }


class DateExtractor:
    """Extract and classify dates from legal documents."""

    def __init__(self):
        self.openrouter_client = OpenRouterClient()

        # Date pattern matching
        self.date_patterns = [
            # January 29, 2025
            r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b',
            # 01/29/2025, 1/29/25
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',
            # 2025-01-29
            r'\b\d{4}-\d{2}-\d{2}\b',
        ]

        # Keywords indicating deadline types
        self.deadline_keywords = {
            # Critical legal deadlines
            'appeal': 'CRITICAL',
            'hearing': 'CRITICAL',
            'court': 'CRITICAL',
            'trial': 'CRITICAL',
            'probate': 'CRITICAL',
            'petition': 'CRITICAL',
            'contest': 'CRITICAL',

            # Family law deadlines
            'custody': 'HIGH',
            'visitation': 'HIGH',
            'support payment': 'CRITICAL',
            'child support': 'CRITICAL',
            'mediation': 'HIGH',
            'guardian ad litem': 'HIGH',
            'separation': 'HIGH',
            'divorce': 'HIGH',

            # Estate law deadlines
            'will': 'HIGH',
            'inventory': 'HIGH',
            'creditor claim': 'CRITICAL',
            'executor': 'HIGH',
            'personal representative': 'HIGH',
            'distribution': 'HIGH',

            # General deadlines
            'deadline': 'HIGH',
            'due': 'HIGH',
            'submit': 'HIGH',
            'file': 'HIGH',
            'respond': 'HIGH',

            # Events
            'terminated': 'MEDIUM',
            'incident': 'MEDIUM',
            'effective': 'MEDIUM',
            'death': 'HIGH',
            'service of process': 'HIGH',
        }

    def extract_dates_regex(self, text: str, source: str) -> List[Dict]:
        """
        Extract dates using regex patterns.

        Args:
            text: Document text
            source: Document filename

        Returns:
            List of date matches with context
        """
        found_dates = []

        for pattern in self.date_patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)

            for match in matches:
                date_str = match.group()
                start_pos = match.start()
                end_pos = match.end()

                # Get surrounding context (100 chars before/after)
                context_start = max(0, start_pos - 100)
                context_end = min(len(text), end_pos + 100)
                context = text[context_start:context_end].strip()

                # Try parsing the date
                parsed_date = self._parse_date(date_str)

                if parsed_date:
                    found_dates.append({
                        "date_string": date_str,
                        "date": parsed_date,
                        "context": context,
                        "source": source
                    })

        return found_dates

    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string into datetime object."""
        formats = [
            "%B %d, %Y",      # January 29, 2025
            "%m/%d/%Y",       # 01/29/2025
            "%m/%d/%y",       # 1/29/25
            "%Y-%m-%d",       # 2025-01-29
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue

        return None

    async def classify_dates_with_ai(
        self,
        dates_found: List[Dict]
    ) -> List[CriticalDate]:
        """
        Use AI to classify date importance and generate labels.

        Args:
            dates_found: List of extracted dates with context

        Returns:
            List of CriticalDate objects
        """
        if not dates_found:
            return []

        # Format dates for AI analysis
        dates_text = "\n\n".join([
            f"Date {i+1}: {d['date_string']}\n"
            f"Context: {d['context']}\n"
            f"Source: {d['source']}"
            for i, d in enumerate(dates_found)
        ])

        prompt = f"""
Analyze these dates from SC legal documents and classify each by importance:

{dates_text}

For each date, provide:
1. Label - Be specific based on legal context:
   - Employment Law: "Appeal Deadline", "Termination Date", "Hearing Date"
   - Family Law: "Custody Hearing", "Child Support Payment", "Mediation Date", "Divorce Waiting Period Ends"
   - Estate Law: "Probate Filing Deadline", "Will Contest Deadline", "Creditor Claims Deadline", "Inventory Due Date"

2. Importance: CRITICAL, HIGH, or MEDIUM
   - CRITICAL: Appeal deadlines, court dates, probate/will contest deadlines, child support deadlines
   - HIGH: Document submission, hearing prep deadlines, mediation, inventory filing
   - MEDIUM: Event dates (termination, death, separation), policy effective dates

3. Brief explanation of why this date matters and relevant SC statute if applicable

Format as JSON array with structure:
[
  {{
    "date_index": 1,
    "label": "Appeal Deadline",
    "importance": "CRITICAL",
    "explanation": "14-day deadline from notice date per SC Code § 41-35-610"
  }},
  ...
]
"""

        try:
            response = self.openrouter_client.perform_legal_research(
                jurisdiction="South Carolina",
                goals=prompt
            )

            # Parse AI response (simple JSON extraction)
            classified = self._extract_json_from_response(response)

            # Build CriticalDate objects
            critical_dates = []
            today = datetime.now()

            for item in classified:
                idx = item.get("date_index", 1) - 1
                if idx < len(dates_found):
                    date_info = dates_found[idx]
                    date_obj = date_info["date"]

                    days_remaining = (date_obj - today).days

                    critical_date = CriticalDate(
                        date=date_obj,
                        label=item.get("label", "Unknown Date"),
                        importance=item.get("importance", "MEDIUM"),
                        source=date_info["source"],
                        context=date_info["context"],
                        days_remaining=days_remaining
                    )

                    critical_dates.append(critical_date)

            return critical_dates

        except Exception as e:
            print(f"AI classification error: {e}")
            # Fallback to keyword-based classification
            return self._classify_dates_fallback(dates_found)

    def _classify_dates_fallback(
        self,
        dates_found: List[Dict]
    ) -> List[CriticalDate]:
        """Fallback classification using keywords if AI fails."""
        critical_dates = []
        today = datetime.now()

        for date_info in dates_found:
            context_lower = date_info["context"].lower()

            # Find matching keywords
            importance = "MEDIUM"
            label = "Important Date"

            for keyword, level in self.deadline_keywords.items():
                if keyword in context_lower:
                    importance = level
                    label = f"{keyword.title()} Date"
                    break

            days_remaining = (date_info["date"] - today).days

            critical_date = CriticalDate(
                date=date_info["date"],
                label=label,
                importance=importance,
                source=date_info["source"],
                context=date_info["context"],
                days_remaining=days_remaining
            )

            critical_dates.append(critical_date)

        return critical_dates

    def _extract_json_from_response(self, response: str) -> List[Dict]:
        """Extract JSON array from AI response text."""
        import json

        # Find JSON array in response
        match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)

        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        return []

    async def extract_all_dates(
        self,
        documents: List[Dict[str, str]]
    ) -> List[CriticalDate]:
        """
        Extract and classify all dates from multiple documents.

        Args:
            documents: List of dicts with 'text_content' and 'filename'

        Returns:
            List of CriticalDate objects sorted by date
        """
        all_dates_found = []

        # Extract dates from all documents
        for doc in documents:
            dates = self.extract_dates_regex(
                doc["text_content"],
                doc["filename"]
            )
            all_dates_found.extend(dates)

        # Remove duplicates (same date + context)
        unique_dates = []
        seen = set()

        for date_info in all_dates_found:
            key = (date_info["date"].isoformat(), date_info["context"][:50])
            if key not in seen:
                seen.add(key)
                unique_dates.append(date_info)

        # Classify with AI
        critical_dates = await self.classify_dates_with_ai(unique_dates)

        # Sort by date (upcoming first)
        critical_dates.sort(key=lambda x: x.date)

        return critical_dates


# Singleton instance
_date_extractor_instance: Optional[DateExtractor] = None


def get_date_extractor() -> DateExtractor:
    """Get singleton date extractor instance."""
    global _date_extractor_instance
    if _date_extractor_instance is None:
        _date_extractor_instance = DateExtractor()
    return _date_extractor_instance
