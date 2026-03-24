---
name: require-tests-before-done
enabled: true
event: stop
pattern: .*
---

✅ **Completion Checklist - Before marking task complete:**

**Required:**

- [ ] Tests written and passing?
- [ ] Quality checks run? (`pnpm run quality`)
- [ ] Feature fully integrated and working end-to-end?
- [ ] User can actually use the feature?

**Code Quality:**

- [ ] No console.log/debugger in code?
- [ ] No TODO/FIXME comments?
- [ ] Files under 500 lines?
- [ ] TypeScript errors resolved?

**Documentation:**

- [ ] Documentation updated (if API changed)?
- [ ] Usage examples provided?

**Remember:** A completed project that works is infinitely better than 10 half-finished projects.
