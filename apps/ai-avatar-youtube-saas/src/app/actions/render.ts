"use server";

import { updateTag } from "next/cache";

import { env } from "@/lib/env";
import { getBillingUserId } from "@/lib/billing-user";
import { deductVideoCredit, initSchema, insertRenderJob } from "@/lib/db";
import type { RenderPayload, RenderJobResponse } from "@/lib/types";

export async function createRenderTask(payload: RenderPayload): Promise<RenderJobResponse> {
  initSchema();

  if (!payload.scriptPrompt || payload.scriptPrompt.length < 10) {
    return { success: false, error: "Script prompt is too short" };
  }
  if (!payload.voiceId) {
    return { success: false, error: "Voice ID is required" };
  }
  if (!payload.assetPaths || payload.assetPaths.length === 0) {
    return { success: false, error: "At least one asset path is required" };
  }

  const userId = await getBillingUserId();
  const hasCredit = deductVideoCredit(userId);
  if (!hasCredit) {
    return {
      success: false,
      error: "Insufficient video credits. Upgrade your plan at /dashboard/billing.",
    };
  }

  const info = insertRenderJob({
    ownerId: userId,
    scriptPrompt: payload.scriptPrompt,
    voiceId: payload.voiceId,
    audioSampleRate: payload.audioSampleRate,
    assetPaths: payload.assetPaths,
    visemeMapping: payload.visemeMapping,
  });

  const jobId = Number(info.lastInsertRowid);
  updateTag(`render-job-${jobId}`);

  try {
    await fetch(`${env.RENDER_WORKER_URL}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        job_id: jobId,
        script_prompt: payload.scriptPrompt,
        voice_id: payload.voiceId,
        audio_sample_rate: payload.audioSampleRate,
        asset_paths: payload.assetPaths,
        viseme_mapping: payload.visemeMapping,
      }),
    });
  } catch (err) {
    return { success: false, error: `Worker unreachable: ${(err as Error).message}` };
  }

  return { success: true, jobId };
}
