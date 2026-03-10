# Agent Mode Self-Correction with Alternative Strategies

**Date:** 2025-10-19
**Phase:** 2 of 6 (Agent Mode 2025 Enhancement)
**Innovation:** AI-powered error analysis and alternative strategy generation
**Status:** ✅ Implemented

## Problem: Blind Retries

**Before (Dumb Retries):**

```
Step fails → Retry same action → Fails again → Retry same action → Fails again → Give up
```

**Result:** Wastes time, no learning, predictable failures

**Example:**

```
Step: Read tsconfig.json
Attempt 1: Read from /root/tsconfig.json → File not found
Attempt 2: Read from /root/tsconfig.json → File not found (why retry same thing?!)
Attempt 3: Read from /root/tsconfig.json → File not found (still same!)
Result: ❌ Failed after 3 retries
```

## Solution: Intelligent Self-Correction

**After (Smart Alternatives):**

```
Step fails → Analyze error → Ask AI for alternative → Try different strategy → Success!
```

**Result:** Learns from failures, tries different approaches, higher success rate

**Example:**

```
Step: Read tsconfig.json
Attempt 1: Read from /root/tsconfig.json → File not found
🤔 Self-Correction: "File not found, what should I try differently?"
💡 AI Suggestion: "Search project for tsconfig.json"
Attempt 2: Search workspace for tsconfig → Found in /src/tsconfig.json
✅ Success!
```

## How It Works

### 1. Error Detection (Line 393-397)

When a step fails, capture the error:

```typescript
catch (error) {
  step.retryCount++;
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[ExecutionEngine] ❌ Step ${step.order} failed (attempt ${step.retryCount}/${step.maxRetries}):`, errorMessage);
```

### 2. Self-Correction Analysis (Lines 273-349)

Ask AI to analyze the failure and suggest alternative:

```typescript
private async generateAlternativeStrategy(
  step: AgentStep,
  error: Error,
  attemptNumber: number
): Promise<{ action: ActionType; params: any } | null> {
  const prompt = `I'm an AI coding agent that just failed a task step. Help me find an alternative approach.

**Failed Step:**
- Title: ${step.title}
- Description: ${step.description}
- Original Action: ${step.action.type}
- Original Params: ${JSON.stringify(step.action.params)}
- Error: ${error.message}
- Attempt: ${attemptNumber} of ${step.maxRetries}

**Context:**
- User Request: ${this.currentTaskState.userRequest}
- Workspace: ${this.currentTaskState.workspaceRoot}

**Your Task:**
Analyze why this failed and suggest a DIFFERENT strategy (not just retry same action).

**Common Patterns:**
- File not found → Search project, or create with default template, or skip gracefully
- API timeout → Use cached data, or try simpler request, or ask user
- Parse error → Try different format, or extract partial data, or use fallback
- Permission denied → Try alternative path, or create in temp folder, or skip

**Response Format (JSON only):**
{
  "analysis": "Why did this fail? What's the root cause?",
  "strategy": "What different approach should I try?",
  "action": "read_file | write_file | search_code | generate_code | custom",
  "params": { /* action-specific params */ },
  "confidence": 0.8,
  "fallback": "skip | fail | ask_user"
}

Generate ONE alternative strategy that's DIFFERENT from the original approach.`;
```

### 3. Apply Alternative Strategy (Lines 417-435)

If AI suggests an alternative, use it:

```typescript
// 2025 ENHANCEMENT: Self-Correction - Try different strategy instead of same retry
console.log(`[ExecutionEngine] 🔄 Attempting self-correction...`);
const alternativeStrategy = await this.generateAlternativeStrategy(
  step,
  error as Error,
  step.retryCount
);

if (alternativeStrategy) {
  // Update step action to use alternative strategy
  console.log(`[ExecutionEngine] ✅ Using alternative: ${alternativeStrategy.action}`);
  step.action = alternativeStrategy;
  // Continue loop to try new strategy
} else {
  // No alternative found, use exponential backoff before retry
  console.log(`[ExecutionEngine] ⚠️  No alternative found, retrying original action...`);
  const backoffMs = Math.min(1000 * Math.pow(2, step.retryCount - 1), 10000);
  await this.sleep(backoffMs);
}
```

### 4. UI Feedback (AgentModeV2.tsx Lines 782-787)

Show self-correction in progress:

```typescript
{step.retryCount > 0 && step.status !== 'failed' && (
  <div className="meta-item" style={{ color: '#fb923c' }}>
    <AlertTriangle />
    Self-correcting (attempt {step.retryCount + 1})
  </div>
)}
```

## Alternative Strategy Examples

### Example 1: File Not Found

**Original Action:**

```json
{
  "action": "read_file",
  "params": { "filePath": "/root/tsconfig.json" }
}
```

**AI Analysis:**

- Error: "File not found at /root/tsconfig.json"
- Root Cause: File might be in a subdirectory
- Alternative: Search entire workspace for tsconfig.json

**Alternative Strategy:**

```json
{
  "action": "search_files",
  "params": { "pattern": "tsconfig.json" }
}
```

### Example 2: API Timeout

**Original Action:**

```json
{
  "action": "generate_code",
  "params": { "description": "Generate 1000-line React component" }
}
```

**AI Analysis:**

- Error: "API timeout after 30 seconds"
- Root Cause: Request too large/complex
- Alternative: Break into smaller chunks

**Alternative Strategy:**

```json
{
  "action": "generate_code",
  "params": { "description": "Generate basic React component structure (50 lines)" }
}
```

### Example 3: Parse Error

**Original Action:**

```json
{
  "action": "analyze_code",
  "params": { "filePath": "corrupted.js" }
}
```

**AI Analysis:**

- Error: "SyntaxError: Unexpected token"
- Root Cause: File is corrupted or incomplete
- Alternative: Try partial analysis or skip

**Alternative Strategy:**

```json
{
  "action": "custom",
  "params": {
    "type": "skip_with_context",
    "reason": "File contains syntax errors, skipping analysis"
  }
}
```

## Real-World Scenarios

### Scenario 1: Missing Configuration File

```
User Task: "Review project configuration"

Step 1: Read package.json ✅
Step 2: Read tsconfig.json
  Attempt 1: Read /root/tsconfig.json → ❌ File not found
  🤔 Self-Correction: Analyzing...
  💡 Alternative: Search workspace for tsconfig
  Attempt 2: Search workspace → ✅ Found at /src/tsconfig.json
  Attempt 3: Read /src/tsconfig.json → ✅ Success!

Result: ✅ Step completed with alternative strategy
```

### Scenario 2: API Rate Limit

```
User Task: "Generate comprehensive test suite"

Step 1: Generate unit tests
  Attempt 1: Generate 500 tests → ❌ API rate limit exceeded
  🤔 Self-Correction: Analyzing...
  💡 Alternative: Generate in batches of 50
  Attempt 2: Generate 50 tests → ✅ Success!
  (Agent continues in batches automatically)

Result: ✅ Step completed with batched approach
```

### Scenario 3: Permission Denied

```
User Task: "Create project documentation"

Step 1: Write README.md to /protected/README.md
  Attempt 1: Write to /protected/README.md → ❌ Permission denied
  🤔 Self-Correction: Analyzing...
  💡 Alternative: Write to /docs/README.md instead
  Attempt 2: Write to /docs/README.md → ✅ Success!

Result: ✅ Step completed in alternative location
```

## Benefits

1. **Higher Success Rate**: Tries different approaches instead of repeating failures
2. **Learning Behavior**: Analyzes errors to understand root causes
3. **User Transparency**: Shows "Self-correcting" badge in UI
4. **Adaptive Execution**: Adjusts strategy based on context
5. **Reduced Frustration**: Fewer "stupid" repeated failures

## Console Output Examples

### Successful Self-Correction

```
[ExecutionEngine] ❌ Step 2 failed (attempt 1/3): File not found
[ExecutionEngine] 🔄 Attempting self-correction...
[ExecutionEngine] 🤔 Self-Correction: Analyzing failure for "Read tsconfig.json"
[ExecutionEngine] Error: File not found: /root/tsconfig.json
[ExecutionEngine] Original action: read_file
[ExecutionEngine] ✨ Alternative Strategy: Search workspace for file instead
[ExecutionEngine] Confidence: 85%
[ExecutionEngine] ✅ Using alternative: search_files
[ExecutionEngine] ✅ Step 2 completed successfully with alternative strategy
```

### Failed Self-Correction (falls back to retry)

```
[ExecutionEngine] ❌ Step 3 failed (attempt 1/3): Network timeout
[ExecutionEngine] 🔄 Attempting self-correction...
[ExecutionEngine] ⚠️  AI did not return valid JSON strategy
[ExecutionEngine] ⚠️  No alternative found, retrying original action...
[ExecutionEngine] Waiting 1000ms before retry...
```

## Performance Considerations

- **AI Call Overhead**: Each self-correction makes an AI API call (~1-2 seconds)
- **Token Cost**: ~500-1000 tokens per self-correction
- **Trade-off**: Slightly slower but much higher success rate

**Optimization**: Only use self-correction after first failure (not on initial attempt)

## Future Enhancements (Phase 3-6)

1. **Memory**: Remember successful alternatives, reuse without AI call
2. **Patterns**: Build library of common error → solution mappings
3. **Confidence**: Skip self-correction for low-confidence alternatives
4. **User Feedback**: Ask user to choose between multiple alternatives

## Testing

To test self-correction:

1. **Create failing task:**

   ```
   Task: Read /nonexistent/file.txt
   ```

2. **Watch console for:**

   ```
   ❌ Step failed
   🔄 Attempting self-correction...
   🤔 Self-Correction: Analyzing...
   ✨ Alternative Strategy: ...
   ```

3. **Verify in UI:**
   - Step shows orange "Self-correcting (attempt 2)" badge
   - Step eventually succeeds or fails with clear reason

## Files Modified

- `src/services/ai/ExecutionEngine.ts`
  - Added `generateAlternativeStrategy()` method (lines 273-349)
  - Modified `executeStepWithRetry()` to use self-correction (lines 417-435)

- `src/components/AgentMode/AgentModeV2.tsx`
  - Added "Self-correcting" badge display (lines 782-787)

---

**Testing Checklist:**

- [x] Step failure triggers self-correction
- [x] AI generates alternative strategy
- [x] Alternative strategy is attempted
- [x] UI shows "Self-correcting" badge
- [x] Console logs self-correction process
- [x] Falls back to retry if no alternative found

**Status:** ✅ Complete - Agent now learns from failures!
