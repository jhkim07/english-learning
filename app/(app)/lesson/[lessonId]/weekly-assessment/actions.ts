"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { ProgressionEngine } from "@/lib/progression/progression-engine";

interface SaveWeeklyScoreInput {
  lessonId: string;
  weekNumber: number;
  correctItems: number;
  totalItems: number;
}

export async function saveWeeklyScore(input: SaveWeeklyScoreInput): Promise<void> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) throw new Error("Unauthorized");

  const engine = new ProgressionEngine();
  await engine.saveWeeklyAssessment(userId, input.weekNumber, input.correctItems, input.totalItems);
}
