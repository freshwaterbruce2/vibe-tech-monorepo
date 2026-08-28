import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAI,
  GoogleAIBackend,
  getGenerativeModel,
  SchemaType,
} from "firebase/ai";
import { env } from "@/lib/env";

export interface ScriptScene {
  narration: string;
  visualKeywords: string;
  durationSeconds: number;
}

export interface GeneratedScript {
  title: string;
  scenes: ScriptScene[];
  totalDurationSeconds: number;
}

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp | null {
  if (!env.GEMINI_API_KEY) return null;
  app ??= initializeApp({
    apiKey: env.GEMINI_API_KEY,
    projectId: "vibetech-ai-avatar",
    appId: env.FIREBASE_APP_ID ?? "1:000000000000:web:0000000000000000000000",
  });
  return app;
}

const sceneSchema = {
  type: SchemaType.OBJECT,
  properties: {
    narration: { type: SchemaType.STRING, description: "Spoken narration for this scene" },
    visualKeywords: {
      type: SchemaType.STRING,
      description: "Comma-separated visual search keywords for B-roll or scene imagery",
    },
    durationSeconds: {
      type: SchemaType.NUMBER,
      description: "Estimated duration of the scene in seconds",
    },
  },
  required: ["narration", "visualKeywords", "durationSeconds"],
};

const scriptSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    scenes: { type: SchemaType.ARRAY, items: sceneSchema },
    totalDurationSeconds: { type: SchemaType.NUMBER },
  },
  required: ["title", "scenes", "totalDurationSeconds"],
};

export async function generateScript(
  topic: string,
  system?: string,
  targetDurationSeconds = 60,
): Promise<GeneratedScript> {
  const firebaseApp = getFirebaseApp();

  if (!firebaseApp) {
    return {
      title: `Placeholder: ${topic}`,
      scenes: [
        {
          narration: `[PLACEHOLDER] A creative, original story about "${topic}" from a unique, branded perspective with personality-driven humor and transparent synthetic-media disclosure.`,
          visualKeywords: "abstract background, studio lighting",
          durationSeconds: targetDurationSeconds,
        },
      ],
      totalDurationSeconds: targetDurationSeconds,
    };
  }

  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: scriptSchema,
      temperature: 0.7,
    },
  });

  const prompt = `${system ?? ""}\n\nTopic: ${topic}\n\nWrite a ${targetDurationSeconds}-second YouTube script. Break it into scenes, each with narration, visual search keywords, and an estimated duration. Include a title and total duration.`.trim();

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as GeneratedScript;

  if (!parsed.scenes || parsed.scenes.length === 0) {
    throw new Error("Model returned an empty script");
  }

  return parsed;
}
