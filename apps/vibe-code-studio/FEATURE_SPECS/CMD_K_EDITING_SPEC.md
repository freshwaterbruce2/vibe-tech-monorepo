# Feature Spec: Cmd+K Inline Editing

**Status**: ✅ Implemented (via InlineEditWidget.tsx)
**Priority**: CRITICAL (Cursor's killer feature)
**Effort**: 2 days with TDD
**Dependencies**: DeepSeek AI API, Monaco Editor

> **Note**: This spec was originally written before implementation. The feature is now live in `src/components/Editor/InlineEditWidget.tsx` and wired to `Ctrl/Cmd+K` in `Editor.tsx`. The older `InlineEditDialog.tsx` component has been removed.

---

## User Story

As a developer using DeepCode Editor,
I want to select code and press Cmd+K to get AI-powered inline edits,
So that I can quickly modify code with natural language instructions just like in Cursor IDE.

---

## Acceptance Criteria

### Must Have

1. ✅ User can select code in Monaco editor
2. ✅ Pressing `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) opens inline edit dialog
3. ✅ Dialog shows input field for natural language instruction
4. ✅ User can type instruction like "add error handling"
5. ✅ Pressing Enter or clicking "Generate" calls AI API
6. ✅ Loading indicator shows while AI processes
7. ✅ Diff view appears showing before/after with syntax highlighting
8. ✅ User can see what will be added (green) and removed (red)
9. ✅ "Accept" button applies changes to editor
10. ✅ "Reject" button dismisses diff without changes
11. ✅ Keyboard navigation: `Tab` to switch focus, `Esc` to cancel

### Should Have

12. 🎯 Multiple suggestions if AI proposes alternatives
2. 🎯 "Modify" button to refine instruction
3. 🎯 Undo/redo works after accepting changes
4. 🎯 Instruction history (last 10 instructions saved)

### Nice to Have

16. 💡 Smart defaults based on context (e.g., "refactor" if function selected)
2. 💡 Instruction templates ("add tests", "add types", "add comments")
3. 💡 Diff annotations explaining changes

---

## Component Hierarchy

```
App.tsx
└── Editor.tsx
    ├── Monaco Editor (existing)
    └── InlineEditDialog (NEW)
        ├── InstructionInput (NEW)
        ├── LoadingSpinner (existing)
        ├── DiffView (NEW)
        │   ├── CodeBlock (with diff highlighting)
        │   └── DiffStats (lines added/removed)
        └── ActionButtons (NEW)
            ├── AcceptButton
            ├── RejectButton
            └── ModifyButton
```

---

## API Contracts

### InlineEditService.ts (NEW)

```typescript
interface InlineEditRequest {
  code: string;           // Selected code
  instruction: string;    // User's natural language instruction
  language: string;       // e.g., "typescript"
  context?: {            // Optional surrounding context
    before: string;
    after: string;
  };
}

interface InlineEditResponse {
  originalCode: string;
  modifiedCode: string;
  diff: Diff[];
  explanation?: string;  // Why these changes were made
}

interface Diff {
  type: 'add' | 'remove' | 'unchanged';
  lineNumber: number;
  content: string;
}

class InlineEditService {
  async generateEdit(request: InlineEditRequest): Promise<InlineEditResponse>;
  computeDiff(original: string, modified: string): Diff[];
}
```

### InlineEditDialog.tsx (NEW)

```typescript
interface InlineEditDialogProps {
  visible: boolean;
  selectedCode: string;
  language: string;
  position: Position;  // Where to anchor dialog
  onAccept: (modifiedCode: string) => void;
  onReject: () => void;
  onClose: () => void;
}
```

### Editor.tsx (MODIFY)

```typescript
// Add keyboard command registration
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
  const selection = editor.getSelection();
  if (selection && !selection.isEmpty()) {
    const selectedText = editor.getModel().getValueInRange(selection);
    showInlineEditDialog(selectedText, selection);
  }
});
```

---

## Test Scenarios (Playwright E2E)

### Test 1: Basic Inline Edit Workflow

```typescript
test('Cmd+K inline editing works end-to-end', async ({ page }) => {
  // Open file
  await page.click('[data-testid="file-explorer"] >> text=App.tsx');

  // Select code
  await page.click('.monaco-editor');
  await page.keyboard.press('Control+A');

  // Trigger Cmd+K
  await page.keyboard.press('Meta+K');

  // Verify dialog appears
  await expect(page.locator('[data-testid="inline-edit-dialog"]')).toBeVisible();

  // Type instruction
  await page.fill('[data-testid="instruction-input"]', 'add error handling');
  await page.keyboard.press('Enter');

  // Wait for AI response
  await page.waitForSelector('[data-testid="diff-view"]', { timeout: 10000 });

  // Verify diff shows changes
  const addedLines = await page.locator('.diff-added').count();
  expect(addedLines).toBeGreaterThan(0);

  // Accept changes
  await page.click('[data-testid="accept-button"]');

  // Verify code updated
  const editorText = await page.textContent('.monaco-editor .view-lines');
  expect(editorText).toContain('try');
  expect(editorText).toContain('catch');
});
```

### Test 2: Reject Changes

```typescript
test('rejecting inline edit keeps original code', async ({ page }) => {
  // ... setup same as Test 1 ...

  // Wait for diff
  await page.waitForSelector('[data-testid="diff-view"]');

  // Reject changes
  await page.click('[data-testid="reject-button"]');

  // Verify dialog closes
  await expect(page.locator('[data-testid="inline-edit-dialog"]')).not.toBeVisible();

  // Verify code unchanged
  const editorText = await page.textContent('.monaco-editor .view-lines');
  expect(editorText).toBe(originalCode); // Save original before test
});
```

### Test 3: Keyboard Navigation

```typescript
test('keyboard navigation in inline edit dialog', async ({ page }) => {
  // ... open dialog ...

  // Tab through elements
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')))
    .toBe('instruction-input');

  // Escape closes dialog
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="inline-edit-dialog"]')).not.toBeVisible();
});
```

### Test 4: Error Handling

```typescript
test('handles AI API errors gracefully', async ({ page }) => {
  // Mock API to return error
  await page.route('**/api/inline-edit', route => route.abort('failed'));

  // ... trigger inline edit ...

  // Verify error message shown
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to generate edit');

  // Verify can retry
  await page.click('[data-testid="retry-button"]');
});
```

---

## AI Prompt Template

```typescript
const INLINE_EDIT_PROMPT = `You are a code editing assistant. Modify the following code according to the user's instruction.

IMPORTANT:
- Only return the modified code, no explanations
- Preserve code style and formatting
- Keep changes minimal and focused
- Maintain all imports and dependencies

Original Code:
\`\`\`{language}
{code}
\`\`\`

Instruction: {instruction}

Modified Code:`;
```

---

## Implementation Steps (TDD)

### Step 1: Write Failing Test ✅

- Create `tests/e2e/cmd-k-editing.spec.ts`
- Run test → expect ❌ FAIL (feature doesn't exist)

### Step 2: Build InlineEditService

- Create `src/services/InlineEditService.ts`
- Implement `generateEdit()` method
- Use DeepSeek API with prompt template
- Implement `computeDiff()` using `diff-match-patch` library

### Step 3: Build UI Components

- Create `src/components/InlineEditDialog.tsx`
- Create `src/components/DiffView.tsx`
- Wire up to Monaco editor keyboard command

### Step 4: Integrate with Editor

- Modify `src/components/Editor.tsx`
- Register Cmd+K keyboard shortcut
- Show/hide dialog based on state

### Step 5: Run Test Again

- `pnpm playwright test cmd-k-editing.spec.ts`
- Expected: ✅ PASS

### Step 6: Refine UI/UX

- Better diff highlighting (use Monaco's diff editor)
- Loading states
- Error handling
- Keyboard navigation

---

## Dependencies

### New Dependencies Required

```json
{
  "dependencies": {
    "diff-match-patch": "^1.0.5"  // For computing diffs
  }
}
```

### Monaco Diff Editor

Monaco has built-in diff editor we can use:

```typescript
const diffEditor = monaco.editor.createDiffEditor(container, {
  enableSplitViewResizing: false,
  renderSideBySide: true
});

diffEditor.setModel({
  original: monaco.editor.createModel(originalCode, language),
  modified: monaco.editor.createModel(modifiedCode, language)
});
```

---

## Success Metrics

### Quantitative

- ✅ Test passes (100% pass rate)
- ✅ AI response time <3s (95th percentile)
- ✅ Diff computation <100ms
- ✅ Dialog opens <50ms after Cmd+K

### Qualitative

- ✅ User says "this works just like Cursor"
- ✅ Natural workflow, no friction
- ✅ Clear diff highlighting
- ✅ Intuitive accept/reject

---

## Future Enhancements (v2.0)

1. **Multi-turn refinement**: After seeing diff, user can say "actually, do X instead"
2. **Batch edits**: Apply same instruction to multiple selections
3. **Smart context**: Automatically include related files in context
4. **Undo history**: Show history of all inline edits with ability to revert
5. **Instruction suggestions**: AI suggests common instructions based on selection

---

**Status**: Ready for implementation
**Next Step**: Write failing Playwright test
**Blocked By**: FileSystemService (90 failing tests) - fix that first!
