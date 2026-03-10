# Multi-File Edit Approval UI - Integration Guide

## Status

✅ Component file exists: `src/components/MultiFileEditApprovalPanel.tsx`
✅ Imports updated to include Monaco DiffEditor
✅ Modal overlay layout implemented
⏳ Full component implementation needs completion

## Current State

The component has been **partially enhanced** with:

- Monaco DiffEditor import added
- Modal overlay structure added (PanelOverlay + PanelContainer)
- Enhanced imports (AnimatePresence, ChevronDown, useMemo)

## Completion Steps

### Step 1: Complete Component Transformation

The component still needs the main implementation updated. Here's what needs to be added/modified:

```typescript
// Add these helper functions before the component
const calculateDiffStats = (originalContent: string, newContent: string): DiffStats => {
  const originalLines = originalContent.split('\n');
  const newLines = newContent.split('\n');
  let added = 0, removed = 0, modified = 0;
  
  const maxLines = Math.max(originalLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const newLine = newLines[i];
    if (origLine === undefined && newLine !== undefined) added++;
    else if (origLine !== undefined && newLine === undefined) removed++;
    else if (origLine !== newLine) modified++;
  }
  
  return { added, removed, modified };
};

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', py: 'python' };
  return langMap[ext] || 'plaintext';
};
```

### Step 2: Update Component Props

```typescript
interface MultiFileEditApprovalPanelProps {
  plan: MultiFileEditPlan;
  changes: FileChange[];
  onApply: (selectedFiles: string[]) => void;
  onReject: () => void;
  onAcceptFile?: (filePath: string) => void;  // NEW
  onRejectFile?: (filePath: string) => void;  // NEW
}
```

### Step 3: Wire Up in Editor.tsx

Add to `src/components/Editor.tsx`:

```typescript
// 1. Import
import { MultiFileEditApprovalPanel } from './MultiFileEditApprovalPanel';
import type { MultiFileEditPlan, FileChange } from '@vibetech/types/multifile';

// 2. Add state (around line 140)
const [multiFileEditPanel, setMultiFileEditPanel] = useState<{
  plan: MultiFileEditPlan;
  changes: FileChange[];
} | null>(null);

// 3. Add handlers (around line 160)
const handleMultiFileApply = useCallback((selectedFiles: string[]) => {
  // TODO: Call MultiFileEditor.applyChanges()
  logger.info('Applying changes to files:', selectedFiles);
  setMultiFileEditPanel(null);
}, []);

const handleMultiFileReject = useCallback(() => {
  logger.info('Rejected multi-file changes');
  setMultiFileEditPanel(null);
}, []);

const handleAcceptFile = useCallback((filePath: string) => {
  logger.info('Accepted file:', filePath);
}, []);

const handleRejectFile = useCallback((filePath: string) => {
  logger.info('Rejected file:', filePath);
}, []);

// 4. Add to JSX (before </EditorContainer> closing tag, around line 450)
{multiFileEditPanel && (
  <MultiFileEditApprovalPanel
    plan={multiFileEditPanel.plan}
    changes={multiFileEditPanel.changes}
    onApply={handleMultiFileApply}
    onReject={handleMultiFileReject}
    onAcceptFile={handleAcceptFile}
    onRejectFile={handleRejectFile}
  />
)}
```

### Step 4: Trigger Multi-File Edit (Example)

```typescript
// Example: Trigger from AI chat or Cmd+K
const handleTriggerMultiFileEdit = async () => {
  const multiFileEditor = new MultiFileEditor(aiService, fsService);
  
  const plan = await multiFileEditor.createEditPlan(
    "Refactor authentication to use new API",
    workspaceFiles,
    file.path
  );
  
  const changes = await multiFileEditor.generateChanges(plan);
  
  setMultiFileEditPanel({ plan, changes });
};
```

## Testing

```bash
# Start dev server
npm run dev

# Test workflow:
# 1. Open vibe-code-studio
# 2. Trigger multi-file edit (via AI or manual test)
# 3. Verify modal appears
# 4. Check file list, diff viewer
# 5. Test select/deselect files
# 6. Test Apply Selected / Reject All
```

## Monaco DiffEditor Features

The enhanced component uses Monaco's DiffEditor which provides:

- Side-by-side diff view
- Syntax highlighting
- Line-by-line change indicators
- Scroll synchronization
- Inline diff view option

## UI Components Added

### File List Panel (Left)

- Checkboxes for selection
- Expandable details (ChevronDown icon)
- Diff stats per file (+/-/~)
- Visual feedback for approved files

### Diff Panel (Right)

- Monaco DiffEditor integration
- Individual Accept/Reject buttons
- Full-width diff view
- Language-aware syntax highlighting

### Footer

- Total stats (added/removed/modified)
- Apply Selected button (shows count)
- Reject All button

## Keyboard Shortcuts (Future Enhancement)

Recommended additions:

- `Escape` - Close panel / Reject All
- `Enter` - Apply Selected
- `Arrow Up/Down` - Navigate files
- `Space` - Toggle file selection

## Known Issues

1. Component implementation still uses old side-panel layout in return statement
2. Need to replace `renderDiff()` with Monaco DiffEditor
3. Need to add expandable file details logic
4. Need to add Content wrapper with FileListPanel and DiffPanel

## Quick Fix

To complete the implementation quickly, replace the component's return statement with:

```typescript
return (
  <PanelOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <PanelContainer 
      initial={{ scale: 0.9, opacity: 0 }} 
      animate={{ scale: 1, opacity: 1 }} 
      transition={{ type: 'spring', duration: 0.3 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Header>
        <Title>
          <FileText size={28} />
          Multi-File Changes ({changes.length} files)
        </Title>
        {plan.description && <Description>{plan.description}</Description>}
      </Header>

      <Content>
        {/* File List Panel */}
        <FileListPanel>
          {/* File list implementation */}
        </FileListPanel>

        {/* Diff Panel with Monaco */}
        <DiffPanel>
          {currentChange && (
            <DiffEditor
              original={currentChange.originalContent}
              modified={currentChange.newContent}
              language={getLanguageFromPath(currentChange.path)}
              theme="vs-dark"
              options={{ readOnly: true, renderSideBySide: true }}
            />
          )}
        </DiffPanel>
      </Content>

      <Footer>
        {/* Footer with stats and actions */}
      </Footer>
    </PanelContainer>
  </PanelOverlay>
);
```

## Next Actions

1. Complete component implementation (see MULTI_FILE_EDIT_SPEC.md)
2. Add to Editor.tsx with state and handlers
3. Test with sample multi-file edits
4. Add keyboard shortcuts
5. Write E2E tests

---

**Implementation Time**: ~2-3 hours to complete
**Priority**: MEDIUM (enhances user experience for multi-file refactoring)
