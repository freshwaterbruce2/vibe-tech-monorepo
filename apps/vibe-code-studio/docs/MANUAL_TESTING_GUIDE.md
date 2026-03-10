# 🧪 Vibe Code Studio - Manual Functional Testing Guide

**Version:** 1.0.0  
**Test Date:** January 3, 2026  
**Tester:** _______________

---

## 🎯 Testing Objective

Perform comprehensive manual testing of all major features before creating production build.

**Estimated Time:** 30-45 minutes

---

## ✅ Pre-Testing Setup

### 1. Start the Application in Dev Mode

```powershell
cd C:\dev\apps\vibe-code-studio
npm run dev
```

**Expected Result:**

- Application window opens
- No crash on startup
- Console shows no critical errors

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_______________________________________________

---

## 🔍 PHASE 1: Core Startup & Intelligence Engine

### Test 1.1: Application Launch

**Steps:**

1. Application opens without errors
2. Check console for startup messages
3. Look for "Intelligence Engine" initialization

**Expected:**

```
[Engine] [Apex] Loading embedding model...
[Engine] [Apex] Model loaded. ✅
```

**Status:** [ ] PASS  [ ] FAIL

**Console Output:**
_______________________________________________

### Test 1.2: Initial UI State

**Verify:**

- [ ] Title bar displays "Vibe Code Studio"
- [ ] Menu bar visible (File, Edit, View, etc.)
- [ ] Sidebar visible on left
- [ ] Status bar visible at bottom
- [ ] Welcome screen or editor visible

**Status:** [ ] PASS  [ ] FAIL

---

## 📁 PHASE 2: File Operations

### Test 2.1: Open File

**Steps:**

1. Click File → Open File (or Ctrl+O)
2. Navigate to a test file (e.g., any .js or .ts file)
3. Select and open the file

**Expected:**

- File opens in editor
- Content displays correctly
- File name shows in tab
- Syntax highlighting works

**Status:** [ ] PASS  [ ] FAIL

**File Path Tested:**
_______________________________________________

### Test 2.2: Save File

**Steps:**

1. Make a small edit to the open file
2. Click File → Save (or Ctrl+S)
3. Check for save confirmation

**Expected:**

- File saves without error
- Modified indicator (*) disappears from tab
- Status bar shows "Saved successfully"

**Status:** [ ] PASS  [ ] FAIL

### Test 2.3: Create New File

**Steps:**

1. Click File → New File (or Ctrl+N)
2. Type some content
3. Save with a new name

**Expected:**

- New file tab opens
- Can type content
- Save dialog appears
- File is created on disk

**Status:** [ ] PASS  [ ] FAIL

### Test 2.4: Open Folder/Workspace

**Steps:**

1. Click File → Open Folder
2. Select a project folder
3. Check sidebar file tree

**Expected:**

- Folder loads
- File tree displays in sidebar
- Can navigate folder structure
- Can click files to open them

**Status:** [ ] PASS  [ ] FAIL

**Folder Tested:**
_______________________________________________

---

## ⚙️ PHASE 3: Settings System (CRITICAL)

### Test 3.1: Open Settings Menu

**Steps:**

1. Click on Settings icon/menu OR press Ctrl+,
2. Settings panel should open

**CRITICAL CHECK:**

- [ ] Only ONE settings menu opens
- [ ] No duplicate settings panels
- [ ] Settings panel is titled "Settings"

**Status:** [ ] PASS  [ ] FAIL

**Screenshot/Notes:**
_______________________________________________

### Test 3.2: Theme Settings

**Steps:**

1. In Settings, find Theme dropdown
2. Change from "Dark" to "Light" (or vice versa)
3. Close and reopen settings

**Expected:**

- Theme changes immediately
- Setting persists after closing
- UI elements update correctly

**Status:** [ ] PASS  [ ] FAIL

### Test 3.3: Font Size Settings

**Steps:**

1. In Settings, adjust font size slider
2. Change from default to larger/smaller
3. Check editor text size

**Expected:**

- Font size changes in real-time
- Editor text updates
- Setting persists

**Status:** [ ] PASS  [ ] FAIL

### Test 3.4: Other Editor Settings

**Test these settings if available:**

- [ ] Tab size adjustment
- [ ] Auto-save toggle
- [ ] Line numbers toggle
- [ ] Word wrap toggle

**Status:** [ ] PASS  [ ] FAIL

---

## 💻 PHASE 4: Code Editor (Monaco)

### Test 4.1: Syntax Highlighting

**Steps:**

1. Open a TypeScript file (.ts or .tsx)
2. Verify colors for:
   - Keywords (const, let, function)
   - Strings
   - Comments
   - Variables

**Status:** [ ] PASS  [ ] FAIL

### Test 4.2: Auto-Completion

**Steps:**

1. Start typing a common JavaScript keyword
2. Look for autocomplete suggestions
3. Select a suggestion with Enter or Tab

**Expected:**

- Suggestions appear
- Can select with keyboard
- Code completes correctly

**Status:** [ ] PASS  [ ] FAIL

### Test 4.3: Find and Replace

**Steps:**

1. Press Ctrl+F (Find)
2. Search for a word in your file
3. Press Ctrl+H (Replace)
4. Try replacing one instance

**Expected:**

- Find dialog opens
- Search highlights matches
- Replace works correctly

**Status:** [ ] PASS  [ ] FAIL

### Test 4.4: Multi-Cursor Editing

**Steps:**

1. Hold Ctrl+Alt and click multiple locations
2. Type something
3. All cursors should type simultaneously

**Status:** [ ] PASS  [ ] FAIL

### Test 4.5: Code Folding

**Steps:**

1. Find a function or block in code
2. Click the collapse arrow next to line number
3. Code block should fold/unfold

**Status:** [ ] PASS  [ ] FAIL

---

## 🤖 PHASE 5: AI Features

### Test 5.1: AI Chat Panel

**Steps:**

1. Click AI Chat icon or press designated hotkey
2. AI panel should open
3. Try typing a simple message

**Expected:**

- Panel opens without error
- Chat interface visible
- Can type messages

**Status:** [ ] PASS  [ ] FAIL

**Notes:**
_______________________________________________

### Test 5.2: API Key Configuration

**Steps:**

1. Go to Settings
2. Find API Key section
3. Verify API key fields present

**Expected:**

- Can view/edit API keys
- Masked display for security
- Save button works

**Status:** [ ] PASS  [ ] FAIL

### Test 5.3: AI Code Suggestions (if implemented)

**Steps:**

1. Start typing code
2. Look for AI-powered suggestions
3. Test accepting a suggestion

**Status:** [ ] PASS  [ ] FAIL  [ ] N/A

---

## 📂 PHASE 6: File Explorer / Sidebar

### Test 6.1: File Tree Navigation

**Steps:**

1. Open a workspace folder
2. Expand/collapse folders in tree
3. Click files to open them

**Expected:**

- Tree displays correctly
- Folders expand/collapse
- Files open on click

**Status:** [ ] PASS  [ ] FAIL

### Test 6.2: File Context Menu (if implemented)

**Steps:**

1. Right-click a file in tree
2. Check for context menu

**Expected:**

- Menu appears
- Options like Delete, Rename work

**Status:** [ ] PASS  [ ] FAIL  [ ] N/A

### Test 6.3: Sidebar Toggle

**Steps:**

1. Click sidebar toggle button
2. Sidebar should hide
3. Click again to show

**Expected:**

- Sidebar hides/shows smoothly
- Editor resizes appropriately

**Status:** [ ] PASS  [ ] FAIL

---

## 🖥️ PHASE 7: Terminal Integration (if implemented)

### Test 7.1: Open Terminal

**Steps:**

1. Click Terminal menu or press Ctrl+`
2. Terminal panel should open

**Expected:**

- Terminal opens
- Shows command prompt
- Can type commands

**Status:** [ ] PASS  [ ] FAIL  [ ] N/A

### Test 7.2: Run Commands

**Steps:**

1. Type a simple command (e.g., `echo hello`)
2. Press Enter
3. Output should display

**Expected:**

- Command executes
- Output visible
- Can run multiple commands

**Status:** [ ] PASS  [ ] FAIL  [ ] N/A

---

## ⚡ PHASE 8: Performance & Stability

### Test 8.1: Large File Handling

**Steps:**

1. Open a large file (>1MB if available)
2. Scroll through it
3. Try editing

**Expected:**

- File opens without crash
- Scrolling is smooth
- No significant lag

**Status:** [ ] PASS  [ ] FAIL

**File Size Tested:**
_______________________________________________

### Test 8.2: Multiple Files Open

**Steps:**

1. Open 5-10 files simultaneously
2. Switch between tabs
3. Edit different files

**Expected:**

- All files open correctly
- Tab switching is fast
- No memory issues

**Status:** [ ] PASS  [ ] FAIL

### Test 8.3: Extended Runtime

**Steps:**

1. Leave application running for 10+ minutes
2. Perform various operations
3. Check for memory leaks

**Expected:**

- Application remains stable
- No performance degradation
- No crashes

**Status:** [ ] PASS  [ ] FAIL

**Runtime:**
_______________________________________________

---

## 🎨 PHASE 9: UI/UX Polish

### Test 9.1: Window Resize

**Steps:**

1. Resize the application window
2. Make it smaller, then larger
3. Maximize/restore

**Expected:**

- Layout adapts correctly
- No visual glitches
- All panels resize properly

**Status:** [ ] PASS  [ ] FAIL

### Test 9.2: Keyboard Shortcuts

**Test these shortcuts:**

- [ ] Ctrl+N (New File)
- [ ] Ctrl+O (Open File)
- [ ] Ctrl+S (Save)
- [ ] Ctrl+W (Close Tab)
- [ ] Ctrl+F (Find)
- [ ] Ctrl+, (Settings)

**Status:** [ ] PASS  [ ] FAIL

### Test 9.3: Theme Consistency

**Steps:**

1. Switch between Dark and Light themes
2. Check all UI elements update

**Areas to check:**

- [ ] Editor background
- [ ] Sidebar
- [ ] Status bar
- [ ] Menus
- [ ] Dialogs

**Status:** [ ] PASS  [ ] FAIL

---

## ❌ PHASE 10: Error Handling

### Test 10.1: Invalid File Open

**Steps:**

1. Try to open a non-existent file
2. Check error message

**Expected:**

- Graceful error message
- Application doesn't crash
- Can continue working

**Status:** [ ] PASS  [ ] FAIL

### Test 10.2: Save to Protected Location

**Steps:**

1. Try to save file to a protected directory
2. Check error handling

**Expected:**

- Clear error message
- Suggests alternative location
- No crash

**Status:** [ ] PASS  [ ] FAIL

### Test 10.3: Network Errors (AI Features)

**Steps:**

1. If AI features require network
2. Disconnect internet
3. Try to use AI feature

**Expected:**

- Graceful error message
- Offline mode works (if supported)
- No crash

**Status:** [ ] PASS  [ ] FAIL  [ ] N/A

---

## 🔄 PHASE 11: Data Persistence

### Test 11.1: Settings Persistence

**Steps:**

1. Change multiple settings
2. Close application
3. Reopen application
4. Check if settings persisted

**Expected:**

- All settings restored
- Theme, font size, etc. unchanged
- No data loss

**Status:** [ ] PASS  [ ] FAIL

### Test 11.2: Recent Files List

**Steps:**

1. Open several files
2. Close application
3. Reopen
4. Check File → Recent Files

**Expected:**

- Recent files list populated
- Can reopen from list
- Order is correct

**Status:** [ ] PASS  [ ] FAIL

---

## 📊 TESTING SUMMARY

### Critical Issues Found

**High Priority (Must Fix Before Release):**

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Medium Priority:**

1. _______________________________________________
2. _______________________________________________

**Low Priority (Nice to Have):**

1. _______________________________________________
2. _______________________________________________

### Overall Statistics

- **Total Tests Performed:** _____
- **Passed:** _____
- **Failed:** _____
- **Not Applicable:** _____

### Test Results

- [ ] ✅ **APPROVED FOR BUILD** - All critical tests passed
- [ ] ⚠️ **APPROVED WITH NOTES** - Minor issues, can build
- [ ] ❌ **NOT APPROVED** - Critical issues must be fixed

---

## 📝 Tester Notes

**Overall Impression:**
_______________________________________________
_______________________________________________
_______________________________________________

**User Experience:**
_______________________________________________
_______________________________________________

**Performance:**
_______________________________________________
_______________________________________________

**Recommendations:**
_______________________________________________
_______________________________________________

---

## ✅ Sign-Off

**Tester:** _______________  
**Date:** _______________  
**Time Spent:** _______________  

**Ready to Proceed with Build?** [ ] YES  [ ] NO

**Next Steps:**
_______________________________________________

---

**Testing Guide Version:** 1.0  
**Last Updated:** January 3, 2026
