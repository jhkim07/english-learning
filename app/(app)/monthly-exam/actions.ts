"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { ProgressionEngine } from "@/lib/progression/progression-engine";
import type { ProgressionResult } from "@/lib/progression/progression-engine";

interface SubmitMonthlyExamInput {
  correctItems: number;
  totalItems: number;
  currentLevel: number;
}

export async function submitMonthlyExam(
  input: SubmitMonthlyExamInput
): Promise<ProgressionResult> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const engine = new ProgressionEngine();
  const score = input.totalItems > 0 ? input.correctItems / input.totalItems : 0;

  await engine.saveMonthlyExam(userId, input.correctItems, input.totalItems);
  return engine.evaluateProgression(userId, score, input.currentLevel);
}
