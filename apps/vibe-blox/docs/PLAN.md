# VibeBlox — User Profile Management

**Task:** Add `GET /api/users/me` and `PATCH /api/users/profile` to the backend

---

## Context

`users.ts` currently exposes only `GET /api/users/stats`. Authenticated users have
no way to read their own full profile or update their display_name / password.

---

## Scope

**Backend only** (no new frontend page required by this task).

### 1. `GET /api/users/me`

Returns the current user's profile:

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "bruce_w",
    "display_name": "Bruce",
    "role": "child",
    "current_coins": 120,
    "lifetime_coins": 500,
    "current_level": 3,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

### 2. `PATCH /api/users/profile`

Allows updating `display_name` and/or `password`.

**Request body:**
```json
{
  "display_name": "Bruce Wayne",       // optional, 1–50 chars
  "current_password": "oldPass1",      // required if changing password
  "new_password": "newPass1"           // optional, 8–72 chars
}
```

**Rules:**
- `display_name` update: no password required — validate 1–50 chars only
- `new_password` update: requires `current_password` (bcrypt verify) → 401 if wrong
- At least one of `display_name` or `new_password` must be present → 400 otherwise
- Returns updated user profile on success (same shape as GET /me)

---

## Files

| File | Change |
|------|--------|
| `server/routes/users.ts` | Add `GET /` (profile) and `PATCH /profile` handlers |

No new files. No frontend changes.

---

## Acceptance Criteria

scope_lock: "Authenticated users can read and update their own profile; no user can read or modify another user's data"
Build done when: "GET /api/users/me returns 200 with user profile JSON; PATCH /api/users/profile returns 200 on valid update, 400 on missing fields, 401 on wrong current_password"
Test done when: "GET /me returns correct shape for auth'd user; PATCH rejects missing body with 400, rejects wrong password with 401, accepts valid display_name update, accepts valid password change; ≥8 new tests passing"
Verify done when: "tsc --noEmit clean, lint clean, PATCH /api/users/profile smoke-checked with mock request returning expected JSON shape"
