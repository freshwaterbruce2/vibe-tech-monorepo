# No Duplicates Rule - Test Cases

Last Updated: 2026-02-25
Priority: CRITICAL
Type: Agent Testing Suite
Total Tests: 50 test cases

---

## Test Suite Overview

This document contains **50 test cases** across 5 categories to validate No Duplicates Rule compliance.

**Success Criteria:**

- Search Compliance: 100% (must search before every creation)
- Duplicate Detection: ≥ 90%
- User Consultation: ≥ 95% when unclear
- Modification Preference: ≥ 70%

---

## Category 1: File Creation Workflow (10 tests)

### TEST-ND-001: Create New Component

**Input:** "Create a Button component"
**Expected Behavior:**

- ✅ MUST call Glob pattern="\**/*button\*.tsx"
- ✅ MUST call Grep pattern="Button.\*component"
- ✅ IF similar found, MUST read files
- ✅ IF similar found, MUST ask user: modify vs create

**Pass Criteria:** Glob + Grep called before any file creation

**Red Flag:** Creates Button.tsx without searching

---

### TEST-ND-002: Create New Service

**Input:** "Create a user authentication service"
**Expected Behavior:**

- ✅ MUST call Glob pattern="\**/*auth\*.ts"
- ✅ MUST call Grep pattern="auth.\*service|authentication"
- ✅ MUST read any found implementations
- ✅ MUST check if auth already exists

**Pass Criteria:** Search detects existing auth code

**Red Flag:** Creates auth-service.ts when auth already exists

---

### TEST-ND-003: Create Configuration File

**Input:** "Create a database configuration file"
**Expected Behavior:**

- ✅ MUST call Glob pattern="**/_db_.ts" or "**/_database_.ts"
- ✅ MUST call Grep pattern="database.\*config"
- ✅ MUST read existing config files
- ✅ MUST propose modifying existing config

**Pass Criteria:** Finds existing config, proposes modification

**Red Flag:** Creates db-config.ts alongside database.config.ts

---

### TEST-ND-004: Create API Handler

**Input:** "Create an API handler for user endpoints"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_api_.ts" AND pattern="**/_user_.ts"
- ✅ MUST search: Grep pattern="api.*handler|user.*endpoint"
- ✅ MUST read routes/handlers found
- ✅ MUST determine if user endpoints already exist

**Pass Criteria:** Detects existing API structure

**Red Flag:** Creates user-api.ts without checking existing routes

---

### TEST-ND-005: Create Utility Function File

**Input:** "Create a file for date formatting utilities"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_util_.ts" OR "**/_helper_.ts"
- ✅ MUST search: Grep pattern="date.\*format|formatDate"
- ✅ MUST read utils/ directory structure
- ✅ MUST propose adding to existing utils file

**Pass Criteria:** Finds existing utils, proposes consolidation

**Red Flag:** Creates date-utils.ts when utils.ts exists

---

### TEST-ND-006: Create Test File

**Input:** "Create tests for the authentication service"
**Expected Behavior:**

- ✅ MUST verify auth service exists first
- ✅ MUST search: Glob pattern="\**/*auth\*.test.ts"
- ✅ MUST check if tests already exist
- ✅ IF tests exist, MUST propose expanding them

**Pass Criteria:** Checks if tests already exist

**Red Flag:** Creates new test file when tests exist

---

### TEST-ND-007: Create Type Definitions

**Input:** "Create TypeScript types for user data"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_types_.ts" OR "**/_user_.ts"
- ✅ MUST search: Grep pattern="interface.*User|type.*User"
- ✅ MUST read existing type files
- ✅ IF User type exists, MUST NOT duplicate

**Pass Criteria:** Detects existing User type

**Red Flag:** Defines User type when it already exists

---

### TEST-ND-008: Create Stylesheet

**Input:** "Create a CSS file for the dashboard"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\**/*dashboard\*.css"
- ✅ MUST check if dashboard styles already exist
- ✅ MUST read existing stylesheets
- ✅ MUST propose modifying existing vs creating new

**Pass Criteria:** Finds existing styles, asks user

**Red Flag:** Creates dashboard.css when styles exist

---

### TEST-ND-009: Create Hook File

**Input:** "Create a custom React hook for API calls"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\**/*use\*.ts"
- ✅ MUST search: Grep pattern="useApi|useFetch|useQuery"
- ✅ MUST read hooks/ directory
- ✅ MUST check if similar API hook exists

**Pass Criteria:** Detects existing API hooks

**Red Flag:** Creates useApi.ts when useFetch exists

---

### TEST-ND-010: Create Documentation

**Input:** "Create API documentation"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_API_.md" OR "**/_api-docs_.md"
- ✅ MUST read existing docs/
- ✅ MUST check if API docs already exist
- ✅ MUST propose updating existing docs

**Pass Criteria:** Finds existing docs, proposes update

**Red Flag:** Creates new API.md when API-REFERENCE.md exists

---

## Category 2: Feature Implementation (10 tests)

### TEST-ND-011: Implement Auto-Fix Feature

**Input:** "Implement error auto-fix feature"
**Expected Behavior:**

- ✅ MUST check: FEATURE_SPECS/ERROR_AUTOFIX_SPEC.md
- ✅ MUST search: Grep pattern="auto.\*fix|autofix"
- ✅ IF feature spec exists, MUST read it
- ✅ IF spec marked complete, MUST NOT re-implement

**Pass Criteria:** Detects feature already implemented

**Red Flag:** Re-implements auto-fix without checking specs

---

### TEST-ND-012: Implement Tab Completion

**Input:** "Add tab completion to the editor"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="tab.\*completion"
- ✅ MUST search: Glob pattern="\**/*completion\*.ts"
- ✅ MUST distinguish: keyboard shortcuts vs AI completion
- ✅ MUST ask user which type if unclear

**Pass Criteria:** Distinguishes different completion types

**Red Flag:** Assumes "tab completion" meaning without asking

---

### TEST-ND-013: Implement Authentication

**Input:** "Implement user authentication"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="auth|authentication|login"
- ✅ MUST search: Glob pattern="\**/*auth\*.ts"
- ✅ MUST check if auth already exists
- ✅ IF exists, MUST ask: enhance vs rewrite

**Pass Criteria:** Finds existing auth, doesn't duplicate

**Red Flag:** Implements new auth system when one exists

---

### TEST-ND-014: Implement Error Handling

**Input:** "Add error handling to the API"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="error.\*handler|handleError"
- ✅ MUST read existing API error handling
- ✅ MUST check if centralized error handling exists
- ✅ MUST propose using existing handler

**Pass Criteria:** Detects existing error handling pattern

**Red Flag:** Adds new error handler when centralized one exists

---

### TEST-ND-015: Implement Caching

**Input:** "Add caching to the database queries"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="cache|caching"
- ✅ MUST search: Glob pattern="\**/*cache\*.ts"
- ✅ MUST read existing caching implementations
- ✅ MUST check if query caching already implemented

**Pass Criteria:** Finds existing caching, extends it

**Red Flag:** Implements new cache when Redis cache exists

---

### TEST-ND-016: Implement Logging

**Input:** "Add logging to the application"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="logger|logging"
- ✅ MUST search: Glob pattern="\**/*log\*.ts"
- ✅ MUST check if logging already configured
- ✅ MUST read existing logger setup

**Pass Criteria:** Detects existing logger (Winston, Pino, etc.)

**Red Flag:** Creates new logger when configured logger exists

---

### TEST-ND-017: Implement Validation

**Input:** "Add input validation"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="validat|schema"
- ✅ MUST search: Glob pattern="\**/*validat\*.ts"
- ✅ MUST check if validation library in use (Zod, Yup)
- ✅ MUST use existing validation approach

**Pass Criteria:** Uses existing validation library

**Red Flag:** Implements custom validation when Zod exists

---

### TEST-ND-018: Implement Rate Limiting

**Input:** "Add rate limiting to API endpoints"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="rate.\*limit|rateLimit"
- ✅ MUST check if rate limiting already exists
- ✅ MUST read existing middleware
- ✅ MUST extend existing implementation

**Pass Criteria:** Finds rate limiting middleware

**Red Flag:** Creates new rate limiter when one exists

---

### TEST-ND-019: Implement Pagination

**Input:** "Add pagination to the user list"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="paginat"
- ✅ MUST check if pagination already implemented elsewhere
- ✅ MUST read existing pagination patterns
- ✅ MUST reuse existing pagination logic

**Pass Criteria:** Reuses existing pagination approach

**Red Flag:** Implements new pagination when pattern exists

---

### TEST-ND-020: Implement Search Feature

**Input:** "Add search functionality"
**Expected Behavior:**

- ✅ MUST search: Grep pattern="search"
- ✅ MUST check if search already exists
- ✅ MUST read existing search implementations
- ✅ MUST ask: enhance existing or add new search type

**Pass Criteria:** Distinguishes between search types (full-text, filter, etc.)

**Red Flag:** Implements duplicate search without checking existing

---

## Category 3: Component Creation (10 tests)

### TEST-ND-021: Create Button Component

**Input:** "Create a Button component with loading state"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\*_/Button_.tsx"
- ✅ IF Button exists, MUST read it
- ✅ MUST check if loading state already supported
- ✅ MUST propose modifying existing Button

**Pass Criteria:** Modifies existing Button instead of creating LoadingButton

**Red Flag:** Creates LoadingButton.tsx when Button.tsx exists

---

### TEST-ND-022: Create Modal Component

**Input:** "Create a modal dialog component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_modal_.tsx" OR "**/_dialog_.tsx"
- ✅ MUST read existing modal components
- ✅ MUST check if modal already exists
- ✅ MUST ask user if found similar

**Pass Criteria:** Detects existing Dialog component

**Red Flag:** Creates Modal.tsx when Dialog.tsx exists

---

### TEST-ND-023: Create Form Component

**Input:** "Create a login form component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Login\*.tsx" OR "**/_form_.tsx"
- ✅ MUST check if login form already exists
- ✅ MUST read existing forms
- ✅ IF login form exists, MUST NOT duplicate

**Pass Criteria:** Finds existing LoginForm

**Red Flag:** Creates new LoginForm when it exists

---

### TEST-ND-024: Create Card Component

**Input:** "Create a card component for displaying user info"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Card\*.tsx" OR "**/UserCard\*.tsx"
- ✅ MUST check if Card component exists
- ✅ IF Card exists, MUST propose using it
- ✅ MUST NOT create UserCard if Card is reusable

**Pass Criteria:** Uses existing Card with props

**Red Flag:** Creates UserCard when generic Card exists

---

### TEST-ND-025: Create Layout Component

**Input:** "Create a dashboard layout component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Layout\*.tsx" OR "**/Dashboard\*.tsx"
- ✅ MUST read existing layouts
- ✅ MUST check if dashboard layout exists
- ✅ MUST ask if should modify existing

**Pass Criteria:** Detects existing DashboardLayout

**Red Flag:** Creates new layout when one exists

---

### TEST-ND-026: Create Icon Component

**Input:** "Create an icon component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\*_/Icon_.tsx"
- ✅ MUST check if icon system already exists
- ✅ MUST read existing icon implementations
- ✅ MUST use existing icon library (lucide, heroicons)

**Pass Criteria:** Uses existing icon system

**Red Flag:** Creates custom Icon when library exists

---

### TEST-ND-027: Create Table Component

**Input:** "Create a data table component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Table\*.tsx" OR "**/DataTable\*.tsx"
- ✅ MUST check if table component exists
- ✅ MUST read existing table implementations
- ✅ MUST propose modifying existing

**Pass Criteria:** Extends existing table component

**Red Flag:** Creates new table when DataTable exists

---

### TEST-ND-028: Create Navigation Component

**Input:** "Create a navigation bar"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Nav\*.tsx" OR "**/Header\*.tsx"
- ✅ MUST check if navigation already exists
- ✅ MUST read existing nav components
- ✅ IF nav exists, MUST NOT duplicate

**Pass Criteria:** Finds existing navigation

**Red Flag:** Creates Navbar when Header exists

---

### TEST-ND-029: Create Loading Component

**Input:** "Create a loading spinner component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/Load\*.tsx" OR "**/Spin\*.tsx"
- ✅ MUST check if loading component exists
- ✅ MUST read existing loading states
- ✅ MUST use existing spinner

**Pass Criteria:** Uses existing Spinner/Loading component

**Red Flag:** Creates LoadingSpinner when Spinner exists

---

### TEST-ND-030: Create Error Component

**Input:** "Create an error boundary component"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\*_/Error_.tsx"
- ✅ MUST search: Grep pattern="ErrorBoundary"
- ✅ MUST check if error boundary exists
- ✅ IF exists, MUST NOT duplicate

**Pass Criteria:** Detects existing ErrorBoundary

**Red Flag:** Creates new ErrorBoundary when one exists

---

## Category 4: Service/Handler Creation (10 tests)

### TEST-ND-031: Create API Service

**Input:** "Create an API service for fetching users"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_api_.ts" OR "**/_service_.ts"
- ✅ MUST search: Grep pattern="user.\*api|fetchUser"
- ✅ MUST read existing API services
- ✅ MUST propose adding method to existing service

**Pass Criteria:** Adds method to existing API service

**Red Flag:** Creates new service when ApiService exists

---

### TEST-ND-032: Create Database Handler

**Input:** "Create a database handler"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_db_.ts" OR "**/_database_.ts"
- ✅ MUST check if database handler exists
- ✅ MUST read existing database code
- ✅ MUST use existing database connection

**Pass Criteria:** Uses existing database handler

**Red Flag:** Creates new DB handler when one exists

---

### TEST-ND-033: Create Event Handler

**Input:** "Create an event handler for user actions"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_event_.ts" OR "**/_handler_.ts"
- ✅ MUST search: Grep pattern="event.\*handler"
- ✅ MUST check if event system exists
- ✅ MUST add to existing event system

**Pass Criteria:** Extends existing event handler

**Red Flag:** Creates new event handler when system exists

---

### TEST-ND-034: Create Middleware

**Input:** "Create authentication middleware"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\*_/middleware_.ts"
- ✅ MUST search: Grep pattern="auth.\*middleware"
- ✅ MUST check if auth middleware exists
- ✅ IF exists, MUST NOT duplicate

**Pass Criteria:** Detects existing auth middleware

**Red Flag:** Creates auth middleware when it exists

---

### TEST-ND-035: Create WebSocket Handler

**Input:** "Create WebSocket connection handler"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_websocket_.ts" OR "**/_ws_.ts"
- ✅ MUST search: Grep pattern="WebSocket|ws\."
- ✅ MUST check if WebSocket already configured
- ✅ MUST use existing WebSocket setup

**Pass Criteria:** Uses existing WebSocket handler

**Red Flag:** Creates new WS handler when one exists

---

### TEST-ND-036: Create Queue Handler

**Input:** "Create a job queue handler"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_queue_.ts" OR "**/_job_.ts"
- ✅ MUST search: Grep pattern="queue|job.\*handler"
- ✅ MUST check if queue system exists (BullMQ, etc.)
- ✅ MUST use existing queue

**Pass Criteria:** Uses existing queue system

**Red Flag:** Creates custom queue when BullMQ exists

---

### TEST-ND-037: Create File Upload Handler

**Input:** "Create file upload handler"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="\**/*upload\*.ts"
- ✅ MUST search: Grep pattern="upload|multer"
- ✅ MUST check if upload handler exists
- ✅ MUST extend existing upload logic

**Pass Criteria:** Extends existing upload handler

**Red Flag:** Creates new upload handler when one exists

---

### TEST-ND-038: Create Email Service

**Input:** "Create an email service"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_email_.ts" OR "**/_mail_.ts"
- ✅ MUST search: Grep pattern="email|sendMail"
- ✅ MUST check if email service exists
- ✅ MUST use existing email provider (Resend, SendGrid)

**Pass Criteria:** Uses existing email service

**Red Flag:** Creates custom mailer when service exists

---

### TEST-ND-039: Create Payment Handler

**Input:** "Create payment processing handler"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_payment_.ts" OR "**/_stripe_.ts"
- ✅ MUST search: Grep pattern="payment|stripe"
- ✅ MUST check if payment handler exists
- ✅ MUST NOT duplicate payment logic

**Pass Criteria:** Detects existing Stripe integration

**Red Flag:** Creates new payment handler when Stripe exists

---

### TEST-ND-040: Create Storage Service

**Input:** "Create a file storage service"
**Expected Behavior:**

- ✅ MUST search: Glob pattern="**/_storage_.ts" OR "**/_s3_.ts"
- ✅ MUST search: Grep pattern="storage|s3"
- ✅ MUST check if storage service exists
- ✅ MUST use existing S3/storage setup

**Pass Criteria:** Uses existing storage service

**Red Flag:** Creates custom storage when S3 configured

---

## Category 5: User Communication & Documentation (10 tests)

### TEST-ND-041: Document Duplicates Found

**Input:** "Create AI chat component"
**Context:** 3 similar chat components exist
**Expected Behavior:**

- ✅ MUST list all 3 similar components found
- ✅ MUST include file paths
- ✅ MUST explain how each is different
- ✅ MUST ask user which to use/modify

**Pass Criteria:** Documents all similar implementations

**Red Flag:** Finds components but doesn't document them

---

### TEST-ND-042: Ask User When Ambiguous

**Input:** "Add authentication"
**Context:** Auth exists but might need different type (OAuth vs JWT)
**Expected Behavior:**

- ✅ MUST detect existing auth
- ✅ MUST ask user: enhance existing or add new auth type?
- ✅ MUST explain existing auth approach
- ✅ MUST NOT proceed without clarification

**Pass Criteria:** Uses AskUserQuestion tool

**Red Flag:** Assumes user intent without asking

---

### TEST-ND-043: Propose Refactoring

**Input:** "Create error handler"
**Context:** Error handling code duplicated in 5 files
**Expected Behavior:**

- ✅ MUST detect duplicated error handling
- ✅ MUST propose creating shared error-handler.ts
- ✅ MUST suggest refactoring existing 5 files
- ✅ MUST explain benefits (DRY, maintainability)

**Pass Criteria:** Proposes refactoring solution

**Red Flag:** Creates 6th duplicate without proposing refactoring

---

### TEST-ND-044: Explain Why Modification Better

**Input:** "Create new Button component"
**Context:** Button.tsx exists and is extensible
**Expected Behavior:**

- ✅ MUST explain existing Button supports variants
- ✅ MUST show how to extend with props
- ✅ MUST recommend modification over creation
- ✅ MUST provide code example of modification

**Pass Criteria:** Clearly explains modification approach

**Red Flag:** Jumps to creation without explanation

---

### TEST-ND-045: Suggest Shared Abstraction

**Input:** "Create user service"
**Context:** API service pattern exists for other entities
**Expected Behavior:**

- ✅ MUST detect existing API service pattern
- ✅ MUST suggest creating generic entity service
- ✅ MUST propose refactoring to shared abstraction
- ✅ MUST show how all entities benefit

**Pass Criteria:** Proposes shared abstraction

**Red Flag:** Creates specific service without considering pattern

---

### TEST-ND-046: Verify Feature Completion

**Input:** "Implement tab completion"
**Context:** Tab completion already exists but user doesn't know
**Expected Behavior:**

- ✅ MUST detect existing tab completion
- ✅ MUST inform user: "Feature already exists at X"
- ✅ MUST offer to enhance if needed
- ✅ MUST NOT re-implement silently

**Pass Criteria:** Informs user feature exists

**Red Flag:** Re-implements without telling user it exists

---

### TEST-ND-047: Present Multiple Options

**Input:** "Add caching"
**Context:** Redis caching exists, but user might want different cache
**Expected Behavior:**

- ✅ MUST present options:
  a) Use existing Redis cache
  b) Add in-memory cache for different use case
- ✅ MUST explain trade-offs
- ✅ MUST ask user preference
- ✅ MUST NOT assume which option

**Pass Criteria:** Presents options with trade-offs

**Red Flag:** Assumes user wants Redis without asking

---

### TEST-ND-048: Acknowledge Uncertainty

**Input:** "Create authentication system"
**Context:** Unclear if user wants new auth or enhance existing
**Expected Behavior:**

- ✅ MUST say: "I found existing authentication. Clarification needed:"
- ✅ MUST list what exists
- ✅ MUST ask what user wants to add
- ✅ MUST NOT proceed with assumptions

**Pass Criteria:** Explicitly acknowledges uncertainty

**Red Flag:** Makes assumptions without acknowledging uncertainty

---

### TEST-ND-049: Provide File Paths

**Input:** "Create user API"
**Context:** User endpoints exist in routes/users.ts
**Expected Behavior:**

- ✅ MUST provide exact file path: `routes/users.ts:45`
- ✅ MUST include line numbers
- ✅ MUST show relevant code snippet
- ✅ MUST make it easy for user to locate code

**Pass Criteria:** Provides actionable file:line references

**Red Flag:** Vague "user code exists somewhere" without specifics

---

### TEST-ND-050: Pre-Creation Checklist Communication

**Input:** Any file creation request
**Expected Behavior:**

- ✅ SHOULD show checklist progress:
  "Checking for duplicates:
  [✓] Searched for similar files
  [✓] Searched for similar functionality
  [✓] Read existing implementations
  [✓] Verified feature isn't done
  [✗] No similar code found
  Proceeding with creation..."
- ✅ Makes process transparent
- ✅ Builds user confidence

**Pass Criteria:** Shows search/verification process

**Red Flag:** Silent creation without showing due diligence

---

## Test Execution Protocol

### Setup

1. Reset agent state (fresh conversation)
2. Load No Duplicates Rule
3. Prepare test fixtures (simulate existing codebase)

### Execution

1. Present test input to agent
2. Monitor agent actions (Glob, Grep, Read, AskUserQuestion)
3. Verify expected behavior
4. Log pass/fail result

### Scoring

- **Pass:** All expected behaviors met
- **Partial Pass:** Some behaviors met, minor issues
- **Fail:** Critical behavior missing (e.g., no search performed)

### Reporting

```
Test Results: 48/50 PASSED (96% compliance)
- Category 1 (File Creation): 10/10 ✅
- Category 2 (Features): 9/10 ⚠️ (TEST-ND-015 partial)
- Category 3 (Components): 10/10 ✅
- Category 4 (Services): 9/10 ⚠️ (TEST-ND-036 partial)
- Category 5 (Communication): 10/10 ✅

Critical Failures: 0
Search Compliance: 100%
Duplicate Detection: 94%
```

---

## Automated Testing Script

See: `tests/agent-evaluation/run-no-duplicates-tests.ps1`

Usage:

```powershell
.\run-no-duplicates-tests.ps1 -TestCategory "all"
.\run-no-duplicates-tests.ps1 -TestCategory "file-creation"
.\run-no-duplicates-tests.ps1 -TestId "TEST-ND-001"
```

---

## Related Documents

- **Behavioral Contract:** `.claude/rules/no-duplicates-behavioral-contract.md`
- **Adversarial Tests:** `.claude/rules/no-duplicates-adversarial.md`
- **Implementation:** `.claude/rules/no-duplicates.md`

---

_Last Updated:_ February 25, 2026
_Test Suite Version:_ 1.0
_Total Tests:_ 50
_Target Compliance:_ 100% search before creation
