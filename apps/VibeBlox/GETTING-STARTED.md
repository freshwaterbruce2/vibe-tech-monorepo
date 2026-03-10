# VibeBlox - Getting Started Guide

## 🎉 Project Successfully Created

Your VibeBlox gamified token economy system has been scaffolded and is ready for development!

---

## 📁 What's Been Built

### ✅ Phase 1 - Foundation (100% Complete)

**Database & Backend:**

- ✅ SQLite database schema (9 tables with indexes)
- ✅ Comprehensive seed data:
  - 100+ quests across 8 categories
  - 18 rewards (Robux, gaming time, LEGO, experiences)
  - 30+ achievements with rarity levels
  - 2 user accounts (parent + child)
- ✅ Hono API server with JWT authentication
- ✅ TypeScript types and interfaces
- ✅ Leveling system (8 levels with XP calculations)
- ✅ Streak multiplier system (1.0x to 2.5x)

**Frontend:**

- ✅ React 19 + TypeScript + Vite setup
- ✅ Tailwind CSS with Roblox-inspired theme
- ✅ React Router 7 with authentication
- ✅ Login page with JWT integration
- ✅ Dashboard with level progress and stats
- ✅ Quest Board (placeholder with UI structure)
- ✅ Vibe Shop (placeholder with UI structure)
- ✅ Badges page (placeholder)
- ✅ Admin Dashboard (placeholder for parent)
- ✅ Bottom navigation bar
- ✅ Responsive layout

**Configuration:**

- ✅ Nx integration for monorepo
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Git ignore rules
- ✅ Environment variable setup

---

## 🚀 Quick Start (First Time Setup)

### Step 1: Install Dependencies

```powershell
# From workspace root
cd C:\dev
pnpm install --no-frozen-lockfile

# This will resolve the bcrypt lockfile issue and install all dependencies
```

### Step 2: Create Environment File

```powershell
cd C:\dev\apps\vibeblox
copy .env.example .env

# Edit .env and set a secure JWT secret (optional for development)
```

### Step 3: Initialize Database

```powershell
# Create database with schema
pnpm db:migrate

# Seed with all quests, rewards, and achievements
pnpm db:seed
```

**Expected Output:**

```
✅ Database initialized successfully
📁 Database location: D:\data\vibeblox\vibeblox.db
🌱 Starting database seed...
✅ Users created
✅ Self-care quests created (10 quests)
✅ Household quests created (26 quests)
✅ Self-regulation quests created (23 quests)
✅ Social quests created (24 quests)
✅ Spiritual quests created (25 quests)
✅ Academic quests created (12 quests)
✅ Physical activity quests created (7 quests)
✅ Above & beyond quests created (9 quests)
✅ Rewards created (18 rewards)
✅ Achievements created (30+ achievements)

📊 Summary:
   Users: 2 (1 parent, 1 child)
   Quests: 136
   Rewards: 18
   Achievements: 30+
```

### Step 4: Start Development Servers

Open **two terminal windows**:

**Terminal 1 - Backend API:**

```powershell
cd C:\dev\apps\vibeblox
pnpm server

# API runs on http://localhost:3003
```

**Terminal 2 - Frontend Dev Server:**

```powershell
cd C:\dev\apps\vibeblox
pnpm dev

# App runs on http://localhost:5174
```

### Step 5: Open in Browser

Navigate to: **<http://localhost:5174>**

**Default Login Credentials:**

- **Parent Account**: `dad` / `vibeblox2026`
- **Child Account**: `player1` / `letsplay`

---

## 📊 Database Verification

Check your database was created successfully:

```powershell
# Verify database exists
Test-Path D:\data\vibeblox\vibeblox.db
# Should return: True

# Query quest count
sqlite3 D:\data\vibeblox\vibeblox.db "SELECT COUNT(*) FROM quests;"
# Should return: 136

# Query reward count
sqlite3 D:\data\vibeblox\vibeblox.db "SELECT COUNT(*) FROM rewards;"
# Should return: 18

# Query achievements
sqlite3 D:\data\vibeblox\vibeblox.db "SELECT COUNT(*) FROM achievements;"
# Should return: 30+
```

---

## 🎮 Testing the Application

### 1. Login as Child

- Username: `player1`
- Password: `letsplay`
- You'll see:
  - Dashboard with 100 starting coins
  - Level 1 progress bar
  - Empty activity feed
  - Quest Board link
  - Shop link
  - Badges link

### 2. Test Navigation

- Click "Quest Board" → See quest categories and placeholder quests
- Click "Vibe Shop" → See reward categories and placeholder rewards
- Click "Badges" → See achievements placeholder
- Bottom navigation should highlight active page

### 3. Login as Parent

- Logout (refresh page for now)
- Username: `dad`
- Password: `vibeblox2026`
- You'll see:
  - Same dashboard
  - Plus: "Admin" button in bottom nav
  - Click "Admin" → See parent dashboard placeholder

---

## 📝 Next Development Steps

### Priority 1: Complete Quest System (Week 1)

**Files to create/update:**

1. `server/routes/quests.ts`
   - `GET /api/quests` - Fetch all active quests
   - `POST /api/quests/complete` - Mark quest complete (child)
   - `GET /api/quests/pending` - Get pending approvals (parent)
   - `POST /api/quests/:id/approve` - Approve/deny (parent)

2. `src/app/routes/Quests.tsx`
   - Fetch quests from API
   - Display by category
   - Quest completion modal
   - "Without reminder" checkbox
   - Pending approval indicator

3. `server/services/streakService.ts`
   - Calculate streak multipliers
   - Update streak on completion
   - Check for streak resets (midnight)

### Priority 2: Complete Shop System (Week 1-2)

**Files to create/update:**

1. `server/routes/rewards.ts`
   - `GET /api/rewards` - Fetch all rewards
   - `POST /api/rewards/purchase` - Purchase reward (child)
   - `GET /api/rewards/pending` - Pending purchases (parent)
   - `POST /api/rewards/:id/approve` - Approve/deny purchase
   - `POST /api/rewards/:id/fulfill` - Mark as fulfilled

2. `src/app/routes/Shop.tsx`
   - Fetch rewards from API
   - Display by category with rarity
   - Purchase confirmation modal
   - Show coin balance
   - Disable if insufficient coins

### Priority 3: Achievement System (Week 2)

**Files to create:**

1. `server/services/achievementService.ts`
   - Check achievement requirements
   - Auto-unlock achievements
   - Award bonus coins

2. `server/routes/achievements.ts`
   - `GET /api/achievements` - All achievements
   - `GET /api/achievements/user` - Unlocked for user
   - `POST /api/achievements/check` - Check for unlocks

3. `src/app/routes/Badges.tsx`
   - Display locked/unlocked achievements
   - Progress indicators
   - Unlock animations

### Priority 4: Admin Features (Week 2-3)

**Files to create:**

1. `server/routes/admin.ts`
   - Award coins directly
   - Manage quests/rewards
   - View analytics

2. `src/app/routes/admin/*`
   - Approval workflow UI
   - Analytics dashboard
   - Quest/reward management

### Priority 5: Polish & Testing (Week 3-4)

- Celebration animations (Framer Motion)
- Sound effects (toggleable)
- Activity feed implementation
- Mobile responsive polish
- Unit tests (Vitest)
- E2E tests (Playwright)

---

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start frontend dev server
pnpm server           # Start backend API server
pnpm db:migrate       # Initialize database
pnpm db:seed          # Seed database with data

# Quality Checks
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript checks
pnpm quality          # Lint + typecheck + build
pnpm test             # Run tests (when implemented)

# Production
pnpm build            # Build for production
pnpm server:prod      # Start production server
pnpm preview          # Preview production build

# Nx Commands
pnpm nx dev vibeblox          # Via Nx
pnpm nx build vibeblox        # Build via Nx
pnpm nx lint vibeblox         # Lint via Nx
```

---

## 🎨 Design System Reference

### Colors

```css
/* Primary Colors (Son's Favorites) */
--blue-primary: #0066FF;    /* Bright Roblox blue */
--green-primary: #00CC66;   /* Robux green */
--red-primary: #FF3333;     /* Accent red */

/* Backgrounds */
--bg-dark: #0a0a0f;         /* Near black */
--bg-card: #12121a;         /* Card backgrounds */
--bg-elevated: #1a1a24;     /* Elevated surfaces */

/* Accents */
--gold: #FFD700;            /* Coins, achievements */
--purple: #9933FF;          /* Epic rarity */
--orange: #FF9900;          /* Streak flames */
```

### Utility Classes

```css
.vibe-coin              /* Animated coin icon */
.streak-badge           /* Streak display with flame */
.level-badge            /* Level display with star */
.quest-card             /* Hover effect quest card */
.reward-card            /* Shop item card */
.btn-primary            /* Blue primary button */
.btn-secondary          /* Green secondary button */
.rarity-[common/rare/epic/legendary]  /* Border colors */
```

---

## 📚 Key Files Reference

### Backend

- `server/db/schema.sql` - Database schema
- `server/db/seed.ts` - Seed data
- `server/index.ts` - Server entry point
- `server/middleware/auth.ts` - JWT authentication
- `server/routes/auth.ts` - Login/register endpoints

### Frontend

- `src/main.tsx` - React entry point
- `src/App.tsx` - Router setup
- `src/types/index.ts` - TypeScript interfaces
- `src/lib/levelSystem.ts` - Level calculations
- `src/lib/multipliers.ts` - Streak multipliers
- `src/app/routes/*` - Page components

### Configuration

- `package.json` - Dependencies and scripts
- `project.json` - Nx configuration
- `tsconfig.json` - TypeScript config
- `tailwind.config.ts` - Tailwind theme
- `vite.config.ts` - Vite bundler config

---

## 🐛 Troubleshooting

### Issue: pnpm install fails with lockfile error

**Solution:**

```powershell
cd C:\dev
pnpm install --no-frozen-lockfile
```

### Issue: Database not found

**Solution:**

```powershell
# Ensure directory exists
New-Item -ItemType Directory -Force -Path D:\data\vibeblox

# Run migration
cd C:\dev\apps\vibeblox
pnpm db:migrate
pnpm db:seed
```

### Issue: API not connecting

**Solution:**

- Check backend is running on port 3003
- Check frontend proxy in `vite.config.ts`
- Verify CORS is enabled in `server/index.ts`

### Issue: Types not found

**Solution:**

```powershell
pnpm typecheck
# Fix any type errors, then restart dev server
```

---

## 🎯 Success Criteria Checklist

When complete, the app should:

- [ ] Child can login and see dashboard
- [ ] Child can view quests by category
- [ ] Child can mark quests complete
- [ ] Child can see pending approval status
- [ ] Parent can approve/deny quest completions
- [ ] Coins are awarded with correct multipliers
- [ ] Streaks increment correctly
- [ ] Child can browse shop by category
- [ ] Child can purchase affordable rewards
- [ ] Parent can approve/deny purchases
- [ ] Achievements unlock automatically
- [ ] Level ups trigger at correct thresholds
- [ ] Activity feed shows recent actions
- [ ] UI is responsive (mobile + desktop)
- [ ] All data persists in database

---

## 🎓 Learning Resources

- **React 19 Docs**: <https://react.dev>
- **TypeScript**: <https://www.typescriptlang.org/docs>
- **Hono**: <https://hono.dev>
- **Tailwind CSS**: <https://tailwindcss.com>
- **Radix UI**: <https://www.radix-ui.com>
- **Better-SQLite3**: <https://github.com/WiseLibs/better-sqlite3>
- **Nx**: <https://nx.dev>

---

## 📞 Need Help?

Review these files for reference:

- `VIBEBLOX-PRD.md` - Complete product requirements
- `README.md` - Technical overview
- `GETTING-STARTED.md` - This file

---

**Built with ❤️ for developmental growth through positive reinforcement.**

*Last Updated: January 2026*
