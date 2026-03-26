# CI/CD Pipeline & Nx Optimization

## Nx Caching & Affected Builds

Nx 21.6.3 provides intelligent caching — repeated builds are 80-90% faster. Always prefer affected commands:

```bash
pnpm run quality:affected   # lint + typecheck + build only changed projects
pnpm nx graph               # visualize project dependencies
pnpm nx reset               # clear cache if corrupted
```

GitHub Actions uses path filtering to skip unaffected jobs.

## Self-Healing CI

Nx Cloud Self-Healing CI auto-detects and proposes fixes. Fix priority order:

1. Formatting/linting — auto-fix with `pnpm nx run <project>:lint --fix`
2. Missing dependencies — add to package.json or requirements.txt
3. TypeScript errors — analyze and propose fixes
4. Test failures — distinguish flaky vs deterministic
5. Environment issues — report to developer, do not auto-fix

**Classification shortcuts:**
- Missing env vars (`KRAKEN_API_KEY`, `DATABASE_URL`) → `environment_state`
- OOM / port conflicts / missing Python deps in requirements.txt → `environment_state`
- Playwright timeout that passes on retry → `flaky_task`
- Crypto nonce/auth errors in `apps/crypto-enhanced/` → `code_change`

## Safety Rules (Non-Negotiable)

- **NEVER** auto-fix financial logic in `apps/crypto-enhanced/` without human review
- **NEVER** auto-fix security code (auth, API keys, secrets)
- **NEVER** auto-fix database migration scripts in `D:\databases\`
- Always verify fixes pass before applying; explain changes in PR comments
