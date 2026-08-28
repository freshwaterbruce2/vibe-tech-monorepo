"""
Violation Detection Service - Detect legal violations in employment documents
Focus: SC unemployment law, Walmart policies, Sedgwick claims processing
"""

import re
from typing import List, Dict, Optional
from vibe_justice.ai.openrouter_client import OpenRouterClient


class Violation:
    """Represents a detected legal violation."""

    def __init__(
        self,
        violation_type: str,
        statute_citation: str,
        severity: str,
        evidence: str,
        page_number: Optional[int],
        recommended_action: str
    ):
        self.violation_type = violation_type
        self.statute_citation = statute_citation
        self.severity = severity  # CRITICAL, HIGH, MEDIUM, LOW
        self.evidence = evidence
        self.page_number = page_number
        self.recommended_action = recommended_action

    def to_dict(self) -> Dict:
        return {
            "type": self.violation_type,
            "statute": self.statute_citation,
            "severity": self.severity,
            "evidence": self.evidence,
            "pageNumber": self.page_number,
            "recommendedAction": self.recommended_action
        }


class ViolationDetector:
    """Detect legal violations in uploaded documents."""

    def __init__(self):
        self.openrouter_client = OpenRouterClient()

        # SC unemployment law requirements
        self.sc_unemployment_rules = {
            "written_warning": {
                "statute": "SC Code § 41-35-120",
                "requirement": "Written warnings required before termination for misconduct",
                "severity": "CRITICAL"
            },
            "progressive_discipline": {
                "statute": "SC Employment Law Best Practices",
                "requirement": "Progressive discipline (verbal → written → final → termination)",
                "severity": "HIGH"
            },
            "appeal_deadline": {
                "statute": "SC Code § 41-35-610",
                "requirement": "Appeal must be filed within 14 days of decision",
                "severity": "CRITICAL"
            },
            "documentation": {
                "statute": "SC Employment Documentation Standards",
                "requirement": "All disciplinary actions must be documented",
                "severity": "HIGH"
            }
        }

        # SC Family Law requirements
        self.sc_family_law_rules = {
            "child_support": {
                "statute": "SC Code § 63-17-310",
                "requirement": "Child support obligation continues until age 18 or high school graduation (whichever is later, max age 19)",
                "severity": "CRITICAL"
            },
            "custody_modification": {
                "statute": "SC Code § 63-15-240",
                "requirement": "Substantial change in circumstances required to modify custody order",
                "severity": "HIGH"
            },
            "parenting_plan": {
                "statute": "SC Code § 63-15-220",
                "requirement": "Parenting plan must address decision-making, parenting time, communication, dispute resolution",
                "severity": "HIGH"
            },
            "divorce_waiting_period": {
                "statute": "SC Code § 20-3-180",
                "requirement": "90-day waiting period after service of complaint for no-fault divorce",
                "severity": "MEDIUM"
            },
            "separation_requirement": {
                "statute": "SC Code § 20-3-10",
                "requirement": "One year continuous separation required for no-fault divorce on grounds of separation",
                "severity": "CRITICAL"
            },
            "guardian_ad_litem": {
                "statute": "SC Code § 63-3-830",
                "requirement": "Court may appoint guardian ad litem to represent child's best interests in custody cases",
                "severity": "HIGH"
            }
        }

        # SC Estate/Probate Law requirements
        self.sc_estate_law_rules = {
            "probate_filing": {
                "statute": "SC Code § 62-3-108",
                "requirement": "Petition for probate must be filed within 30 days of death if informal probate sought",
                "severity": "CRITICAL"
            },
            "will_contest_deadline": {
                "statute": "SC Code § 62-3-108",
                "requirement": "Will contest must be filed within 8 months of probate grant",
                "severity": "CRITICAL"
            },
            "intestate_succession": {
                "statute": "SC Code § 62-2-103",
                "requirement": "If no will, estate passes: (1) All to spouse if no descendants/parents, (2) Split with descendants/parents otherwise",
                "severity": "HIGH"
            },
            "homestead_exemption": {
                "statute": "SC Code § 62-2-402",
                "requirement": "Surviving spouse entitled to homestead allowance of $25,000 (priority over all claims except administration)",
                "severity": "HIGH"
            },
            "executor_duties": {
                "statute": "SC Code § 62-3-703",
                "requirement": "Personal representative must file inventory within 60 days of appointment",
                "severity": "HIGH"
            },
            "creditor_claims": {
                "statute": "SC Code § 62-3-803",
                "requirement": "Creditors have 8 months from date of first publication to file claims",
                "severity": "CRITICAL"
            }
        }

        # Walmart policy violations (common patterns)
        self.walmart_policy_patterns = [
            "attendance policy",
            "code of conduct",
            "progressive discipline",
            "coaching",
            "write-up",
            "points system"
        ]

    async def scan_for_violations(
        self,
        documents: List[Dict[str, str]],
        case_type: str = "unemployment"
    ) -> List[Violation]:
        """
        Scan documents for legal violations using AI reasoning.

        Args:
            documents: List of dicts with 'text_content' and 'filename'
            case_type: Type of case (unemployment, labor, discrimination)

        Returns:
            List of Violation objects
        """
        # Format documents for AI analysis
        docs_text = self._format_documents_for_analysis(documents)

        # Build case-specific legal framework
        if case_type == "family_law":
            legal_framework = """
LEGAL FRAMEWORK (SC Family Law):
1. SC Code § 63-17-310: Child support until age 18/HS graduation (max 19)
2. SC Code § 63-15-240: Substantial change in circumstances required for custody modification
3. SC Code § 63-15-220: Parenting plan requirements (decision-making, parenting time, communication, dispute resolution)
4. SC Code § 20-3-180: 90-day waiting period after service of divorce complaint
5. SC Code § 20-3-10: One year continuous separation for no-fault divorce
6. SC Code § 63-3-830: Guardian ad litem may be appointed for child's best interests

IDENTIFY ALL VIOLATIONS:
1. Child support calculation errors or improper termination
2. Custody modifications without substantial change showing
3. Incomplete or non-compliant parenting plans
4. Procedural violations (waiting periods, service requirements)
5. Best interests of child not properly considered
6. Violation of existing custody/support orders
"""
        elif case_type == "estate_law":
            legal_framework = """
LEGAL FRAMEWORK (SC Estate/Probate Law):
1. SC Code § 62-3-108: Probate petition within 30 days of death (informal), will contest within 8 months
2. SC Code § 62-2-103: Intestate succession rules (spouse/descendants/parents)
3. SC Code § 62-2-402: Homestead allowance $25,000 to surviving spouse (priority over claims)
4. SC Code § 62-3-703: Personal representative must file inventory within 60 days
5. SC Code § 62-3-803: Creditor claims must be filed within 8 months of first publication

IDENTIFY ALL VIOLATIONS:
1. Missed probate filing deadlines (30 days for informal, 8 months for will contest)
2. Improper distribution not following intestate succession
3. Failure to preserve homestead allowance for surviving spouse
4. Executor duties not performed (inventory, notice to creditors)
5. Improper creditor claim handling or missed deadlines
6. Will execution formalities not followed (witnesses, signatures)
"""
        else:  # employment_law (unemployment, Walmart/Sedgwick)
            legal_framework = """
LEGAL FRAMEWORK (SC Employment/Unemployment Law):
1. SC Code § 41-35-120: Written warnings required before termination for misconduct
2. SC Code § 41-35-610: Appeal must be filed within 14 days
3. Progressive discipline: Employer must follow their own policy
4. Documentation: All disciplinary actions must be documented
5. Sedgwick claims: Must respond to appeals within 10 business days

IDENTIFY ALL VIOLATIONS:
1. Missing written warnings before termination
2. Missing progressive discipline (verbal → written → final → termination)
3. Contradictory termination reasons in different documents
4. Appeal deadline violations (14 days for SC unemployment)
5. Missing documentation for claimed incidents
6. Employer policy violations (attendance, discipline procedures)
"""

        prompt = f"""
Analyze these legal documents for violations of South Carolina law.

Case Type: {case_type.upper().replace('_', ' ')}

{legal_framework}

DOCUMENTS TO ANALYZE:
{docs_text}

FORMAT OUTPUT AS JSON:
[
  {{
    "violation_type": "Brief violation name",
    "statute_citation": "SC Code § citation",
    "severity": "CRITICAL",
    "evidence": "Exact quote from document proving violation",
    "page_number": 2,
    "recommended_action": "Specific legal action to take"
  }},
  ...
]

SEVERITY LEVELS:
- CRITICAL: Violations of statutory requirements, missed deadlines that affect case outcome
- HIGH: Policy violations, missing documentation, contradictions that weaken case
- MEDIUM: Procedural issues, unclear documentation
- LOW: Minor discrepancies that don't affect case outcome
"""

        try:
            response = self.openrouter_client.perform_legal_research(
                jurisdiction="South Carolina",
                goals=prompt
            )

            # Parse JSON response
            violations_data = self._extract_json_from_response(response)

            # Convert to Violation objects
            violations = [
                Violation(
                    violation_type=v.get("violation_type", "Unknown"),
                    statute_citation=v.get("statute_citation", ""),
                    severity=v.get("severity", "MEDIUM"),
                    evidence=v.get("evidence", ""),
                    page_number=v.get("page_number"),
                    recommended_action=v.get("recommended_action", "")
                )
                for v in violations_data
            ]

            return violations

        except Exception as e:
            print(f"Violation detection error: {e}")
            return self._fallback_violation_detection(documents)

    def _format_documents_for_analysis(
        self,
        documents: List[Dict[str, str]]
    ) -> str:
        """Format documents for AI prompt."""
        formatted = []

        for i, doc in enumerate(documents, 1):
            formatted.append(
                f"DOCUMENT {i}: {doc['filename']}\n"
                f"{'='*50}\n"
                f"{doc['text_content']}\n"
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
            except json.JSONDecodeError as e:
                print(f"JSON parse error: {e}")
                pass

        return []

    def _fallback_violation_detection(
        self,
        documents: List[Dict[str, str]]
    ) -> List[Violation]:
        """Fallback violation detection using keyword matching."""
        violations = []

        # Combine all document text
        all_text = " ".join([d["text_content"] for d in documents])
        all_text_lower = all_text.lower()

        # Check for missing written warning
        if "terminated" in all_text_lower or "termination" in all_text_lower:
            if "written warning" not in all_text_lower and "final warning" not in all_text_lower:
                violations.append(Violation(
                    violation_type="Missing Written Warning",
                    statute_citation="SC Code § 41-35-120",
                    severity="CRITICAL",
                    evidence="Termination occurred without documented written warnings",
                    page_number=None,
                    recommended_action="Argue employer failed to follow proper termination procedures required by SC law"
                ))

        # Check for contradictions (different termination reasons)
        termination_reasons = []
        if "attendance" in all_text_lower:
            termination_reasons.append("attendance")
        if "policy violation" in all_text_lower or "violation of policy" in all_text_lower:
            termination_reasons.append("policy violation")
        if "misconduct" in all_text_lower:
            termination_reasons.append("misconduct")

        if len(termination_reasons) > 1:
            violations.append(Violation(
                violation_type="Contradictory Termination Reasons",
                statute_citation="General Employment Law",
                severity="HIGH",
                evidence=f"Multiple conflicting reasons found: {', '.join(termination_reasons)}",
                page_number=None,
                recommended_action="Highlight contradictions to undermine employer credibility"
            ))

        # Check for missing progressive discipline
        has_verbal = "verbal warning" in all_text_lower or "verbal coaching" in all_text_lower
        has_written = "written warning" in all_text_lower or "write-up" in all_text_lower
        has_final = "final warning" in all_text_lower

        if not (has_verbal and has_written and has_final):
            violations.append(Violation(
                violation_type="Incomplete Progressive Discipline",
                statute_citation="SC Employment Best Practices",
                severity="HIGH",
                evidence="No evidence of progressive discipline steps (verbal → written → final)",
                page_number=None,
                recommended_action="Argue employer failed to follow standard progressive discipline procedures"
            ))

        return violations

    async def check_appeal_deadline_compliance(
        self,
        notice_date: str,
        appeal_date: str
    ) -> Optional[Violation]:
        """
        Check if appeal was filed within 14-day deadline.

        Args:
            notice_date: Date of denial notice (ISO format)
            appeal_date: Date appeal was filed (ISO format)

        Returns:
            Violation if deadline missed, None otherwise
        """
        from datetime import datetime

        try:
            notice = datetime.fromisoformat(notice_date)
            appeal = datetime.fromisoformat(appeal_date)

            days_elapsed = (appeal - notice).days

            if days_elapsed > 14:
                return Violation(
                    violation_type="Missed Appeal Deadline",
                    statute_citation="SC Code § 41-35-610",
                    severity="CRITICAL",
                    evidence=f"Appeal filed {days_elapsed} days after notice (14-day limit)",
                    page_number=None,
                    recommended_action="Request waiver of deadline due to extraordinary circumstances or file late appeal with explanation"
                )

            return None

        except Exception as e:
            print(f"Date parsing error: {e}")
            return None


# Singleton instance
_violation_detector_instance: Optional[ViolationDetector] = None


def get_violation_detector() -> ViolationDetector:
    """Get singleton violation detector instance."""
    global _violation_detector_instance
    if _violation_detector_instance is None:
        _violation_detector_instance = ViolationDetector()
    return _violation_detector_instance
