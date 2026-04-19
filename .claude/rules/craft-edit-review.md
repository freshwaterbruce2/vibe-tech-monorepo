# Craft Edit-Review Widget

Last Updated: 2026-04-19

## What It Is

`ui://craft/edit-review` is a Craft MCP mini-app (React 19, v1.0.0) that automatically
receives the result of every Craft block mutation and renders a live diff panel with
Undo/Redo controls. It is hosted and served by Craft — not in this repo.

## When Claude Must Use It

After ANY of these Craft tools succeed, the edit-review widget automatically receives
the result. Claude must acknowledge this and tell the user they can undo/redo from the
Craft review panel:

| Tool | Operation shown |
|------|----------------|
| `mcp__claude_ai_Craft__blocks_add` | "add" |
| `mcp__claude_ai_Craft__blocks_update` | "update" |
| `mcp__claude_ai_Craft__blocks_delete` | "delete" |
| `mcp__claude_ai_Craft__blocks_move` | "move" |
| `mcp__claude_ai_Craft__collectionItems_add` | "add" |
| `mcp__claude_ai_Craft__collectionItems_update` | "update" |
| `mcp__claude_ai_Craft__collectionItems_delete` | "delete" |

## Required Tool Result Shape

For the widget to render correctly, the result returned from block mutation tools
must include:

```json
{
  "success": true,
  "operation": "add" | "update" | "delete",
  "diff": {
    "before": [...],
    "after":  [...]
  },
  "revertInfo": { ... },
  "documentLink": "craftdocs://...",
  "documentTitle": "Document name"
}
```

If `success` is false or `diff` is missing, the widget shows an error state. Always
check the tool result for `success: true` before reporting completion to the user.

## What Claude Should Do After a Block Mutation

1. **Confirm the change**: "Done — I've [added/updated/deleted] the block in [document]."
2. **Mention the review panel**: "You can undo or redo this from the Craft review panel."
3. **Do not repeat the diff content** — the widget already shows it visually.

Example response after `blocks_add`:
> Added the new section to "Project Notes". You can review the change and undo it from
> the Craft edit-review panel if needed.

## How to Interpret Widget Context Updates

When the user interacts with the review panel, Craft sends Claude a context update:

```
User clicked "undo" on the "add" operation.
The widget now shows the "before" state. Document: "Project Notes"
```

When Claude receives this:
- Acknowledge the revert: "Got it — the change has been undone."
- Adjust your next action accordingly (do not re-apply the same edit without asking).
- If the user clicked "redo", treat it as re-applying the last operation.

## Summary Block (special result)

If the tool result includes `summary` instead of `diff`:
```json
{ "success": true, "summary": "Learned about project structure." }
```
The widget shows a success/learned state. No undo is available. Claude should just
confirm the outcome.

## Craft Connection

- Space: "My Space" (ID: `6a84cd96-5c27-020c-83a9-3daef2b03f56`)
- Timezone: UTC / user local: America/New_York
- Connection status: verify with `mcp__claude_ai_Craft__connection_info`

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Widget shows "Error" | Tool returned `success: false` or malformed result | Re-check tool args |
| Widget shows "Loading changes…" | Tool result not yet received | Wait or retry tool call |
| Undo/Redo buttons disabled | No `revertInfo` in result | Craft does not support revert for this operation |
| "Connection failed" | Craft MCP disconnected | Restart Craft; check MCP server |
