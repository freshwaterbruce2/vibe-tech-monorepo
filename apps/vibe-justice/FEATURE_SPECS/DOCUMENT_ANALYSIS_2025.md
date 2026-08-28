# Document Analysis Features (2025 Legal AI Standards)

**Date**: January 15, 2025
**Based on**: Research of leading legal AI platforms (Harvey, Spellbook, Clearbrief, Legal-Pythia, Darrow)
**Priority**: HIGH VALUE - Core competitive advantage

---

## Overview

Automated legal document analysis that takes the heavy workload off users by:

1. Scanning uploaded documents (PDFs, DOCX, images)
2. Organizing information into structured data
3. Analyzing for violations, contradictions, compliance gaps
4. Extracting critical dates and deadlines
5. Generating actionable next steps

---

## Feature 1: Violation Detection Engine

### What It Does

Scans documents for potential legal violations specific to:

- SC unemployment law (SC Code § 41-35-120)
- Federal employment regulations
- Walmart policy violations
- Sedgwick claims processing requirements

### User Flow

```
1. User uploads: Termination letter, Sedgwick denial, HR records
2. AI scans for violations:
   - Missing written warnings
   - No progressive discipline
   - Failure to provide required documentation
   - Appeal deadline violations
3. Output:
   - List of violations with statute citations
   - Severity rating (CRITICAL, HIGH, MEDIUM, LOW)
   - Evidence location (page number, paragraph)
```

### Technical Implementation

```python
# vibe_justice/services/violation_detector.py
class ViolationDetector:
    """Detect legal violations in uploaded documents"""

    def __init__(self):
        self.sc_unemployment_rules = self._load_sc_rules()
        self.walmart_policies = self._load_walmart_policies()

    async def scan_for_violations(
        self,
        documents: List[Document],
        case_type: str = "unemployment"
    ) -> List[Violation]:
        """
        Scan documents for violations using OpenRouter AI.

        Returns:
            List of violations with:
            - violation_type: str
            - statute_citation: str
            - severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
            - evidence: str (exact quote from document)
            - page_number: int
            - recommended_action: str
        """
        # Use DeepSeek R1 for reasoning about violations
        prompt = f"""
        Analyze these employment documents for violations of:
        - South Carolina unemployment law (SC Code § 41-35-120)
        - Federal employment regulations
        - Employer's own policies

        Documents:
        {self._format_documents(documents)}

        Identify:
        1. Missing required documentation
        2. Contradictions between documents
        3. Failure to follow progressive discipline
        4. Deadline violations
        5. Policy violations

        Format as JSON with statute citations.
        """

        response = await self.openrouter_client.perform_legal_research(
            jurisdiction="South Carolina",
            goals=prompt
        )

        return self._parse_violations(response)
```

### UI Component

```tsx
// ViolationsPanel.tsx
interface Violation {
  type: string;
  statute: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  evidence: string;
  pageNumber: number;
  recommendedAction: string;
}

function ViolationsPanel({ violations }: { violations: Violation[] }) {
  return (
    <div className="space-y-4">
      {violations.map((v, i) => (
        <Alert key={i} variant={v.severity === "CRITICAL" ? "destructive" : "warning"}>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{v.type}</AlertTitle>
          <AlertDescription>
            <p className="font-semibold">{v.statute}</p>
            <p className="text-sm mt-2">Evidence: "{v.evidence}" (Page {v.pageNumber})</p>
            <p className="text-sm mt-2 text-blue-600">Action: {v.recommendedAction}</p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
```

---

## Feature 2: Deadline & Date Extraction

### What It Does

Extracts ALL dates from documents and categorizes by importance:

- Appeal deadlines (CRITICAL)
- Hearing dates
- Document submission deadlines
- Termination/incident dates
- Policy effective dates

### User Flow

```
1. User uploads documents
2. AI extracts all dates:
   - "Appeal must be filed within 14 days of this notice" → Jan 29, 2025
   - "Hearing scheduled for February 5, 2025 at 10:00 AM"
   - "Terminated on December 15, 2024"
3. Creates calendar with countdown:
   - "Appeal Deadline: 5 DAYS REMAINING ⚠️"
   - Auto-reminder: 3 days before, 1 day before
4. Visual timeline of all events
```

### Technical Implementation

```python
# vibe_justice/services/date_extractor.py
class DateExtractor:
    """Extract and categorize dates from legal documents"""

    async def extract_dates(
        self,
        documents: List[Document]
    ) -> List[CriticalDate]:
        """
        Extract dates using NLP + AI reasoning.

        Returns:
            - date: datetime
            - label: str (e.g., "Appeal Deadline")
            - importance: Literal["CRITICAL", "HIGH", "MEDIUM"]
            - source: str (document name + page)
            - days_remaining: int
            - context: str (surrounding text)
        """
        # Use regex + spaCy for initial extraction
        dates_found = self._regex_extract(documents)

        # Use DeepSeek R1 to classify importance
        prompt = f"""
        Classify these dates by legal importance:
        {dates_found}

        Rules:
        - Appeal deadlines = CRITICAL
        - Court/hearing dates = CRITICAL
        - Document submission = HIGH
        - Termination/incident dates = MEDIUM
        """

        classification = await self.openrouter_client.perform_legal_research(
            jurisdiction="South Carolina",
            goals=prompt
        )

        return self._build_timeline(dates_found, classification)
```

### UI Component

```tsx
// DeadlineTimeline.tsx
function DeadlineTimeline({ dates }: { dates: CriticalDate[] }) {
  const today = new Date();

  return (
    <div className="space-y-4">
      {dates.map((date, i) => {
        const daysRemaining = Math.ceil(
          (date.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <div key={i} className="border-l-4 border-red-500 pl-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{date.label}</h4>
                <p className="text-sm text-gray-600">{date.date.toLocaleDateString()}</p>
                <p className="text-xs text-gray-500">Source: {date.source}</p>
              </div>
              <Badge variant={daysRemaining < 7 ? "destructive" : "warning"}>
                {daysRemaining} days
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Feature 3: Contradiction Detector

### What It Does

Finds contradictions between:

- Employer statements vs HR records
- Sedgwick denial vs Walmart termination notice
- Manager testimony vs written policy
- Timeline inconsistencies

### User Flow

```
1. User uploads multiple documents
2. AI cross-references all statements/facts
3. Flags contradictions:
   - "Sedgwick says 'terminated for attendance'"
   - "Walmart notice says 'policy violation'"
   - Severity: HIGH - conflicting reasons undermine credibility
4. Side-by-side comparison view
5. Suggested rebuttal language
```

### Technical Implementation

```python
# vibe_justice/services/contradiction_detector.py
class ContradictionDetector:
    """Detect contradictions across multiple documents"""

    async def find_contradictions(
        self,
        documents: List[Document]
    ) -> List[Contradiction]:
        """
        Compare all documents for contradictory statements.

        Uses:
        - Entity extraction (people, dates, policies)
        - Semantic similarity comparison
        - Logical reasoning (DeepSeek R1)

        Returns:
            - statement1: str (from doc A)
            - statement2: str (from doc B)
            - severity: str
            - impact: str (how this helps the case)
            - rebuttal: str (suggested argument)
        """
        # Extract all factual claims
        claims = await self._extract_claims(documents)

        # Compare using DeepSeek R1 reasoning
        prompt = f"""
        Compare these claims for contradictions:
        {claims}

        Identify:
        1. Direct contradictions (A says X, B says Y)
        2. Timeline inconsistencies
        3. Missing evidence for claims
        4. Policy violations vs stated reasons

        For each contradiction, explain:
        - Why it's problematic
        - How it helps the unemployment claim
        - Suggested rebuttal language
        """

        response = await self.openrouter_client.perform_legal_research(
            jurisdiction="South Carolina",
            goals=prompt
        )

        return self._parse_contradictions(response)
```

### UI Component

```tsx
// ContradictionsPanel.tsx
function ContradictionCard({ contradiction }: { contradiction: Contradiction }) {
  return (
    <Card>
      <CardHeader>
        <Badge variant="destructive">{contradiction.severity}</Badge>
        <CardTitle>Contradiction Found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded bg-red-50">
            <p className="text-sm font-semibold">Document A</p>
            <p className="text-sm mt-2">"{contradiction.statement1}"</p>
            <p className="text-xs text-gray-500 mt-1">{contradiction.source1}</p>
          </div>
          <div className="border p-4 rounded bg-blue-50">
            <p className="text-sm font-semibold">Document B</p>
            <p className="text-sm mt-2">"{contradiction.statement2}"</p>
            <p className="text-xs text-gray-500 mt-1">{contradiction.source2}</p>
          </div>
        </div>

        <Alert>
          <AlertTitle>Impact on Case</AlertTitle>
          <AlertDescription>{contradiction.impact}</AlertDescription>
        </Alert>

        <div className="bg-green-50 p-4 rounded">
          <p className="text-sm font-semibold">Suggested Rebuttal:</p>
          <p className="text-sm mt-2">{contradiction.rebuttal}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Feature 4: Compliance Gap Checker

### What It Does

Verifies employer followed all legal requirements:

- SC unemployment law procedures
- Progressive discipline requirements
- Documentation standards
- Appeal response timelines

### Technical Implementation

```python
# vibe_justice/services/compliance_checker.py
class ComplianceChecker:
    """Check if employer followed legal requirements"""

    def __init__(self):
        self.sc_requirements = {
            "written_warning": "SC Code § 41-35-120 requires written warnings",
            "progressive_discipline": "Employer policy must be followed",
            "appeal_timeline": "Sedgwick has 10 days to respond",
            "documentation": "All disciplinary actions must be documented"
        }

    async def check_compliance(
        self,
        documents: List[Document]
    ) -> ComplianceReport:
        """
        Returns:
            - requirement: str
            - met: bool
            - evidence: Optional[str]
            - citation: str
        """
        results = []

        for req, citation in self.sc_requirements.items():
            evidence = await self._find_evidence(documents, req)
            results.append({
                "requirement": req,
                "met": evidence is not None,
                "evidence": evidence,
                "citation": citation
            })

        return ComplianceReport(results)
```

---

## Feature 5: Action Plan Generator

### What It Does

Creates step-by-step plan based on:

- Violations found
- Deadlines extracted
- Contradictions detected
- Compliance gaps identified

### Output Example

```markdown
## Immediate Actions (Next 7 Days)
1. **File Appeal by January 29, 2025** ⚠️ CRITICAL (5 days remaining)
   - Use template: SC Unemployment Appeal Letter
   - Attach: Contradiction evidence (Sedgwick vs Walmart)

2. **Request HR Documentation** (Due: January 22, 2025)
   - Written warnings (none on file - violation!)
   - Progressive discipline records
   - Walmart attendance policy

## Before Hearing (February 5, 2025)
3. **Prepare Evidence Packet** (Due: February 1, 2025)
   - Organize by violation type
   - Create timeline with document references
   - Highlight contradictions side-by-side

4. **Obtain Witness Statements**
   - Coworkers who can verify no warnings given
   - Manager who may confirm policy violation

## During Hearing Strategy
5. **Present Key Arguments**
   - Contradiction: Sedgwick (attendance) vs Walmart (policy)
   - Violation: No written warnings (SC Code § 41-35-120)
   - Compliance gap: No progressive discipline documented
```

---

## Document Upload Flow

```
User Action                    → System Response
───────────────────────────────────────────────────────
Upload PDF/DOCX/Image          → OCR + Text extraction
                                 ChromaDB vector storage

Click "Analyze Documents"      → Parallel execution:
                                 1. Violation detection
                                 2. Date extraction
                                 3. Contradiction finder
                                 4. Compliance checker

View Results                   → Tabbed interface:
                                 - Violations (with severity)
                                 - Deadlines (with countdown)
                                 - Contradictions (side-by-side)
                                 - Action Plan (prioritized)

Export Report                  → PDF with all findings
                                 + Evidence references
                                 + Next steps checklist
```

---

## Performance Targets (Based on Competitor Research)

| Metric | Target | Competitor Benchmark |
|--------|--------|---------------------|
| Document Processing | <30 seconds per PDF | Streamline AI: 30-40% faster |
| Violation Detection Accuracy | >90% | Spellbook: 80% review speedup |
| Date Extraction Accuracy | >95% | Industry standard |
| Contradiction Detection | >85% | Clearbrief: Real-time flagging |
| User Time Saved | 5+ hours per case | Harvey AI: Seconds vs hours |

---

## Technology Stack

### Backend (Python)

- **FastAPI**: REST API endpoints
- **OpenRouter + DeepSeek R1**: Legal reasoning (FREE!)
- **ChromaDB**: Vector storage for RAG
- **PyPDF2 + python-docx**: Document parsing
- **spaCy**: NLP for date/entity extraction
- **Tesseract**: OCR for scanned documents

### Frontend (React)

- **Tauri**: Desktop app wrapper
- **shadcn/ui**: Alerts, Badges, Cards for violations
- **React Query**: Async state management
- **Recharts**: Timeline visualization
- **PDF.js**: Document viewer with highlighting

---

## MVP Implementation Order

**Phase 1 (Week 1-2):**

1. Document upload + OCR
2. Date extraction + deadline tracking
3. Basic violation detection (missing warnings)

**Phase 2 (Week 3-4):**
4. Contradiction detector
5. Compliance gap checker
6. Action plan generator

**Phase 3 (Week 5-6):**
7. Evidence highlighting in PDFs
8. Export to PDF report
9. Email reminders for deadlines

---

## Competitive Advantage

**What makes Vibe-Justice different:**

1. **Specialized for unemployment/Walmart cases** (not generic legal AI)
2. **SC-specific law knowledge** (competitors are multi-state)
3. **FREE AI reasoning** (DeepSeek R1 vs Harvey's $300M funding)
4. **Desktop app** (works offline, no cloud upload concerns)
5. **Focused workflow** (upload → analyze → action plan in 3 clicks)

---

## Success Metrics

**User Impact:**

- Time to analyze case: 5+ hours → <30 minutes (90% reduction)
- Violations found: Manual (3-5) → AI (10-15) (200% improvement)
- Appeal success rate: Track over 100 cases
- User retention: 80%+ monthly active users

**Technical:**

- Document processing: <30 sec per file
- AI accuracy: >90% violation detection
- Uptime: 99.5%
- Cost per analysis: <$0.50 (DeepSeek pricing)

---

**Sources:**

- [Streamline AI Legal Compliance Tools](https://www.streamline.ai/tips/best-ai-tools-legal-compliance-review)
- [Spellbook AI Legal Compliance 2025](https://www.spellbook.legal/learn/ai-legal-compliance)
- [Harvey AI Professional Platform](https://www.harvey.ai/)
- [Clearbrief Contradiction Detection](https://www.legalfly.com/post/9-best-ai-contract-review-software-tools-for-2025)
- [Legal-Pythia Explainable AI](https://www.americanbar.org/groups/law_practice/resources/law-technology-today/2025/how-ai-enhances-legal-document-review/)

---

**Last Updated**: January 15, 2025
**Status**: READY FOR IMPLEMENTATION
**Estimated Development Time**: 6 weeks (MVP)
