# Vibe Tutor - Project Guide

**Project Path:** `C:\dev\apps\vibe-tutor`  
**Database:** `D:\databases\vibe-tutor.db`  
**Type:** Cross-Platform Educational App (React + Electron + Capacitor)  
**Platform:** Web, Desktop, Mobile  
**Status:** Active Development

---

## 🎯 Project Overview

Educational tutoring and learning platform supporting multiple subjects, interactive lessons, progress tracking, and multimedia content. Built with React and deployable as web app, desktop application (Electron), and mobile app (Capacitor).

### Key Features

- Interactive lessons and quizzes
- Progress tracking and analytics
- Multi-subject support
- Multimedia content (video, audio, images)
- Offline learning mode
- Gamification (badges, achievements)
- Student/teacher modes
- Real-time collaboration
- AI-powered tutoring assistance

---

## 📁 Project Structure

```
vibe-tutor/
├── src/                  # React application
│   ├── components/      # UI components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── store/           # State management
│   └── utils/           # Utilities
├── electron/            # Electron main process
│   ├── main.js         # Entry point
│   └── preload.js      # Preload script
├── public/              # Static assets
├── android/             # Capacitor Android
├── assets/              # App assets
├── services/            # Backend services
├── tests/               # Test files
├── capacitor.config.ts  # Capacitor config
└── package.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\vibe-tutor

# Install dependencies
pnpm install

# Copy environment template
Copy-Item .env.example .env
code .env

# Initialize database
pnpm db:init

# Start development
pnpm dev
```

### Required Environment Variables

```bash
# .env file
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
VITE_JAMENDO_CLIENT_ID=your_jamendo_id  # For music content
DATABASE_PATH=D:\databases\vibe-tutor.db
```

### Development

```powershell
# Web development
pnpm dev

# Electron development
pnpm dev:electron

# Mobile (Android)
pnpm cap:sync
pnpm cap:run android

# Access web at: http://localhost:5173
```

---

## 🖥️ Desktop Development (Electron)

### Setup

```powershell
# Ensure Electron dependencies are installed
pnpm install

# Development mode
pnpm dev:electron

# Build for desktop
pnpm build:electron
```

### Electron Configuration

**File:** `electron/main.js`

```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile('dist/index.html');
  }
}

app.whenReady().then(createWindow);
```

### Build Desktop App

```powershell
# Build for Windows
pnpm build:electron:win

# Output: dist-electron/vibe-tutor-setup.exe
```

---

## 📱 Mobile Development (Capacitor)

### Setup Capacitor

```powershell
# Sync web assets
pnpm cap:sync

# Open in Android Studio
pnpm cap:open android

# Open in Xcode (Mac only)
pnpm cap:open ios
```

### Capacitor Configuration

**File:** `capacitor.config.ts`

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibe.tutor',
  appName: 'Vibe Tutor',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#6366f1'
    }
  }
};

export default config;
```

### Build Mobile

```powershell
# Build for Android
pnpm build
pnpm cap:sync android
pnpm cap:build:android

# Build for iOS (Mac only)
pnpm cap:build:ios
```

---

## 📊 Database Schema

**Location:** `D:\databases\vibe-tutor.db`

### Key Tables

```sql
-- Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'student',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lessons
CREATE TABLE lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    difficulty TEXT,
    content_json TEXT,
    duration INTEGER,
    created_by TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Progress
CREATE TABLE user_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    lesson_id TEXT,
    completed BOOLEAN DEFAULT 0,
    score INTEGER,
    time_spent INTEGER,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

-- Achievements
CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    achievement_type TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Database Operations

```powershell
# Backup database
Copy-Item D:\databases\vibe-tutor.db D:\backups\vibe-tutor\vibe-tutor_$(Get-Date -Format 'yyyyMMdd_HHmmss').db

# Query progress
sqlite3 D:\databases\vibe-tutor.db "SELECT * FROM user_progress WHERE user_id='user123';"
```

---

## 🎓 Content Management

### Lesson Structure

```typescript
// src/types/lesson.ts
interface Lesson {
  id: string;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  content: LessonContent[];
  quiz?: Quiz;
  resources?: Resource[];
}

interface LessonContent {
  type: 'text' | 'video' | 'audio' | 'image' | 'interactive';
  data: any;
  order: number;
}

interface Quiz {
  questions: Question[];
  passingScore: number;
}
```

### Content Service

```typescript
// src/services/content.ts
export class ContentService {
  async getLesson(lessonId: string): Promise<Lesson> {
    const response = await fetch(`/api/lessons/${lessonId}`);
    return response.json();
  }

  async saveProgress(userId: string, lessonId: string, progress: Progress) {
    await db.execute(
      'INSERT INTO user_progress (user_id, lesson_id, score, completed) VALUES (?, ?, ?, ?)',
      [userId, lessonId, progress.score, progress.completed]
    );
  }

  async getLearningPath(userId: string, subject: string) {
    // Get personalized learning path based on progress
    const progress = await this.getUserProgress(userId);
    return this.generatePath(progress, subject);
  }
}
```

---

## 🎮 Gamification

### Achievement System

```typescript
// src/services/achievements.ts
export const achievements = {
  FIRST_LESSON: {
    id: 'first_lesson',
    title: 'Getting Started',
    description: 'Complete your first lesson',
    icon: '🎓'
  },
  PERFECT_SCORE: {
    id: 'perfect_score',
    title: 'Perfect!',
    description: 'Get 100% on a quiz',
    icon: '⭐'
  },
  STREAK_7: {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Learn for 7 days in a row',
    icon: '🔥'
  }
};

export async function checkAndAwardAchievements(userId: string, action: string) {
  // Check if achievement criteria met
  // Award if earned
  if (action === 'lesson_completed' && await isFirstLesson(userId)) {
    await awardAchievement(userId, 'first_lesson');
  }
}
```

### Points System

```typescript
// src/services/points.ts
export const pointsConfig = {
  LESSON_COMPLETED: 10,
  QUIZ_PERFECT: 50,
  DAILY_STREAK: 5,
  HELP_CLASSMATE: 15
};

export async function awardPoints(userId: string, action: string) {
  const points = pointsConfig[action] || 0;
  await db.execute(
    'UPDATE users SET points = points + ? WHERE id = ?',
    [points, userId]
  );
}
```

---

## 🧪 Testing

### Run Tests

```powershell
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# E2E tests
pnpm test:e2e
```

### Test Examples

```typescript
// tests/services/content.test.ts
import { ContentService } from '@/services/content';

describe('ContentService', () => {
  it('should fetch lesson by ID', async () => {
    const service = new ContentService();
    const lesson = await service.getLesson('lesson_1');
    
    expect(lesson).toBeDefined();
    expect(lesson.title).toBeTruthy();
  });

  it('should save user progress', async () => {
    const service = new ContentService();
    await service.saveProgress('user_1', 'lesson_1', {
      score: 85,
      completed: true
    });
    
    const progress = await service.getUserProgress('user_1');
    expect(progress).toHaveLength(1);
  });
});
```

---

## 🎨 UI Components

### Lesson Player

```typescript
// src/components/LessonPlayer.tsx
import { useState } from 'react';

export const LessonPlayer = ({ lesson }: { lesson: Lesson }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentContent = lesson.content[currentIndex];

  const handleNext = () => {
    if (currentIndex < lesson.content.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="lesson-player">
      <ContentRenderer content={currentContent} />
      <button onClick={handleNext}>Next</button>
    </div>
  );
};
```

### Progress Dashboard

```typescript
// src/components/ProgressDashboard.tsx
export const ProgressDashboard = ({ userId }: { userId: string }) => {
  const { progress, loading } = useProgress(userId);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="dashboard">
      <StatCard title="Lessons Completed" value={progress.completedCount} />
      <StatCard title="Average Score" value={`${progress.avgScore}%`} />
      <StatCard title="Current Streak" value={`${progress.streak} days`} />
      <AchievementList achievements={progress.achievements} />
    </div>
  );
};
```

---

## 🔧 Troubleshooting

### Electron Build Issues

```powershell
# Clean electron build
Remove-Item -Recurse -Force dist-electron
pnpm build:electron

# Check electron version
electron --version

# Reinstall electron
pnpm remove electron
pnpm add electron -D
```

### Capacitor Sync Issues

```powershell
# Clean capacitor
npx cap clean android
npx cap sync android --force

# Reinstall plugins
pnpm cap:plugins
```

### Database Issues

```powershell
# Verify database
sqlite3 D:\databases\vibe-tutor.db "PRAGMA integrity_check;"

# Reset database
Remove-Item D:\databases\vibe-tutor.db
pnpm db:init
pnpm db:seed
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `STATUS.md` - Current status
- `plan-vibeTutorCleanup.md` - Cleanup plan

### Technical Docs

- Integration test files
- Service documentation
- Component storybook

---

## 🔄 Maintenance

### Daily

```powershell
# Check error logs
# Monitor user progress
```

### Weekly

```powershell
# Update dependencies
pnpm update

# Add new content
pnpm db:seed-lessons

# Review analytics
```

### Monthly

```powershell
# Backup database
Copy-Item D:\databases\vibe-tutor.db D:\backups\

# Performance audit
pnpm lighthouse

# Security audit
pnpm audit
```

---

## 🎯 Key Features

### Learning Features

- Interactive lessons
- Video/audio content
- Quizzes and assessments
- Progress tracking
- Personalized paths

### Collaboration

- Student groups
- Teacher dashboard
- Real-time Q&A
- Peer review

### Multimedia

- Video lessons
- Audio lessons
- Interactive diagrams
- Gamified exercises

### Analytics

- Progress reports
- Time tracking
- Strength/weakness analysis
- Achievement tracking

---

**Last Updated:** January 2, 2026  
**Platforms:** Web, Desktop, Mobile  
**Status:** Active Development

