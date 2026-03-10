# Feature Spec: Background Tasks Panel

**Status**: ✅ COMPLETE (Integrated in AppLayout.tsx line 405)
**Priority**: MEDIUM (Visibility feature)
**Effort**: DONE
**Dependencies**: BackgroundAgentSystem, BackgroundTaskPanel component
**Effort**: 1 hour
**Dependencies**: BackgroundAgentSystem, BackgroundTaskPanel component

---

## User Story

As a developer running AI agents in background,
I want to see a panel showing running tasks and their progress,
So that I know what the AI is doing and when it's finished.

---

## Acceptance Criteria

1. ✅ Panel appears at bottom of editor
2. ✅ Shows list of running tasks
3. ✅ Each task shows: name, status, progress bar
4. ✅ Completed tasks show checkmark, failed tasks show error icon
5. ✅ Clicking task expands to show detailed output
6. ✅ "Clear Completed" button removes finished tasks
7. ✅ Panel can be minimized/maximized

---

## Existing Code

### BackgroundAgentSystem.ts (EXISTS)

```typescript
interface BackgroundTask {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;  // 0-100
  output: string[];
  startTime: Date;
  endTime?: Date;
}

class BackgroundAgentSystem {
  tasks: BackgroundTask[];
  onTaskUpdate: (task: BackgroundTask) => void;
}
```

### BackgroundTaskPanel.tsx (EXISTS, NOT VISIBLE)

- Component already built
- Just needs to be added to App.tsx layout

---

## Implementation

### Wire to App.tsx

```typescript
// src/App.tsx (ADD TO BOTTOM PANEL)
import { BackgroundTaskPanel } from './components/BackgroundTaskPanel';
import { backgroundAgentSystem } from './services/BackgroundAgentSystem';

<BottomPanel>
  <TerminalPanel />
  <BackgroundTaskPanel
    tasks={backgroundAgentSystem.tasks}
    onClearCompleted={() => backgroundAgentSystem.clearCompleted()}
  />
</BottomPanel>
```

---

## Test Scenarios

```typescript
test('background tasks panel shows running tasks', async ({ page }) => {
  // Start background task
  await page.click('[data-testid="run-agent-button"]');

  // Verify panel shows task
  await expect(page.locator('[data-testid="background-tasks-panel"]')).toBeVisible();

  const taskItem = page.locator('.task-item');
  await expect(taskItem).toBeVisible();
  await expect(taskItem).toContainText('Running');
});
```

---

**Status**: Ready for integration (EASY - 1 hour)
**Next Step**: Add BackgroundTaskPanel to App.tsx layout
