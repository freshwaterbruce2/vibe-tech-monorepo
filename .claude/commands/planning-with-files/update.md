---
description: Add an entry to the current session progress.md
model: haiku
---

# Update Progress

Add a new entry to the current planning session's progress.md file.

## Usage

This command accepts an argument describing the action taken:

```
/planning-with-files:update Completed database migration
```

## Step 1: Find Active Session

Find the most recent session directory in D:\planning-files\

## Step 2: Generate Timestamp

Get current timestamp in format: HH:mm

## Step 3: Append to progress.md

Add new entry to the Timeline section:

```
- [HH:mm]: [USER PROVIDED ACTION]
```

## Step 4: Confirm Update

```
Progress updated: [ACTION]
Session: [SESSION_ID]
```

**NOTE:** This is a quick utility for logging progress without interrupting workflow.
