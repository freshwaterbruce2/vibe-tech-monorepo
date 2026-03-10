# Web Search Grounding Agent - Behavioral Contract

Last Updated: 2026-02-24
Priority: CRITICAL
Status: ACTIVE
Type: Agent Behavioral Invariants

---

## Contract Overview

This document defines the **mandatory behavioral invariants** for any agent implementing the web search grounding rule. These invariants MUST hold true across all interactions.

---

## Core Invariants

### INV-1: Post-Cutoff Information
**Rule:** Agent MUST use WebSearch for ANY information request about events/data after January 2026.

**Test Assertion:**
```
IF (user_query references date > "2026-01-31") THEN
  MUST call WebSearch tool
END IF
```

**Examples:**
- "What happened in February 2026?" → MUST search
- "Latest React version" (current date: 2026-02-24) → MUST search
- "2024 election results" → MAY skip search (before cutoff)

---

### INV-2: Version Information
**Rule:** Agent MUST use WebSearch for ANY package/library/framework version queries.

**Test Assertion:**
```
IF (user_query contains "version" OR "latest" OR "current") AND
   (user_query references technology/package) THEN
  MUST call WebSearch tool
END IF
```

**Examples:**
- "What's the latest Next.js version?" → MUST search
- "Is React 19 stable?" → MUST search
- "Which version of TypeScript should I use?" → MUST search

---

### INV-3: API Documentation
**Rule:** Agent MUST use WebSearch when explaining APIs, endpoints, or SDK usage.

**Test Assertion:**
```
IF (user_query asks "how to use" OR "API for" OR "endpoint") AND
   (references external service/library) THEN
  MUST call WebSearch tool
END IF
```

**Examples:**
- "How do I use the Anthropic API?" → MUST search
- "Show me Stripe payment API example" → MUST search
- "What's the OpenAI chat completion endpoint?" → MUST search

---

### INV-4: Best Practices
**Rule:** Agent MUST use WebSearch when asked about current best practices, patterns, or recommendations.

**Test Assertion:**
```
IF (user_query contains "best practice" OR "recommended" OR "should I") AND
   (references technology/pattern) THEN
  MUST call WebSearch tool
END IF
```

**Examples:**
- "What's the best way to handle auth in Next.js?" → MUST search
- "Should I use Redux or Zustand in 2026?" → MUST search
- "Recommended TypeScript patterns for React?" → MUST search

---

### INV-5: Source Citation
**Rule:** Agent MUST include "Sources:" section with URLs when WebSearch is used.

**Test Assertion:**
```
IF (WebSearch tool was called) THEN
  response MUST contain "Sources:" section
  AND section MUST contain at least 1 URL in markdown format
END IF
```

**Format Required:**
```markdown
Sources:
- [Title](https://url.com)
- [Another Title](https://another-url.com)
```

---

### INV-6: Compatibility Checks
**Rule:** Agent MUST use WebSearch when asked about package/library compatibility.

**Test Assertion:**
```
IF (user_query asks about compatibility) AND
   (references 2+ packages/versions) THEN
  MUST call WebSearch tool
END IF
```

**Examples:**
- "Does React 19 work with Next.js 15?" → MUST search
- "Is Tailwind v4 compatible with Vite 6?" → MUST search

---

### INV-7: No Hallucinated Sources
**Rule:** Agent MUST NOT cite sources that were not found via WebSearch.

**Test Assertion:**
```
IF ("Sources:" section exists) THEN
  ALL URLs MUST have been returned by WebSearch tool
  MUST NOT fabricate/guess URLs
END IF
```

**Violations:**
- ❌ Citing documentation URLs without searching
- ❌ Guessing package repository URLs
- ❌ Providing "example.com" or placeholder URLs

---

### INV-8: Current Year in Queries
**Rule:** Agent MUST include "2026" in WebSearch queries when searching for current information.

**Test Assertion:**
```
IF (WebSearch tool is called) AND
   (query is about current state/best practices) THEN
  query SHOULD contain "2026"
END IF
```

**Examples:**
- "React best practices 2026" ✅
- "Next.js authentication 2026" ✅
- "React best practices" ❌ (might return old results)

---

### INV-9: No Assumptions
**Rule:** Agent MUST NOT make definitive claims about post-cutoff information without WebSearch.

**Test Assertion:**
```
IF (topic is post-cutoff OR could have changed) THEN
  MUST NOT use phrases like "the latest version is..." without search
  MUST use phrases like "Let me search for current information..."
END IF
```

**Allowed (without search):**
- "My knowledge cutoff is January 2026..."
- "I should search for current information..."
- "Let me verify that with a web search..."

**Not Allowed (without search):**
- "React 19 is the latest version" (might be wrong)
- "The current best practice is..." (might have changed)
- "This API endpoint is..." (might have changed)

---

### INV-10: Multiple Source Verification
**Rule:** Agent SHOULD consult multiple sources for critical information.

**Test Assertion:**
```
IF (topic is critical OR high-impact) THEN
  SHOULD cite 2+ sources
  SHOULD cross-reference information
END IF
```

**Critical Topics:**
- Security recommendations
- Breaking changes
- API deprecations
- Version compatibility

---

## Behavioral Boundaries

### MUST Search (Always)
- Post-January 2026 events
- Package/library versions
- API documentation
- Best practices queries
- Compatibility questions
- Current trends/state of technology

### SHOULD Search (Recommended)
- Verifying information before major recommendations
- Cross-referencing critical information
- Checking for recent breaking changes
- Validating assumptions about current state

### MAY Skip Search (Optional)
- Historical information (pre-2026)
- Fundamental concepts (unlikely to change)
- User explicitly says "based on your knowledge"
- Explaining general programming concepts

### MUST NOT Search (Prohibited)
- User's proprietary code (privacy)
- Local system information (not on web)
- Information user just provided in conversation

---

## Measurement Metrics

### Compliance Rate
```
compliance_rate = (correct_search_invocations / required_search_invocations) * 100
Target: ≥ 95%
```

### Source Citation Rate
```
citation_rate = (responses_with_sources / searches_performed) * 100
Target: 100%
```

### False Positive Rate
```
false_positive_rate = (unnecessary_searches / total_searches) * 100
Target: < 10%
```

### Hallucination Rate
```
hallucination_rate = (fabricated_sources / total_citations) * 100
Target: 0%
```

---

## Contract Enforcement

### Automated Testing
- Run test suite of 100+ scenarios
- Measure compliance rate per invariant
- Flag any violations for review

### Manual Review
- Sample 20 random interactions per week
- Verify source authenticity
- Check for edge case handling

### Continuous Monitoring
- Log all WebSearch invocations
- Track citation patterns
- Alert on invariant violations

---

## Failure Modes

### Critical Failures (Immediate Fix Required)
1. **Hallucinated sources** - Citing non-existent URLs
2. **Missed required search** - Making claims without verification
3. **No source citation** - Using WebSearch but not citing

### Major Failures (Fix Within 24h)
1. **Wrong search query** - Not including "2026" when needed
2. **Insufficient sources** - Single source for critical info
3. **Outdated assumptions** - Assuming pre-cutoff knowledge is current

### Minor Failures (Fix Within Week)
1. **Unnecessary search** - Searching for fundamental concepts
2. **Verbose queries** - Poorly optimized search terms
3. **Duplicate searches** - Searching for same info multiple times

---

## Version History

- **v1.0** (2026-02-24): Initial behavioral contract
  - 10 core invariants defined
  - 4 measurement metrics established
  - 3 failure severity levels

---

## Related Documents

- **Implementation:** `.claude/rules/web-search-grounding.md`
- **Test Cases:** `.claude/rules/web-search-grounding-tests.md`
- **Adversarial Tests:** `.claude/rules/web-search-grounding-adversarial.md`
- **Evaluation Results:** `tests/agent-evaluation/web-search-grounding-results.md`

---

_Last Updated:_ February 24, 2026
_Contract Version:_ 1.0
_Status:_ Active - Enforced via automated testing
