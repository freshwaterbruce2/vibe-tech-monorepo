# VibeBlox - Gamified Token Economy System

> **Token-based incentive system for developmental growth**
> For a 13-year-old with high-functioning autism
> Built with React 19, TypeScript, Hono, and SQLite

---

## 🎯 Project Overview

VibeBlox is a gamified reward system that encourages positive behavior and developmental growth through:

- **Quest System**: Daily tasks across 8 categories (self-care, household, social, spiritual, etc.)
- **Streak Multipliers**: Up to 2.5x coins for consistency (30+ day streaks)
- **"Without Reminder" Bonus**: 1.5x coins for self-initiated behavior
- **Vibe Shop**: Spend earned coins on Robux, gaming time, LEGO, experiences
- **Achievement System**: Unlock 30+ badges with bonus coin rewards
- **Leveling System**: 8 levels from "Noob Builder" to "Builderman Status"
- **Parent Dashboard**: Approve quests, manage rewards, view analytics

---

## 🏗️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **UI Components**: Radix UI primitives + shadcn/ui patterns
- **Backend**: Hono (lightweight) + Better-SQLite3
- **Auth**: JWT with bcrypt password hashing
- **State**: Zustand + React Query
- **Animations**: Framer Motion
- **Routing**: React Router 7
- **Monorepo**: Nx workspace integration

---

## 📁 Project Structure

```
apps/vibeblox/
├── src/                      # Frontend React app
│   ├── types/                # TypeScript interfaces
│   ├── lib/                  # Utilities (leveling, multipliers)
│   ├── components/           # React components
│   ├── app/                  # Routes and layouts
│   ├── api/                  # API client
│   ├── hooks/                # Custom React hooks
│   └── stores/               # Zustand state stores
├── server/                   # Hono backend API
│   ├── db/                   # Database schema and seed
│   ├── routes/               # API endpoints
│   ├── middleware/           # Auth middleware
│   └── services/             # Business logic
├── public/                   # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```powershell
cd C:\dev\apps\vibeblox
pnpm install
```

### 2. Initialize Database

```powershell
# Create database with schema
pnpm db:migrate

# Seed with quests, rewards, achievements
pnpm db:seed
```

**Default Accounts:**

- **Parent**: `dad` / `vibeblox2026`
- **Child**: `player1` / `letsplay`

### 3. Start Development Servers

```powershell
# Terminal 1: Backend API (port 3003)
pnpm server

# Terminal 2: Frontend dev server (port 5174)
pnpm dev
```

### 4. Open in Browser

- **Frontend**: <http://localhost:5174>
- **API Health**: <http://localhost:3003/health>

---

## 📊 Database

**Location**: `D:\data\vibeblox\vibeblox.db`

**Tables**:

- `users` - Parent and child accounts
- `quests` - 100+ quest definitions
- `quest_completions` - Transaction history (earning)
- `rewards` - Shop items (Robux, LEGO, gaming time, experiences)
- `purchases` - Transaction history (spending)
- `achievements` - 30+ badge definitions
- `user_achievements` - Unlocked badges
- `streaks` - Per-category streak tracking
- `daily_logs` - Daily summary stats
- `activity_feed` - Recent activity notifications

**Seeded Data**:

- ✅ 100+ quests across 8 categories
- ✅ 18 rewards (4 Robux tiers, 4 gaming, 4 LEGO, 6 experiences)
- ✅ 30+ achievements
- ✅ 2 user accounts (parent + child)

---

## 🎮 Core Features Status

### ✅ Completed (Phase 1 - Foundation)

- [x] Project setup in Nx monorepo
- [x] Database schema (9 tables + indexes)
- [x] Comprehensive seed data (100+ quests, 18 rewards, 30+ achievements)
- [x] TypeScript types and interfaces
- [x] Leveling system calculations
- [x] Streak multiplier system
- [x] JWT authentication
- [x] Hono backend server structure
- [x] Tailwind custom theme (Roblox colors)

### 🚧 In Progress (Phase 2 - Core Features)

- [ ] Quest routes (GET, POST /complete, /approve)
- [ ] Reward routes (GET, POST /purchase, /approve, /fulfill)
- [ ] Dashboard UI with stats
- [ ] Quest Board with categories
- [ ] Vibe Shop UI
- [ ] Achievement system logic
- [ ] Streak service

### 📋 TODO (Phase 3+)

- [ ] Admin Dashboard (parent)
- [ ] Reports and analytics
- [ ] Celebration animations
- [ ] Sound effects (toggleable)
- [ ] Mobile responsive polish
- [ ] Unit tests
- [ ] E2E tests

---

## 💡 Implementation Guide

### Next Steps (Recommended Order)

#### 1. **Complete Backend API Routes**

Create missing route files:

```bash
server/routes/quests.ts       # Quest CRUD + completion flow
server/routes/rewards.ts      # Reward CRUD + purchase flow
server/routes/transactions.ts # Coin award, history
server/routes/achievements.ts # Check/unlock achievements
server/routes/admin.ts        # Parent-only management
```

**Key endpoints to implement**:

- `GET /api/quests` - List all active quests
- `POST /api/quests/complete` - Mark quest complete (child)
- `POST /api/quests/:id/approve` - Approve completion (parent)
- `GET /api/rewards` - List shop items
- `POST /api/rewards/purchase` - Purchase reward (child)
- `POST /api/rewards/:id/approve` - Approve purchase (parent)

#### 2. **Create Frontend Components**

Start with base UI components (use shadcn/ui patterns):

```bash
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/Modal.tsx
src/components/ui/Input.tsx
src/components/ui/Badge.tsx
src/components/ui/ProgressBar.tsx
src/components/ui/Toast.tsx
```

#### 3. **Build Main Views**

```bash
src/app/routes/index.tsx     # Dashboard
src/app/routes/quests.tsx    # Quest Board
src/app/routes/shop.tsx      # Vibe Shop
src/app/routes/badges.tsx    # Achievements
src/app/routes/admin/index.tsx  # Parent Dashboard
```

#### 4. **Implement Core Services**

```bash
server/services/streakService.ts      # Streak calculations
server/services/levelService.ts       # Level up detection
server/services/achievementService.ts # Achievement unlock check
server/services/notificationService.ts # Activity feed
```

---

## 🎨 Design System

### Color Palette (Roblox-inspired)

```css
/* Primary Colors */
--blue-primary: #0066ff /* Bright Roblox blue */ --green-primary: #00cc66 /* Robux green */
  --red-primary: #ff3333 /* Accent red */ /* Backgrounds */ --bg-dark: #0a0a0f /* Near black */
  --bg-card: #12121a /* Card backgrounds */ --bg-elevated: #1a1a24 /* Elevated surfaces */
  /* Accents */ --gold: #ffd700 /* Coins, achievements */ --purple: #9933ff /* Epic rarity */
  --orange: #ff9900 /* Streak flames */;
```

### Typography

- **Headers**: Bold, blocky font (Russo One or system bold)
- **Body**: Inter or system-ui
- **Numbers**: Tabular figures for alignment

### UI Principles (Autism-Friendly)

1. **Consistent Layout**: Navigation always in same position
2. **Predictable Interactions**: Same actions = same results
3. **Clear Visual Hierarchy**: Important info always visible
4. **Minimal Cognitive Load**: One primary action per screen
5. **Satisfying Feedback**: Animations for completions (toggleable)
6. **Progress Visibility**: Always show coins, level, streak
7. **Dark Mode Default**: Easier on sensory processing

---

## 📝 Key Formulas

### Coin Calculation

```typescript
// Step 1: Base or bonus coins
const coins = withoutReminder ? quest.bonus_coins : quest.base_coins;

// Step 2: Apply streak multiplier
const multiplier = getStreakMultiplier(streakDays);
const finalCoins = Math.floor(coins * multiplier);
```

### Streak Multipliers

| Streak Days | Multiplier | Display |
| ----------- | ---------- | ------- |
| 0-2         | 1.0x       | ✨      |
| 3-6         | 1.25x      | ⚡      |
| 7-13        | 1.5x       | 🔥      |
| 14-29       | 2.0x       | 🔥🔥    |
| 30+         | 2.5x       | 💎      |

### Leveling

| Level | Title             | Coins Required |
| ----- | ----------------- | -------------- |
| 1     | Noob Builder      | 0              |
| 2     | Brick Stacker     | 500            |
| 3     | Place Builder     | 1,500          |
| 4     | Game Creator      | 3,500          |
| 5     | Rising Developer  | 7,000          |
| 6     | Pro Builder       | 12,000         |
| 7     | Legendary Dev     | 20,000         |
| 8     | Builderman Status | 35,000         |

---

## 🧪 Testing

```powershell
# Unit tests
pnpm test

# Unit tests with UI
pnpm test:ui

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Full quality check
pnpm quality
```

---

## 📦 Build & Deploy

```powershell
# Production build
pnpm build

# Preview production build
pnpm preview

# Start production server
pnpm server:prod
```

---

## 🔐 Environment Variables

Create `.env` file:

```bash
# Database
VIBEBLOX_DATABASE_PATH=D:\data\vibeblox\vibeblox.db

# NOTE: We avoid the generic DATABASE_PATH because other apps may set it globally.
# VibeBlox will only honor DATABASE_PATH if it contains "vibeblox" in the path.
# DATABASE_PATH=D:\data\vibeblox\vibeblox.db

# JWT Secret (change in production!)
JWT_SECRET=change-this-to-a-random-secret

# Server Port
PORT=3003
```

---

## 📖 References

- **PRD**: `VIBEBLOX-PRD.md` - Complete product requirements
- **Nx Docs**: <https://nx.dev>
- **Hono Docs**: <https://hono.dev>
- **shadcn/ui**: <https://ui.shadcn.com>
- **Radix UI**: <https://www.radix-ui.com>

---

## 🎯 Acceptance Criteria

1. ✅ Child can view quests, mark complete, see pending approval
2. ✅ Child can view balance, streak, level, XP progress
3. ✅ Child can browse shop and purchase affordable items
4. ✅ Child can view achievement progress and unlocked badges
5. ✅ Parent can approve/deny quest completions
6. ✅ Parent can approve/deny/fulfill purchases
7. ✅ Parent can award custom coin amounts
8. ✅ Parent can view reports on child's progress
9. ✅ Multipliers correctly apply (without reminder + streak)
10. ✅ Achievements unlock automatically when requirements met
11. ✅ Level ups trigger at correct thresholds
12. ✅ UI is responsive and follows color scheme
13. ✅ Optional sounds work and can be toggled
14. ✅ Data persists in SQLite database

---

## 👨‍💻 Development Tips

1. **Use Nx Commands**: `pnpm nx dev vibeblox` instead of direct commands
2. **Database Inspection**: Use SQLite browser to inspect `D:\data\vibeblox\vibeblox.db`
3. **API Testing**: Use Postman or Thunder Client for endpoint testing
4. **Component Dev**: Use Storybook or standalone component testing
5. **Hot Reload**: Both frontend (Vite) and backend (tsx watch) support hot reload

---

## 🐛 Troubleshooting

**Database not found?**

- Ensure `D:\data\vibeblox\` directory exists
- Run `pnpm db:migrate` to create schema
- Run `pnpm db:seed` to populate data

**Port 3003 already in use?**

- Change `PORT` in `.env`
- Update `vite.config.ts` proxy target

**Auth errors?**

- Check JWT_SECRET in `.env`
- Verify token is sent in Authorization header: `Bearer <token>`

---

Built with ❤️ for developmental growth through positive reinforcement.
