"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

interface SaveDiagnosisInput {
  userId: string;
  level: number;
  goal: string;
  dailyTarget: number;
  answers: Record<string, unknown>;
}

export async function saveDiagnosis(input: SaveDiagnosisInput) {
  await prisma.userProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      currentLevel: input.level,
      studyGoal: input.goal,
      dailyTargetMinutes: input.dailyTarget,
      diagnosisAnswers: input.answers as Prisma.InputJsonValue,
    },
    update: {
      currentLevel: input.level,
      studyGoal: input.goal,
      dailyTargetMinutes: input.dailyTarget,
      diagnosisAnswers: input.answers as Prisma.InputJsonValue,
    },
  });

  redirect("/calendar");
}
