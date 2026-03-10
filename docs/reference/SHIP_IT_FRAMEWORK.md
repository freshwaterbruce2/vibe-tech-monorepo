# SHIP-IT FRAMEWORK

**Created:** 2026-01-10
**Priority:** CRITICAL - SYSTEM-WIDE ENFORCEMENT
**Goal:** Get projects to production. Stop the refactoring cycle. Ship software.

---

## THE PROBLEM

We have 50+ projects and none of them are truly "done." The pattern:

1. Start a project with excitement
2. Get 60-80% done
3. Notice something that could be "better"
4. Start refactoring
5. New shiny thing appears
6. Jump to new project
7. Repeat forever

**Result:** Zero shipped products. Maximum frustration.

---

## THE SOLUTION: SHIP-IT PROTOCOL (2026 EDITION)

### Core Principles

1. **"Done" means SHIPPED, not "working locally"**
2. **Perfect is the enemy of shipped**
3. **Refactoring is FORBIDDEN until after production**
4. **One project at a time until completion**
5. **No new features until MVP is shipped**
6. **AI-First Delivery**: Use agents to automate the "boring" parts of shipping (installers, docs, tests).

---

## PROJECT TIERS

### Tier 1: SHIP IMMEDIATELY (Focus Queue)

Projects that are 70%+ complete and should be finished FIRST:

| Project | Status | Missing | Est. Effort |
|---------|--------|---------|-------------|
| `nova-agent` | 85% | Final polish, installer | 1-2 days |
| `vibe-code-studio` | 75% | >95% accuracy, LLM fine-tuning (PY/JS/TS) | 4-5 days |
| `crypto-enhanced` | 90% | Monitoring, safety | 1 day |
| `shipping-pwa` | 75% | PWA manifest, offline | 2 days |
| `vibe-tutor` | 80% | Android deploy | 1 day |

**RULE:** NO new projects until Tier 1 is complete.

### Tier 2: COMPLETE NEXT

Projects that are 50-70% complete:

- `business-booking-platform`
- `vibe-justice`
- `iconforge`
- `digital-content-builder`

### Tier 3: FREEZE

Projects <50% complete - **FROZEN** until Tier 1 & 2 done:

- `invoice-automation-saas`
- `vibe-subscription-guard`
- `symptom-tracker`
- `monorepo-dashboard`
- All others not in Tier 1/2

---

## THE FREEZE PROTOCOL

When a project is FROZEN:

1. No new features allowed
2. No refactoring allowed
3. No "improvements" allowed
4. Bug fixes only if critical
5. Stays frozen until Focus Queue is empty

**Breaking the freeze requires explicit user approval with justification.**

---

## COMPLETION DEFINITION

A project is COMPLETE when:

### Must Have (MVP)

- [ ] Core functionality works end-to-end
- [ ] User can install/access the application
- [ ] No critical bugs
- [ ] Basic error handling
- [ ] Basic documentation

### Should Have (Production)

- [ ] All stated features work
- [ ] Tests cover critical paths
- [ ] Installer/deployment working
- [ ] Performance acceptable
- [ ] Security basics covered

### NOT Required for "Complete"

- Perfect code architecture
- 100% test coverage
- Comprehensive documentation
- Every edge case handled
- Beautiful UI (functional > pretty)

---

## ANTI-REFACTORING RULES

### FORBIDDEN During Development

1. "Let me just refactor this first..."
2. "This could be cleaner if..."
3. "I noticed some tech debt..."
4. "We should upgrade to the latest..."
5. "Let me reorganize these files..."

### ALLOWED After Shipping

- Refactoring can happen in v1.1
- Architecture improvements after stable release
- Tech debt addressed in maintenance sprints

---

## AGENT/SKILL ALIGNMENT

All agents and skills MUST follow these rules:

### Before Accepting Any Task

1. Check: Is the target project in Tier 1?
   - YES: Proceed
   - NO: Warn user and suggest Tier 1 project

2. Check: Is this task a completion task?
   - YES: Proceed
   - NO: Ask "Does this help ship the project?"

3. Check: Is this refactoring?
   - YES: REFUSE unless project is shipped
   - NO: Proceed

### Task Classification

- **SHIP TASK:** Moves project toward production (e.g., "Build installer", "Fix crash", "Write docs")
- **POLISH TASK:** Nice-to-have after shipping
- **SCOPE CREEP:** New feature not in original plan
- **REFACTOR:** Changing existing working code

**Only SHIP TASKs are allowed until project ships.**

---

## DAILY WORKFLOW

### Start of Session

1. Check: What Tier 1 project is in progress?
2. Review: What's left to complete?
3. Focus: Work ONLY on completion tasks

### During Session

1. Resist urge to refactor
2. Resist urge to add features
3. Ask: "Does this get us closer to shipping?"
4. If no: Don't do it

### End of Session

1. Update project completion percentage
2. Document what's left
3. DO NOT start new projects

---

## SCOPE MANAGEMENT

### Feature Requests During Development

1. Add to "v2.0 Ideas" list
2. DO NOT implement
3. Continue with MVP

### "Good Ideas" That Appear

1. Write them down
2. DO NOT implement
3. Review after shipping

### Tech Debt Discovered

1. Document it
2. DO NOT fix it (unless blocking)
3. Schedule for post-release

---

## ENFORCEMENT MECHANISMS

### Pre-Commit Hook Additions

- Block commits to FROZEN projects (except bug fixes)
- Warn when touching non-Tier-1 projects

### Agent Guardrails

- All specialist agents check project tier first
- Refuse refactoring tasks on unshipped projects
- Prioritize completion over improvement

### Session Start Check

- Display current Focus Queue
- Show completion percentage
- Block work on wrong projects

---

## SUCCESS METRICS

### Weekly Goals

- Ship 1 project to production
- Complete 2 major features
- Zero new projects started

### Monthly Goals

- Tier 1 completely shipped
- Tier 2 in production or near-complete
- Portfolio of working products

### Definition of Success

- Users can USE the software
- Software is ACCESSIBLE (installed, deployed, or published)
- Software WORKS without constant intervention

---

## THE MANTRA

```
SHIP > PERFECT
DONE > IDEAL
WORKING > ELEGANT
DEPLOYED > POLISHED
```

**One shipped product beats ten half-finished projects.**

---

## IMPLEMENTATION STEPS

### Phase 1: Immediate (Today)

1. Categorize all projects into Tiers
2. Create `.freeze` files in Tier 3 projects
3. Update agent rules
4. Start on Tier 1, Project #1

### Phase 2: This Week

1. Complete first Tier 1 project
2. Ship to production/users
3. Validate Ship-It Protocol works
4. Iterate if needed

### Phase 3: This Month

1. All Tier 1 projects shipped
2. Begin Tier 2
3. Celebrate actual shipped products

---

## SOURCES & RESEARCH

Based on 2026 best practices research:

- [Software Development Best Practices 2026](https://verycreatives.com/blog/best-practices-for-software-development)
- [Feature Creep Prevention](https://designli.co/blog/what-is-feature-creep-and-how-to-avoid-it)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Developer Productivity 2026](https://zencoder.ai/blog/how-to-improve-developer-productivity)
- [Addy Osmani's LLM Coding Workflow](https://addyosmani.com/blog/ai-coding-workflow/)

**Key Insight:** High-performing teams spend 49% on new work, 21% on rework. Low performers spend 38% on new work, 27% on rework. Stop the rework cycle.

---

*Last Updated: 2026-01-10*
*Priority: CRITICAL*
*Enforcement: MANDATORY*
