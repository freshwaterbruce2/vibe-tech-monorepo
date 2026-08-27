"use server";

import { generateScript } from "@/lib/gemini";
import type { GeneratedScript } from "@/lib/gemini";

export type { GeneratedScript };

export async function createScript(
  topic: string,
  system?: string,
  targetDurationSeconds?: number,
): Promise<GeneratedScript> {
  if (!topic || topic.trim().length < 3) {
    throw new Error("Topic must be at least 3 characters");
  }

  return generateScript(topic, system, targetDurationSeconds ?? 60);
}
