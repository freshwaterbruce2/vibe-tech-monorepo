# SPEC-003: Self-Improvement Gym & SAHOO Git Ratchet

## Overview

A recursive self-improvement pipeline inside the Ralph toolkit (`tools/ralph`). It allows an LLM agent to propose code optimizations, execute them within an isolated Docker sandbox, verify them using the repository's verification suite, and either commit them (propagating lessons learned to agent skills) or automatically rollback using a Git Ratchet if any constraints are violated.

## Problem Statement

Autonomous code optimization and self-improvement present risks:
1. **Security & Safety**: Untrusted code modifications could escape local boundaries, damage files, or run malicious operations.
2. **Alignment Drift**: AI modifications can introduce regression bugs, break type constraints, or violate project guidelines.
3. **Drift Propagation**: Accumulating undetected failures over multiple iterations will result in cascading codebase degradation.

## Requirements

### REQ-1: Containerized Sandbox

- **Primary Sandbox**: Execute modifications in an isolated, unprivileged Docker container.
- **Source Syncing**: Mount the repository root (`V:\monorepo`) as **read-only** inside the container (e.g., `/workspace:ro`).
- **Isolation Execution**: Inside the container, clone the read-only mounted path to an isolated writeable sandbox folder (e.g., `/sandbox`).
- **Fallback Isolation**: If the Docker daemon is not running or the Docker CLI is not installed, gracefully fall back to executing changes in a local isolated directory on the data drive (e.g., `D:\tmp-sandbox-ralph`).

### REQ-2: The Karpathy Loop

Implement a continuous loop (`A -> B -> C`) inside `gym_runner.py`:
- **(A) Propose**: Use the configured Groq LLM (via `GROQ_API_KEY` and `GROQ_MODEL` in `.env`) to analyze a chosen file or skill and propose a specific optimization or improvement.
- **(B) Edit**: Apply the proposed file edits dynamically inside the sandbox.
- **(C) Evaluate**: Run the test and validation suites inside the sandbox.

### REQ-3: SAHOO Safeguards (Constraint Preservation)

- Run `python .agent/scripts/verify_all.py` (or a specified validation script) inside the sandbox to evaluate compliance.
- Compute the **Constraint Preservation Score (CPS)**:
  - If all checks pass: `CPS = 1.00`.
  - If any check fails or errors out: `CPS < 1.00`.
- The evaluation must run in the same isolated environment as the edits.

### REQ-4: The Git Ratchet

- If `CPS < 1.00` (meaning verification failed):
  - Execute `git reset --hard` in the sandbox directory immediately to rollback all experimental changes.
  - Abort the current optimization loop to prevent alignment drift and protect the repository.
- If `CPS == 1.00`:
  - Retain the changes as the new baseline for subsequent loops.

### REQ-5: Fleet Propagation

- When a proposed optimization successfully passes all checks (`CPS == 1.00`):
  - Draft a pull request or changeset proposing the new lesson learned to the relevant `.agents/skills/<skill-name>/SKILL.md` (or `.agent/skills/...`) file.
  - Await human approval before final integration.

## Technical Constraints

- Written in Python 3.11+ as `tools/ralph/gym_runner.py`.
- Must read `V:\monorepo\.env` for configurations (`GROQ_API_KEY`, `GROQ_MODEL`).
- Must handle missing Docker environment gracefully with host-level filesystem isolation (fallback).
- Keep file size within the 500-line soft limit.
