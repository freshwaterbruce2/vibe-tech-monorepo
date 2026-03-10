# Duplicate Check Workflow (MONOREPO-WIDE)

Last Updated: 2026-01-07
Purpose: Prevent duplicate implementations before creating new features/files
Enforcement: MANDATORY before ANY file/feature creation
Scope: ALL projects (apps, packages, backend)

## ALWAYS CHECK BEFORE CREATING

### Step 1: Search for Existing Implementations (MANDATORY)

Use Serena MCP tools for semantic search:

```typescript
// 1. Search for symbols by name
find_symbol({ name_path_pattern: "FeatureName", substring_matching: true })

// 2. Search for patterns in code
search_for_pattern({ 
  substring_pattern: "keyword|functionality",
  restrict_search_to_code_files: true
})

// 3. Find references to similar features
find_referencing_symbols({ name_path: "ExistingFeature", relative_path: "src/file.ts" })

// 4. Get file overview
get_symbols_overview({ relative_path: "src/components/Feature.tsx", depth: 1 })
```

Alternative with CLI tools:

```bash
# Find similar files by name
pnpm nx show projects --projects=*feature*

# Search for functionality
grep -r "keyword" apps/ packages/ backend/

# Use Glob for file patterns
# pattern: "**/*feature*.ts"
```

### Step 2: Read Implementation Files (REQUIRED)

**BEFORE creating, READ what exists:**

- Use `read_file` tool to understand existing code
- Check imports and dependencies
- Verify if modification is better than creation
- Ask user if unsure

### Step 3: Verify What's Actually Missing (CRITICAL)

**Checklist:**

- [ ] Searched for similar file names (Glob or find_symbol)
- [ ] Searched for similar functionality (search_for_pattern)
- [ ] Read existing implementations completely
- [ ] Checked FEATURE_SPECS/ and project CLAUDE.md
- [ ] Verified feature is truly missing
- [ ] Asked user if 50%+ uncertain

## Common Duplicate Scenarios

### Scenario 1: Feature Already Exists

```
User: "Add error auto-fix"
Search: search_for_pattern({ substring_pattern: "auto.*fix|error.*fix" })
Find: test-autofix.ts exists
Read: Verify implementation
Response: "Auto-fix already exists at test-autofix.ts"
```

### Scenario 2: Partial Implementation

```
User: "Add AI streaming"
Search: find_symbol({ name_path_pattern: "Streaming", substring_matching: true })
Find: StreamingAIService.ts exists
Read: Check if visual feedback missing
Response: "StreamingAIService exists but needs visual feedback"
```

### Scenario 3: Different Feature, Similar Name

```
User: "Add tab completion"
Search: Distinguish tab completion ≠ AI completion
Verify: Both are different features
Response: "Tab completion not found, implementing new feature"
```

## Monorepo-Specific Patterns

### Check Shared Packages First

```typescript
// Before creating utility, check packages/
list_dir({ relative_path: "packages", recursive: false })

// Search in shared packages
search_for_pattern({ 
  substring_pattern: "utility.*function",
  relative_path: "packages"
})
```

### Check Backend Services

```typescript
// Before creating API endpoint
search_for_pattern({
  substring_pattern: "route.*endpoint",
  relative_path: "backend"
})
```

### Use Nx Project Graph

```bash
# Visualize dependencies to avoid duplicates
pnpm nx graph

# Show projects with specific tags
pnpm nx show projects --projects=tag:api

# Find affected projects
pnpm nx affected:apps
```

## Serena MCP Workflow

### 1. Semantic Search

```typescript
// Find symbol by name (substring matching)
find_symbol({
  name_path_pattern: "Feature",
  substring_matching: true,
  relative_path: "apps/my-app"  // Optional: restrict to project
})
```

### 2. Pattern Search

```typescript
// Search for functionality across codebase
search_for_pattern({
  substring_pattern: "implement.*feature",
  restrict_search_to_code_files: true,
  paths_include_glob: "**/*.ts*",
  paths_exclude_glob: "**/node_modules/**"
})
```

### 3. Read and Verify

```typescript
// Read file to understand implementation
read_file({ file_path: "apps/my-app/src/Feature.tsx" })

// Get symbol overview
get_symbols_overview({
  relative_path: "apps/my-app/src/Feature.tsx",
  depth: 1  // Include children
})
```

### 4. Check References

```typescript
// Find all references to a symbol
find_referencing_symbols({
  name_path: "FeatureName",
  relative_path: "apps/my-app/src/Feature.tsx"
})
```

## Pre-Implementation Checklist

Before implementing ANY feature:

1. [ ] Run semantic search: `find_symbol` with substring_matching
2. [ ] Run pattern search: `search_for_pattern` for functionality
3. [ ] Read ANY similar files found completely
4. [ ] Check FEATURE_SPECS/ directory for existing specs
5. [ ] Check shared packages (packages/) for utilities
6. [ ] Check backend services (backend/) for APIs
7. [ ] Use Nx graph to visualize dependencies
8. [ ] Ask user if 50%+ uncertain about duplication

## Example: Correct Workflow

### WRONG Approach

```
User: "Add lazy loading for Monaco"
Assistant: "I'll implement lazy loading"
*Creates duplicate LazyMonaco.tsx*
❌ FAILURE: Wasted time, duplicate code
```

### RIGHT Approach (REQUIRED)

```
User: "Add lazy loading for Monaco"
Assistant: "Let me check if it exists..."

# Search
find_symbol({ 
  name_path_pattern: "LazyMonaco",
  substring_matching: true 
})
→ Found: src/components/Editor/LazyMonaco.tsx

# Read
read_file({ file_path: "src/components/Editor/LazyMonaco.tsx" })
→ Verified: Complete implementation

# Response
"Lazy loading ALREADY implemented in LazyMonaco.tsx!
It's working correctly. No implementation needed."

✅ SUCCESS: Saved hours, avoided duplicate
```

## Enforcement

This workflow is **MANDATORY** for:

- All file creation (ts, tsx, py, rs, md)
- All feature implementation
- All component creation
- All service/handler creation
- All test file creation

**Violation = Duplicate work = User frustration**

## Reference

- Monorepo rule: .claude/rules/no-duplicates.md
- Serena guide: .claude/rules/serena-mcp-guide.md
- Project memory: List with `list_memories` tool

---

*Remember: 5 minutes of searching prevents hours of duplicate work.*
