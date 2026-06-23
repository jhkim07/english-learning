"use server";

import { auth } from "@/auth";
import { DEV_BYPASS_AUTH } from "@/lib/auth/dev-bypass";
import { prisma } from "@/lib/db";

export async function getTodaysLessonId(): Promise<string | null> {
  const session = await auth();
  const userId = DEV_BYPASS_AUTH ? "dev-user-id" : session?.user?.id;
  if (!userId) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lesson = await prisma.dailyLesson.findFirst({
    where: {
      curriculum: { userId },
      calendarDate: { gte: today },
      generationStatus: "READY",
    },
    orderBy: { calendarDate: "asc" },
    select: { id: true },
  });

  return lesson?.id ?? null;
}
