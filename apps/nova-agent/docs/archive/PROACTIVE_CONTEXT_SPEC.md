# Proactive Context Awareness Specification

**Feature:** Intelligent Proactive Recommendations & Next Steps System
**Status:** In Development (2026-01-16)
**Priority:** HIGH - Aligns with 2026 Agentic AI trends

---

## Overview

Enhance Nova Agent's context awareness to **proactively recommend next steps** based on continuous monitoring of project state, user behavior patterns, and predictive intelligence.

This feature addresses the **#1 shift in 2026**: From reactive to proactive AI (40% of enterprise apps will embed AI agents).

---

## 2026 AI Trends Context

Based on research from:

- [Microsoft: What's next in AI (2026)](https://news.microsoft.com/source/features/ai/whats-next-in-ai-7-trends-to-watch-in-2026/)
- [IBM: AI Tech Trends 2026](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026)
- [Deloitte: Agentic AI Strategy](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2026/agentic-ai-strategy.html)
- [Salesmate: AI Agent Trends](https://www.salesmate.io/blog/future-of-ai-agents/)

**Key Trends:**

- **40% of enterprise apps** will use AI agents by end of 2026
- **Shift from reactive to proactive** - AI anticipates needs vs responding to prompts
- **Context-aware assistance** - Deep understanding of user workflows
- **Predictive insights** - Real-time analysis and recommendations
- **Ambient intelligence** - Perceives environment and provides proactive assistance
- **Agentic AI market** projected to grow from $7.8B to $52B by 2030

---

## Current State Analysis

### Existing Infrastructure ✅

**Monitoring Layer:**

- `activity_monitor.rs` (14KB) - 1-second polling of active windows, deep work tracking
- `context_engine.rs` (13KB) - Real-time aggregation of git status, project context, file context
- `focus_state` database - Heartbeat tracking of focus sessions

**Intelligence Layer:**

- `guidance_engine.rs` (18KB) - **PRIMARY RECOMMENDATION SYSTEM**
  - 5 existing rules: GitStatus, TaskProgress, DeepWork, CommitHygiene, ActivityPattern
  - 3 categories: NextSteps, DoingRight, AtRisk
  - 4 priority levels: Low, Medium, High, Critical
- `ml_learning.rs` (4KB) - Machine learning event tracking
- `hallucination_detector.rs` - AI output validation

**Data Layer:**

- `learning_events` database - Pattern recognition with context, outcome, metadata
- `task_tasks` database - Work management with status tracking
- `activities` database - Real-time activity logging
- `code_patterns` - Codebase pattern indexing

**Frontend:**

- `ContextGuide.tsx` - Guidance display UI with priority badges
- `OrchestratorService.ts` - `requestGuidance()` API endpoint

### Gaps to Fill 🔧

1. **Predictive Intelligence** - No ML-driven time estimates or risk predictions
2. **Performance Monitoring** - No build time tracking or optimization suggestions
3. **Security Scanning** - No proactive security issue detection
4. **Dependency Management** - No outdated package alerts
5. **Proactive Notifications** - Guidance only shown when user opens ContextGuide page
6. **Intelligent Scheduling** - No time-of-day or productivity pattern recommendations

---

## Architecture Enhancement

### Backend (Rust + Tauri)

**New Guidance Rules (src-tauri/src/guidance_engine.rs):**

```rust
// 1. Performance Optimization Rule
pub struct PerformanceRule;
impl GuidanceRule for PerformanceRule {
    // Detect: slow builds (>30s), failing tests, long-running scripts
    // Recommend: parallel execution, incremental builds, test optimization
}

// 2. Security Hygiene Rule
pub struct SecurityRule;
impl GuidanceRule for SecurityRule {
    // Detect: hardcoded secrets, unencrypted storage, outdated dependencies
    // Recommend: env vars, encryption, dependency updates
}

// 3. Dependency Health Rule
pub struct DependencyRule;
impl GuidanceRule for DependencyRule {
    // Detect: outdated packages (>6 months old), security vulnerabilities
    // Recommend: `pnpm update`, specific package upgrades
}

// 4. Testing Coverage Rule
pub struct TestingRule;
impl GuidanceRule for TestingRule {
    // Detect: low coverage (<80%), missing test files
    // Recommend: write tests for specific files
}

// 5. Documentation Gap Rule
pub struct DocumentationRule;
impl GuidanceRule for DocumentationRule {
    // Detect: undocumented public functions, missing README sections
    // Recommend: add JSDoc comments, update README
}

// 6. Predictive Intelligence Rule (ML-driven)
pub struct PredictiveRule;
impl GuidanceRule for PredictiveRule {
    // Predict: task completion time, likely blockers, optimal task ordering
    // Recommend: start high-priority tasks early, avoid context switching
}
```

**New Module: prediction_engine.rs**

```rust
// Machine learning-powered predictions
pub struct PredictionEngine {
    learning_db: LearningDatabase,
}

impl PredictionEngine {
    // Predict task completion time based on historical data
    pub async fn predict_task_duration(&self, task: &Task) -> Duration;

    // Analyze productivity patterns (peak hours, optimal task ordering)
    pub async fn get_productivity_insights(&self) -> ProductivityInsights;

    // Assess risk of commit breaking tests
    pub async fn assess_commit_risk(&self, files: &[String]) -> RiskLevel;

    // Recommend optimal time for specific task types
    pub async fn recommend_task_timing(&self, task_type: &str) -> TimeWindow;
}
```

**Enhanced Context Engine:**

```rust
// Add proactive monitoring triggers
pub async fn detect_proactive_opportunities(&self) -> Vec<ProactiveOpportunity> {
    // Monitor logs in D:\logs\ for error patterns
    // Watch build artifacts for test failures
    // Track command execution times
    // Detect long idle periods
    // Monitor memory/CPU usage
}
```

### Frontend (React + TypeScript)

**New Service: predictionService.ts**

```typescript
// ML-powered prediction API
export async function predictTaskDuration(taskId: string): Promise<Duration>;
export async function getProductivityInsights(): Promise<ProductivityInsights>;
export async function getProactiveRecommendations(): Promise<Recommendation[]>;
```

**New Component: ProactiveNotification.tsx**

```tsx
// Toast-style notifications for urgent recommendations
interface ProactiveNotificationProps {
  recommendation: Recommendation;
  priority: 'low' | 'medium' | 'high' | 'critical';
  onDismiss: () => void;
  onAction: (action: string) => void;
}

// Auto-dismiss after 10s for low priority
// Persistent for high/critical until user action
```

**Enhanced ContextGuide.tsx:**

```tsx
// Add proactive recommendations section at top
<ProactiveRecommendationsPanel>
  <h2>🚀 Suggested Next Steps</h2>
  {predictions.map(pred => (
    <PredictiveCard
      prediction={pred}
      estimatedTime={pred.duration}
      confidence={pred.confidence}
      onStart={() => executeRecommendation(pred)}
    />
  ))}
</ProactiveRecommendationsPanel>
```

---

## User Workflow

### Before (Reactive)

1. User opens ContextGuide page manually
2. Reviews static recommendations
3. Decides what to do next

### After (Proactive)

1. **Nova monitors continuously** (1-second polling + event triggers)
2. **Detects opportunities** (slow build, failing test, outdated dependency)
3. **Predicts impact** using ML learning data (e.g., "This will save 2 minutes per build")
4. **Proactively notifies** via toast notification (high/critical priority)
5. **Recommends next steps** with time estimates and confidence levels
6. **User clicks action** → Nova executes automatically

**Example Scenarios:**

**Scenario 1: Performance Optimization**

- Nova detects: Build took 45 seconds (normally 20s)
- Analysis: 3 large dependencies not tree-shaken
- Notification: 🔥 **Critical** - Slow build detected (+25s)
- Recommendation: "Enable tree-shaking for lodash, moment, react-icons (saves ~20s)"
- Action: "Apply optimization" → Nova updates vite.config.ts

**Scenario 2: Predictive Task Scheduling**

- Nova observes: User is most productive 9-11am
- Current time: 8:55am
- Notification: 💡 **Medium** - Optimal productivity window approaching
- Recommendation: "Start high-complexity tasks now (2-hour focus block predicted)"
- Action: "Suggest task" → Nova lists tasks by complexity

**Scenario 3: Security Hygiene**

- Nova scans: New .env.example file detected
- Analysis: API key used directly in code (not from env var)
- Notification: 🛡️ **High** - Security issue detected
- Recommendation: "Move API key to .env (prevents credential leaks)"
- Action: "Fix now" → Nova refactors code + updates .env

---

## Technical Implementation

### 1. Proactive Monitoring (Background Service)

```rust
// Run every 30 seconds (less aggressive than 1-second activity monitor)
pub async fn proactive_scan_loop() {
    loop {
        // Scan logs for errors
        let log_issues = scan_logs_for_patterns("D:\\logs\\nova-agent").await;

        // Check build artifacts
        let build_status = check_build_performance().await;

        // Analyze dependency freshness
        let dep_status = analyze_dependencies().await;

        // Predict upcoming blockers
        let predictions = predict_blockers(&context).await;

        // Generate proactive recommendations
        let recommendations = generate_recommendations(
            log_issues, build_status, dep_status, predictions
        ).await;

        // Notify frontend if high/critical priority
        if recommendations.has_urgent() {
            notify_frontend(recommendations).await;
        }

        tokio::time::sleep(Duration::from_secs(30)).await;
    }
}
```

### 2. ML-Powered Predictions

```rust
// Use learning_events database for pattern analysis
pub async fn predict_task_duration(task: &Task) -> PredictionResult {
    // Query similar tasks from learning_events
    let similar_tasks = db.query("
        SELECT AVG(duration) as avg_duration,
               STDDEV(duration) as std_dev,
               COUNT(*) as sample_size
        FROM learning_events
        WHERE event_type = 'task_completion'
          AND json_extract(context, '$.task_type') = ?
          AND outcome = 'success'
          AND created_at > datetime('now', '-30 days')
    ", [task.task_type]).await?;

    PredictionResult {
        estimated_duration: similar_tasks.avg_duration,
        confidence: calculate_confidence(similar_tasks.sample_size),
        variance: similar_tasks.std_dev,
    }
}
```

### 3. Frontend Integration

```typescript
// Subscribe to proactive recommendations via WebSocket
useEffect(() => {
  const unsubscribe = listen<Recommendation>('proactive-recommendation', (event) => {
    const { recommendation, priority } = event.payload;

    if (priority === 'critical' || priority === 'high') {
      toast({
        title: recommendation.title,
        description: recommendation.description,
        action: (
          <Button onClick={() => executeRecommendation(recommendation)}>
            {recommendation.action_label}
          </Button>
        ),
        duration: priority === 'critical' ? Infinity : 10000,
      });
    }

    // Always add to ContextGuide panel
    addRecommendation(recommendation);
  });

  return () => unsubscribe();
}, []);
```

---

## Storage & Data

**Existing Databases (D:\databases\):**

- `learning.db` - Pattern history for ML predictions
- `tasks.db` - Work management
- `activity.db` - Real-time activity logs
- `focus_state.db` - Deep work sessions

**New Tables:**

```sql
-- Proactive recommendations history
CREATE TABLE proactive_recommendations (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    category TEXT NOT NULL,  -- 'performance', 'security', 'predictive', etc.
    priority TEXT NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    action_label TEXT NOT NULL,
    action_command TEXT NOT NULL,
    confidence REAL,         -- 0.0 to 1.0
    estimated_impact TEXT,   -- e.g., "Saves 20s per build"
    executed INTEGER DEFAULT 0,
    dismissed INTEGER DEFAULT 0,
    metadata TEXT            -- JSON
);

-- Prediction accuracy tracking
CREATE TABLE prediction_accuracy (
    id INTEGER PRIMARY KEY,
    prediction_id INTEGER NOT NULL,
    predicted_value REAL NOT NULL,
    actual_value REAL NOT NULL,
    error_percentage REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (prediction_id) REFERENCES proactive_recommendations(id)
);
```

---

## Performance Considerations

**Monitoring Overhead:**

- Proactive scan: 30-second interval (vs 1-second activity monitor)
- Log parsing: Only scan last 100 lines per file
- Dependency check: Cached for 1 hour
- ML prediction: <50ms query time (indexed database)

**Memory:**

- Recommendation buffer: Max 50 items (FIFO eviction)
- Learning cache: 10MB RAM for hot data

**Storage:**

- Recommendation history: ~1KB per entry, 1000 entries max (~1MB)
- Prediction accuracy: ~100 bytes per entry, unlimited retention

---

## Security & Privacy

**Local-Only Processing:**

- All monitoring data stays on D:\ drive
- No external API calls for predictions (uses local ML)
- Recommendations generated entirely on-device

**Sensitive Data Handling:**

- Scan logs for secrets (env vars, API keys)
- Redact sensitive info before storing in database
- Never include credentials in recommendation text

**Permissions:**

- Read access to D:\logs\ required
- Read access to package.json, Cargo.toml for dependency checks
- No external network access needed

---

## Testing Plan

1. **Unit Tests**
   - Each guidance rule's detection logic
   - ML prediction accuracy (variance <20%)
   - Recommendation prioritization algorithm

2. **Integration Tests**
   - Full workflow: detect → predict → recommend → execute
   - WebSocket notification delivery
   - Database persistence and retrieval

3. **User Acceptance Tests**
   - Recommendation relevance (manual review)
   - Prediction accuracy (track over 30 days)
   - UI responsiveness (notifications don't disrupt workflow)

---

## Success Metrics

**MVP Success:**

- 10+ proactive recommendations per day
- 70%+ recommendation relevance (user accepts or dismisses as helpful)
- <500ms notification delivery latency
- No false positives for security issues

**Production Success:**

- 80%+ user engagement with recommendations
- 50%+ acceptance rate for suggested actions
- Prediction accuracy >75% (time estimates within ±25%)
- User reports "Nova anticipates my needs"

---

## Implementation Phases

### Phase 1: Enhanced Guidance Rules (Week 1)

- Add 6 new guidance rules (Performance, Security, Dependency, Testing, Documentation, Predictive)
- Integrate with existing guidance_engine.rs
- Update ContextGuide.tsx to display new categories

### Phase 2: Prediction Engine (Week 2)

- Implement prediction_engine.rs with ML-powered predictions
- Add new database tables for recommendations and accuracy tracking
- Build predictionService.ts frontend API

### Phase 3: Proactive Notifications (Week 3)

- Create ProactiveNotification.tsx component
- Implement WebSocket event system for real-time delivery
- Add proactive scan background service

### Phase 4: Testing & Refinement (Week 4)

- Write comprehensive test suite
- Collect user feedback
- Tune prediction models based on accuracy tracking
- Document usage patterns

---

## Dependencies Added

**Rust:**

- None (uses existing Tauri, tokio, rusqlite)

**TypeScript:**

- None (uses existing shadcn/ui toast system)

---

## Related Documentation

- [Microsoft: AI Trends 2026](https://news.microsoft.com/source/features/ai/whats-next-in-ai-7-trends-to-watch-in-2026/)
- [IBM: AI Tech Trends](https://www.ibm.com/think/news/ai-tech-trends-predictions-2026)
- [Deloitte: Agentic AI Strategy](https://www.deloitte.com/us/en/insights/topics/technology-management/tech-trends/2026/agentic-ai-strategy.html)
- [Existing: VISION_FEATURE_SPEC.md](./VISION_FEATURE_SPEC.md)
- [Existing: guidance_engine.rs](./src-tauri/src/guidance_engine.rs)

---

**Last Updated:** 2026-01-16
**Owner:** Nova Agent Desktop Team
**Status:** Specification Complete - Ready for Implementation
