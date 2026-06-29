import { prisma } from "@/lib/db";
import { LevelArea, LevelChangeReason } from "@prisma/client";

export interface LevelAdjustmentResult {
  changes: { area: LevelArea; from: number; to: number; passed: boolean; accuracy: number }[];
  allPassed: boolean;
  failedItems: string[];
}

// null = skipped section (total === 0)
const calcAccuracy = (passed: number, total: number): number | null =>
  total === 0 ? null : passed / total;

function deduplicateItems(items: string[]): string[] {
  return Array.from(new Set(items));
}

export async function adjustLevels(
  userId: string,
  lessonId: string // DailyLesson.id
): Promise<LevelAdjustmentResult> {
  // Idempotency: if records already exist for this session, reconstruct and return
  const existingRecords = await prisma.levelHistory.findMany({
    where: { userId, dailyLessonId: lessonId },
  });
  if (existingRecords.length > 0) {
    return {
      changes: existingRecords.map((r) => ({
        area: r.area,
        from: r.fromLevel,
        to: r.toLevel,
        passed: r.reason !== LevelChangeReason.AREA_FAILED,
        accuracy: r.toLevel >= r.fromLevel ? 1 : 0,
      })),
      allPassed: existingRecords.every((r) => r.reason === LevelChangeReason.ALL_PASSED),
      failedItems: [], // already stored in pendingReviewItems
    };
  }

  // Parallel DB fetch
  const [flashcards, readings, speakings, writings, levelProfile] = await Promise.all([
    prisma.flashcardAttempt.findMany({ where: { userId, dailyLessonId: lessonId } }),
    prisma.readingAttempt.findMany({ where: { userId, dailyLessonId: lessonId } }),
    prisma.speakingEvaluation.findMany({ where: { userId, dailyLessonId: lessonId } }),
    prisma.writingSubmission.findMany({ where: { userId, dailyLessonId: lessonId } }),
    prisma.levelProfile.upsert({ where: { userId }, create: { userId }, update: {} }),
  ]);

  // Compute accuracy per area
  const areas = {
    VOCABULARY: {
      accuracy: calcAccuracy(flashcards.filter((f) => f.response >= 2).length, flashcards.length),
      level: levelProfile.vocabulary,
      failedIds: flashcards
        .filter((f) => f.response < 2)
        .map((f) => f.cardId)
        .filter((id): id is string => !!id),
    },
    READING: {
      accuracy: calcAccuracy(readings.filter((r) => r.isCorrect).length, readings.length),
      level: levelProfile.reading,
      failedIds: [] as string[], // V2
    },
    CONVERSATION: {
      accuracy: calcAccuracy(
        speakings.filter((s) => s.score >= 0.7).length,
        speakings.length
      ),
      level: levelProfile.conversation,
      failedIds: [] as string[], // V2
    },
    WRITING: {
      accuracy: calcAccuracy(
        writings.filter((w) => w.evaluationScore >= 0.7).length,
        writings.length
      ),
      level: levelProfile.writing,
      failedIds: [] as string[], // V2
    },
  };

  const somethingAttempted = Object.values(areas).some((a) => a.accuracy !== null);
  const allPassed =
    somethingAttempted &&
    Object.values(areas).every((a) => a.accuracy === null || a.accuracy >= 0.75);
  // CRITICAL: if somethingAttempted is false (all 4 areas skipped), allPassed = false → no level up

  // Compute changes per area
  const failedItems: string[] = [];
  const changes = (Object.entries(areas) as [keyof typeof areas, (typeof areas)[keyof typeof areas]][]).map(
    ([areaKey, data]) => {
      const passed = data.accuracy === null || data.accuracy >= 0.75;
      if (!passed) {
        failedItems.push(...data.failedIds);
      }
      const delta = !passed ? -0.1 : allPassed ? +0.1 : 0;
      const newLevel = Math.round(Math.max(1.0, Math.min(5.0, data.level + delta)) * 10) / 10;
      return {
        area: areaKey as LevelArea,
        from: data.level,
        to: newLevel,
        passed,
        accuracy: data.accuracy ?? 1, // null (skipped) treated as 1 for reporting
      };
    }
  );

  // Atomic DB write
  await prisma.$transaction([
    prisma.levelProfile.update({
      where: { userId },
      data: {
        vocabulary: changes.find((c) => c.area === "VOCABULARY")!.to,
        conversation: changes.find((c) => c.area === "CONVERSATION")!.to,
        reading: changes.find((c) => c.area === "READING")!.to,
        writing: changes.find((c) => c.area === "WRITING")!.to,
        sessionCount: { increment: 1 },
        pendingReviewItems: deduplicateItems([
          ...failedItems, // new items first
          ...(levelProfile.pendingReviewItems as string[]), // old items after (T19)
        ]).slice(0, 20),
      },
    }),
    ...changes.map((c) =>
      prisma.levelHistory.create({
        data: {
          userId,
          area: c.area as LevelArea,
          fromLevel: c.from,
          toLevel: c.to,
          reason: !c.passed
              ? LevelChangeReason.AREA_FAILED
              : allPassed
                ? LevelChangeReason.ALL_PASSED
                : LevelChangeReason.PARTIAL_PASS,
          dailyLessonId: lessonId,
        },
      })
    ),
  ]);

  // Structured logging
  console.log("[LevelAdjustment]", {
    userId,
    lessonId,
    allPassed,
    changes: changes.map((c) => ({ area: c.area, from: c.from, to: c.to, accuracy: c.accuracy })),
  });

  return { changes, allPassed, failedItems };
}
