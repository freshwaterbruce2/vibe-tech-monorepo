---
allowed-tools: Bash(nx graph:*), Bash(open:*), Bash(start:*)
description: Visualize project dependencies and workspace structure
model: sonnet
---

# Nx Project Dependency Graph

Visualize the dependency graph for your Nx monorepo, showing how projects relate to each other and which are affected by changes.

## Step 1: Generate Dependency Graph

Execute this bash command to open the interactive dependency graph:

```bash
nx graph
```

Present with header:

```
════════════════════════════════════════
  NX DEPENDENCY GRAPH
════════════════════════════════════════
```

Report to user:
"Opening interactive dependency graph in your browser..."

## Step 2: Explain Graph Features

Provide overview of graph features:

```
════════════════════════════════════════
  GRAPH FEATURES
════════════════════════════════════════

The Nx dependency graph shows:
✓ All projects in your workspace
✓ Dependencies between projects
✓ Affected projects (if changes detected)
✓ Task dependencies
✓ External dependencies

INTERACTIVE FEATURES:
- Click nodes to highlight dependencies
- Zoom and pan to explore
- Filter by project type
- Show/hide task dependencies
- Export as image

LEGEND:
🟦 Application projects
🟩 Library projects
🟨 Affected projects (if changes exist)
⚪ Unaffected projects

════════════════════════════════════════
```

## Step 3: Alternative - Generate Static Graph

If interactive graph fails, generate static visualization:

Execute this bash command:

```bash
nx graph --file=nx-graph.html
```

Present with header:

```
════════════════════════════════════════
  STATIC GRAPH GENERATED
════════════════════════════════════════
```

Report location:
"Static graph saved to: nx-graph.html"

## Step 4: Show Affected Projects

Execute this bash command to show affected projects:

```bash
nx show projects --affected
```

Present with header:

```
════════════════════════════════════════
  AFFECTED PROJECTS
════════════════════════════════════════
```

Show the list of affected projects.

If no changes detected, report:
"No changes detected - all projects are up to date"

## Step 5: Project Information

Provide useful commands for project analysis:

```
════════════════════════════════════════
  USEFUL NX COMMANDS
════════════════════════════════════════

List all projects:
  nx show projects

Show project details:
  nx show project <project-name>

View affected projects:
  nx show projects --affected

View task dependencies:
  nx show project <project-name> --web

Clear Nx cache:
  /nx:cache-clear

Run affected tasks:
  /nx:affected

════════════════════════════════════════
```

## Step 6: Understanding Your Workspace

Based on the graph, explain the workspace structure:

```
Your monorepo contains:
- [count] total projects
- [count] applications
- [count] libraries
- [count] affected by recent changes

Key Projects:
[List 3-5 most important/central projects based on dependency count]

Dependency Insights:
- Most connected project: [project with most dependencies]
- Isolated projects: [projects with no dependencies]
- Circular dependencies: [if any detected, warn user]

Recommendations:
✓ Keep dependency chains shallow (< 5 levels)
✓ Avoid circular dependencies
✓ Use affected commands for faster CI/CD
✓ Regularly review and optimize project structure
```

**IMPORTANT EXECUTION NOTES:**

- Execute bash commands using the Bash tool
- The graph opens in default browser automatically
- Static graph can be shared with team members
- Graph is generated from actual project structure
- All commands run from C:\dev as base directory
- Graph updates automatically when dependencies change
