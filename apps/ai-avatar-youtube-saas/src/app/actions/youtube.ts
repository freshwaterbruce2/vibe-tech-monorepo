"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { unsignSession } from "@/lib/session";
import { getValidAccessToken, uploadVideo, buildYppDescription } from "@/lib/youtube";
import { getRenderJob, getCompletedRenderJobs, deleteOAuthToken, insertYouTubeUpload } from "@/lib/db";
import { initSchema } from "@/lib/db";

export interface PublishPayload {
  renderJobId: number;
  title: string;
  description: string;
  tags: string;
  privacyStatus: "private" | "unlisted" | "public";
  aiDisclosure: boolean;
  madeForKids: boolean;
}

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("yt_session")?.value;
  return session ? unsignSession(session) : null;
}

export async function getYouTubeConnection() {
  initSchema();
  const userId = await getCurrentUserId();
  return { connected: Boolean(userId), userId };
}

export async function disconnectYouTube() {
  initSchema();
  const userId = await getCurrentUserId();
  if (userId) {
    deleteOAuthToken("youtube", userId);
  }
  const cookieStore = await cookies();
  cookieStore.delete("yt_session");
  revalidatePath("/publish");
  return { success: true };
}

export async function getPublishableRenderJobs() {
  initSchema();
  return getCompletedRenderJobs().map((job) => ({
    id: Number(job.id),
    scriptPrompt: String(job.script_prompt),
    outputUrl: String(job.output_url),
    createdAt: String(job.created_at),
  }));
}

export async function publishToYouTube(payload: PublishPayload) {
  initSchema();

  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "YouTube account not connected" };
  }

  if (!payload.title || payload.title.length > 100) {
    return { success: false, error: "Title is required and must be under 100 characters" };
  }
  if (!payload.description) {
    return { success: false, error: "Description is required" };
  }
  if (!["private", "unlisted", "public"].includes(payload.privacyStatus)) {
    return { success: false, error: "Invalid privacy status" };
  }

  const job = getRenderJob(payload.renderJobId);
  if (!job || job.status !== "completed" || !job.output_url) {
    return { success: false, error: "Render job not ready for publishing" };
  }

  try {
    const accessToken = await getValidAccessToken(userId);
    const videoResponse = await fetch(String(job.output_url));
    if (!videoResponse.ok) {
      return { success: false, error: "Could not fetch rendered video" };
    }
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    const tags = payload.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const result = await uploadVideo({
      accessToken,
      title: payload.title,
      description: buildYppDescription(payload.description, payload.aiDisclosure),
      tags,
      privacyStatus: payload.privacyStatus,
      madeForKids: payload.madeForKids,
      videoBuffer,
    });

    insertYouTubeUpload({
      userId,
      renderJobId: payload.renderJobId,
      videoId: result.videoId,
      status: result.status,
      title: payload.title,
      privacyStatus: payload.privacyStatus,
    });

    revalidatePath("/publish");

    return {
      success: true,
      videoId: result.videoId,
      watchUrl: `https://www.youtube.com/watch?v=${result.videoId}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}
