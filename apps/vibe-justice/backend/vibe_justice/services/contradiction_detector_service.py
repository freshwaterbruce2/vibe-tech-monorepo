"""
Contradiction Detection Service - Find contradictions across multiple documents
Based on: Clearbrief's side-by-side flagging approach
"""

import re
from typing import List, Dict, Optional
from vibe_justice.ai.openrouter_client import OpenRouterClient


class Contradiction:
    """Represents a contradiction found between documents."""

    def __init__(
        self,
        statement1: str,
        statement2: str,
        source1: str,
        source2: str,
        severity: str,
        impact: str,
        rebuttal: str
    ):
        self.statement1 = statement1
        self.statement2 = statement2
        self.source1 = source1
        self.source2 = source2
        self.severity = severity  # CRITICAL, HIGH, MEDIUM
        self.impact = impact
        self.rebuttal = rebuttal

    def to_dict(self) -> Dict:
        return {
            "statement1": self.statement1,
            "statement2": self.statement2,
            "source1": self.source1,
            "source2": self.source2,
            "severity": self.severity,
            "impact": self.impact,
            "rebuttal": self.rebuttal
        }


class ContradictionDetector:
    """Detect contradictions across multiple documents."""

    def __init__(self):
        self.openrouter_client = OpenRouterClient()

    async def find_contradictions(
        self,
        documents: List[Dict[str, str]]
    ) -> List[Contradiction]:
        """
        Find contradictions between documents using AI reasoning.

        Args:
            documents: List of dicts with 'text_content' and 'filename'

        Returns:
            List of Contradiction objects
        """
        if len(documents) < 2:
            return []  # Need at least 2 documents to find contradictions

        # Format documents for comparison
        docs_text = self._format_documents_for_comparison(documents)

        prompt = f"""
Compare these legal/employment documents and identify ALL contradictions.

DOCUMENTS:
{docs_text}

FIND CONTRADICTIONS IN:

1. Termination Reasons
   - Does Sedgwick say one thing and Walmart say another?
   - Example: Sedgwick: "terminated for attendance" vs Walmart: "policy violation"

2. Timeline of Events
   - Do dates/timelines match across documents?
   - Example: Manager says "warned on Dec 1" but HR has no record

3. Documented Warnings
   - Does termination letter claim warnings exist but HR file is empty?
   - Example: Letter: "multiple warnings given" vs File: no written warnings

4. Policy Statements
   - Does company handbook say one thing but actual practice differs?
   - Example: Policy: "progressive discipline required" vs Reality: "immediate termination"

5. Facts vs Claims
   - Do factual records contradict verbal claims?
   - Example: Manager: "employee absent 10 days" vs Records: "5 absences"

6. Contradictory Justifications
   - Are different justifications given at different times?
   - Example: Initial: "job performance" vs Appeal response: "attendance"

FORMAT AS JSON:
[
  {{
    "statement1": "Exact quote from first document",
    "source1": "Document name where statement1 appears",
    "statement2": "Contradictory quote from second document",
    "source2": "Document name where statement2 appears",
    "severity": "CRITICAL/HIGH/MEDIUM",
    "impact": "How this contradiction helps the unemployment claim",
    "rebuttal": "Suggested argument to present at hearing"
  }},
  ...
]

SEVERITY RULES:
- CRITICAL: Direct contradictions on core facts (termination reason, dates, policy requirements)
- HIGH: Contradictions on supporting facts (number of incidents, warnings given)
- MEDIUM: Minor inconsistencies in details

FOCUS ON CONTRADICTIONS THAT:
1. Undermine employer credibility
2. Show failure to follow procedures
3. Prove lack of documentation
4. Demonstrate employer uncertainty about facts
"""

        try:
            response = self.openrouter_client.perform_legal_research(
                jurisdiction="South Carolina",
                goals=prompt
            )

            # Parse JSON response
            contradictions_data = self._extract_json_from_response(response)

            # Convert to Contradiction objects
            contradictions = [
                Contradiction(
                    statement1=c.get("statement1", ""),
                    statement2=c.get("statement2", ""),
                    source1=c.get("source1", ""),
                    source2=c.get("source2", ""),
                    severity=c.get("severity", "MEDIUM"),
                    impact=c.get("impact", ""),
                    rebuttal=c.get("rebuttal", "")
                )
                for c in contradictions_data
            ]

            return contradictions

        except Exception as e:
            print(f"Contradiction detection error: {e}")
            return self._fallback_contradiction_detection(documents)

    def _format_documents_for_comparison(
        self,
        documents: List[Dict[str, str]]
    ) -> str:
        """Format documents for side-by-side comparison."""
        formatted = []

        for i, doc in enumerate(documents, 1):
            formatted.append(
                f"DOCUMENT {i}: {doc['filename']}\n"
                f"{'-'*60}\n"
                f"{doc['text_content'][:5000]}\n"  # Limit to 5000 chars per doc
                f"{'[...]' if len(doc['text_content']) > 5000 else ''}\n"
            )

        return "\n\n".join(formatted)

    def _extract_json_from_response(self, response: str) -> List[Dict]:
        """Extract JSON array from AI response."""
        import json

        # Find JSON array in response
        match = re.search(r'\[\s*\{.*\}\s*\]', response, re.DOTALL)

        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        return []

    def _fallback_contradiction_detection(
        self,
        documents: List[Dict[str, str]]
    ) -> List[Contradiction]:
        """Fallback contradiction detection using keyword patterns."""
        contradictions = []

        # Simple keyword-based contradiction detection
        termination_keywords = {
            "attendance": [],
            "policy": [],
            "misconduct": [],
            "performance": []
        }

        # Find which documents mention which termination reasons
        for doc in documents:
            text_lower = doc["text_content"].lower()

            if "attendance" in text_lower:
                termination_keywords["attendance"].append(doc["filename"])
            if "policy violation" in text_lower or "violation of policy" in text_lower:
                termination_keywords["policy"].append(doc["filename"])
            if "misconduct" in text_lower:
                termination_keywords["misconduct"].append(doc["filename"])
            if "performance" in text_lower or "job performance" in text_lower:
                termination_keywords["performance"].append(doc["filename"])

        # Check for contradictory reasons
        reasons_found = [k for k, v in termination_keywords.items() if v]

        if len(reasons_found) > 1:
            # Found multiple different termination reasons
            reason1 = reasons_found[0]
            reason2 = reasons_found[1]

            contradictions.append(Contradiction(
                statement1=f"Terminated for {reason1}",
                source1=termination_keywords[reason1][0],
                statement2=f"Terminated for {reason2}",
                source2=termination_keywords[reason2][0],
                severity="CRITICAL",
                impact=(
                    f"Employer gave multiple conflicting reasons for termination "
                    f"({reason1} vs {reason2}), which undermines their credibility "
                    f"and suggests uncertainty about the actual cause."
                ),
                rebuttal=(
                    f"Argue that the employer's inability to provide a consistent "
                    f"termination reason demonstrates this was not a legitimate "
                    f"discharge for misconduct under SC unemployment law."
                )
            ))

        return contradictions

    async def compare_two_documents(
        self,
        doc1: Dict[str, str],
        doc2: Dict[str, str]
    ) -> List[Contradiction]:
        """
        Compare two specific documents for contradictions.

        Args:
            doc1: First document
            doc2: Second document

        Returns:
            List of contradictions found
        """
        return await self.find_contradictions([doc1, doc2])


# Singleton instance
_contradiction_detector_instance: Optional[ContradictionDetector] = None


def get_contradiction_detector() -> ContradictionDetector:
    """Get singleton contradiction detector instance."""
    global _contradiction_detector_instance
    if _contradiction_detector_instance is None:
        _contradiction_detector_instance = ContradictionDetector()
    return _contradiction_detector_instance
