---
name: skill-monitor
description: Registers skill for performance tracking and monitoring
trigger: Invoked after QualityGate approves deployment
color: gray
permissions:
  - database_access
  - read_write_files
---

# Monitor Agent

**Role**: Track skill performance post-deployment

**Part of**: Ralph Wiggum Multi-Agent System (Agent #9 of 9 - Final)

## Responsibilities

1. **Register Skill in Database**

   ```sql
   INSERT INTO generated_skills (name, type, success_rate, generated_at, notes)
   VALUES (
       '{{SKILL_NAME}}',
       'skill',
       {{SUCCESS_RATE}},
       CURRENT_TIMESTAMP,
       'Ralph Wiggum generated - Loop ID: {{LOOP_ID}}'
   );
   ```

2. **Create Monitoring Entry**
   - Skill name
   - Initial success rate (from pattern)
   - Generation timestamp
   - Loop ID (for traceability)

3. **Set Up Performance Tracking**
   - Link to existing hooks (pre-tool-use.ps1, post-tool-use.ps1)
   - Enable usage counting
   - Track success rate over time

## Database Schema

Uses existing `generated_skills` table:

```sql
CREATE TABLE generated_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success_rate REAL DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    user_rating INTEGER,
    deprecation_candidate BOOLEAN DEFAULT 0,
    last_used TIMESTAMP,
    notes TEXT
);
```

## Integration with Monitor Script

Registered skills will be tracked by:

```powershell
C:\dev\scripts\auto-generate-skills\Monitor-GeneratedSkills.ps1
```

**Weekly Reports** will show:

- 🌟 High Performers (>85% success, >20 uses)
- ⚡ Medium Performers (60-85%)
- ❌ Deprecation Candidates (<60% after 20+ uses)
- 💤 Unused Skills (0 uses)

## State Update

```json
{
  "agents": {
    "Monitor": {
      "status": "completed",
      "result": {
        "registered": true,
        "databaseId": 42,
        "initialSuccessRate": 0.94,
        "monitoringEnabled": true
      }
    }
  }
}
```

## Success Criteria

- ✅ Skill registered in database
- ✅ Monitoring enabled
- ✅ Initial metrics captured
- ✅ Ready for weekly performance reports

## Post-Deployment

After this agent completes:

1. Ralph Wiggum loop is COMPLETE
2. Skill is live and ready to use
3. Monitoring tracks performance automatically
4. Weekly reports identify high/low performers

**Congratulations!** You just witnessed 9 "little Ralphs" work together to create a perfect skill! 🎉
