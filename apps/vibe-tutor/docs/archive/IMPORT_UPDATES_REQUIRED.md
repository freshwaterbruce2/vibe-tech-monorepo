# Import Path Updates Required

After component reorganization, the following import paths in `App.tsx` need to be updated:

## File: App.tsx (Lines 2-7 and 21-38)

### Direct Imports (UI Components - Lines 2-7)

Update these lines to point to the new `components/ui/` subfolder:

**BEFORE:**

```typescript
import AchievementToast from './components/AchievementToast';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';
import OfflineIndicator from './components/OfflineIndicator';
import { ResizableSplitPane } from './components/ResizableSplitPane';
import Sidebar from './components/Sidebar';
```

**AFTER:**

```typescript
import AchievementToast from './components/ui/AchievementToast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import OfflineIndicator from './components/ui/OfflineIndicator';
import { ResizableSplitPane } from './components/ui/ResizableSplitPane';
import Sidebar from './components/ui/Sidebar';
```

---

### Lazy-Loaded Imports (Feature Components - Lines 34-38)

Update these lazy imports to point to the new subfolders:

**BEFORE:**

```typescript
const TokenWallet = lazy(() => import('./components/TokenWallet'));
const ParentRulesPage = lazy(() => import('./components/ParentRulesPage'));
const FirstThenGate = lazy(() => import('./components/FirstThenGate'));
const LearningHub = lazy(() => import('./components/LearningHub'));
const RobuxRewardShop = lazy(() => import('./components/RobuxRewardShop'));
```

**AFTER:**

```typescript
const TokenWallet = lazy(() => import('./components/features/TokenWallet'));
const ParentRulesPage = lazy(() => import('./components/settings/ParentRulesPage'));
const FirstThenGate = lazy(() => import('./components/features/FirstThenGate'));
const LearningHub = lazy(() => import('./components/features/LearningHub'));
const RobuxRewardShop = lazy(() => import('./components/features/RobuxRewardShop'));
```

**NOTE:** ParentRulesPage moved to `components/settings/` not features!

---

### Other Components to Update (Lines 21-33)

Some of these may also need updates if they've moved:

**Check these paths:**

- Line 21: `import('./components/HomeworkDashboard')` → Check if moved to `dashboard/`
- Line 22: `import('./components/ChatWindow')` → Check if moved to `features/`
- Line 23: `import('./components/ParentDashboard')` → Check if moved to `dashboard/`
- Line 24: `import('./components/AchievementCenter')` → Check if moved to `ui/`
- Line 25: `import('./components/MusicLibrary')` → Check if moved to `features/`
- Line 26: `import('./components/SensorySettings')` → Check if moved to `settings/`
- Line 27: `import('./components/FocusTimer')` → Check if moved to `features/`
- Line 28: `import('./components/SubjectCards')` → Check if moved to `dashboard/`
- Line 29: `import('./components/BrainGamesHub')` → Check if moved to `games/`
- Line 30: `import('./components/WorksheetView')` → Check if moved to `features/`
- Line 31: `import('./components/WorksheetResults')` → Check if moved to `features/`
- Line 33: `import('./components/GamingChat')` → Check if moved to `features/`

---

## Quick Fix (Find & Replace in VS Code)

Use Find and Replace to update all imports at once:

### Replace 1 - UI Components

**Find:** `from './components/AchievementToast'`
**Replace:** `from './components/ui/AchievementToast'`

**Find:** `from './components/ErrorBoundary'`
**Replace:** `from './components/ui/ErrorBoundary'`

**Find:** `from './components/LoadingSpinner'`
**Replace:** `from './components/ui/LoadingSpinner'`

**Find:** `from './components/OfflineIndicator'`
**Replace:** `from './components/ui/OfflineIndicator'`

**Find:** `from './components/ResizableSplitPane'`
**Replace:** `from './components/ui/ResizableSplitPane'`

**Find:** `from './components/Sidebar'`
**Replace:** `from './components/ui/Sidebar'`

### Replace 2 - Feature Components

**Find:** `'./components/TokenWallet'`
**Replace:** `'./components/features/TokenWallet'`

**Find:** `'./components/ParentRulesPage'`
**Replace:** `'./components/settings/ParentRulesPage'`

**Find:** `'./components/FirstThenGate'`
**Replace:** `'./components/features/FirstThenGate'`

**Find:** `'./components/LearningHub'`
**Replace:** `'./components/features/LearningHub'`

**Find:** `'./components/RobuxRewardShop'`
**Replace:** `'./components/features/RobuxRewardShop'`

---

## File: tests/Sidebar.test.tsx (If exists)

**BEFORE:**

```typescript
import Sidebar from '../components/Sidebar';
```

**AFTER:**

```typescript
import Sidebar from '../components/ui/Sidebar';
```

---

## Verification Steps

After making import updates:

1. **Check for build errors:**

   ```bash
   pnpm run build
   ```

2. **Run type checking:**

   ```bash
   pnpm run typecheck
   ```

3. **Run tests:**

   ```bash
   pnpm run test
   ```

4. **Start dev server:**

   ```bash
   pnpm run dev
   ```

5. **Verify no console errors** when app loads in browser (localhost:5173)

---

## Import Update Status

- [ ] Direct UI imports updated (Lines 2-7)
- [ ] Feature lazy imports updated (Lines 34-38)
- [ ] ParentRulesPage path corrected (settings/, not features/)
- [ ] Test files updated (tests/Sidebar.test.tsx)
- [ ] Build verified with no errors
- [ ] Dev server tested and working
- [ ] No console import errors

