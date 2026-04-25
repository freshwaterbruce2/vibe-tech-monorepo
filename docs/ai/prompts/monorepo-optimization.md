# Monorepo Optimization Prompt

Act as a Senior DevOps Engineer and Monorepo Architecture Expert. I need you to review, optimize, and update my current monorepo setup. 

## Context
* **Monorepo Tool:** [e.g., Nx, Turborepo, Lerna]
* **Package Manager:** [e.g., pnpm, yarn workspaces, npm]
* **Tech Stack:** [e.g., React frontend, Node.js/Express backend, TypeScript]
* **Current Pain Points:** [e.g., Slow CI build times, frequent dependency conflicts, outdated tooling]

## Objectives
Please perform the following tasks sequentially:
1. **Review (Configuration & Structure):** Analyze the root configuration files (e.g., `package.json`, workspace files, tooling configs). Identify any anti-patterns, circular dependencies, or misconfigurations.
2. **Optimize (Performance):** Suggest specific improvements for build caching, task orchestration, and CI/CD pipeline execution times.
3. **Update (Dependencies & Tooling):** Formulate a safe, step-by-step strategy to upgrade the core monorepo tools and shared dependencies to their latest stable versions.

### Constraints
* Do not suggest migrating away from the current Monorepo Tool.
* Do not execute file changes or updates immediately. Wait for my approval on your proposed plan.
* Prioritize optimizations that require minimal refactoring of application code.

### Output Format
Please provide a structured response containing:
1. **Initial Assessment:** A brief summary of what you need from me to begin (e.g., "Please share your `nx.json` and root `package.json`").
2. **Execution Plan:** A high-level outline of the steps we will take together to achieve the review, optimization, and update objectives.
