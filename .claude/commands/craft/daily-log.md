# /craft:daily-log

Build today's daily dev log and post it to the Craft daily note.

## Arguments

`$ARGUMENTS` (optional) — free-text notes to append verbatim under a **Notes** section.

## Steps

1. **Gather context.** Run `pwsh C:\dev\tools\scripts\Get-DailyContext.ps1` via Bash. Parse the JSON output. Do not fabricate fields — if the script fails, stop and show the error.

2. **Format markdown body** using the parsed context:

   ```
   ## Dev Log — {day}, {date}

   ### Current focus
   - {each item in currentFocus}

   ### Branch state
   - Branch: `{branch}`
   - Commits ahead of main: {count} — showing {up to 5}
     - {each subject in commitsAhead[0..4]}
   - Uncommitted files: {dirtyFiles}

   ### Running services
   | Port | PID | Process |
   | ---- | --- | ------- |
   | {each row in ports}

   (If `ports` is empty: write "None — no dev servers running.")

   ### Recent activity (last 5)
   - **{date}** — _{project}_ — {action}

   ### Notes
   {verbatim $ARGUMENTS, or "_(none)_" if empty}
   ```

3. **Find or create today's daily note in Craft** using the Craft MCP (tools prefixed `mcp__171fef6d-...`):
   - Call `documents_list` with `location: "daily_notes"`, `dailyNoteDateGte: <today ISO>`, `dailyNoteDateLte: <today ISO>`.
   - If a document exists → use its `id` as the target root block.
   - If none → call `documents_create` targeting the `daily_notes` location for today's date.

4. **Append the body** via `markdown_add` targeting the document root block. Do not overwrite existing content — append.

5. **Report the deeplink.** Call `connection_info` and substitute the document's root block ID into the `urlTemplates.app` template. Return a one-line summary:

   ```
   Daily log posted → craftdocs://open?spaceId=...&blockId=...
   ```

## Rules

- No placeholder content. If the PS script emits empty arrays, write them honestly ("None") — never invent work.
- Do not run `git commit`, `git push`, or any destructive git command.
- If Craft rate-limits, wait 10s and retry once. If it fails again, abort and surface the error.
- Do not include `$ARGUMENTS` text if empty — render the literal `_(none)_` instead.
