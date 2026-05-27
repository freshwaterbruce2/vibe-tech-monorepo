# VibeBlox - Product Requirements Document (PRD)

## Token-Based Incentive System for Developmental Growth

---

## 📋 Document Information

| Field | Value |
|-------|-------|
| **Project Name** | VibeBlox |
| **Version** | 1.0.0 |
| **Author** | Bruce (Dad) |
| **Target User** | 13-year-old son with high-functioning autism |
| **Created** | January 2026 |
| **Status** | Ready for Development |

---

## 🎯 Executive Summary

VibeBlox is a gamified token economy web application designed to help a 13-year-old with high-functioning autism develop essential life skills through positive reinforcement. The system rewards micro-habits across physical, social, mental, and spiritual development domains, with special emphasis on **self-initiated behavior** (doing things without being reminded).

### Core Value Proposition

Transform daily responsibilities and developmental activities into an engaging game where consistency and initiative are heavily rewarded, ultimately building independence and intrinsic motivation.

---

## 👤 User Profile

### Primary User: The Child

- **Age**: 13 years old (born April 18, 2012)
- **Diagnosis**: High-functioning autism
- **Interests**: Roblox (primary), LEGO, gaming
- **Favorite Colors**: Blue, Green, Red
- **Challenges**: 
  - Does bare minimum without external motivation
  - Needs reminders for basic tasks (teeth brushing, room cleaning)
  - Difficulty with self-initiation
  - Struggles with transitions (especially off screens)
  - Social interaction challenges
- **Strengths**:
  - Responds well to clear rules and structure
  - Enjoys gamification and progress tracking
  - Motivated by tangible rewards (Robux, LEGO, gaming time)

### Secondary User: The Parent (Admin)

- **Role**: Award tokens, approve purchases, manage quests, track progress
- **Needs**: Quick approval workflow, progress insights, easy token adjustment

---

## 🎨 Design Requirements

### Visual Theme

**Roblox-inspired dark gaming aesthetic** with LEGO influences

### Color Palette

```css
/* Primary Colors (Son's Favorites) */
--blue-primary: #0066FF;      /* Bright Roblox blue */
--blue-dark: #0044AA;
--blue-light: #4D94FF;

--green-primary: #00CC66;     /* Robux green */
--green-dark: #009944;
--green-light: #33FF99;

--red-primary: #FF3333;       /* Accent red */
--red-dark: #CC0000;
--red-light: #FF6666;

/* Background & UI */
--bg-dark: #0a0a0f;           /* Near black */
--bg-card: #12121a;           /* Card backgrounds */
--bg-elevated: #1a1a24;       /* Elevated surfaces */
--border-subtle: #2a2a3a;     /* Subtle borders */

/* Text */
--text-primary: #FFFFFF;
--text-secondary: #A0A0B0;
--text-muted: #606070;

/* Accents */
--gold: #FFD700;              /* Coins, achievements */
--gold-dark: #B8860B;
--purple: #9933FF;            /* Epic rarity */
--orange: #FF9900;            /* Streak flames */
```

### Typography

- **Headers**: Bold, blocky font (suggest: Russo One, Orbitron, or system bold)
- **Body**: Clean sans-serif (Inter, system-ui)
- **Numbers/Stats**: Monospace or tabular figures for alignment

### UI Principles (Autism-Friendly)

1. **Consistent Layout**: Navigation and key elements always in same position
2. **Predictable Interactions**: Same actions produce same results
3. **Clear Visual Hierarchy**: Important info (coins, streak) always visible
4. **Minimal Cognitive Load**: One primary action per screen
5. **Satisfying Feedback**: Animations and sounds for completions (toggleable)
6. **Progress Visibility**: Always show current coins, level, streak
7. **Dark Mode Default**: Easier on sensory processing
8. **Optional Sounds**: All audio can be disabled

---

## 🏗️ Technical Architecture

### Tech Stack

```
Location: C:\dev\apps\vibeblox (within @vibetech/workspace monorepo)
Database: D:\data\vibeblox\vibeblox.db

Frontend:
├── React 19
├── TypeScript 5.9
├── Tailwind CSS 4.x
├── Framer Motion (animations)
├── Zustand (state management)
├── React Router 7 (routing)
├── Lucide React (icons)
└── date-fns (date utilities)

Backend:
├── Hono (lightweight API framework)
├── Better-SQLite3 (database)
├── Zod (validation)
├── JWT (authentication)
└── bcrypt (password hashing)

Build/Dev:
├── Nx (monorepo orchestration)
├── pnpm (package manager)
├── Vite (bundler)
└── Vitest (testing)
```

### Project Structure

```
C:\dev\apps\vibeblox\
├── src\
│   ├── app\
│   │   ├── routes\
│   │   │   ├── _layout.tsx           # Main layout wrapper
│   │   │   ├── index.tsx             # Home/Dashboard
│   │   │   ├── quests.tsx            # Quest board
│   │   │   ├── shop.tsx              # Vibe Shop
│   │   │   ├── badges.tsx            # Achievement gallery
│   │   │   ├── history.tsx           # Transaction history
│   │   │   └── admin\
│   │   │       ├── _layout.tsx       # Admin layout
│   │   │       ├── index.tsx         # Admin dashboard
│   │   │       ├── award.tsx         # Award coins
│   │   │       ├── approve.tsx       # Approve purchases
│   │   │       ├── quests.tsx        # Manage quests
│   │   │       ├── rewards.tsx       # Manage rewards
│   │   │       └── reports.tsx       # Analytics
│   │   └── App.tsx
│   ├── components\
│   │   ├── ui\                       # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout\
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── AdminSidebar.tsx
│   │   ├── features\
│   │   │   ├── VibeCoin.tsx          # Coin icon/display
│   │   │   ├── StreakBadge.tsx       # Streak display
│   │   │   ├── ExperienceBar.tsx     # XP progress
│   │   │   ├── QuestCard.tsx         # Individual quest
│   │   │   ├── ShopItem.tsx          # Shop item card
│   │   │   ├── AchievementBadge.tsx  # Badge display
│   │   │   ├── Avatar.tsx            # Roblox-style avatar
│   │   │   ├── ActivityFeed.tsx      # Recent activity
│   │   │   └── CelebrationOverlay.tsx # Completion animation
│   │   └── admin\
│   │       ├── AwardForm.tsx
│   │       ├── PendingApprovals.tsx
│   │       ├── QuestEditor.tsx
│   │       └── StatsCard.tsx
│   ├── hooks\
│   │   ├── useAuth.ts
│   │   ├── useCoins.ts
│   │   ├── useQuests.ts
│   │   ├── useStreak.ts
│   │   ├── useAchievements.ts
│   │   └── useSound.ts
│   ├── stores\
│   │   ├── authStore.ts
│   │   ├── userStore.ts
│   │   ├── questStore.ts
│   │   └── uiStore.ts
│   ├── api\
│   │   ├── client.ts                 # API client setup
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── quests.ts
│   │   ├── transactions.ts
│   │   ├── rewards.ts
│   │   └── achievements.ts
│   ├── lib\
│   │   ├── constants.ts              # App constants
│   │   ├── utils.ts                  # Utility functions
│   │   ├── multipliers.ts            # Streak/bonus calculations
│   │   └── levelSystem.ts            # XP and leveling logic
│   ├── types\
│   │   ├── index.ts
│   │   ├── user.ts
│   │   ├── quest.ts
│   │   ├── transaction.ts
│   │   ├── reward.ts
│   │   └── achievement.ts
│   └── styles\
│       └── globals.css
├── server\
│   ├── index.ts                      # Server entry
│   ├── app.ts                        # Hono app setup
│   ├── db\
│   │   ├── index.ts                  # DB connection
│   │   ├── schema.sql                # Initial schema
│   │   ├── seed.ts                   # Seed data
│   │   └── migrations\
│   ├── routes\
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── quests.ts
│   │   ├── transactions.ts
│   │   ├── rewards.ts
│   │   ├── achievements.ts
│   │   └── admin.ts
│   ├── middleware\
│   │   ├── auth.ts
│   │   └── validation.ts
│   └── services\
│       ├── streakService.ts
│       ├── levelService.ts
│       ├── achievementService.ts
│       └── notificationService.ts
├── public\
│   ├── sounds\
│   │   ├── coin.mp3
│   │   ├── levelup.mp3
│   │   ├── achievement.mp3
│   │   └── oof.mp3                   # Easter egg!
│   └── images\
├── project.json                      # Nx config
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── package.json
```

---

## 💾 Database Schema

### Location

```
D:\data\vibeblox\vibeblox.db
```

### Schema Definition

```sql
-- ============================================
-- VIBEBLOX DATABASE SCHEMA
-- ============================================

-- Users table (parent + child accounts)
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT CHECK(role IN ('child', 'parent')) NOT NULL,
    avatar_mood TEXT DEFAULT 'happy',
    current_coins INTEGER DEFAULT 0,
    lifetime_coins INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    sound_enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Streaks table (per-category streaks)
CREATE TABLE streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,  -- 'self_care', 'household', 'social', etc.
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category)
);

-- Quest definitions
CREATE TABLE quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- 'self_care', 'household', 'self_regulation', 'social', 'spiritual', 'academic', 'physical', 'above_beyond'
    subcategory TEXT,        -- More specific grouping
    icon TEXT NOT NULL,      -- Emoji
    base_coins INTEGER NOT NULL,
    bonus_coins INTEGER NOT NULL,  -- "Without reminder" bonus
    is_daily BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quest completions (transactions for earning)
CREATE TABLE quest_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    quest_id INTEGER NOT NULL REFERENCES quests(id),
    without_reminder BOOLEAN DEFAULT 0,
    base_coins INTEGER NOT NULL,
    multiplier REAL DEFAULT 1.0,
    final_coins INTEGER NOT NULL,
    notes TEXT,
    awarded_by INTEGER REFERENCES users(id),  -- Parent who confirmed
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reward definitions (shop items)
CREATE TABLE rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,  -- 'robux', 'gaming', 'lego', 'experience'
    icon TEXT NOT NULL,
    cost INTEGER NOT NULL,
    real_value TEXT,         -- e.g., "$9.99 value"
    rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    is_limited BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchases (transactions for spending)
CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reward_id INTEGER NOT NULL REFERENCES rewards(id),
    cost INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'fulfilled', 'denied')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    fulfilled_at DATETIME
);

-- Achievement definitions
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL,
    requirement_type TEXT NOT NULL,  -- 'streak', 'count', 'total_coins', 'level', 'custom'
    requirement_value INTEGER NOT NULL,
    requirement_category TEXT,        -- For category-specific achievements
    bonus_coins INTEGER DEFAULT 0,
    rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User achievements (unlocked)
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    achievement_id INTEGER NOT NULL REFERENCES achievements(id),
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Daily log (for tracking daily activity)
CREATE TABLE daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    log_date DATE NOT NULL,
    quests_completed INTEGER DEFAULT 0,
    coins_earned INTEGER DEFAULT 0,
    without_reminder_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
);

-- Activity feed / notifications
CREATE TABLE activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    activity_type TEXT NOT NULL,  -- 'quest_complete', 'purchase', 'achievement', 'level_up', 'streak'
    title TEXT NOT NULL,
    description TEXT,
    coins_change INTEGER DEFAULT 0,
    icon TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_quest_completions_user ON quest_completions(user_id);
CREATE INDEX idx_quest_completions_date ON quest_completions(completed_at);
CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_streaks_user ON streaks(user_id);
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, log_date);
CREATE INDEX idx_activity_feed_user ON activity_feed(user_id);
```

---

## 🎮 Core Features

### 1. Dashboard (Home)

**Purpose**: At-a-glance view of current status and recent activity

**Elements**:

- **Header Bar** (persistent across app)
  - VibeBlox logo (left)
  - Streak badge with current streak + multiplier
  - Coin balance with animated VibeCoin icon
  - Avatar with mood state
  
- **Level Progress Card**
  - Current level and title (e.g., "Level 4: Game Creator")
  - XP bar showing progress to next level
  - XP needed to level up
  - Lifetime coins earned

- **Stats Grid** (4 cards)
  - Quests completed this week
  - Total coins earned (lifetime)
  - Badges unlocked (X/Y)
  - Current streak days

- **Activity Feed**
  - Last 5-10 activities
  - Each shows: icon, action, coin change, timestamp
  - Types: quest complete, purchase, achievement unlock, level up

- **Quick Action Button**
  - "START GRINDING" → navigates to Quests

### 2. Quests Board

**Purpose**: View and complete available quests

**Layout**:

- Category filter tabs at top
- Each category expandable/collapsible
- Quests grouped by category and subcategory

**Quest Card Display**:

```
┌─────────────────────────────────────────────────────┐
│ [CATEGORY BADGE] [DAILY badge if applicable]        │
│                                                     │
│ 🪥 Brush Teeth (Night)                    +15 VC   │
│ Brush before bed without being reminded             │
│                                     [streak bonus]  │
└─────────────────────────────────────────────────────┘
```

**Quest Completion Flow**:

1. Child taps quest card
2. Modal appears: "Did you do this WITHOUT being reminded?"
   - [Yes - I did it myself! (+15)] 
   - [No - I needed a reminder (+10)]
3. Quest marked as "Pending Approval"
4. Parent receives notification
5. Parent approves (can add note) or denies
6. Coins awarded, celebration animation plays

**Categories**:

1. 🪥 Self-Care (Physical Development)
2. 🏠 Household (Responsibility)
3. 📱 Self-Regulation (Mental Development)
4. 👥 Social Skills (Social Development)
5. ✝️ Spiritual Growth (Christian Development)
6. 📚 Academic (Mental Development)
7. 💪 Physical Activity (Physical Development)
8. 🌟 Above & Beyond (Initiative)

### 3. Vibe Shop

**Purpose**: Spend earned coins on rewards

**Layout**:

- Balance display at top (large, prominent)
- Category sections with headers
- Grid of reward cards

**Reward Card Display**:

```
┌───────────────────────┐
│ [LIMITED] badge       │
│                       │
│        💎            │
│     800 Robux        │
│ "Popular pack for    │
│  limiteds & premium" │
│    ~$9.99 value      │
│                       │
│   🪙 1,000 VC        │
│  [Need 200 more]     │
│                       │
├───────────────────────┤
│ ████ RARE ████       │
└───────────────────────┘
```

**Purchase Flow**:

1. Child taps reward they can afford
2. Confirmation modal: "Spend X VibeCoins on [Reward]?"
3. Purchase created with "pending" status
4. Parent receives notification
5. Parent approves → status = "approved"
6. Parent fulfills (gives actual reward) → status = "fulfilled"
7. Or parent denies with reason

**Categories**:

1. 💚 Robux Rewards
2. 🎮 Gaming Time  
3. 🧱 LEGO Sets
4. 🎉 Experiences

### 4. Badges (Achievements)

**Purpose**: Display unlocked and locked achievements

**Layout**:

- Progress summary at top (X/Y unlocked)
- Grid of badge icons
- Locked badges shown grayed with 🔒

**Badge Card**:

- Icon (or 🔒 if locked)
- Name
- Rarity indicator (color bar)
- Star icon for legendary

**Badge Detail Modal** (on tap):

- Large icon
- Name and description
- Requirement explanation
- Progress if not yet unlocked
- Unlock date if unlocked

### 5. History

**Purpose**: View all transactions and activity

**Filters**:

- All / Earned / Spent
- Date range
- Category

**Transaction Row**:

```
📝 Quest Complete: Homework Grind    +30 VC    2h ago
   Without reminder • 2x streak bonus
   Approved by Dad
```

### 6. Admin Dashboard (Parent Only)

**Purpose**: Manage the entire system

**Sections**:

#### 6a. Award Coins

- Quick award form
- Select quest OR custom amount
- Toggle "without reminder"
- Add optional note
- Preview final amount with multipliers

#### 6b. Pending Approvals

- List of pending quest completions
- List of pending purchases
- Approve/Deny with optional note
- Bulk approve option

#### 6c. Manage Quests

- Add/Edit/Disable quests
- Adjust coin values
- Reorder quests
- Import/export quest configs

#### 6d. Manage Rewards

- Add/Edit/Disable rewards
- Mark as limited
- Adjust costs
- Track fulfillment status

#### 6e. Reports & Analytics

- Daily/Weekly/Monthly coins earned
- Quest completion rates by category
- "Without reminder" percentage (KEY METRIC)
- Streak history
- Most/least completed quests
- Spending patterns
- Progress over time charts

---

## 📊 Leveling System

### Level Thresholds (Lifetime Coins)

| Level | Title | Coins Required | Cumulative |
|-------|-------|----------------|------------|
| 1 | Noob Builder | 0 | 0 |
| 2 | Brick Stacker | 500 | 500 |
| 3 | Place Builder | 1,000 | 1,500 |
| 4 | Game Creator | 2,000 | 3,500 |
| 5 | Rising Developer | 3,500 | 7,000 |
| 6 | Pro Builder | 5,000 | 12,000 |
| 7 | Legendary Dev | 8,000 | 20,000 |
| 8 | Builderman Status | 15,000 | 35,000 |

### Level Up Rewards

- Celebration animation
- +100 bonus coins
- Activity feed announcement
- (Future: unlock new avatar items)

---

## 🔥 Streak & Multiplier System

### Streak Rules

- Streak increments when at least ONE quest is completed in a category that day
- Separate streaks per category (self_care, household, etc.)
- Display shows the HIGHEST active streak
- Streak resets at midnight if no quest completed previous day

### Multipliers

| Streak Days | Multiplier | Display |
|-------------|------------|---------|
| 0-2 | 1.0x | ✨ |
| 3-6 | 1.25x | ⚡ |
| 7-13 | 1.5x | 🔥 |
| 14-29 | 2.0x | 🔥🔥 |
| 30+ | 2.5x | 💎 |

### Coin Calculation Formula

```typescript
function calculateCoins(
  baseCoins: number,
  withoutReminder: boolean,
  streakDays: number
): number {
  // Start with base or bonus coins
  let coins = withoutReminder ? (baseCoins * 1.5) : baseCoins;
  
  // Apply streak multiplier
  const streakMultiplier = getStreakMultiplier(streakDays);
  coins = Math.floor(coins * streakMultiplier);
  
  return coins;
}

function getStreakMultiplier(days: number): number {
  if (days >= 30) return 2.5;
  if (days >= 14) return 2.0;
  if (days >= 7) return 1.5;
  if (days >= 3) return 1.25;
  return 1.0;
}
```

---

## 🏆 Achievement Definitions

### Self-Care Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| Fresh Start | Morning routine 7 days | +100 | Rare |
| Night Owl No More | Brush teeth at night 14 days | +200 | Epic |
| Independence Day | Full self-care day, 0 reminders | +50 | Rare |
| Hygiene Hero | 30-day self-care streak | +300 | Legendary |

### Household Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| Dish Master | Wash dishes 7 days straight | +75 | Rare |
| Room Ranger | Room clean 14 days straight | +150 | Epic |
| Family Helper | 3 above-and-beyond tasks in 1 week | +100 | Rare |
| Initiative Award | 5 tasks without being asked | +200 | Epic |
| Home MVP | 30-day household streak | +300 | Legendary |

### Self-Regulation Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| Phone Freedom | Phone-free car rides 7 days | +100 | Rare |
| Zen Master | Use calming strategies 5 times | +150 | Epic |
| Graceful Gamer | 5 good gaming transitions | +100 | Rare |
| Patience Pro | Wait patiently 10 times | +200 | Epic |
| Self-Control Sensei | 30-day regulation streak | +300 | Legendary |

### Social Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| Conversation Starter | Ask about others 7 times | +75 | Rare |
| Social Butterfly | 3 positive peer interactions/week | +100 | Rare |
| Kindness King | 5 random acts of kindness | +200 | Epic |
| Eye Contact Expert | Good eye contact 14 days | +100 | Rare |
| People Person | 30-day social streak | +300 | Legendary |

### Spiritual Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| Prayer Warrior | Pray daily 14 days | +150 | Epic |
| Scripture Scholar | Memorize 5 verses | +200 | Epic |
| Faithful Friend | Invite someone to church | +100 | Rare |
| Fruit Bearer | 3 fruits of Spirit in one day | +75 | Rare |
| Servant Heart | Help at church 3 times/month | +150 | Epic |

### General Achievements

| Name | Requirement | Bonus | Rarity |
|------|-------------|-------|--------|
| First Steps | Complete first quest | +25 | Common |
| Century Club | Earn 100 lifetime coins | +50 | Common |
| 1K Club | Earn 1,000 lifetime coins | +100 | Rare |
| 10K Legend | Earn 10,000 lifetime coins | +500 | Legendary |
| Builderman | Reach level 8 | +1000 | Legendary |
| Streak Starter | 7-day streak (any category) | +50 | Common |
| Streak Master | 30-day streak (any category) | +200 | Epic |
| Completionist | Unlock all achievements | +1000 | Legendary |

---

## 📝 Quest Seed Data

### Self-Care Quests

```typescript
const selfCareQuests = [
  { name: "Brush Teeth (Morning)", description: "Brush before breakfast or school", icon: "🪥", base: 5, bonus: 8, isDaily: true, subcategory: "hygiene" },
  { name: "Brush Teeth (Night)", description: "Brush before bed", icon: "🪥", base: 10, bonus: 15, isDaily: true, subcategory: "hygiene" },
  { name: "Shower Without Being Told", description: "Take a shower on your own", icon: "🚿", base: 10, bonus: 15, isDaily: false, subcategory: "hygiene" },
  { name: "Deodorant Applied", description: "Put on deodorant", icon: "🧴", base: 3, bonus: 5, isDaily: true, subcategory: "hygiene" },
  { name: "Hair Brushed", description: "Brush or style your hair", icon: "💇", base: 3, bonus: 5, isDaily: true, subcategory: "hygiene" },
  { name: "Clean Clothes Chosen", description: "Pick out fresh clothes (not yesterday's)", icon: "👕", base: 3, bonus: 5, isDaily: true, subcategory: "hygiene" },
  { name: "Nails Trimmed", description: "Trim fingernails when needed", icon: "✂️", base: 5, bonus: 8, isDaily: false, subcategory: "hygiene" },
  { name: "Drank Enough Water", description: "Drink 8+ glasses of water today", icon: "💧", base: 5, bonus: 5, isDaily: true, subcategory: "health" },
  { name: "Went to Bed On Time", description: "In bed by bedtime without arguing", icon: "🛏️", base: 10, bonus: 15, isDaily: true, subcategory: "sleep" },
  { name: "Woke Up with First Alarm", description: "Got up without snoozing or dragging", icon: "⏰", base: 10, bonus: 15, isDaily: true, subcategory: "sleep" },
];
```

### Household Quests

```typescript
const householdQuests = [
  // Room
  { name: "Bed Made", description: "Make your bed before leaving room", icon: "🛏️", base: 5, bonus: 8, isDaily: true, subcategory: "room" },
  { name: "Room Picked Up", description: "Floor clear, things in their place", icon: "🧹", base: 10, bonus: 15, isDaily: true, subcategory: "room" },
  { name: "Room Deep Clean", description: "Vacuum, dust, and organize", icon: "✨", base: 25, bonus: 35, isDaily: false, subcategory: "room" },
  { name: "Dirty Clothes in Hamper", description: "Put dirty clothes where they go", icon: "🧺", base: 3, bonus: 5, isDaily: true, subcategory: "room" },
  { name: "Clean Clothes Put Away", description: "Put away folded laundry", icon: "👔", base: 5, bonus: 8, isDaily: false, subcategory: "room" },
  { name: "Backpack Unpacked", description: "Unpack and organize after school", icon: "🎒", base: 5, bonus: 8, isDaily: true, subcategory: "room" },
  { name: "Desk Tidy", description: "Clean workspace ready for homework", icon: "🗂️", base: 5, bonus: 8, isDaily: true, subcategory: "room" },
  
  // Kitchen
  { name: "Own Dishes to Sink", description: "Bring your dishes after each meal", icon: "🍽️", base: 3, bonus: 5, isDaily: true, subcategory: "kitchen" },
  { name: "Own Dishes Washed", description: "Wash, rinse, and dry your dishes", icon: "🧽", base: 8, bonus: 12, isDaily: true, subcategory: "kitchen" },
  { name: "Family Dishes Washed", description: "Wash dishes for the whole family", icon: "🌟", base: 15, bonus: 20, isDaily: false, subcategory: "kitchen" },
  { name: "Pots and Pans Washed", description: "Wash the cooking dishes", icon: "🍳", base: 12, bonus: 18, isDaily: false, subcategory: "kitchen" },
  { name: "Loaded Dishwasher", description: "Load dishes into dishwasher", icon: "🫧", base: 10, bonus: 15, isDaily: false, subcategory: "kitchen" },
  { name: "Unloaded Dishwasher", description: "Put away all clean dishes", icon: "🗄️", base: 10, bonus: 15, isDaily: false, subcategory: "kitchen" },
  { name: "Wiped Counters", description: "Clean kitchen counters", icon: "🧼", base: 5, bonus: 8, isDaily: false, subcategory: "kitchen" },
  { name: "Took Out Kitchen Trash", description: "Empty when full (not overflowing!)", icon: "🗑️", base: 8, bonus: 12, isDaily: false, subcategory: "kitchen" },
  { name: "Helped Cook a Meal", description: "Actively helped with meal prep", icon: "👨‍🍳", base: 15, bonus: 20, isDaily: false, subcategory: "kitchen" },
  { name: "Cooked Simple Meal Solo", description: "Made a meal yourself", icon: "🍝", base: 30, bonus: 40, isDaily: false, subcategory: "kitchen" },
  { name: "Set the Table", description: "Set up for dinner", icon: "🍴", base: 5, bonus: 8, isDaily: true, subcategory: "kitchen" },
  { name: "Cleared the Table", description: "Clean up after dinner", icon: "🧹", base: 5, bonus: 8, isDaily: true, subcategory: "kitchen" },
  
  // General
  { name: "Fed Pets", description: "Feed the family pets", icon: "🐕", base: 5, bonus: 8, isDaily: true, subcategory: "general" },
  { name: "Walked Dog", description: "Take the dog for a walk", icon: "🦮", base: 8, bonus: 12, isDaily: false, subcategory: "general" },
  { name: "Brought in Mail", description: "Get the mail from mailbox", icon: "📬", base: 3, bonus: 5, isDaily: true, subcategory: "general" },
  { name: "Took Out Recycling", description: "Take recycling to bin", icon: "♻️", base: 5, bonus: 8, isDaily: false, subcategory: "general" },
  { name: "Helped with Yard Work", description: "Mowing, raking, weeding, etc.", icon: "🌿", base: 15, bonus: 20, isDaily: false, subcategory: "general" },
  { name: "Carried Groceries", description: "Help bring in groceries", icon: "🛒", base: 5, bonus: 8, isDaily: false, subcategory: "general" },
  { name: "Noticed & Did Something", description: "Saw something needed doing and did it", icon: "👀", base: 25, bonus: 35, isDaily: false, subcategory: "general" },
];
```

### Self-Regulation Quests

```typescript
const selfRegulationQuests = [
  // Phone/Screen
  { name: "Phone Away (Short Trip)", description: "Phone in pocket for <15 min car ride", icon: "📱", base: 8, bonus: 12, isDaily: false, subcategory: "phone" },
  { name: "Phone Away (Long Trip)", description: "Phone away for 30+ min car ride", icon: "🚗", base: 15, bonus: 20, isDaily: false, subcategory: "phone" },
  { name: "Phone Down at Dinner", description: "No phone during family dinner", icon: "🍽️", base: 10, bonus: 15, isDaily: true, subcategory: "phone" },
  { name: "Phone Charged in Spot", description: "Phone charging in designated spot overnight", icon: "🔌", base: 8, bonus: 12, isDaily: true, subcategory: "phone" },
  { name: "Screen Limit Respected", description: "Stopped when time was up, no arguing", icon: "⏱️", base: 10, bonus: 15, isDaily: true, subcategory: "phone" },
  { name: "Good Gaming Transition", description: "Switched off game without meltdown", icon: "🎮", base: 15, bonus: 20, isDaily: false, subcategory: "phone" },
  { name: "Accepted 'No' to Screen Time", description: "Handled denial gracefully", icon: "✋", base: 10, bonus: 15, isDaily: false, subcategory: "phone" },
  { name: "Chose Non-Screen Activity", description: "Picked reading, LEGO, outside, etc.", icon: "📚", base: 10, bonus: 15, isDaily: false, subcategory: "phone" },
  
  // Focus/Patience
  { name: "Waited Patiently", description: "Waited 5+ minutes without complaining", icon: "⏳", base: 8, bonus: 12, isDaily: false, subcategory: "patience" },
  { name: "Didn't Interrupt", description: "Let others finish speaking", icon: "🤐", base: 8, bonus: 12, isDaily: false, subcategory: "patience" },
  { name: "Focused Homework Time", description: "No distractions during homework", icon: "📝", base: 15, bonus: 20, isDaily: true, subcategory: "patience" },
  { name: "Did Boring Task", description: "Completed without complaining", icon: "😐", base: 10, bonus: 15, isDaily: false, subcategory: "patience" },
  { name: "Handled Plan Change", description: "Adapted when plans changed", icon: "🔄", base: 15, bonus: 20, isDaily: false, subcategory: "patience" },
  { name: "Accepted Correction", description: "Took feedback without arguing", icon: "👍", base: 15, bonus: 20, isDaily: false, subcategory: "patience" },
  { name: "Asked for Help", description: "Asked when stuck instead of giving up", icon: "🙋", base: 10, bonus: 15, isDaily: false, subcategory: "patience" },
  { name: "Tried Again After Failure", description: "Didn't give up, tried again", icon: "💪", base: 15, bonus: 20, isDaily: false, subcategory: "patience" },
  
  // Emotional
  { name: "Used Calming Strategy", description: "Deep breaths, walk away, etc.", icon: "🧘", base: 20, bonus: 25, isDaily: false, subcategory: "emotional" },
  { name: "Expressed Feelings with Words", description: "Said 'I'm frustrated' instead of acting out", icon: "💬", base: 15, bonus: 20, isDaily: false, subcategory: "emotional" },
  { name: "Recovered from Disappointment", description: "Bounced back quickly", icon: "🌈", base: 15, bonus: 20, isDaily: false, subcategory: "emotional" },
  { name: "Handled Losing Gracefully", description: "No rage quit or bad attitude", icon: "🎯", base: 15, bonus: 20, isDaily: false, subcategory: "emotional" },
  { name: "Named Own Emotions", description: "Recognized and stated how you feel", icon: "🎭", base: 10, bonus: 15, isDaily: false, subcategory: "emotional" },
  { name: "Apologized Sincerely", description: "Owned mistake and said sorry", icon: "🙏", base: 15, bonus: 20, isDaily: false, subcategory: "emotional" },
  { name: "Walked Away from Argument", description: "Chose to de-escalate", icon: "🚶", base: 15, bonus: 20, isDaily: false, subcategory: "emotional" },
];
```

### Social Quests

```typescript
const socialQuests = [
  // Family
  { name: "Made Eye Contact", description: "Good eye contact during conversation", icon: "👁️", base: 5, bonus: 8, isDaily: true, subcategory: "family" },
  { name: "Shared About Day (Detail)", description: "More than 'fine' when asked", icon: "🗣️", base: 8, bonus: 12, isDaily: true, subcategory: "family" },
  { name: "Asked About Someone's Day", description: "Showed interest in others", icon: "❓", base: 10, bonus: 15, isDaily: true, subcategory: "family" },
  { name: "Helped Sibling", description: "Helped without being asked", icon: "👫", base: 15, bonus: 20, isDaily: false, subcategory: "family" },
  { name: "Played Game with Family", description: "Participated willingly", icon: "🎲", base: 10, bonus: 15, isDaily: false, subcategory: "family" },
  { name: "Phone-Free Family Time", description: "Present and engaged", icon: "👨‍👩‍👦", base: 10, bonus: 15, isDaily: false, subcategory: "family" },
  { name: "Gave Genuine Compliment", description: "Noticed something positive", icon: "💖", base: 8, bonus: 12, isDaily: false, subcategory: "family" },
  { name: "Used Please/Thank You", description: "Good manners consistently", icon: "🙏", base: 5, bonus: 8, isDaily: true, subcategory: "family" },
  { name: "Greeted Family Members", description: "Said good morning, hello, etc.", icon: "👋", base: 5, bonus: 8, isDaily: true, subcategory: "family" },
  
  // Outside Home
  { name: "Greeted Adult Politely", description: "Eye contact + proper greeting", icon: "🤝", base: 8, bonus: 12, isDaily: false, subcategory: "outside" },
  { name: "Ordered Own Food", description: "Spoke clearly to server", icon: "🍔", base: 10, bonus: 15, isDaily: false, subcategory: "outside" },
  { name: "Made Small Talk", description: "Answered questions, asked some back", icon: "💭", base: 12, bonus: 18, isDaily: false, subcategory: "outside" },
  { name: "Positive Peer Interaction", description: "Good exchange with someone your age", icon: "👥", base: 15, bonus: 20, isDaily: false, subcategory: "outside" },
  { name: "Joined Group Activity", description: "Participated without being pushed", icon: "🏃", base: 15, bonus: 20, isDaily: false, subcategory: "outside" },
  { name: "Compromised with Someone", description: "Found middle ground", icon: "⚖️", base: 15, bonus: 20, isDaily: false, subcategory: "outside" },
  { name: "Showed Empathy", description: "Recognized others' feelings", icon: "💕", base: 15, bonus: 20, isDaily: false, subcategory: "outside" },
  { name: "Helped Non-Family Member", description: "Random act of kindness", icon: "🌟", base: 20, bonus: 25, isDaily: false, subcategory: "outside" },
  { name: "Made New Acquaintance", description: "Put yourself out there", icon: "🆕", base: 25, bonus: 30, isDaily: false, subcategory: "outside" },
  
  // Communication
  { name: "Used Appropriate Volume", description: "Indoor voice when needed", icon: "🔊", base: 5, bonus: 8, isDaily: true, subcategory: "communication" },
  { name: "Stayed on Topic", description: "Didn't derail conversation", icon: "🎯", base: 8, bonus: 12, isDaily: false, subcategory: "communication" },
  { name: "Read Social Cues", description: "Knew when to stop, etc.", icon: "📖", base: 10, bonus: 15, isDaily: false, subcategory: "communication" },
  { name: "Handled Rejection Gracefully", description: "Friend said no, handled it well", icon: "💔", base: 15, bonus: 20, isDaily: false, subcategory: "communication" },
  { name: "Shared with Someone", description: "Showed generosity", icon: "🎁", base: 8, bonus: 12, isDaily: false, subcategory: "communication" },
  { name: "Took Turns in Conversation", description: "Back and forth exchange", icon: "🔁", base: 8, bonus: 12, isDaily: false, subcategory: "communication" },
];
```

### Spiritual Quests

```typescript
const spiritualQuests = [
  // Personal Faith
  { name: "Morning Prayer", description: "Start the day talking to God", icon: "🙏", base: 8, bonus: 12, isDaily: true, subcategory: "personal" },
  { name: "Bedtime Prayer", description: "End the day with gratitude", icon: "🌙", base: 8, bonus: 12, isDaily: true, subcategory: "personal" },
  { name: "Read Bible/Devotional", description: "Even 5 minutes counts", icon: "📖", base: 10, bonus: 15, isDaily: true, subcategory: "personal" },
  { name: "Memorized Bible Verse", description: "Working on memorization", icon: "🧠", base: 20, bonus: 25, isDaily: false, subcategory: "personal" },
  { name: "Recited Memory Verse", description: "Reviewed a memorized verse", icon: "🗣️", base: 10, bonus: 15, isDaily: false, subcategory: "personal" },
  { name: "Faith Journal Entry", description: "Wrote about faith or gratitude", icon: "📝", base: 10, bonus: 15, isDaily: false, subcategory: "personal" },
  { name: "Listened to Worship Music", description: "Chose faith-based content", icon: "🎵", base: 5, bonus: 8, isDaily: false, subcategory: "personal" },
  { name: "Prayed for Someone", description: "Intercessory prayer", icon: "💒", base: 8, bonus: 12, isDaily: false, subcategory: "personal" },
  { name: "Thanked God Specifically", description: "Gratitude for something specific", icon: "🙌", base: 5, bonus: 8, isDaily: true, subcategory: "personal" },
  
  // Church/Community
  { name: "Participated in Church", description: "Engaged, not just present", icon: "⛪", base: 15, bonus: 20, isDaily: false, subcategory: "church" },
  { name: "Attended Youth Group", description: "Went willingly, no complaints", icon: "👥", base: 15, bonus: 20, isDaily: false, subcategory: "church" },
  { name: "Participated in Youth Activity", description: "Got involved, engaged", icon: "🎯", base: 20, bonus: 25, isDaily: false, subcategory: "church" },
  { name: "Helped at Church", description: "Service project, setup, etc.", icon: "🛠️", base: 20, bonus: 25, isDaily: false, subcategory: "church" },
  { name: "Invited Friend to Church", description: "Evangelism in action!", icon: "📨", base: 25, bonus: 30, isDaily: false, subcategory: "church" },
  { name: "Faith Talk with Parent", description: "Genuine conversation about faith", icon: "💬", base: 15, bonus: 20, isDaily: false, subcategory: "church" },
  { name: "Asked Faith Question", description: "Curious and growing", icon: "❓", base: 15, bonus: 20, isDaily: false, subcategory: "church" },
  
  // Character
  { name: "Showed Forgiveness", description: "Let go of an offense", icon: "💚", base: 20, bonus: 25, isDaily: false, subcategory: "character" },
  { name: "Chose Honesty", description: "Truth even when hard", icon: "✅", base: 20, bonus: 25, isDaily: false, subcategory: "character" },
  { name: "Showed Humility", description: "Admitted wrong, didn't brag", icon: "🙇", base: 15, bonus: 20, isDaily: false, subcategory: "character" },
  { name: "Demonstrated Patience", description: "Fruit of the Spirit", icon: "⏳", base: 15, bonus: 20, isDaily: false, subcategory: "character" },
  { name: "Kind to Difficult Person", description: "Love your enemies", icon: "😇", base: 20, bonus: 25, isDaily: false, subcategory: "character" },
  { name: "Put Others First", description: "Selflessness", icon: "🥇", base: 15, bonus: 20, isDaily: false, subcategory: "character" },
  { name: "Controlled Tongue", description: "Didn't say mean thing", icon: "🤐", base: 15, bonus: 20, isDaily: false, subcategory: "character" },
  { name: "Stood Up for Right", description: "Courage and conviction", icon: "🦁", base: 20, bonus: 25, isDaily: false, subcategory: "character" },
  { name: "Encouraged Someone", description: "Built someone up", icon: "📣", base: 10, bonus: 15, isDaily: false, subcategory: "character" },
];
```

### Academic Quests

```typescript
const academicQuests = [
  { name: "Homework Started On Time", description: "Didn't procrastinate", icon: "⏰", base: 10, bonus: 15, isDaily: true, subcategory: "homework" },
  { name: "Homework Completed", description: "Finished all assignments", icon: "✅", base: 15, bonus: 20, isDaily: true, subcategory: "homework" },
  { name: "Studied for Test", description: "Preparation time", icon: "📚", base: 15, bonus: 20, isDaily: false, subcategory: "homework" },
  { name: "A on Test/Assignment", description: "90%+ score", icon: "🅰️", base: 50, bonus: 50, isDaily: false, subcategory: "grades" },
  { name: "B on Test/Assignment", description: "80-89% score", icon: "🅱️", base: 30, bonus: 30, isDaily: false, subcategory: "grades" },
  { name: "Improved from Last Time", description: "Progress over perfection", icon: "📈", base: 25, bonus: 25, isDaily: false, subcategory: "grades" },
  { name: "Read 30+ Minutes", description: "Non-school reading", icon: "📖", base: 15, bonus: 20, isDaily: false, subcategory: "reading" },
  { name: "Asked Teacher for Help", description: "Self-advocacy", icon: "🙋", base: 15, bonus: 20, isDaily: false, subcategory: "school" },
  { name: "Organized Backpack/Binder", description: "Executive function", icon: "🗂️", base: 10, bonus: 15, isDaily: false, subcategory: "school" },
  { name: "Assignment On Time", description: "Turned in when due", icon: "📅", base: 10, bonus: 15, isDaily: false, subcategory: "school" },
  { name: "Took Notes in Class", description: "Active learning", icon: "📝", base: 10, bonus: 15, isDaily: false, subcategory: "school" },
  { name: "Participated in Discussion", description: "Spoke up in class", icon: "🗣️", base: 15, bonus: 20, isDaily: false, subcategory: "school" },
];
```

### Physical Activity Quests

```typescript
const physicalQuests = [
  { name: "30 Min Physical Activity", description: "Sports, bike, walk, etc.", icon: "🏃", base: 15, bonus: 20, isDaily: false, subcategory: "exercise" },
  { name: "Went Outside", description: "Fresh air (not for errands)", icon: "🌳", base: 10, bonus: 15, isDaily: true, subcategory: "outside" },
  { name: "Tried New Activity", description: "Stepped out of comfort zone", icon: "🆕", base: 20, bonus: 25, isDaily: false, subcategory: "exercise" },
  { name: "Stretched/Exercised", description: "Body maintenance", icon: "🧘", base: 10, bonus: 15, isDaily: false, subcategory: "exercise" },
  { name: "Chose Active Option", description: "Bike instead of ride, etc.", icon: "🚴", base: 15, bonus: 20, isDaily: false, subcategory: "exercise" },
  { name: "Played Sport with Others", description: "Social + physical", icon: "⚽", base: 15, bonus: 20, isDaily: false, subcategory: "sports" },
  { name: "Walked Instead of Ride", description: "When safe/appropriate", icon: "🚶", base: 10, bonus: 15, isDaily: false, subcategory: "outside" },
];
```

### Above & Beyond Quests

```typescript
const aboveBeyondQuests = [
  { name: "Helped Without Prompt", description: "Noticed a need and filled it", icon: "👀", base: 35, bonus: 35, isDaily: false, subcategory: "initiative" },
  { name: "Exceeded Expectations", description: "Went above what was asked", icon: "🚀", base: 30, bonus: 30, isDaily: false, subcategory: "initiative" },
  { name: "Made Someone's Day", description: "Intentional kindness", icon: "☀️", base: 30, bonus: 30, isDaily: false, subcategory: "initiative" },
  { name: "Solved Problem Independently", description: "Didn't need rescue", icon: "🧩", base: 30, bonus: 30, isDaily: false, subcategory: "initiative" },
  { name: "Took on Challenge", description: "Chose hard over easy", icon: "🏔️", base: 35, bonus: 35, isDaily: false, subcategory: "initiative" },
  { name: "Led by Example", description: "Others followed good behavior", icon: "👑", base: 30, bonus: 30, isDaily: false, subcategory: "initiative" },
  { name: "Taught Someone Something", description: "Shared knowledge", icon: "🎓", base: 25, bonus: 25, isDaily: false, subcategory: "initiative" },
  { name: "Created Something", description: "Art, LEGO, code, etc.", icon: "🎨", base: 20, bonus: 20, isDaily: false, subcategory: "creative" },
  { name: "Showed Unexpected Maturity", description: "Dad says 'wow' moment", icon: "🌟", base: 40, bonus: 40, isDaily: false, subcategory: "initiative" },
];
```

---

## 🛒 Reward Seed Data

```typescript
const rewards = [
  // Robux (2025 pricing)
  { name: "400 Robux", description: "Starter pack for avatar items & game passes", category: "robux", icon: "💚", cost: 500, realValue: "$4.99 value", rarity: "common" },
  { name: "800 Robux", description: "Popular pack for limited items & premium games", category: "robux", icon: "💎", cost: 1000, realValue: "$9.99 value", rarity: "rare" },
  { name: "1,700 Robux", description: "Big spender! Enough for most limiteds & UGC", category: "robux", icon: "👑", cost: 2000, realValue: "$19.99 value", rarity: "epic" },
  { name: "4,500 Robux", description: "MEGA pack for serious collectors", category: "robux", icon: "🏆", cost: 5000, realValue: "$49.99 value", rarity: "legendary" },
  
  // Gaming Time
  { name: "30 Min Extra Gaming", description: "Add 30 minutes to your daily screen time", category: "gaming", icon: "🎮", cost: 50, rarity: "common" },
  { name: "1 Hour Extra Gaming", description: "Full extra hour of gaming goodness", category: "gaming", icon: "🕹️", cost: 90, rarity: "common" },
  { name: "Gaming Marathon", description: "Unlimited gaming for one weekend day!", category: "gaming", icon: "🔥", cost: 400, rarity: "rare" },
  { name: "Stay Up Late Pass", description: "Extend bedtime by 1 hour (Fri/Sat only)", category: "gaming", icon: "🌙", cost: 300, rarity: "rare", isLimited: true },
  
  // LEGO
  { name: "Small LEGO Set", description: "150-200 pieces • Speed Champions, small Star Wars, Creator 3-in-1", category: "lego", icon: "🧱", cost: 800, realValue: "$15-20 value", rarity: "rare" },
  { name: "Medium LEGO Set", description: "300-500 pieces • Ninjago dragons, City sets, Technic vehicles", category: "lego", icon: "🏗️", cost: 1500, realValue: "$30-50 value", rarity: "epic" },
  { name: "Large LEGO Set", description: "750-1,000 pieces • Big Star Wars ships, detailed Technic, Ideas sets", category: "lego", icon: "🏰", cost: 3000, realValue: "$75-100 value", rarity: "legendary" },
  { name: "Ultimate LEGO Set", description: "1,500+ pieces • UCS Star Wars, Hogwarts, massive Technic builds", category: "lego", icon: "🌟", cost: 6000, realValue: "$150+ value", rarity: "legendary" },
  
  // Experiences
  { name: "Pick Dinner Tonight", description: "You decide what the family eats tonight!", category: "experience", icon: "🍕", cost: 150, rarity: "common" },
  { name: "Movie Night (Your Pick)", description: "Choose the movie + snacks for family movie night", category: "experience", icon: "🎬", cost: 200, rarity: "common" },
  { name: "Skip One Chore", description: "One-time pass to skip a single assigned chore", category: "experience", icon: "🎟️", cost: 100, rarity: "common", isLimited: true },
  { name: "Friend Sleepover", description: "Invite a friend over for gaming & sleepover", category: "experience", icon: "🎉", cost: 500, rarity: "rare" },
  { name: "Restaurant of Choice", description: "Family goes to YOUR favorite restaurant", category: "experience", icon: "🍔", cost: 750, rarity: "epic" },
  { name: "Special Day Out", description: "Arcade, mini golf, laser tag, or your choice activity!", category: "experience", icon: "🎢", cost: 1200, rarity: "epic" },
];
```

---

## 🔐 Authentication

### Simple Auth Flow

1. Login page with username/password
2. JWT token stored in localStorage
3. Token sent in Authorization header
4. Separate routes for child vs parent

### Default Accounts (for seed)

```typescript
const defaultUsers = [
  { username: "dad", password: "vibeblox2026", role: "parent", displayName: "Dad" },
  { username: "player1", password: "letsplay", role: "child", displayName: "Player 1" },
];
```

---

## 📱 API Endpoints

### Authentication

```
POST /api/auth/login        - Login, returns JWT
POST /api/auth/logout       - Invalidate token
GET  /api/auth/me           - Get current user
```

### Users

```
GET  /api/users/:id         - Get user profile
PUT  /api/users/:id         - Update user (settings)
GET  /api/users/:id/stats   - Get user statistics
```

### Quests

```
GET  /api/quests            - List all active quests
GET  /api/quests/:id        - Get quest details
POST /api/quests/complete   - Mark quest complete (child)
GET  /api/quests/pending    - List pending approvals (parent)
POST /api/quests/:id/approve - Approve completion (parent)
POST /api/quests/:id/deny   - Deny completion (parent)

# Admin only
POST /api/quests            - Create quest
PUT  /api/quests/:id        - Update quest
DELETE /api/quests/:id      - Soft delete quest
```

### Rewards

```
GET  /api/rewards           - List all active rewards
GET  /api/rewards/:id       - Get reward details
POST /api/rewards/purchase  - Purchase reward (child)
GET  /api/rewards/pending   - List pending purchases (parent)
POST /api/rewards/:id/approve - Approve purchase (parent)
POST /api/rewards/:id/fulfill - Mark as fulfilled (parent)
POST /api/rewards/:id/deny  - Deny purchase (parent)

# Admin only
POST /api/rewards           - Create reward
PUT  /api/rewards/:id       - Update reward
DELETE /api/rewards/:id     - Soft delete reward
```

### Transactions

```
GET  /api/transactions      - List transactions (filtered)
GET  /api/transactions/:id  - Get transaction details
POST /api/transactions/award - Direct coin award (parent)
```

### Achievements

```
GET  /api/achievements      - List all achievements
GET  /api/achievements/user - List user's unlocked achievements
POST /api/achievements/check - Check & unlock new achievements
```

### Streaks

```
GET  /api/streaks           - Get all streaks for user
GET  /api/streaks/:category - Get specific category streak
```

### Reports (Admin)

```
GET  /api/reports/daily     - Daily summary
GET  /api/reports/weekly    - Weekly summary
GET  /api/reports/monthly   - Monthly summary
GET  /api/reports/trends    - Trend analysis
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Project setup in monorepo
- [ ] Database schema and seed data
- [ ] Basic Hono API server
- [ ] Authentication system
- [ ] Core data models and types

### Phase 2: Core Features (Week 2)

- [ ] Dashboard UI
- [ ] Quest board with categories
- [ ] Quest completion flow
- [ ] Basic streak tracking
- [ ] Coin calculation with multipliers

### Phase 3: Shop & Rewards (Week 3)

- [ ] Vibe Shop UI
- [ ] Purchase flow
- [ ] Parent approval workflow
- [ ] Transaction history

### Phase 4: Gamification (Week 4)

- [ ] Leveling system
- [ ] Achievement system
- [ ] Celebration animations
- [ ] Sound effects (toggleable)

### Phase 5: Admin & Polish (Week 5)

- [ ] Parent dashboard
- [ ] Reports and analytics
- [ ] Quest/Reward management
- [ ] Mobile responsive polish
- [ ] Testing and bug fixes

### Phase 6: Enhancement (Future)

- [ ] PWA support
- [ ] Push notifications
- [ ] Avatar customization
- [ ] Weekly challenges
- [ ] Family leaderboard

---

## 🧪 Testing Requirements

### Unit Tests

- Coin calculation with multipliers
- Streak logic
- Level progression
- Achievement requirements

### Integration Tests

- Quest completion flow
- Purchase flow
- Approval workflow

### E2E Tests

- Login flow
- Complete quest → approve → coins awarded
- Purchase → approve → fulfill

---

## 📦 Deliverables

1. **Working Web Application**
   - Accessible via local development server
   - Child view and Parent view

2. **SQLite Database**
   - Location: `D:\data\vibeblox\vibeblox.db`
   - Pre-seeded with quests, rewards, achievements

3. **Documentation**
   - README.md with setup instructions
   - API documentation

4. **Source Code**
   - Location: `C:\dev\apps\vibeblox`
   - Following @vibetech/workspace standards

---

## ✅ Acceptance Criteria

1. Child can view quests, mark complete, see pending approval
2. Child can view balance, streak, level, XP progress
3. Child can browse shop and purchase affordable items
4. Child can view achievement progress and unlocked badges
5. Parent can approve/deny quest completions
6. Parent can approve/deny/fulfill purchases
7. Parent can award custom coin amounts
8. Parent can view reports on child's progress
9. Multipliers correctly apply (without reminder + streak)
10. Achievements unlock automatically when requirements met
11. Level ups trigger at correct thresholds
12. UI is responsive and follows color scheme (blue, green, red)
13. Optional sounds work and can be toggled
14. Data persists in SQLite database

---

## 📞 Contact

**Project Owner**: Bruce  
**For**: Son (age 13, high-functioning autism)  
**Purpose**: Developmental growth through gamified positive reinforcement

---

*End of PRD - Ready for Claude Code implementation*
