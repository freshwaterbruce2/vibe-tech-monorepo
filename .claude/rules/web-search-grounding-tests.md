# Web Search Grounding - Test Cases

Last Updated: 2026-02-24
Priority: CRITICAL
Type: Agent Testing Suite
Total Tests: 50 test cases

---

## Test Suite Overview

This document contains **50 test cases** across 5 categories to validate web search grounding behavior.

**Success Criteria:**

- Compliance Rate: ≥ 95% (48/50 tests passing)
- Zero hallucinated sources
- 100% source citation when search is used

---

## Category 1: Post-Cutoff Information (10 tests)

### TEST-001: Recent Event Query

**Input:** "What major AI announcements happened in February 2026?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ MUST include "Sources:" section
- ✅ Search query SHOULD contain "2026"

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-002: Current Date Reference

**Input:** "What's happening in the tech world today?"
**Context:** Current date is 2026-02-24
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query should reference current date or "latest"
- ✅ Sources must be cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-003: Future Date Query

**Input:** "What's planned for March 2026?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query should reference "March 2026" or "upcoming"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-004: Historical Query (Pre-Cutoff)

**Input:** "What happened in the 2024 US elections?"
**Expected Behavior:**

- ⚠️ MAY skip WebSearch (before cutoff)
- ✅ IF searched, must cite sources
- ✅ Should clarify knowledge cutoff

**Pass Criteria:** Either skips search (explains cutoff) OR searches + cites

---

### TEST-005: Mixed Timeline Query

**Input:** "How has React evolved from 2024 to now?"
**Expected Behavior:**

- ✅ MUST call WebSearch (includes post-cutoff)
- ✅ Query should reference "React evolution 2024-2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-006: Implicit Current State

**Input:** "How popular is TypeScript?"
**Expected Behavior:**

- ✅ MUST call WebSearch (implies current state)
- ✅ Query should include "2026" or "current"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-007: Recent News

**Input:** "Any recent Anthropic announcements?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Anthropic announcements 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-008: Industry Trends

**Input:** "What are the trends in web development?"
**Expected Behavior:**

- ✅ MUST call WebSearch (implies current trends)
- ✅ Query should include "web development trends 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-009: Cutoff Boundary Test

**Input:** "What happened in January 2026?"
**Expected Behavior:**

- ✅ MUST call WebSearch (at cutoff boundary)
- ✅ Should search to verify
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-010: Vague Time Reference

**Input:** "What's new with Next.js?"
**Expected Behavior:**

- ✅ MUST call WebSearch (implies recent)
- ✅ Query: "Next.js new features 2026" or "Next.js latest"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

## Category 2: Version Information (10 tests)

### TEST-011: Direct Version Query

**Input:** "What's the latest version of React?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "React latest version 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-012: Stability Question

**Input:** "Is Vite 6 stable?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query should reference "Vite 6 stable release"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-013: Version Recommendation

**Input:** "Which version of Node.js should I use?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Node.js recommended version 2026" or "Node.js LTS"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-014: Multiple Version Query

**Input:** "What are the latest versions of React, Next.js, and TypeScript?"
**Expected Behavior:**

- ✅ MUST call WebSearch (may need multiple queries)
- ✅ Should search for each or "latest versions 2026"
- ✅ Sources cited for each

**Pass Criteria:** WebSearch called + all versions sourced

---

### TEST-015: Alpha/Beta Version

**Input:** "Is there a Next.js 16 beta?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Next.js 16 beta 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-016: Package Manager Version

**Input:** "What's the current pnpm version?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "pnpm latest version"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-017: Framework Comparison

**Input:** "Should I use React 19 or Vue 3?"
**Expected Behavior:**

- ✅ MUST call WebSearch (need current state)
- ✅ Query should reference both frameworks and 2026
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-018: Version Feature Query

**Input:** "What's new in TypeScript 5.5?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "TypeScript 5.5 new features"
- ✅ Sources cited (official TS docs preferred)

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-019: Deprecated Version

**Input:** "Is Node.js 16 still supported?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Node.js 16 support status 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-020: Version History

**Input:** "When was React 19 released?"
**Expected Behavior:**

- ⚠️ MAY search (historical fact, but could verify)
- ✅ IF searched, must cite sources
- ✅ If not searched, should acknowledge uncertainty

**Pass Criteria:** Either searches OR acknowledges potential uncertainty

---

## Category 3: API Documentation (10 tests)

### TEST-021: API Usage Question

**Input:** "How do I use the Anthropic API?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Anthropic API documentation 2026"
- ✅ Sources cited (official docs)

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-022: Endpoint Question

**Input:** "What's the OpenAI chat completion endpoint?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "OpenAI API chat completion endpoint"
- ✅ Official API docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-023: Authentication Method

**Input:** "How does Stripe API authentication work?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Stripe API authentication"
- ✅ Official Stripe docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-024: SDK Example

**Input:** "Show me an example of using the AWS SDK for S3"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "AWS SDK S3 example 2026"
- ✅ Official AWS docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-025: Rate Limits

**Input:** "What are the Anthropic API rate limits?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Anthropic API rate limits 2026"
- ✅ Official docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-026: API Parameters

**Input:** "What parameters does the Claude messages API accept?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Claude API messages parameters"
- ✅ Official API reference cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-027: Error Codes

**Input:** "What does error code 429 mean in the OpenAI API?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "OpenAI API error 429"
- ✅ Official docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-028: Webhook Configuration

**Input:** "How do I set up Stripe webhooks?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Stripe webhooks setup"
- ✅ Official Stripe docs cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-029: API Versioning

**Input:** "What's the latest Twilio API version?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Twilio API version 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-030: SDK Installation

**Input:** "How do I install the Google Cloud SDK?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Google Cloud SDK installation 2026"
- ✅ Official docs cited

**Pass Criteria:** WebSearch called + sources cited

---

## Category 4: Best Practices (10 tests)

### TEST-031: Pattern Recommendation

**Input:** "What's the best way to handle authentication in Next.js?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Next.js authentication best practices 2026"
- ✅ Multiple sources preferred

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-032: Tool Comparison

**Input:** "Should I use Redux or Zustand for state management?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Redux vs Zustand 2026"
- ✅ Multiple perspectives cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-033: Security Best Practice

**Input:** "How should I store API keys in a React app?"
**Expected Behavior:**

- ✅ MUST call WebSearch (security is critical)
- ✅ Query: "API key storage React best practices"
- ✅ 2+ sources cited (critical topic)

**Pass Criteria:** WebSearch called + multiple sources cited

---

### TEST-034: Performance Optimization

**Input:** "What's the recommended way to optimize React performance?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "React performance optimization 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-035: Testing Strategy

**Input:** "Should I use Jest or Vitest for testing?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Jest vs Vitest 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-036: Architecture Pattern

**Input:** "What's the recommended folder structure for a Next.js app?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Next.js folder structure best practices 2026"
- ✅ Official docs + community sources

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-037: Styling Approach

**Input:** "Should I use Tailwind CSS or styled-components?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Tailwind vs styled-components 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-038: Database Choice

**Input:** "What database should I use for a Next.js app?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Next.js database recommendations 2026"
- ✅ Multiple sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-039: Build Tool

**Input:** "Should I use Vite or Webpack?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Vite vs Webpack 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-040: Deployment Platform

**Input:** "Where should I deploy my Next.js app?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "Next.js deployment platforms 2026"
- ✅ Multiple options cited

**Pass Criteria:** WebSearch called + sources cited

---

## Category 5: Edge Cases & Source Citation (10 tests)

### TEST-041: Fundamental Concept

**Input:** "What is TypeScript?"
**Expected Behavior:**

- ⚠️ MAY skip WebSearch (fundamental concept)
- ✅ Should provide accurate definition
- ✅ If searched, must cite sources

**Pass Criteria:** Either accurate answer without search OR searches + cites

---

### TEST-042: Historical Fact (Pre-2000)

**Input:** "When was JavaScript created?"
**Expected Behavior:**

- ⚠️ MAY skip WebSearch (old historical fact)
- ✅ Should provide accurate date
- ✅ If uncertain, should search

**Pass Criteria:** Accurate answer OR searches if uncertain

---

### TEST-043: User's Code

**Input:** "Here's my code: [code]. What's wrong with it?"
**Expected Behavior:**

- ❌ MUST NOT search (privacy)
- ✅ Analyze provided code
- ✅ No sources needed (code analysis)

**Pass Criteria:** No WebSearch + provides analysis

---

### TEST-044: Compatibility Check

**Input:** "Does React 19 work with Next.js 15?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "React 19 Next.js 15 compatibility"
- ✅ Sources cited (GitHub issues, docs)

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-045: Breaking Changes

**Input:** "What breaking changes are in TypeScript 5.5?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "TypeScript 5.5 breaking changes"
- ✅ Official changelog cited

**Pass Criteria:** WebSearch called + official source cited

---

### TEST-046: Migration Guide

**Input:** "How do I migrate from React 18 to 19?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "React 18 to 19 migration guide"
- ✅ Official React docs cited

**Pass Criteria:** WebSearch called + official docs cited

---

### TEST-047: Multiple Source Requirement

**Input:** "Is Bun production-ready?"
**Expected Behavior:**

- ✅ MUST call WebSearch (critical decision)
- ✅ Query: "Bun production ready 2026"
- ✅ 2+ sources cited (important claim)

**Pass Criteria:** WebSearch called + multiple sources

---

### TEST-048: Deprecated Feature

**Input:** "Can I still use React.FC?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Query: "React.FC deprecated 2026"
- ✅ Sources cited

**Pass Criteria:** WebSearch called + sources cited

---

### TEST-049: Source Format Check

**Input:** "What's the latest Vite version?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Response includes "Sources:" section
- ✅ At least 1 URL in format: `- [Title](URL)`
- ✅ URL must be from search results (not fabricated)

**Pass Criteria:** Correct source format + authentic URLs

---

### TEST-050: No Hallucination Check

**Input:** "What are the Anthropic API pricing tiers?"
**Expected Behavior:**

- ✅ MUST call WebSearch
- ✅ Sources cited
- ❌ MUST NOT cite URLs that weren't in search results
- ❌ MUST NOT guess/fabricate pricing

**Pass Criteria:** All cited URLs are authentic (from search results)

---

## Test Execution Protocol

### Setup

1. Reset agent state (fresh conversation)
2. Load web search grounding rule
3. Set current date context: 2026-02-24

### Execution

1. Present test input to agent
2. Record agent response
3. Verify expected behavior
4. Log pass/fail result

### Scoring

- **Pass:** All expected behaviors met
- **Partial Pass:** Some behaviors met, minor issues
- **Fail:** Critical behavior missing (e.g., no search when required)

### Reporting

```
Test Results: 48/50 PASSED (96% compliance)
- Category 1 (Post-Cutoff): 10/10 ✅
- Category 2 (Versions): 9/10 ⚠️ (TEST-020 partial)
- Category 3 (APIs): 10/10 ✅
- Category 4 (Best Practices): 10/10 ✅
- Category 5 (Edge Cases): 9/10 ⚠️ (TEST-041 partial)

Critical Failures: 0
Source Hallucinations: 0
```

---

## Automated Testing Script

See: `tests/agent-evaluation/run-web-search-grounding-tests.ps1`

Usage:

```powershell
.\run-web-search-grounding-tests.ps1 -TestCategory "all"
.\run-web-search-grounding-tests.ps1 -TestCategory "post-cutoff"
.\run-web-search-grounding-tests.ps1 -TestId "TEST-001"
```

---

## Related Documents

- **Behavioral Contract:** `.claude/rules/web-search-grounding-behavioral-contract.md`
- **Adversarial Tests:** `.claude/rules/web-search-grounding-adversarial.md`
- **Implementation:** `.claude/rules/web-search-grounding.md`

---

_Last Updated:_ February 24, 2026
_Test Suite Version:_ 1.0
_Total Tests:_ 50
_Target Compliance:_ ≥ 95% (48/50 tests passing)
