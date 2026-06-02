export interface VideoProject {
  id: number;
  title: string;
  niche: string;
  tone: string;
  scriptText: string;
  description: string;
  tags: string;
  thumbnailPrompt: string;
  status: 'IDEA' | 'SCRIPTED' | 'SCHEDULED' | 'PUBLISHED';
  scheduledTimeMillis: number;
  createdAt: number;
}

export interface CustomAvatar {
  id: number;
  name: string;
  baseStyle: string; // "TECH_GURU", "COSMIC_GAMER", "WEALTH_MENTOR", "ZEN_COACH"
  primaryColor: string; // hex value e.g. "#00E5FF"
  accentColor: string;  // hex value e.g. "#FF2A85"
  bgColor: string;      // hex value e.g. "#141929"
  frameStyle: string;   // "CIRCULAR", "HEXAGON", "SHARP_BOX", "NEON_RING"
  accessory: string;    // "NONE", "GLASSES", "HEADPHONES", "MICROPHONE", "HALO"
  aiPrompt: string;     // Generation prompt
  createdAt: number;
}

export interface StoryScene {
  sceneId: number;
  narration: string;
  keywords: string;
  thumbnailUrl: string;
}
