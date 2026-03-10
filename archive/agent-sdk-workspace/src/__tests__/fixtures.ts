/** Shared test fixtures — no logic, pure data. */

export const DIFFS = {
  /** A realistic TypeScript diff with a security issue. */
  validTs: `diff --git a/src/App.tsx b/src/App.tsx
index abc..def 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,3 +1,5 @@
 import { useState } from 'react';
+const token = 'hardcoded-api-key';
+
 export function App() {
   const [count, setCount] = useState(0);`,

  /** Exactly 0 bytes — nothing changed. */
  empty: '',

  /** Slightly over 50 000 chars to exercise truncation. */
  large: (() => {
    const header =
      'diff --git a/src/big.ts b/src/big.ts\nindex abc..def\n--- a/src/big.ts\n+++ b/src/big.ts\n';
    const line = '+// padding line to trigger truncation threshold\n';
    return header + line.repeat(Math.ceil((50_001 - header.length) / line.length));
  })(),

  /** Binary-only diff — should be filtered out before the LLM call. */
  binaryOnly: `diff --git a/public/icon.png b/public/icon.png
index abc..def 100644
Binary files a/public/icon.png and b/public/icon.png differ`,
};

export const NX_OUTPUTS = {
  lintFailure: `NX   Running target lint for 3 projects

> nx run my-app:lint

  src/App.tsx    3:1  error  Unexpected var, use let or const  no-var
  5:15  warning  Missing return type  @typescript-eslint/explicit-function-return-type

✖ 1 error, 1 warning`,

  typecheckFailure: `> nx run my-app:typecheck

src/utils.ts(12,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.`,

  buildSuccess: `NX   Successfully ran target build for 3 projects (4s)`,
};

/** Minimal valid Anthropic SDK response shape. */
export const makeAnthropicResponse = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  usage: { input_tokens: 500, output_tokens: 200 },
});

export const REVIEW_TEXTS = {
  withSeverities:
    '## critical\n- Hardcoded API key on line 2.\n## warning\n- Missing null check.\n## info\n- Minor style note.',
  noIssues: '## info\nNo issues found.',
};

export const QUALITY_TEXTS = {
  withFixes: `## lint
**Root cause:** ESLint no-var rule violated.
**Fix:** Replace \`var\` with \`const\`.
**Priority:** medium`,

  timeout: `## lint
**Root cause:** Lint check timed out — likely a cold Nx cache.
**Fix:** Run \`pnpm nx reset\` then retry.
**Priority:** medium`,
};
