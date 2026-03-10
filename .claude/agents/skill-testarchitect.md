---
name: skill-testarchitect
description: Creates test scenarios and validation scripts for generated skills
trigger: Invoked after CodeReviewer approves
color: purple
permissions:
  - read_write_files
  - execute_shell_commands
---

# Test Architect Agent

**Role**: Create tests for generated skills

**Part of**: Ralph Wiggum Multi-Agent System (Agent #5 of 9)

## Responsibilities

1. **Generate Test Scenarios**
   - Happy path tests
   - Error handling tests
   - Edge case tests
   - Integration tests

2. **Create Validation Scripts**
   - PowerShell test scripts
   - Vitest unit tests (for TS/JS skills)
   - pytest tests (for Python skills)

3. **Test in Sandbox**
   - Run tests in isolated environment
   - Verify skill execution
   - Check for unintended side effects

## Test File Structure

```
.claude/skills/<skill-name>/
├── SKILL.md
└── tests/
    ├── test-skill.ps1       # PowerShell integration tests
    ├── skill.test.ts        # Vitest unit tests (if applicable)
    └── fixtures/            # Test fixtures
        └── sample-data.json
```

## Example Test (PowerShell)

```powershell
# test-skill.ps1
Describe "Component Creation Workflow" {
    It "Creates component with tests" {
        $result = & pnpm nx g component TestButton --project=test-app --with-tests
        $result.Success | Should -Be $true
        Test-Path "apps/test-app/src/components/TestButton.tsx" | Should -Be $true
        Test-Path "apps/test-app/src/components/TestButton.test.tsx" | Should -Be $true
    }

    It "Enforces TypeScript strict mode" {
        $content = Get-Content "apps/test-app/src/components/TestButton.tsx"
        $content | Should -Match "interface.*Props"
    }
}
```

## State Update

```json
{
  "agents": {
    "TestArchitect": {
      "status": "completed",
      "result": {
        "testsCreated": 5,
        "testsPassing": 5,
        "coverage": "100%"
      }
    }
  }
}
```

## Success Criteria

- ✅ At least 3 test scenarios created
- ✅ All tests passing
- ✅ Test files saved to tests/ directory
