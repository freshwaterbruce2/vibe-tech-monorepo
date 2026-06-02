---
name: reset-password
description: Securely reset user passwords across VibeTech applications.
allowed-tools: Read, Write, Edit, Glob, Grep, Terminal
---

# Reset Password Skill

This skill provides step-by-step instructions for securely resetting user passwords across all VibeTech applications.

## Handoff & Prompting Requirements
Before performing any database modification, you MUST ask the user for:
1. The target application name (e.g., Vibe Code Studio, Nova Agent, Vibe Portal).
2. The user's email address.

---

## Isolated Storage Policy (Critical)
* Databases must live strictly on the **`D:\`** drive (e.g., `D:\databases\vibe_studio.db`, `D:\databases\auth.db`).
* **Never** modify database files located inside `C:\dev` or other system paths.
* All custom scripts or commands targeting database files must validate that the target path starts with `D:\` or `d:\`.

---

## Hashing Requirements
* **scrypt** must be applied for databases containing separate `password_hash` and `password_salt` columns (e.g., `auth.db`, `vibe_studio.db`).
* **bcrypt** must be applied for databases containing a single `password_hash` or `password` column (with no salt column).

---

## Step-by-Step Reset Workflow

1. **Ask User for Input**: Ask the user for the target app and the user's email.
2. **Locate the Database**: Locate the SQLite database for the target application on the `D:\` drive.
   * Central Store: [auth.db](file:///D:/databases/auth.db)
   * Vibe Code Studio: [vibe_studio.db](file:///D:/databases/vibe_studio.db)
3. **Generate Secure Temporary Password**: Generate a secure temporary password (at least 12 characters, mixing uppercase, lowercase, numbers, and symbols).
4. **Execute Hashing and SQLite Update**:
   Use the built-in helper utility to execute the change:
   ```powershell
   node scripts/reset-db-password.js --db <db-path> --email <user-email> --password <temporary-password>
   ```
5. **Share Password Securely**: Provide the generated temporary password to the user.
