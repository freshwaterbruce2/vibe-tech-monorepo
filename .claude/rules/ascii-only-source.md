# ASCII-Only Source & Pre-Commit Non-ASCII Scan

Priority: MANDATORY
Scope: All source files in any project (any AI agent: Claude, Gemini, Augment, Codex, etc.)
Enforcement: pre-commit hook (blocks the commit) + this rule (scan proactively before staging)

---

## Core Rule

**Source files must be ASCII-only. Scan for non-ASCII characters before committing.**

A pre-commit hook rejects commits that introduce non-ASCII characters into source-file
comments and code. Do not discover this at commit time and do not bypass it with
`--no-verify`. Scan the files you are about to stage and fix any non-ASCII first.

This is separate from the security scan and file-size checks (see `git-workflow.md`);
it is specifically about character encoding in source.

---

## What Counts As "Source"

Applies to code and code-adjacent files:
`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, `.h`,
`.ps1`, `.sh`, `.toml`, `.json`, `.yaml`, `.yml`, and similar.

**Exempt:** Markdown (`.md`) and documentation prose may use Unicode freely
(em-dashes, arrows, accented names, emoji). The rule targets source, not docs.

---

## Common Offenders (and ASCII Replacements)

These slip in from pasted text, AI output, decorative banners, and editor smart-quotes:

| Non-ASCII | Name | Replace with |
|-----------|------|--------------|
| `—` `–` | em / en dash | `-` or `--` |
| `─` `═` `━` | box-drawing (banner comments) | `-` or `=` |
| `→` `←` `⇒` | arrows | `->`, `<-`, `=>` |
| `≈` `≤` `≥` `≠` | math operators | `~=`, `<=`, `>=`, `!=` |
| `"` `"` `'` `'` | smart quotes | `"` `'` |
| `…` | ellipsis | `...` |
| `•` `·` | bullets | `-` or `*` |
| `×` | multiplication | `x` or `*` |
| non-breaking space (U+00A0) | invisible | regular space |

Decorative banner comments are the most frequent source. Prefer plain ASCII:

```rust
// --- Section Name ---     // good
// === Section Name ===     // good
```

---

## How To Scan Before Committing (Windows)

`grep -P '[^\x00-\x7F]'` fails on Windows ("supports only unibyte and UTF-8 locales").
Use one of these instead.

**Python (most reliable, reports file + line + char):**
```powershell
python -c "import sys
for path in sys.argv[1:]:
    for i,l in enumerate(open(path,encoding='utf-8'),1):
        for ch in l:
            if ord(ch)>127: print(f'{path}:{i}: U+{ord(ch):04X} {ch!r}')
" file1.rs file2.ts
```

**PowerShell (scan staged files):**
```powershell
git diff --cached --name-only --diff-filter=ACM |
  Where-Object { $_ -match '\.(ts|tsx|js|jsx|py|rs|go|ps1|sh|toml|json|ya?ml)$' } |
  ForEach-Object {
    $n = 0
    foreach ($line in Get-Content $_) {
      $n++
      if ($line -match '[^\x00-\x7F]') { "$($_):$n  $line" }
    }
  }
```

Empty output = clean. Any output = fix before committing.

---

## Workflow

1. Before staging source files, run the scan above on the files you changed.
2. If non-ASCII is found, replace each character with its ASCII equivalent (table above).
3. Re-scan to confirm the file is clean.
4. Stage and commit. The pre-commit hook is the backstop, not the first line of defense.

---

## Behavioral Invariants

1. **Scan is proactive, not reactive.** Do not rely on the hook to catch it; catch it
   before staging so the commit is clean on the first try.
2. **Never bypass.** `--no-verify` to push non-ASCII through is prohibited. Fix the
   characters instead.
3. **Fix the character, not the check.** Replace the offending glyph; never weaken or
   disable the hook to make a commit pass.
4. **Pre-existing non-ASCII you are about to commit is yours to fix.** If you stage a
   file that already contained a non-ASCII comment (e.g., a decorative banner), convert
   it to ASCII as part of your commit rather than leaving the hook to reject it.
5. **Markdown is exempt.** Do not strip Unicode from `.md` files; this rule is for source.
