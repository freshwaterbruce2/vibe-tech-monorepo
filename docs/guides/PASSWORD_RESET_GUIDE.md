# Password Reset and User Seeding Workflow

This guide documents the shared workflows for resetting user passwords and seeding admin users across the VibeTech Monorepo applications.

## Hashing Standard
All password resets in the monorepo must use **scrypt-based cryptographic hashing** as implemented by the central [@vibetech/auth](file:///C:/dev/packages/auth/src/index.ts) package.
* **Salt Length**: 16 bytes (generated randomly using cryptographically secure primitives)
* **Derived Key Length**: 64 bytes
* **Required Minimum Password Length**: 12 characters

---

## 1. Automated Password Reset Workflow

A CLI utility has been created to quickly and securely reset user passwords across multiple SQLite databases (the central `auth.db` and app-specific databases like `vibe_studio.db`).

### Usage
From the monorepo root directory, run the reset utility using `pnpm`:

```powershell
pnpm --filter @vibetech/auth run reset-password --email <user-email> --password <new-secure-password>
```

#### Command Options
* `--email <email>`: (Required) The email address of the account to reset.
* `--password <password>`: (Required) The new password (must be at least 12 characters).
* `--db <path>`: (Optional) Path to a specific sqlite database file. If omitted, it will automatically update both:
  1. The central workspace user store ([auth.db](file:///D:/databases/auth.db))
  2. The Vibe Code Studio user store ([vibe_studio.db](file:///D:/databases/vibe_studio.db))
* `--all`: (Optional) Update in both default databases (default behavior).

#### Secure Alternative (Zero Command History)
To avoid writing plain-text passwords into your shell command history, you can pass them via environment variables:

```powershell
$env:RESET_EMAIL = 'freshwaterbruce4@gmail.com'
$env:RESET_PASSWORD = 'YourSuperSecurePassword123!'
pnpm --filter @vibetech/auth run reset-password
```

---

## 2. Seeding the Admin User

For starting a new environment where the central database is empty or uninitialized, you can seed-load the central admin account.

### Usage
Set the environment variables and run the `seed-admin` script:

```powershell
$env:ADMIN_EMAIL = 'freshwaterbruce4@gmail.com'
$env:ADMIN_PASSWORD = 'YourSuperSecurePassword123!'
$env:ADMIN_NAME = 'Bruce'
pnpm --filter @vibetech/auth exec tsx src/seed-admin.ts
```

This will create a new administrator account in the central database ([auth.db](file:///D:/databases/auth.db)) with the `is_admin` flag set to `1`.

---

## 3. Database Locations

Under the monorepo storage paths policy, databases live strictly on the **`D:\`** drive to prevent local build directory bloat.
* **Central Authentication Database**: [auth.db](file:///D:/databases/auth.db)
* **Vibe Code Studio Database**: [vibe_studio.db](file:///D:/databases/vibe_studio.db)
