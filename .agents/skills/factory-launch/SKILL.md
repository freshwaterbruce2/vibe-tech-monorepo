---
name: factory-launch
description: Standard VibeTech App Factory launch workflow for SaaS generator output, monetization wiring, and README.monetization.md verification.
---

# Factory Launch

Use this skill before triggering or modifying the App Factory SaaS generator.

## Required Context

1. Read `AGENTS.md` and `.agent/agents/master-agent.md`.
2. Invoke `nx-generate` before scaffolding or generator changes.
3. Search existing generator/template files before creating anything new:
   - `plugins/factory/src/generators/saas/`
   - `plugins/factory/src/utils/`
   - generated app folders under `apps/`
   - `README.monetization.md`

## Launch Checklist

1. Confirm the requested app name and target tenant.
2. Run the generator through Nx or the repo-maintained command path.
3. Verify generated files include:
   - `.mcp.json`
   - `README.monetization.md`
   - Stripe setup and entitlement server files
   - Playwright checkout or smoke coverage when monetization is in scope
4. Prefer modifying the generator/template source over hand-editing only one generated app when the bug affects future launches.

## Validation

Use project-scoped Nx validation first:

```powershell
Set-Location -LiteralPath 'V:\monorepo'
pnpm nx lint <generated-project>
pnpm nx typecheck <generated-project>
pnpm nx build <generated-project>
```

For monetization or billing launches, also run the maintained runtime checkout/smoke gate and record the exact URL, account, webhook, and entitlement result.
