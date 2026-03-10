# Tool Description Enhancements for Anti-Hallucination

# To be implemented in: C:\dev\apps\nova-agent\src-tauri\src\modules\

## CRITICAL: All tool descriptions must enforce verification

### Current Problem

Tools don't enforce that NOVA must show proof of execution.
NOVA can claim "✅ File written!" without actually calling write_file().

### Solution

Add verification requirements to EVERY tool description.

## ═══════════════════════════════════════════════════════════════

## Enhanced Tool Descriptions

## ═══════════════════════════════════════════════════════════════

### write_file()

```rust
/// ACTUALLY WRITE a file to disk.
///
/// CRITICAL REQUIREMENTS:
/// 1. This function MUST be called to write files
/// 2. NEVER claim you wrote a file without calling this
/// 3. ALWAYS include the tool result in your response
/// 4. Maximum 25-30 lines per call
///
/// Returns: Confirmation with exact line count
/// Example response format:
///   "✅ Updated C:\dev\file.tsx (245 lines written)"
///
/// FORBIDDEN:
/// - Saying "I'll write..." without calling this function
/// - Claiming "✅ Done!" without tool confirmation
```

### execute_code()

```rust
/// ACTUALLY EXECUTE code on Bruce's machine.
///
/// CRITICAL REQUIREMENTS:
/// 1. Use for local file analysis (NOT execute_python_analysis)
/// 2. Include stdout/stderr in your response
/// 3. Show exit code (0 = success, non-zero = error)
/// 4. For LOCAL file analysis: ALWAYS use this, not analysis tool
///
/// Returns: {stdout, stderr, exit_code}
/// Example response format:
///   "Executed Python analysis:
///    Output: [actual stdout]
///    Exit code: 0"
///
/// FORBIDDEN:
/// - Using execute_python_analysis() for C:\ or D:\ files
/// - Paraphrasing output instead of showing actual output
```

### read_file()

```rust
/// READ actual file contents from disk.
///
/// CRITICAL REQUIREMENTS:
/// 1. Returns REAL file data from Bruce's filesystem
/// 2. Show excerpt of actual content in response
/// 3. Indicate if file was found or not
///
/// Returns: Actual file contents with line info
/// Example response format:
///   "Read C:\dev\project\package.json:
///    {
///      "name": "project-name",
///      ...
///    }"
///
/// FORBIDDEN:
/// - Inventing file contents
/// - Claiming you read a file without calling this
```

### list_directory()

```rust
/// LIST actual directory contents.
///
/// CRITICAL REQUIREMENTS:
/// 1. Returns REAL directory structure
/// 2. Show actual files/folders found
/// 3. If empty, say "No files found"
///
/// Returns: [FILE] and [DIR] prefixed list
/// Example response format:
///   "Directory contents of C:\dev\project\:
///    [DIR] src
///    [FILE] package.json
///    [FILE] tsconfig.json"
///
/// FORBIDDEN:
/// - Making up directory structures
/// - Claiming files exist without checking
```

## ═══════════════════════════════════════════════════════════════

## Implementation Steps

## ═══════════════════════════════════════════════════════════════

### 1. Update Rust Tool Descriptions

File: `C:\dev\apps\nova-agent\src-tauri\src\modules\llm.rs`

Add documentation to #[tauri::command] functions:

```rust
#[tauri::command]
/// ACTUALLY WRITE files to disk.
/// NEVER claim you wrote files without calling this.
/// ALWAYS include line count in response.
pub async fn write_file(
    path: String,
    content: String,
    mode: WriteMode,
) -> Result<String, String> {
    // ... implementation
}
```

### 2. Add Response Validation

Create middleware that checks responses for:

- Checkmarks (✅) without tool confirmations
- Claims like "successfully written" without write_file() call
- Future tense ("I'll write...") without immediate execution

### 3. Tool Call Tracking

Log every tool call with:

- Tool name
- Timestamp
- Parameters
- Result
- Whether result was included in response

Then check if NOVA's response mentions the action without the tool call.

## ═══════════════════════════════════════════════════════════════

## Testing Strategy

## ═══════════════════════════════════════════════════════════════

### Test 1: File Write Verification

Request: "Create C:\dev\test-nova-verification.txt with content 'Test 123'"

Expected: 

- NOVA calls write_file()
- Response includes "Successfully wrote X lines"
- File actually exists on disk

Failure indicators:

- Response says "✅ Created" but no write_file() call
- File doesn't exist on disk
- Line count not mentioned

### Test 2: Local vs Web Search

Request: "Review C:\dev\apps\symptom-tracker"

Expected:

- NOVA calls list_directory()
- NOVA calls read_file()
- NOVA analyzes LOCAL code

Failure indicators:

- NOVA calls web_search()
- Mentions GitHub repositories
- Doesn't show actual local code

### Test 3: Code Execution Proof

Request: "Calculate 2+2 using Python"

Expected:

- NOVA calls execute_code("python", "print(2+2)")
- Response shows "Output: 4"
- Response shows "Exit code: 0"

Failure indicators:

- Response just says "Result is 4" without tool output
- No exit code shown
- Looks calculated, not executed

## ═══════════════════════════════════════════════════════════════

## Rollout Plan

## ═══════════════════════════════════════════════════════════════

Phase 1: Documentation (COMPLETE)

- ✅ 7-layer system prompt written
- ✅ Database settings updated
- ✅ Tool enhancement guidelines created

Phase 2: Backend Integration (TODO)

- [ ] Update Rust tool descriptions
- [ ] Load 7-layer prompt from database
- [ ] Implement response validation middleware
- [ ] Add tool call tracking

Phase 3: Testing (READY)

- [ ] Run 3 verification tests
- [ ] Compare before/after behavior
- [ ] Document improvements

Phase 4: Monitoring (ONGOING)

- [ ] Track hallucination rate
- [ ] Log verification failures
- [ ] Continuous improvement

## ═══════════════════════════════════════════════════════════════

## Expected Improvements

## ═══════════════════════════════════════════════════════════════

Before 7-Layer Prompt:
❌ NOVA claims "✅ Files written!" without calling write_file()
❌ NOVA searches web for local projects
❌ NOVA uses wrong tools for local file analysis
❌ No verification of actions taken

After 7-Layer Prompt:
✅ NOVA calls write_file() THEN confirms with line count
✅ NOVA uses local tools for local files
✅ NOVA shows actual tool output as proof
✅ NOVA admits when it cannot execute something

Estimated hallucination reduction: 80-90%
