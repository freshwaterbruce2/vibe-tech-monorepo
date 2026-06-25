````yaml
---
name: git-merge-strategy
description: A skill for managing git merge strategies within the VibeTech Nx monorepo.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: "1.0.0"
  generated_from: learning_pattern__occurrences
  success_rate: 95.0%
  category: development
---

# Git Merge Strategy

**Auto-generated from successful patterns**

## Overview
This skill provides guidelines and tools for effectively managing git merge strategies within the VibeTech Nx monorepo, ensuring a streamlined workflow and minimizing merge conflicts across the multiple projects.

## Core Capabilities
- Define and enforce merge strategies for the VibeTech monorepo.
- Automate conflict resolution for common patterns.
- Integrate with the existing CI/CD pipeline to validate merges before deployment.

## Usage Examples
1. **Set Merge Strategy**: Define the default merge strategy for the repository.
   ```bash
   git config --global pull.rebase true
````

2. **Merge with Strategy**: Perform a merge while specifying the strategy.

   ```bash
   git merge feature-branch --strategy-option theirs
   ```

3. **Automate Conflict Resolution**: Use a script to handle common merge conflicts.
   ```bash
   # merge-script.sh
   git merge feature-branch || {
       echo "Conflict detected. Attempting to resolve..."
       git checkout --theirs conflicting-file.js
       git add conflicting-file.js
       git commit -m "Resolved merge conflict using theirs strategy."
   }
   ```

## Integration with Monorepo

In the VibeTech Nx monorepo, this skill helps to maintain a consistent approach to merging code across 52+ projects. By defining a clear merge strategy, developers can ensure that changes across apps, shared libraries, and backend services are integrated smoothly.

## Safety Measures

- **D:\ Snapshots**: Regularly create snapshots of the D:\ drive to backup important data and logs before performing merges.
- **Validation**: Implement pre-merge checks to validate branch states and ensure all tests pass before merging.
- **Rollback**: In case of a failed merge, have a rollback plan using git tags to quickly revert to the last stable state.

## Related Skills

- [Error Boundary Implementation](#)
- [Task Management Patterns](#)
- [Tool Discovery Patterns](#)
