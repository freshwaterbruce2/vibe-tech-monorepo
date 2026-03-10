# Vibe Tutor Enhancement Integration Guide

## Overview

This guide explains how to integrate the new educational games, enhanced token economy, and Roblox-themed reward shop into your existing Vibe Tutor app.

## New Components Created

1. **Educational Games**
   - `MathAdventureGame.tsx` - Math problems with Roblox world progression
   - `WordBuilderGame.tsx` - Word building from scrambled letters
   - `PatternQuestGame.tsx` - Pattern recognition and completion
   - `LearningHub.tsx` - Central hub to access all educational games

2. **Token Economy**
   - `SmartSchedule.tsx` - Updated with Robux rewards for completing scheduled tasks
   - `RobuxRewardShop.tsx` - Shop where kids can spend earned Robux

3. **Backend Updates**
   - `server.mjs` - Updated to support DeepSeek V3.2 models (chat & reasoner)

## Integration Steps

### Step 1: Update App.tsx

Add the following imports at the top of your App.tsx file:

```typescript
// Add to existing imports
const LearningHub = React.lazy(() => import('./components/LearningHub'));
const RobuxRewardShop = React.lazy(() => import('./components/RobuxRewardShop'));
```

### Step 2: Add State Management for Tokens

Add token state to your App component:

```typescript
// Add this state
const [userTokens, setUserTokens] = useState(() => {
  const saved = localStorage.getItem('userTokens');
  return saved ? parseInt(saved) : 0;
});

// Token management functions
const handleEarnTokens = (amount: number) => {
  setUserTokens(prev => {
    const newAmount = prev + amount;
    localStorage.setItem('userTokens', newAmount.toString());
    return newAmount;
  });
};

const handleSpendTokens = (amount: number) => {
  setUserTokens(prev => {
    const newAmount = Math.max(0, prev - amount);
    localStorage.setItem('userTokens', newAmount.toString());
    return newAmount;
  });
};
```

### Step 3: Add New Views to Navigation

Update your view type to include new sections:

```typescript
type View = 'dashboard' | 'learning' | 'shop' | 'schedule' | ... // your existing views
```

### Step 4: Add Navigation Buttons

Add buttons to access the new features in your sidebar or navigation:

```typescript
{/* Learning Hub Button */}
<button
  onClick={() => setCurrentView('learning')}
  className="glass-button w-full py-3 px-4 text-left flex items-center gap-3"
>
  🎮 Learning Games
  <span className="ml-auto text-yellow-400">{userTokens} 💎</span>
</button>

{/* Reward Shop Button */}
<button
  onClick={() => setCurrentView('shop')}
  className="glass-button w-full py-3 px-4 text-left flex items-center gap-3"
>
  🛒 Reward Shop
</button>
```

### Step 5: Add View Rendering

Add cases for the new views in your main render switch/if statement:

```typescript
{currentView === 'learning' && (
  <Suspense fallback={<LoadingScreen />}>
    <LearningHub
      userTokens={userTokens}
      onEarnTokens={handleEarnTokens}
      onClose={() => setCurrentView('dashboard')}
    />
  </Suspense>
)}

{currentView === 'shop' && (
  <Suspense fallback={<LoadingScreen />}>
    <RobuxRewardShop
      userTokens={userTokens}
      onSpendTokens={handleSpendTokens}
      onClose={() => setCurrentView('dashboard')}
    />
  </Suspense>
)}

{currentView === 'schedule' && (
  <SmartSchedule
    homework={homeworkItems}
    onTaskComplete={(taskId, points) => {
      // Your existing task complete logic
      handleEarnTokens(points); // Award Robux
    }}
    onEarnTokens={handleEarnTokens}
    userTokens={userTokens}
  />
)}
```

### Step 6: Display Token Balance

Add a token balance display to your main dashboard or header:

```typescript
<div className="token-display bg-gray-800/50 backdrop-blur rounded-xl px-4 py-2 flex items-center gap-2">
  <span className="text-yellow-400">💎</span>
  <span className="text-white font-bold">{userTokens} Robux</span>
</div>
```

### Step 7: Update Buddy Service for DeepSeek V3.2

The backend has been updated to support DeepSeek V3.2. To use the reasoning mode for complex homework help:

```typescript
// In buddyService.ts or when calling the AI for homework help
const response = await createChatCompletion(messages, {
  model: 'deepseek-chat', // or 'deepseek-reasoner' for complex tasks
  useReasoning: true, // Enable for homework help that needs step-by-step reasoning
  temperature: 0.7,
  max_tokens: 1000,
});
```

## Configuration Updates

### Update Achievement Service

Add achievements for the new features:

```javascript
// Add to your achievements list
{
  id: 'first_game',
  title: 'Game Player',
  description: 'Play your first learning game',
  icon: '🎮',
  requiredProgress: 1,
  points: 10
},
{
  id: 'math_master',
  title: 'Math Master',
  description: 'Score 500 points in Math Adventure',
  icon: '🔢',
  requiredProgress: 500,
  points: 50
},
{
  id: 'word_wizard',
  title: 'Word Wizard',
  description: 'Build 50 words correctly',
  icon: '📚',
  requiredProgress: 50,
  points: 50
},
{
  id: 'pattern_pro',
  title: 'Pattern Pro',
  description: 'Complete 30 pattern quests',
  icon: '🧩',
  requiredProgress: 30,
  points: 50
},
{
  id: 'big_spender',
  title: 'Big Spender',
  description: 'Make your first purchase in the shop',
  icon: '💰',
  requiredProgress: 1,
  points: 20
}
```

## Backend Deployment

Make sure to restart your backend server to enable DeepSeek V3.2 support:

```bash
cd render-backend
npm start
```

The server will now show:

```
[OK] DeepSeek V3.2 models supported (chat & reasoner)
```

## Mobile Build & Testing

After integration, build and test on your Samsung Galaxy A54:

```bash
# Build the web app
pnpm run build

# Sync to Android
pnpm exec cap sync android

# Build APK
cd android && ./gradlew.bat assembleDebug && cd ..

# Uninstall old version and install new
adb uninstall com.vibetech.tutor
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Features Summary

### 1. **Learning Games Hub**

- Math Adventure - Progressive difficulty, Roblox-themed worlds
- Word Builder - Vocabulary building with scrambled letters
- Pattern Quest - Pattern recognition and logic puzzles
- Daily streak bonuses for consistent play
- Level progression system

### 2. **Enhanced Token Economy**

- Earn Robux from:
  - Completing scheduled tasks (5-25 Robux per task)
  - Playing educational games (10-30 Robux per game)
  - Maintaining streaks (10% bonus per day)
  - Achieving milestones

### 3. **Robux Reward Shop**

- Avatar customizations
- Game passes (2x speed, double rewards)
- Special perks (ad-free, custom music)
- Real-world rewards (extra gaming time, treats - parent approved)

### 4. **AI Improvements**

- DeepSeek V3.2 integration
- Reasoning mode for complex homework help
- Better context retention in conversations

## Best Practices

1. **Token Balance Management**
   - Save to localStorage after every change
   - Display balance prominently
   - Show earnings in real-time

2. **Parent Controls**
   - Real-world rewards require parent approval
   - Notifications saved for parent review
   - Purchase history tracked

3. **Engagement Tips**
   - Use visual celebrations for achievements
   - Show progress bars for levels
   - Maintain streak counters
   - Provide immediate feedback

## Troubleshooting

### Issue: Games not loading

- Check that all component files are in the `components/` folder
- Verify imports are using lazy loading with Suspense

### Issue: Tokens not persisting

- Check localStorage is not being cleared
- Verify `userTokens` state is properly initialized from localStorage

### Issue: AI not responding

- Ensure backend server is running on port 3001
- Check API key is set in backend `.env` file
- Verify CORS settings allow your app origin

## Next Steps

1. Customize reward items in the shop based on your child's interests
2. Add more educational games as they progress
3. Set up parent dashboard to track progress and approve real rewards
4. Consider adding multiplayer features for sibling competition

## Support

For issues or questions about the integration:

- Check component files for inline documentation
- Review error messages in browser console
- Test features individually before full integration

Remember: The goal is to make learning fun and rewarding while maintaining structure and routine!
