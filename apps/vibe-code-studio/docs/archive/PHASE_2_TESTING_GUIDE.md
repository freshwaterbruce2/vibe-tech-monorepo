# Phase 2 Testing Guide: Self-Correction

**Date:** October 19, 2025 6:20 PM
**Status:** Ready for testing
**Estimated Time:** 10-15 minutes

## Prerequisites

1. ✅ Phase 1 complete (skipped steps show orange)
2. ✅ Phase 2 code implemented
3. ✅ TypeScript fixes applied
4. ⏳ App running (`pnpm dev`)

## Test Scenarios

### Test 1: File Not Found (Expected to Self-Correct)

**Goal:** Verify agent tries alternative when file doesn't exist

**Steps:**

1. Open Agent Mode
2. Enter task: "Read the file /nonexistent/test.txt"
3. Click "Plan Task"
4. Click "Execute Task"

**Expected Behavior:**

```
Step 1: Read /nonexistent/test.txt
├─ Attempt 1: Read file → ❌ File not found
├─ 🤔 Self-Correction: Analyzing...
├─ Console: "[ExecutionEngine] 🔄 Attempting self-correction..."
├─ Console: "[ExecutionEngine] ✨ Alternative Strategy: Search workspace for test.txt"
├─ Attempt 2: Search workspace → Either finds it or skips gracefully
└─ Result: ✅ Self-corrected OR ⚠️  Skipped
```

**What to Look For:**

- ✅ Orange "Self-correcting (attempt 2)" badge appears
- ✅ Console shows self-correction messages
- ✅ AI suggests alternative strategy
- ✅ Different action attempted (not same retry)

---

### Test 2: Missing Configuration File (Realistic Scenario)

**Goal:** Test with real missing config file

**Steps:**

1. Open Agent Mode
2. Enter task: "Read tsconfig.json from this project"
3. Click "Plan Task"
4. Click "Execute Task"

**Expected Behavior:**

```
Step 1: Read tsconfig.json
├─ Attempt 1: Read from /root/tsconfig.json → ❌ File not found
├─ 🤔 Self-Correction: AI analyzes error
├─ 💡 Alternative: Search project for tsconfig.json
├─ Attempt 2: Search workspace → Finds at /src/tsconfig.json or similar
├─ Attempt 3: Read found file → ✅ Success!
└─ Result: ✅ Completed with self-correction
```

**What to Look For:**

- ✅ Multiple attempts with DIFFERENT actions
- ✅ AI explanation in console logs
- ✅ Confidence score displayed
- ✅ Final success despite initial failure

---

### Test 3: Multiple Failures (Stress Test)

**Goal:** Verify agent doesn't give up after one alternative fails

**Steps:**

1. Open Agent Mode
2. Enter task: "Read these files: /fake1.txt, /fake2.txt, /fake3.txt"
3. Click "Plan Task"
4. Click "Execute Task"

**Expected Behavior:**

```
For each file:
├─ Attempt 1: Read file → ❌ File not found
├─ 🤔 Self-Correction: Generate alternative
├─ Attempt 2: Try alternative → May succeed or fail
├─ Attempt 3: Try another alternative if needed
└─ Result: ✅ Completed, ⚠️  Skipped, or ❌ Failed

Overall Task:
├─ Progress: "X completed, Y skipped / Z total"
├─ Some steps self-corrected successfully
└─ Task completes (even if some steps skipped)
```

**What to Look For:**

- ✅ Self-correction works on multiple steps
- ✅ Progress counter accurate
- ✅ Task doesn't crash or hang
- ✅ Clear visual feedback for each step

---

## Console Logs to Monitor

### Successful Self-Correction

```javascript
[ExecutionEngine] ❌ Step X failed (attempt 1/3): File not found
[ExecutionEngine] 🔄 Attempting self-correction...
[ExecutionEngine] 🤔 Self-Correction: Analyzing failure for "Read test.txt"
[ExecutionEngine] Error: File not found: /nonexistent/test.txt
[ExecutionEngine] Original action: read_file
[ExecutionEngine] ✨ Alternative Strategy: Search workspace for file
[ExecutionEngine] Confidence: 85%
[ExecutionEngine] ✅ Using alternative: search_files
[AgentModeV2] Step started: 1 Read test.txt
[AgentModeV2] Step completed: 1 Read test.txt Status: completed
```

### Failed Self-Correction (Fallback to Retry)

```javascript
[ExecutionEngine] ❌ Step X failed (attempt 1/3): Network timeout
[ExecutionEngine] 🔄 Attempting self-correction...
[ExecutionEngine] ⚠️  AI did not return valid JSON strategy
[ExecutionEngine] ⚠️  No alternative found, retrying original action...
[ExecutionEngine] Waiting 1000ms before retry...
```

---

## UI Verification Checklist

### Before Test

- [ ] Agent Mode opens without errors
- [ ] Task input field accepts text
- [ ] "Plan Task" button works
- [ ] Steps display correctly

### During Test

- [ ] Steps show "in_progress" (purple) while executing
- [ ] Failed steps show orange "Self-correcting (attempt X)" badge
- [ ] Console logs self-correction process
- [ ] Progress counter updates correctly

### After Test

- [ ] Completed steps show green checkmark
- [ ] Skipped steps show orange warning triangle
- [ ] Progress shows "X completed, Y skipped / Z total"
- [ ] "New Task" button appears
- [ ] Status badge shows "Completed"

---

## Known Issues & Expected Behavior

### ✅ NORMAL

- First attempt fails → Expected! That's what we're testing
- Self-correction takes 1-2 seconds → AI call overhead, normal
- Some alternatives also fail → Normal, may need 2-3 attempts
- Steps eventually skipped → Normal if no solution found

### ❌ PROBLEMS (Report These)

- No "Self-correcting" badge appears
- Same action retried 3 times (not different strategies)
- Console shows no self-correction messages
- App crashes or freezes
- Task never completes (infinite loop)

---

## Troubleshooting

### Problem: No self-correction happening

**Cause:** Step might be succeeding on first try
**Solution:** Use definitely-missing files like `/totally/fake/path.txt`

### Problem: Console logs missing

**Cause:** Console might be filtered
**Solution:** Clear filters, ensure "All Levels" selected

### Problem: AI not generating alternatives

**Cause:** DeepSeek API might be down or quota exceeded
**Solution:** Check API key, check DeepSeek status

### Problem: TypeScript errors in console

**Cause:** Phase 2 fixes might not be compiled
**Solution:** Restart dev server (`pnpm dev`)

---

## Test Results Template

Copy this and fill it out after testing:

```
## Phase 2 Test Results

**Date:** [Date]
**Tester:** [Your name]

### Test 1: File Not Found
- [ ] Self-correction triggered
- [ ] UI badge appeared
- [ ] Console logs correct
- [ ] Alternative attempted
- **Result:** ✅ Pass / ❌ Fail
- **Notes:** [Any observations]

### Test 2: Missing Config File
- [ ] Multiple alternatives tried
- [ ] Eventually succeeded or skipped gracefully
- [ ] Confidence score displayed
- **Result:** ✅ Pass / ❌ Fail
- **Notes:** [Any observations]

### Test 3: Multiple Failures
- [ ] Worked on multiple steps
- [ ] Progress counter accurate
- [ ] No crashes or hangs
- **Result:** ✅ Pass / ❌ Fail
- **Notes:** [Any observations]

### Overall Assessment:
- **Phase 2 Working:** ✅ Yes / ⚠️  Partially / ❌ No
- **Ready for Phase 3:** ✅ Yes / ❌ No
- **Issues Found:** [List any problems]
- **Next Steps:** [What to do next]
```

---

## After Testing

### If Tests Pass ✅

1. Mark Phase 2 as "TESTED" in roadmap
2. Continue to Phase 3 (Metacognitive Layer)
3. Save test results for documentation

### If Tests Fail ❌

1. Document specific failures
2. Check console for error messages
3. Verify TypeScript compilation
4. Re-run `pnpm dev` to ensure latest code
5. Report issues before proceeding to Phase 3

---

**Ready to test?** Start with Test 1 (simplest scenario) and work your way up!
