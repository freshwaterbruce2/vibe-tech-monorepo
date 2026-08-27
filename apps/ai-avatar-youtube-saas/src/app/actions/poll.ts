"use server";

import { initSchema, getRenderJob } from "@/lib/db";
import type { RenderJobStatus } from "@/lib/types";

export async function getRenderJobStatus(id: number): Promise<RenderJobStatus | null> {
  initSchema();
  const row = getRenderJob(id);
  if (!row) return null;

  return {
    id: row.id as number,
    status: row.status as string,
    outputUrl: (row.output_url as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
  };
}
