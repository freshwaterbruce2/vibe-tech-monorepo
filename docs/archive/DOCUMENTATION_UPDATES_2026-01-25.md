# Documentation Updates - January 25, 2026

**Purpose:** Cleanup and modernization of monorepo documentation to reflect current state and best practices.

## Files Updated

### 1. `.claude/rules.md` - Modernized Agent Instructions

**Changes:**
- Removed references to non-existent files (`MONOREPO_RULES.md`, `SHIP_IT_FRAMEWORK.md`, `.deepcode/plans/`)
- Updated to point to canonical `AI.md` and `docs/ai/WORKSPACE.md`
- Removed outdated Opus/Sonnet role separation (not applicable to current workflow)
- Updated helper commands to use current tools (Nx, pnpm, standard bash)
- Clarified file size limits (360 lines default, 500 for complex components)
- Added references to key `.claude/rules/` documentation
- Updated decision tree to emphasize no-duplicates rule

**Why:** The file had many references to non-existent framework files that would confuse AI agents.

### 2. `README.md` - Corrected Repository Information

**Changes:**
- Fixed git clone URL from `freshwaterbruce2/vibetech` to `Vibe-Tech/Monorepo` (correct organization)
- Removed reference to non-existent `ANTIGRAVITY.md`
- Updated path architecture section to reference actual docs (`AI.md`, `PATH_CHANGE_RULES.md`)
- Corrected monorepo structure:
  - Changed `projects/crypto-enhanced/` to `apps/crypto-enhanced/` (actual location)
  - Expanded to show 52+ apps
  - Added more detail about tech stack
- Updated technology stack to include:
  - Capacitor for mobile
  - FastAPI for backend
  - pytest for Python testing
  - GitHub for version control

**Why:** README had outdated structure and wrong git URL that would confuse new contributors.

### 3. `AI.md` - Clarified File Size Policy

**Changes:**
- Updated file size rule to clarify: "Max 360 lines per file (500 for complex components - see STANDARDS.md)"
- Added reference to STANDARDS.md for exceptions

**Why:** Reconciled inconsistency between AI.md (360 lines) and STANDARDS.md (500 lines).

## Consistency Improvements

### File Size Limits

Now consistent across all documentation:
- **Max Lines Per File:** 500 lines
- **Functions:** Under 50 lines
- **Note:** Per STANDARDS.md updated 2026-01-23 (increased from 360 to 500)

### Path Architecture

All docs now consistently reference:
- **Code:** `C:\dev` (version controlled)
- **Data:** `D:\` drives (databases, logs, learning systems)
- **Canonical Rules:** `AI.md` (single source of truth)

### Version Control

All docs now consistently reference:
- **Platform:** GitHub
- **Repository:** `https://github.com/freshwaterbruce2/Monorepo.git`

## Documentation Hierarchy

```
AI.md (canonical rules)
├── docs/ai/WORKSPACE.md (detailed workspace guide)
├── .claude/rules/*.md (specific domain rules)
├── STANDARDS.md (architectural standards)
└── README.md (public-facing intro)
```

## Validation

Checked and verified:
- ✅ crypto-enhanced exists in `apps/crypto-enhanced/` (not `projects/`)
- ✅ AI.md is the canonical source of truth
- ✅ CLAUDE.md is a lightweight pointer (correct pattern)
- ✅ STANDARDS.md has detailed architectural rules
- ✅ All `.claude/rules/` files reference correct paths

## Impact

**For AI Agents:**
- Clearer guidance with no broken references
- Correct file size expectations
- Proper workflow (no obsolete Opus/Sonnet separation)

**For Developers:**
- Correct git clone command
- Accurate project structure
- Clear path policies

**For Repository Health:**
- Consistent documentation
- No outdated references
- Single source of truth (AI.md)

## Next Steps (Optional)

Consider these additional improvements:
1. Add `docs/ai/GETTING_STARTED.md` for new contributors
2. Create `CONTRIBUTING.md` with GitHub workflow
3. Document the 52+ apps in a `docs/PROJECTS.md` overview
4. Add architecture diagrams to `docs/architecture/`

## Related Files

- `.claude/rules/version-control.md` - GitHub guidelines
- `.claude/rules/paths-policy.md` - C:\ vs D:\ rules
- `.claude/rules/no-duplicates.md` - Anti-duplication workflow
- `MONOREPO_WORKFLOW.md` - Git workflow and incremental merge strategy

---

**Updated:** January 25, 2026
**By:** Documentation cleanup automation
**Status:** Complete ✅
