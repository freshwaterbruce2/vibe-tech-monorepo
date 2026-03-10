# QA Testing Checklist - Vibe-Tutor v1.5.0

**Version**: 1.5.0 "Play Store Ready" (versionCode 28)
**Test Date**: ___________
**Tester**: ___________
**Test Run #**: ___________

---

## Device Testing Matrix

**REQUIRED:** Test on minimum 3 different Android devices before submission

### Device Requirements

**Minimum Specification:**

- [ ] Android 10+ (target minimum for Play Store)
- [ ] Minimum 2GB RAM
- [ ] Physical device (NOT emulator)
- [ ] Stable internet connection available

**Recommended Specification:**

- [ ] Android 14+ (current generation)
- [ ] 4GB+ RAM
- [ ] Samsung Galaxy S series OR Google Pixel (most common Play Store devices)
- [ ] Mix of screen sizes: phone + tablet

### Device Test Matrix

**Device 1:**

- [ ] Manufacturer: ___________
- [ ] Model: ___________
- [ ] Android Version: ___________
- [ ] RAM: ___________
- [ ] Screen Size: ___________
- [ ] Test Status: PASS / FAIL / PARTIAL

**Device 2:**

- [ ] Manufacturer: ___________
- [ ] Model: ___________
- [ ] Android Version: ___________
- [ ] RAM: ___________
- [ ] Screen Size: ___________
- [ ] Test Status: PASS / FAIL / PARTIAL

**Device 3 (Recommended):**

- [ ] Manufacturer: ___________
- [ ] Model: ___________
- [ ] Android Version: ___________
- [ ] RAM: ___________
- [ ] Screen Size: ___________
- [ ] Test Status: PASS / FAIL / PARTIAL

**Tablet Test (10" minimum - Optional but Recommended):**

- [ ] Manufacturer: ___________
- [ ] Model: ___________
- [ ] Android Version: ___________
- [ ] Screen Size: ___________
- [ ] Responsive Layout: PASS / FAIL
- [ ] Touch Targets: PASS / FAIL

---

## Pre-Test Setup

- [ ] **Device Preparation:**
  - [ ] Uninstall previous Vibe-Tutor version completely
  - [ ] Clear app data: Settings → Apps → Vibe-Tutor → Clear Storage
  - [ ] Restart device to clear cache

- [ ] **Network Setup:**
  - [ ] Ensure stable WiFi connection
  - [ ] Test with mobile data connection as well
  - [ ] Disable battery optimization: Settings → Battery → Vibe-Tutor → Don't restrict

- [ ] **Development Setup (if monitoring logs):**
  - [ ] Enable USB Debugging: Developer Options → USB Debugging
  - [ ] Install ADB (Android SDK tools)
  - [ ] Connect device via USB
  - [ ] Verify connection: `adb devices`
  - [ ] Monitor logs: `adb logcat | grep -i vibetech`

---

## Core Functionality Tests

### 1. Cold Start & First Launch

- [ ] **App launches without crashes**
- [ ] **Splash screen displays correctly**
- [ ] **Main dashboard loads with sample homework**
- [ ] **No errors in logcat**
- [ ] **Launch time < 3 seconds**

**Notes**: ___________

---

### 2. Homework Dashboard

- [ ] **View existing homework items**
- [ ] **Tap to complete/uncomplete tasks**
  - [ ] Checkmark animates
  - [ ] Points +10 awarded
  - [ ] Achievement check fires
- [ ] **Add new homework (text input)**
  - [ ] Subject field works
  - [ ] Title field works
  - [ ] Due date picker works
  - [ ] Task appears in list
- [ ] **Add homework (voice input)**
  - [ ] Microphone button works
  - [ ] Voice recognition captures speech
  - [ ] AI parses to structured homework
  - [ ] Task appears correctly
- [ ] **Delete homework item**
- [ ] **View week progress chart**
  - [ ] Shows last 7 days
  - [ ] Displays focus minutes + tasks

**Notes**: ___________

---

### 3. AI Tutor

- [ ] **Navigate to AI Tutor view**
- [ ] **Send message: "Help me with algebra"**
  - [ ] Message appears in chat
  - [ ] Loading indicator shows
  - [ ] AI response within 5 seconds
  - [ ] Response is relevant and helpful
- [ ] **Send followup question**
  - [ ] Context maintained from previous message
  - [ ] Conversation flows naturally
- [ ] **Test emoji limiting**
  - [ ] Response has ≤2 emojis
- [ ] **Test ADHD-friendly formatting**
  - [ ] Bullet points used
  - [ ] Short paragraphs
  - [ ] Clear language

**Notes**: ___________

---

### 4. AI Buddy (Conversation Buddy)

- [ ] **Navigate to Buddy Chat view**
- [ ] **Send message: "I'm stressed about homework"**
  - [ ] Response is supportive
  - [ ] Roblox-friendly tone (if applicable)
- [ ] **Test separate context from Tutor**
  - [ ] Conversation independent
  - [ ] No mixing of chat histories

**Notes**: ___________

---

### 5. Visual Schedules

- [ ] **Navigate to Schedules view**
- [ ] **View morning routine** (if configured)
  - [ ] Steps display in order
  - [ ] Timer buttons work
  - [ ] Mark step complete
  - [ ] Tokens awarded (+5 per step)
- [ ] **View evening routine** (if configured)
- [ ] **Edit schedule button** (navigates correctly)
- [ ] **Complete full routine**
  - [ ] Bonus tokens awarded (+20)
  - [ ] Completion tracked

**Notes**: ___________

---

### 6. First-Then Gate

- [ ] **Navigate to Brain Games**
- [ ] **If <3 routine steps completed:**
  - [ ] Gate message displays
  - [ ] Games locked
  - [ ] Shows steps remaining
- [ ] **Complete 3 routine steps**
- [ ] **Return to Brain Games**
  - [ ] Gate unlocked
  - [ ] Games accessible

**Notes**: ___________

---

### 7. Token Wallet

- [ ] **Navigate to Tokens view**
- [ ] **View current token balance**
- [ ] **View transaction history**
  - [ ] Routine completions show
  - [ ] Game rewards show
  - [ ] Timestamps correct
- [ ] **Close button returns to dashboard**

**Notes**: ___________

---

### 8. Brain Games (Word Search)

- [ ] **Navigate to Brain Games**
- [ ] **Select Word Hunt**
- [ ] **Choose difficulty: Easy**
  - [ ] Game loads
  - [ ] Words display
  - [ ] Grid interactive
- [ ] **Find a word**
  - [ ] Word highlights
  - [ ] Success animation
  - [ ] Score increases
- [ ] **Use hint button**
  - [ ] Hint reveals letter
  - [ ] Points deducted
- [ ] **Complete game**
  - [ ] Stars awarded (0-5)
  - [ ] Tokens earned
  - [ ] Results screen shows
  - [ ] Points added to total

**Notes**: ___________

---

### 9. Subject Cards & Worksheets

- [ ] **Navigate to Subject Cards**
- [ ] **Tap Math card**
- [ ] **View current difficulty level**
- [ ] **Start worksheet**
  - [ ] Questions load
  - [ ] Multiple choice works
  - [ ] Fill-in-blank works
  - [ ] True/False works
- [ ] **Submit worksheet**
  - [ ] Score calculated (0-100%)
  - [ ] Stars awarded based on score
  - [ ] Results screen shows
  - [ ] Level up if 5 stars earned

**Notes**: ___________

---

### 10. Music Library

- [ ] **Navigate to Music**
- [ ] **View curated tracks**
- [ ] **Play internet radio**
  - [ ] Stream loads
  - [ ] Audio plays
  - [ ] Pause/play works
  - [ ] Background playback works
- [ ] **Download a track**
  - [ ] Download starts
  - [ ] Progress shows
  - [ ] File saves locally
- [ ] **Play downloaded track**
  - [ ] Offline playback works
- [ ] **Delete track**
  - [ ] Confirmation prompt
  - [ ] File removed
  - [ ] Storage freed

**Notes**: ___________

---

### 11. Sensory Settings

- [ ] **Navigate to Sensory Settings**
- [ ] **Change animation speed: None**
  - [ ] Animations stop
  - [ ] App still usable
- [ ] **Change animation speed: Reduced**
  - [ ] Animations slower
- [ ] **Toggle sound: Off**
  - [ ] No sound effects
- [ ] **Toggle haptic: Off**
  - [ ] No vibrations
- [ ] **Change font size: Large**
  - [ ] Text increases
  - [ ] Layout adjusts
- [ ] **Enable dyslexia font**
  - [ ] OpenDyslexic loads
  - [ ] Readability improved
- [ ] **Change color mode: High Contrast**
  - [ ] Colors change
  - [ ] Contrast improves

**Notes**: ___________

---

### 12. Focus Timer (Pomodoro)

- [ ] **Navigate to Focus Timer**
- [ ] **Start 25-minute session**
  - [ ] Timer counts down
  - [ ] Screen stays on (wake lock)
  - [ ] Progress circle animates
- [ ] **Minimize app**
  - [ ] Timer continues in background
- [ ] **Return to app**
  - [ ] Timer shows correct time
- [ ] **Complete session**
  - [ ] Completion alert
  - [ ] Points awarded (25 pts = 25 min)
  - [ ] Achievement check fires
- [ ] **Cancel early**
  - [ ] No points awarded

**Notes**: ___________

---

### 13. Achievement Center

- [ ] **Navigate to Achievements**
- [ ] **View locked achievements**
  - [ ] Grayed out
  - [ ] Progress shows if applicable
- [ ] **View unlocked achievements**
  - [ ] Full color
  - [ ] Unlock date shows
- [ ] **View available rewards**
- [ ] **Claim reward** (if enough points)
  - [ ] Points deducted
  - [ ] Reward moves to claimed section

**Notes**: ___________

---

### 14. Parent Dashboard

- [ ] **Navigate to Parent Zone**
- [ ] **Enter PIN**
  - [ ] Keypad displays
  - [ ] Correct PIN unlocks
  - [ ] Wrong PIN rejected
- [ ] **View Progress Reports**
  - [ ] Completed tasks count correct
  - [ ] Points total correct
  - [ ] Chart displays
- [ ] **Navigate to Manage Rules**
  - [ ] Parent Rules page loads
- [ ] **Export data**
  - [ ] JSON file downloads
  - [ ] Contains all app data
- [ ] **Import data**
  - [ ] File selector opens
  - [ ] Data restores correctly
- [ ] **Clear all data**
  - [ ] Confirmation prompt
  - [ ] All data deleted
  - [ ] App resets

**Notes**: ___________

---

### 15. Parent Rules Configuration

- [ ] **Navigate from Parent Dashboard → Manage Rules**
- [ ] **View First-Then settings**
- [ ] **Change steps required: 5**
  - [ ] Setting saves
  - [ ] Brain Games gate updates
- [ ] **Change daily time limit**
- [ ] **Toggle calm mode**
  - [ ] Animations adjust app-wide
- [ ] **Close and verify settings persist**

**Notes**: ___________

---

## Edge Cases & Error Handling

### Network Errors

- [ ] **Disable WiFi/data before AI chat**
  - [ ] Error message displays
  - [ ] Fallback response shown
  - [ ] App doesn't crash
- [ ] **Enable network mid-chat**
  - [ ] Next message works
- [ ] **Disable network before music stream**
  - [ ] Error message displays
  - [ ] Graceful fallback

**Notes**: ___________

---

### Offline Mode

- [ ] **Enable Airplane Mode**
- [ ] **Launch app**
  - [ ] Dashboard works
  - [ ] Homework add/complete works
  - [ ] Brain games work
  - [ ] Subject cards work
  - [ ] Focus timer works
  - [ ] Schedules work
  - [ ] Token wallet shows cached data
- [ ] **Features correctly disabled:**
  - [ ] AI Tutor shows offline message
  - [ ] AI Buddy shows offline message
  - [ ] Music streaming shows offline message

**Notes**: ___________

---

### Background/Foreground

- [ ] **Start Focus Timer → Home button**
  - [ ] Timer continues
- [ ] **Play music → Lock screen**
  - [ ] Music continues
- [ ] **Return to app after 5 minutes**
  - [ ] State preserved
  - [ ] No crashes
- [ ] **Return after 24 hours**
  - [ ] Session token refreshed
  - [ ] Data intact

**Notes**: ___________

---

### Low Storage

- [ ] **Download multiple music tracks until storage warning**
  - [ ] Warning displays
  - [ ] Option to delete tracks shown
  - [ ] Download stops gracefully

**Notes**: ___________

---

### Memory Leaks

- [ ] **Use app for 30 minutes continuously**
- [ ] **Navigate between all views multiple times**
- [ ] **Monitor memory usage** (Android Studio Profiler or adb)
  - [ ] No excessive growth
  - [ ] Memory stabilizes

**Notes**: ___________

---

## Performance Testing Checklist

### Cold Start Performance

**Procedure:** Clear app cache, close app completely, then measure first launch

- [ ] **Cold start time**: ________ seconds
  - [ ] Target: <3 seconds
  - [ ] Status: PASS / FAIL
  - [ ] Device: ___________

- [ ] **Warm start time** (relaunch without clear): ________ seconds
  - [ ] Target: <1 second
  - [ ] Status: PASS / FAIL

- [ ] **Initial load**: Dashboard visible and interactive
  - [ ] Sample homework loads
  - [ ] No blank screens
  - [ ] No visible lag on first interaction

### Memory Stability Testing

**Procedure:** Monitor memory usage over extended session (use Android Studio Profiler or adb)

```bash
# View memory usage
adb shell "dumpsys meminfo com.vibetech.tutor | grep TOTAL"

# Monitor continuously
adb shell "watch -n 1 'dumpsys meminfo com.vibetech.tutor | grep TOTAL'"
```

- [ ] **Memory at launch**: ________ MB
- [ ] **Memory after 30-minute session**: ________ MB
  - [ ] Max growth: <50MB (target: <30MB)
  - [ ] Status: PASS / FAIL
- [ ] **Memory after 1-hour continuous use**: ________ MB
  - [ ] Stable (not continuously growing)
  - [ ] No memory leaks observed
  - [ ] Status: PASS / FAIL

### Navigation Performance

- [ ] **Dashboard → AI Tutor tab**: ________ ms (target: <200ms)
- [ ] **AI Tutor → Brain Games tab**: ________ ms (target: <200ms)
- [ ] **Open Sensory Settings**: ________ ms (target: <300ms)
- [ ] **Parent Dashboard unlock**: ________ ms (target: <500ms)
- [ ] **Music Library load**: ________ ms (target: <300ms)

### AI Response Performance

- [ ] **First message (cold network)**: ________ seconds
  - [ ] Typical: 3-5 seconds
  - [ ] Max acceptable: <10 seconds
  - [ ] Status: PASS / FAIL

- [ ] **Followup message**: ________ seconds
  - [ ] Typical: 2-3 seconds
  - [ ] Status: PASS / FAIL

- [ ] **Offline response (cached)**: ________ ms
  - [ ] Should appear instantly
  - [ ] Target: <500ms
  - [ ] Status: PASS / FAIL

### Animation Smoothness

- [ ] **Dashboard scrolling**: Smooth / Janky
  - [ ] Frame rate: 60fps / 30fps / <30fps
  - [ ] Status: PASS / FAIL

- [ ] **Achievement unlock animation**: Smooth / Janky
  - [ ] Toast appears without lag
  - [ ] Status: PASS / FAIL

- [ ] **Focus timer countdown**: No stuttering
  - [ ] Status: PASS / FAIL

### Database Query Performance

**Procedure:** Monitor SQLite query performance (use chrome://inspect for DevTools)

- [ ] **Homework list load**: <50ms
- [ ] **Achievement check**: <100ms
- [ ] **Points calculation**: <50ms
- [ ] **Data export**: <2 seconds
  - [ ] Status: PASS / FAIL

### Bundle Size Verification

- [ ] **Web bundle (dist/)**: ________ MB
  - [ ] Target: <500KB
  - [ ] Gzipped size acceptable: YES / NO

- [ ] **APK size**: ________ MB
  - [ ] Target: <100MB
  - [ ] Download time estimate: ________ seconds

**Notes**: ___________

---

## Battery & Network Impact

### Battery Drain Testing

**Procedure:** Monitor battery usage over extended periods with screen on

- [ ] **1-hour continuous use (screen on)**:
  - [ ] Battery drain: ________%
  - [ ] Target: <10%
  - [ ] Status: PASS / FAIL

- [ ] **30 minutes background music playback**:
  - [ ] Battery drain: ________%
  - [ ] Target: <5%
  - [ ] Status: PASS / FAIL

- [ ] **Focus timer running (1 hour)**:
  - [ ] Battery drain: ________%
  - [ ] Target: <8%
  - [ ] Status: PASS / FAIL

### Network Usage

- [ ] **Measure data used for typical 30-minute session**: ________ MB
  - [ ] First message (AI call): 5-10 KB
  - [ ] Followup messages: 1-5 KB each
  - [ ] Music stream (5 min): 15-25 MB
  - [ ] Overall acceptable: YES / NO

- [ ] **Offline capability maintained**:
  - [ ] App functions without network
  - [ ] Data syncs when reconnected
  - [ ] Status: PASS / FAIL

**Notes**: ___________

---

## Complete End-to-End Functionality Testing

**CRITICAL:** Test every feature in sequence as a real user would experience the app

### User Journey: First-Time User Setup

- [ ] **App Launch**
  - [ ] No splash screen errors
  - [ ] Dashboard loads with sample homework
  - [ ] Sidebar navigation visible
  - [ ] Status: PASS / FAIL

- [ ] **Voice Input Tutorial** (if shown)
  - [ ] Explanation appears
  - [ ] Microphone button clearly labeled
  - [ ] Easy to understand
  - [ ] Status: PASS / FAIL

### Complete End-to-End Workflows

**Workflow 1: Add Homework via Voice**

- [ ] Tap microphone button on dashboard
- [ ] Speak: "I need to read chapter 5 for English by Friday"
- [ ] Voice recognized and sent to AI
- [ ] Parsed homework appears with:
  - [ ] Subject: English
  - [ ] Title: Read Chapter 5
  - [ ] Due Date: Friday (correctly calculated)
- [ ] Task shows in homework list
- [ ] Can complete task with checkmark
- [ ] Points awarded: +10
- [ ] Achievement unlocked (if applicable)
- [ ] Status: PASS / FAIL

**Workflow 2: Add Homework via Text**

- [ ] Tap "Add Homework" button
- [ ] Enter Subject: Math
- [ ] Enter Title: Complete problem set 1-10
- [ ] Select Due Date
- [ ] Tap "Add"
- [ ] Task appears in list
- [ ] Status: PASS / FAIL

**Workflow 3: Complete Homework Flow**

- [ ] Tap homework item to complete
- [ ] Checkmark appears with animation
- [ ] Points awarded: +10
- [ ] Total points increased
- [ ] Achievement check fires (if applicable)
- [ ] Can undo by tapping again
- [ ] Status: PASS / FAIL

**Workflow 4: AI Tutor Complete Session**

- [ ] Navigate to AI Tutor tab
- [ ] Send message: "Help me understand photosynthesis"
- [ ] AI responds with helpful explanation
  - [ ] Emojis: ≤2 (verify in response)
  - [ ] Format: Bullet points and short paragraphs
  - [ ] Length: 3-5 sentences max
- [ ] Send followup: "Can you explain the light reactions?"
- [ ] Response shows understanding of context
- [ ] Conversation maintains history
- [ ] Status: PASS / FAIL

**Workflow 5: AI Buddy Chat Session**

- [ ] Navigate to Conversation Buddy tab
- [ ] Send message: "I'm worried about my test tomorrow"
- [ ] Response is supportive and encouraging
- [ ] Conversation is separate from Tutor chat
- [ ] Tone is friendly and compassionate
- [ ] Status: PASS / FAIL

**Workflow 6: Brain Games Complete Session**

- [ ] Navigate to Brain Games
- [ ] Select "Word Hunt"
- [ ] Choose difficulty: Easy
- [ ] Find 3 words successfully
  - [ ] Words highlight correctly
  - [ ] Score increases
  - [ ] Visual feedback appears
- [ ] Use hint button
  - [ ] Hint reveals one letter
  - [ ] Points deducted appropriately
- [ ] Complete game
  - [ ] Star rating appears (0-5)
  - [ ] Tokens awarded
  - [ ] Results screen shows score
- [ ] Play all 10 brain games
  - [ ] Each game loads successfully
  - [ ] Each game can be completed
  - [ ] Rewards appear for each
- [ ] Status: PASS / FAIL

**Workflow 7: Subject Cards & Worksheets**

- [ ] Navigate to Subject Cards
- [ ] Select Math card
- [ ] Verify current difficulty level displayed
- [ ] Start worksheet (multiple choice questions)
- [ ] Answer all questions
- [ ] Submit worksheet
  - [ ] Score calculated (0-100%)
  - [ ] Star rating awarded (0-5)
  - [ ] Results screen shows feedback
- [ ] Verify level up if applicable (5 stars)
- [ ] Status: PASS / FAIL

**Workflow 8: Focus Timer Complete Session**

- [ ] Navigate to Focus Timer
- [ ] Start 25-minute session
- [ ] Timer counts down visibly
  - [ ] Circle fills correctly
  - [ ] Time displays accurately
- [ ] Minimize app → return after 5 minutes
  - [ ] Timer continues correctly
  - [ ] No desynchronization
- [ ] Let timer complete full 25 minutes (or test with shorter time)
- [ ] Completion notification appears
  - [ ] Points awarded: 25 (= 25 minutes)
  - [ ] Can see points in token wallet
- [ ] Achievement unlocked (if applicable)
- [ ] Status: PASS / FAIL

**Workflow 9: Music Library Complete Flow**

- [ ] Navigate to Music Library
- [ ] Verify 5+ tracks displayed
- [ ] Play a track online
  - [ ] Controls appear (play/pause)
  - [ ] Audio plays without error
  - [ ] Volume control works
  - [ ] Pause button works
- [ ] Download a track
  - [ ] Download starts and shows progress
  - [ ] Can see download button changes to "Downloaded"
- [ ] Play downloaded track offline
  - [ ] Airplane Mode enabled
  - [ ] App still works
  - [ ] Downloaded track plays
  - [ ] Online track shows "offline" message
- [ ] Delete a track
  - [ ] Confirmation prompt appears
  - [ ] Track removed from library
- [ ] Status: PASS / FAIL

**Workflow 10: Progress Tracking**

- [ ] Complete 3+ homework items
- [ ] Run focus timer (or multiple sessions)
- [ ] Play brain games (complete 2+ games)
- [ ] View Week Progress chart
  - [ ] Chart displays past 7 days
  - [ ] Shows homework completion count
  - [ ] Shows focus time (minutes)
  - [ ] Data accurate
- [ ] Status: PASS / FAIL

**Workflow 11: Achievement System**

- [ ] Navigate to Achievements
- [ ] View locked achievements (grayed out)
  - [ ] Progress shown if applicable
  - [ ] Unlock criteria clear
- [ ] Perform actions to unlock achievement
  - [ ] Complete homework (unlocks achievement)
  - [ ] Toast notification appears
  - [ ] Achievement moves to unlocked section
  - [ ] Full color appears
  - [ ] Unlock date shown
- [ ] View available rewards
- [ ] Claim reward (if enough points)
  - [ ] Points deducted correctly
  - [ ] Reward moves to claimed section
- [ ] Status: PASS / FAIL

**Workflow 12: Visual Schedules** (if configured)

- [ ] Navigate to Schedules
- [ ] View morning routine (5+ steps)
  - [ ] Steps display in order
  - [ ] Icons visible and clear
  - [ ] Step descriptions readable
- [ ] Complete each step
  - [ ] Mark complete button works
  - [ ] Tokens awarded: +5 per step
  - [ ] Visual feedback (checkmark/color change)
- [ ] Complete all steps
  - [ ] Bonus tokens awarded: +20
  - [ ] Completion message appears
- [ ] Verify First-Then gate works
  - [ ] Complete 3 routine steps
  - [ ] Brain Games unlock
  - [ ] Lock message gone
- [ ] Status: PASS / FAIL

**Workflow 13: Parent Dashboard Complete**

- [ ] Navigate to Parent Zone
- [ ] Enter PIN (default: 0000 or configured)
  - [ ] Keypad displays securely
  - [ ] Correct PIN unlocks
  - [ ] Wrong PIN shows error
- [ ] View Progress Reports
  - [ ] Completed tasks count correct
  - [ ] Points total accurate
  - [ ] Chart displays data
- [ ] Navigate to Manage Rules
  - [ ] Page loads without error
- [ ] View current settings
  - [ ] First-Then steps: visible
  - [ ] Daily time limit: visible
  - [ ] Calm mode toggle: visible
- [ ] Change First-Then steps to 5
  - [ ] Setting saves
  - [ ] Brain Games gate updates
- [ ] Data Export
  - [ ] JSON file generates
  - [ ] Contains complete app data
  - [ ] File size >100 bytes
- [ ] Data Import
  - [ ] File selector opens
  - [ ] Select exported JSON
  - [ ] Data restores correctly
  - [ ] All items recovered
- [ ] Status: PASS / FAIL

---

## Accessibility Testing (CRITICAL for Neurodivergent Support)

**PURPOSE:** Verify app is fully accessible for students with diverse neurodivergent needs

### Font & Dyslexia Support

- [ ] **OpenDyslexic Font**
  - [ ] Navigate to Sensory Settings
  - [ ] Toggle "Dyslexia Font: ON"
  - [ ] Font changes to OpenDyslexic
  - [ ] All text readable with new font
  - [ ] No text cutoff or overflow
  - [ ] Layout adapts correctly
  - [ ] Status: PASS / FAIL

- [ ] **Font Size Adjustments**
  - [ ] Size: Small
    - [ ] Text appears smaller
    - [ ] All content fits on screen
    - [ ] No horizontal scroll
  - [ ] Size: Medium (default)
    - [ ] Recommended reading size
  - [ ] Size: Large
    - [ ] Text significantly larger
    - [ ] Layout adjusts (single column on phone)
    - [ ] Buttons still tappable
    - [ ] No content hidden
  - [ ] Status: PASS / FAIL

### Animation & Motion Sensitivity

- [ ] **Animation Speed: None**
  - [ ] All animations disabled
  - [ ] Transitions instant/no animation
  - [ ] Achievement popup appears instantly
  - [ ] No motion-induced discomfort
  - [ ] Status: PASS / FAIL

- [ ] **Animation Speed: Reduced**
  - [ ] Animations run slower
  - [ ] Transitions visible but gentle
  - [ ] Status: PASS / FAIL

- [ ] **Animation Speed: Normal**
  - [ ] Standard animation timing
  - [ ] Smooth transitions
  - [ ] Status: PASS / FAIL

### Sound & Haptic Feedback

- [ ] **Sound Effects: ON (Default)**
  - [ ] Notification sounds play
  - [ ] Achievement sounds audible
  - [ ] Can hear all audio feedback
  - [ ] Volume appropriate (not too loud)

- [ ] **Sound Effects: OFF**
  - [ ] All sound effects muted
  - [ ] App still fully functional
  - [ ] Visual feedback replaces audio

- [ ] **Haptic Feedback: ON (Default)**
  - [ ] Vibrations felt on task completion
  - [ ] Vibrations on achievement unlock
  - [ ] Vibrations consistent

- [ ] **Haptic Feedback: OFF**
  - [ ] No vibrations at all
  - [ ] Visual feedback sufficient
  - [ ] App fully usable without haptics

- [ ] **Status**: PASS / FAIL

### Color & Contrast

- [ ] **Color Mode: Normal**
  - [ ] Standard colors display
  - [ ] Readable and visually appealing

- [ ] **Color Mode: High Contrast**
  - [ ] Colors change to high contrast
  - [ ] Text clearly visible
  - [ ] Purple/cyan remain distinct
  - [ ] All elements readable

- [ ] **Dark Mode (if available)**
  - [ ] Reduces eye strain
  - [ ] Text contrast sufficient
  - [ ] Status: PASS / FAIL

### Screen Reader & Voice Control (TalkBack)

**Procedure:** Enable TalkBack in Settings → Accessibility → Screen Reader

- [ ] **Enable TalkBack**
  - [ ] Settings → Accessibility → Screen Reader
  - [ ] TalkBack enabled

- [ ] **Navigation**
  - [ ] All buttons properly labeled
  - [ ] Homework items readable
  - [ ] Can navigate sidebar with screen reader
  - [ ] Tab navigation works

- [ ] **Interactive Elements**
  - [ ] Complete homework button reads clearly
  - [ ] Buttons announce their purpose
  - [ ] Form fields labeled appropriately

- [ ] **Complex Elements**
  - [ ] Chart/progress data accessible
  - [ ] AI response readable
  - [ ] Achievement icons have alt text

- [ ] **Feedback**
  - [ ] Audio feedback for actions
  - [ ] Completion announced
  - [ ] Error messages announced
  - [ ] Status: PASS / FAIL

### Touch Target Sizes

**Android Standard:** Minimum 48x48dp (≈9mm)

- [ ] **All interactive elements meet 48x48dp minimum**
  - [ ] Buttons tested
  - [ ] Tabs tested
  - [ ] Input fields tested
  - [ ] No elements too small
  - [ ] Status: PASS / FAIL

- [ ] **Spacing between touch targets**
  - [ ] No accidental taps on adjacent elements
  - [ ] Sufficient padding between buttons
  - [ ] Easy to tap intended target
  - [ ] Status: PASS / FAIL

### Cognitive Accessibility

- [ ] **Clear Language**
  - [ ] Labels are simple and direct
  - [ ] Instructions are concise
  - [ ] No jargon or complex terminology
  - [ ] Status: PASS / FAIL

- [ ] **Consistent Navigation**
  - [ ] Main tabs always in same location
  - [ ] Back button always same position
  - [ ] Predictable navigation flow
  - [ ] Status: PASS / FAIL

- [ ] **Error Prevention**
  - [ ] Confirmation prompts for destructive actions
  - [ ] Undo functionality where appropriate
  - [ ] Clear error messages
  - [ ] Status: PASS / FAIL

---

## Regression Testing

**Focus:** Ensure new builds don't break existing functionality

### Data Persistence

- [ ] **App restart preserves data**
  - [ ] Close app completely (swipe from recent apps)
  - [ ] Reopen app
  - [ ] All homework items still present
  - [ ] Points total unchanged
  - [ ] Achievements still unlocked
  - [ ] Settings still applied
  - [ ] Status: PASS / FAIL

- [ ] **SQLite migration from localStorage** (if applicable)
  - [ ] First run after SQLite implementation
  - [ ] Old localStorage data auto-migrated
  - [ ] All homework items recovered
  - [ ] All achievements recovered
  - [ ] All settings preserved
  - [ ] No data loss
  - [ ] Status: PASS / FAIL

### MCP Learning Dashboard Integration

- [ ] **Learning Dashboard accessible**
  - [ ] Open MCP Learning Dashboard (if integrated)
  - [ ] Vibe-Tutor data visible
  - [ ] Homework entries show
  - [ ] Achievement data shows
  - [ ] Points accurate
  - [ ] Status: PASS / FAIL

### Device Persistence Across Restarts

- [ ] **Restart device**
  - [ ] Device powered off completely
  - [ ] Wait 30 seconds
  - [ ] Power on device
  - [ ] Relaunch Vibe-Tutor

- [ ] **Data intact after device restart**
  - [ ] All homework items present
  - [ ] Points total unchanged
  - [ ] Achievements still unlocked
  - [ ] Sensory settings preserved
  - [ ] Status: PASS / FAIL

### Chrome DevTools Verification

- [ ] **Connect device via USB**
  - [ ] Enable USB debugging
  - [ ] Open chrome://inspect/#devices in Chrome
  - [ ] Vibe-Tutor app appears in list

- [ ] **Inspect logs for errors**
  - [ ] Click "inspect"
  - [ ] Open Console tab
  - [ ] No RED error messages
  - [ ] No undefined references
  - [ ] No API errors logged
  - [ ] SQLite queries working
  - [ ] Status: PASS / FAIL

---

## Play Store Pre-submission Checklist

**CRITICAL:** Complete all items before uploading to Google Play Console

### Build Version Management

- [ ] **versionCode: 28**
  - [ ] Verify in android/app/build.gradle
  - [ ] Matches release version
  - [ ] Incremented from previous build
  - [ ] Verified: `grep versionCode android/app/build.gradle`

- [ ] **versionName: "1.5.0"**
  - [ ] Matches release version
  - [ ] Format: MAJOR.MINOR.PATCH
  - [ ] Verified: `grep versionName android/app/build.gradle`

### Build & Signing

- [ ] **AAB (Android App Bundle) Generated**
  - [ ] File exists: `android/app/build/outputs/bundle/release/app-release.aab`
  - [ ] File size: <100MB (confirmed: ________ MB)
  - [ ] Signed with production keystore
  - [ ] Not debug signed
  - [ ] Build command used: `gradlew bundleRelease`

- [ ] **Build Process Verification**

  ```bash
  # Confirm clean build completed
  ls -lah android/app/build/outputs/bundle/release/app-release.aab
  ```

### App Manifest & Permissions

- [ ] **AndroidManifest.xml**
  - [ ] Package name: com.vibetech.tutor
  - [ ] Minimum SDK: 24 (Android 7.0)
  - [ ] Target SDK: 34 (Android 14)
  - [ ] Required permissions documented:
    - [ ] INTERNET (required)
    - [ ] RECORD_AUDIO (voice input)
    - [ ] READ_EXTERNAL_STORAGE (maxSdkVersion=32, legacy media read)
    - [ ] READ_MEDIA_AUDIO (Android 13+ media read)
    - [ ] WAKE_LOCK (focus timer)
    - [ ] FOREGROUND_SERVICE (media playback service)
    - [ ] FOREGROUND_SERVICE_MEDIA_PLAYBACK (Android 14+ media playback)

- [ ] **Permissions Justified**
  - [ ] Each permission has clear use case
  - [ ] No unnecessary permissions requested
  - [ ] Runtime permissions requested on Android 6+
  - [ ] Rationale provided to users

### Privacy & Security

- [ ] **API Key Security**
  - [ ] AI provider keys NOT in client code (Gemini/OpenRouter)
  - [ ] Backend proxy used for all API calls
  - [ ] No hardcoded secrets in APK
  - [ ] Verified with: `grep -r "sk-" android/app/src/`
    - [ ] Result: 0 matches (no exposed keys)

- [ ] **HTTPS Only**
  - [ ] All network requests use HTTPS
  - [ ] No plaintext HTTP endpoints
  - [ ] Certificate pinning verified
  - [ ] Logcat shows no cleartext traffic

- [ ] **Data Privacy**
  - [ ] Privacy Policy accessible at: <https://freshwaterbruce2.github.io/vibetech/privacy-policy/>
  - [ ] Privacy Policy explains:
    - [ ] What data is collected
    - [ ] How data is used
    - [ ] How data is stored
    - [ ] User rights and controls
  - [ ] Data Safety form completed
  - [ ] All required fields filled

### Play Console Requirements

- [ ] **App Title & Description**
  - [ ] Title: "Vibe-Tutor"
  - [ ] Description complete and accurate
  - [ ] Highlights ADHD/autism support
  - [ ] Mentions neurodivergent features
  - [ ] Character limits met:
    - [ ] Short description: <80 chars
    - [ ] Full description: <4000 chars

- [ ] **Privacy Policy**
  - [ ] URL verified and accessible
  - [ ] URL in Play Console matches: <https://freshwaterbruce2.github.io/vibetech/privacy-policy/>
  - [ ] Policy explains data handling
  - [ ] Policy mentions Families policy (if applicable)

- [ ] **Content Rating**
  - [ ] IARC questionnaire completed
  - [ ] Rating appropriate for target audience (13+)
  - [ ] Content categories selected:
    - [ ] Educational content
    - [ ] No violence/harmful content
    - [ ] No alcohol/drugs
    - [ ] No gambling

- [ ] **Content Suitability**
  - [ ] Appropriate for Teens (13+)
  - [ ] AI responses verified for appropriateness
  - [ ] No user-generated content risks
  - [ ] Parent controls documented

### Store Listing Assets

- [ ] **App Icon**
  - [ ] 512x512 PNG
  - [ ] High quality and clear
  - [ ] Works at small sizes
  - [ ] File: `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`
  - [ ] Verified dimensions: ________ x ________

- [ ] **Feature Graphic (Hero Image)**
  - [ ] 1024x500 PNG or JPG
  - [ ] Attractive and representative
  - [ ] Text clearly readable
  - [ ] File: `android/app/src/main/assets/feature_graphic.png`
  - [ ] Verified: EXISTS / MISSING

- [ ] **Screenshots (Minimum 2, Recommend 4-8)**
  - [ ] Screenshot 1: Dashboard/homework view
    - [ ] File: ___________
    - [ ] Dimension: 1080x1920 or similar
    - [ ] Clear and professional
  - [ ] Screenshot 2: AI Tutor chat
    - [ ] File: ___________
    - [ ] Shows interaction with AI
    - [ ] Readable text
  - [ ] Screenshot 3: Brain Games
    - [ ] File: ___________
    - [ ] Shows gamification
  - [ ] Screenshot 4: Achievement/Progress
    - [ ] File: ___________
    - [ ] Shows progress tracking
  - [ ] Screenshot 5: Sensory Settings (Optional)
    - [ ] File: ___________
    - [ ] Shows accessibility features
  - [ ] All screenshots tested for display quality

- [ ] **Screenshots Include Captions**
  - [ ] Each screenshot has 1-line description
  - [ ] Captions explain key features
  - [ ] Text readable at thumbnail size

### Pre-Launch Checks

- [ ] **App Crashes**
  - [ ] Cold start → No crash
  - [ ] Navigate to each view → No crash
  - [ ] Send AI message → No crash
  - [ ] Complete homework → No crash
  - [ ] All brain games → No crash
  - [ ] Status: NO CRASHES

- [ ] **Functionality**
  - [ ] Voice input works (or gracefully disabled)
  - [ ] AI chat responds
  - [ ] Homework can be added/completed
  - [ ] Brain games playable
  - [ ] Settings apply and persist
  - [ ] Status: ALL WORKING

- [ ] **Performance**
  - [ ] Cold start: <3 seconds
  - [ ] Navigation smooth
  - [ ] No visible lag
  - [ ] Memory stable (no crashes due to low memory)
  - [ ] Status: PASS / FAIL

- [ ] **Device Compatibility**
  - [ ] Tested on Android 10 device
  - [ ] Tested on Android 14 device
  - [ ] Tablet layout verified
  - [ ] Screen rotation works
  - [ ] Status: COMPATIBLE

### Post-Launch Monitoring

- [ ] **App Signing**
  - [ ] Release key used (not debug)
  - [ ] Key password secured
  - [ ] Keystore backed up: `C:\dev\apps\vibe-tutor\android\signing\release.keystore`
  - [ ] Key alias: vibetech_release
  - [ ] Status: VERIFIED

- [ ] **Release Notes**
  - [ ] Version 1.5.0 release notes written
  - [ ] Notes highlight new features
  - [ ] Notes mention bug fixes
  - [ ] Character limit: <500 chars
  - [ ] Notes saved to: `docs/RELEASE_NOTES_v1.5.0.md`

- [ ] **Rollout Strategy**
  - [ ] Decide rollout: staged or immediate
  - [ ] If staged: start with 10% → 25% → 50% → 100%
  - [ ] Monitor crash rates during rollout
  - [ ] Monitor user ratings and reviews
  - [ ] Be ready to roll back if issues arise

**Notes**: ___________

---

## Security & Privacy

- [ ] **No sensitive data in logcat**
- [ ] **PIN hashed, not plain text** (check localStorage)
- [ ] **All network requests use HTTPS**
- [ ] **No cleartext traffic** (verify in logcat)
- [ ] **No unexpected permissions requested**

**Notes**: ___________

---

## Regression Tests (After Bug Fixes)

- [ ] **Previous bug #1**: (describe) - FIXED / NOT FIXED
- [ ] **Previous bug #2**: (describe) - FIXED / NOT FIXED

**Notes**: ___________

---

## Critical Issues Found

**P0 (Blocker - Cannot ship):**

1. ___________
2. ___________

**P1 (Major - Should fix before launch):**

1. ___________
2. ___________

**P2 (Minor - Can fix post-launch):**

1. ___________
2. ___________

---

## Test Summary & Sign-Off

### Completion Status

**Device Testing:**

- Device 1: PASS / FAIL / PARTIAL
- Device 2: PASS / FAIL / PARTIAL
- Device 3: PASS / FAIL / PARTIAL
- Tablet (optional): PASS / FAIL / SKIPPED

**Functional Testing:**

- Core Features: ________ / 13 workflows PASS
- AI Features: ________ / 2 workflows PASS
- Gamification: ________ / 2 workflows PASS
- Sensory/Accessibility: ________ / 5 workflows PASS
- Parent Controls: ________ / 1 workflow PASS

**Performance Testing:**

- Cold Start Time: ________ seconds (target: <3s)
- Memory Stability: PASS / FAIL
- Navigation Responsiveness: PASS / FAIL
- Animation Smoothness: PASS / FAIL
- Battery Impact: <10% per hour (PASS / FAIL)

**Accessibility Testing:**

- Font Support: PASS / FAIL
- Sensory Settings: PASS / FAIL
- Screen Reader: PASS / FAIL / NOT TESTED
- Touch Targets: PASS / FAIL
- Color Contrast: PASS / FAIL

**Regression Testing:**

- Data Persistence: PASS / FAIL
- SQLite Migration: PASS / FAIL / N/A
- Device Restart: PASS / FAIL
- Chrome DevTools: PASS / FAIL

**Play Store Checklist:**

- Build Version: VERIFIED
- Permissions: VERIFIED
- Privacy & Security: VERIFIED
- Store Assets: READY / INCOMPLETE
- Pre-launch Checks: PASS / FAIL

### Overall Assessment

**Total Features Tested**: 13+ workflows
**Accessibility Features Tested**: 8+ features
**Devices Tested**: 3+ minimum
**Critical Issues**: ________ (must be 0 to proceed)
**Major Issues**: ________
**Minor Issues**: ________

**Overall Status**:

- PASS (Ready for Play Store submission)
- CONDITIONAL PASS (Minor issues only, ready with acknowledgment)
- FAIL (Blocking issues, not ready)

### Tester Certification

**Tester Name**: ___________
**Email**: ___________
**Organization**: ___________
**Test Date**: ___________
**Test Duration**: ________ hours

**I confirm that I have thoroughly tested Vibe-Tutor v1.5.0 (versionCode 28) on the specified devices and have verified:**

- [ ] All critical features work as expected
- [ ] Accessibility features function correctly
- [ ] Performance meets targets
- [ ] No blocking issues found
- [ ] App is ready for Play Store submission

**Tester Signature**: ___________
**Date Signed**: ___________

---

## Next Steps After Approval

1. **Build APK for internal release**:

   ```bash
   pnpm run build
   pnpm exec cap sync android
   cd android && ./gradlew.bat bundleRelease && cd ..
   ```

2. **Upload AAB to Google Play Console**:
   - File: `android/app/build/outputs/bundle/release/app-release.aab`
   - Select "Create new release"
   - Add release notes from `docs/RELEASE_NOTES_v1.5.0.md`
   - Select countries for rollout
   - Start with staged rollout (10% → 25% → 50% → 100%)

3. **Monitor post-launch**:
   - Check crash rates in Play Console
   - Monitor user ratings and reviews
   - Respond to user feedback
   - Be ready to roll back if major issues found

4. **Archive checklist**:
   - Save completed checklist to: `apps/vibe-tutor/qa-reports/QA_CHECKLIST_v1.5.0_[DATE].md`
   - Include tester information and results
   - Reference in release notes

---

**IMPORTANT:** Use this checklist for every release before Play Store submission.

For questions or issues during testing, consult:

- **CLAUDE.md** - Technical architecture and development guidelines
- **MOBILE-TROUBLESHOOTING.md** - Common Android issues and solutions
- **PARENT_GUIDE.md** - User documentation and feature explanations
