# Database Architecture Fix - Vibe Tutor

**Date:** 2025-12-08
**Status:** CRITICAL - Single Source of Truth Violated

## Problem Statement

### Current State: ❌ FAILED

**Local-First:** ✅ Yes, SQLite + ChromaDB infrastructure exists
**Single Source of Truth:** ❌ FAILED - Activity is split across disparate files and schemas
**Observability:** ⚠️ Partial - Learning Dashboard (via MCP) shows empty/stale data

### Root Cause Analysis

1. **Database Code Exists But Never Used**
   - `databaseService.ts` defines SQLite at `D:\databases\vibe-tutor.db`
   - `migrationService.ts` can migrate localStorage → SQLite
   - **But App.tsx never initializes or uses it**

2. **Data Split Across Multiple Sources**
   - **App.tsx + 23 components:** Use `localStorage` directly (current data)
   - **SQLite Database:** Exists at `D:\databases\vibe-tutor.db` (empty/never initialized)
   - **MCP Server:** Configured to query `D:\databases\database.db` (wrong path!)

3. **MCP Learning Dashboard Issue**
   - MCP SQLite server points to: `D:\databases\database.db`
   - App database should be at: `D:\databases\vibe-tutor.db`
   - **Result:** MCP queries return empty data (wrong database file)

### Impact

- Learning Dashboard shows no student activity (queries empty DB)
- Data not portable across devices (locked in browser localStorage)
- No backup/analytics capabilities (data invisible to external tools)
- Can't use AI-powered insights (MCP can't see student progress)

## Solution Implemented

### 1. Fixed MCP Configuration ✅

**File:** `C:\dev\.mcp.json`

```json
"sqlite-vibe-tutor": {
  "type": "stdio",
  "command": "C:\\Program Files\\nodejs\\node.exe",
  "args": [
    "C:\\Users\\fresh_zxae3v6\\AppData\\Roaming\\npm\\node_modules\\mcp-server-sqlite-npx\\dist\\index.js",
    "D:\\databases\\vibe-tutor.db"  // ✅ Correct database path
  ]
}
```

**Benefits:**

- MCP Learning Dashboard can now query student activity
- Real-time observability of homework, achievements, focus sessions
- AI-powered insights via Claude Code MCP integration

### 2. Fixed Database Path ✅

**File:** `services/databaseService.ts`

```typescript
// Before: D:\databases\vibe-tutor\vibe-tutor.db (nested directory)
// After:  D:\databases\vibe-tutor.db (flat structure, matches MCP)

const DATABASE_PATH = 'D:\\databases';
const DATABASE_NAME = 'vibe-tutor.db';
const DATABASE_FULL_PATH = 'D:\\databases\\vibe-tutor.db';
```

### 3. Created Unified Data Access Layer ✅

**New File:** `services/dataStore.ts`

**Key Features:**

- Single API for data access (abstracts localStorage vs SQLite)
- Auto-detects platform (Android/Windows → SQLite, Web → localStorage)
- One-time migration on first run
- Backward compatible (falls back to localStorage on errors)

**Usage Example:**

```typescript
import { dataStore } from './services/dataStore';

// Initialize on app mount
await dataStore.initialize();

// Get homework (automatically uses SQLite or localStorage)
const items = await dataStore.getHomeworkItems();

// Save homework (writes to both if needed)
await dataStore.saveHomeworkItems(items);
```

### 4. Database Schema (D:\databases\vibe-tutor.db)

**Tables:**

- `homework_items` - Tasks with due dates
- `user_progress` - Subject-level progress tracking
- `achievements` - Unlocked badges and progress
- `learning_sessions` - Focus timer sessions, study time
- `rewards` - Parent-configured rewards + claimed history
- `music_playlists` - User playlists
- `user_settings` - Key-value store (student_points, etc.)
- `user_preferences` - Sensory settings, UI preferences

**Observability via MCP:**

```sql
-- Query student activity (now visible to MCP Learning Dashboard)
SELECT * FROM learning_sessions ORDER BY session_date DESC LIMIT 10;

-- Check homework completion rate
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
FROM homework_items;

-- Track achievement progress
SELECT * FROM achievements WHERE unlocked = 1;
```

## Next Steps (Required)

### Phase 1: Initialize Database (HIGH PRIORITY)

**File:** `App.tsx` (lines 1-15)

```typescript
// Add import
import { dataStore } from './services/dataStore';

const App: React.FC = () => {
  // Add initialization effect
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await dataStore.initialize();
        console.log('✅ Data store initialized');

        // Load initial data from database
        const items = await dataStore.getHomeworkItems();
        setHomeworkItems(items);

        const pts = await dataStore.getStudentPoints();
        setPoints(pts);

        // ... load other data
      } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // App continues with localStorage fallback
      }
    };

    initializeDatabase();
  }, []);

  // ... rest of component
```

### Phase 2: Replace localStorage Calls (MEDIUM PRIORITY)

**23 Components to Update:**

```
App.tsx, GameSettings.tsx, LearningHub.tsx, RobuxRewardShop.tsx,
SmartSchedule.tsx, Celebrations.tsx, CelebrationEffect.tsx,
DataManagement.tsx, MusicLibrary.tsx, WordSearchGame.tsx,
ParentRulesPage.tsx, FirstThenGate.tsx, BrainGamesHub.tsx,
SensorySettings.tsx, ChatWindow.tsx, LifeSkillsChecklist.tsx,
GoalsPanel.tsx, FocusTimer.tsx, RobloxObbies.tsx, WeekProgress.tsx,
ScreenTimeSettings.tsx, SecurePinLock.tsx, ProgressReports.tsx
```

**Pattern:**

```typescript
// Before (localStorage)
const items = JSON.parse(localStorage.getItem('homeworkItems') || '[]');
localStorage.setItem('homeworkItems', JSON.stringify(items));

// After (dataStore)
const items = await dataStore.getHomeworkItems();
await dataStore.saveHomeworkItems(items);
```

### Phase 3: Verify MCP Integration (TEST)

**Test Learning Dashboard:**

```bash
# Restart Claude Code to reload MCP servers
# Open MCP resource panel
# Connect to: sqlite-vibe-tutor

# Query student activity
SELECT * FROM learning_sessions;
SELECT * FROM homework_items WHERE completed = 1;
```

**Expected Results:**

- MCP queries return real student data
- Learning Dashboard shows live activity
- AI can provide insights based on actual progress

## Migration Strategy

**One-Time Automatic Migration:**

1. On first run with SQLite, `migrationService.performMigration()` runs
2. Copies all localStorage data → SQLite tables
3. Sets flag: `vibe_tutor_migration_complete = 'true'`
4. Future sessions skip migration (reads from SQLite)

**Backward Compatibility:**

- Web platform continues using localStorage (no SQLite on web)
- Android/Windows use SQLite after migration
- Fallback to localStorage if SQLite fails

**Data Validation:**

```bash
# After migration, verify data
cd D:\databases
sqlite3 vibe-tutor.db

SELECT COUNT(*) FROM homework_items;
SELECT * FROM user_settings WHERE key = 'student_points';
SELECT COUNT(*) FROM achievements WHERE unlocked = 1;
```

## Benefits of Fix

### For Development

- ✅ Single source of truth (no data sync issues)
- ✅ Portable data (works across devices)
- ✅ Backup/restore via SQLite export
- ✅ MCP-powered analytics and insights

### For Users (Students/Parents)

- ✅ Data persists across app reinstalls
- ✅ Faster queries (SQLite indexing)
- ✅ Parent dashboard shows accurate analytics
- ✅ Future: Multi-device sync capability

### For AI/MCP Integration

- ✅ Learning Dashboard shows real-time progress
- ✅ Claude can provide personalized study insights
- ✅ Automated progress reports
- ✅ Predictive difficulty adjustment based on performance

## Rollback Plan

If issues occur:

```typescript
// Revert to localStorage-only mode
const dataStore = new DataStore();
dataStore.useSQLite = false;  // Force localStorage

// Or export SQLite data back to localStorage
await migrationService.exportToLocalStorage();
```

## Testing Checklist

- [ ] Database initializes on app start
- [ ] Migration completes successfully
- [ ] Homework items visible in both app and MCP
- [ ] Student points persist across sessions
- [ ] Achievements tracked in SQLite
- [ ] Focus sessions recorded
- [ ] MCP Learning Dashboard shows live data
- [ ] Fallback to localStorage works on errors

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Vibe-Tutor App                       │
│                                                           │
│  ┌────────────┐                                          │
│  │  App.tsx   │  Initializes on mount                    │
│  │  + 60 UI   │         ↓                                │
│  │ Components │   dataStore.initialize()                 │
│  └────────────┘         ↓                                │
│        ↓                                                  │
│  ┌─────────────────────────────────────────────┐        │
│  │       services/dataStore.ts                  │        │
│  │  (Single Source of Truth Abstraction)       │        │
│  │                                               │        │
│  │  - Auto-detects platform                     │        │
│  │  - Runs migration once                       │        │
│  │  - Unified API for all data                  │        │
│  └─────────────────────────────────────────────┘        │
│         ↓                          ↓                      │
│  ┌──────────────┐          ┌──────────────┐             │
│  │ localStorage │          │    SQLite    │             │
│  │  (Web only)  │          │ (Android/Win)│             │
│  └──────────────┘          └──────────────┘             │
│                                    ↓                      │
│                            D:\databases\                  │
│                            vibe-tutor.db                  │
└───────────────────────────────────────┬─────────────────┘
                                        │
                                        │ MCP Connection
                                        ↓
                         ┌──────────────────────────┐
                         │   MCP SQLite Server      │
                         │  sqlite-vibe-tutor       │
                         └──────────────────────────┘
                                        │
                                        ↓
                         ┌──────────────────────────┐
                         │   Learning Dashboard     │
                         │   (Claude Code MCP)      │
                         │                           │
                         │  - Student progress      │
                         │  - Homework analytics    │
                         │  - Achievement tracking  │
                         │  - Focus session history │
                         └──────────────────────────┘
```

## References

- `services/databaseService.ts` - SQLite connection management
- `services/migrationService.ts` - localStorage → SQLite migration
- `services/dataStore.ts` - Unified data access layer (NEW)
- `.mcp.json` - MCP server configuration
- `CLAUDE.md` - Project documentation (needs update)
