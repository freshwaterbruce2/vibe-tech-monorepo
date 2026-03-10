import { Capacitor } from '@capacitor/core';

/**
 * Blake's Personalized Configuration
 * Custom settings for Blake's learning experience
 * Optimized for ADHD, ODD, and high-functioning autism
 */

const isNativeCapacitor =
  typeof window !== 'undefined' &&
  (window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    (typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform()) ||
    (typeof (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform === 'function' &&
      Boolean(
        (
          window as { Capacitor?: { isNativePlatform?: () => boolean } }
        ).Capacitor?.isNativePlatform?.(),
      )));

// Native Capacitor release builds run on localhost, so only treat localhost as dev
// when we're not on native mobile.
const isLocalDev =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  !isNativeCapacitor;

const allowNativeLocalApi = import.meta.env.VITE_ALLOW_NATIVE_LOCAL_API === 'true';

const LOCAL_API_ENDPOINT = 'http://localhost:3001';
const PRODUCTION_API_ENDPOINT = 'https://vibe-tutor-api.onrender.com';

const runtimeApiEndpoint =
  typeof window !== 'undefined'
    ? (window as Window & { __API_URL__?: string }).__API_URL__
    : undefined;

const DEFAULT_API_ENDPOINT = isLocalDev ? LOCAL_API_ENDPOINT : PRODUCTION_API_ENDPOINT;

const isLocalhostEndpoint = (endpoint: string): boolean => {
  try {
    const parsed = new URL(endpoint);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0'
    );
  } catch {
    return endpoint.includes('localhost') || endpoint.includes('127.0.0.1');
  }
};

const sanitizeEndpoint = (endpoint: string): string => {
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) {
    return PRODUCTION_API_ENDPOINT;
  }

  if (isLocalhostEndpoint(trimmed) && isNativeCapacitor && !allowNativeLocalApi) {
    console.warn(
      `[BLAKE_CONFIG] Refusing localhost endpoint on native app (${trimmed}); using production backend.`,
    );
    return PRODUCTION_API_ENDPOINT;
  }

  if (isLocalhostEndpoint(trimmed) && !import.meta.env.DEV && !allowNativeLocalApi) {
    console.warn(
      `[BLAKE_CONFIG] Refusing localhost endpoint in non-dev build (${trimmed}); using production backend.`,
    );
    return PRODUCTION_API_ENDPOINT;
  }

  return trimmed;
};

const RESOLVED_API_ENDPOINT = sanitizeEndpoint(
  runtimeApiEndpoint ?? import.meta.env.VITE_API_ENDPOINT ?? DEFAULT_API_ENDPOINT,
);

export const BLAKE_CONFIG = {
  // Personal Info
  userName: 'Blake',
  avatar: '🎮', // Gaming avatar
  favoriteColor: '#00FF00', // Roblox green
  theme: 'roblox-gaming',

  // API Configuration - USE PROXY for mobile/browser!
  // The render-backend server handles OpenRouter API calls securely
  apiEndpoint: RESOLVED_API_ENDPOINT,
  apiKey: '', // Not used client-side - server handles this
  useProxy: true, // CRITICAL: Must be true for mobile apps!
  endpoints: {
    chat: '/api/openrouter/chat',
    session: '/api/session/init',
    health: '/api/health',
  },

  // Learning Preferences (ADHD optimized)
  focusSessionDuration: 15, // Shorter sessions for ADHD
  breakDuration: 5,
  maxDailyFocusSessions: 8,

  // Rewards System (Roblox-themed)
  rewards: [
    {
      id: 'robux-10',
      name: '10 Robux',
      pointsRequired: 100,
      icon: '💎',
      description: 'Earn 10 Robux for your Roblox account!',
    },
    {
      id: 'robux-25',
      name: '25 Robux',
      pointsRequired: 250,
      icon: '💎',
      description: 'Earn 25 Robux for your Roblox account!',
    },
    {
      id: 'robux-50',
      name: '50 Robux',
      pointsRequired: 500,
      icon: '💎',
      description: 'Earn 50 Robux for your Roblox account!',
    },
    {
      id: 'gaming-time-30',
      name: '30 Min Gaming',
      pointsRequired: 50,
      icon: '🎮',
      description: 'Extra 30 minutes of Roblox time!',
    },
    {
      id: 'gaming-time-60',
      name: '1 Hour Gaming',
      pointsRequired: 100,
      icon: '🎮',
      description: 'Extra 1 hour of Roblox time!',
    },
    {
      id: 'new-game-pass',
      name: 'Game Pass',
      pointsRequired: 300,
      icon: '🎫',
      description: 'Choose a Roblox game pass!',
    },
    {
      id: 'avatar-item',
      name: 'Avatar Item',
      pointsRequired: 150,
      icon: '👕',
      description: 'Pick a new avatar item in Roblox!',
    },
    {
      id: 'vip-server',
      name: 'VIP Server (1 month)',
      pointsRequired: 750,
      icon: '⭐',
      description: 'Get a VIP server for your favorite game!',
    },
    {
      id: 'lego-set-small',
      name: 'Small Lego Set',
      pointsRequired: 1000,
      icon: '🧱',
      description: 'Pick out a small Lego set at the store!',
    },
    {
      id: 'lego-set-large',
      name: 'Large Lego Set',
      pointsRequired: 2500,
      icon: '🏗️',
      description: 'Pick out a large Lego set!',
    },
  ],

  // Achievements (Gaming-themed)
  customAchievements: [
    {
      id: 'noob-to-pro',
      title: 'Noob to Pro',
      description: 'Complete 10 homework tasks',
      icon: '📈',
      pointsAwarded: 50,
    },
    {
      id: 'speedrunner',
      title: 'Speedrunner',
      description: 'Finish 5 tasks before deadline',
      icon: '⚡',
      pointsAwarded: 75,
    },
    {
      id: 'combo-master',
      title: 'Combo Master',
      description: '7-day homework streak',
      icon: '🔥',
      pointsAwarded: 100,
    },
    {
      id: 'legendary-grinder',
      title: 'Legendary Grinder',
      description: 'Complete 50 total tasks',
      icon: '👑',
      pointsAwarded: 200,
    },
    {
      id: 'obby-champion',
      title: 'Obby Champion',
      description: 'Score 100% on 5 worksheets',
      icon: '🏆',
      pointsAwarded: 150,
    },
    {
      id: 'robux-millionaire',
      title: 'Robux Millionaire',
      description: 'Earn 1000 total points',
      icon: '💰',
      pointsAwarded: 300,
    },
  ],

  // ODD Support Features (Choice and autonomy)
  oddSupport: {
    allowTaskReordering: true,
    flexibleDeadlines: true,
    choiceOfRewards: true,
    skipOptions: 2,
    negotiableGoals: true,
    coolDownSpace: true,
  },

  // ADHD Support Features
  adhdSupport: {
    movementBreaks: true,
    fidgetTools: true,
    visualTimers: true,
    chunkingTasks: true,
    instantFeedback: true,
    multiSensory: true,
  },

  // Autism Support Features
  autismSupport: {
    visualSchedules: true,
    predictableRoutines: true,
    socialStories: false,
    sensoryControls: true,
    clearInstructions: true,
    specialInterests: ['Roblox', 'Gaming', 'Minecraft'],
  },

  // Favorite Subjects (customizable)
  favoriteSubjects: [
    { name: 'Gaming Math', icon: '🎮', color: '#00FF00' },
    { name: 'Roblox Coding', icon: '💻', color: '#FF0000' },
    { name: 'Creative Writing', icon: '✏️', color: '#FFA500' },
  ],

  // Motivational Messages (Gaming-themed)
  motivationalMessages: [
    "GG Blake! You're crushing it! 🎮",
    "Level up! You're a legend! 🏆",
    'Epic win, Blake! Keep grinding! 💪',
    "You're speedrunning homework like a pro! ⚡",
    'Blake the Champion! Unstoppable! 👑',
    'Big W! Your skills are insane! 🔥',
    "Achievement unlocked! You're goated! 🐐",
    "No cap, you're absolutely dominating! 💯",
    'Sheesh! That was clean, Blake! ✨',
    "You're built different! Keep it up! 💎",
  ],

  // Roblox Obby Challenges
  obbyLevels: [
    { id: 1, name: 'Homework Tower', difficulty: 'Easy', reward: 10 },
    { id: 2, name: 'Math Parkour', difficulty: 'Medium', reward: 25 },
    { id: 3, name: 'Science Speedrun', difficulty: 'Hard', reward: 50 },
    { id: 4, name: 'Essay Escape', difficulty: 'Medium', reward: 30 },
    { id: 5, name: 'Focus Fortress', difficulty: 'Extreme', reward: 100 },
  ],

  // Sound Effects Preferences
  soundEffects: {
    enabled: true,
    volume: 0.5,
    victorySound: 'roblox-oof',
    levelUpSound: 'roblox-badge',
    clickSound: 'roblox-click',
  },

  // Visual Preferences
  visualPreferences: {
    animations: 'smooth',
    confettiIntensity: 'medium',
    colorScheme: 'roblox',
    font: 'OpenDyslexic',
  },

  // Daily Challenges
  dailyChallenges: [
    { task: 'Complete 3 homework items', reward: 25 },
    { task: 'Focus for 30 minutes total', reward: 20 },
    { task: 'Get 100% on any worksheet', reward: 30 },
    { task: 'No skipped tasks today', reward: 15 },
    { task: 'Help AI Buddy with a problem', reward: 10 },
  ],

  // Blake's Custom AI Buddy Personality
  aiBuddyPersonality: {
    name: 'RoboX',
    avatar: '🤖',
    personality: 'gaming-buddy',
    phrases: [
      'Yo Blake, ready to grind some homework?',
      "Let's speedrun this assignment!",
      'GG on that last task, my dude!',
      'Time to level up your brain!',
      'This homework is easier than a Roblox obby!',
    ],
  },

  // Parent Dashboard PIN
  parentPIN: '1234',

  // Emergency Cool-Down Activities
  coolDownActivities: [
    { name: 'Watch Roblox Videos', duration: 5, icon: '📺' },
    { name: 'Doodle Break', duration: 10, icon: '✏️' },
    { name: 'Listen to Music', duration: 5, icon: '🎵' },
    { name: 'Breathing Exercise', duration: 3, icon: '💨' },
    { name: 'Fidget Time', duration: 5, icon: '🎯' },
  ],
};

// Export personalized welcome message
export const getWelcomeMessage = (): string => {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  const greetings = {
    morning: [
      'Good morning Blake! Ready to dominate today? 🎮',
      "Morning legend! Let's get this bread! 🍞",
      'Rise and grind, Blake! Time to level up! ⬆️',
    ],
    afternoon: [
      'Afternoon Blake! Ready for some epic wins? 🏆',
      "Hey Blake! Let's crush some homework! 💪",
      "What's good Blake? Time to go pro mode! 🎯",
    ],
    evening: [
      'Evening Blake! One more grind session? 🌟',
      "Hey Blake! Let's finish strong! 🔥",
      'Night owl mode activated, Blake! 🦉',
    ],
  };

  const messages = greetings[timeOfDay as keyof typeof greetings];
  return messages[Math.floor(Math.random() * messages.length)]!;
};

export const needsBreak = (focusMinutes: number): boolean => {
  return focusMinutes >= 15;
};

export const getMotivation = (): string => {
  const motivations = BLAKE_CONFIG.motivationalMessages;
  return motivations[Math.floor(Math.random() * motivations.length)]!;
};

export const calculateBlakeBonus = (
  basePoints: number,
  performance: 'perfect' | 'good' | 'okay',
): number => {
  const bonusMultipliers = {
    perfect: 2.0,
    good: 1.5,
    okay: 1.2,
  };
  return Math.round(basePoints * bonusMultipliers[performance]);
};

export default BLAKE_CONFIG;
