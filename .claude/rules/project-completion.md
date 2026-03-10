# Project Completion Rules

Last Updated: 2026-01-04
Priority: CRITICAL
Status: MANDATORY

---

## 🎯 PRIMARY GOAL: GET PROJECTS FINISHED (2026)

**NUMBER ONE PRIORITY:** Complete projects to production-ready state using up-to-date information and best practices from 2026.

### Core Principles

1. **Finish What You Start**
   - Complete features to 100% before moving to next task
   - Don't leave half-implemented features
   - Mark tasks as complete only when fully working

2. **Use Current Information (2026)**
   - Always verify libraries, tools, and practices are current for 2026
   - Use web search to validate latest versions
   - Check official documentation for breaking changes
   - Don't assume knowledge from 2024/2025 is still valid

3. **Production-Ready Quality**
   - All features must be tested
   - All features must be documented
   - All features must be integrated and working
   - No "TODO" or "FIXME" in completed work

4. **Verification Before Completion**
   - Test each feature after implementation
   - Verify integration with existing codebase
   - Check dependencies are up-to-date
   - Confirm no regressions introduced

---

## 📋 Completion Checklist

Before marking any task as complete:

- [ ] Feature is fully implemented (no placeholders)
- [ ] All code is tested (unit/integration/E2E where applicable)
- [ ] Documentation is complete and accurate
- [ ] Dependencies are latest stable versions (2026)
- [ ] Integration with existing features verified
- [ ] No console errors or warnings
- [ ] Performance is acceptable
- [ ] Code follows project standards
- [ ] Git commit is clean and descriptive
- [ ] User can actually use the feature (end-to-end)

---

## 🔍 Up-to-Date Information Requirements

### Always Verify (2026 Standards)

1. **Package Versions**
   - Check npm/pnpm for latest stable versions
   - Verify compatibility with other dependencies
   - Review changelogs for breaking changes

2. **Framework Updates**
   - React 19+ (latest stable)
   - TypeScript 5.5+ (latest)
   - Vite 7+ (latest)
   - Node.js LTS (latest)

3. **Best Practices**
   - Use web search for "2026 best practices"
   - Check official documentation
   - Verify patterns are still recommended
   - Don't rely on outdated approaches

4. **API Changes**
   - Always check official API docs
   - Verify method signatures haven't changed
   - Check for deprecated features
   - Use modern alternatives

---

## 🚫 Anti-Patterns to Avoid

### Never Do This

1. **Half-Finished Features**
   - ❌ "This mostly works" - NO, it must fully work
   - ❌ "We can finish this later" - NO, finish it now
   - ❌ "Just need to add tests" - NO, tests are part of completion

2. **Outdated Information**
   - ❌ "I think React 18 works this way" - NO, verify React 19 docs
   - ❌ "This worked in 2024" - NO, check 2026 best practices
   - ❌ "I remember this API" - NO, check current documentation

3. **Incomplete Integration**
   - ❌ "The component exists" - NO, it must be integrated and working
   - ❌ "The service is written" - NO, it must be connected and tested
   - ❌ "The feature is coded" - NO, users must be able to use it

4. **Skipping Verification**
   - ❌ "Looks good to me" - NO, test it
   - ❌ "Should work fine" - NO, verify it works
   - ❌ "Probably correct" - NO, confirm it's correct

---

## ✅ Completion Workflow

### Step-by-Step Process

1. **Plan**
   - Understand requirements completely
   - Research current (2026) approaches
   - Verify dependencies are up-to-date
   - Create implementation checklist

2. **Implement**
   - Write production-quality code
   - Follow current best practices
   - Test as you go
   - Document as you build

3. **Verify**
   - Test all functionality
   - Check integration points
   - Verify no regressions
   - Confirm performance

4. **Document**
   - Update relevant documentation
   - Add usage examples
   - Document any caveats
   - Update integration guides

5. **Integrate**
   - Wire up to main application
   - Test end-to-end workflow
   - Verify user can access feature
   - Check keyboard shortcuts/commands work

6. **Finalize**
   - Clean up any TODO comments
   - Remove debug code
   - Optimize if needed
   - Mark as complete ONLY when fully done

---

## 🎓 Examples

### ✅ GOOD: Complete Feature

```typescript
// ✅ Fully implemented, tested, documented, integrated
export class FeatureService {
  // Complete implementation
  async doThing(): Promise<Result> {
    // All edge cases handled
    // Error handling in place
    // Performance optimized
    return result;
  }
}

// ✅ Component integrated in App.tsx
// ✅ Tests written and passing
// ✅ Documentation in FEATURE.md
// ✅ User can access via Ctrl+Shift+F
// ✅ No console errors
```

### ❌ BAD: Half-Finished Feature

```typescript
// ❌ Incomplete implementation
export class FeatureService {
  // TODO: Implement this
  async doThing(): Promise<Result> {
    throw new Error('Not implemented');
  }
}

// ❌ Component exists but not integrated
// ❌ No tests
// ❌ No documentation
// ❌ User can't access it
// ❌ Marked as "complete" anyway
```

---

## 📊 Success Metrics

### How to Know You're Done

1. **User Perspective**
   - Can a user actually use this feature end-to-end?
   - Is it accessible via UI/keyboard/command palette?
   - Does it work without errors?

2. **Developer Perspective**
   - Is the code maintainable?
   - Are there tests?
   - Is there documentation?

3. **Quality Perspective**
   - No console errors
   - No TypeScript errors
   - No linting warnings
   - Performance is acceptable

4. **Integration Perspective**
   - Feature is wired into main app
   - Keyboard shortcuts work
   - Command palette entries work
   - UI is accessible

---

## 🔄 When to Mark as Complete

### Task Completion Criteria

Mark a task as complete ONLY when ALL of these are true:

1. ✅ Code is written and working
2. ✅ Tests are passing
3. ✅ Documentation is written
4. ✅ Feature is integrated into main app
5. ✅ User can access and use the feature
6. ✅ No regressions introduced
7. ✅ Dependencies are up-to-date (2026)
8. ✅ Code follows project standards
9. ✅ Performance is acceptable
10. ✅ YOU would be comfortable shipping this to production

If ANY of these are false, the task is NOT complete.

---

## 🚀 Priority Order

1. **FIRST:** Get projects finished to production-ready state
2. **SECOND:** Ensure everything uses 2026 best practices
3. **THIRD:** Optimize and enhance completed features

**Remember:** A completed project that works is infinitely better than 10 half-finished projects.

---

## 📝 Related Documentation

- **Testing Strategy:** `.claude/rules/testing-strategy.md`
- **Code Quality:** `.claude/rules/ci-cd-nx.md`
- **Git Workflow:** `.claude/rules/git-workflow.md`
- **Commands Reference:** `.claude/rules/commands-reference.md`

---

Enforcement: This is a MANDATORY rule. All contributors must follow this workflow.

---

_Last Updated_: January 4, 2026
_Priority_: CRITICAL (NUMBER ONE GOAL)
_Status_: ACTIVE
