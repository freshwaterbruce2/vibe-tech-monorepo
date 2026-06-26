"use server";

import { createDpopChallenge } from "@/lib/dpop";

export async function getDpopChallenge() {
  try {
    // Ensure createDpopChallenge uses server-side crypto utilities
    return await createDpopChallenge();
  } catch (error) {
    // Log error server-side and return a generic message to the client
    console.error("DPoP Challenge Generation Error:", error);
    throw new Error("Failed to generate challenge");
  }
}
