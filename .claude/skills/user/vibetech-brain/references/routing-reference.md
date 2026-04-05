# Routing Reference — MCP & Tool Details

Detailed connection info for every MCP and tool available in the VibeTech ecosystem.
Read this file when you need specifics on how to call a particular MCP or when troubleshooting
connection issues.

## Table of Contents

1. File & Code Operations (Desktop Commander, Windows-MCP)
2. Databases (SQLite, SQLite Trading)
3. Memory & Learning (Memory MCP)
4. Communication (Gmail, GCal, Google Drive, Notion)
5. Deployment (Cloudflare)
6. Browser Automation (Claude in Chrome, Kapture)
7. Design (Figma)
8. Audio (ElevenLabs)
9. Research (Context7, NotebookLM)
10. Version Control (Codeberg)

---

## 1. File & Code Operations

### Desktop Commander (dc_*)

Primary interface for reading/writing files and running commands on Bruce's Windows machine.

**Key tools:**
- `dc_read_file` / `dc_write_file` — File I/O with absolute Windows paths
- `dc_run_powershell` — Execute PowerShell commands (preferred over dc_run_cmd)
- `dc_search_content` — Grep across the monorepo
- `dc_search_files` — Find files by name pattern
- `dc_list_directory` — Browse directory contents
- `dc_move_file` / `dc_copy_file` — File operations
- `dc_take_screenshot` — Capture current screen state
- `dc_get_active_window` / `dc_list_windows` — Window management
- `dc_launch_app` / `dc_terminate_app` — Process management

**Common patterns:**
```
# Run quality checks
dc_run_powershell: "cd C:\dev; pnpm run quality --filter @vibetech/nova-agent"

# Search for a function across the monorepo
dc_search_content: { directory: "C:\\dev\\apps", pattern: "useAuthContext", filePattern: "*.tsx" }

# Read a specific file
dc_read_file: { path: "C:\\dev\\apps\\nova-agent\\src\\index.ts" }
```

### Windows-MCP

System-level Windows operations. Use for tasks Desktop Commander can't handle.

**Key tools:**
- `PowerShell` — Run PowerShell scripts (alternative to dc_run_powershell)
- `FileSystem` — File operations
- `Process` — Process management
- `Screenshot` / `Snapshot` — Screen capture
- `Registry` — Windows registry operations
- `Clipboard` — Read/write clipboard
- `Notification` — Show Windows notifications
- `App` — Launch applications

---

## 2. Databases

### SQLite MCP (sqlite)

General-purpose database access for app databases on D:\.

**Tools:** `read_query`, `write_query`, `create_table`, `list_tables`, `describe_table`, `append_insight`

**Rules:**
- All database files live on `D:\databases\`
- Never store .db files in C:\dev
- Use `read_query` for SELECT, `write_query` for INSERT/UPDATE/DELETE/CREATE
- `append_insight` saves analysis notes alongside data

### SQLite Trading MCP (sqlite-trading)

Dedicated connection for trading and crypto databases.

**Tools:** Same as sqlite MCP but pointed at trading databases.

**Use when:** Working with crypto data, trading patterns, portfolio analysis.

---

## 3. Memory & Learning System

### Memory MCP (memory-mcp)

The learning backbone. This is what makes the system get smarter.

**Semantic Memory** (facts, lessons, knowledge):
- `memory_add_semantic` — Store a fact or lesson
- `memory_search_semantic` — Find by meaning/concept
- `memory_search_unified` — Search across all memory types

**Episodic Memory** (events, what happened):
- `memory_add_episodic` — Log an event/outcome
- `memory_search_episodic` — Find past events
- `memory_search_timerange` — Find events in a date range

**Pattern Recognition:**
- `memory_track_pattern` — Record a reusable pattern
- `memory_get_patterns` — Retrieve patterns by category
- `memory_analyze_pattern` — Deep analysis of a pattern

**Learning Agent:**
- `memory_learning_agent_context` — Get context for the learning agent
- `memory_learning_health` — Check system health
- `memory_learning_sync` — Sync learnings to persistent storage

**RAG (Retrieval-Augmented Generation):**
- `memory_rag_search` — Semantic search over indexed content
- `memory_rag_index_status` — Check indexing status
- `memory_rag_trigger_index` — Force re-index

**Task & Git Intelligence:**
- `memory_suggest_task` — Get AI suggestions for current task
- `memory_suggest_git_command` — Git command recommendations
- `memory_track_commit` — Log commit outcomes

**Trading Intelligence:**
- `memory_track_trade` — Log trade outcomes
- `memory_get_trading_patterns` — Trading pattern analysis
- `memory_trading_suggestions` — AI trade recommendations

**Session Management:**
- `memory_set_context` / `memory_get_context` — Session context
- `memory_get_session` / `memory_get_recent` — Session history
- `memory_summarize_session` / `memory_summarize_stats` — Session summaries

**Maintenance:**
- `memory_health` — Overall system health
- `memory_decay_stats` — Memory pruning metrics
- `memory_conflict_check` — Find contradictory memories
- `memory_consolidate` / `memory_consolidate_preview` — Merge similar memories
- `memory_export` — Export all memory data

---

## 4. Communication

### Gmail
- `gmail_search_messages` — Search inbox
- `gmail_read_message` / `gmail_read_thread` — Read email
- `gmail_create_draft` — Draft email (NEVER auto-send)
- `gmail_list_drafts` — See pending drafts
- `gmail_get_profile` — Account info

### Google Calendar
- `gcal_list_events` — See upcoming events
- `gcal_create_event` — Schedule meeting
- `gcal_find_my_free_time` — Check availability
- `gcal_find_meeting_times` — Find mutual availability

### Google Drive
- `google_drive_search` — Search files
- `google_drive_fetch` — Read file contents

### Notion
- `notion-search` — Search across workspace
- `notion-fetch` — Read a page
- `notion-create-pages` — Create new page
- `notion-update-page` — Edit page
- `notion-query-database-view` — Query structured data

---

## 5. Deployment

### Cloudflare
- `workers_list` / `workers_get_worker` — Manage Workers
- `d1_databases_list` / `d1_database_query` — D1 SQL databases
- `kv_namespaces_list` / `kv_namespace_get` — KV storage
- `r2_buckets_list` / `r2_bucket_get` — Object storage
- `search_cloudflare_documentation` — CF docs search

---

## 6. Browser Automation

### Claude in Chrome
Full browser control for testing and automation.
- `navigate`, `read_page`, `get_page_text` — Page interaction
- `click`, `form_input`, `find` — Element interaction
- `screenshot`, `gif_creator` — Visual capture
- `javascript_tool` — Run JS in page context

### Kapture Browser Automation
Alternative browser automation with DOM-level control.
- `navigate`, `click`, `fill`, `screenshot` — Core actions
- `dom`, `elements` — DOM inspection
- `console_logs`, `read_network_requests` — Debugging

---

## 7-10. Other Services

### Figma
- `get_design_context` / `get_screenshot` — Pull design specs
- `get_variable_defs` — Design tokens

### ElevenLabs
- `generate_tts` — Text to speech
- `generate_sound_effect` — Sound effects
- `generate_music` — Music generation

### Context7
- `resolve-library-id` → `get-library-docs` — Look up library documentation

### NotebookLM
- `notebook_create` / `notebook_query` — Research notebooks
- `source_add` / `source_get_content` — Source management
- `research_start` / `research_status` — Run research tasks

### Codeberg
- `codeberg_get_repo_details` — Repo info
- `codeberg_read_file` — Read files from remote
- `codeberg_search_repos` — Search repos
