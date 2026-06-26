"use server";

import { createDpopChallenge } from "@/lib/dpop";

export async function getDpopChallenge() {
  return createDpopChallenge();
}
