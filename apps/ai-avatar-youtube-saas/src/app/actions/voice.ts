"use server";

import { env } from "@/lib/env";

export interface SynthesizeVoiceOptions {
  text: string;
  voiceId: string;
  model?: "eleven_flash_v2_5" | "eleven_multilingual_v2";
  speed?: number;
  sampleRate?: 16000 | 22050 | 24000 | 44100;
}

const EMOTIONAL_CUE_PATTERN = /\[[^\]]+\]/g;

function stripEmotionalCues(text: string): string {
  return text.replace(EMOTIONAL_CUE_PATTERN, "").trim();
}

function clampSpeed(speed: number): number {
  return Math.max(0.7, Math.min(1.2, speed));
}

function buildElevenLabsBody(options: SynthesizeVoiceOptions): object {
  const { text, model = "eleven_flash_v2_5", speed = 1.0, sampleRate = 24000 } = options;
  return {
    text: stripEmotionalCues(text),
    model_id: model,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      speed: clampSpeed(speed),
      use_speaker_boost: true,
    },
    output_format: `mp3_${sampleRate}`,
  };
}

function validateOptions(options: SynthesizeVoiceOptions): void {
  if (!options.text || options.text.trim().length < 1) {
    throw new Error("Text is required");
  }
  if (!options.voiceId) {
    throw new Error("Voice ID is required");
  }
  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key is not configured");
  }
}

export async function synthesizeVoicePreview(
  options: SynthesizeVoiceOptions,
): Promise<{ audioBase64: string; mimeType: string }> {
  validateOptions(options);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${options.voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildElevenLabsBody(options)),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${body}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    audioBase64,
    mimeType: "audio/mpeg",
  };
}
