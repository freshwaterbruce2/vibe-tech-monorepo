# Goals Panel Testing Checklist - v1.0.14

## Build Information

- **Version**: v1.0.14 "Goals & Growth"
- **versionCode**: 15
- **Build Date**: 2025-10-20
- **APK Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

## Pre-Installation

### 1. Backup Current Version

- [ ] Verify current app version on device (`adb shell dumpsys package com.vibetech.tutor | findstr versionCode`)
- [ ] Export data via Parent Dashboard if needed (backup existing progress)
- [ ] Note: Previous version was v1.0.13 (versionCode 14)

### 2. Uninstall Old Version (Critical for Cache Busting)

```bash
adb uninstall com.vibetech.tutor
```

- [ ] Verify uninstall: `adb shell pm list packages | findstr vibetech` should return nothing
- [ ] Why: Forces Android WebView to clear cached JavaScript

### 3. Install New Version

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] Verify installation successful
- [ ] Check version: `adb shell dumpsys package com.vibetech.tutor | findstr versionCode`
- [ ] Should show: `versionCode=15`

## Visual Verification

### 4. Goals Panel Appearance

- [ ] Open app and navigate to dashboard
- [ ] Verify Goals Panel appears in grid layout next to WeekProgress chart
- [ ] Panel should show 4 default goals:
  - Daily Focus (50 min target)
  - Daily Tasks (3 tasks target)
  - Weekly Focus (300 min target)
  - Weekly Points (500 pts target)
- [ ] Each goal card should display:
  - Icon (Target/CheckCircle/Trophy)
  - Goal name (e.g., "Daily Focus")
  - Time remaining (e.g., "15h left" or "3d left")
  - Current progress (e.g., "0 / 50 min")
  - Progress bar (gradient or green when complete)

### 5. Responsive Design

- [ ] Desktop view: Goals panel and WeekProgress side-by-side in grid
- [ ] Mobile view (if applicable): Goals panel stacks below WeekProgress
- [ ] All text legible and not truncated
- [ ] Progress bars render correctly

## Functional Testing - Daily Goals

### 6. Daily Focus Goal

- [ ] Open Focus Timer
- [ ] Complete a 25-minute Pomodoro session
- [ ] Return to dashboard
- [ ] Verify "Daily Focus" shows `25 / 50 min` (50% progress bar)
- [ ] Complete another 25-minute session
- [ ] Verify "Daily Focus" shows `50 / 50 min` (100% progress bar)
- [ ] Verify green checkmark appears when completed
- [ ] Progress bar turns green

### 7. Daily Tasks Goal

- [ ] Add a new homework task
- [ ] Mark task as complete
- [ ] Verify "Daily Tasks" shows `1 / 3 tasks` (~33% progress)
- [ ] Complete 2 more tasks
- [ ] Verify "Daily Tasks" shows `3 / 3 tasks` (100% progress)
- [ ] Verify completion indicator appears

## Functional Testing - Weekly Goals

### 8. Weekly Focus Goal

- [ ] After completing 50 minutes total (from test #6)
- [ ] Verify "Weekly Focus" shows `50 / 300 min` (~17% progress)
- [ ] Note: Will need to complete more sessions over multiple days to hit 300min

### 9. Weekly Points Goal

- [ ] Check current point total (Achievement Center or Parent Dashboard)
- [ ] Verify "Weekly Points" shows `current_points / 500 pts`
- [ ] Complete homework tasks to earn 10pts each
- [ ] Verify "Weekly Points" updates in real-time
- [ ] Note: May need to complete many tasks + achievements to hit 500pts

## Focus Achievements Testing

### 10. First Focus Achievement (FIRST_FOCUS - 25pts)

- [ ] Complete your first focus session (if fresh install)
- [ ] Achievement popup should appear: "Focus Beginner - Complete your first focus session"
- [ ] Verify 25 bonus points awarded
- [ ] Check Achievement Center shows FIRST_FOCUS as unlocked

### 11. Focus Five Achievement (FOCUS_FIVE - 50pts)

- [ ] Complete 5 total focus sessions
- [ ] Achievement popup: "Focus Enthusiast - Complete 5 focus sessions"
- [ ] Verify 50 bonus points awarded
- [ ] Progress bar should show 5/5 before unlock

### 12. Focus Ten Achievement (FOCUS_TEN - 100pts)

- [ ] Complete 10 total focus sessions
- [ ] Achievement popup: "Focus Expert - Complete 10 focus sessions"
- [ ] Verify 100 bonus points awarded

### 13. Focus Marathon Achievement (FOCUS_MARATHON - 150pts)

- [ ] Accumulate 100 total focus minutes
- [ ] Can be any combination of 25min sessions (4 sessions = 100min)
- [ ] Achievement popup: "Marathon Mind - Focus for 100 minutes total"
- [ ] Verify 150 bonus points awarded

### 14. Daily Focus Streak Achievement (DAILY_FOCUS - 200pts)

- [ ] Complete at least one focus session on Day 1
- [ ] Complete at least one focus session on Day 2
- [ ] Complete at least one focus session on Day 3
- [ ] Achievement popup: "Daily Discipline - Focus for 3 days in a row"
- [ ] Verify 200 bonus points awarded
- [ ] Note: Requires 3 consecutive calendar days

## Auto-Reset Testing

### 15. Daily Goal Reset (Requires waiting until next day)

- [ ] Note current Daily Focus progress (e.g., 50/50 min completed)
- [ ] Note current Daily Tasks progress (e.g., 3/3 tasks)
- [ ] Wait until midnight (or change device time to next day)
- [ ] Reopen app
- [ ] Verify Daily Focus resets to `0 / 50 min`
- [ ] Verify Daily Tasks resets to `0 / 3 tasks`
- [ ] Verify target numbers remain the same (50 and 3)
- [ ] Verify "Time remaining" shows ~24h

### 16. Weekly Goal Reset (Requires waiting until next Sunday)

- [ ] Note current Weekly Focus progress
- [ ] Note current Weekly Points progress
- [ ] Wait until next Sunday at midnight (or change to next week)
- [ ] Reopen app
- [ ] Verify Weekly Focus resets to `0 / 300 min`
- [ ] Verify Weekly Points resets to `0 / 500 pts`
- [ ] Verify targets remain 300 and 500

## LocalStorage Persistence

### 17. Data Persistence Test

- [ ] Complete 2 focus sessions and 1 homework task
- [ ] Note progress: Daily Focus (50/50), Daily Tasks (1/3)
- [ ] Close app completely (force stop or kill process)
- [ ] Reopen app
- [ ] Verify progress persists exactly as left
- [ ] Verify no data loss

### 18. focusStats Tracking

- [ ] Open Chrome DevTools via `chrome://inspect/#devices`
- [ ] Connect to Vibe-Tutor WebView
- [ ] Open Console tab
- [ ] Run: `localStorage.getItem('focusStats')`
- [ ] Verify JSON shows:
  - `completedSessions`: correct count
  - `totalMinutes`: correct sum
- [ ] Complete another session
- [ ] Re-check focusStats updates correctly

### 19. user-goals Storage

- [ ] In Chrome DevTools Console
- [ ] Run: `JSON.parse(localStorage.getItem('user-goals'))`
- [ ] Verify array of 4 Goal objects
- [ ] Each should have:
  - id, type, category, target, current, startDate, endDate, completed
- [ ] Verify `current` values match displayed progress
- [ ] Verify `completed` is true when progress reaches target

## Integration Testing

### 20. Points Integration

- [ ] Earn points through:
  - Completing homework tasks (10pts each)
  - Completing focus sessions (1pt/min)
  - Unlocking achievements (25-200pts each)
- [ ] Verify "Weekly Points" goal updates immediately
- [ ] Points should be cumulative across all sources

### 21. Achievement Center Integration

- [ ] Open Achievement Center
- [ ] Verify 9 total achievements (4 homework + 5 focus)
- [ ] Hover over focus achievements to see progress bars
- [ ] Locked achievements should show X/Y progress (e.g., 3/5 sessions)
- [ ] Unlocked achievements should show checkmarks

### 22. WeekProgress Chart Compatibility

- [ ] Verify Goals Panel doesn't break WeekProgress chart
- [ ] Both components should render side-by-side in grid
- [ ] WeekProgress shows 7-day bar chart with focus minutes + tasks
- [ ] No layout conflicts or overlapping

## Edge Case Testing

### 23. No Data State

- [ ] Fresh install with no history
- [ ] Goals should show 0/target for all categories
- [ ] Progress bars at 0%
- [ ] No errors in console

### 24. Goal Expiration Edge Case

- [ ] Complete a daily goal (e.g., 50/50 min)
- [ ] Wait until goal period expires (next day)
- [ ] Verify goal resets even if completed
- [ ] Verify completion status resets to false

### 25. Large Numbers

- [ ] Manually add many homework tasks (>100)
- [ ] Complete them all
- [ ] Verify Daily Tasks still shows accurate count
- [ ] Verify Weekly Points handles large totals (>1000pts)
- [ ] UI should not break with large numbers

### 26. Negative Time Test

- [ ] Manually change device time backwards
- [ ] Reopen app
- [ ] Verify goals don't break (should handle negative endDate - now)
- [ ] Time remaining should show "Expired" if past deadline

## Performance Testing

### 27. Rendering Performance

- [ ] Goals Panel should render instantly (<500ms)
- [ ] No lag when switching to dashboard view
- [ ] Progress bar animations smooth (not janky)
- [ ] No memory leaks (monitor DevTools Performance tab)

### 28. useMemo Efficiency

- [ ] Complete multiple actions (add tasks, complete sessions)
- [ ] Verify Goals Panel only re-renders when data actually changes
- [ ] Should not re-render on unrelated state updates

## Regression Testing

### 29. Existing Features Unaffected

- [ ] Homework Dashboard still functional
- [ ] AI Tutor chat works
- [ ] AI Buddy chat works
- [ ] Achievement Center shows all achievements
- [ ] Parent Dashboard accessible
- [ ] Music Library functional
- [ ] Sensory Settings work
- [ ] Focus Timer still operational

### 30. Previous Achievements Intact

- [ ] Old homework achievements still tracked (FIRST_TASK, FIVE_TASKS, etc.)
- [ ] Existing progress preserved
- [ ] No data corruption from new focus achievements

## Chrome DevTools Debugging

### 31. Console Errors

- [ ] Connect via `chrome://inspect/#devices`
- [ ] Open Console tab
- [ ] Perform all above tests
- [ ] Verify no errors logged
- [ ] Warnings acceptable if from dependencies

### 32. Network Tab

- [ ] Open Network tab
- [ ] Verify no failed requests
- [ ] Verify API calls to backend successful (if AI features tested)

### 33. Application Tab

- [ ] Open Application → Local Storage
- [ ] Verify keys exist:
  - `user-goals`
  - `focusStats`
  - `focusSessions`
  - `homeworkItems`
  - `studentPoints`
  - `achievements`
- [ ] Verify data format correct (valid JSON)

## Final Validation

### 34. Version Verification

```bash
adb shell dumpsys package com.vibetech.tutor | findstr version
```

- [ ] Should show: `versionCode=15`
- [ ] Should show: `versionName=1.0.14`

### 35. APK Size Check

```bash
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] APK size should be ~20-30 MB
- [ ] Not significantly larger than v1.0.13

### 36. Release Readiness

- [ ] All critical tests passed (4-22)
- [ ] No blocking bugs found
- [ ] Performance acceptable
- [ ] Data persistence confirmed
- [ ] Auto-reset logic verified (if time permits)

## Known Limitations

- **Weekly reset testing**: Requires waiting until next Sunday or manual time manipulation
- **Daily reset testing**: Requires waiting until midnight or device time change
- **3-day streak**: Requires 3 consecutive days of testing
- **100min marathon**: Requires 4+ full Pomodoro sessions

## Sign-off

**Tested by**: ___________
**Date**: ___________
**Device**: Samsung Galaxy A54 (or specify)
**Android Version**: ___________

**Test Result**: ☐ PASS ☐ FAIL ☐ PASS WITH ISSUES

**Issues Found**
-

-

**Notes**
-

-

## Deployment Decision

- [ ] Ready for deployment to user's device
- [ ] Requires fixes before deployment
- [ ] Ready for production release (if all tests pass)

---

## Quick Test Sequence (30 minutes)

If time is limited, run this subset:

1. ✅ Install v1.0.14 and verify version (tests 1-3)
2. ✅ Visual check - Goals Panel appears correctly (test 4)
3. ✅ Complete 1 focus session - verify Daily Focus increments (test 6)
4. ✅ Complete 1 homework task - verify Daily Tasks increments (test 7)
5. ✅ Unlock FIRST_FOCUS achievement (test 10)
6. ✅ Close and reopen app - verify persistence (test 17)
7. ✅ Check no console errors (test 31)
8. ✅ Quick regression - open AI Tutor, Music Library (test 29)

**If all 8 quick tests pass → likely safe to deploy**
