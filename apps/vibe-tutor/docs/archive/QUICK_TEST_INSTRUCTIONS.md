# Quick Test Instructions - v1.0.14

**Dev Server:** ✅ RUNNING at <http://localhost:5173>

## 🎯 30-Minute Test Sequence

Follow these steps in order. Check off each box as you complete it.

---

## Phase 1: Visual Verification (5 minutes)

### Step 1: Open Application

- [ ] Open browser to: **<http://localhost:5173>**
- [ ] App should load with glassmorphism UI
- [ ] Verify VibeTech logo appears at top

### Step 2: Check New Navigation Items

- [ ] Look at sidebar (desktop) or bottom nav (mobile)
- [ ] Verify you see **9 navigation items** (2 new):
  - Dashboard ✅ (existing)
  - **Cards** 🆕 (Layers icon)
  - **Obbies** 🆕 (Gamepad icon)
  - AI Tutor ✅
  - AI Buddy ✅
  - Achievements ✅
  - Music ✅
  - Settings ✅ (renamed from "Sensory")
  - Focus ✅

**✅ PASS if:** All 9 items visible, no layout issues
**❌ FAIL if:** Missing items, duplicate buttons, or crashes

---

## Phase 2: RobloxObbies Testing (8 minutes)

### Step 3: Open Obbies View

- [ ] Click **"Obbies"** button in navigation
- [ ] Should see 4 colorful obby cards:
  - **Math Parkour** (yellow/orange gradient)
  - **Science Lab Escape** (green gradient)
  - **Word Tower** (blue gradient)
  - **History Timeline Run** (purple/pink gradient)

### Step 4: Complete Math Obby

- [ ] Click **"Math Parkour"** card
- [ ] You should see: "What is 15 + 27?"
- [ ] Options: 40, 42, 45, 48
- [ ] Click **42** (correct answer)
- [ ] Should see: ✅ Green checkmark, "+3 points"
- [ ] Question 2 appears automatically

### Step 5: Complete All 5 Questions

- [ ] Continue through all 5 math questions
- [ ] Note your score (should be 15-25 points total)
- [ ] At end, see trophy animation + "Claim Rewards" button
- [ ] Click **"Claim Rewards"**
- [ ] Points should be added to your total

### Step 6: Daily Limit Check

- [ ] Try to play Math Parkour again immediately
- [ ] Should see: **"Come back tomorrow!"** message
- [ ] This confirms daily limit is working

**✅ PASS if:** All questions work, points awarded, daily limit enforced
**❌ FAIL if:** Questions don't advance, no points, or can replay immediately

---

## Phase 3: SubjectCards Testing (8 minutes)

### Step 7: Open Cards View

- [ ] Click **"Cards"** button in navigation
- [ ] Should see 4 subject cards in grid:
  - **Math** (yellow, ⚡ Zap icon)
  - **Science** (green, ⚛️ Atom icon)
  - **English** (blue, 📖 Book icon)
  - **History** (purple, 🕐 Clock icon)
- [ ] Each card shows: ⭐ Basic, 0/30 XP, "0 homework completed"

### Step 8: Add Homework Task

- [ ] Go back to **Dashboard**
- [ ] Click **"Add Homework"** button
- [ ] Fill in:
  - Subject: **Math**
  - Title: "Test homework for XP"
  - Due Date: Tomorrow
- [ ] Click **"Add"**
- [ ] Task should appear in homework list

### Step 9: Complete Task & Check XP

- [ ] Click checkbox next to "Test homework for XP"
- [ ] Task should be marked complete (strikethrough)
- [ ] You should earn **+10 points**
- [ ] Go to **Cards** view
- [ ] Math card should now show: **10/30 XP**
- [ ] Progress bar should be ~33% filled

### Step 10: Evolution Test (Requires 3 tasks)

- [ ] Add 2 more Math homework tasks
- [ ] Complete both tasks
- [ ] Go to Cards view
- [ ] Math card should now show: **30/30 XP** or **0/100 XP** (if evolved)
- [ ] If evolved, should see: **⭐⭐ Advanced** level
- [ ] You should have earned **+20 bonus points** for level-up

**✅ PASS if:** XP increments correctly, evolution works, bonus points awarded
**❌ FAIL if:** XP doesn't update, no evolution, or app crashes

---

## Phase 4: AI Tutor Persistence (3 minutes)

### Step 11: Send AI Message

- [ ] Go to **AI Tutor** view
- [ ] Type message: "What is photosynthesis?"
- [ ] Click send
- [ ] Wait for AI response (should use DeepSeek)
- [ ] Note: Response should be bullet points, 2-3 sentences max

### Step 12: Verify Persistence

- [ ] **Close the browser tab completely**
- [ ] Reopen: **<http://localhost:5173>**
- [ ] Go back to **AI Tutor** view
- [ ] **Your conversation should still be there!**
- [ ] Verify your question and AI response are visible

**✅ PASS if:** Conversation persists after reload
**❌ FAIL if:** Conversation is lost, empty chat

---

## Phase 5: Focus Timer Accuracy (3 minutes)

### Step 13: Start Focus Session

- [ ] Go to **Focus** view
- [ ] Click **"Start Focus"** button
- [ ] Timer should start counting down from 25:00
- [ ] Let it run for ~30 seconds (to 24:30)

### Step 14: Background Test

- [ ] Minimize browser OR switch to another tab
- [ ] Wait 30 seconds (check phone timer)
- [ ] Switch back to Vibe-Tutor tab
- [ ] Timer should show ~24:00 (accurate, not stuck at 24:30)

**✅ PASS if:** Timer continues accurately even when backgrounded
**❌ FAIL if:** Timer stops or is inaccurate

---

## Phase 6: localStorage Persistence (3 minutes)

### Step 15: Chrome DevTools Check

- [ ] Press **F12** to open DevTools
- [ ] Go to **Application** tab
- [ ] Expand **Local Storage** → **<http://localhost:5173>**
- [ ] Verify these keys exist:
  - ✅ `ai-tutor-conversation` (NEW)
  - ✅ `focusTimerState` (NEW)
  - ✅ `obby-sessions` (NEW)
  - ✅ `obby-last-date` (NEW)
  - ✅ `subject-cards` (NEW)
  - ✅ `homeworkItems`
  - ✅ `studentPoints`

### Step 16: Check Console Errors

- [ ] Go to **Console** tab in DevTools
- [ ] Verify **no red errors**
- [ ] Warnings are okay (yellow/orange)

**✅ PASS if:** All 5 new localStorage keys exist, no errors
**❌ FAIL if:** Missing keys or console errors

---

## Phase 7: Regression Check (3 minutes)

### Step 17: Test Existing Features

- [ ] **Music Library:** Click Music, verify playlists load
- [ ] **Achievements:** Click Achievements, verify badges show
- [ ] **AI Buddy:** Click AI Buddy, send test message
- [ ] **Settings:** Click Settings, verify sensory controls appear

**✅ PASS if:** All existing features still work
**❌ FAIL if:** Any feature broken or crashes

---

## ✅ TEST RESULTS

**Total Tests:** 17
**Passed:** _____ / 17
**Failed:** _____ / 17

**Critical Failures (Block Release):**

- [ ] Navigation items missing/broken
- [ ] RobloxObbies crashes app
- [ ] SubjectCards XP not working
- [ ] AI Tutor conversation lost on reload
- [ ] Console shows errors

**Minor Issues (Can Release):**

- [ ] Visual glitches (not crashes)
- [ ] Minor timing issues in timer
- [ ] Obby questions need more variety

---

## 🚀 DECISION

### ✅ READY FOR ANDROID BUILD

**If all critical tests passed:**

```bash
pnpm run android:full-build
```

This will:

1. Build web assets (dist/)
2. Sync to Android (android/app/src/main/assets/)
3. Build APK (android/app/build/outputs/apk/debug/)

**Estimated time:** 2-3 minutes

### ❌ NEEDS FIXES

If any critical test failed, note the issue and fix before building APK.

---

## 📱 ANDROID DEVICE TESTING (After APK Build)

Once APK is built, test on your Samsung Galaxy A54:

```bash
# Uninstall old version (force cache clear)
pnpm run android:uninstall

# Install new v1.0.14 APK
pnpm run android:install

# Open app and repeat all 17 tests above
# Pay special attention to:
# - Daily obby reset at midnight
# - Card evolution animations
# - Background focus timer accuracy
```

---

## 🐛 KNOWN ISSUES (Expected)

These are known limitations, not bugs:

- Obby questions repeat after 5 per day (by design)
- Card evolution to Master requires 13 homework tasks
- AI conversation history can grow large (will add pruning in v1.0.15)
- Daily reset requires waiting until midnight (can't test immediately)

---

## 📝 TESTING NOTES

Use this space to record observations:

**What worked well:**
-

-

**Issues found:**
-

-

**Performance notes:**
-

-

---

**Tester:** ___________________
**Date:** October 25, 2025
**Browser:** Chrome / Firefox / Safari / Edge (circle one)
**Test Duration:** _____ minutes

**Final Verdict:** ☐ PROCEED WITH APK BUILD ☐ FIX ISSUES FIRST
