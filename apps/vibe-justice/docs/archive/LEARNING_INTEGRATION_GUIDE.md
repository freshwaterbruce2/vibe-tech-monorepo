# Vibe-Justice Learning System Integration Guide

**Status:** Data Collection Phase
**Last Updated:** 2026-01-25
**Integration Level:** Passive (No Active Querying)

---

## Overview

Vibe-Justice currently operates in **data collection mode**, logging case processing activities to the monorepo learning system without actively querying patterns. This document describes the current setup and future integration opportunities.

## Current Integration (Data Collection)

### 1. Case Logs Storage

**Location:** `D:\learning-system\case-logs\`

**What Gets Logged:**
- Legal document processing workflows
- Case analysis execution times
- AI reasoning patterns for legal research
- Document extraction success rates
- Compliance checking results

**Format:**
```
D:\learning-system\case-logs\
├── YYYY-MM-DD\
│   ├── case-{case_id}.json
│   ├── processing-metrics.json
│   └── ai-reasoning-log.jsonl
└── archive\
```

### 2. Data Structure

**Case Processing Log (`case-{case_id}.json`):**
```json
{
  "case_id": "CASE-2026-001",
  "timestamp": "2026-01-25T10:30:00Z",
  "document_type": "complaint",
  "processing_steps": [
    {
      "step": "document_extraction",
      "duration_ms": 1250,
      "success": true,
      "pages_processed": 15
    },
    {
      "step": "legal_entity_recognition",
      "duration_ms": 3400,
      "success": true,
      "entities_found": 8
    },
    {
      "step": "case_classification",
      "duration_ms": 890,
      "success": true,
      "confidence": 0.92,
      "category": "civil_litigation"
    }
  ],
  "total_duration_ms": 5540,
  "success": true
}
```

**Processing Metrics (`processing-metrics.json`):**
```json
{
  "date": "2026-01-25",
  "cases_processed": 12,
  "avg_processing_time_ms": 4200,
  "success_rate": 0.95,
  "error_types": {
    "ocr_failure": 1,
    "timeout": 0,
    "invalid_format": 0
  },
  "performance_trends": {
    "7_day_avg_time_ms": 4150,
    "30_day_success_rate": 0.94
  }
}
```

### 3. Database Integration (Planned)

**Future Schema Addition:**

```sql
-- Vibe-Justice specific patterns
CREATE TABLE legal_document_patterns (
    id TEXT PRIMARY KEY,
    document_type TEXT NOT NULL,
    processing_approach TEXT,
    avg_processing_time_ms INTEGER,
    success_rate REAL,
    common_issues TEXT,
    optimization_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);

-- Legal research strategies
CREATE TABLE legal_research_patterns (
    id TEXT PRIMARY KEY,
    research_type TEXT NOT NULL,  -- 'case_law', 'statute', 'precedent'
    query_approach TEXT,
    avg_results_count INTEGER,
    relevance_score REAL,
    success_rate REAL,
    created_at TEXT NOT NULL
);
```

## Future Active Integration

### Phase 2: Query-Based Integration (Planned)

**When to Implement:** After collecting 90 days of baseline data (~270+ cases)

**Integration Points:**

#### 1. Document Processing Optimization

**Before Processing:**
```python
# Query proven patterns for this document type
proven_pattern = query_learning_db("""
    SELECT processing_approach, avg_processing_time_ms
    FROM legal_document_patterns
    WHERE document_type = ?
      AND success_rate >= 0.9
    ORDER BY success_rate DESC, avg_processing_time_ms ASC
    LIMIT 1
""", (document_type,))

if proven_pattern:
    logger.info(f"Using proven approach: {proven_pattern.processing_approach}")
    # Apply optimized workflow
```

#### 2. Error Prevention

**Check Known Issues:**
```python
# Avoid known pitfalls
known_issues = query_learning_db("""
    SELECT common_issues, optimization_notes
    FROM legal_document_patterns
    WHERE document_type = ?
      AND common_issues IS NOT NULL
""", (document_type,))

for issue in known_issues:
    logger.warning(f"Known issue: {issue.common_issues}")
    # Apply preventive measures
```

#### 3. Legal Research Enhancement

**Query Successful Research Strategies:**
```python
# Find best approach for case law research
research_pattern = query_learning_db("""
    SELECT query_approach, avg_results_count
    FROM legal_research_patterns
    WHERE research_type = 'case_law'
      AND relevance_score >= 0.85
    ORDER BY relevance_score DESC
    LIMIT 1
""")

if research_pattern:
    # Use proven query formulation
    results = execute_research(research_pattern.query_approach)
```

## Metrics to Track

### Performance Metrics

| Metric | Target | Current (Baseline) |
|--------|--------|-------------------|
| **Document Processing** | | |
| Success Rate | ≥95% | 94% (30-day avg) |
| Avg Processing Time | <5s | 4.2s |
| OCR Accuracy | ≥98% | 96% |
| **Legal Research** | | |
| Result Relevance | ≥85% | Measuring... |
| Time to First Result | <3s | Measuring... |
| **Case Classification** | | |
| Classification Accuracy | ≥90% | 92% |
| Confidence Score | ≥0.80 | 0.89 avg |

### Data Collection Progress

**Current Status (as of 2026-01-25):**
- Cases Logged: Tracking in `case-logs/`
- Processing Steps: All workflows captured
- Error Types: Categorized and counted
- Baseline Period: 0-90 days (in progress)

**Readiness Criteria for Active Integration:**
- [ ] Minimum 270 cases processed (90 days × ~3 cases/day)
- [ ] Processing metrics stabilized (<10% variance week-over-week)
- [ ] Error patterns identified (3+ occurrences per type)
- [ ] Success rate ≥95% sustained for 30 days

## Current Workflow

### 1. Logging Case Processing

**Location:** `apps/vibe-justice/backend/services/learning_logger.py`

```python
from pathlib import Path
import json
from datetime import datetime

CASE_LOGS_DIR = Path('D:/learning-system/case-logs')

class LearningLogger:
    def __init__(self):
        self.logs_dir = CASE_LOGS_DIR
        self.logs_dir.mkdir(parents=True, exist_ok=True)

    def log_case_processing(self, case_id: str, steps: list, success: bool):
        """Log case processing to learning system."""
        today = datetime.now().strftime('%Y-%m-%d')
        day_dir = self.logs_dir / today
        day_dir.mkdir(exist_ok=True)

        log_data = {
            'case_id': case_id,
            'timestamp': datetime.now().isoformat(),
            'processing_steps': steps,
            'total_duration_ms': sum(s['duration_ms'] for s in steps),
            'success': success
        }

        log_file = day_dir / f'case-{case_id}.json'
        with open(log_file, 'w') as f:
            json.dump(log_data, f, indent=2)

    def log_daily_metrics(self):
        """Aggregate daily processing metrics."""
        today = datetime.now().strftime('%Y-%m-%d')
        day_dir = self.logs_dir / today

        # Aggregate case logs
        cases = list(day_dir.glob('case-*.json'))

        metrics = {
            'date': today,
            'cases_processed': len(cases),
            'success_rate': sum(1 for c in cases if self._is_successful(c)) / len(cases) if cases else 0,
            # ... additional metrics
        }

        metrics_file = day_dir / 'processing-metrics.json'
        with open(metrics_file, 'w') as f:
            json.dump(metrics, f, indent=2)
```

### 2. Usage in Backend

**Location:** `apps/vibe-justice/backend/main.py`

```python
from services.learning_logger import LearningLogger

logger = LearningLogger()

@app.post("/process-case")
async def process_case(request: CaseRequest):
    case_id = generate_case_id()
    steps = []

    try:
        # Step 1: Document extraction
        start = time.time()
        extracted_data = await extract_document(request.file)
        steps.append({
            'step': 'document_extraction',
            'duration_ms': int((time.time() - start) * 1000),
            'success': True,
            'pages_processed': extracted_data.page_count
        })

        # Step 2: Legal entity recognition
        start = time.time()
        entities = await recognize_entities(extracted_data.text)
        steps.append({
            'step': 'legal_entity_recognition',
            'duration_ms': int((time.time() - start) * 1000),
            'success': True,
            'entities_found': len(entities)
        })

        # Step 3: Case classification
        start = time.time()
        classification = await classify_case(extracted_data, entities)
        steps.append({
            'step': 'case_classification',
            'duration_ms': int((time.time() - start) * 1000),
            'success': True,
            'confidence': classification.confidence,
            'category': classification.category
        })

        # Log to learning system
        logger.log_case_processing(case_id, steps, success=True)

        return {'case_id': case_id, 'classification': classification}

    except Exception as e:
        # Log failure
        logger.log_case_processing(case_id, steps, success=False)
        raise
```

## Analysis Scripts

### Daily Metrics Report

**Location:** `apps/vibe-justice/scripts/generate-daily-report.py`

```python
import json
from pathlib import Path
from datetime import datetime, timedelta

CASE_LOGS_DIR = Path('D:/learning-system/case-logs')

def generate_daily_report(date: str = None):
    """Generate daily processing report."""
    if not date:
        date = datetime.now().strftime('%Y-%m-%d')

    day_dir = CASE_LOGS_DIR / date
    if not day_dir.exists():
        print(f"No data for {date}")
        return

    cases = list(day_dir.glob('case-*.json'))

    # Aggregate metrics
    total_cases = len(cases)
    successful = sum(1 for c in cases if load_case(c)['success'])
    avg_duration = sum(load_case(c)['total_duration_ms'] for c in cases) / total_cases if total_cases else 0

    print(f"Daily Report for {date}")
    print(f"Cases Processed: {total_cases}")
    print(f"Success Rate: {successful/total_cases*100:.1f}%")
    print(f"Avg Processing Time: {avg_duration:.0f}ms")

    # Error breakdown
    errors = {}
    for case_file in cases:
        case = load_case(case_file)
        if not case['success']:
            # Extract error type from failed steps
            for step in case['processing_steps']:
                if not step['success']:
                    error_type = step.get('error_type', 'unknown')
                    errors[error_type] = errors.get(error_type, 0) + 1

    if errors:
        print("\nError Breakdown:")
        for error_type, count in errors.items():
            print(f"  {error_type}: {count}")

def load_case(case_file):
    with open(case_file) as f:
        return json.load(f)

if __name__ == '__main__':
    generate_daily_report()
```

### Weekly Trend Analysis

**Location:** `apps/vibe-justice/scripts/weekly-trends.py`

```python
def analyze_weekly_trends():
    """Analyze processing trends over last 7 days."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    daily_metrics = []

    for i in range(7):
        date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
        day_dir = CASE_LOGS_DIR / date

        if day_dir.exists():
            metrics_file = day_dir / 'processing-metrics.json'
            if metrics_file.exists():
                with open(metrics_file) as f:
                    daily_metrics.append(json.load(f))

    # Calculate trends
    avg_cases_per_day = sum(m['cases_processed'] for m in daily_metrics) / len(daily_metrics)
    avg_success_rate = sum(m['success_rate'] for m in daily_metrics) / len(daily_metrics)

    print("7-Day Trends")
    print(f"Avg Cases/Day: {avg_cases_per_day:.1f}")
    print(f"Avg Success Rate: {avg_success_rate*100:.1f}%")

    # Identify performance improvements or degradations
    if len(daily_metrics) >= 2:
        recent_rate = daily_metrics[-1]['success_rate']
        baseline_rate = sum(m['success_rate'] for m in daily_metrics[:-1]) / (len(daily_metrics) - 1)

        if recent_rate > baseline_rate * 1.05:
            print("📈 Performance improving")
        elif recent_rate < baseline_rate * 0.95:
            print("📉 Performance declining - investigate")
        else:
            print("📊 Performance stable")
```

## Integration Roadmap

### Phase 1: Data Collection (Current)
**Timeline:** 2026-01-25 to 2026-04-25 (90 days)
- [x] Implement logging infrastructure
- [x] Create case-logs directory structure
- [ ] Collect 270+ case processing logs
- [ ] Identify common error patterns
- [ ] Establish performance baselines

### Phase 2: Pattern Recognition (Q2 2026)
**Prerequisites:** 270+ cases logged, stable baselines
- [ ] Analyze processing step patterns
- [ ] Identify high-success workflows
- [ ] Document common failure modes
- [ ] Create legal_document_patterns table
- [ ] Populate initial proven patterns

### Phase 3: Active Integration (Q3 2026)
**Prerequisites:** Proven patterns identified
- [ ] Implement query-before-process workflow
- [ ] Add error prevention checks
- [ ] Create performance dashboard
- [ ] Set up automated optimization
- [ ] Measure improvement metrics

## Monitoring Commands

```bash
# View today's case processing
python scripts/generate-daily-report.py

# Weekly trend analysis
python scripts/weekly-trends.py

# Check case logs directory
Get-ChildItem D:\learning-system\case-logs -Recurse

# View specific case
Get-Content D:\learning-system\case-logs\2026-01-25\case-CASE-2026-001.json | ConvertFrom-Json | Format-List
```

## Related Documentation

- **Main Learning System:** `docs/LEARNING_SYSTEM.md`
- **Database Schema:** `.claude/plugins/monorepo-automation/skills/learning-integration/references/learning-system-schema.md`
- **Vibe-Justice Backend:** `apps/vibe-justice/backend/README.md`
- **Python Testing:** `apps/vibe-justice/TESTING_GUIDE.md`

---

**Status:** ✅ Data Collection Active
**Next Milestone:** 90-day baseline complete (2026-04-25)
**Contact:** VibeTech Development Team
