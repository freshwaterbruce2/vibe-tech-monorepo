---
name: block-npm-yarn
enabled: true
event: bash
pattern: ^(npm|yarn)\s+
action: block
---

🚨 **BLOCKED: Wrong package manager!**

This monorepo uses **pnpm ONLY**, never npm or yarn.

**Correct commands:**

```bash
pnpm install              # NOT npm install
pnpm add <package>        # NOT npm install <package>
pnpm add -D <package>     # NOT npm install --save-dev
pnpm remove <package>     # NOT npm uninstall
pnpm run <script>         # NOT npm run

# Project-specific:
pnpm add <package> --filter <project>
```

**Why pnpm only:**

- Workspace configuration in .npmrc
- D:\pnpm-store setup
- Nx integration optimized for pnpm
