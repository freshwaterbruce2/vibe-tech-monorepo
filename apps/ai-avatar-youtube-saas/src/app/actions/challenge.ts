"use server";

import { createDpopChallenge } from "@/lib/dpop";

export async function getDpopChallenge() {
  try {
    return await createDpopChallenge();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("DPoP Challenge Generation Error:", error);
    throw new Error("Failed to generate challenge");
  }
}
